import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import test from "node:test";

import type { QueryResult, Transaction } from "@powersync/web";
import type {
  PlanningSourceSnapshot,
  PlanningStorage,
} from "../../src/data/planning/localStoragePlanningRepositories.ts";
import type {
  LifeGoalDatabaseRow,
  MonthlyOutcomeDatabaseRow,
  WeeklyFocusDatabaseRow,
} from "../../src/data/planning/migrateLocalStoragePlanning.ts";
import type {
  PlanningRepositoryState,
} from "../../src/data/planning/asyncPlanningRepository.ts";
import type {
  LifeGoal,
  MonthlyTarget,
  WeeklyTarget,
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
  LocalStorageLifeGoalRepository,
  LocalStorageMonthlyOutcomeRepository,
  LocalStorageWeeklyFocusRepository,
} = await import(
  "../../src/data/planning/localStoragePlanningRepositories.ts"
);
const {
  LIFE_GOAL_QUERY,
  MONTHLY_OUTCOME_QUERY,
  PLANNING_MIGRATION_ID,
  WEEKLY_FOCUS_QUERY,
  migrateLocalStoragePlanning,
} = await import(
  "../../src/data/planning/migrateLocalStoragePlanning.ts"
);
const {
  PowerSyncPlanningRepository,
  databaseIdToPlanningId,
  planningIdToDatabaseId,
} = await import(
  "../../src/data/planning/powerSyncPlanningRepository.ts"
);

interface JournalRow {
  id: string;
  source_key: string;
  record_count: number;
  completed_at: string;
}

interface TaskLinkRow {
  id: string;
  weekly_target_id: string | null;
}

interface FakeDatabaseState {
  lifeGoals: LifeGoalDatabaseRow[];
  monthlyOutcomes: MonthlyOutcomeDatabaseRow[];
  weeklyFocuses: WeeklyFocusDatabaseRow[];
  tasks: TaskLinkRow[];
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
        return new Promise<IteratorResult<T>>((resolve) => {
          this.waiters.push(resolve);
        });
      },
    };
  }
}

function emptyDatabaseState(): FakeDatabaseState {
  return {
    lifeGoals: [],
    monthlyOutcomes: [],
    weeklyFocuses: [],
    tasks: [],
    journal: [],
  };
}

class FakePowerSyncDatabase {
  readonly state: FakeDatabaseState;
  readonly operations: string[] = [];
  initCalls = 0;
  failOnWeeklyInsert = false;
  corruptVerification = false;
  private readonly watchers = new Set<AsyncQueue<QueryResult>>();

  constructor(state?: FakeDatabaseState) {
    this.state = state ?? emptyDatabaseState();
  }

  async init(): Promise<void> {
    this.initCalls += 1;
  }

  async getAll<T>(sql: string): Promise<T[]> {
    return this.getAllFrom<T>(this.state, sql);
  }

  async getOptional<T>(
    sql: string,
    parameters: unknown[] = []
  ): Promise<T | null> {
    return this.getOptionalFrom<T>(this.state, sql, parameters);
  }

  async readTransaction<T>(
    callback: (transaction: Transaction) => Promise<T>
  ): Promise<T> {
    return callback(this.transactionFor(this.state));
  }

  async writeTransaction<T>(
    callback: (transaction: Transaction) => Promise<T>
  ): Promise<T> {
    const draft = structuredClone(this.state);
    const result = await callback(this.transactionFor(draft));
    this.state.lifeGoals = draft.lifeGoals;
    this.state.monthlyOutcomes = draft.monthlyOutcomes;
    this.state.weeklyFocuses = draft.weeklyFocuses;
    this.state.tasks = draft.tasks;
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
    queue.push(this.queryResult());
    options.signal.addEventListener("abort", () => {
      this.watchers.delete(queue);
      queue.close();
    }, { once: true });
    return queue;
  }

  private transactionFor(state: FakeDatabaseState): Transaction {
    return {
      getAll: <T>(sql: string) => this.getAllFrom<T>(state, sql),
      getOptional: <T>(sql: string, parameters?: unknown[]) =>
        this.getOptionalFrom<T>(state, sql, parameters),
      execute: async (sql: string, parameters?: unknown[]) => {
        this.executeAgainst(state, sql, parameters ?? []);
        return this.queryResult();
      },
    } as unknown as Transaction;
  }

