import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import test from "node:test";

import type { QueryResult, Transaction } from "@powersync/web";
import type { ExecutionRecord } from "../../src/shared/execution.ts";
import type {
  ExecutionHistorySourceSnapshot,
  ExecutionHistoryStorage,
} from "../../src/data/execution/localStorageExecutionHistoryRepository.ts";
import type {
  ExecutionRecordDatabaseRow,
} from "../../src/data/execution/migrateLocalStorageExecutionHistory.ts";
import type {
  AsyncExecutionHistoryRepository,
  ExecutionHistoryRepositoryEvent,
} from "../../src/data/execution/asyncExecutionHistoryRepository.ts";

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith(".") && !/\.[a-z]+$/i.test(specifier)) {
      return nextResolve(`${specifier}.ts`, context);
    }
    return nextResolve(specifier, context);
  },
});

const {
  EXECUTION_HISTORY_MIGRATION_ID,
  EXECUTION_HISTORY_QUERY,
  databaseIdToExecutionId,
  executionIdToDatabaseId,
  getExecutionTotalXP,
  migrateLocalStorageExecutionHistory,
} = await import("../../src/data/execution/migrateLocalStorageExecutionHistory.ts");
const { PowerSyncExecutionHistoryRepository } = await import(
  "../../src/data/execution/powerSyncExecutionHistoryRepository.ts"
);
const { LocalStorageExecutionHistoryRepository } = await import(
  "../../src/data/execution/localStorageExecutionHistoryRepository.ts"
);
const { ExecutionHistoryService } = await import(
  "../../src/services/ExecutionHistoryService.ts"
);
const { XPAutomationEngine } = await import(
  "../../src/engines/XPAutomationEngine.ts"
);

interface JournalRow {
  id: string;
  source_key: string;
  record_count: number;
  completed_at: string;
}

interface FakeState {
  records: ExecutionRecordDatabaseRow[];
  journal: JournalRow[];
  unrelated: string[];
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
    for (const waiter of this.waiters.splice(0)) {
      waiter({ done: true, value: undefined });
    }
  }

  [Symbol.asyncIterator](): AsyncIterator<T> {
    return {
      next: async () => {
        const value = this.values.shift();
        if (value !== undefined) return { done: false, value };
        if (this.closed) return { done: true, value: undefined };
        return new Promise((resolve) => this.waiters.push(resolve));
      },
    };
  }
}

function emptyState(): FakeState {
  return { records: [], journal: [], unrelated: ["capture-row"] };
}

class FakePowerSyncDatabase {
  readonly state: FakeState;
  readonly operations: string[] = [];
  initCalls = 0;
  failOnInsert = false;
  corruptVerification = false;
  private readonly watchers = new Set<AsyncQueue<QueryResult>>();

  constructor(state?: FakeState) {
    this.state = state ?? emptyState();
  }

  async init(): Promise<void> { this.initCalls += 1; }

  async getAll<T>(sql: string): Promise<T[]> {
    return this.getAllFrom<T>(this.state, sql);
  }

  async getOptional<T>(sql: string, parameters: unknown[] = []): Promise<T | null> {
    if (!sql.includes("migration_journal")) return null;
    return (this.state.journal.find((row) => row.id === parameters[0]) ?? null) as T | null;
  }

  async writeTransaction<T>(callback: (transaction: Transaction) => Promise<T>): Promise<T> {
    const draft = structuredClone(this.state);
    const result = await callback(this.transactionFor(draft));
    this.state.records = draft.records;
    this.state.journal = draft.journal;
    this.state.unrelated = draft.unrelated;
    this.emit();
    return result;
  }

  watch(
    _sql: string,
    _parameters: unknown[],
    options: { signal: AbortSignal }
  ): AsyncIterable<QueryResult> {
    const queue = new AsyncQueue<QueryResult>();
    this.watchers.add(queue);
    queue.push(this.result());
    options.signal.addEventListener("abort", () => {
      this.watchers.delete(queue);
      queue.close();
    }, { once: true });
    return queue;
  }

