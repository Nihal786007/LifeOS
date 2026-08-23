// ==========================================
// LifeOS Execution Kernel
// Kernel v4.0
// ==========================================

import { PlanningKernel } from "./PlanningKernel";
import { PlanningTransitionEngine } from "./PlanningTransitionEngine";
import { XPAutomationEngine } from "./XPAutomationEngine";

import { ExecutionHistoryService } from "../services/ExecutionHistoryService";

import type {
  ExecutionResult,
  ExecutionState,
} from "../services/ExecutionService";

export class ExecutionKernel {
  // ==========================================
  // Execute Kernel
  // ==========================================

  static execute(
    result: ExecutionResult,
    previousState?: ExecutionState
  ): ExecutionResult {
    if (result.executionRecords.length === 0) {
      return result;
    }

    // ==========================================
    // Planning Recalculation
    // ==========================================

    const planningState =
      PlanningKernel.recalculateAll({
        lifeGoals: result.lifeGoals,
        monthlyTargets: result.monthlyTargets,
        weeklyTargets: result.weeklyTargets,
        tasks: result.tasks,
      });

    // ==========================================
    // Automatic Planning Transitions
    // ==========================================

    if (previousState) {
      const transitionRecords =
        PlanningTransitionEngine.detectTransitions(
          previousState,
          planningState,
          result.executionRecords
        );

      result.executionRecords = [
        ...result.executionRecords,
        ...transitionRecords,
      ];
    }

    // ==========================================
    // Apply Planning State
    // ==========================================

    result.lifeGoals =
      planningState.lifeGoals;

    result.monthlyTargets =
      planningState.monthlyTargets;

    result.weeklyTargets =
      planningState.weeklyTargets;

    result.tasks =
      planningState.tasks;

    // ==========================================
    // XP Automation
    // ==========================================

    const executionHistory =
      ExecutionHistoryService.getAll();

    const xpResult =
      XPAutomationEngine.process(
        result.executionRecords,
        executionHistory
      );

    result.executionRecords =
      xpResult.records;

    // ==========================================
    // Persist Final Execution History
    // ==========================================

    ExecutionHistoryService.append(
      result.executionRecords
    );

    // ==========================================
    // Future Execution Consumers
    // ==========================================

    // Achievement automation
    // Timeline / Life Calendar
    // Notifications
    // Analytics
    // ATLAS

    return result;
  }
}