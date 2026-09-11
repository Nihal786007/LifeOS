import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import test from "node:test";

import type { QueryResult, Transaction } from "@powersync/web";
import type { TaskSourceSnapshot } from "../../src/data/tasks/localStorageTaskRepository.ts";
import type { Task } from "../../src/shared/types.ts";

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith(".") && !/\.[a-z]+$/i.test(specifier)) {
      return nextResolve(`${specifier}.ts`, context);
    }
    return nextResolve(specifier, context);
  },
});

const {
  TASK_MIGRATION_ID,
  migrateLocalStorageTasks,
} = await import("../../src/data/tasks/migrateLocalStorageTasks.ts");

const {
  PowerSyncTaskRepository,
  databaseIdToTaskId,
  taskIdToDatabaseId,
} = await import("../../src/data/tasks/powerSyncTaskRepository.ts");

const {
  LocalStorageTaskRepository,
} = await import("../../src/data/tasks/localStorageTaskRepository.ts");

interface TaskRow {
  id: string;
  title: string;
  description: string | null;
  due_date: string | null;
  priority: string;
  weekly_target_id: string | null;
  completed: number;
  completed_at: string | null;
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
  tasks: TaskRow[];
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

class FakePowerSyncDatabase {
  readonly state: FakeDatabaseState;
  readonly operations: string[] = [];
  initCalls = 0;
  failOnTaskInsert = false;
  corruptTaskReads = false;
  private readonly watchers = new Set<AsyncQueue<QueryResult>>();

