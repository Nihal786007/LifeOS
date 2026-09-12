import type { Transaction } from "@powersync/web";

import type {
  LifeGoal,
  MonthlyTarget,
  WeeklyTarget,
} from "../../shared/types";
import type {
  PlanningSourceSnapshot,
} from "./localStoragePlanningRepositories";

export const PLANNING_MIGRATION_ID =
  "local-storage-planning-v1" as const;

export const PLANNING_SOURCE_KEY =
  "lifeos-life-goals|lifeos-monthly-plans|lifeos-weekly-targets" as const;

export const LIFE_GOAL_QUERY =
  "SELECT id, title, description, progress, completed, completed_at, start_date, target_date, created_at, sort_order, extras_json FROM life_goals ORDER BY sort_order ASC, id ASC";

export const MONTHLY_OUTCOME_QUERY =
  "SELECT id, title, month, year, goal_id, progress, completed, completed_at, created_at, sort_order, extras_json FROM monthly_outcomes ORDER BY sort_order ASC, id ASC";

export const WEEKLY_FOCUS_QUERY =
  "SELECT id, title, monthly_target_id, week, week_start_date, week_end_date, progress, completed, completed_at, created_at, sort_order, extras_json FROM weekly_focuses ORDER BY sort_order ASC, id ASC";

export interface PlanningMigrationCollectionSource<T> {
  inspect(): PlanningSourceSnapshot<T>;
}

export interface PlanningMigrationSources {
  lifeGoals: PlanningMigrationCollectionSource<LifeGoal>;
  monthlyOutcomes: PlanningMigrationCollectionSource<MonthlyTarget>;
  weeklyFocuses: PlanningMigrationCollectionSource<WeeklyTarget>;
}

export interface PlanningMigrationDatabase {
  getOptional<T>(sql: string, parameters?: unknown[]): Promise<T | null>;
  writeTransaction<T>(
    callback: (transaction: Transaction) => Promise<T>
  ): Promise<T>;
}

export interface PlanningQueryable {
  getAll<T>(sql: string, parameters?: unknown[]): Promise<T[]>;
}

interface MigrationMarkerRow {
  id: string;
}

export interface LifeGoalDatabaseRow {
  id: string;
  title: string;
  description: string | null;
  progress: number;
  completed: number;
  completed_at: string | null;
  start_date: string;
  target_date: string | null;
  created_at: string;
  sort_order: number;
  extras_json: string | null;
}

export interface MonthlyOutcomeDatabaseRow {
  id: string;
  title: string;
  month: number;
  year: number;
  goal_id: string | null;
  progress: number;
  completed: number;
  completed_at: string | null;
  created_at: string;
  sort_order: number;
  extras_json: string | null;
}

export interface WeeklyFocusDatabaseRow {
  id: string;
  title: string;
  monthly_target_id: string | null;
  week: number;
  week_start_date: string | null;
  week_end_date: string | null;
  progress: number;
  completed: number;
  completed_at: string | null;
  created_at: string;
  sort_order: number;
  extras_json: string | null;
}

type PlanningIdLabel =
  | "Life Goal"
  | "Monthly Outcome"
  | "Weekly Focus"
  | "Task";

export function planningIdToDatabaseId(
  id: number,
  label: PlanningIdLabel
): string {
  if (!Number.isSafeInteger(id) || id < 0) {
    throw new Error(`${label} ID cannot be stored safely: ${String(id)}`);
  }
  return String(id);
}

