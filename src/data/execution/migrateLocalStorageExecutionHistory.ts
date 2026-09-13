import type { Transaction } from "@powersync/web";

import type { ExecutionRecord, ExecutionType } from "../../shared/execution";
import type { ExecutionHistorySourceSnapshot } from "./localStorageExecutionHistoryRepository";

export const EXECUTION_HISTORY_MIGRATION_ID =
  "local-storage-execution-history-v1" as const;
export const EXECUTION_HISTORY_SOURCE_KEY =
  "lifeos-execution-history" as const;

export const EXECUTION_HISTORY_QUERY =
  "SELECT id, execution_id, type, entity_id, title, description, created_at, xp_awarded, icon, color, metadata_json, sort_order, extras_json FROM execution_records ORDER BY sort_order ASC, id ASC";

const EXECUTION_TYPES = new Set<ExecutionType>([
  "task_completed", "task_uncompleted", "task_deleted",
  "weekly_completed", "weekly_uncompleted", "weekly_deleted",
  "monthly_completed", "monthly_uncompleted", "monthly_deleted",
  "life_goal_completed", "life_goal_uncompleted", "life_goal_deleted",
  "habit_completed", "habit_uncompleted", "xp_earned",
  "achievement_unlocked", "system",
]);

export interface ExecutionHistoryMigrationSource {
  inspect(): ExecutionHistorySourceSnapshot;
}

export interface ExecutionHistoryMigrationDatabase {
  getOptional<T>(sql: string, parameters?: unknown[]): Promise<T | null>;
  writeTransaction<T>(
    callback: (transaction: Transaction) => Promise<T>
  ): Promise<T>;
}

interface MigrationMarkerRow { id: string }

export interface ExecutionRecordDatabaseRow {
  id: string;
  execution_id: string;
  type: string;
  entity_id: string;
  title: string;
  description: string | null;
  created_at: string;
  xp_awarded: number;
  icon: string | null;
  color: string | null;
  metadata_json: string | null;
  sort_order: number;
  extras_json: string | null;
}

export type ExecutionDatabaseRowIdFactory = () => string;

export function createExecutionDatabaseRowId(): string {
  return globalThis.crypto.randomUUID();
}

export function executionIdToDatabaseId(id: number, label = "Execution"): string {
  if (!Number.isSafeInteger(id) || id < 0) {
    throw new Error(`${label} ID cannot be stored safely: ${String(id)}`);
  }
  return String(id);
}

export function databaseIdToExecutionId(id: string, label = "Execution"): number {
  if (!/^(0|[1-9]\d*)$/.test(id)) {
    throw new Error(`Invalid ${label} database ID: ${id}`);
  }
  const parsed = Number(id);
  if (!Number.isSafeInteger(parsed) || String(parsed) !== id) {
    throw new Error(`Unsafe ${label} database ID: ${id}`);
  }
  return parsed;
}

function extrasFor(record: ExecutionRecord): string | null {
  const extras = { ...record } as Record<string, unknown>;
  for (const key of [
    "id", "type", "entityId", "title", "description", "createdAt",
    "xpAwarded", "icon", "color", "metadata",
  ]) delete extras[key];
  return Object.keys(extras).length > 0 ? JSON.stringify(extras) : null;
}

function parseObjectJson(value: string | null, label: string): Record<string, unknown> {
  if (value === null) return {};
  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    throw new Error(`Invalid ${label} JSON`);
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error(`Invalid ${label} payload`);
  }
  return parsed as Record<string, unknown>;
}

function validateSortOrder(value: number): void {
  if (!Number.isSafeInteger(value)) {
    throw new Error(`Invalid Execution sort order: ${String(value)}`);
  }
}

export function executionRecordToDatabaseRow(
  record: ExecutionRecord,
  sortOrder: number,
  databaseRowId = createExecutionDatabaseRowId()
): ExecutionRecordDatabaseRow {
  validateSortOrder(sortOrder);
  if (!databaseRowId) throw new Error("Execution database row ID is required");
  return {
    id: databaseRowId,
    execution_id: executionIdToDatabaseId(record.id),
    type: record.type,
    entity_id: executionIdToDatabaseId(record.entityId, "Execution entity"),
    title: record.title,
    description: record.description ?? null,
    created_at: record.createdAt,
    xp_awarded: record.xpAwarded,
    icon: record.icon ?? null,
    color: record.color ?? null,
    metadata_json: record.metadata === undefined
      ? null
      : JSON.stringify(record.metadata),
    sort_order: sortOrder,
    extras_json: extrasFor(record),
  };
}