  private async getOptionalFrom<T>(
    state: FakeDatabaseState,
    sql: string,
    parameters: unknown[] = []
  ): Promise<T | null> {
    if (sql.includes("FROM migration_journal")) {
      const row = state.journal.find((candidate) =>
        candidate.id === parameters[0]
      );
      return (row ?? null) as T | null;
    }
    return null;
  }

  private sorted<T extends { id: string; sort_order: number }>(rows: T[]): T[] {
    return [...rows].sort((left, right) =>
      left.sort_order - right.sort_order || left.id.localeCompare(right.id)
    );
  }

  private async getAllFrom<T>(
    state: FakeDatabaseState,
    sql: string
  ): Promise<T[]> {
    if (sql.includes("FROM tasks")) return [...state.tasks] as T[];
    if (sql.includes("FROM life_goals")) {
      if (!sql.includes("sort_order")) {
        return state.lifeGoals.map(({ id }) => ({ id })) as T[];
      }
      const rows = this.sorted(state.lifeGoals);
      if (this.corruptVerification && rows.length > 0) {
        return [{ ...rows[0], title: "corrupt" }, ...rows.slice(1)] as T[];
      }
      return rows as T[];
    }
    if (sql.includes("FROM monthly_outcomes")) {
      if (sql.startsWith("SELECT id, goal_id")) {
        return state.monthlyOutcomes.map(({ id, goal_id }) => ({ id, goal_id })) as T[];
      }
      if (!sql.includes("sort_order")) {
        return state.monthlyOutcomes.map(({ id }) => ({ id })) as T[];
      }
      return this.sorted(state.monthlyOutcomes) as T[];
    }
    if (sql.includes("FROM weekly_focuses")) {
      if (sql.startsWith("SELECT id, monthly_target_id")) {
        return state.weeklyFocuses.map(({ id, monthly_target_id }) => ({
          id,
          monthly_target_id,
        })) as T[];
      }
      if (!sql.includes("sort_order")) {
        return state.weeklyFocuses.map(({ id }) => ({ id })) as T[];
      }
      return this.sorted(state.weeklyFocuses) as T[];
    }
    return [];
  }

