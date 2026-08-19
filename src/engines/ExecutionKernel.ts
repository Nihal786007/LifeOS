// ==========================================
// LifeOS Execution Kernel
// Kernel v1.0
// ==========================================

import type {
  ExecutionRecord,
} from "../shared/execution";

import { ExecutionHistoryService } from "../services/ExecutionHistoryService";

export class ExecutionKernel {
  // ==========================================
  // Process Execution Records
  // ==========================================

  static process(
    executionRecords: ExecutionRecord[]
  ): void {
    if (executionRecords.length === 0) {
      return;
    }

    // ==========================================
    // Persist History
    // ==========================================

    ExecutionHistoryService.append(
      executionRecords
    );

    // ==========================================
    // Future Kernel Modules
    // ==========================================

    // XPKernel.process(executionRecords);
    //
    // AchievementKernel.process(executionRecords);
    //
    // TimelineKernel.process(executionRecords);
    //
    // NotificationKernel.process(executionRecords);
    //
    // AnalyticsKernel.process(executionRecords);
    //
    // AtlasKernel.process(executionRecords);
  }
}