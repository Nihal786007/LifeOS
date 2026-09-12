import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { registerHooks } from "node:module";
import test from "node:test";

import type { QueryResult, Transaction } from "@powersync/web";
import type { HabitState } from "../../src/shared/habits.ts";
import type {
  HabitCompletionDatabaseRow,
  HabitDefinitionDatabaseRow,
} from "../../src/data/habits/migrateLocalStorageHabits.ts";
import type {
  HabitSourceSnapshot,
  HabitStorage,
} from "../../src/data/habits/localStorageHabitRepository.ts";

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith(".") && !/\.[a-z]+$/i.test(specifier)) {
      return nextResolve(`${specifier}.ts`, context);
    }
    return nextResolve(specifier, context);
  },
});

const {
  HABIT_COMPLETION_QUERY,
  HABIT_DEFINITION_QUERY,
  HABIT_MIGRATION_ID,
  migrateLocalStorageHabits,
} = await import("../../src/data/habits/migrateLocalStorageHabits.ts");
const {
  PowerSyncHabitRepository,
  databaseIdToHabitId,
  habitIdToDatabaseId,
} = await import("../../src/data/habits/powerSyncHabitRepository.ts");
const {
  HABIT_STATE_STORAGE_KEY,
  LocalStorageHabitRepository,
} = await import("../../src/data/habits/localStorageHabitRepository.ts");
const { HabitEngine } = await import("../../src/engines/HabitEngine.ts");

interface JournalRow {
  id: string;
  source_key: string;
  record_count: number;
  completed_at: string;
}

interface FakeState {
  definitions: HabitDefinitionDatabaseRow[];
  completions: HabitCompletionDatabaseRow[];
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
    this.waiters.splice(0).forEach((waiter) =>
      waiter({ done: true, value: undefined })
    );
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

function emptyDatabase(): FakeState {
  return { definitions: [], completions: [], journal: [] };
}

class FakePowerSyncDatabase {
  readonly state: FakeState;
  readonly operations: string[] = [];
  initCalls = 0;
  failOnCompletionInsert = false;
  corruptVerification = false;
  private readonly watchers = new Set<AsyncQueue<QueryResult>>();

  constructor(state?: FakeState) {
    this.state = state ?? emptyDatabase();
  }

  async init(): Promise<void> { this.initCalls += 1; }

  async getAll<T>(sql: string): Promise<T[]> {
    return this.getAllFrom<T>(this.state, sql);
  }

  async getOptional<T>(sql: string, parameters: unknown[] = []): Promise<T | null> {
    if (sql.includes("FROM migration_journal")) {
      return (this.state.journal.find((row) => row.id === parameters[0]) ?? null) as T | null;
    }
    return null;
  }

  async readTransaction<T>(callback: (transaction: Transaction) => Promise<T>): Promise<T> {
    return callback(this.transactionFor(this.state));
  }

