import {
  column,
  Schema,
  Table,
} from "@powersync/web";

export const POWERSYNC_PROBE_CAPTURES_TABLE = "captures" as const;

export const powerSyncProbeCapturesTable = Table.createLocalOnly({
  text: column.text,
  created_at: column.text,
});

export const lifeOSPowerSyncProbeSchema = new Schema({
  [POWERSYNC_PROBE_CAPTURES_TABLE]: powerSyncProbeCapturesTable,
});

export type PowerSyncProbeDatabase =
  (typeof lifeOSPowerSyncProbeSchema)["types"];

export const POWERSYNC_CAPTURES_TABLE = "captures" as const;
export const POWERSYNC_MIGRATION_JOURNAL_TABLE =
  "migration_journal" as const;
export const POWERSYNC_TASKS_TABLE = "tasks" as const;
export const POWERSYNC_LIFE_GOALS_TABLE = "life_goals" as const;
export const POWERSYNC_MONTHLY_OUTCOMES_TABLE = "monthly_outcomes" as const;
export const POWERSYNC_WEEKLY_FOCUSES_TABLE = "weekly_focuses" as const;
export const POWERSYNC_HABIT_DEFINITIONS_TABLE =
  "habit_definitions" as const;
export const POWERSYNC_HABIT_COMPLETIONS_TABLE =
  "habit_completions" as const;
export const POWERSYNC_EXECUTION_RECORDS_TABLE =
  "execution_records" as const;

export const powerSyncCapturesTable = Table.createLocalOnly({
  text: column.text,
  created_at: column.text,
  sort_order: column.integer,
  extras_json: column.text,
});

export const powerSyncMigrationJournalTable = Table.createLocalOnly({
  source_key: column.text,
  record_count: column.integer,
  completed_at: column.text,
});

export const powerSyncTasksTable = Table.createLocalOnly({
  title: column.text,
  description: column.text,
  due_date: column.text,
  priority: column.text,
  weekly_target_id: column.text,
  completed: column.integer,
  completed_at: column.text,
  created_at: column.text,
  sort_order: column.integer,
  extras_json: column.text,
});

export const powerSyncLifeGoalsTable = Table.createLocalOnly({
  title: column.text,
  description: column.text,
  progress: column.real,
  completed: column.integer,
  completed_at: column.text,
  start_date: column.text,
  target_date: column.text,
  created_at: column.text,
  sort_order: column.integer,
  extras_json: column.text,
});

export const powerSyncMonthlyOutcomesTable = Table.createLocalOnly({
  title: column.text,
  month: column.integer,
  year: column.integer,
  goal_id: column.text,
  progress: column.real,
  completed: column.integer,
  completed_at: column.text,
  created_at: column.text,
  sort_order: column.integer,
  extras_json: column.text,
});

export const powerSyncWeeklyFocusesTable = Table.createLocalOnly({
  title: column.text,
  monthly_target_id: column.text,
  week: column.integer,
  week_start_date: column.text,
  week_end_date: column.text,
  progress: column.real,
  completed: column.integer,
  completed_at: column.text,
  created_at: column.text,
  sort_order: column.integer,
  extras_json: column.text,
});

export const powerSyncHabitDefinitionsTable = Table.createLocalOnly({
  name: column.text,
  description: column.text,
  active_days_json: column.text,
  start_date: column.text,
  archived: column.integer,
  archived_at: column.text,
  created_at: column.text,
  updated_at: column.text,
  sort_order: column.integer,
  extras_json: column.text,
});

export const powerSyncHabitCompletionsTable = Table.createLocalOnly({
  habit_id: column.text,
  date: column.text,
  completed_at: column.text,
  sort_order: column.integer,
  extras_json: column.text,
});

export const powerSyncExecutionRecordsTable = Table.createLocalOnly({
  execution_id: column.text,
  type: column.text,
  entity_id: column.text,
  title: column.text,
  description: column.text,
  created_at: column.text,
  xp_awarded: column.real,
  icon: column.text,
  color: column.text,
  metadata_json: column.text,
  sort_order: column.integer,
  extras_json: column.text,
});

export const lifeOSPowerSyncSchema = new Schema({
  [POWERSYNC_CAPTURES_TABLE]: powerSyncCapturesTable,
  [POWERSYNC_MIGRATION_JOURNAL_TABLE]: powerSyncMigrationJournalTable,
    [POWERSYNC_TASKS_TABLE]: powerSyncTasksTable,
  [POWERSYNC_LIFE_GOALS_TABLE]: powerSyncLifeGoalsTable,
  [POWERSYNC_MONTHLY_OUTCOMES_TABLE]: powerSyncMonthlyOutcomesTable,
  [POWERSYNC_WEEKLY_FOCUSES_TABLE]: powerSyncWeeklyFocusesTable,
  [POWERSYNC_HABIT_DEFINITIONS_TABLE]: powerSyncHabitDefinitionsTable,
  [POWERSYNC_HABIT_COMPLETIONS_TABLE]: powerSyncHabitCompletionsTable,
  [POWERSYNC_EXECUTION_RECORDS_TABLE]: powerSyncExecutionRecordsTable,
});

export type LifeOSPowerSyncDatabase =
  (typeof lifeOSPowerSyncSchema)["types"];