  private executeAgainst(
    state: FakeDatabaseState,
    sql: string,
    parameters: unknown[]
  ): void {
    if (sql.startsWith("INSERT INTO life_goals")) {
      const [id, title, description, progress, completed, completedAt,
        startDate, targetDate, createdAt, sortOrder, extrasJson] = parameters;
      state.lifeGoals.push({
        id: String(id), title: String(title),
        description: description === null ? null : String(description),
        progress: Number(progress), completed: Number(completed),
        completed_at: completedAt === null ? null : String(completedAt),
        start_date: String(startDate),
        target_date: targetDate === null ? null : String(targetDate),
        created_at: String(createdAt), sort_order: Number(sortOrder),
        extras_json: extrasJson === null ? null : String(extrasJson),
      });
      this.operations.push(`life-goal:${String(id)}`);
      return;
    }
    if (sql.startsWith("UPDATE life_goals")) {
      const [title, description, progress, completed, completedAt, startDate,
        targetDate, createdAt, sortOrder, extrasJson, id] = parameters;
      const index = state.lifeGoals.findIndex((row) => row.id === id);
      if (index < 0) throw new Error("missing Life Goal");
      state.lifeGoals[index] = {
        id: String(id), title: String(title),
        description: description === null ? null : String(description),
        progress: Number(progress), completed: Number(completed),
        completed_at: completedAt === null ? null : String(completedAt),
        start_date: String(startDate),
        target_date: targetDate === null ? null : String(targetDate),
        created_at: String(createdAt), sort_order: Number(sortOrder),
        extras_json: extrasJson === null ? null : String(extrasJson),
      };
      return;
    }
    if (sql.startsWith("DELETE FROM life_goals")) {
      state.lifeGoals = state.lifeGoals.filter((row) => row.id !== parameters[0]);
      return;
    }

    if (sql.startsWith("INSERT INTO monthly_outcomes")) {
      const [id, title, month, year, goalId, progress, completed, completedAt,
        createdAt, sortOrder, extrasJson] = parameters;
      state.monthlyOutcomes.push({
        id: String(id), title: String(title), month: Number(month),
        year: Number(year), goal_id: goalId === null ? null : String(goalId),
        progress: Number(progress), completed: Number(completed),
        completed_at: completedAt === null ? null : String(completedAt),
        created_at: String(createdAt), sort_order: Number(sortOrder),
        extras_json: extrasJson === null ? null : String(extrasJson),
      });
      this.operations.push(`monthly:${String(id)}`);
      return;
    }
    if (sql.startsWith("UPDATE monthly_outcomes")) {
      const [title, month, year, goalId, progress, completed, completedAt,
        createdAt, sortOrder, extrasJson, id] = parameters;
      const index = state.monthlyOutcomes.findIndex((row) => row.id === id);
      if (index < 0) throw new Error("missing Monthly Outcome");
      state.monthlyOutcomes[index] = {
        id: String(id), title: String(title), month: Number(month),
        year: Number(year), goal_id: goalId === null ? null : String(goalId),
        progress: Number(progress), completed: Number(completed),
        completed_at: completedAt === null ? null : String(completedAt),
        created_at: String(createdAt), sort_order: Number(sortOrder),
        extras_json: extrasJson === null ? null : String(extrasJson),
      };
      return;
    }
    if (sql.startsWith("DELETE FROM monthly_outcomes")) {
      state.monthlyOutcomes = state.monthlyOutcomes.filter(
        (row) => row.id !== parameters[0]
      );
      return;
    }

    if (sql.startsWith("INSERT INTO weekly_focuses")) {
      if (this.failOnWeeklyInsert) throw new Error("injected Weekly Focus failure");
      const [id, title, monthlyId, week, weekStart, weekEnd, progress,
        completed, completedAt, createdAt, sortOrder, extrasJson] = parameters;
      state.weeklyFocuses.push({
        id: String(id), title: String(title),
        monthly_target_id: monthlyId === null ? null : String(monthlyId),
        week: Number(week),
        week_start_date: weekStart === null ? null : String(weekStart),
        week_end_date: weekEnd === null ? null : String(weekEnd),
        progress: Number(progress), completed: Number(completed),
        completed_at: completedAt === null ? null : String(completedAt),
        created_at: String(createdAt), sort_order: Number(sortOrder),
        extras_json: extrasJson === null ? null : String(extrasJson),
      });
      this.operations.push(`weekly:${String(id)}`);
      return;
    }
    if (sql.startsWith("UPDATE weekly_focuses")) {
      const [title, monthlyId, week, weekStart, weekEnd, progress, completed,
        completedAt, createdAt, sortOrder, extrasJson, id] = parameters;
      const index = state.weeklyFocuses.findIndex((row) => row.id === id);
      if (index < 0) throw new Error("missing Weekly Focus");
      state.weeklyFocuses[index] = {
        id: String(id), title: String(title),
        monthly_target_id: monthlyId === null ? null : String(monthlyId),
        week: Number(week),
        week_start_date: weekStart === null ? null : String(weekStart),
        week_end_date: weekEnd === null ? null : String(weekEnd),
        progress: Number(progress), completed: Number(completed),
        completed_at: completedAt === null ? null : String(completedAt),
        created_at: String(createdAt), sort_order: Number(sortOrder),
        extras_json: extrasJson === null ? null : String(extrasJson),
      };
      return;
    }
    if (sql.startsWith("DELETE FROM weekly_focuses")) {
      state.weeklyFocuses = state.weeklyFocuses.filter(
        (row) => row.id !== parameters[0]
      );
      return;
    }

    if (sql.startsWith("INSERT INTO migration_journal")) {
      const [id, sourceKey, recordCount, completedAt] = parameters;
      state.journal.push({
        id: String(id), source_key: String(sourceKey),
        record_count: Number(recordCount), completed_at: String(completedAt),
      });
      this.operations.push(`marker:${String(id)}`);
    }
  }

  private queryResult(): QueryResult {
    return { rows: { _array: [] }, array: [] } as unknown as QueryResult;
  }

  private emit(): void {
    const result = this.queryResult();
    this.watchers.forEach((watcher) => watcher.push(result));
  }
}

class MemoryStorage implements PlanningStorage {
  readonly values = new Map<string, string>();
  readonly writes: string[] = [];
  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }
  setItem(key: string, value: string): void {
    this.writes.push(key);
    this.values.set(key, value);
  }
}

function snapshotSource<T>(snapshot: PlanningSourceSnapshot<T>) {
  return {
    calls: 0,
    inspect() {
      this.calls += 1;
      return snapshot;
    },
  };
}