  async writeTransaction<T>(callback: (transaction: Transaction) => Promise<T>): Promise<T> {
    const draft = structuredClone(this.state);
    const result = await callback(this.transactionFor(draft));
    this.state.definitions = draft.definitions;
    this.state.completions = draft.completions;
    this.state.journal = draft.journal;
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
        if (!sql.includes("FROM migration_journal")) return null;
        return (state.journal.find((row) => row.id === parameters[0]) ?? null) as T | null;
      },
      execute: async (sql: string, parameters: unknown[] = []) => {
        this.executeAgainst(state, sql, parameters);
        return this.result();
      },
    } as unknown as Transaction;
  }

  private async getAllFrom<T>(state: FakeState, sql: string): Promise<T[]> {
    if (sql.includes("FROM habit_definitions")) {
      if (!sql.includes("sort_order")) {
        return state.definitions.map(({ id }) => ({ id })) as T[];
      }
      const rows = [...state.definitions].sort((a, b) =>
        a.sort_order - b.sort_order || a.id.localeCompare(b.id)
      );
      if (this.corruptVerification && rows.length > 0) {
        return [{ ...rows[0], name: "corrupt" }, ...rows.slice(1)] as T[];
      }
      return rows as T[];
    }
    if (sql.includes("FROM habit_completions")) {
      if (!sql.includes("sort_order")) {
        return state.completions.map(({ id }) => ({ id })) as T[];
      }
      return [...state.completions].sort((a, b) =>
        a.sort_order - b.sort_order || a.id.localeCompare(b.id)
      ) as T[];
    }
    return [];
  }

  private executeAgainst(state: FakeState, sql: string, p: unknown[]): void {
    if (sql.startsWith("INSERT INTO habit_definitions")) {
      const [id, name, description, activeDays, startDate, archived, archivedAt,
        createdAt, updatedAt, sortOrder, extrasJson] = p;
      state.definitions.push({
        id: String(id), name: String(name),
        description: description === null ? null : String(description),
        active_days_json: String(activeDays), start_date: String(startDate),
        archived: Number(archived),
        archived_at: archivedAt === null ? null : String(archivedAt),
        created_at: String(createdAt), updated_at: String(updatedAt),
        sort_order: Number(sortOrder),
        extras_json: extrasJson === null ? null : String(extrasJson),
      });
      this.operations.push(`definition:${String(id)}`);
      return;
    }
    if (sql.startsWith("UPDATE habit_definitions")) {
      const [name, description, activeDays, startDate, archived, archivedAt,
        createdAt, updatedAt, sortOrder, extrasJson, id] = p;
      const index = state.definitions.findIndex((row) => row.id === id);
      if (index < 0) throw new Error("missing definition");
      state.definitions[index] = {
        id: String(id), name: String(name),
        description: description === null ? null : String(description),
        active_days_json: String(activeDays), start_date: String(startDate),
        archived: Number(archived),
        archived_at: archivedAt === null ? null : String(archivedAt),
        created_at: String(createdAt), updated_at: String(updatedAt),
        sort_order: Number(sortOrder),
        extras_json: extrasJson === null ? null : String(extrasJson),
      };
      return;
    }
    if (sql.startsWith("DELETE FROM habit_definitions")) {
      state.definitions = state.definitions.filter((row) => row.id !== p[0]);
      return;
    }
    if (sql.startsWith("INSERT INTO habit_completions")) {
      if (this.failOnCompletionInsert) throw new Error("injected completion failure");
      const [id, habitId, date, completedAt, sortOrder, extrasJson] = p;
      state.completions.push({
        id: String(id), habit_id: String(habitId), date: String(date),
        completed_at: String(completedAt), sort_order: Number(sortOrder),
        extras_json: extrasJson === null ? null : String(extrasJson),
      });
      this.operations.push(`completion:${String(id)}`);
      return;
    }
    if (sql.startsWith("UPDATE habit_completions")) {
      const [habitId, date, completedAt, sortOrder, extrasJson, id] = p;
      const index = state.completions.findIndex((row) => row.id === id);
      if (index < 0) throw new Error("missing completion");
      state.completions[index] = {
        id: String(id), habit_id: String(habitId), date: String(date),
        completed_at: String(completedAt), sort_order: Number(sortOrder),
        extras_json: extrasJson === null ? null : String(extrasJson),
      };
      return;
    }
    if (sql.startsWith("DELETE FROM habit_completions")) {
      state.completions = state.completions.filter((row) => row.id !== p[0]);
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
    return { rows: { _array: [] }, array: [] } as unknown as QueryResult;
  }
  private emit(): void {
    const result = this.result();
    this.watchers.forEach((watcher) => watcher.push(result));
  }
}

class MemoryStorage implements HabitStorage {
  readonly values = new Map<string, string>();
  readonly writes: string[] = [];
  getItem(key: string): string | null { return this.values.get(key) ?? null; }
  setItem(key: string, value: string): void {
    this.writes.push(key);
    this.values.set(key, value);
  }
}

const habitState = {
  habits: [
    {
      id: 1700000001002,
      name: "Second in canonical order",
      description: "Preserved",
      activeDays: ["friday", "monday"],
      startDate: "2026-09-01",
      archived: true,
      archivedAt: "2026-09-11T18:00:00.000Z",
      createdAt: "2026-09-01T08:00:00.000Z",
      updatedAt: "2026-09-11T18:00:00.000Z",
      color: "cyan",
    },
    {
      id: 1700000001001,
      name: "First by ID, second by order",
      activeDays: ["tuesday", "thursday"],
      startDate: "2026-09-02",
      archived: false,
      createdAt: "2026-09-02T08:00:00.000Z",
      updatedAt: "2026-09-02T08:00:00.000Z",
    },
  ],
  completions: [
    {
      id: 1700000002002,
      habitId: 1700000001002,
      date: "2026-09-11",
      completedAt: "2026-09-11T21:30:00.000Z",
      importedBy: "legacy",
    },
    {
      id: 1700000002001,
      habitId: 1700000001001,
      date: "2026-09-10",
      completedAt: "2026-09-10T20:00:00.000Z",
    },
  ],
} as unknown as HabitState;

