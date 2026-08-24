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

import {
  STORAGE_KEYS,
} from "../constants/storage";

import type {
  ExecutionRecord,
} from "../shared/execution";

export class ExecutionHistoryService {
  // ==========================================
  // Event
  // ==========================================

  private static readonly HISTORY_CHANGED_EVENT =
    "lifeos:execution-history-changed";

  // ==========================================
  // Load
  // ==========================================

  static getAll(): ExecutionRecord[] {
    const saved =
      localStorage.getItem(
        STORAGE_KEYS.EXECUTION_HISTORY
      );

    if (!saved) {
      return [];
    }

    try {
      const parsed =
        JSON.parse(saved);

      if (!Array.isArray(parsed)) {
        return [];
      }

      return parsed as ExecutionRecord[];
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

    this.notifyHistoryChanged();
  }

  // ==========================================
  // Append
  // ==========================================

  static append(
    records: ExecutionRecord[]
  ): ExecutionRecord[] {
    if (
      records.length === 0
    ) {
      return this.getAll();
    }

    const history =
      this.getAll();

    const updatedHistory = [
      ...records,
      ...history,
    ];

    this.save(
      updatedHistory
    );

    return updatedHistory;
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
    localStorage.removeItem(
      STORAGE_KEYS.EXECUTION_HISTORY
    );

    this.notifyHistoryChanged();
  }

  // ==========================================
  // Subscribe
  // ==========================================

  static subscribe(
    listener: () => void
  ): () => void {
    window.addEventListener(
      this.HISTORY_CHANGED_EVENT,
      listener
    );

    return () => {
      window.removeEventListener(
        this.HISTORY_CHANGED_EVENT,
        listener
      );
    };
  }

  // ==========================================
  // Notify
  // ==========================================

  private static notifyHistoryChanged(): void {
    window.dispatchEvent(
      new Event(
        this.HISTORY_CHANGED_EVENT
      )
    );
  }
}