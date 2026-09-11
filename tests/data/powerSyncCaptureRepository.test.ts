import assert from "node:assert/strict";
import {
  registerHooks,
} from "node:module";
import test from "node:test";

import type {
  QueryResult,
  Transaction,
} from "@powersync/web";

import type {
  CaptureSourceSnapshot,
} from "../../src/data/profileCapture/localStorageProfileCaptureRepositories.ts";

import type {
  Capture,
} from "../../src/shared/types.ts";

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith(".") && !/\.[a-z]+$/i.test(specifier)) {
      return nextResolve(`${specifier}.ts`, context);
    }
    return nextResolve(specifier, context);
  },
});

const {
  CAPTURE_MIGRATION_ID,
  migrateLocalStorageCaptures,
} = await import(
  "../../src/data/captures/migrateLocalStorageCaptures.ts"
);

const {
  PowerSyncCaptureRepository,
  captureIdToDatabaseId,
  databaseIdToCaptureId,
} = await import(
  "../../src/data/captures/powerSyncCaptureRepository.ts"
);

interface CaptureRow {
  id: string;
  text: string;
  created_at: string;
  sort_order: number;
  extras_json: string | null;
}

interface JournalRow {
  id: string;
  source_key: string;
  record_count: number;
  completed_at: string;
}

interface FakeDatabaseState {
  captures: CaptureRow[];
  journal: JournalRow[];
}

class AsyncQueue<T> implements AsyncIterable<T> {
  private readonly values: T[] = [];
  private readonly waiters: Array<(value: IteratorResult<T>) => void> = [];
  private closed = false;

  push(value: T): void {
    const waiter = this.waiters.shift();
    if (waiter) waiter({ done: false, value });
    else this.values.push(value);
  }

  close(): void {
    this.closed = true;
    this.waiters.splice(0).forEach((waiter) => waiter({
      done: true,
      value: undefined,
    }));
  }

  [Symbol.asyncIterator](): AsyncIterator<T> {
    return {
      next: async () => {
        const value = this.values.shift();
        if (value !== undefined) return { done: false, value };
        if (this.closed) return { done: true, value: undefined };
        return new Promise<IteratorResult<T>>((resolve) => {
          this.waiters.push(resolve);
        });
      },
    };
  }
}

class FakePowerSyncDatabase {
  readonly state: FakeDatabaseState;
  readonly operations: string[] = [];
  initCalls = 0;
  failOnCaptureInsert = false;
  private readonly watchers = new Set<AsyncQueue<QueryResult>>();

  constructor(state?: FakeDatabaseState) {
    this.state = state ?? { captures: [], journal: [] };
  }

  async init(): Promise<void> {
    this.initCalls += 1;
  }

  async getAll<T>(sql: string): Promise<T[]> {
    if (sql.includes("FROM captures")) {
      return [...this.state.captures]
        .sort((left, right) =>
          left.sort_order - right.sort_order || right.id.localeCompare(left.id)
        ) as T[];
    }
    return [];
  }

  async getOptional<T>(sql: string, parameters: unknown[] = []): Promise<T | null> {
    if (sql.includes("FROM migration_journal")) {
      return (this.state.journal.find((row) => row.id === parameters[0]) ?? null) as T | null;
    }

    if (sql.includes("MIN(sort_order)")) {
      const values = this.state.captures.map((row) => row.sort_order);
      return { minimum: values.length > 0 ? Math.min(...values) : null } as T;
    }

    return null;
  }

  async execute(sql: string, parameters: unknown[] = []): Promise<QueryResult> {
    this.executeAgainst(this.state, sql, parameters);
    this.emit();
    return { rows: { _array: [] } } as unknown as QueryResult;
  }

  async writeTransaction<T>(
    callback: (transaction: Transaction) => Promise<T>
  ): Promise<T> {
    const draft: FakeDatabaseState = {
      captures: structuredClone(this.state.captures),
      journal: structuredClone(this.state.journal),
    };

    const transaction = {
      getAll: <Row>(sql: string) => this.getAllFrom<Row>(draft, sql),
      getOptional: <Row>(sql: string, parameters?: unknown[]) =>
        this.getOptionalFrom<Row>(draft, sql, parameters),
      execute: async (sql: string, parameters?: unknown[]) => {
        this.executeAgainst(draft, sql, parameters ?? []);
        return { rows: { _array: [] } } as unknown as QueryResult;
      },
    } as unknown as Transaction;

    const result = await callback(transaction);
    this.state.captures = draft.captures;
    this.state.journal = draft.journal;
    this.emit();
    return result;
  }

