import assert from "node:assert/strict";
import test from "node:test";

import type { PowerSyncDatabase, QueryResult, Transaction } from "@powersync/web";

import {
  DEFAULT_NOTIFICATION_PREFERENCES,
} from "../../src/notifications/notificationEngine.ts";

import {
  migrateLocalStorageNotificationState,
  NOTIFICATION_STATE_MIGRATION_ID,
  NOTIFICATION_STATE_QUERY,
} from "../../src/data/notifications/migrateLocalStorageNotificationState.ts";

import type {
  NotificationStateDatabaseRow,
} from "../../src/data/notifications/migrateLocalStorageNotificationState.ts";

import {
  PowerSyncNotificationStateRepository,
} from "../../src/data/notifications/powerSyncNotificationStateRepository.ts";

import type {
  NotificationStateSourceSnapshot,
} from "../../src/data/notifications/localStorageNotificationStateRepository.ts";

import type {
  NotificationPersistedState,
} from "../../src/data/notifications/notificationStateRepository.ts";

interface JournalRow {
  id: string;
  source_key: string;
  record_count: number;
  completed_at: string;
}

interface State {
  notificationStates: NotificationStateDatabaseRow[];
  journal: JournalRow[];
}

class Queue<T> implements AsyncIterable<T> {
  private values: T[] = [];
  private waiting: Array<(result: IteratorResult<T>) => void> = [];
  private closed = false;

  push(value: T): void {
    const resolve = this.waiting.shift();
    if (resolve) resolve({ done: false, value });
    else this.values.push(value);
  }

  close(): void {
    this.closed = true;
    this.waiting.splice(0).forEach((resolve) => resolve({ done: true, value: undefined }));
  }

  [Symbol.asyncIterator](): AsyncIterator<T> {
    return {
      next: () => {
        const value = this.values.shift();
        if (value) return Promise.resolve({ done: false, value });
        if (this.closed) return Promise.resolve({ done: true, value: undefined });
        return new Promise((resolve) => this.waiting.push(resolve));
      },
    };
  }
}

class FakeDatabase {
  readonly operations: string[] = [];
  initCalls = 0;
  failStateInsert = false;
  private readonly watchers = new Set<Queue<QueryResult>>();
  readonly state: State;

  constructor(state: State = { notificationStates: [], journal: [] }) {
    this.state = state;
  }

  async init(): Promise<void> {
    this.initCalls += 1;
  }

  async getAll<T>(sql: string): Promise<T[]> {
    return this.getAllFrom<T>(this.state, sql);
  }

  async getOptional<T>(sql: string, parameters: unknown[] = []): Promise<T | null> {
    return this.getOptionalFrom<T>(this.state, sql, parameters);
  }

  async writeTransaction<T>(
    callback: (transaction: Transaction) => Promise<T>
  ): Promise<T> {
    const draft = structuredClone(this.state);
    const transaction = {
      getAll: <R>(sql: string) => this.getAllFrom<R>(draft, sql),
      getOptional: <R>(sql: string, parameters?: unknown[]) =>
        this.getOptionalFrom<R>(draft, sql, parameters),
      execute: async (sql: string, parameters: unknown[] = []) => {
        this.executeAgainst(draft, sql, parameters);
        return { rows: { _array: [] } } as QueryResult;
      },
    } as unknown as Transaction;

    const result = await callback(transaction);
    this.state.notificationStates = draft.notificationStates;
    this.state.journal = draft.journal;
    this.emit();
    return result;
  }

  watch(
    _sql: string,
    _parameters: unknown[],
    options: { signal: AbortSignal }
  ): AsyncIterable<QueryResult> {
    const queue = new Queue<QueryResult>();
    this.watchers.add(queue);
    queue.push(this.result());
    options.signal.addEventListener("abort", () => {
      this.watchers.delete(queue);
      queue.close();
    }, { once: true });
    return queue;
  }

