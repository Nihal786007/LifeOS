// ==========================================
// LifeOS Execution Service
// ==========================================

import type {
  LifeGoal,
  MonthlyTarget,
  WeeklyTarget,
  Task,
} from "../shared/types";

export interface ExecutionState {
  lifeGoals: LifeGoal[];
  monthlyTargets: MonthlyTarget[];
  weeklyTargets: WeeklyTarget[];
  tasks: Task[];
}

export interface ExecutionResult {
  lifeGoals: LifeGoal[];
  monthlyTargets: MonthlyTarget[];
  weeklyTargets: WeeklyTarget[];
  tasks: Task[];
}

export class ExecutionService {
  // ==========================================
  // Helpers
  // ==========================================

  private static now(): string {
    return new Date().toISOString();
  }

  private static getMonthlyTargetIds(
    state: ExecutionState,
    goalId: number
  ): number[] {
    return state.monthlyTargets
      .filter((target) => target.goalId === goalId)
      .map((target) => target.id);
  }

  private static getWeeklyTargetIds(
    state: ExecutionState,
    monthlyTargetIds: number[]
  ): number[] {
    return state.weeklyTargets
      .filter((target) =>
        monthlyTargetIds.includes(
          target.monthlyTargetId ?? -1
        )
      )
      .map((target) => target.id);
  }

  // ==========================================
  // Life Goals
  // ==========================================

  static completeLifeGoal(
    state: ExecutionState,
    goalId: number
  ): ExecutionResult {
    const completedAt = this.now();

    const monthlyTargetIds =
      this.getMonthlyTargetIds(state, goalId);

    const weeklyTargetIds =
      this.getWeeklyTargetIds(
        state,
        monthlyTargetIds
      );

    return {
      lifeGoals: state.lifeGoals.map((goal) =>
        goal.id === goalId
          ? {
              ...goal,
              progress: 100,
              completed: true,
              completedAt,
            }
          : goal
      ),

      monthlyTargets:
        state.monthlyTargets.map((target) =>
          monthlyTargetIds.includes(target.id)
            ? {
                ...target,
                progress: 100,
                completed: true,
                completedAt,
              }
            : target
        ),

      weeklyTargets:
        state.weeklyTargets.map((target) =>
          weeklyTargetIds.includes(target.id)
            ? {
                ...target,
                progress: 100,
                completed: true,
                completedAt,
              }
            : target
        ),

      tasks: state.tasks.map((task) =>
        weeklyTargetIds.includes(
          task.weeklyTargetId ?? -1
        )
          ? {
              ...task,
              completed: true,
              completedAt,
            }
          : task
      ),
    };
  }

  static uncompleteLifeGoal(
    state: ExecutionState,
    goalId: number
  ): ExecutionResult {
    const monthlyTargetIds =
      this.getMonthlyTargetIds(state, goalId);

    const weeklyTargetIds =
      this.getWeeklyTargetIds(
        state,
        monthlyTargetIds
      );

    return {
      lifeGoals: state.lifeGoals.map((goal) =>
        goal.id === goalId
          ? {
              ...goal,
              progress: 0,
              completed: false,
              completedAt: undefined,
            }
          : goal
      ),

      monthlyTargets:
        state.monthlyTargets.map((target) =>
          monthlyTargetIds.includes(target.id)
            ? {
                ...target,
                progress: 0,
                completed: false,
                completedAt: undefined,
              }
            : target
        ),

      weeklyTargets:
        state.weeklyTargets.map((target) =>
          weeklyTargetIds.includes(target.id)
            ? {
                ...target,
                progress: 0,
                completed: false,
                completedAt: undefined,
              }
            : target
        ),

      tasks: state.tasks.map((task) =>
        weeklyTargetIds.includes(
          task.weeklyTargetId ?? -1
        )
          ? {
              ...task,
              completed: false,
              completedAt: undefined,
            }
          : task
      ),
    };
  }
    // ==========================================
  // Monthly Targets
  // ==========================================

  static completeMonthlyTarget(
    state: ExecutionState,
    monthlyTargetId: number
  ): ExecutionResult {
    const completedAt = this.now();

    const weeklyTargetIds = state.weeklyTargets
      .filter(
        (target) =>
          target.monthlyTargetId === monthlyTargetId
      )
      .map((target) => target.id);

    return {
      lifeGoals: state.lifeGoals,

      monthlyTargets: state.monthlyTargets.map((target) =>
        target.id === monthlyTargetId
          ? {
              ...target,
              progress: 100,
              completed: true,
              completedAt,
            }
          : target
      ),

      weeklyTargets: state.weeklyTargets.map((target) =>
        weeklyTargetIds.includes(target.id)
          ? {
              ...target,
              progress: 100,
              completed: true,
              completedAt,
            }
          : target
      ),

      tasks: state.tasks.map((task) =>
        weeklyTargetIds.includes(
          task.weeklyTargetId ?? -1
        )
          ? {
              ...task,
              completed: true,
              completedAt,
            }
          : task
      ),
    };
  }