  watch(_sql: string, _parameters: unknown[], options: { signal: AbortSignal }): AsyncIterable<QueryResult> {
    const queue = new AsyncQueue<QueryResult>();
    this.watchers.add(queue);
    queue.push(this.queryResult());
    options.signal.addEventListener("abort", () => {
      this.watchers.delete(queue);
      queue.close();
    }, { once: true });
    return queue;
  }

  private async getAllFrom<T>(state: FakeDatabaseState, sql: string): Promise<T[]> {
    if (!sql.includes("FROM captures")) return [];
    return [...state.captures]
      .sort((left, right) =>
        left.sort_order - right.sort_order || right.id.localeCompare(left.id)
      ) as T[];
  }

  private async getOptionalFrom<T>(
    state: FakeDatabaseState,
    sql: string,
    parameters: unknown[] = []
  ): Promise<T | null> {
    if (sql.includes("FROM migration_journal")) {
      return (state.journal.find((row) => row.id === parameters[0]) ?? null) as T | null;
    }
    if (sql.includes("MIN(sort_order)")) {
      const values = state.captures.map((row) => row.sort_order);
      return { minimum: values.length > 0 ? Math.min(...values) : null } as T;
    }
    return null;
  }

  private executeAgainst(
    state: FakeDatabaseState,
    sql: string,
    parameters: unknown[]
  ): void {
    if (sql.startsWith("INSERT INTO captures")) {
      if (this.failOnCaptureInsert) throw new Error("injected insert failure");
      const [id, text, createdAt, sortOrder, extrasJson] = parameters;
      if (state.captures.some((row) => row.id === id)) {
        throw new Error("duplicate capture ID");
      }
      state.captures.push({
        id: String(id),
        text: String(text),
        created_at: String(createdAt),
        sort_order: Number(sortOrder),
        extras_json: extrasJson === null ? null : String(extrasJson),
      });
      this.operations.push(`capture:${String(id)}`);
      return;
    }

    if (sql.startsWith("INSERT INTO migration_journal")) {
      const [id, sourceKey, recordCount, completedAt] = parameters;
      state.journal.push({
        id: String(id),
        source_key: String(sourceKey),
        record_count: Number(recordCount),
        completed_at: String(completedAt),
      });
      this.operations.push(`marker:${String(id)}`);
      return;
    }

    if (sql.startsWith("DELETE FROM captures")) {
      state.captures = state.captures.filter((row) => row.id !== parameters[0]);
    }
  }

  private queryResult(): QueryResult {
    const array = [...this.state.captures]
      .sort((left, right) =>
        left.sort_order - right.sort_order || right.id.localeCompare(left.id)
      );
    return { rows: { _array: array }, array } as unknown as QueryResult;
  }

  private emit(): void {
    const result = this.queryResult();
    this.watchers.forEach((watcher) => watcher.push(result));
  }
}

function source(snapshot: CaptureSourceSnapshot) {
  return {
    calls: 0,
    inspect() {
      this.calls += 1;
      return snapshot;
    },
  };
}

const captures: Capture[] = [
  {
    id: 200,
    text: "Newest",
    createdAt: "2026-09-10T11:00:00.000Z",
  },
  {
    id: 100,
    text: "Older",
    createdAt: "2026-09-10T10:00:00.000Z",
  },
];

const asDatabase = (database: FakePowerSyncDatabase) =>
  database as unknown as import("@powersync/web").PowerSyncDatabase;

test("missing source completes an empty migration without changing source", async () => {
  const database = new FakePowerSyncDatabase();
  const migrationSource = source({ status: "missing", captures: [] });

  const result = await migrateLocalStorageCaptures(database, migrationSource);

  assert.deepEqual(result, { status: "complete", imported: 0 });
  assert.equal(database.state.captures.length, 0);
  assert.equal(database.state.journal[0]?.id, CAPTURE_MIGRATION_ID);
  assert.equal(migrationSource.calls, 1);
});

test("valid migration preserves multiple captures, timestamps, order, IDs, and extras", async () => {
  const database = new FakePowerSyncDatabase();
  const compatible = [
    { ...captures[0], category: "idea" },
    captures[1],
  ];

  const result = await migrateLocalStorageCaptures(
    database,
    source({ status: "valid", captures: compatible })
  );
  const repository = new PowerSyncCaptureRepository(
    asDatabase(database),
    source({ status: "valid", captures: compatible })
  );

  assert.deepEqual(result, { status: "complete", imported: 2 });
  assert.deepEqual(await repository.initialize(), compatible);
  assert.deepEqual(compatible, [
    { ...captures[0], category: "idea" },
    captures[1],
  ]);
  assert.deepEqual(database.state.captures.map((row) => row.sort_order), [0, 1]);
  assert.equal(database.operations.at(-1), `marker:${CAPTURE_MIGRATION_ID}`);
});

