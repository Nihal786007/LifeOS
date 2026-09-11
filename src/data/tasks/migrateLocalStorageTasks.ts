import type { Transaction } from "@powersync/web";

import type { Task, TaskPriority } from "../../shared/types";
import type { TaskSourceSnapshot } from "./localStorageTaskRepository";

export const TASK_MIGRATION_ID = "local-storage-tasks-v1" as const;
export const TASK_SOURCE_KEY = "lifeos-tasks" as const;

export const TASK_QUERY =
  "SELECT id, title, description, due_date, priority, weekly_target_id, completed, completed_at, created_at, sort_order, extras_json FROM tasks ORDER BY sort_order ASC, id ASC";

export interface TaskMigrationSource {
  inspect(): TaskSourceSnapshot;
}

export interface TaskMigrationDatabase {
  getOptional<T>(sql: string, parameters?: unknown[]): Promise<T | null>;
  writeTransaction<T>(
    callback: (transaction: Transaction) => Promise<T>
  ): Promise<T>;
}

interface MigrationMarkerRow {
  id: string;
}

export interface TaskDatabaseRow {
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

export function taskIdToDatabaseId(
  id: number,
  label: "Task" | "Weekly Target" = "Task"
): string {
  if (!Number.isSafeInteger(id) || id < 0) {
    throw new Error(`${label} ID cannot be stored safely: ${String(id)}`);
  }

  return String(id);
}

export function databaseIdToTaskId(
  id: string,
  label: "Task" | "Weekly Target" = "Task"
): number {
  if (!/^(0|[1-9]\d*)$/.test(id)) {
    throw new Error(`Invalid ${label} database ID: ${id}`);
  }

  const parsed = Number(id);
  if (!Number.isSafeInteger(parsed) || String(parsed) !== id) {
    throw new Error(`Unsafe ${label} database ID: ${id}`);
  }

  return parsed;
}

function taskExtras(task: Task): Record<string, unknown> {
  const extras = { ...task } as Record<string, unknown>;
  delete extras.id;
  delete extras.title;
  delete extras.description;
  delete extras.dueDate;
  delete extras.priority;
  delete extras.weeklyTargetId;
  delete extras.completed;
  delete extras.completedAt;
  delete extras.createdAt;
  return extras;
}

export function taskToDatabaseRow(
  task: Task,
  sortOrder: number
): TaskDatabaseRow {
  const extras = taskExtras(task);

  return {
    id: taskIdToDatabaseId(task.id),
    title: task.title,
    description: task.description ?? null,
    due_date: task.dueDate ?? null,
    priority: task.priority,
    weekly_target_id:
      task.weeklyTargetId === undefined
        ? null
        : taskIdToDatabaseId(task.weeklyTargetId, "Weekly Target"),
    completed: task.completed ? 1 : 0,
    completed_at: task.completedAt ?? null,
    created_at: task.createdAt,
    sort_order: sortOrder,
    extras_json:
      Object.keys(extras).length > 0 ? JSON.stringify(extras) : null,
  };
}

function parseExtras(value: string | null): Record<string, unknown> {
  if (value === null) return {};

  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    throw new Error("Invalid Task extras JSON");
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("Invalid Task extras payload");
  }

  return parsed as Record<string, unknown>;
}

function isTaskPriority(value: string): value is TaskPriority {
  return value === "low" || value === "medium" || value === "high";
}

export function taskRowToTask(row: TaskDatabaseRow): Task {
  if (!isTaskPriority(row.priority)) {
    throw new Error(`Invalid Task priority: ${row.priority}`);
  }
  if (row.completed !== 0 && row.completed !== 1) {
    throw new Error(`Invalid Task completed flag: ${String(row.completed)}`);
  }
  if (!Number.isSafeInteger(row.sort_order) || row.sort_order < 0) {
    throw new Error(`Invalid Task sort order: ${String(row.sort_order)}`);
  }

  const task: Task = {
    ...parseExtras(row.extras_json),
    id: databaseIdToTaskId(row.id),
    title: row.title,
    priority: row.priority,
    completed: row.completed === 1,
    createdAt: row.created_at,
  };

  if (row.description !== null) task.description = row.description;
  if (row.due_date !== null) task.dueDate = row.due_date;
  if (row.weekly_target_id !== null) {
    task.weeklyTargetId = databaseIdToTaskId(
      row.weekly_target_id,
      "Weekly Target"
    );
  }
  if (row.completed_at !== null) task.completedAt = row.completed_at;

  return task;
}

export function taskRowsMatch(
  actual: TaskDatabaseRow[],
  expected: TaskDatabaseRow[]
): boolean {
  return JSON.stringify(actual) === JSON.stringify(expected);
}

export type TaskMigrationResult =
  | { status: "already-complete"; imported: 0 }
  | { status: "complete"; imported: number }
  | { status: "invalid-source"; imported: 0 };

export async function migrateLocalStorageTasks(
  database: TaskMigrationDatabase,
  source: TaskMigrationSource,
  completedAt: string = new Date().toISOString()
): Promise<TaskMigrationResult> {
  const marker = await database.getOptional<MigrationMarkerRow>(
    "SELECT id FROM migration_journal WHERE id = ?",
    [TASK_MIGRATION_ID]
  );
  if (marker) return { status: "already-complete", imported: 0 };

  const snapshot = source.inspect();
  if (snapshot.status === "invalid") {
    return { status: "invalid-source", imported: 0 };
  }

  const expectedRows = snapshot.tasks.map(taskToDatabaseRow);
  if (new Set(expectedRows.map((row) => row.id)).size !== expectedRows.length) {
    throw new Error("Task migration source contains duplicate IDs");
  }

  return database.writeTransaction(async (transaction) => {
    const transactionMarker = await transaction.getOptional<MigrationMarkerRow>(
      "SELECT id FROM migration_journal WHERE id = ?",
      [TASK_MIGRATION_ID]
    );
    if (transactionMarker) {
      return { status: "already-complete", imported: 0 } as const;
    }

    const existingRows = await transaction.getAll<TaskDatabaseRow>(TASK_QUERY);
    if (existingRows.length > 0) {
      throw new Error(
        "Task migration cannot import into an unjournaled non-empty database"
      );
    }

    for (const row of expectedRows) {
      await transaction.execute(
        "INSERT INTO tasks(id, title, description, due_date, priority, weekly_target_id, completed, completed_at, created_at, sort_order, extras_json) VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        [row.id, row.title, row.description, row.due_date, row.priority,
          row.weekly_target_id, row.completed, row.completed_at,
          row.created_at, row.sort_order, row.extras_json]
      );
    }

    const importedRows = await transaction.getAll<TaskDatabaseRow>(TASK_QUERY);
    if (!taskRowsMatch(importedRows, expectedRows)) {
      throw new Error("Task migration verification failed");
    }

    await transaction.execute(
      "INSERT INTO migration_journal(id, source_key, record_count, completed_at) VALUES(?, ?, ?, ?)",
      [TASK_MIGRATION_ID, TASK_SOURCE_KEY, expectedRows.length, completedAt]
    );

    return { status: "complete", imported: expectedRows.length } as const;
  });
}
