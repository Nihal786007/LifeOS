import type { Transaction } from "@powersync/web";

import type {
  HabitCompletion,
  HabitDefinition,
  HabitState,
  HabitWeekday,
} from "../../shared/habits";
import type { HabitSourceSnapshot } from "./localStorageHabitRepository";

export const HABIT_MIGRATION_ID = "local-storage-habits-v1" as const;
export const HABIT_SOURCE_KEY = "lifeos-habit-state-v2" as const;

export const HABIT_DEFINITION_QUERY =
  "SELECT id, name, description, active_days_json, start_date, archived, archived_at, created_at, updated_at, sort_order, extras_json FROM habit_definitions ORDER BY sort_order ASC, id ASC";
export const HABIT_COMPLETION_QUERY =
  "SELECT id, habit_id, date, completed_at, sort_order, extras_json FROM habit_completions ORDER BY sort_order ASC, id ASC";

export interface HabitMigrationSource {
  inspect(): HabitSourceSnapshot;
}

export interface HabitMigrationDatabase {
  getOptional<T>(sql: string, parameters?: unknown[]): Promise<T | null>;
  getAll<T>(sql: string, parameters?: unknown[]): Promise<T[]>;
  writeTransaction<T>(
    callback: (transaction: Transaction) => Promise<T>
  ): Promise<T>;
}

interface MigrationMarkerRow { id: string }

export interface HabitDefinitionDatabaseRow {
  id: string;
  name: string;
  description: string | null;
  active_days_json: string;
  start_date: string;
  archived: number;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
  sort_order: number;
  extras_json: string | null;
}

export interface HabitCompletionDatabaseRow {
  id: string;
  habit_id: string;
  date: string;
  completed_at: string;
  sort_order: number;
  extras_json: string | null;
}

export function habitIdToDatabaseId(id: number, label = "Habit"): string {
  if (!Number.isSafeInteger(id) || id < 0) {
    throw new Error(`${label} ID cannot be stored safely: ${String(id)}`);
  }
  return String(id);
}

export function databaseIdToHabitId(id: string, label = "Habit"): number {
  if (!/^(0|[1-9]\d*)$/.test(id)) {
    throw new Error(`Invalid ${label} database ID: ${id}`);
  }
  const parsed = Number(id);
  if (!Number.isSafeInteger(parsed) || String(parsed) !== id) {
    throw new Error(`Unsafe ${label} database ID: ${id}`);
  }
  return parsed;
}

function extrasFor(
  value: Record<string, unknown>,
  known: readonly string[]
): string | null {
  const extras = { ...value };
  for (const key of known) delete extras[key];
  return Object.keys(extras).length > 0 ? JSON.stringify(extras) : null;
}

function parseExtras(value: string | null, label: string): Record<string, unknown> {
  if (value === null) return {};
  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    throw new Error(`Invalid ${label} extras JSON`);
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error(`Invalid ${label} extras payload`);
  }
  return parsed as Record<string, unknown>;
}

function parseActiveDays(value: string): HabitWeekday[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    throw new Error("Invalid Habit active days JSON");
  }
  const allowed = new Set([
    "monday", "tuesday", "wednesday", "thursday",
    "friday", "saturday", "sunday",
  ]);
  if (!Array.isArray(parsed) || !parsed.every((day) =>
    typeof day === "string" && allowed.has(day)
  )) {
    throw new Error("Invalid Habit active days payload");
  }
  return parsed as HabitWeekday[];
}

function validateSortOrder(value: number, label: string): void {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new Error(`Invalid ${label} sort order: ${String(value)}`);
  }
}

export function habitDefinitionToDatabaseRow(
  habit: HabitDefinition,
  sortOrder: number
): HabitDefinitionDatabaseRow {
  return {
    id: habitIdToDatabaseId(habit.id, "Habit Definition"),
    name: habit.name,
    description: habit.description ?? null,
    active_days_json: JSON.stringify(habit.activeDays),
    start_date: habit.startDate,
    archived: habit.archived ? 1 : 0,
    archived_at: habit.archivedAt ?? null,
    created_at: habit.createdAt,
    updated_at: habit.updatedAt,
    sort_order: sortOrder,
    extras_json: extrasFor(habit as unknown as Record<string, unknown>, [
      "id", "name", "description", "activeDays", "startDate", "archived",
      "archivedAt", "createdAt", "updatedAt",
    ]),
  };
}

export function habitCompletionToDatabaseRow(
  completion: HabitCompletion,
  sortOrder: number
): HabitCompletionDatabaseRow {
  return {
    id: habitIdToDatabaseId(completion.id, "Habit Completion"),
    habit_id: habitIdToDatabaseId(completion.habitId, "Habit Definition"),
    date: completion.date,
    completed_at: completion.completedAt,
    sort_order: sortOrder,
    extras_json: extrasFor(completion as unknown as Record<string, unknown>, [
      "id", "habitId", "date", "completedAt",
    ]),
  };
}

