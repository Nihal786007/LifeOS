// ==========================================
// LifeOS Execution Coordinator
// Kernel v1.1
// ==========================================

import { ExecutionKernel } from "./ExecutionKernel";
import { ExecutionService } from "../services/ExecutionService";

import type {
  LifeGoal,
  MonthlyTarget,
  WeeklyTarget,
  Task,
} from "../shared/types";

import type {
  ExecutionResult,
} from "../services/ExecutionService";

export interface ExecutionState {
  lifeGoals: LifeGoal[];
  monthlyTargets: MonthlyTarget[];
  weeklyTargets: WeeklyTarget[];
  tasks: Task[];
}

export class ExecutionCoordinator {
  // ==========================================
  // Private Execution Helper
  // ==========================================

  private static execute(
    action: () => ExecutionResult
  ): ExecutionResult {
    const result = action();

    return ExecutionKernel.execute(result);
  }

  // ==========================================
  // Tasks
  // ==========================================

  static completeTask(
    state: ExecutionState,
    taskId: number
  ): ExecutionResult {
    return this.execute(() =>
      ExecutionService.completeTask(
        state,
        taskId
      )
    );
  }

  static uncompleteTask(
    state: ExecutionState,
    taskId: number
  ): ExecutionResult {
    return this.execute(() =>
      ExecutionService.uncompleteTask(
        state,
        taskId
      )
    );
  }

  static deleteTask(
    state: ExecutionState,
    taskId: number
  ): ExecutionResult {
    return this.execute(() =>
      ExecutionService.deleteTask(
        state,
        taskId
      )
    );
  }

  // ==========================================
  // Weekly Targets
  // ==========================================

  static completeWeeklyTarget(
    state: ExecutionState,
    weeklyTargetId: number
  ): ExecutionResult {
    return this.execute(() =>
      ExecutionService.completeWeeklyTarget(
        state,
        weeklyTargetId
      )
    );
  }

  static uncompleteWeeklyTarget(
    state: ExecutionState,
    weeklyTargetId: number
  ): ExecutionResult {
    return this.execute(() =>
      ExecutionService.uncompleteWeeklyTarget(
        state,
        weeklyTargetId
      )
    );
  }

  static deleteWeeklyTarget(
    state: ExecutionState,
    weeklyTargetId: number
  ): ExecutionResult {
    return this.execute(() =>
      ExecutionService.deleteWeeklyTarget(
        state,
        weeklyTargetId
      )
    );
  }

  // ==========================================
  // Monthly Targets
  // ==========================================

  static completeMonthlyTarget(
    state: ExecutionState,
    monthlyTargetId: number
  ): ExecutionResult {
    return this.execute(() =>
      ExecutionService.completeMonthlyTarget(
        state,
        monthlyTargetId
      )
    );
  }

  static uncompleteMonthlyTarget(
    state: ExecutionState,
    monthlyTargetId: number
  ): ExecutionResult {
    return this.execute(() =>
      ExecutionService.uncompleteMonthlyTarget(
        state,
        monthlyTargetId
      )
    );
  }

  static deleteMonthlyTarget(
    state: ExecutionState,
    monthlyTargetId: number
  ): ExecutionResult {
    return this.execute(() =>
      ExecutionService.deleteMonthlyTarget(
        state,
        monthlyTargetId
      )
    );
  }

  // ==========================================
  // Life Goals
  // ==========================================

  static completeLifeGoal(
    state: ExecutionState,
    goalId: number
  ): ExecutionResult {
    return this.execute(() =>
      ExecutionService.completeLifeGoal(
        state,
        goalId
      )
    );
  }

  static uncompleteLifeGoal(
    state: ExecutionState,
    goalId: number
  ): ExecutionResult {
    return this.execute(() =>
      ExecutionService.uncompleteLifeGoal(
        state,
        goalId
      )
    );
  }

  static deleteLifeGoal(
    state: ExecutionState,
    goalId: number
  ): ExecutionResult {
    return this.execute(() =>
      ExecutionService.deleteLifeGoal(
        state,
        goalId
      )
    );
  }
}