const lifeGoals = [
  {
    id: 1700000001001,
    title: "Second goal",
    description: "Preserve fields",
    progress: 40,
    completed: false,
    startDate: "2026-09-01",
    targetDate: "2026-12-31",
    createdAt: "2026-09-01T08:00:00.000Z",
    legacyLabel: "compatible",
  },
  {
    id: 1700000001002,
    title: "First goal by date, second by order",
    progress: 0,
    completed: false,
    startDate: "2026-08-01T00:00:00.000Z",
    createdAt: "2026-08-01T00:00:00.000Z",
  },
] as LifeGoal[];

const monthlyOutcomes = [
  {
    id: 1700000002001,
    title: "September outcome",
    month: 9,
    year: 2026,
    goalId: 1700000001001,
    progress: 50,
    completed: false,
    createdAt: "2026-09-02T08:00:00.000Z",
    legacyColor: "cyan",
  },
  {
    id: 1700000002002,
    title: "Personal outcome",
    month: 10,
    year: 2026,
    progress: 0,
    completed: false,
    createdAt: "2026-09-03T08:00:00.000Z",
  },
] as MonthlyTarget[];

const weeklyFocuses = [
  {
    id: 1700000003001,
    title: "Dated focus",
    monthlyTargetId: 1700000002001,
    week: 2,
    weekStartDate: "2026-09-07",
    weekEndDate: "2026-09-13",
    progress: 50,
    completed: false,
    createdAt: "2026-09-07T08:00:00.000Z",
    legacySource: "calendar",
  },
  {
    id: 1700000003002,
    title: "Legacy undated focus",
    monthlyTargetId: 1700000002002,
    week: 1,
    progress: 0,
    completed: false,
    createdAt: "2026-09-01T08:00:00.000Z",
  },
] as WeeklyTarget[];

const planningState: PlanningRepositoryState = {
  lifeGoals,
  monthlyOutcomes,
  weeklyFocuses,
};

const emptyPlanningState: PlanningRepositoryState = {
  lifeGoals: [],
  monthlyOutcomes: [],
  weeklyFocuses: [],
};

function sources(
  state: PlanningRepositoryState = planningState,
  status: "missing" | "valid" = "valid"
) {
  return {
    lifeGoals: snapshotSource({ status, records: status === "valid" ? state.lifeGoals : [] }),
    monthlyOutcomes: snapshotSource({ status, records: status === "valid" ? state.monthlyOutcomes : [] }),
    weeklyFocuses: snapshotSource({ status, records: status === "valid" ? state.weeklyFocuses : [] }),
  };
}

const asDatabase = (database: FakePowerSyncDatabase) =>
  database as unknown as import("@powersync/web").PowerSyncDatabase;

test("all missing sources migrate as one empty planning graph", async () => {
  const database = new FakePowerSyncDatabase();
  const result = await migrateLocalStoragePlanning(database, sources({
    lifeGoals: [], monthlyOutcomes: [], weeklyFocuses: [],
  }, "missing"));
  assert.equal(result.status, "complete");
  assert.equal(result.imported, 0);
  assert.equal(database.state.journal[0]?.id, PLANNING_MIGRATION_ID);
});

test("valid empty sources remain a valid empty hierarchy", async () => {
  const database = new FakePowerSyncDatabase();
  const repository = new PowerSyncPlanningRepository(
    asDatabase(database),
    sources({ lifeGoals: [], monthlyOutcomes: [], weeklyFocuses: [] })
  );
  assert.deepEqual(await repository.initialize(), {
    lifeGoals: [], monthlyOutcomes: [], weeklyFocuses: [],
  });
});

test("populated migration preserves fields, IDs, links, dates, extras, and order", async () => {
  const database = new FakePowerSyncDatabase();
  database.state.tasks.push({
    id: "1700000004001",
    weekly_target_id: "1700000003001",
  });
  const repository = new PowerSyncPlanningRepository(
    asDatabase(database), sources()
  );
  assert.deepEqual(await repository.initialize(), planningState);
  assert.deepEqual(database.state.lifeGoals.map((row) => row.sort_order), [0, 1]);
  assert.deepEqual(database.state.monthlyOutcomes.map((row) => row.goal_id), [
    "1700000001001", null,
  ]);
  assert.equal(database.state.weeklyFocuses[0]?.week_start_date, "2026-09-07");
  assert.equal(database.state.weeklyFocuses[1]?.week_start_date, null);
  assert.equal(repository.getLastRelationshipReport()?.validTaskWeeklyLinks, 1);
  assert.equal(database.operations.at(-1), `marker:${PLANNING_MIGRATION_ID}`);
});

