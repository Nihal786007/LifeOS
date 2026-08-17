// ==========================================
// LifeOS Progress Engine
// Architecture v2
// ==========================================

import type {
  LifeGoal,
  MonthlyTarget,
  Task,
  WeeklyTarget,
} from "../shared/types";

export interface ProgressState {
  lifeGoals: LifeGoal[];

  monthlyTargets: MonthlyTarget[];

  weeklyTargets: WeeklyTarget[];

  tasks: Task[];
}

export class ProgressEngine {
  // ==========================================
  // Weekly Progress
  // ==========================================

  static getWeeklyProgress(
    state: ProgressState,
    weeklyTargetId: number
  ): number {
    const tasks =
      state.tasks.filter(
        (task) =>
          task.weeklyTargetId ===
          weeklyTargetId
      );

    if (tasks.length === 0) {
      return 0;
    }

    const completed =
      tasks.filter(
        (task) => task.completed
      ).length;

    return Math.round(
      (completed / tasks.length) * 100
    );
  }

  // ==========================================
  // Monthly Progress
  // ==========================================

  static getMonthlyProgress(
    state: ProgressState,
    monthlyTargetId: number
  ): number {
    const weeklyTargets =
      state.weeklyTargets.filter(
        (target) =>
          target.monthlyTargetId ===
          monthlyTargetId
      );

    if (
      weeklyTargets.length === 0
    ) {
      return 0;
    }
        let total = 0;

    for (const weeklyTarget of weeklyTargets) {
      total += this.getWeeklyProgress(
        state,
        weeklyTarget.id
      );
    }

    return Math.round(
      total / weeklyTargets.length
    );
  }

  // ==========================================
  // Life Goal Progress
  // ==========================================

  static getLifeGoalProgress(
    state: ProgressState,
    lifeGoalId: number
  ): number {
    const monthlyTargets =
      state.monthlyTargets.filter(
        (target) =>
          target.goalId ===
          lifeGoalId
      );

    if (
      monthlyTargets.length === 0
    ) {
      return 0;
    }

    let total = 0;

    for (const monthlyTarget of monthlyTargets) {
      total += this.getMonthlyProgress(
        state,
        monthlyTarget.id
      );
    }

    return Math.round(
      total / monthlyTargets.length
    );
  }

  // ==========================================
  // Completion Helpers
  // ==========================================

  static isWeeklyCompleted(
    state: ProgressState,
    weeklyTargetId: number
  ): boolean {
    return (
      this.getWeeklyProgress(
        state,
        weeklyTargetId
      ) === 100
    );
  }

  static isMonthlyCompleted(
    state: ProgressState,
    monthlyTargetId: number
  ): boolean {
    return (
      this.getMonthlyProgress(
        state,
        monthlyTargetId
      ) === 100
    );
  }

  static isLifeGoalCompleted(
    state: ProgressState,
    lifeGoalId: number
  ): boolean {
    return (
      this.getLifeGoalProgress(
        state,
        lifeGoalId
      ) === 100
    );
  }
    // ==========================================
  // Progress Summary Helpers
  // ==========================================

  static getSummary(
    state: ProgressState
  ) {
    return {
      lifeGoals:
        state.lifeGoals.map((goal) => ({
          id: goal.id,
          progress:
            this.getLifeGoalProgress(
              state,
              goal.id
            ),
          completed:
            this.isLifeGoalCompleted(
              state,
              goal.id
            ),
        })),

      monthlyTargets:
        state.monthlyTargets.map(
          (target) => ({
            id: target.id,
            progress:
              this.getMonthlyProgress(
                state,
                target.id
              ),
            completed:
              this.isMonthlyCompleted(
                state,
                target.id
              ),
          })
        ),

      weeklyTargets:
        state.weeklyTargets.map(
          (target) => ({
            id: target.id,
            progress:
              this.getWeeklyProgress(
                state,
                target.id
              ),
            completed:
              this.isWeeklyCompleted(
                state,
                target.id
              ),
          })
        ),
    };
  }
}