export function habitDefinitionRowToHabit(
  row: HabitDefinitionDatabaseRow
): HabitDefinition {
  if (row.archived !== 0 && row.archived !== 1) {
    throw new Error(`Invalid Habit archived flag: ${String(row.archived)}`);
  }
  validateSortOrder(row.sort_order, "Habit Definition");
  const habit: HabitDefinition = {
    ...parseExtras(row.extras_json, "Habit Definition"),
    id: databaseIdToHabitId(row.id, "Habit Definition"),
    name: row.name,
    activeDays: parseActiveDays(row.active_days_json),
    startDate: row.start_date,
    archived: row.archived === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
  if (row.description !== null) habit.description = row.description;
  if (row.archived_at !== null) habit.archivedAt = row.archived_at;
  return habit;
}

export function habitCompletionRowToCompletion(
  row: HabitCompletionDatabaseRow
): HabitCompletion {
  validateSortOrder(row.sort_order, "Habit Completion");
  return {
    ...parseExtras(row.extras_json, "Habit Completion"),
    id: databaseIdToHabitId(row.id, "Habit Completion"),
    habitId: databaseIdToHabitId(row.habit_id, "Habit Definition"),
    date: row.date,
    completedAt: row.completed_at,
  };
}

function validateIdentity(state: HabitState): void {
  const definitionIds = state.habits.map((habit) =>
    habitIdToDatabaseId(habit.id, "Habit Definition")
  );
  if (new Set(definitionIds).size !== definitionIds.length) {
    throw new Error("Habit migration source contains duplicate definition IDs");
  }

  const completionIds = state.completions.map((completion) =>
    habitIdToDatabaseId(completion.id, "Habit Completion")
  );
  if (new Set(completionIds).size !== completionIds.length) {
    throw new Error("Habit migration source contains duplicate completion IDs");
  }

  const dayIdentities = state.completions.map((completion) =>
    `${habitIdToDatabaseId(completion.habitId, "Habit Definition")}\u0000${completion.date}`
  );
  if (new Set(dayIdentities).size !== dayIdentities.length) {
    throw new Error("Habit migration source contains duplicate habit/date completions");
  }
}

export interface HabitRelationshipReport {
  validCompletionLinks: number;
  orphanCompletionIds: number[];
}

export function inspectHabitRelationships(state: HabitState): HabitRelationshipReport {
  const habitIds = new Set(state.habits.map((habit) => habit.id));
  const orphanCompletionIds: number[] = [];
  let validCompletionLinks = 0;
  for (const completion of state.completions) {
    if (habitIds.has(completion.habitId)) validCompletionLinks += 1;
    else orphanCompletionIds.push(completion.id);
  }
  return { validCompletionLinks, orphanCompletionIds };
}

export function habitRowsMatch(actual: unknown[], expected: unknown[]): boolean {
  return JSON.stringify(actual) === JSON.stringify(expected);
}

export type HabitMigrationResult =
  | { status: "already-complete"; imported: 0 }
  | {
      status: "complete";
      imported: number;
      relationships: HabitRelationshipReport;
    }
  | { status: "invalid-source"; imported: 0 };

export async function migrateLocalStorageHabits(
  database: HabitMigrationDatabase,
  source: HabitMigrationSource,
  completedAt = new Date().toISOString()
): Promise<HabitMigrationResult> {
  const marker = await database.getOptional<MigrationMarkerRow>(
    "SELECT id FROM migration_journal WHERE id = ?",
    [HABIT_MIGRATION_ID]
  );
  if (marker) return { status: "already-complete", imported: 0 };

  const snapshot = source.inspect();
  if (snapshot.status === "invalid") {
    return { status: "invalid-source", imported: 0 };
  }
  validateIdentity(snapshot.state);
  const definitionRows = snapshot.state.habits.map(habitDefinitionToDatabaseRow);
  const completionRows = snapshot.state.completions.map(habitCompletionToDatabaseRow);

  return database.writeTransaction(async (transaction) => {
    const transactionMarker = await transaction.getOptional<MigrationMarkerRow>(
      "SELECT id FROM migration_journal WHERE id = ?",
      [HABIT_MIGRATION_ID]
    );
    if (transactionMarker) {
      return { status: "already-complete", imported: 0 } as const;
    }

    const existingDefinitions = await transaction.getAll<HabitDefinitionDatabaseRow>(
      HABIT_DEFINITION_QUERY
    );
    const existingCompletions = await transaction.getAll<HabitCompletionDatabaseRow>(
      HABIT_COMPLETION_QUERY
    );
    if (existingDefinitions.length > 0 || existingCompletions.length > 0) {
      throw new Error(
        "Habit migration cannot import into unjournaled non-empty tables"
      );
    }

    for (const row of definitionRows) {
      await transaction.execute(
        "INSERT INTO habit_definitions(id, name, description, active_days_json, start_date, archived, archived_at, created_at, updated_at, sort_order, extras_json) VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        [row.id, row.name, row.description, row.active_days_json, row.start_date,
          row.archived, row.archived_at, row.created_at, row.updated_at,
          row.sort_order, row.extras_json]
      );
    }
    for (const row of completionRows) {
      await transaction.execute(
        "INSERT INTO habit_completions(id, habit_id, date, completed_at, sort_order, extras_json) VALUES(?, ?, ?, ?, ?, ?)",
        [row.id, row.habit_id, row.date, row.completed_at, row.sort_order,
          row.extras_json]
      );
    }

    const persistedDefinitions = await transaction.getAll<HabitDefinitionDatabaseRow>(
      HABIT_DEFINITION_QUERY
    );
    const persistedCompletions = await transaction.getAll<HabitCompletionDatabaseRow>(
      HABIT_COMPLETION_QUERY
    );
    if (
      !habitRowsMatch(persistedDefinitions, definitionRows) ||
      !habitRowsMatch(persistedCompletions, completionRows)
    ) {
      throw new Error("Habit migration verification failed");
    }

    const relationships = inspectHabitRelationships(snapshot.state);
    const imported = definitionRows.length + completionRows.length;
    await transaction.execute(
      "INSERT INTO migration_journal(id, source_key, record_count, completed_at) VALUES(?, ?, ?, ?)",
      [HABIT_MIGRATION_ID, HABIT_SOURCE_KEY, imported, completedAt]
    );
    return { status: "complete", imported, relationships } as const;
  });
}