test("any invalid source stops the complete dependency group", async () => {
  for (const invalid of ["lifeGoals", "monthlyOutcomes", "weeklyFocuses"] as const) {
    const database = new FakePowerSyncDatabase();
    const migrationSources = sources();
    migrationSources[invalid] = snapshotSource({ status: "invalid", records: [] });
    const result = await migrateLocalStoragePlanning(database, migrationSources);
    assert.deepEqual(result, { status: "invalid-source", imported: 0 });
    assert.deepEqual(database.state, emptyDatabaseState());
  }
});

test("planning IDs use strict lossless canonical decimal mapping", () => {
  assert.equal(planningIdToDatabaseId(1700000001001, "Life Goal"), "1700000001001");
  assert.equal(databaseIdToPlanningId("1700000001001", "Life Goal"), 1700000001001);
  for (const invalid of ["1.5", "1e3", "+1", "-1", "01", "9007199254740992", "goal-1"]) {
    assert.throws(() => databaseIdToPlanningId(invalid, "Life Goal"));
  }
  assert.throws(() => planningIdToDatabaseId(-1, "Monthly Outcome"));
  assert.throws(() => planningIdToDatabaseId(Number.MAX_SAFE_INTEGER + 1, "Weekly Focus"));
});

test("migration is idempotent and Strict Mode initialization is memoized", async () => {
  const database = new FakePowerSyncDatabase();
  const migrationSources = sources();
  const repository = new PowerSyncPlanningRepository(
    asDatabase(database), migrationSources
  );
  const [left, right] = await Promise.all([
    repository.initialize(), repository.initialize(),
  ]);
  assert.deepEqual(left, planningState);
  assert.deepEqual(right, planningState);
  assert.equal(database.initCalls, 1);
  assert.equal(migrationSources.lifeGoals.calls, 1);
  assert.deepEqual(
    await migrateLocalStoragePlanning(database, migrationSources),
    { status: "already-complete", imported: 0 }
  );
});

test("failed transaction rolls back all tables and never writes the marker", async () => {
  const database = new FakePowerSyncDatabase();
  database.failOnWeeklyInsert = true;
  await assert.rejects(
    migrateLocalStoragePlanning(database, sources()),
    /injected Weekly Focus failure/
  );
  assert.deepEqual(database.state, emptyDatabaseState());
  assert.equal(database.operations.some((item) => item.startsWith("marker:")), false);
});

test("verification failure rolls back the graph before marker creation", async () => {
  const database = new FakePowerSyncDatabase();
  database.corruptVerification = true;
  await assert.rejects(
    migrateLocalStoragePlanning(database, sources()),
    /Planning migration verification failed/
  );
  assert.deepEqual(database.state, emptyDatabaseState());
});

test("LocalStorage sources remain intact and expose missing, valid, and invalid", async () => {
  const storage = new MemoryStorage();
  const goalJSON = JSON.stringify(lifeGoals);
  const monthlyJSON = JSON.stringify(monthlyOutcomes);
  const weeklyJSON = JSON.stringify(weeklyFocuses);
  storage.values.set("lifeos-life-goals", goalJSON);
  storage.values.set("lifeos-monthly-plans", monthlyJSON);
  storage.values.set("lifeos-weekly-targets", weeklyJSON);
  const localSources = {
    lifeGoals: new LocalStorageLifeGoalRepository(storage),
    monthlyOutcomes: new LocalStorageMonthlyOutcomeRepository(storage),
    weeklyFocuses: new LocalStorageWeeklyFocusRepository(storage),
  };
  await migrateLocalStoragePlanning(new FakePowerSyncDatabase(), localSources);
  assert.equal(storage.values.get("lifeos-life-goals"), goalJSON);
  assert.equal(storage.values.get("lifeos-monthly-plans"), monthlyJSON);
  assert.equal(storage.values.get("lifeos-weekly-targets"), weeklyJSON);
  assert.deepEqual(storage.writes, []);
  assert.equal(localSources.lifeGoals.inspect().status, "valid");
  assert.equal(new LocalStorageLifeGoalRepository(new MemoryStorage()).inspect().status, "missing");
  storage.values.set("lifeos-life-goals", "{bad");
  assert.equal(localSources.lifeGoals.inspect().status, "invalid");
});

