import type { PowerSyncDatabase, Transaction } from "@powersync/web";

import type { ExecutionRecord } from "../../shared/execution";
import type {
  AsyncExecutionHistoryRepository,
  ExecutionHistoryRepositoryEvent,
} from "./asyncExecutionHistoryRepository";
import {
  createExecutionDatabaseRowId,
  EXECUTION_HISTORY_QUERY,
  executionIdToDatabaseId,
  executionRecordToDatabaseRow,
  executionRowToRecord,
  executionRowsMatch,
  insertExecutionRow,
  migrateLocalStorageExecutionHistory,
} from "./migrateLocalStorageExecutionHistory";
import type {
  ExecutionDatabaseRowIdFactory,
  ExecutionHistoryMigrationSource,
  ExecutionRecordDatabaseRow,
} from "./migrateLocalStorageExecutionHistory";

async function loadRows(
  database: Pick<PowerSyncDatabase, "getAll">
): Promise<ExecutionRecordDatabaseRow[]> {
  return database.getAll<ExecutionRecordDatabaseRow>(EXECUTION_HISTORY_QUERY);
}

function rowsToRecords(rows: ExecutionRecordDatabaseRow[]): ExecutionRecord[] {
  return rows.map(executionRowToRecord);
}

async function replaceRows(
  transaction: Transaction,
  records: ExecutionRecord[],
  createRowId: ExecutionDatabaseRowIdFactory
): Promise<ExecutionRecord[]> {
  const rows = records.map((record, index) =>
    executionRecordToDatabaseRow(record, index, createRowId()));
  if (new Set(rows.map((row) => row.id)).size !== rows.length) {
    throw new Error("Execution replacement generated duplicate database row IDs");
  }
  await transaction.execute("DELETE FROM execution_records");
  for (const row of rows) await insertExecutionRow(transaction, row);
  const persisted = await transaction.getAll<ExecutionRecordDatabaseRow>(
    EXECUTION_HISTORY_QUERY
  );
  if (!executionRowsMatch(persisted, rows)) {
    throw new Error("Execution History replacement verification failed");
  }
  return rowsToRecords(persisted);
}

