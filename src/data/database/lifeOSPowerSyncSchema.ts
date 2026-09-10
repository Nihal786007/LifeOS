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