  static uncompleteMonthlyTarget(
    state: ExecutionState,
    monthlyTargetId: number
  ): ExecutionResult {
    const weeklyTargetIds = state.weeklyTargets
      .filter(
        (target) =>
          target.monthlyTargetId === monthlyTargetId
      )
      .map((target) => target.id);

    return {
      lifeGoals: state.lifeGoals,

      monthlyTargets: state.monthlyTargets.map((target) =>
        target.id === monthlyTargetId
          ? {
              ...target,
              progress: 0,
              completed: false,
              completedAt: undefined,
            }
          : target
      ),

      weeklyTargets: state.weeklyTargets.map((target) =>
        weeklyTargetIds.includes(target.id)
          ? {
              ...target,
              progress: 0,
              completed: false,
              completedAt: undefined,
            }
          : target
      ),

      tasks: state.tasks.map((task) =>
        weeklyTargetIds.includes(
          task.weeklyTargetId ?? -1
        )
          ? {
              ...task,
              completed: false,
              completedAt: undefined,
            }
          : task
      ),
    };
  }

  static deleteMonthlyTarget(
    state: ExecutionState,
    monthlyTargetId: number
  ): ExecutionResult {
    const weeklyTargetIds = state.weeklyTargets
      .filter(
        (target) =>
          target.monthlyTargetId === monthlyTargetId
      )
      .map((target) => target.id);

    return {
      lifeGoals: state.lifeGoals,

      monthlyTargets: state.monthlyTargets.filter(
        (target) => target.id !== monthlyTargetId
      ),

      weeklyTargets: state.weeklyTargets.filter(
        (target) =>
          target.monthlyTargetId !== monthlyTargetId
      ),

      tasks: state.tasks.filter(
        (task) =>
          !weeklyTargetIds.includes(
            task.weeklyTargetId ?? -1
          )
      ),
    };
  }
    // ==========================================
  // Weekly Targets
  // ==========================================

  static completeWeeklyTarget(
    state: ExecutionState,
    weeklyTargetId: number
  ): ExecutionResult {
    const completedAt = this.now();

    return {
      lifeGoals: state.lifeGoals,

      monthlyTargets: state.monthlyTargets,

      weeklyTargets: state.weeklyTargets.map((target) =>
        target.id === weeklyTargetId
          ? {
              ...target,
              progress: 100,
              completed: true,
              completedAt,
            }
          : target
      ),

      tasks: state.tasks.map((task) =>
        task.weeklyTargetId === weeklyTargetId
          ? {
              ...task,
              completed: true,
              completedAt,
            }
          : task
      ),
    };
  }

  static uncompleteWeeklyTarget(
    state: ExecutionState,
    weeklyTargetId: number
  ): ExecutionResult {
    return {
      lifeGoals: state.lifeGoals,

      monthlyTargets: state.monthlyTargets,

      weeklyTargets: state.weeklyTargets.map((target) =>
        target.id === weeklyTargetId
          ? {
              ...target,
              progress: 0,
              completed: false,
              completedAt: undefined,
            }
          : target
      ),

      tasks: state.tasks.map((task) =>
        task.weeklyTargetId === weeklyTargetId
          ? {
              ...task,
              completed: false,
              completedAt: undefined,
            }
          : task
      ),
    };
  }

  static deleteWeeklyTarget(
    state: ExecutionState,
    weeklyTargetId: number
  ): ExecutionResult {
    return {
      lifeGoals: state.lifeGoals,

      monthlyTargets: state.monthlyTargets,

      weeklyTargets: state.weeklyTargets.filter(
        (target) => target.id !== weeklyTargetId
      ),

      tasks: state.tasks.filter(
        (task) =>
          task.weeklyTargetId !== weeklyTargetId
      ),
    };
  }

  // ==========================================
  // Tasks
  // ==========================================

  static completeTask(
    state: ExecutionState,
    taskId: number
  ): ExecutionResult {
    const completedAt = this.now();

    return {
      lifeGoals: state.lifeGoals,

      monthlyTargets: state.monthlyTargets,

      weeklyTargets: state.weeklyTargets,

      tasks: state.tasks.map((task) =>
        task.id === taskId
          ? {
              ...task,
              completed: true,
              completedAt,
            }
          : task
      ),
    };
  }

  static uncompleteTask(
    state: ExecutionState,
    taskId: number
  ): ExecutionResult {
    return {
      lifeGoals: state.lifeGoals,

      monthlyTargets: state.monthlyTargets,

      weeklyTargets: state.weeklyTargets,

      tasks: state.tasks.map((task) =>
        task.id === taskId
          ? {
              ...task,
              completed: false,
              completedAt: undefined,
            }
          : task
      ),
    };
  }

  static deleteTask(
    state: ExecutionState,
    taskId: number
  ): ExecutionResult {
    return {
      lifeGoals: state.lifeGoals,

      monthlyTargets: state.monthlyTargets,

      weeklyTargets: state.weeklyTargets,

      tasks: state.tasks.filter(
        (task) => task.id !== taskId
      ),
    };
  }  // ==========================================
  // Delete Life Goal
  // ==========================================

  static deleteLifeGoal(
    state: ExecutionState,
    goalId: number
  ): ExecutionResult {
    const monthlyTargetIds =
      this.getMonthlyTargetIds(state, goalId);

    const weeklyTargetIds =
      this.getWeeklyTargetIds(
        state,
        monthlyTargetIds
      );

    return {
      lifeGoals: state.lifeGoals.filter(
        (goal) => goal.id !== goalId
      ),

      monthlyTargets:
        state.monthlyTargets.filter(
          (target) =>
            target.goalId !== goalId
        ),

      weeklyTargets:
        state.weeklyTargets.filter(
          (target) =>
            !monthlyTargetIds.includes(
              target.monthlyTargetId ?? -1
            )
        ),

      tasks: state.tasks.filter(
        (task) =>
          !weeklyTargetIds.includes(
            task.weeklyTargetId ?? -1
          )
      ),
    };
  }
}