  private transactionFor(state: FakeState): Transaction {
    return {
      getAll: <T>(sql: string) => this.getAllFrom<T>(state, sql),
      getOptional: async <T>(sql: string, parameters: unknown[] = []) => {
        if (!sql.includes("migration_journal")) return null;
        return (state.journal.find((row) => row.id === parameters[0]) ?? null) as T | null;
      },
      execute: async (sql: string, parameters: unknown[] = []) => {
        this.executeAgainst(state, sql, parameters);
        return this.result();
      },
    } as unknown as Transaction;
  }

  private async getAllFrom<T>(state: FakeState, sql: string): Promise<T[]> {
    if (!sql.includes("execution_records")) return [];
    let rows = [...state.records].sort((left, right) =>
      left.sort_order - right.sort_order || left.id.localeCompare(right.id));
    if (this.corruptVerification && rows.length > 0) {
      rows = [{ ...rows[0]!, title: "corrupt" }, ...rows.slice(1)];
    }
    return rows as T[];
  }

  private executeAgainst(state: FakeState, sql: string, p: unknown[]): void {
    if (sql.startsWith("INSERT INTO execution_records")) {
      if (this.failOnInsert) throw new Error("injected execution insert failure");
      const [id, executionId, type, entityId, title, description, createdAt,
        xpAwarded, icon, color, metadataJson, sortOrder, extrasJson] = p;
      if (state.records.some((row) => row.id === id)) {
        throw new Error("duplicate database row ID");
      }
      state.records.push({
        id: String(id), execution_id: String(executionId), type: String(type),
        entity_id: String(entityId), title: String(title),
        description: description === null ? null : String(description),
        created_at: String(createdAt), xp_awarded: Number(xpAwarded),
        icon: icon === null ? null : String(icon),
        color: color === null ? null : String(color),
        metadata_json: metadataJson === null ? null : String(metadataJson),
        sort_order: Number(sortOrder),
        extras_json: extrasJson === null ? null : String(extrasJson),
      });
      this.operations.push(`insert:${String(id)}`);
      return;
    }
    if (sql === "DELETE FROM execution_records") {
      state.records = [];
      this.operations.push("clear");
      return;
    }
    if (sql.startsWith("DELETE FROM execution_records WHERE execution_id")) {
      state.records = state.records.filter((row) => row.execution_id !== p[0]);
      this.operations.push(`remove:${String(p[0])}`);
      return;
    }
    if (sql.startsWith("INSERT INTO migration_journal")) {
      const [id, sourceKey, recordCount, completedAt] = p;
      state.journal.push({
        id: String(id), source_key: String(sourceKey),
        record_count: Number(recordCount), completed_at: String(completedAt),
      });
      this.operations.push(`marker:${String(id)}`);
    }
  }

  private result(): QueryResult {
    const ordered = [...this.state.records].sort((left, right) =>
      left.sort_order - right.sort_order || left.id.localeCompare(right.id));
    return { rows: { _array: ordered }, array: ordered } as unknown as QueryResult;
  }

  private emit(): void {
    const result = this.result();
    for (const watcher of this.watchers) watcher.push(result);
  }
}

class MemoryStorage implements ExecutionHistoryStorage {
  readonly values = new Map<string, string>();
  readonly writes: string[] = [];
  getItem(key: string): string | null { return this.values.get(key) ?? null; }
  setItem(key: string, value: string): void {
    this.writes.push(key);
    this.values.set(key, value);
  }
  removeItem(key: string): void { this.values.delete(key); }
}

const first = {
  id: 700,
  type: "task_completed",
  entityId: 70,
  title: "Execution boundary",
  description: "Exact historical state",
  createdAt: "2026-09-10T10:00:00.000Z",
  xpAwarded: 25,
  icon: "check",
  color: "cyan",
  metadata: { weeklyTargetId: 5, nested: { preserved: true } },
  importedBy: "legacy",
} as ExecutionRecord & { importedBy: string };

const duplicate = {
  id: 700,
  type: "weekly_completed",
  entityId: 71,
  title: "Duplicate canonical ID",
  createdAt: "2026-09-10T09:00:00.000Z",
  xpAwarded: 100,
} satisfies ExecutionRecord;

const zeroXP = {
  id: 702,
  type: "task_completed",
  entityId: 72,
  title: "Previously completed without another reward",
  createdAt: "2026-09-10T08:00:00.000Z",
  xpAwarded: 0,
} satisfies ExecutionRecord;

