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

    return result;
  }

  deactivate(): Promise<void> {
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