  private async getAllFrom<T>(state: State, sql: string): Promise<T[]> {
    if (sql.includes("FROM notification_ui_state")) {
      return [...state.notificationStates].sort((a, b) => a.id.localeCompare(b.id)) as T[];
    }
    return [];
  }

  private async getOptionalFrom<T>(
    state: State,
    sql: string,
    parameters: unknown[] = []
  ): Promise<T | null> {
    if (sql.includes("migration_journal")) {
      return (state.journal.find((row) => row.id === parameters[0]) ?? null) as T | null;
    }
    return null;
  }

  private executeAgainst(state: State, sql: string, parameters: unknown[]): void {
    if (sql.startsWith("DELETE FROM notification_ui_state")) {
      state.notificationStates = state.notificationStates.filter(
        (row) => row.id !== parameters[0]
      );
      return;
    }
    if (sql.startsWith("INSERT INTO notification_ui_state")) {
      if (this.failStateInsert) throw new Error("injected notification failure");
      state.notificationStates.push({
        id: String(parameters[0]),
        state_json: String(parameters[1]),
      });
      this.operations.push("state");
      return;
    }
    if (sql.startsWith("INSERT INTO migration_journal")) {
      state.journal.push({
        id: String(parameters[0]),
        source_key: String(parameters[1]),
        record_count: Number(parameters[2]),
        completed_at: String(parameters[3]),
      });
      this.operations.push("marker");
    }
  }

  private result(): QueryResult {
    const array = structuredClone(this.state.notificationStates);
    return { rows: { _array: array }, array } as unknown as QueryResult;
  }

  private emit(): void {
    const result = this.result();
    this.watchers.forEach((watcher) => watcher.push(result));
  }
}

const persistedState: NotificationPersistedState = {
  readIds: ["read-2", "read-1", "read-2"],
  dismissedIds: ["dismiss-1", "dismiss-3"],
  preferences: {
    tasks: true,
    habits: false,
    planning: true,
    xp: false,
    atlas: true,
  },
};

function source(snapshot: NotificationStateSourceSnapshot) {
  return {
    calls: 0,
    inspect() {
      this.calls += 1;
      return snapshot;
    },
  };
}

function asDatabase(database: FakeDatabase): PowerSyncDatabase {
  return database as unknown as PowerSyncDatabase;
}

test("missing source creates only the marker and hydrates current defaults", async () => {
  const db = new FakeDatabase();
  const repository = new PowerSyncNotificationStateRepository(
    asDatabase(db),
    source({ status: "missing", state: null })
  );

  assert.deepEqual(await repository.initialize(), {
    readIds: [],
    dismissedIds: [],
    preferences: DEFAULT_NOTIFICATION_PREFERENCES,
  });
  assert.equal(db.state.notificationStates.length, 0);
  assert.equal(db.state.journal[0]?.id, NOTIFICATION_STATE_MIGRATION_ID);
});

test("valid state preserves IDs, ordering, duplicates, and preferences exactly", async () => {
  const db = new FakeDatabase();
  const input = structuredClone(persistedState);
  const repository = new PowerSyncNotificationStateRepository(
    asDatabase(db),
    source({ status: "valid", state: input })
  );

  assert.deepEqual(await repository.initialize(), input);
  assert.deepEqual(input, persistedState);
  assert.deepEqual(db.operations, ["state", "marker"]);
});

test("invalid source and unjournaled target fail without partial writes", async () => {
  const invalidDb = new FakeDatabase();
  assert.deepEqual(
    await migrateLocalStorageNotificationState(
      invalidDb,
      source({ status: "invalid", state: null })
    ),
    { status: "invalid-source", imported: 0 }
  );
  assert.deepEqual(invalidDb.state, { notificationStates: [], journal: [] });

  const occupied = new FakeDatabase({
    notificationStates: [{ id: "current", state_json: JSON.stringify({}) }],
    journal: [],
  });
  await assert.rejects(
    migrateLocalStorageNotificationState(
      occupied,
      source({ status: "valid", state: persistedState })
    ),
    /unjournaled non-empty/
  );
});

