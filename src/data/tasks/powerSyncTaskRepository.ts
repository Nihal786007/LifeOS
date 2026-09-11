import type { PowerSyncDatabase, Transaction } from "@powersync/web";

import type { Task } from "../../shared/types";
import type {
  AsyncTaskRepository,
  TaskRepositoryEvent,
} from "./asyncTaskRepository";
import {
  migrateLocalStorageTasks,
  TASK_QUERY,
  taskRowsMatch,
  taskRowToTask,
  taskToDatabaseRow,
} from "./migrateLocalStorageTasks";
import type {
  TaskDatabaseRow,
  TaskMigrationSource,
} from "./migrateLocalStorageTasks";

interface TaskIdRow {
  id: string;
}

const INSERT_TASK =
  "INSERT INTO tasks(id, title, description, due_date, priority, weekly_target_id, completed, completed_at, created_at, sort_order, extras_json) VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";

const UPDATE_TASK =
  "UPDATE tasks SET title = ?, description = ?, due_date = ?, priority = ?, weekly_target_id = ?, completed = ?, completed_at = ?, created_at = ?, sort_order = ?, extras_json = ? WHERE id = ?";

async function replaceRows(
  transaction: Transaction,
  rows: TaskDatabaseRow[]
): Promise<void> {
  const expectedIds = new Set(rows.map((row) => row.id));
  if (expectedIds.size !== rows.length) {
    throw new Error("Task collection contains duplicate IDs");
  }

  const existing = await transaction.getAll<TaskIdRow>("SELECT id FROM tasks");
  const existingIds = new Set(existing.map((row) => row.id));

  for (const row of rows) {
    if (existingIds.has(row.id)) {
      await transaction.execute(UPDATE_TASK, [
        row.title, row.description, row.due_date, row.priority,
        row.weekly_target_id, row.completed, row.completed_at,
        row.created_at, row.sort_order, row.extras_json, row.id,
      ]);
    } else {
      await transaction.execute(INSERT_TASK, [
        row.id, row.title, row.description, row.due_date, row.priority,
        row.weekly_target_id, row.completed, row.completed_at,
        row.created_at, row.sort_order, row.extras_json,
      ]);
    }
  }

  for (const row of existing) {
    if (!expectedIds.has(row.id)) {
      await transaction.execute("DELETE FROM tasks WHERE id = ?", [row.id]);
    }
  }

  const persisted = await transaction.getAll<TaskDatabaseRow>(TASK_QUERY);
  if (!taskRowsMatch(persisted, rows)) {
    throw new Error("Task replacement verification failed");
  }
}

export class PowerSyncTaskRepository implements AsyncTaskRepository {
  private initialization?: Promise<Task[]>;
  private mutationQueue: Promise<void> = Promise.resolve();
  private readonly database: PowerSyncDatabase;
  private readonly migrationSource: TaskMigrationSource;

  constructor(
    database: PowerSyncDatabase,
    migrationSource: TaskMigrationSource
  ) {
    this.database = database;
    this.migrationSource = migrationSource;
  }

  initialize(
    onPhase?: (phase: "opening" | "migration") => void
  ): Promise<Task[]> {
    if (!this.initialization) {
      this.initialization = this.initializeOnce(onPhase);
    }
    return this.initialization;
  }

  private async initializeOnce(
    onPhase?: (phase: "opening" | "migration") => void
  ): Promise<Task[]> {
    onPhase?.("opening");
    await this.database.init();
    onPhase?.("migration");

    const migration = await migrateLocalStorageTasks(
      this.database,
      this.migrationSource
    );
    if (migration.status === "invalid-source") {
      throw new Error("Existing Task data is invalid and was not migrated");
    }

    return this.load();
  }

  private async load(): Promise<Task[]> {
    const rows = await this.database.getAll<TaskDatabaseRow>(TASK_QUERY);
    return rows.map(taskRowToTask);
  }

  async replace(tasks: Task[]): Promise<void> {
    await this.initialize();
    const rows = tasks.map(taskToDatabaseRow);

    const operation = this.mutationQueue.then(() =>
      this.database.writeTransaction((transaction) =>
        replaceRows(transaction, rows)
      )
    );
    this.mutationQueue = operation.catch(() => undefined);
    return operation;
  }

  subscribe(listener: (event: TaskRepositoryEvent) => void): () => void {
    const abortController = new AbortController();
    void this.watch(listener, abortController.signal);
    return () => abortController.abort();
  }

  private async watch(
    listener: (event: TaskRepositoryEvent) => void,
    signal: AbortSignal
  ): Promise<void> {
    try {
      await this.initialize();
      for await (const result of this.database.watch(TASK_QUERY, [], { signal })) {
        if (signal.aborted) return;
        const rows = result.rows?._array as TaskDatabaseRow[] | undefined;
        listener({
          type: "tasks",
          tasks: (rows ?? []).map(taskRowToTask),
        });
      }
    } catch (error) {
      if (signal.aborted) return;
      listener({
        type: "error",
        error: error instanceof Error ? error : new Error(String(error)),
      });
    }
  }
}

export {
  databaseIdToTaskId,
  taskIdToDatabaseId,
} from "./migrateLocalStorageTasks";
