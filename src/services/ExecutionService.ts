// ==========================================
// LifeOS Execution Service
// Version: 2.1
// ==========================================
//
// Responsibilities:
// - Perform deterministic execution mutations
// - Produce execution records
// - Preserve relationship truth at completion time
//
// IMPORTANT:
// Historical task relationship snapshots are
// captured BEFORE planning state is mutated.
//
// This allows Analytics to reconstruct where
// completed effort belonged at execution time,
// even if tasks are moved later.
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

import {
  TaskRelationshipEngine,
} from "../engines/TaskRelationshipEngine";

import type {
  TaskRelationshipScope,
} from "../engines/TaskRelationshipEngine";

// ==========================================
// Execution State
// ==========================================

export interface ExecutionState {
  lifeGoals: LifeGoal[];

  monthlyTargets:
    MonthlyTarget[];

  weeklyTargets:
    WeeklyTarget[];

  tasks: Task[];
}

export interface ExecutionResult {
  lifeGoals: LifeGoal[];

  monthlyTargets:
    MonthlyTarget[];

  weeklyTargets:
    WeeklyTarget[];

  tasks: Task[];

  executionRecords:
    ExecutionRecord[];
}

// ==========================================
// Historical Relationship Snapshot
// ==========================================

interface TaskRelationshipSnapshot {
  taskId: number;

  scope:
    TaskRelationshipScope;

  weeklyTargetId?:
    number;

  monthlyTargetId?:
    number;

  lifeGoalId?:
    number;
}

// ==========================================
// Execution Service
// ==========================================

export class ExecutionService {
  // ========================================
  // Helpers
  // ========================================

  private static now(): string {
    return new Date().toISOString();
  }

  private static createExecutionRecord(
    type: ExecutionType,
    entityId: number,
    title: string,
    xpAwarded = 0,
    metadata?: Record<
      string,
      unknown
    >
  ): ExecutionRecord {
    return {
      id:
        Date.now(),

      type,

      entityId,

      title,

      createdAt:
        this.now(),

      xpAwarded,

      metadata,
    };
  }

  private static getMonthlyTargetIds(
    state: ExecutionState,
    goalId: number
  ): number[] {
    return state.monthlyTargets
      .filter(
        (target) =>
          target.goalId ===
          goalId
      )
      .map(
        (target) =>
          target.id
      );
  }

  private static getWeeklyTargetIds(
    state: ExecutionState,
    monthlyTargetIds:
      number[]
  ): number[] {
    return state.weeklyTargets
      .filter(
        (target) =>
          monthlyTargetIds.includes(
            target.monthlyTargetId ??
              -1
          )
      )
      .map(
        (target) =>
          target.id
      );
  }

  // ========================================
  // Relationship Snapshot Helpers
  // ========================================

  private static getTaskRelationshipSnapshot(
    state: ExecutionState,
    taskId: number
  ):
    | TaskRelationshipSnapshot
    | undefined {
    const relationship =
      TaskRelationshipEngine.resolve(
        state,
        taskId
      );

    if (!relationship) {
      return undefined;
    }

    return {
      taskId:
        relationship.task.id,

      scope:
        relationship.scope,

      weeklyTargetId:
        relationship.weeklyTarget
          ?.id,

      monthlyTargetId:
        relationship.monthlyTarget
          ?.id,

      lifeGoalId:
        relationship.lifeGoal
          ?.id,
    };
  }

  private static getNewlyCompletedTaskSnapshots(
    state: ExecutionState,
    taskIds: number[]
  ): TaskRelationshipSnapshot[] {
    const snapshots:
      TaskRelationshipSnapshot[] =
        [];

    taskIds.forEach(
      (taskId) => {
        const task =
          state.tasks.find(
            (item) =>
              item.id ===
              taskId
          );

        if (
          !task ||
          task.completed
        ) {
          return;
        }

        const snapshot =
          this.getTaskRelationshipSnapshot(
            state,
            taskId
          );

        if (snapshot) {
          snapshots.push(
            snapshot
          );
        }
      }
    );

    return snapshots;
  }

  private static createCompletionMetadata(
    snapshots:
      TaskRelationshipSnapshot[]
  ):
    | Record<
        string,
        unknown
      >
    | undefined {
    if (
      snapshots.length ===
      0
    ) {
      return undefined;
    }

    return {
      relationshipSnapshotVersion:
        1,

      taskRelationshipSnapshots:
        snapshots,
    };
  }

  // ========================================
  // Life Goal
  // ========================================

