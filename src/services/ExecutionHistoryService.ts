// ==========================================
// LifeOS Execution History Service
// Version: 2.0
// ==========================================
//
// Single persistent ledger for LifeOS
// execution/domain events.
//
// Responsibilities:
// - Read execution history
// - Persist execution history
// - Append execution records
// - Clear execution history
// - Derive total XP from history
// - Notify read models when history changes
//
// IMPORTANT:
// This service is the ONLY persistent writer
// for execution history.
// ==========================================

import type {
  ExecutionRecord,
} from "../shared/execution";

import type {
  ExecutionHistoryRepository,
} from "../data/execution/executionHistoryRepository";

export class ExecutionHistoryService {
  private static repository: ExecutionHistoryRepository | null = null;

  static configureRepository(
    repository: ExecutionHistoryRepository
  ): void {
    this.repository = repository;
  }

  private static getRepository(): ExecutionHistoryRepository {
    if (!this.repository) {
      throw new Error(
        "ExecutionHistoryService must be configured by DataServicesProvider"
      );
    }

    return this.repository;
  }

  // ==========================================
  // Load
  // ==========================================

  static getAll(): ExecutionRecord[] {
    return this.getRepository().load();
  }

  // ==========================================
  // Save
  // ==========================================

  static save(
    records: ExecutionRecord[]
  ): void {
    this.getRepository().save(records);
  }

  // ==========================================
  // Append
  // ==========================================

  static append(
    records: ExecutionRecord[]
  ): ExecutionRecord[] {
    return this.getRepository().append(records);
  }

  // ==========================================
  // Remove
  // ==========================================

  static remove(
    id: number
  ): ExecutionRecord[] {
    return this.getRepository().remove(id);
  }

  // ==========================================
  // Total XP
  // ==========================================

  static getTotalXP(): number {
    return this.getAll().reduce(
      (
        total,
        record
      ) => {
        const xp =
          Number(
            record.xpAwarded
          );

        if (
          !Number.isFinite(xp) ||
          xp <= 0
        ) {
          return total;
        }

        return total + xp;
      },
      0
    );
  }

  // ==========================================
  // Clear
  // ==========================================

  static clear(): void {
    this.getRepository().clear();
  }

  // ==========================================
  // Subscribe
  // ==========================================

  static subscribe(
    listener: () => void
  ): () => void {
    return this.getRepository().subscribe(listener);
  }
}