function source(
  records: ExecutionRecord[] = [first, duplicate, zeroXP]
): { inspect(): ExecutionHistorySourceSnapshot } {
  return { inspect: () => ({ status: "valid", records: structuredClone(records) }) };
}

function rowIds() {
  let next = 0;
  return () => `row-${String(next++).padStart(3, "0")}`;
}

function asDatabase(database: FakePowerSyncDatabase) {
  return database as never;
}

async function tick(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 0));
}

test("source inspection distinguishes missing, malformed, invalid top-level, and invalid records without writes", () => {
  const storage = new MemoryStorage();
  const repository = new LocalStorageExecutionHistoryRepository(storage);
  assert.deepEqual(repository.inspect(), { status: "missing", records: [] });

  for (const value of ["{bad", JSON.stringify({ records: [] }), JSON.stringify([{ ...first, id: "700" }])]) {
    storage.values.set("lifeos-execution-history", value);
    assert.deepEqual(repository.inspect(), { status: "invalid", records: [] });
  }
  assert.deepEqual(storage.writes, []);
});

test("migration preserves every field, extras, duplicates, exact order, and XP", async () => {
  const database = new FakePowerSyncDatabase();
  const result = await migrateLocalStorageExecutionHistory(
    asDatabase(database), source(), "2026-09-13T00:00:00.000Z", rowIds());

  assert.deepEqual(result, { status: "complete", imported: 3 });
  const repository = new PowerSyncExecutionHistoryRepository(
    asDatabase(database), source(), rowIds());
  const loaded = await repository.initialize();
  assert.deepEqual(loaded, [first, duplicate, zeroXP]);
  assert.equal(database.state.records.filter((row) => row.execution_id === "700").length, 2);
  assert.notEqual(database.state.records[0]?.id, database.state.records[1]?.id);
  assert.equal(getExecutionTotalXP(loaded), 125);
  assert.deepEqual(database.state.journal, [{
    id: EXECUTION_HISTORY_MIGRATION_ID,
    source_key: "lifeos-execution-history",
    record_count: 3,
    completed_at: "2026-09-13T00:00:00.000Z",
  }]);
  assert.equal(database.operations.at(-1), `marker:${EXECUTION_HISTORY_MIGRATION_ID}`);
});

test("missing and valid empty sources migrate idempotently without replay", async () => {
  for (const status of ["missing", "valid"] as const) {
    const database = new FakePowerSyncDatabase();
    let inspections = 0;
    const emptySource = { inspect: () => {
      inspections += 1;
      return { status, records: [] } as ExecutionHistorySourceSnapshot;
    } };
    const repository = new PowerSyncExecutionHistoryRepository(
      asDatabase(database), emptySource, rowIds());
    assert.deepEqual(await repository.initialize(), []);
    assert.deepEqual(await repository.initialize(), []);
    assert.equal(inspections, 1);
    assert.equal(database.initCalls, 1);
    assert.equal(database.state.journal.length, 1);
    assert.equal(database.state.records.length, 0);
  }
});

test("invalid source stops with no table or marker writes", async () => {
  const database = new FakePowerSyncDatabase();
  const invalid = { inspect: () => ({
    status: "invalid", records: [],
  } as ExecutionHistorySourceSnapshot) };
  assert.deepEqual(
    await migrateLocalStorageExecutionHistory(asDatabase(database), invalid),
    { status: "invalid-source", imported: 0 }
  );
  assert.deepEqual(database.state, emptyState());
  assert.deepEqual(database.operations, []);
});

test("unsafe IDs are rejected without changing the source or database", async () => {
  const database = new FakePowerSyncDatabase();
  const unsafe = [{ ...first, id: Number.MAX_SAFE_INTEGER + 1 }];
  assert.deepEqual(
    await migrateLocalStorageExecutionHistory(asDatabase(database), source(unsafe)),
    { status: "invalid-source", imported: 0 }
  );
  assert.equal(unsafe[0]?.id, Number.MAX_SAFE_INTEGER + 1);
  assert.deepEqual(database.state, emptyState());
  assert.equal(executionIdToDatabaseId(42), "42");
  assert.equal(databaseIdToExecutionId("42"), 42);
  assert.throws(() => executionIdToDatabaseId(-1), /cannot be stored safely/);
  assert.throws(() => databaseIdToExecutionId("042"), /Invalid/);
});

