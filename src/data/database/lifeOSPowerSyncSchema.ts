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

export const lifeOSPowerSyncSchema = new Schema({
  [POWERSYNC_CAPTURES_TABLE]: powerSyncCapturesTable,
  [POWERSYNC_MIGRATION_JOURNAL_TABLE]: powerSyncMigrationJournalTable,
});

export type LifeOSPowerSyncDatabase =
  (typeof lifeOSPowerSyncSchema)["types"];