test("repeated migration is idempotent and does not reread the source", async () => {
  const database = new FakePowerSyncDatabase();
  const migrationSource = source({ status: "valid", captures });

  await migrateLocalStorageCaptures(database, migrationSource);
  const second = await migrateLocalStorageCaptures(database, migrationSource);

  assert.deepEqual(second, { status: "already-complete", imported: 0 });
  assert.equal(database.state.captures.length, 2);
  assert.equal(migrationSource.calls, 1);
});

test("invalid source is not imported and never receives a marker", async () => {
  const database = new FakePowerSyncDatabase();

  const result = await migrateLocalStorageCaptures(
    database,
    source({ status: "invalid", captures: [] })
  );

  assert.deepEqual(result, { status: "invalid-source", imported: 0 });
  assert.deepEqual(database.state, { captures: [], journal: [] });
});

test("failed import rolls back every row and leaves no marker", async () => {
  const database = new FakePowerSyncDatabase();
  database.failOnCaptureInsert = true;

  await assert.rejects(
    migrateLocalStorageCaptures(
      database,
      source({ status: "valid", captures })
    ),
    /injected insert failure/
  );

  assert.deepEqual(database.state, { captures: [], journal: [] });
});

test("repository initialization is memoized and reopening reads persisted rows", async () => {
  const state: FakeDatabaseState = { captures: [], journal: [] };
  const firstDatabase = new FakePowerSyncDatabase(state);
  const migrationSource = source({ status: "valid", captures });
  const first = new PowerSyncCaptureRepository(
    asDatabase(firstDatabase),
    migrationSource
  );

  const [left, right] = await Promise.all([
    first.initialize(),
    first.initialize(),
  ]);

  const reopenedDatabase = new FakePowerSyncDatabase(state);
  const reopened = new PowerSyncCaptureRepository(
    asDatabase(reopenedDatabase),
    migrationSource
  );

  assert.deepEqual(left, captures);
  assert.deepEqual(right, captures);
  assert.deepEqual(await reopened.initialize(), captures);
  assert.equal(firstDatabase.initCalls, 1);
  assert.equal(reopenedDatabase.initCalls, 1);
  assert.equal(migrationSource.calls, 1);
});

test("insert prepends, delete targets one exact numeric ID, and watch reacts", async () => {
  const database = new FakePowerSyncDatabase();
  const repository = new PowerSyncCaptureRepository(
    asDatabase(database),
    source({ status: "valid", captures })
  );
  await repository.initialize();

  const events: Capture[][] = [];
  const errors: Error[] = [];
  const unsubscribe = repository.subscribe((event) => {
    if (event.type === "captures") events.push(event.captures);
    else errors.push(event.error);
  });

  await new Promise((resolve) => setTimeout(resolve, 0));
  const newest: Capture = {
    id: 300,
    text: "Newly inserted",
    createdAt: "2026-09-10T12:00:00.000Z",
  };
  await repository.insert(newest);
  await new Promise((resolve) => setTimeout(resolve, 0));

  assert.deepEqual(events.at(-1)?.map((capture) => capture.id), [300, 200, 100]);

  await repository.delete(200);
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.deepEqual(events.at(-1)?.map((capture) => capture.id), [300, 100]);
  assert.deepEqual(errors, []);
  unsubscribe();
});

test("numeric Capture IDs use strict lossless canonical decimal mapping", () => {
  assert.equal(captureIdToDatabaseId(1700000000001), "1700000000001");
  assert.equal(databaseIdToCaptureId("1700000000001"), 1700000000001);

  for (const invalid of ["1.5", "1e3", "+1", "-1", "01", "9007199254740992", "capture-1"]) {
    assert.throws(() => databaseIdToCaptureId(invalid));
  }

  assert.throws(() => captureIdToDatabaseId(Number.MAX_SAFE_INTEGER + 1));
});

test("one invalid database ID rejects the whole repository read", async () => {
  const state: FakeDatabaseState = {
    captures: [{
      id: "01",
      text: "Corrupted",
      created_at: "2026-09-10T00:00:00.000Z",
      sort_order: 0,
      extras_json: null,
    }],
    journal: [{
      id: CAPTURE_MIGRATION_ID,
      source_key: "lifeos-captures",
      record_count: 1,
      completed_at: "2026-09-10T00:00:00.000Z",
    }],
  };
  const repository = new PowerSyncCaptureRepository(
    asDatabase(new FakePowerSyncDatabase(state)),
    source({ status: "missing", captures: [] })
  );

  await assert.rejects(repository.initialize(), /Invalid Capture database ID/);
});
