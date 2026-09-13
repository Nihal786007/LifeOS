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

  replace(records: ExecutionRecord[]): Promise<ExecutionRecord[]>;
  append(records: ExecutionRecord[]): Promise<ExecutionRecord[]>;
  remove(id: number): Promise<ExecutionRecord[]>;
  clear(): Promise<void>;
  subscribe(listener: (event: ExecutionHistoryRepositoryEvent) => void): () => void;
}
