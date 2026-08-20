// ==========================================
// LifeOS Planning Kernel
// Version: 2.0
// ==========================================

import type {
  LifeGoal,
  MonthlyTarget,
  WeeklyTarget,
  Task,
} from "../shared/types";

export interface PlanningState {
  lifeGoals: LifeGoal[];
  monthlyTargets: MonthlyTarget[];
  weeklyTargets: WeeklyTarget[];
  tasks: Task[];
}

export class PlanningKernel {
  /**
   * Recalculate weekly target progress.
   */
  static recalculateWeeklyProgress(
    state: PlanningState
  ): PlanningState {
    const weeklyTargets = state.weeklyTargets.map(
      (weeklyTarget) => {
        const tasks = state.tasks.filter(
          (task) =>
            task.weeklyTargetId === weeklyTarget.id
        );

        if (tasks.length === 0) {
          return {
            ...weeklyTarget,
            progress: 0,
            completed: false,
            completedAt: undefined,
          };
        }

        const completedTasks = tasks.filter(
          (task) => task.completed
        ).length;

        const progress = Math.round(
          (completedTasks / tasks.length) * 100
        );

        const completed = progress >= 100;

        return {
          ...weeklyTarget,
          progress,
          completed,
          completedAt: completed
            ? weeklyTarget.completedAt ??
              new Date().toISOString()
            : undefined,
        };
      }
    );

    return {
      ...state,
      weeklyTargets,
    };
  }

  /**
   * Recalculate monthly target progress.
   */
  static recalculateMonthlyProgress(
    state: PlanningState
  ): PlanningState {
        const monthlyTargets = state.monthlyTargets.map(
      (monthlyTarget) => {
        const weeklyTargets = state.weeklyTargets.filter(
          (weeklyTarget) =>
            weeklyTarget.monthlyTargetId ===
            monthlyTarget.id
        );

        if (weeklyTargets.length === 0) {
          return {
            ...monthlyTarget,
            progress: 0,
            completed: false,
            completedAt: undefined,
          };
        }

        const completedWeeklyTargets =
          weeklyTargets.filter(
            (weeklyTarget) =>
              weeklyTarget.completed
          ).length;

        const progress = Math.round(
          (completedWeeklyTargets /
            weeklyTargets.length) *
            100
        );

        const completed = progress >= 100;

        return {
          ...monthlyTarget,
          progress,
          completed,
          completedAt: completed
            ? monthlyTarget.completedAt ??
              new Date().toISOString()
            : undefined,
        };
      }
    );

    return {
      ...state,
      monthlyTargets,
    };
  }

  /**
   * Recalculate life goal progress.
   */
  static recalculateLifeGoalProgress(
    state: PlanningState
  ): PlanningState {
    const lifeGoals = state.lifeGoals.map(
      (lifeGoal) => {
        const monthlyTargets =
          state.monthlyTargets.filter(
            (monthlyTarget) =>
              monthlyTarget.goalId ===
              lifeGoal.id
          );

        if (monthlyTargets.length === 0) {
          return {
            ...lifeGoal,
            progress: 0,
            completed: false,
            completedAt: undefined,
          };
        }

        const completedMonthlyTargets =
          monthlyTargets.filter(
            (monthlyTarget) =>
              monthlyTarget.completed
          ).length;

        const progress = Math.round(
          (completedMonthlyTargets /
            monthlyTargets.length) *
            100
        );

        const completed = progress >= 100;

        return {
          ...lifeGoal,
          progress,
          completed,
          completedAt: completed
            ? lifeGoal.completedAt ??
              new Date().toISOString()
            : undefined,
        };
      }
    );

    return {
      ...state,
      lifeGoals,
    };
  }

  /**
   * Runs the complete planning recalculation pipeline.
   */
  static recalculateAll(
    state: PlanningState
  ): PlanningState {
    let updated = state;

    updated =
      this.recalculateWeeklyProgress(updated);

    updated =
      this.recalculateMonthlyProgress(
        updated
      );

    updated =
      this.recalculateLifeGoalProgress(
        updated
      );

    return updated;
  }
}