test("migration is idempotent, marker-last, and source remains inspect-only", async () => {
  const db = new FakeDatabase();
  const migrationSource = source({ status: "valid", state: persistedState });
  await migrateLocalStorageNotificationState(db, migrationSource);
  const second = await migrateLocalStorageNotificationState(db, migrationSource);

  assert.deepEqual(second, { status: "already-complete", imported: 0 });
  assert.equal(migrationSource.calls, 1);
  assert.equal(db.operations.at(-1), "marker");
});

test("transaction failure rolls back state and marker", async () => {
  const db = new FakeDatabase();
  db.failStateInsert = true;
  await assert.rejects(
    migrateLocalStorageNotificationState(
      db,
      source({ status: "valid", state: persistedState })
    ),
    /injected notification failure/
  );
  assert.deepEqual(db.state, { notificationStates: [], journal: [] });
});

test("initialize is memoized and reopen returns durable state", async () => {
  const state: State = { notificationStates: [], journal: [] };
  const migrationSource = source({ status: "valid", state: persistedState });
  const firstDatabase = new FakeDatabase(state);
  const first = new PowerSyncNotificationStateRepository(
    asDatabase(firstDatabase),
    migrationSource
  );
  assert.deepEqual(
    await Promise.all([first.initialize(), first.initialize()]),
    [persistedState, persistedState]
  );

  const reopened = new PowerSyncNotificationStateRepository(
    asDatabase(new FakeDatabase(state)),
    migrationSource
  );
  assert.deepEqual(await reopened.initialize(), persistedState);
  assert.equal(migrationSource.calls, 1);
  assert.equal(firstDatabase.initCalls, 1);
});

test("save round-trips exact UI state and watch publishes complete snapshots", async () => {
  const db = new FakeDatabase();
  const repository = new PowerSyncNotificationStateRepository(
    asDatabase(db),
    source({ status: "missing", state: null })
  );
  await repository.initialize();
  const observed: NotificationPersistedState[] = [];
  const unsubscribe = repository.subscribe(() => observed.push(repository.load()));
  await new Promise((resolve) => setTimeout(resolve, 0));

  repository.save(persistedState);
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.deepEqual(repository.load(), persistedState);
  assert.deepEqual(observed.at(-1), persistedState);
  assert.deepEqual(
    JSON.parse(db.state.notificationStates[0]!.state_json),
    { version: "1.0", ...persistedState }
  );
  unsubscribe();
});

test("database rows reject malformed or incomplete envelopes", async () => {
  for (const state_json of ["{broken", "{}", JSON.stringify({
    version: "1.0",
    readIds: [],
    dismissedIds: [],
    preferences: { tasks: true },
  })]) {
    const db = new FakeDatabase({
      notificationStates: [{ id: "current", state_json }],
      journal: [{
        id: NOTIFICATION_STATE_MIGRATION_ID,
        source_key: "lifeos-notification-state-v1",
        record_count: 1,
        completed_at: "2026-09-14T00:00:00.000Z",
      }],
    });
    const repository = new PowerSyncNotificationStateRepository(
      asDatabase(db),
      source({ status: "missing", state: null })
    );
    await assert.rejects(repository.initialize(), /Invalid Notification UI State/);
  }
});

test("stored data contains UI state only, never derived notification facts", async () => {
  const db = new FakeDatabase();
  const repository = new PowerSyncNotificationStateRepository(
    asDatabase(db),
    source({ status: "missing", state: null })
  );
  await repository.initialize();
  repository.save({
    ...persistedState,
    title: "Derived title",
    message: "Derived message",
    severity: "important",
    achievement: "invented",
  } as NotificationPersistedState);
  await new Promise((resolve) => setTimeout(resolve, 0));

  const raw = db.state.notificationStates[0]!.state_json;
  assert.doesNotMatch(raw, /title|message|severity|achievement/);
  assert.deepEqual(JSON.parse(raw), { version: "1.0", ...persistedState });
  assert.equal(NOTIFICATION_STATE_QUERY.includes("notification_ui_state"), true);
});
