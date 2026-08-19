// ==========================================
// LifeOS Execution Kernel
// Kernel v1.0
// ==========================================

import type { ExecutionResult } from "../services/ExecutionService";

import { ExecutionHistoryService } from "../services/ExecutionHistoryService";

export class ExecutionKernel {
  // ==========================================
  // Execute Kernel
  // ==========================================

  static execute(
    result: ExecutionResult
  ): ExecutionResult {
    if (result.executionRecords.length === 0) {
      return result;
    }

    // ==========================================
    // Persist Execution History
    // ==========================================

    ExecutionHistoryService.append(
      result.executionRecords
    );

    // ==========================================
    // Future Kernel Modules
    // ==========================================

    // PlanningKernel.process(result);
    //
    // XPKernel.process(result);
    //
    // AchievementKernel.process(result);
    //
    // TimelineKernel.process(result);
    //
    // NotificationKernel.process(result);
    //
    // AnalyticsKernel.process(result);
    //
    // AtlasKernel.process(result);

    return result;
  }
}