test("reopen returns the same persisted graph without rereading sources", async () => {
  const state = emptyDatabaseState();
  const migrationSources = sources();
  const first = new PowerSyncPlanningRepository(
    asDatabase(new FakePowerSyncDatabase(state)), migrationSources
  );
  await first.initialize();
  const reopened = new PowerSyncPlanningRepository(
    asDatabase(new FakePowerSyncDatabase(state)), sources(emptyPlanningState, "missing")
  );
  assert.deepEqual(await reopened.initialize(), planningState);
  assert.equal(migrationSources.lifeGoals.calls, 1);
});

test("full-graph replacement preserves update positions and delete ordering", async () => {
  const database = new FakePowerSyncDatabase();
  const repository = new PowerSyncPlanningRepository(
    asDatabase(database), sources()
  );
  await repository.initialize();
  const next: PlanningRepositoryState = {
    lifeGoals: [{ ...lifeGoals[0], title: "Updated in place" }],
    monthlyOutcomes: [monthlyOutcomes[1], monthlyOutcomes[0]],
    weeklyFocuses: [weeklyFocuses[1]],
  };
  await repository.replace(next);
  const reopened = new PowerSyncPlanningRepository(
    asDatabase(new FakePowerSyncDatabase(database.state)), sources(emptyPlanningState, "missing")
  );
  assert.deepEqual(await reopened.initialize(), next);
});

test("queued planning replacements commit in call order", async () => {
  const database = new FakePowerSyncDatabase();
  const repository = new PowerSyncPlanningRepository(
    asDatabase(database), sources({ lifeGoals: [], monthlyOutcomes: [], weeklyFocuses: [] })
  );
  await repository.initialize();
  await Promise.all([
    repository.replace({ ...planningState, weeklyFocuses: [] }),
    repository.replace(planningState),
  ]);
  const reopened = new PowerSyncPlanningRepository(
    asDatabase(new FakePowerSyncDatabase(database.state)), sources(emptyPlanningState, "missing")
  );
  assert.deepEqual(await reopened.initialize(), planningState);
});

test("one coordinated watch publishes complete graphs and unsubscribes", async () => {
  const database = new FakePowerSyncDatabase();
  const repository = new PowerSyncPlanningRepository(
    asDatabase(database), sources()
  );
  await repository.initialize();
  const events: PlanningRepositoryState[] = [];
  const unsubscribe = repository.subscribe((event) => {
    if (event.type === "planning") events.push(event.state);
  });
  await new Promise((resolve) => setTimeout(resolve, 0));
  const reversed = {
    lifeGoals: [...lifeGoals].reverse(),
    monthlyOutcomes: [...monthlyOutcomes].reverse(),
    weeklyFocuses: [...weeklyFocuses].reverse(),
  };
  await repository.replace(reversed);
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.deepEqual(events.at(-1), reversed);
  const count = events.length;
  unsubscribe();
  await repository.replace(planningState);
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.equal(events.length, count);
});

test("orphan-compatible source relationships are preserved and reported", async () => {
  const orphanState: PlanningRepositoryState = {
    lifeGoals: [],
    monthlyOutcomes: [{ ...monthlyOutcomes[0], goalId: 999 }],
    weeklyFocuses: [{ ...weeklyFocuses[0], monthlyTargetId: 998 }],
  };
  const database = new FakePowerSyncDatabase();
  database.state.tasks.push({ id: "997", weekly_target_id: "996" });
  const repository = new PowerSyncPlanningRepository(
    asDatabase(database), sources(orphanState)
  );
  assert.deepEqual(await repository.initialize(), orphanState);
  assert.deepEqual(repository.getLastRelationshipReport(), {
    validMonthlyGoalLinks: 0,
    orphanMonthlyOutcomeIds: [1700000002001],
    validWeeklyMonthlyLinks: 0,
    orphanWeeklyFocusIds: [1700000003001],
    validTaskWeeklyLinks: 0,
    orphanTaskIds: [997],
  });
});

