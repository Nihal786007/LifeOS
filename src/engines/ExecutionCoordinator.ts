// ==========================================
// LifeOS Execution Coordinator
// Kernel v2.0
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
    state: ExecutionState,
    action: () => ExecutionResult
  ): ExecutionResult {
    const result = action();

    return ExecutionKernel.execute(
      result,
      state
    );
  }

  // ==========================================
  // Tasks
  // ==========================================

  static completeTask(
    state: ExecutionState,
    taskId: number
  ): ExecutionResult {
    return this.execute(
      state,
      () =>
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
    return this.execute(
      state,
      () =>
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
    return this.execute(
      state,
      () =>
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
    return this.execute(
      state,
      () =>
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
    return this.execute(
      state,
      () =>
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
    return this.execute(
      state,
      () =>
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
    return this.execute(
      state,
      () =>
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
    return this.execute(
      state,
      () =>
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
    return this.execute(
      state,
      () =>
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
    return this.execute(
      state,
      () =>
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
    return this.execute(
      state,
      () =>
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
    return this.execute(
      state,
      () =>
        ExecutionService.deleteLifeGoal(
          state,
          goalId
        )
    );
  }
}