export class PowerSyncExecutionHistoryRepository
implements AsyncExecutionHistoryRepository {
  private initialization?: Promise<ExecutionRecord[]>;
  private mutationQueue: Promise<void> = Promise.resolve();
  private readonly database: PowerSyncDatabase;
  private readonly migrationSource: ExecutionHistoryMigrationSource;
  private readonly createRowId: ExecutionDatabaseRowIdFactory;

  constructor(
    database: PowerSyncDatabase,
    migrationSource: ExecutionHistoryMigrationSource,
    createRowId: ExecutionDatabaseRowIdFactory = createExecutionDatabaseRowId
  ) {
    this.database = database;
    this.migrationSource = migrationSource;
    this.createRowId = createRowId;
  }

  initialize(
    onPhase?: (phase: "opening" | "migration") => void
  ): Promise<ExecutionRecord[]> {
    if (!this.initialization) this.initialization = this.initializeOnce(onPhase);
    return this.initialization;
  }

  private async initializeOnce(
    onPhase?: (phase: "opening" | "migration") => void
  ): Promise<ExecutionRecord[]> {
    onPhase?.("opening");
    await this.database.init();
    onPhase?.("migration");
    const migration = await migrateLocalStorageExecutionHistory(
      this.database,
      this.migrationSource,
      undefined,
      this.createRowId
    );
    if (migration.status === "invalid-source") {
      throw new Error("Existing Execution History data is invalid and was not migrated");
    }
    return rowsToRecords(await loadRows(this.database));
  }

  async replace(records: ExecutionRecord[]): Promise<ExecutionRecord[]> {
    await this.initialize();
    const snapshot = structuredClone(records);
    return this.enqueue(() => this.database.writeTransaction((transaction) =>
      replaceRows(transaction, snapshot, this.createRowId)));
  }

  async append(records: ExecutionRecord[]): Promise<ExecutionRecord[]> {
    await this.initialize();
    if (records.length === 0) return rowsToRecords(await loadRows(this.database));
    const snapshot = structuredClone(records);
    return this.enqueue(() => this.database.writeTransaction(async (transaction) => {
      const existing = await transaction.getAll<ExecutionRecordDatabaseRow>(
        EXECUTION_HISTORY_QUERY
      );
      const minimum = existing.length > 0 ? existing[0]!.sort_order : snapshot.length;
      const first = existing.length > 0 ? minimum - snapshot.length : 0;
      if (!Number.isSafeInteger(first)) {
        throw new Error("Execution History sort order is exhausted");
      }
      const added = snapshot.map((record, index) =>
        executionRecordToDatabaseRow(record, first + index, this.createRowId()));
      if (new Set(added.map((row) => row.id)).size !== added.length) {
        throw new Error("Execution append generated duplicate database row IDs");
      }
      for (const row of added) await insertExecutionRow(transaction, row);
      const persisted = await transaction.getAll<ExecutionRecordDatabaseRow>(
        EXECUTION_HISTORY_QUERY
      );
      if (!executionRowsMatch(persisted, [...added, ...existing])) {
        throw new Error("Execution History append verification failed");
      }
      return rowsToRecords(persisted);
    }));
  }

  async remove(id: number): Promise<ExecutionRecord[]> {
    await this.initialize();
    const databaseId = executionIdToDatabaseId(id);
    return this.enqueue(() => this.database.writeTransaction(async (transaction) => {
      const existing = await transaction.getAll<ExecutionRecordDatabaseRow>(
        EXECUTION_HISTORY_QUERY
      );
      const expected = existing.filter((row) => row.execution_id !== databaseId);
      if (expected.length === existing.length) return rowsToRecords(existing);
      await transaction.execute(
        "DELETE FROM execution_records WHERE execution_id = ?",
        [databaseId]
      );
      const persisted = await transaction.getAll<ExecutionRecordDatabaseRow>(
        EXECUTION_HISTORY_QUERY
      );
      if (!executionRowsMatch(persisted, expected)) {
        throw new Error("Execution History removal verification failed");
      }
      return rowsToRecords(persisted);
    }));
  }

  async clear(): Promise<void> {
    await this.initialize();
    await this.enqueue(() => this.database.writeTransaction(async (transaction) => {
      await transaction.execute("DELETE FROM execution_records");
      const persisted = await transaction.getAll<ExecutionRecordDatabaseRow>(
        EXECUTION_HISTORY_QUERY
      );
      if (persisted.length > 0) throw new Error("Execution History clear failed");
    }));
  }

  subscribe(listener: (event: ExecutionHistoryRepositoryEvent) => void): () => void {
    const abortController = new AbortController();
    void this.watch(listener, abortController.signal);
    return () => abortController.abort();
  }

  private async watch(
    listener: (event: ExecutionHistoryRepositoryEvent) => void,
    signal: AbortSignal
  ): Promise<void> {
    try {
      await this.initialize();
      for await (const result of this.database.watch(
        EXECUTION_HISTORY_QUERY, [], { signal }
      )) {
        if (signal.aborted) return;
        const rows = result.rows?._array as ExecutionRecordDatabaseRow[] | undefined;
        listener({ type: "history", records: rowsToRecords(rows ?? []) });
      }
    } catch (error) {
      if (signal.aborted) return;
      listener({
        type: "error",
        error: error instanceof Error ? error : new Error(String(error)),
      });
    }
  }

  private enqueue<T>(operation: () => Promise<T>): Promise<T> {
    const result = this.mutationQueue.then(operation);
    this.mutationQueue = result.then(() => undefined, () => undefined);
    return result;
  }
}

export { databaseIdToExecutionId, executionIdToDatabaseId }
  from "./migrateLocalStorageExecutionHistory";