const emptyState: HabitState = { habits: [], completions: [] };
const source = (snapshot: HabitSourceSnapshot = { status: "valid", state: habitState }) => ({
  calls: 0,
  inspect() {
    this.calls += 1;
    return snapshot;
  },
});
const asDatabase = (database: FakePowerSyncDatabase) =>
  database as unknown as import("@powersync/web").PowerSyncDatabase;

test("missing and valid empty envelopes migrate atomically", async () => {
  for (const status of ["missing", "valid"] as const) {
    const database = new FakePowerSyncDatabase();
    const result = await migrateLocalStorageHabits(database, source({ status, state: emptyState }));
    assert.equal(result.status, "complete");
    assert.equal(result.imported, 0);
    assert.equal(database.state.journal[0]?.id, HABIT_MIGRATION_ID);
  }
});

test("invalid envelope stops with no rows or marker", async () => {
  const database = new FakePowerSyncDatabase();
  assert.deepEqual(
    await migrateLocalStorageHabits(database, source({ status: "invalid", state: emptyState })),
    { status: "invalid-source", imported: 0 }
  );
  assert.deepEqual(database.state, emptyDatabase());
});

test("populated migration preserves IDs, dates, timestamps, schedules, extras, and order", async () => {
  const database = new FakePowerSyncDatabase();
  const repository = new PowerSyncHabitRepository(asDatabase(database), source());
  assert.deepEqual(await repository.initialize(), habitState);
  assert.deepEqual(database.state.definitions.map((row) => row.id), [
    "1700000001002", "1700000001001",
  ]);
  assert.equal(database.state.definitions[0]?.active_days_json, '["friday","monday"]');
  assert.equal(database.state.completions[0]?.date, "2026-09-11");
  assert.equal(database.state.completions[0]?.completed_at, "2026-09-11T21:30:00.000Z");
  assert.equal(database.operations.at(-1), `marker:${HABIT_MIGRATION_ID}`);
});

test("strict numeric ID mapping rejects noncanonical and unsafe IDs", () => {
  assert.equal(habitIdToDatabaseId(1700000001001), "1700000001001");
  assert.equal(databaseIdToHabitId("1700000001001"), 1700000001001);
  for (const id of ["01", "1.5", "1e3", "+1", "-1", "habit-1", "9007199254740992"]) {
    assert.throws(() => databaseIdToHabitId(id));
  }
  for (const id of [-1, 1.5, Number.MAX_SAFE_INTEGER + 1]) {
    assert.throws(() => habitIdToDatabaseId(id));
  }
});

test("migration rejects duplicate definitions, completions, and habit/date pairs", async () => {
  const variants: Array<[HabitState, RegExp]> = [
    [{ ...habitState, habits: [habitState.habits[0]!, habitState.habits[0]!] }, /duplicate definition/],
    [{ ...habitState, completions: [habitState.completions[0]!, habitState.completions[0]!] }, /duplicate completion IDs/],
    [{ ...habitState, completions: [habitState.completions[0]!, {
      ...habitState.completions[0]!, id: 1700000002999,
    }] }, /duplicate habit\/date/],
  ];
  for (const [state, error] of variants) {
    const database = new FakePowerSyncDatabase();
    await assert.rejects(migrateLocalStorageHabits(database, source({ status: "valid", state })), error);
    assert.deepEqual(database.state, emptyDatabase());
  }
});

test("unsafe source IDs fail before transaction writes", async () => {
  const database = new FakePowerSyncDatabase();
  const state = structuredClone(habitState);
  state.completions[0]!.habitId = -1;
  await assert.rejects(migrateLocalStorageHabits(database, source({ status: "valid", state })), /cannot be stored safely/);
  assert.deepEqual(database.state, emptyDatabase());
});

test("orphan completion is preserved and reported without repair", async () => {
  const state = structuredClone(habitState);
  state.completions[0]!.habitId = 999;
  const database = new FakePowerSyncDatabase();
  const repository = new PowerSyncHabitRepository(
    asDatabase(database), source({ status: "valid", state })
  );
  assert.deepEqual(await repository.initialize(), state);
  assert.deepEqual(repository.getLastRelationshipReport(), {
    validCompletionLinks: 1,
    orphanCompletionIds: [1700000002002],
  });
});

test("migration is idempotent and initialization is Strict Mode safe", async () => {
  const database = new FakePowerSyncDatabase();
  const migrationSource = source();
  const repository = new PowerSyncHabitRepository(asDatabase(database), migrationSource);
  const [left, right] = await Promise.all([repository.initialize(), repository.initialize()]);
  assert.deepEqual(left, habitState);
  assert.deepEqual(right, habitState);
  assert.equal(database.initCalls, 1);
  assert.equal(migrationSource.calls, 1);
  assert.deepEqual(await migrateLocalStorageHabits(database, migrationSource), {
    status: "already-complete", imported: 0,
  });
});

