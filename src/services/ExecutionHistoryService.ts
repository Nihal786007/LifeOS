// ==========================================
// LifeOS Execution History Service
// Kernel v1.0
// ==========================================

import { STORAGE_KEYS } from "../constants/storage";

import type {
  ExecutionRecord,
} from "../shared/execution";

export class ExecutionHistoryService {
  // ==========================================
  // Load
  // ==========================================

  static getAll(): ExecutionRecord[] {
    const saved = localStorage.getItem(
      STORAGE_KEYS.EXECUTION_HISTORY
    );

    if (!saved) {
      return [];
    }

    try {
      return JSON.parse(saved) as ExecutionRecord[];
    } catch {
      return [];
    }
  }

  // ==========================================
  // Save
  // ==========================================

  static save(
    records: ExecutionRecord[]
  ): void {
    localStorage.setItem(
      STORAGE_KEYS.EXECUTION_HISTORY,
      JSON.stringify(records)
    );
  }

  // ==========================================
  // Append
  // ==========================================

  static append(
    records: ExecutionRecord[]
  ): ExecutionRecord[] {
    if (records.length === 0) {
      return this.getAll();
    }

    const history = this.getAll();

    const updatedHistory = [
      ...records,
      ...history,
    ];

    this.save(updatedHistory);

    return updatedHistory;
  }

  // ==========================================
  // Clear
  // ==========================================

  static clear(): void {
    localStorage.removeItem(
      STORAGE_KEYS.EXECUTION_HISTORY
    );
  }
}