test("unjournaled non-empty tables are rejected", async () => {
  const database = new FakePowerSyncDatabase();
  database.state.records.push({
    id: "existing", execution_id: "1", type: "system", entity_id: "1",
    title: "existing", description: null, created_at: "2026-09-01T00:00:00.000Z",
    xp_awarded: 0, icon: null, color: null, metadata_json: null,
    sort_order: 0, extras_json: null,
  });
  await assert.rejects(
    migrateLocalStorageExecutionHistory(asDatabase(database), source()),
    /unjournaled non-empty/
  );
  assert.equal(database.state.records.length, 1);
  assert.equal(database.state.journal.length, 0);
});

test("failed migration rolls back rows and marker while preserving source", async () => {
  const database = new FakePowerSyncDatabase();
  database.failOnInsert = true;
  const records = [structuredClone(first)];
  await assert.rejects(
    migrateLocalStorageExecutionHistory(asDatabase(database), source(records),
      undefined, rowIds()),
    /injected/
  );
  assert.deepEqual(database.state, emptyState());
  assert.deepEqual(records, [first]);
});

test("verification failure rolls back and never writes a marker", async () => {
  const database = new FakePowerSyncDatabase();
  database.corruptVerification = true;
  await assert.rejects(
    migrateLocalStorageExecutionHistory(asDatabase(database), source(),
      undefined, rowIds()),
    /verification failed/
  );
  assert.deepEqual(database.state, emptyState());
});

test("single, batch, concurrent, and duplicate-ID appends preserve newest-first order", async () => {
  const database = new FakePowerSyncDatabase();
  const repository = new PowerSyncExecutionHistoryRepository(
    asDatabase(database), source([first]), rowIds());
  await repository.initialize();
  const a = { ...zeroXP, id: 801, title: "A" };
  const b = { ...zeroXP, id: 802, title: "B" };
  const c = { ...zeroXP, id: first.id, title: "C duplicate" };

  assert.deepEqual((await repository.append([a])).map((item) => item.title),
    ["A", first.title]);
  await Promise.all([repository.append([b, c]), repository.append([duplicate])]);
  const loaded = await repository.initialize().then(() =>
    database.getAll<ExecutionRecordDatabaseRow>(EXECUTION_HISTORY_QUERY));
  assert.deepEqual(loaded.map((row) => row.title),
    [duplicate.title, "B", "C duplicate", "A", first.title]);
  assert.equal(loaded.filter((row) => row.execution_id === "700").length, 3);
});

test("remove deletes all canonical-ID matches and absent removal performs no write", async () => {
  const database = new FakePowerSyncDatabase();
  const repository = new PowerSyncExecutionHistoryRepository(
    asDatabase(database), source(), rowIds());
  await repository.initialize();
  const before = database.operations.length;
  assert.deepEqual(await repository.remove(999), [first, duplicate, zeroXP]);
  assert.equal(database.operations.length, before);
  assert.deepEqual(await repository.remove(700), [zeroXP]);
  assert.equal(database.state.records.filter((row) => row.execution_id === "700").length, 0);
});

test("replace preserves duplicates and clear removes execution rows only", async () => {
  const database = new FakePowerSyncDatabase();
  const repository = new PowerSyncExecutionHistoryRepository(
    asDatabase(database), source(), rowIds());
  await repository.initialize();
  assert.deepEqual(await repository.replace([duplicate, first]), [duplicate, first]);
  assert.equal(database.state.records.length, 2);
  await repository.clear();
  assert.deepEqual(database.state.records, []);
  assert.deepEqual(database.state.unrelated, ["capture-row"]);
  assert.equal(database.state.journal.length, 1);
});