test("failed transaction rolls back both tables and omits marker", async () => {
  const database = new FakePowerSyncDatabase();
  database.failOnCompletionInsert = true;
  await assert.rejects(migrateLocalStorageHabits(database, source()), /injected completion failure/);
  assert.deepEqual(database.state, emptyDatabase());
});

test("verification failure rolls back before marker creation", async () => {
  const database = new FakePowerSyncDatabase();
  database.corruptVerification = true;
  await assert.rejects(migrateLocalStorageHabits(database, source()), /verification failed/);
  assert.deepEqual(database.state, emptyDatabase());
});

test("LocalStorage source stays unchanged and distinguishes missing, valid, invalid", async () => {
  const storage = new MemoryStorage();
  const json = JSON.stringify(habitState);
  storage.values.set(HABIT_STATE_STORAGE_KEY, json);
  const local = new LocalStorageHabitRepository(storage);
  await migrateLocalStorageHabits(new FakePowerSyncDatabase(), local);
  assert.equal(storage.values.get(HABIT_STATE_STORAGE_KEY), json);
  assert.deepEqual(storage.writes, []);
  assert.equal(local.inspect().status, "valid");
  assert.equal(new LocalStorageHabitRepository(new MemoryStorage()).inspect().status, "missing");
  storage.values.set(HABIT_STATE_STORAGE_KEY, "{bad");
  assert.equal(local.inspect().status, "invalid");
});

test("reopen loads persisted state without rereading the rollback source", async () => {
  const databaseState = emptyDatabase();
  const firstSource = source();
  await new PowerSyncHabitRepository(
    asDatabase(new FakePowerSyncDatabase(databaseState)), firstSource
  ).initialize();
  const missingSource = source({ status: "missing", state: emptyState });
  const reopened = new PowerSyncHabitRepository(
    asDatabase(new FakePowerSyncDatabase(databaseState)), missingSource
  );
  assert.deepEqual(await reopened.initialize(), habitState);
  assert.equal(missingSource.calls, 0);
});

test("whole-state replacement updates, archives, inserts, removes, and preserves order", async () => {
  const database = new FakePowerSyncDatabase();
  const repository = new PowerSyncHabitRepository(asDatabase(database), source());
  await repository.initialize();
  const next: HabitState = {
    habits: [
      { ...habitState.habits[1]!, name: "Updated", archived: true,
        archivedAt: "2026-09-12T08:00:00.000Z" },
      { ...habitState.habits[0]!, id: 1700000001003, name: "Created" },
    ],
    completions: [
      { ...habitState.completions[1]!, completedAt: "2026-09-10T21:00:00.000Z" },
      { id: 1700000002003, habitId: 1700000001003, date: "2026-09-12",
        completedAt: "2026-09-12T20:00:00.000Z" },
    ],
  };
  await repository.replace(next);
  const reopened = new PowerSyncHabitRepository(
    asDatabase(new FakePowerSyncDatabase(database.state)),
    source({ status: "missing", state: emptyState })
  );
  assert.deepEqual(await reopened.initialize(), next);
});

test("ordered concurrent replacements commit in call order", async () => {
  const database = new FakePowerSyncDatabase();
  const repository = new PowerSyncHabitRepository(
    asDatabase(database), source({ status: "valid", state: emptyState })
  );
  await repository.initialize();
  await Promise.all([
    repository.replace({ habits: habitState.habits, completions: [] }),
    repository.replace(habitState),
  ]);
  const reopened = new PowerSyncHabitRepository(
    asDatabase(new FakePowerSyncDatabase(database.state)),
    source({ status: "missing", state: emptyState })
  );
  assert.deepEqual(await reopened.initialize(), habitState);
});

test("one coordinated watch publishes complete state and unsubscribes", async () => {
  const database = new FakePowerSyncDatabase();
  const repository = new PowerSyncHabitRepository(asDatabase(database), source());
  await repository.initialize();
  const events: HabitState[] = [];
  const unsubscribe = repository.subscribe((event) => {
    if (event.type === "habits") events.push(event.state);
  });
  await new Promise((resolve) => setTimeout(resolve, 0));
  const reversed = {
    habits: [...habitState.habits].reverse(),
    completions: [...habitState.completions].reverse(),
  };
  await repository.replace(reversed);
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.deepEqual(events.at(-1), reversed);
  const count = events.length;
  unsubscribe();
  await repository.replace(habitState);
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.equal(events.length, count);
});

