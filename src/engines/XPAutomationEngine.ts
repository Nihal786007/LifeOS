// ==========================================
// LifeOS XP Automation Engine
// Version: 1.0
// ==========================================

import type {
  ExecutionRecord,
} from "../shared/execution";

import { XPAwardEngine } from "./XPAwardEngine";

// ==========================================
// Result
// ==========================================

export interface XPAutomationResult {
  records: ExecutionRecord[];
  earnedXP: number;
}

// ==========================================
// XP Automation Engine
// ==========================================

export class XPAutomationEngine {
  /**
   * Processes new execution records and assigns XP.
   *
   * Historical records are used to prevent XP farming.
   *
   * Example:
   *
   * complete task → XP awarded
   * uncomplete task
   * complete same task again → no additional XP
   */
  static process(
    records: ExecutionRecord[],
    historicalRecords: ExecutionRecord[]
  ): XPAutomationResult {
    let earnedXP = 0;

    // ==========================================
    // Previously Rewarded / Completed Events
    // ==========================================

    const historicalCompletionKeys =
      new Set<string>();

    for (const record of historicalRecords) {
      const reward =
        XPAwardEngine.getXP(
          record.type
        );

      if (reward <= 0) {
        continue;
      }

      historicalCompletionKeys.add(
        this.createCompletionKey(
          record.type,
          record.entityId
        )
      );
    }

    // ==========================================
    // Current Execution Batch
    // ==========================================

    const currentCompletionKeys =
      new Set<string>();

    const processedRecords =
      records.map((record) => {
        const reward =
          XPAwardEngine.getXP(
            record.type
          );

        if (reward <= 0) {
          return {
            ...record,
            xpAwarded: 0,
          };
        }

        const completionKey =
          this.createCompletionKey(
            record.type,
            record.entityId
          );

        const previouslyCompleted =
          historicalCompletionKeys.has(
            completionKey
          );

        const alreadyProcessedNow =
          currentCompletionKeys.has(
            completionKey
          );

        if (
          previouslyCompleted ||
          alreadyProcessedNow
        ) {
          return {
            ...record,
            xpAwarded: 0,
          };
        }

        currentCompletionKeys.add(
          completionKey
        );

        earnedXP += reward;

        return {
          ...record,
          xpAwarded: reward,
        };
      });

    return {
      records: processedRecords,
      earnedXP,
    };
  }

  // ==========================================
  // Completion Identity
  // ==========================================

  private static createCompletionKey(
    type: ExecutionRecord["type"],
    entityId: number
  ): string {
    return `${type}:${entityId}`;
  }
}