export function databaseIdToPlanningId(
  id: string,
  label: PlanningIdLabel
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

function extrasFor(
  value: Record<string, unknown>,
  knownFields: readonly string[]
): string | null {
  const extras = { ...value };
  for (const field of knownFields) delete extras[field];
  return Object.keys(extras).length > 0 ? JSON.stringify(extras) : null;
}

function parseExtras(
  value: string | null,
  label: PlanningIdLabel
): Record<string, unknown> {
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

function validateCommonRow(
  completed: number,
  progress: number,
  sortOrder: number,
  label: PlanningIdLabel
): void {
  if (completed !== 0 && completed !== 1) {
    throw new Error(`Invalid ${label} completed flag: ${String(completed)}`);
  }
  if (!Number.isFinite(progress)) {
    throw new Error(`Invalid ${label} progress: ${String(progress)}`);
  }
  if (!Number.isSafeInteger(sortOrder) || sortOrder < 0) {
    throw new Error(`Invalid ${label} sort order: ${String(sortOrder)}`);
  }
}

export function lifeGoalToDatabaseRow(
  goal: LifeGoal,
  sortOrder: number
): LifeGoalDatabaseRow {
  return {
    id: planningIdToDatabaseId(goal.id, "Life Goal"),
    title: goal.title,
    description: goal.description ?? null,
    progress: goal.progress,
    completed: goal.completed ? 1 : 0,
    completed_at: goal.completedAt ?? null,
    start_date: goal.startDate,
    target_date: goal.targetDate ?? null,
    created_at: goal.createdAt,
    sort_order: sortOrder,
    extras_json: extrasFor(goal as unknown as Record<string, unknown>, [
      "id", "title", "description", "progress", "completed", "completedAt",
      "startDate", "targetDate", "createdAt",
    ]),
  };
}

export function monthlyOutcomeToDatabaseRow(
  outcome: MonthlyTarget,
  sortOrder: number
): MonthlyOutcomeDatabaseRow {
  return {
    id: planningIdToDatabaseId(outcome.id, "Monthly Outcome"),
    title: outcome.title,
    month: outcome.month,
    year: outcome.year,
    goal_id: outcome.goalId === undefined
      ? null
      : planningIdToDatabaseId(outcome.goalId, "Life Goal"),
    progress: outcome.progress,
    completed: outcome.completed ? 1 : 0,
    completed_at: outcome.completedAt ?? null,
    created_at: outcome.createdAt,
    sort_order: sortOrder,
    extras_json: extrasFor(outcome as unknown as Record<string, unknown>, [
      "id", "title", "month", "year", "goalId", "progress", "completed",
      "completedAt", "createdAt",
    ]),
  };
}

export function weeklyFocusToDatabaseRow(
  focus: WeeklyTarget,
  sortOrder: number
): WeeklyFocusDatabaseRow {
  return {
    id: planningIdToDatabaseId(focus.id, "Weekly Focus"),
    title: focus.title,
    monthly_target_id: focus.monthlyTargetId === undefined
      ? null
      : planningIdToDatabaseId(focus.monthlyTargetId, "Monthly Outcome"),
    week: focus.week,
    week_start_date: focus.weekStartDate ?? null,
    week_end_date: focus.weekEndDate ?? null,
    progress: focus.progress,
    completed: focus.completed ? 1 : 0,
    completed_at: focus.completedAt ?? null,
    created_at: focus.createdAt,
    sort_order: sortOrder,
    extras_json: extrasFor(focus as unknown as Record<string, unknown>, [
      "id", "title", "monthlyTargetId", "week", "weekStartDate",
      "weekEndDate", "progress", "completed", "completedAt", "createdAt",
    ]),
  };
}

export function lifeGoalRowToLifeGoal(row: LifeGoalDatabaseRow): LifeGoal {
  validateCommonRow(row.completed, row.progress, row.sort_order, "Life Goal");
  const goal: LifeGoal = {
    ...parseExtras(row.extras_json, "Life Goal"),
    id: databaseIdToPlanningId(row.id, "Life Goal"),
    title: row.title,
    progress: row.progress,
    completed: row.completed === 1,
    startDate: row.start_date,
    createdAt: row.created_at,
  };
  if (row.description !== null) goal.description = row.description;
  if (row.completed_at !== null) goal.completedAt = row.completed_at;
  if (row.target_date !== null) goal.targetDate = row.target_date;
  return goal;
}

export function monthlyOutcomeRowToMonthlyOutcome(
  row: MonthlyOutcomeDatabaseRow
): MonthlyTarget {
  validateCommonRow(
    row.completed, row.progress, row.sort_order, "Monthly Outcome"
  );
  if (!Number.isFinite(row.month) || !Number.isFinite(row.year)) {
    throw new Error("Invalid Monthly Outcome calendar identity");
  }
  const outcome: MonthlyTarget = {
    ...parseExtras(row.extras_json, "Monthly Outcome"),
    id: databaseIdToPlanningId(row.id, "Monthly Outcome"),
    title: row.title,
    month: row.month,
    year: row.year,
    progress: row.progress,
    completed: row.completed === 1,
    createdAt: row.created_at,
  };
  if (row.goal_id !== null) {
    outcome.goalId = databaseIdToPlanningId(row.goal_id, "Life Goal");
  }
  if (row.completed_at !== null) outcome.completedAt = row.completed_at;
  return outcome;
}

export function weeklyFocusRowToWeeklyFocus(
  row: WeeklyFocusDatabaseRow
): WeeklyTarget {
  validateCommonRow(row.completed, row.progress, row.sort_order, "Weekly Focus");
  if (!Number.isInteger(row.week) || row.week < 1 || row.week > 5) {
    throw new Error(`Invalid Weekly Focus week: ${String(row.week)}`);
  }
  const focus: WeeklyTarget = {
    ...parseExtras(row.extras_json, "Weekly Focus"),
    id: databaseIdToPlanningId(row.id, "Weekly Focus"),
    title: row.title,
    week: row.week as WeeklyTarget["week"],
    progress: row.progress,
    completed: row.completed === 1,
    createdAt: row.created_at,
  };
  if (row.monthly_target_id !== null) {
    focus.monthlyTargetId = databaseIdToPlanningId(
      row.monthly_target_id,
      "Monthly Outcome"
    );
  }
  if (row.week_start_date !== null) focus.weekStartDate = row.week_start_date;
  if (row.week_end_date !== null) focus.weekEndDate = row.week_end_date;
  if (row.completed_at !== null) focus.completedAt = row.completed_at;
  return focus;
}

export interface PlanningRelationshipReport {
  validMonthlyGoalLinks: number;
  orphanMonthlyOutcomeIds: number[];
  validWeeklyMonthlyLinks: number;
  orphanWeeklyFocusIds: number[];
  validTaskWeeklyLinks: number;
  orphanTaskIds: number[];
}

interface IdRow { id: string }
interface MonthlyLinkRow { id: string; goal_id: string | null }
interface WeeklyLinkRow { id: string; monthly_target_id: string | null }
interface TaskLinkRow { id: string; weekly_target_id: string | null }

export async function inspectPlanningRelationships(
  database: PlanningQueryable
): Promise<PlanningRelationshipReport> {
  const goalRows = await database.getAll<IdRow>("SELECT id FROM life_goals");
  const monthlyRows = await database.getAll<MonthlyLinkRow>(
    "SELECT id, goal_id FROM monthly_outcomes"
  );
  const weeklyRows = await database.getAll<WeeklyLinkRow>(
    "SELECT id, monthly_target_id FROM weekly_focuses"
  );
  const taskRows = await database.getAll<TaskLinkRow>(
    "SELECT id, weekly_target_id FROM tasks WHERE weekly_target_id IS NOT NULL"
  );

  const goalIds = new Set(goalRows.map((row) =>
    databaseIdToPlanningId(row.id, "Life Goal")
  ));
  const monthlyIds = new Set(monthlyRows.map((row) =>
    databaseIdToPlanningId(row.id, "Monthly Outcome")
  ));
  const weeklyIds = new Set(weeklyRows.map((row) =>
    databaseIdToPlanningId(row.id, "Weekly Focus")
  ));

  const orphanMonthlyOutcomeIds: number[] = [];
  let validMonthlyGoalLinks = 0;
  for (const row of monthlyRows) {
    if (row.goal_id === null) continue;
    const id = databaseIdToPlanningId(row.id, "Monthly Outcome");
    const goalId = databaseIdToPlanningId(row.goal_id, "Life Goal");
    if (goalIds.has(goalId)) validMonthlyGoalLinks += 1;
    else orphanMonthlyOutcomeIds.push(id);
  }

  const orphanWeeklyFocusIds: number[] = [];
  let validWeeklyMonthlyLinks = 0;
  for (const row of weeklyRows) {
    if (row.monthly_target_id === null) continue;
    const id = databaseIdToPlanningId(row.id, "Weekly Focus");
    const monthlyId = databaseIdToPlanningId(
      row.monthly_target_id,
      "Monthly Outcome"
    );
    if (monthlyIds.has(monthlyId)) validWeeklyMonthlyLinks += 1;
    else orphanWeeklyFocusIds.push(id);
  }

  const orphanTaskIds: number[] = [];
  let validTaskWeeklyLinks = 0;
  for (const row of taskRows) {
    if (row.weekly_target_id === null) continue;
    const taskId = databaseIdToPlanningId(row.id, "Task");
    const weeklyId = databaseIdToPlanningId(
      row.weekly_target_id,
      "Weekly Focus"
    );
    if (weeklyIds.has(weeklyId)) validTaskWeeklyLinks += 1;
    else orphanTaskIds.push(taskId);
  }

  return {
    validMonthlyGoalLinks,
    orphanMonthlyOutcomeIds,
    validWeeklyMonthlyLinks,
    orphanWeeklyFocusIds,
    validTaskWeeklyLinks,
    orphanTaskIds,
  };
}

function rowsMatch(actual: unknown[], expected: unknown[]): boolean {
  return JSON.stringify(actual) === JSON.stringify(expected);
}

export type PlanningMigrationResult =
  | { status: "already-complete"; imported: 0 }
  | {
      status: "complete";
      imported: number;
      relationships: PlanningRelationshipReport;
    }
  | { status: "invalid-source"; imported: 0 };

export async function migrateLocalStoragePlanning(
  database: PlanningMigrationDatabase,
  sources: PlanningMigrationSources,
  completedAt: string = new Date().toISOString()
): Promise<PlanningMigrationResult> {
  const marker = await database.getOptional<MigrationMarkerRow>(
    "SELECT id FROM migration_journal WHERE id = ?",
    [PLANNING_MIGRATION_ID]
  );
  if (marker) return { status: "already-complete", imported: 0 };

  const lifeGoalSnapshot = sources.lifeGoals.inspect();
  const monthlySnapshot = sources.monthlyOutcomes.inspect();
  const weeklySnapshot = sources.weeklyFocuses.inspect();
  if (
    lifeGoalSnapshot.status === "invalid" ||
    monthlySnapshot.status === "invalid" ||
    weeklySnapshot.status === "invalid"
  ) {
    return { status: "invalid-source", imported: 0 };
  }

  const lifeGoalRows = lifeGoalSnapshot.records.map(lifeGoalToDatabaseRow);
  const monthlyRows = monthlySnapshot.records.map(monthlyOutcomeToDatabaseRow);
  const weeklyRows = weeklySnapshot.records.map(weeklyFocusToDatabaseRow);

  for (const [label, rows] of [
    ["Life Goal", lifeGoalRows],
    ["Monthly Outcome", monthlyRows],
    ["Weekly Focus", weeklyRows],
  ] as const) {
    if (new Set(rows.map((row) => row.id)).size !== rows.length) {
      throw new Error(`${label} migration source contains duplicate IDs`);
    }
  }

  return database.writeTransaction(async (transaction) => {
    const transactionMarker = await transaction.getOptional<MigrationMarkerRow>(
      "SELECT id FROM migration_journal WHERE id = ?",
      [PLANNING_MIGRATION_ID]
    );
    if (transactionMarker) {
      return { status: "already-complete", imported: 0 } as const;
    }

    const existingLifeGoals = await transaction.getAll<LifeGoalDatabaseRow>(
      LIFE_GOAL_QUERY
    );
    const existingMonthly = await transaction.getAll<MonthlyOutcomeDatabaseRow>(
      MONTHLY_OUTCOME_QUERY
    );
    const existingWeekly = await transaction.getAll<WeeklyFocusDatabaseRow>(
      WEEKLY_FOCUS_QUERY
    );
    if (
      existingLifeGoals.length > 0 ||
      existingMonthly.length > 0 ||
      existingWeekly.length > 0
    ) {
      throw new Error(
        "Planning migration cannot import into unjournaled non-empty tables"
      );
    }

    for (const row of lifeGoalRows) {
      await transaction.execute(
        "INSERT INTO life_goals(id, title, description, progress, completed, completed_at, start_date, target_date, created_at, sort_order, extras_json) VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        [row.id, row.title, row.description, row.progress, row.completed,
          row.completed_at, row.start_date, row.target_date, row.created_at,
          row.sort_order, row.extras_json]
      );
    }
    for (const row of monthlyRows) {
      await transaction.execute(
        "INSERT INTO monthly_outcomes(id, title, month, year, goal_id, progress, completed, completed_at, created_at, sort_order, extras_json) VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        [row.id, row.title, row.month, row.year, row.goal_id, row.progress,
          row.completed, row.completed_at, row.created_at, row.sort_order,
          row.extras_json]
      );
    }
    for (const row of weeklyRows) {
      await transaction.execute(
        "INSERT INTO weekly_focuses(id, title, monthly_target_id, week, week_start_date, week_end_date, progress, completed, completed_at, created_at, sort_order, extras_json) VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        [row.id, row.title, row.monthly_target_id, row.week,
          row.week_start_date, row.week_end_date, row.progress, row.completed,
          row.completed_at, row.created_at, row.sort_order, row.extras_json]
      );
    }

    const importedLifeGoals = await transaction.getAll<LifeGoalDatabaseRow>(
      LIFE_GOAL_QUERY
    );
    const importedMonthly = await transaction.getAll<MonthlyOutcomeDatabaseRow>(
      MONTHLY_OUTCOME_QUERY
    );
    const importedWeekly = await transaction.getAll<WeeklyFocusDatabaseRow>(
      WEEKLY_FOCUS_QUERY
    );
    if (
      !rowsMatch(importedLifeGoals, lifeGoalRows) ||
      !rowsMatch(importedMonthly, monthlyRows) ||
      !rowsMatch(importedWeekly, weeklyRows)
    ) {
      throw new Error("Planning migration verification failed");
    }

    const relationships = await inspectPlanningRelationships(transaction);
    const imported = lifeGoalRows.length + monthlyRows.length + weeklyRows.length;
    await transaction.execute(
      "INSERT INTO migration_journal(id, source_key, record_count, completed_at) VALUES(?, ?, ?, ?)",
      [PLANNING_MIGRATION_ID, PLANNING_SOURCE_KEY, imported, completedAt]
    );

    return { status: "complete", imported, relationships } as const;
  });
}
