// ==========================================
// LifeOS Execution Kernel
// Kernel v2.0
// ==========================================

import { PlanningKernel } from "./PlanningKernel";

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
    // Planning Kernel
    // ==========================================

    const planningState =
      PlanningKernel.recalculateAll({
        lifeGoals: result.lifeGoals,
        monthlyTargets: result.monthlyTargets,
        weeklyTargets: result.weeklyTargets,
        tasks: result.tasks,
      });

    result.lifeGoals =
      planningState.lifeGoals;

    result.monthlyTargets =
      planningState.monthlyTargets;

    result.weeklyTargets =
      planningState.weeklyTargets;

    result.tasks =
      planningState.tasks;

    // ==========================================
    // Future Kernel Modules
    // ==========================================

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