export function executionRowToRecord(row: ExecutionRecordDatabaseRow): ExecutionRecord {
  validateSortOrder(row.sort_order);
  if (!EXECUTION_TYPES.has(row.type as ExecutionType)) {
    throw new Error(`Invalid Execution type: ${row.type}`);
  }
  if (!Number.isFinite(row.xp_awarded)) {
    throw new Error(`Invalid Execution XP: ${String(row.xp_awarded)}`);
  }
  const record: ExecutionRecord = {
    ...parseObjectJson(row.extras_json, "Execution extras"),
    id: databaseIdToExecutionId(row.execution_id),
    type: row.type as ExecutionType,
    entityId: databaseIdToExecutionId(row.entity_id, "Execution entity"),
    title: row.title,
    createdAt: row.created_at,
    xpAwarded: row.xp_awarded,
  };
  if (row.description !== null) record.description = row.description;
  if (row.icon !== null) record.icon = row.icon;
  if (row.color !== null) record.color = row.color;
  if (row.metadata_json !== null) {
    record.metadata = parseObjectJson(row.metadata_json, "Execution metadata");
  }
  return record;
}

export function executionRowsMatch(
  actual: ExecutionRecordDatabaseRow[],
  expected: ExecutionRecordDatabaseRow[]
): boolean {
  return JSON.stringify(actual) === JSON.stringify(expected);
}

export function getExecutionTotalXP(records: readonly ExecutionRecord[]): number {
  return records.reduce((total, record) =>
    Number.isFinite(record.xpAwarded) && record.xpAwarded > 0
      ? total + record.xpAwarded
      : total, 0);
}

export type ExecutionHistoryMigrationResult =
  | { status: "already-complete"; imported: 0 }
  | { status: "complete"; imported: number }
  | { status: "invalid-source"; imported: 0 };

export async function migrateLocalStorageExecutionHistory(
  database: ExecutionHistoryMigrationDatabase,
  source: ExecutionHistoryMigrationSource,
  completedAt = new Date().toISOString(),
  createRowId: ExecutionDatabaseRowIdFactory = createExecutionDatabaseRowId
): Promise<ExecutionHistoryMigrationResult> {
  const marker = await database.getOptional<MigrationMarkerRow>(
    "SELECT id FROM migration_journal WHERE id = ?",
    [EXECUTION_HISTORY_MIGRATION_ID]
  );
  if (marker) return { status: "already-complete", imported: 0 };

  const snapshot = source.inspect();
  if (snapshot.status === "invalid") {
    return { status: "invalid-source", imported: 0 };
  }

  let expectedRows: ExecutionRecordDatabaseRow[];
  try {
    expectedRows = snapshot.records.map((record, index) =>
      executionRecordToDatabaseRow(record, index, createRowId()));
  } catch {
    return { status: "invalid-source", imported: 0 };
  }
  if (new Set(expectedRows.map((row) => row.id)).size !== expectedRows.length) {
    throw new Error("Execution migration generated duplicate database row IDs");
  }

  return database.writeTransaction(async (transaction) => {
    const transactionMarker = await transaction.getOptional<MigrationMarkerRow>(
      "SELECT id FROM migration_journal WHERE id = ?",
      [EXECUTION_HISTORY_MIGRATION_ID]
    );
    if (transactionMarker) {
      return { status: "already-complete", imported: 0 } as const;
    }

    const existingRows = await transaction.getAll<ExecutionRecordDatabaseRow>(
      EXECUTION_HISTORY_QUERY
    );
    if (existingRows.length > 0) {
      throw new Error(
        "Execution History migration cannot import into an unjournaled non-empty table"
      );
    }

    for (const row of expectedRows) {
      await insertExecutionRow(transaction, row);
    }

    const persisted = await transaction.getAll<ExecutionRecordDatabaseRow>(
      EXECUTION_HISTORY_QUERY
    );
    if (!executionRowsMatch(persisted, expectedRows)) {
      throw new Error("Execution History migration verification failed");
    }
    const sourceXP = getExecutionTotalXP(snapshot.records);
    const persistedXP = getExecutionTotalXP(persisted.map(executionRowToRecord));
    if (sourceXP !== persistedXP) {
      throw new Error("Execution History migration XP verification failed");
    }

    await transaction.execute(
      "INSERT INTO migration_journal(id, source_key, record_count, completed_at) VALUES(?, ?, ?, ?)",
      [EXECUTION_HISTORY_MIGRATION_ID, EXECUTION_HISTORY_SOURCE_KEY,
        expectedRows.length, completedAt]
    );
    return { status: "complete", imported: expectedRows.length } as const;
  });
}

export function insertExecutionRow(
  transaction: Pick<Transaction, "execute">,
  row: ExecutionRecordDatabaseRow
): Promise<unknown> {
  return transaction.execute(
    "INSERT INTO execution_records(id, execution_id, type, entity_id, title, description, created_at, xp_awarded, icon, color, metadata_json, sort_order, extras_json) VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
    [row.id, row.execution_id, row.type, row.entity_id, row.title,
      row.description, row.created_at, row.xp_awarded, row.icon, row.color,
      row.metadata_json, row.sort_order, row.extras_json]
  );
}
