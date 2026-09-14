import type { PowerSyncDatabase, Transaction } from "@powersync/web";

import {
  createDefaultNotificationState,
} from "./localStorageNotificationStateRepository.ts";

import type {
  AsyncNotificationStateRepository,
  NotificationStatePersistencePhase,
} from "./asyncNotificationStateRepository";

import type {
  NotificationPersistedState,
} from "./notificationStateRepository";

import {
  migrateLocalStorageNotificationState,
  NOTIFICATION_STATE_QUERY,
  NOTIFICATION_STATE_ROW_ID,
  notificationStateRowsToState,
  notificationStateToDatabaseRow,
} from "./migrateLocalStorageNotificationState.ts";

import type {
  NotificationStateDatabaseRow,
  NotificationStateMigrationSource,
} from "./migrateLocalStorageNotificationState";

async function replaceState(
  transaction: Transaction,
  state: NotificationPersistedState
): Promise<void> {
  const row = notificationStateToDatabaseRow(state);
  await transaction.execute(
    "DELETE FROM notification_ui_state WHERE id = ?",
    [NOTIFICATION_STATE_ROW_ID]
  );
  await transaction.execute(
    "INSERT INTO notification_ui_state(id, state_json) VALUES(?, ?)",
    [row.id, row.state_json]
  );

  const persisted = await transaction.getAll<NotificationStateDatabaseRow>(
    NOTIFICATION_STATE_QUERY
  );
  if (JSON.stringify(persisted) !== JSON.stringify([row])) {
    throw new Error("Notification UI State replacement verification failed");
  }
}

export class PowerSyncNotificationStateRepository
implements AsyncNotificationStateRepository {
  private initialization?: Promise<NotificationPersistedState>;
  private cache: NotificationPersistedState = createDefaultNotificationState();
  private phase: NotificationStatePersistencePhase = "uninitialized";
  private error: Error | null = null;
  private queue: Promise<void> = Promise.resolve();
  private expected: NotificationPersistedState | null = null;
  private watchBlocked = false;
  private mutationVersion = 0;
  private readonly listeners = new Set<() => void>();
  private readonly database: PowerSyncDatabase;
  private readonly migrationSource: NotificationStateMigrationSource;

  constructor(
    database: PowerSyncDatabase,
    migrationSource: NotificationStateMigrationSource
  ) {
    this.database = database;
    this.migrationSource = migrationSource;
  }

  initialize(
    onPhase?: (phase: "opening" | "migration") => void
  ): Promise<NotificationPersistedState> {
    if (!this.initialization) this.initialization = this.initializeOnce(onPhase);
    return this.initialization;
  }

  private async initializeOnce(
    onPhase?: (phase: "opening" | "migration") => void
  ): Promise<NotificationPersistedState> {
    this.phase = "opening";
    onPhase?.("opening");
    await this.database.init();
    this.phase = "migration";
    onPhase?.("migration");
    const migration = await migrateLocalStorageNotificationState(
      this.database,
      this.migrationSource
    );
    if (migration.status === "invalid-source") {
      this.phase = "error";
      throw new Error(
        "Existing Notification UI State is invalid and was not migrated"
      );
    }

    this.cache = notificationStateRowsToState(
      await this.database.getAll<NotificationStateDatabaseRow>(
        NOTIFICATION_STATE_QUERY
      )
    ) ?? createDefaultNotificationState();
    this.phase = "hydrated";
    this.error = null;
    return this.load();
  }

  getPersistenceState() {
    return { phase: this.phase, error: this.error };
  }

  load(): NotificationPersistedState {
    if (this.phase !== "hydrated") {
      throw new Error("Notification UI State persistence is not hydrated");
    }
    return structuredClone(this.cache);
  }

  save(state: NotificationPersistedState): void {
    if (this.phase !== "hydrated") {
      throw new Error("Notification UI State persistence is not hydrated");
    }
    const snapshot = structuredClone(state);
    const version = ++this.mutationVersion;
    this.cache = snapshot;
    this.expected = snapshot;
    this.watchBlocked = false;
    this.error = null;
    this.notify();
    this.enqueue(
      () => this.database.writeTransaction(
        (transaction) => replaceState(transaction, snapshot)
      ),
      version
    );
  }

  clear(): void {
    this.save(createDefaultNotificationState());
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    const controller = new AbortController();
    void this.watch(controller.signal);
    return () => {
      this.listeners.delete(listener);
      controller.abort();
    };
  }

  private async watch(signal: AbortSignal): Promise<void> {
    try {
      await this.initialize();
      for await (const result of this.database.watch(
        NOTIFICATION_STATE_QUERY,
        [],
        { signal }
      )) {
        if (signal.aborted || this.watchBlocked) return;
        const rows = result.rows?._array as
          | NotificationStateDatabaseRow[]
          | undefined;
        const state = notificationStateRowsToState(rows ?? []) ??
          createDefaultNotificationState();
        if (this.expected && JSON.stringify(state) !== JSON.stringify(this.expected)) {
          continue;
        }
        this.expected = null;
        if (JSON.stringify(state) === JSON.stringify(this.cache)) continue;
        this.cache = structuredClone(state);
        this.error = null;
        this.notify();
      }
    } catch (error) {
      if (!signal.aborted) {
        this.error = error instanceof Error ? error : new Error(String(error));
        this.phase = "error";
        this.notify();
      }
    }
  }

  private enqueue(operation: () => Promise<void>, version: number): void {
    const result = this.queue.then(operation);
    this.queue = result.then(
      () => {
        if (version === this.mutationVersion) this.expected = null;
      },
      (error: unknown) => {
        if (version !== this.mutationVersion) return;
        this.expected = null;
        this.watchBlocked = true;
        this.error = error instanceof Error ? error : new Error(String(error));
        this.phase = "error";
        this.notify();
      }
    );
  }

  private notify(): void {
    for (const listener of this.listeners) listener();
  }
}