test("existing Task links are inspected read-only and never rewritten", async () => {
  const database = new FakePowerSyncDatabase();
  const taskRows = [
    { id: "401", weekly_target_id: "1700000003001" },
    { id: "402", weekly_target_id: "999" },
  ];
  database.state.tasks = structuredClone(taskRows);
  const repository = new PowerSyncPlanningRepository(
    asDatabase(database), sources()
  );
  await repository.initialize();
  assert.deepEqual(database.state.tasks, taskRows);
  assert.deepEqual(repository.getLastRelationshipReport()?.orphanTaskIds, [402]);
});

test("corrupted record database IDs reject the complete graph", async () => {
  const base = new FakePowerSyncDatabase();
  const repository = new PowerSyncPlanningRepository(asDatabase(base), sources());
  await repository.initialize();
  for (const [collection, label] of [
    ["lifeGoals", "Life Goal"],
    ["monthlyOutcomes", "Monthly Outcome"],
    ["weeklyFocuses", "Weekly Focus"],
  ] as const) {
    const state = structuredClone(base.state);
    state[collection][0]!.id = "01";
    const corrupt = new PowerSyncPlanningRepository(
      asDatabase(new FakePowerSyncDatabase(state)), sources(emptyPlanningState, "missing")
    );
    await assert.rejects(corrupt.initialize(), new RegExp(`Invalid ${label} database ID`));
  }
});

test("corrupted relationship database IDs are rejected without coercion", async () => {
  const database = new FakePowerSyncDatabase();
  const repository = new PowerSyncPlanningRepository(asDatabase(database), sources());
  await repository.initialize();
  database.state.monthlyOutcomes[0]!.goal_id = "01";
  const corrupt = new PowerSyncPlanningRepository(
    asDatabase(new FakePowerSyncDatabase(database.state)), sources(emptyPlanningState, "missing")
  );
  await assert.rejects(corrupt.initialize(), /Invalid Life Goal database ID/);
});

test("migration creates no Task, execution-history, or XP side effects", async () => {
  const database = new FakePowerSyncDatabase();
  database.state.tasks.push({ id: "401", weekly_target_id: "1700000003001" });
  const beforeTasks = structuredClone(database.state.tasks);
  await migrateLocalStoragePlanning(database, sources());
  assert.deepEqual(database.state.tasks, beforeTasks);
  assert.equal(database.operations.some((item) =>
    item.startsWith("execution:") || item.startsWith("xp:")
  ), false);
});

test("production schema adds exactly three local-only planning tables", async () => {
  const {
    lifeOSPowerSyncSchema,
    POWERSYNC_LIFE_GOALS_TABLE,
    POWERSYNC_MONTHLY_OUTCOMES_TABLE,
    POWERSYNC_WEEKLY_FOCUSES_TABLE,
  } = await import("../../src/data/database/lifeOSPowerSyncSchema.ts");
  const byName = new Map(
    lifeOSPowerSyncSchema.tables.map((table) => [table.name, table])
  );
  for (const name of [
    POWERSYNC_LIFE_GOALS_TABLE,
    POWERSYNC_MONTHLY_OUTCOMES_TABLE,
    POWERSYNC_WEEKLY_FOCUSES_TABLE,
  ]) {
    assert.equal(byName.get(name)?.localOnly, true);
  }
  assert.deepEqual(byName.get(POWERSYNC_LIFE_GOALS_TABLE)?.columns.map((column) => column.name), [
    "title", "description", "progress", "completed", "completed_at",
    "start_date", "target_date", "created_at", "sort_order", "extras_json",
  ]);
  assert.deepEqual(byName.get(POWERSYNC_MONTHLY_OUTCOMES_TABLE)?.columns.map((column) => column.name), [
    "title", "month", "year", "goal_id", "progress", "completed",
    "completed_at", "created_at", "sort_order", "extras_json",
  ]);
  assert.deepEqual(byName.get(POWERSYNC_WEEKLY_FOCUSES_TABLE)?.columns.map((column) => column.name), [
    "title", "monthly_target_id", "week", "week_start_date", "week_end_date",
    "progress", "completed", "completed_at", "created_at", "sort_order", "extras_json",
  ]);
  assert.equal(LIFE_GOAL_QUERY.includes("ORDER BY sort_order ASC"), true);
  assert.equal(MONTHLY_OUTCOME_QUERY.includes("ORDER BY sort_order ASC"), true);
  assert.equal(WEEKLY_FOCUS_QUERY.includes("ORDER BY sort_order ASC"), true);
});