  constructor(state?: FakeDatabaseState) {
    this.state = state ?? { tasks: [], journal: [] };
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

  async execute(
    sql: string,
    parameters: unknown[] = []
  ): Promise<QueryResult> {
    this.executeAgainst(this.state, sql, parameters);
    this.emit();
    return { rows: { _array: [] } } as unknown as QueryResult;
  }

  async writeTransaction<T>(
    callback: (transaction: Transaction) => Promise<T>
  ): Promise<T> {
    const draft = structuredClone(this.state);
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

  private async getAllFrom<T>(
    state: FakeDatabaseState,
    sql: string
  ): Promise<T[]> {
    if (!sql.includes("FROM tasks")) return [];
    if (sql.trim() === "SELECT id FROM tasks") {
      return state.tasks.map(({ id }) => ({ id })) as T[];
    }
    const rows = [...state.tasks]
      .sort((left, right) =>
        left.sort_order - right.sort_order || left.id.localeCompare(right.id)
      );
    if (this.corruptTaskReads && rows.length > 0 && sql.includes("sort_order")) {
      return [{ ...rows[0], title: "corrupted verification" }, ...rows.slice(1)] as T[];
    }
    return rows as T[];
  }

  private async getOptionalFrom<T>(
    state: FakeDatabaseState,
    sql: string,
    parameters: unknown[] = []
  ): Promise<T | null> {
    if (sql.includes("FROM migration_journal")) {
      return (state.journal.find((row) => row.id === parameters[0]) ?? null) as T | null;
    }
    return null;
  }

  private executeAgainst(
    state: FakeDatabaseState,
    sql: string,
    parameters: unknown[]
  ): void {
    if (sql.startsWith("INSERT INTO tasks")) {
      if (this.failOnTaskInsert) throw new Error("injected task insert failure");
      const [id, title, description, dueDate, priority, weeklyTargetId,
        completed, completedAt, createdAt, sortOrder, extrasJson] = parameters;
      const row: TaskRow = {
        id: String(id),
        title: String(title),
        description: description === null ? null : String(description),
        due_date: dueDate === null ? null : String(dueDate),
        priority: String(priority),
        weekly_target_id: weeklyTargetId === null ? null : String(weeklyTargetId),
        completed: Number(completed),
        completed_at: completedAt === null ? null : String(completedAt),
        created_at: String(createdAt),
        sort_order: Number(sortOrder),
        extras_json: extrasJson === null ? null : String(extrasJson),
      };
      const index = state.tasks.findIndex((task) => task.id === row.id);
      if (index >= 0) {
        throw new Error("duplicate task ID");
      } else {
        state.tasks.push(row);
      }
      this.operations.push(`task:${row.id}`);
      return;
    }

    if (sql.startsWith("UPDATE tasks")) {
      const [title, description, dueDate, priority, weeklyTargetId,
        completed, completedAt, createdAt, sortOrder, extrasJson, id] = parameters;
      const index = state.tasks.findIndex((task) => task.id === id);
      if (index < 0) throw new Error("missing task ID");
      state.tasks[index] = {
        id: String(id),
        title: String(title),
        description: description === null ? null : String(description),
        due_date: dueDate === null ? null : String(dueDate),
        priority: String(priority),
        weekly_target_id: weeklyTargetId === null ? null : String(weeklyTargetId),
        completed: Number(completed),
        completed_at: completedAt === null ? null : String(completedAt),
        created_at: String(createdAt),
        sort_order: Number(sortOrder),
        extras_json: extrasJson === null ? null : String(extrasJson),
      };
      this.operations.push(`update:${String(id)}`);
      return;
    }

    if (sql.startsWith("DELETE FROM tasks")) {
      state.tasks = state.tasks.filter((row) => row.id !== parameters[0]);
      this.operations.push(`delete:${String(parameters[0])}`);
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
    }
  }

  private queryResult(): QueryResult {
    const array = [...this.state.tasks].sort((left, right) =>
      left.sort_order - right.sort_order || left.id.localeCompare(right.id)
    );
    return { rows: { _array: array }, array } as unknown as QueryResult;
  }

  private emit(): void {
    const result = this.queryResult();
    this.watchers.forEach((watcher) => watcher.push(result));
  }
}

class MemoryStorage {
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

function source(snapshot: TaskSourceSnapshot) {
  return {
    calls: 0,
    inspect() {
      this.calls += 1;
      return snapshot;
    },
  };
}

const tasks: Task[] = [
  {
    id: 1700000000001,
    title: "First source task",
    description: "Keep every field",
    dueDate: "2026-09-11",
    priority: "high",
    weeklyTargetId: 1700000000101,
    completed: true,
    completedAt: "2026-09-11T08:30:00.000Z",
    createdAt: "2026-09-10T08:00:00.000Z",
  },
  {
    id: 1700000000002,
    title: "Second source task",
    priority: "low",
    completed: false,
    createdAt: "2026-09-10T09:00:00.000Z",
  },
];

const asDatabase = (database: FakePowerSyncDatabase) =>
  database as unknown as import("@powersync/web").PowerSyncDatabase;

test("missing source completes a zero-row migration", async () => {
  const database = new FakePowerSyncDatabase();
  const result = await migrateLocalStorageTasks(
    database,
    source({ status: "missing", tasks: [] })
  );
  assert.deepEqual(result, { status: "complete", imported: 0 });
  assert.equal(database.state.journal[0]?.id, TASK_MIGRATION_ID);
});

test("valid empty source completes without creating tasks", async () => {
  const database = new FakePowerSyncDatabase();
  const result = await migrateLocalStorageTasks(
    database,
    source({ status: "valid", tasks: [] })
  );
  assert.deepEqual(result, { status: "complete", imported: 0 });
  assert.deepEqual(database.state.tasks, []);
});

test("invalid source writes neither rows nor marker", async () => {
  const database = new FakePowerSyncDatabase();
  const result = await migrateLocalStorageTasks(
    database,
    source({ status: "invalid", tasks: [] })
  );
  assert.deepEqual(result, { status: "invalid-source", imported: 0 });
  assert.deepEqual(database.state, { tasks: [], journal: [] });
});

test("migration preserves all canonical fields, relationships, and exact order", async () => {
  const database = new FakePowerSyncDatabase();
  const repository = new PowerSyncTaskRepository(
    asDatabase(database),
    source({ status: "valid", tasks })
  );
  assert.deepEqual(await repository.initialize(), tasks);
  assert.deepEqual(database.state.tasks.map((row) => row.sort_order), [0, 1]);
  assert.equal(database.state.tasks[0]?.weekly_target_id, "1700000000101");
  assert.equal(database.operations.at(-1), `marker:${TASK_MIGRATION_ID}`);
});

test("unknown compatible task fields survive through extras JSON", async () => {
  const compatible = [{ ...tasks[0], sourceLabel: "legacy-compatible" }] as Task[];
  const repository = new PowerSyncTaskRepository(
    asDatabase(new FakePowerSyncDatabase()),
    source({ status: "valid", tasks: compatible })
  );
  assert.deepEqual(await repository.initialize(), compatible);
});

test("migration is idempotent and does not duplicate or reread source", async () => {
  const database = new FakePowerSyncDatabase();
  const migrationSource = source({ status: "valid", tasks });
  await migrateLocalStorageTasks(database, migrationSource);
  const second = await migrateLocalStorageTasks(database, migrationSource);
  assert.deepEqual(second, { status: "already-complete", imported: 0 });
  assert.equal(database.state.tasks.length, 2);
  assert.equal(migrationSource.calls, 1);
});

test("failed migration rolls back all tasks and the marker", async () => {
  const database = new FakePowerSyncDatabase();
  database.failOnTaskInsert = true;
  await assert.rejects(
    migrateLocalStorageTasks(database, source({ status: "valid", tasks })),
    /injected task insert failure/
  );
  assert.deepEqual(database.state, { tasks: [], journal: [] });
});

test("verification failure rolls back rows and cannot write a completed marker", async () => {
  const database = new FakePowerSyncDatabase();
  database.corruptTaskReads = true;
  await assert.rejects(
    migrateLocalStorageTasks(database, source({ status: "valid", tasks })),
    /Task migration verification failed/
  );
  assert.deepEqual(database.state, { tasks: [], journal: [] });
  assert.equal(database.operations.some((item) => item.startsWith("marker:")), false);
});

test("LocalStorage inspection preserves source and performs no write", async () => {
  const storage = new MemoryStorage();
  const serialized = JSON.stringify(tasks);
  storage.values.set("lifeos-tasks", serialized);
  const local = new LocalStorageTaskRepository(storage);
  const database = new FakePowerSyncDatabase();
  await migrateLocalStorageTasks(database, local);
  assert.equal(storage.values.get("lifeos-tasks"), serialized);
  assert.deepEqual(storage.writes, []);
});

test("malformed LocalStorage is diagnosed without rewrite or marker", async () => {
  const storage = new MemoryStorage();
  storage.values.set("lifeos-tasks", "{bad-json");
  const local = new LocalStorageTaskRepository(storage);
  const database = new FakePowerSyncDatabase();
  assert.deepEqual(local.inspect(), { status: "invalid", tasks: [] });
  assert.deepEqual(await migrateLocalStorageTasks(database, local), {
    status: "invalid-source",
    imported: 0,
  });
  assert.equal(storage.values.get("lifeos-tasks"), "{bad-json");
  assert.deepEqual(storage.writes, []);
});

test("initialization is memoized and reopen retains migrated tasks", async () => {
  const state: FakeDatabaseState = { tasks: [], journal: [] };
  const migrationSource = source({ status: "valid", tasks });
  const firstDatabase = new FakePowerSyncDatabase(state);
  const first = new PowerSyncTaskRepository(
    asDatabase(firstDatabase),
    migrationSource
  );
  const [left, right] = await Promise.all([first.initialize(), first.initialize()]);
  const reopenedDatabase = new FakePowerSyncDatabase(state);
  const reopened = new PowerSyncTaskRepository(
    asDatabase(reopenedDatabase),
    migrationSource
  );
  assert.deepEqual(left, tasks);
  assert.deepEqual(right, tasks);
  assert.deepEqual(await reopened.initialize(), tasks);
  assert.equal(firstDatabase.initCalls, 1);
  assert.equal(reopenedDatabase.initCalls, 1);
  assert.equal(migrationSource.calls, 1);
});

test("replace supports append, update, exact deletion, and canonical order", async () => {
  const database = new FakePowerSyncDatabase();
  const repository = new PowerSyncTaskRepository(
    asDatabase(database),
    source({ status: "valid", tasks })
  );
  await repository.initialize();
  const third: Task = {
    id: 1700000000003,
    title: "Appended",
    priority: "medium",
    completed: false,
    createdAt: "2026-09-11T10:00:00.000Z",
  };
  await repository.replace([...tasks, third]);
  await repository.replace([{ ...tasks[0], title: "Updated" }, third]);
  const reopened = new PowerSyncTaskRepository(
    asDatabase(new FakePowerSyncDatabase(database.state)),
    source({ status: "missing", tasks: [] })
  );
  assert.deepEqual(await reopened.initialize(), [
    { ...tasks[0], title: "Updated" },
    third,
  ]);
  assert.equal(database.operations.includes(`delete:${tasks[1]?.id}`), true);
});

test("queued replacements commit in call order", async () => {
  const database = new FakePowerSyncDatabase();
  const repository = new PowerSyncTaskRepository(
    asDatabase(database),
    source({ status: "valid", tasks: [] })
  );
  await repository.initialize();
  await Promise.all([
    repository.replace([tasks[0]]),
    repository.replace(tasks),
  ]);
  const reopened = new PowerSyncTaskRepository(
    asDatabase(new FakePowerSyncDatabase(database.state)),
    source({ status: "missing", tasks: [] })
  );
  assert.deepEqual(await reopened.initialize(), tasks);
});

test("watch emits ordered replacements and stops after unsubscribe", async () => {
  const database = new FakePowerSyncDatabase();
  const repository = new PowerSyncTaskRepository(
    asDatabase(database),
    source({ status: "valid", tasks })
  );
  await repository.initialize();
  const events: Task[][] = [];
  const unsubscribe = repository.subscribe((event) => {
    if (event.type === "tasks") events.push(event.tasks);
  });
  await new Promise((resolve) => setTimeout(resolve, 0));
  await repository.replace([tasks[1], tasks[0]]);
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.deepEqual(events.at(-1), [tasks[1], tasks[0]]);
  const count = events.length;
  unsubscribe();
  await repository.replace(tasks);
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.equal(events.length, count);
});

test("Task IDs use strict lossless canonical decimal mapping", () => {
  assert.equal(taskIdToDatabaseId(1700000000001), "1700000000001");
  assert.equal(databaseIdToTaskId("1700000000001"), 1700000000001);
  for (const invalid of ["1.5", "1e3", "+1", "-1", "01", "9007199254740992", "task-1"]) {
    assert.throws(() => databaseIdToTaskId(invalid));
  }
  assert.throws(() => taskIdToDatabaseId(Number.MAX_SAFE_INTEGER + 1));
  assert.throws(() => taskIdToDatabaseId(-1, "Weekly Target"));
});

test("the production schema adds only a local-only Tasks representation", async () => {
  const { lifeOSPowerSyncSchema, POWERSYNC_TASKS_TABLE } = await import(
    "../../src/data/database/lifeOSPowerSyncSchema.ts"
  );
  const table = lifeOSPowerSyncSchema.tables.find(
    (candidate) => candidate.name === POWERSYNC_TASKS_TABLE
  );
  assert.ok(table);
  assert.equal(table.localOnly, true);
  assert.deepEqual(table.columns.map((column) => column.name), [
    "title", "description", "due_date", "priority", "weekly_target_id",
    "completed", "completed_at", "created_at", "sort_order", "extras_json",
  ]);
});

test("an invalid database Task ID rejects the whole read", async () => {
  const database = new FakePowerSyncDatabase({
    tasks: [{
      id: "01", title: "Corrupt", description: null, due_date: null,
      priority: "medium", weekly_target_id: null, completed: 0,
      completed_at: null, created_at: "2026-09-11T00:00:00.000Z",
      sort_order: 0, extras_json: null,
    }],
    journal: [{
      id: TASK_MIGRATION_ID, source_key: "lifeos-tasks", record_count: 1,
      completed_at: "2026-09-11T00:00:00.000Z",
    }],
  });
  const repository = new PowerSyncTaskRepository(
    asDatabase(database),
    source({ status: "missing", tasks: [] })
  );
  await assert.rejects(repository.initialize(), /Invalid Task database ID/);
});

test("an invalid database weekly relationship ID rejects the whole read", async () => {
  const database = new FakePowerSyncDatabase({
    tasks: [{
      id: "1", title: "Corrupt relation", description: null, due_date: null,
      priority: "medium", weekly_target_id: "01", completed: 0,
      completed_at: null, created_at: "2026-09-11T00:00:00.000Z",
      sort_order: 0, extras_json: null,
    }],
    journal: [{
      id: TASK_MIGRATION_ID, source_key: "lifeos-tasks", record_count: 1,
      completed_at: "2026-09-11T00:00:00.000Z",
    }],
  });
  const repository = new PowerSyncTaskRepository(
    asDatabase(database),
    source({ status: "missing", tasks: [] })
  );
  await assert.rejects(
    repository.initialize(),
    /Invalid Weekly Target database ID/
  );
});
