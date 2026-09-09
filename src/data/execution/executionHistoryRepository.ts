import type {
  ExecutionRecord,
} from "../../shared/execution";

/**
 * Persistence boundary for the canonical execution-history ledger.
 *
 * Event production, XP rules, analytics, and other domain behavior remain
 * outside this repository.
 */
export interface ExecutionHistoryRepository {
  load(): ExecutionRecord[];
  save(records: ExecutionRecord[]): void;
  append(records: ExecutionRecord[]): ExecutionRecord[];
  remove(id: number): ExecutionRecord[];
  clear(): void;
  subscribe(listener: () => void): () => void;
}