test("reopen returns exact durable history and watch publishes one ordered snapshot", async () => {
  const database = new FakePowerSyncDatabase();
  const repository = new PowerSyncExecutionHistoryRepository(
    asDatabase(database), source(), rowIds());
  await repository.initialize();
  const events: ExecutionHistoryRepositoryEvent[] = [];
  const unsubscribe = repository.subscribe((event) => events.push(event));
  await tick();
  await repository.append([{ ...zeroXP, id: 900, title: "watched" }]);
  await tick();
  unsubscribe();
  const histories = events.filter((event) => event.type === "history");
  assert.ok(histories.length >= 1);
  assert.equal(histories.at(-1)?.type, "history");
  if (histories.at(-1)?.type === "history") {
    assert.equal(histories.at(-1)?.records[0]?.title, "watched");
  }

  const reopened = new PowerSyncExecutionHistoryRepository(
    asDatabase(database), source([]), rowIds());
  const before = database.state.records.length;
  assert.equal((await reopened.initialize()).length, before);
  assert.equal(database.state.records.length, before);
});

class ControlledRepository implements AsyncExecutionHistoryRepository {
  private listener?: (event: ExecutionHistoryRepositoryEvent) => void;
  private readonly initial: ExecutionRecord[];
  readonly pending: Array<{
    records: ExecutionRecord[];
    resolve: (records: ExecutionRecord[]) => void;
  }> = [];
  constructor(initial: ExecutionRecord[]) { this.initial = initial; }
  async initialize(): Promise<ExecutionRecord[]> { return structuredClone(this.initial); }
  replace(records: ExecutionRecord[]): Promise<ExecutionRecord[]> { return this.defer(records); }
  append(records: ExecutionRecord[]): Promise<ExecutionRecord[]> {
    return this.defer([...records, ...this.initial]);
  }
  remove(id: number): Promise<ExecutionRecord[]> {
    return this.defer(this.initial.filter((record) => record.id !== id));
  }
  async clear(): Promise<void> { this.initial.splice(0); }
  subscribe(listener: (event: ExecutionHistoryRepositoryEvent) => void): () => void {
    this.listener = listener;
    return () => { this.listener = undefined; };
  }
  emit(records: ExecutionRecord[]): void {
    this.listener?.({ type: "history", records: structuredClone(records) });
  }
  private defer(records: ExecutionRecord[]): Promise<ExecutionRecord[]> {
    return new Promise((resolve) => this.pending.push({ records, resolve }));
  }
}

test("service hydrates once, publishes optimistically, and rejects stale watch snapshots", async () => {
  const repository = new ControlledRepository([first]);
  ExecutionHistoryService.configureRepository(repository);
  const [left, right] = await Promise.all([
    ExecutionHistoryService.initialize(), ExecutionHistoryService.initialize(),
  ]);
  assert.deepEqual(left, right);
  let notifications = 0;
  const unsubscribe = ExecutionHistoryService.subscribe(() => { notifications += 1; });
  const added = { ...zeroXP, id: 950, title: "optimistic" };
  ExecutionHistoryService.append([added]);
  assert.equal(ExecutionHistoryService.getAll()[0]?.title, "optimistic");
  repository.emit([first]);
  assert.equal(ExecutionHistoryService.getAll()[0]?.title, "optimistic");
  repository.pending[0]?.resolve([added, first]);
  await tick();
  assert.deepEqual(ExecutionHistoryService.getAll(), [added, first]);
  assert.ok(notifications >= 1);
  unsubscribe();
});

test("migration preserves XP, blocks historical farming including zero-XP rows, and permits one new reward", async () => {
  const database = new FakePowerSyncDatabase();
  const repository = new PowerSyncExecutionHistoryRepository(
    asDatabase(database), source(), rowIds());
  const hydrated = await repository.initialize();
  assert.equal(getExecutionTotalXP(hydrated), 125);

  const repeated = XPAutomationEngine.process([
    { ...zeroXP, id: 1000, xpAwarded: 999 },
  ], hydrated);
  assert.equal(repeated.earnedXP, 0);
  assert.equal(repeated.records[0]?.xpAwarded, 0);

  const fresh = XPAutomationEngine.process([
    { ...zeroXP, id: 1001, entityId: 999, xpAwarded: 0 },
    { ...zeroXP, id: 1002, entityId: 999, xpAwarded: 0 },
  ], hydrated);
  assert.equal(fresh.earnedXP, 25);
  assert.deepEqual(fresh.records.map((record) => record.xpAwarded), [25, 0]);
  assert.equal(database.state.records.length, 3);
});