test("corrupted record and relationship IDs reject the complete state", async () => {
  const base = new FakePowerSyncDatabase();
  await new PowerSyncHabitRepository(asDatabase(base), source()).initialize();
  for (const mutate of [
    (state: FakeState) => { state.definitions[0]!.id = "01"; },
    (state: FakeState) => { state.completions[0]!.id = "1e3"; },
    (state: FakeState) => { state.completions[0]!.habit_id = "+1"; },
  ]) {
    const state = structuredClone(base.state);
    mutate(state);
    const repository = new PowerSyncHabitRepository(
      asDatabase(new FakePowerSyncDatabase(state)),
      source({ status: "missing", state: emptyState })
    );
    await assert.rejects(repository.initialize(), /database ID/);
  }
});

test("migration creates no execution or XP side effects and persists no derived fields", async () => {
  const database = new FakePowerSyncDatabase();
  await migrateLocalStorageHabits(database, source());
  assert.equal(database.operations.some((operation) =>
    operation.startsWith("execution:") || operation.startsWith("xp:")
  ), false);
  const persisted = JSON.stringify([database.state.definitions, database.state.completions]);
  for (const derived of ["streak", "completionPercentage", "scheduledToday", "analytics"]) {
    assert.equal(persisted.includes(derived), false);
  }
});

test("HabitEngine streak derivation is unchanged after database round-trip", async () => {
  const state: HabitState = {
    habits: [{
      id: 1, name: "Daily", activeDays: ["monday", "tuesday", "wednesday",
        "thursday", "friday", "saturday", "sunday"],
      startDate: "2026-09-10", archived: false,
      createdAt: "2026-09-10T08:00:00.000Z",
      updatedAt: "2026-09-10T08:00:00.000Z",
    }],
    completions: [
      { id: 2, habitId: 1, date: "2026-09-10", completedAt: "2026-09-10T20:00:00.000Z" },
      { id: 3, habitId: 1, date: "2026-09-11", completedAt: "2026-09-11T20:00:00.000Z" },
    ],
  };
  const before = HabitEngine.getCurrentStreak(state, 1, new Date(2026, 8, 12));
  const repository = new PowerSyncHabitRepository(
    asDatabase(new FakePowerSyncDatabase()), source({ status: "valid", state })
  );
  const loaded = await repository.initialize();
  assert.equal(HabitEngine.getCurrentStreak(loaded, 1, new Date(2026, 8, 12)), before);
});

test("production schema adds exactly the two approved local-only Habit tables", async () => {
  const {
    lifeOSPowerSyncSchema,
    POWERSYNC_HABIT_COMPLETIONS_TABLE,
    POWERSYNC_HABIT_DEFINITIONS_TABLE,
  } = await import("../../src/data/database/lifeOSPowerSyncSchema.ts");
  const byName = new Map(lifeOSPowerSyncSchema.tables.map((table) => [table.name, table]));
  assert.equal(byName.get(POWERSYNC_HABIT_DEFINITIONS_TABLE)?.localOnly, true);
  assert.equal(byName.get(POWERSYNC_HABIT_COMPLETIONS_TABLE)?.localOnly, true);
  assert.deepEqual(byName.get(POWERSYNC_HABIT_DEFINITIONS_TABLE)?.columns.map((c) => c.name), [
    "name", "description", "active_days_json", "start_date", "archived",
    "archived_at", "created_at", "updated_at", "sort_order", "extras_json",
  ]);
  assert.deepEqual(byName.get(POWERSYNC_HABIT_COMPLETIONS_TABLE)?.columns.map((c) => c.name), [
    "habit_id", "date", "completed_at", "sort_order", "extras_json",
  ]);
  assert.equal(HABIT_DEFINITION_QUERY.includes("ORDER BY sort_order ASC"), true);
  assert.equal(HABIT_COMPLETION_QUERY.includes("ORDER BY sort_order ASC"), true);
});

test("HabitProvider contains hydration and stale-watch guards without global hydration", () => {
  const sourceText = readFileSync(
    new URL("../../src/context/HabitContext.tsx", import.meta.url),
    "utf8"
  );
  assert.match(sourceText, /Habit mutations require hydrated persistence/);
  assert.match(sourceText, /expectedWatchStateRef/);
  assert.match(sourceText, /watchBlockedAfterFailureRef/);
  assert.match(sourceText, /if \(!active\) return/);
});