  static completeLifeGoal(
    state: ExecutionState,
    goalId: number
  ): ExecutionResult {
    const completedAt =
      this.now();

    const monthlyTargetIds =
      this.getMonthlyTargetIds(
        state,
        goalId
      );

    const weeklyTargetIds =
      this.getWeeklyTargetIds(
        state,
        monthlyTargetIds
      );

    const affectedTaskIds =
      state.tasks
        .filter(
          (task) =>
            weeklyTargetIds.includes(
              task.weeklyTargetId ??
                -1
            )
        )
        .map(
          (task) =>
            task.id
        );

    const taskRelationshipSnapshots =
      this.getNewlyCompletedTaskSnapshots(
        state,
        affectedTaskIds
      );

    return {
      lifeGoals:
        state.lifeGoals.map(
          (goal) =>
            goal.id ===
            goalId
              ? {
                  ...goal,

                  progress:
                    100,

                  completed:
                    true,

                  completedAt,
                }
              : goal
        ),

      monthlyTargets:
        state.monthlyTargets.map(
          (target) =>
            monthlyTargetIds.includes(
              target.id
            )
              ? {
                  ...target,

                  progress:
                    100,

                  completed:
                    true,

                  completedAt,
                }
              : target
        ),

      weeklyTargets:
        state.weeklyTargets.map(
          (target) =>
            weeklyTargetIds.includes(
              target.id
            )
              ? {
                  ...target,

                  progress:
                    100,

                  completed:
                    true,

                  completedAt,
                }
              : target
        ),

      tasks:
        state.tasks.map(
          (task) =>
            weeklyTargetIds.includes(
              task.weeklyTargetId ??
                -1
            )
              ? {
                  ...task,

                  completed:
                    true,

                  completedAt,
                }
              : task
        ),

      executionRecords: [
        this.createExecutionRecord(
          "life_goal_completed",

          goalId,

          state.lifeGoals.find(
            (goal) =>
              goal.id ===
              goalId
          )?.title ??
            "Life Goal",

          0,

          this.createCompletionMetadata(
            taskRelationshipSnapshots
          )
        ),
      ],
    };
  }

  static uncompleteLifeGoal(
    state: ExecutionState,
    goalId: number
  ): ExecutionResult {
    const monthlyTargetIds =
      this.getMonthlyTargetIds(
        state,
        goalId
      );

    const weeklyTargetIds =
      this.getWeeklyTargetIds(
        state,
        monthlyTargetIds
      );

    return {
      lifeGoals:
        state.lifeGoals.map(
          (goal) =>
            goal.id ===
            goalId
              ? {
                  ...goal,

                  progress:
                    0,

                  completed:
                    false,

                  completedAt:
                    undefined,
                }
              : goal
        ),

      monthlyTargets:
        state.monthlyTargets.map(
          (target) =>
            monthlyTargetIds.includes(
              target.id
            )
              ? {
                  ...target,

                  progress:
                    0,

                  completed:
                    false,

                  completedAt:
                    undefined,
                }
              : target
        ),

      weeklyTargets:
        state.weeklyTargets.map(
          (target) =>
            weeklyTargetIds.includes(
              target.id
            )
              ? {
                  ...target,

                  progress:
                    0,

                  completed:
                    false,

                  completedAt:
                    undefined,
                }
              : target
        ),

      tasks:
        state.tasks.map(
          (task) =>
            weeklyTargetIds.includes(
              task.weeklyTargetId ??
                -1
            )
              ? {
                  ...task,

                  completed:
                    false,

                  completedAt:
                    undefined,
                }
              : task
        ),

      executionRecords: [
        this.createExecutionRecord(
          "life_goal_uncompleted",

          goalId,

          state.lifeGoals.find(
            (goal) =>
              goal.id ===
              goalId
          )?.title ??
            "Life Goal"
        ),
      ],
    };
  }

