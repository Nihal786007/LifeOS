import type { ExecutionRecord } from "../../shared/execution";

export type ExecutionHistoryPersistencePhase =
  | "uninitialized"
  | "opening"
  | "migration"
  | "hydrated"
  | "error";

export type ExecutionHistoryRepositoryEvent =
  | { type: "history"; records: ExecutionRecord[] }
  | { type: "error"; error: Error };

/**
 * Async durability boundary beneath the synchronous ExecutionHistoryService.
 * Implementations persist historical state only; they never execute events.
 */
export interface AsyncExecutionHistoryRepository {
  initialize(
    onPhase?: (phase: "opening" | "migration") => void
  ): Promise<ExecutionRecord[]>;

  /** Reads the current durable ledger after pending repository writes. */
  readCurrent(): Promise<ExecutionRecord[]>;

  /** Resolves when locally queued writes have settled (and synced writes uploaded). */
  waitForPersistence(): Promise<void>;

  replace(records: ExecutionRecord[]): Promise<ExecutionRecord[]>;
  append(records: ExecutionRecord[]): Promise<ExecutionRecord[]>;
  remove(id: number): Promise<ExecutionRecord[]>;
  clear(): Promise<void>;
  subscribe(listener: (event: ExecutionHistoryRepositoryEvent) => void): () => void;
}
