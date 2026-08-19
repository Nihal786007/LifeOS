// ==========================================
// LifeOS Execution Service
// Version: 2.0
// Part 1/4
// ==========================================

import type {
  LifeGoal,
  MonthlyTarget,
  WeeklyTarget,
  Task,
} from "../shared/types";

import type {
  ExecutionRecord,
  ExecutionType,
} from "../shared/execution";

// ==========================================
// Execution State
// ==========================================

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
  executionRecords: ExecutionRecord[];
}

// ==========================================
// Execution Service
// ==========================================

export class ExecutionService {
  // ==========================================
  // Helpers
  // ==========================================

  private static now(): string {
    return new Date().toISOString();
  }

  private static createExecutionRecord(
    type: ExecutionType,
    entityId: number,
    title: string,
    xpAwarded = 0,
    metadata?: Record<string, unknown>
  ): ExecutionRecord {
    return {
      id: Date.now(),
      type,
      entityId,
      title,
      createdAt: this.now(),
      xpAwarded,
      metadata,
    };
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
        monthlyTargetIds.includes(target.monthlyTargetId ?? -1)
      )
      .map((target) => target.id);
  }

  // ==========================================
  // Life Goal Methods
  // (Part 2 starts here)
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

      monthlyTargets: state.monthlyTargets.map((target) =>
        monthlyTargetIds.includes(target.id)
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
        weeklyTargetIds.includes(task.weeklyTargetId ?? -1)
          ? {
              ...task,
              completed: true,
              completedAt,
            }
          : task
      ),

      executionRecords: [
        this.createExecutionRecord(
          "life_goal_completed",
          goalId,
          state.lifeGoals.find((g) => g.id === goalId)?.title ??
            "Life Goal"
        ),
      ],
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

      monthlyTargets: state.monthlyTargets.map((target) =>
        monthlyTargetIds.includes(target.id)
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
        weeklyTargetIds.includes(task.weeklyTargetId ?? -1)
          ? {
              ...task,
              completed: false,
              completedAt: undefined,
            }
          : task
      ),

      executionRecords: [
        this.createExecutionRecord(
          "life_goal_uncompleted",
          goalId,
          state.lifeGoals.find((g) => g.id === goalId)?.title ??
            "Life Goal"
        ),
      ],
    };
  }

  // ==========================================
  // Monthly Target Methods
  // (Part 3 starts here)
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
        weeklyTargetIds.includes(task.weeklyTargetId ?? -1)
          ? {
              ...task,
              completed: true,
              completedAt,
            }
          : task
      ),

      executionRecords: [
        this.createExecutionRecord(
          "monthly_completed",
          monthlyTargetId,
          state.monthlyTargets.find(
            (m) => m.id === monthlyTargetId
          )?.title ?? "Monthly Target"
        ),
      ],
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
        weeklyTargetIds.includes(task.weeklyTargetId ?? -1)
          ? {
              ...task,
              completed: false,
              completedAt: undefined,
            }
          : task
      ),

      executionRecords: [
        this.createExecutionRecord(
          "monthly_uncompleted",
          monthlyTargetId,
          state.monthlyTargets.find(
            (m) => m.id === monthlyTargetId
          )?.title ?? "Monthly Target"
        ),
      ],
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

      executionRecords: [
        this.createExecutionRecord(
          "monthly_deleted",
          monthlyTargetId,
          "Monthly Target"
        ),
      ],
    };
  }

  // ==========================================
  // Weekly Target Methods
  // (Part 4 starts here)
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

      executionRecords: [
        this.createExecutionRecord(
          "weekly_completed",
          weeklyTargetId,
          state.weeklyTargets.find(
            (w) => w.id === weeklyTargetId
          )?.title ?? "Weekly Target"
        ),
      ],
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

      executionRecords: [
        this.createExecutionRecord(
          "weekly_uncompleted",
          weeklyTargetId,
          state.weeklyTargets.find(
            (w) => w.id === weeklyTargetId
          )?.title ?? "Weekly Target"
        ),
      ],
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

      executionRecords: [
        this.createExecutionRecord(
          "weekly_deleted",
          weeklyTargetId,
          "Weekly Target"
        ),
      ],
    };
  }

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

      executionRecords: [
        this.createExecutionRecord(
          "task_completed",
          taskId,
          state.tasks.find((t) => t.id === taskId)?.title ?? "Task"
        ),
      ],
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

      executionRecords: [
        this.createExecutionRecord(
          "task_uncompleted",
          taskId,
          state.tasks.find((t) => t.id === taskId)?.title ?? "Task"
        ),
      ],
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

      executionRecords: [
        this.createExecutionRecord(
          "task_deleted",
          taskId,
          "Task"
        ),
      ],
    };
  }

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

      monthlyTargets: state.monthlyTargets.filter(
        (target) => target.goalId !== goalId
      ),

      weeklyTargets: state.weeklyTargets.filter(
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

      executionRecords: [
        this.createExecutionRecord(
          "life_goal_deleted",
          goalId,
          "Life Goal"
        ),
      ],
    };
  }
}