  static deleteLifeGoal(
    state: ExecutionState,
    goalId: number
  ): ExecutionResult {
    const monthlyTargetIds =
      this.getMonthlyTargetIds(
        state,
        goalId
      );

    const weeklyTargetIds =
      this.getWeeklyTargetIds(
        state,
        monthlyTargetIds
      );

    return {
      lifeGoals:
        state.lifeGoals.filter(
          (goal) =>
            goal.id !==
            goalId
        ),

      monthlyTargets:
        state.monthlyTargets.filter(
          (target) =>
            target.goalId !==
            goalId
        ),

      weeklyTargets:
        state.weeklyTargets.filter(
          (target) =>
            !monthlyTargetIds.includes(
              target.monthlyTargetId ??
                -1
            )
        ),

      tasks:
        state.tasks.filter(
          (task) =>
            !weeklyTargetIds.includes(
              task.weeklyTargetId ??
                -1
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

  // ========================================
  // Monthly Target
  // ========================================

  static completeMonthlyTarget(
    state: ExecutionState,
    monthlyTargetId: number
  ): ExecutionResult {
    const completedAt =
      this.now();

    const weeklyTargetIds =
      state.weeklyTargets
        .filter(
          (target) =>
            target.monthlyTargetId ===
            monthlyTargetId
        )
        .map(
          (target) =>
            target.id
        );

    const affectedTaskIds =
      state.tasks
        .filter(
          (task) =>
            weeklyTargetIds.includes(
              task.weeklyTargetId ??
                -1
            )
        )
        .map(
          (task) =>
            task.id
        );

    const taskRelationshipSnapshots =
      this.getNewlyCompletedTaskSnapshots(
        state,
        affectedTaskIds
      );

    return {
      lifeGoals:
        state.lifeGoals,

      monthlyTargets:
        state.monthlyTargets.map(
          (target) =>
            target.id ===
            monthlyTargetId
              ? {
                  ...target,

                  progress:
                    100,

                  completed:
                    true,

                  completedAt,
                }
              : target
        ),

      weeklyTargets:
        state.weeklyTargets.map(
          (target) =>
            weeklyTargetIds.includes(
              target.id
            )
              ? {
                  ...target,

                  progress:
                    100,

                  completed:
                    true,

                  completedAt,
                }
              : target
        ),

      tasks:
        state.tasks.map(
          (task) =>
            weeklyTargetIds.includes(
              task.weeklyTargetId ??
                -1
            )
              ? {
                  ...task,

                  completed:
                    true,

                  completedAt,
                }
              : task
        ),

      executionRecords: [
        this.createExecutionRecord(
          "monthly_completed",

          monthlyTargetId,

          state.monthlyTargets.find(
            (target) =>
              target.id ===
              monthlyTargetId
          )?.title ??
            "Monthly Target",

          0,

          this.createCompletionMetadata(
            taskRelationshipSnapshots
          )
        ),
      ],
    };
  }

  static uncompleteMonthlyTarget(
    state: ExecutionState,
    monthlyTargetId: number
  ): ExecutionResult {
    const weeklyTargetIds =
      state.weeklyTargets
        .filter(
          (target) =>
            target.monthlyTargetId ===
            monthlyTargetId
        )
        .map(
          (target) =>
            target.id
        );

    return {
      lifeGoals:
        state.lifeGoals,

      monthlyTargets:
        state.monthlyTargets.map(
          (target) =>
            target.id ===
            monthlyTargetId
              ? {
                  ...target,

                  progress:
                    0,

                  completed:
                    false,

                  completedAt:
                    undefined,
                }
              : target
        ),

      weeklyTargets:
        state.weeklyTargets.map(
          (target) =>
            weeklyTargetIds.includes(
              target.id
            )
              ? {
                  ...target,

                  progress:
                    0,

                  completed:
                    false,

                  completedAt:
                    undefined,
                }
              : target
        ),

      tasks:
        state.tasks.map(
          (task) =>
            weeklyTargetIds.includes(
              task.weeklyTargetId ??
                -1
            )
              ? {
                  ...task,

                  completed:
                    false,

                  completedAt:
                    undefined,
                }
              : task
        ),

      executionRecords: [
        this.createExecutionRecord(
          "monthly_uncompleted",

          monthlyTargetId,

          state.monthlyTargets.find(
            (target) =>
              target.id ===
              monthlyTargetId
          )?.title ??
            "Monthly Target"
        ),
      ],
    };
  }

  static deleteMonthlyTarget(
    state: ExecutionState,
    monthlyTargetId: number
  ): ExecutionResult {
    const weeklyTargetIds =
      state.weeklyTargets
        .filter(
          (target) =>
            target.monthlyTargetId ===
            monthlyTargetId
        )
        .map(
          (target) =>
            target.id
        );

    return {
      lifeGoals:
        state.lifeGoals,

      monthlyTargets:
        state.monthlyTargets.filter(
          (target) =>
            target.id !==
            monthlyTargetId
        ),

      weeklyTargets:
        state.weeklyTargets.filter(
          (target) =>
            target.monthlyTargetId !==
            monthlyTargetId
        ),

      tasks:
        state.tasks.filter(
          (task) =>
            !weeklyTargetIds.includes(
              task.weeklyTargetId ??
                -1
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

  // ========================================
  // Weekly Target
  // ========================================

  static completeWeeklyTarget(
    state: ExecutionState,
    weeklyTargetId: number
  ): ExecutionResult {
    const completedAt =
      this.now();

    const affectedTaskIds =
      state.tasks
        .filter(
          (task) =>
            task.weeklyTargetId ===
            weeklyTargetId
        )
        .map(
          (task) =>
            task.id
        );

    const taskRelationshipSnapshots =
      this.getNewlyCompletedTaskSnapshots(
        state,
        affectedTaskIds
      );

    return {
      lifeGoals:
        state.lifeGoals,

      monthlyTargets:
        state.monthlyTargets,

      weeklyTargets:
        state.weeklyTargets.map(
          (target) =>
            target.id ===
            weeklyTargetId
              ? {
                  ...target,

                  progress:
                    100,

                  completed:
                    true,

                  completedAt,
                }
              : target
        ),

      tasks:
        state.tasks.map(
          (task) =>
            task.weeklyTargetId ===
            weeklyTargetId
              ? {
                  ...task,

                  completed:
                    true,

                  completedAt,
                }
              : task
        ),

      executionRecords: [
        this.createExecutionRecord(
          "weekly_completed",

          weeklyTargetId,

          state.weeklyTargets.find(
            (target) =>
              target.id ===
              weeklyTargetId
          )?.title ??
            "Weekly Target",

          0,

          this.createCompletionMetadata(
            taskRelationshipSnapshots
          )
        ),
      ],
    };
  }

  static uncompleteWeeklyTarget(
    state: ExecutionState,
    weeklyTargetId: number
  ): ExecutionResult {
    return {
      lifeGoals:
        state.lifeGoals,

      monthlyTargets:
        state.monthlyTargets,

      weeklyTargets:
        state.weeklyTargets.map(
          (target) =>
            target.id ===
            weeklyTargetId
              ? {
                  ...target,

                  progress:
                    0,

                  completed:
                    false,

                  completedAt:
                    undefined,
                }
              : target
        ),

      tasks:
        state.tasks.map(
          (task) =>
            task.weeklyTargetId ===
            weeklyTargetId
              ? {
                  ...task,

                  completed:
                    false,

                  completedAt:
                    undefined,
                }
              : task
        ),

      executionRecords: [
        this.createExecutionRecord(
          "weekly_uncompleted",

          weeklyTargetId,

          state.weeklyTargets.find(
            (target) =>
              target.id ===
              weeklyTargetId
          )?.title ??
            "Weekly Target"
        ),
      ],
    };
  }

  static deleteWeeklyTarget(
    state: ExecutionState,
    weeklyTargetId: number
  ): ExecutionResult {
    return {
      lifeGoals:
        state.lifeGoals,

      monthlyTargets:
        state.monthlyTargets,

      weeklyTargets:
        state.weeklyTargets.filter(
          (target) =>
            target.id !==
            weeklyTargetId
        ),

      tasks:
        state.tasks.filter(
          (task) =>
            task.weeklyTargetId !==
            weeklyTargetId
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

  // ========================================
  // Task
  // ========================================

  static completeTask(
    state: ExecutionState,
    taskId: number
  ): ExecutionResult {
    const completedAt =
      this.now();

    const task =
      state.tasks.find(
        (item) =>
          item.id ===
          taskId
      );

    const taskRelationshipSnapshots =
      task &&
      !task.completed
        ? this.getNewlyCompletedTaskSnapshots(
            state,
            [
              taskId,
            ]
          )
        : [];

    return {
      lifeGoals:
        state.lifeGoals,

      monthlyTargets:
        state.monthlyTargets,

      weeklyTargets:
        state.weeklyTargets,

      tasks:
        state.tasks.map(
          (item) =>
            item.id ===
            taskId
              ? {
                  ...item,

                  completed:
                    true,

                  completedAt,
                }
              : item
        ),

      executionRecords: [
        this.createExecutionRecord(
          "task_completed",

          taskId,

          task?.title ??
            "Task",

          0,

          this.createCompletionMetadata(
            taskRelationshipSnapshots
          )
        ),
      ],
    };
  }

  static uncompleteTask(
    state: ExecutionState,
    taskId: number
  ): ExecutionResult {
    return {
      lifeGoals:
        state.lifeGoals,

      monthlyTargets:
        state.monthlyTargets,

      weeklyTargets:
        state.weeklyTargets,

      tasks:
        state.tasks.map(
          (task) =>
            task.id ===
            taskId
              ? {
                  ...task,

                  completed:
                    false,

                  completedAt:
                    undefined,
                }
              : task
        ),

      executionRecords: [
        this.createExecutionRecord(
          "task_uncompleted",

          taskId,

          state.tasks.find(
            (task) =>
              task.id ===
              taskId
          )?.title ??
            "Task"
        ),
      ],
    };
  }

  static deleteTask(
    state: ExecutionState,
    taskId: number
  ): ExecutionResult {
    return {
      lifeGoals:
        state.lifeGoals,

      monthlyTargets:
        state.monthlyTargets,

      weeklyTargets:
        state.weeklyTargets,

      tasks:
        state.tasks.filter(
          (task) =>
            task.id !==
            taskId
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
}