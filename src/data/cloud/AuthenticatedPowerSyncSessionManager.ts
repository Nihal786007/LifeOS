import type {
  PowerSyncBackendConnector,
  PowerSyncDatabase,
} from "@powersync/web";

import {
  assertAuthenticatedUserId,
  createAuthenticatedLifeOSPowerSyncDatabase,
} from "../database/authenticatedLifeOSPowerSync.ts";

export interface AuthenticatedPowerSyncSession {
  readonly userId: string;
  readonly database: PowerSyncDatabase;
  registerCleanup(cleanup: () => void | Promise<void>): () => void;
}

export interface AuthenticatedPowerSyncSessionManagerOptions {
  createDatabase?: (userId: string) => Promise<PowerSyncDatabase>;
  createConnector: (userId: string) => PowerSyncBackendConnector;
}

interface ActiveSession extends AuthenticatedPowerSyncSession {
  cleanups: Set<() => void | Promise<void>>;
}

/**
 * Owns the security boundary between authenticated users.
 *
 * The session is published only after its user-scoped database completes the
 * first authenticated sync. Consumers must register repository watch cleanup
 * so all watches stop before disconnect and close during account switching.
 */
export class AuthenticatedPowerSyncSessionManager {
  private readonly createDatabase: (userId: string) => Promise<PowerSyncDatabase>;
  private readonly createConnector: (userId: string) => PowerSyncBackendConnector;
  private active: ActiveSession | null = null;
  private transition: Promise<void> = Promise.resolve();
  private operationVersion = 0;
  private pendingActivation: {
    userId: string;
    version: number;
    promise: Promise<AuthenticatedPowerSyncSession>;
  } | null = null;

  constructor(options: AuthenticatedPowerSyncSessionManagerOptions) {
    this.createDatabase = options.createDatabase ??
      createAuthenticatedLifeOSPowerSyncDatabase;
    this.createConnector = options.createConnector;
  }

  current(): AuthenticatedPowerSyncSession | null {
    return this.active;
  }

  activate(userId: string): Promise<AuthenticatedPowerSyncSession> {
    const normalized = assertAuthenticatedUserId(userId);
    if (this.active?.userId === normalized && !this.pendingActivation) {
      return Promise.resolve(this.active);
    }
    if (
      this.pendingActivation?.userId === normalized &&
      this.pendingActivation.version === this.operationVersion
    ) {
      return this.pendingActivation.promise;
    }

    const version = ++this.operationVersion;
    let resolveSession!: (session: AuthenticatedPowerSyncSession) => void;
    let rejectSession!: (error: unknown) => void;
    const result = new Promise<AuthenticatedPowerSyncSession>((resolve, reject) => {
      resolveSession = resolve;
      rejectSession = reject;
    });

    this.transition = this.transition.then(async () => {
      try {
        await this.stopActive();
        const database = await this.createDatabase(normalized);
        const cleanups = new Set<() => void | Promise<void>>();
        try {
          await database.init();
          await database.connect(this.createConnector(normalized));
          await database.waitForFirstSync();
        } catch (error) {
          await database.disconnect().catch(() => undefined);
          await database.close().catch(() => undefined);
          throw error;
        }

        const session: ActiveSession = {
          userId: normalized,
          database,
          cleanups,
          registerCleanup: (cleanup) => {
            cleanups.add(cleanup);
            return () => cleanups.delete(cleanup);
          },
        };
        this.active = session;
        resolveSession(session);
      } catch (error) {
        rejectSession(error);
      }
    });

    const pending = { userId: normalized, version, promise: result };
    this.pendingActivation = pending;
    const clearPending = () => {
      if (this.pendingActivation === pending) this.pendingActivation = null;
    };
    void result.then(clearPending, clearPending);

    return result;
  }

  deactivate(): Promise<void> {
    this.operationVersion += 1;
    this.pendingActivation = null;
    this.transition = this.transition.then(() => this.stopActive());
    return this.transition;
  }

  private async stopActive(): Promise<void> {
    const previous = this.active;
    this.active = null;
    if (!previous) return;

    const cleanupErrors: unknown[] = [];
    for (const cleanup of previous.cleanups) {
      try {
        await cleanup();
      } catch (error) {
        cleanupErrors.push(error);
      }
    }
    previous.cleanups.clear();
    await previous.database.disconnect();
    await previous.database.close();
    if (cleanupErrors.length > 0) {
      throw new AggregateError(cleanupErrors, "Repository watch cleanup failed");
    }
  }
}
