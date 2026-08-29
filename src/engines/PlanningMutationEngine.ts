// ==========================================
// LifeOS Planning Mutation Engine
// Version: 2.1
// ==========================================

import {
  PlanningKernel,
} from "./PlanningKernel";

import {
  TaskWeekPlacementEngine,
} from "./TaskWeekPlacementEngine";

import {
  GoalWeekOwnershipEngine,
} from "./GoalWeekOwnershipEngine";

import {
  PersonalWeekOwnershipEngine,
} from "./PersonalWeekOwnershipEngine";

import type {
  PlanningState,
} from "./PlanningKernel";

import type {
  GoalWeeklyFocusValidationResult,
  MonthlyOutcomeCreationResult,
  MonthlyOutcomeUpdateResult,
  PersonalWeeklyFocusValidationResult,
  TaskCreationResult,
  TaskUpdateResult,
  WeeklyFocusUpdateResult,
} from "./planningMutationTypes";

import type {
  CreateTaskInput,
  MonthlyTarget,
  Task,
  UpdateTaskInput,
  WeeklyTarget,
} from "../shared/types";

// ==========================================
// Helpers
// ==========================================

function normalizeOptionalText(
  value:
    | string
    | null
    | undefined
) {
  if (
    value ===
      null ||
    value ===
      undefined
  ) {
    return undefined;
  }

  return (
    value.trim() ||
    undefined
  );
}

function parseDate(
  value?: string
) {
  if (!value) {
    return undefined;
  }

  const dateOnly =
    /^(\d{4})-(\d{2})-(\d{2})$/.exec(
      value
    );

  if (dateOnly) {
    const date =
      new Date(
        Number(
          dateOnly[1]
        ),
        Number(
          dateOnly[2]
        ) - 1,
        Number(
          dateOnly[3]
        )
      );

    if (
      date.getFullYear() !==
        Number(
          dateOnly[1]
        ) ||
      date.getMonth() !==
        Number(
          dateOnly[2]
        ) -
          1 ||
      date.getDate() !==
        Number(
          dateOnly[3]
        )
    ) {
      return undefined;
    }

    return date;
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return undefined;
  }

  return date;
}

function getMonthKey(
  year: number,
  month: number
) {
  return (
    year * 12 +
    (month - 1)
  );
}

function getGoalStartMonthKey(
  startDate: string
) {
  const parsed =
    parseDate(
      startDate
    );

  if (!parsed) {
    return undefined;
  }

  return getMonthKey(
    parsed.getFullYear(),
    parsed.getMonth() + 1
  );
}

function getGoalTargetMonthKey(
  targetDate?: string
) {
  const parsed =
    parseDate(
      targetDate
    );

  if (!parsed) {
    return undefined;
  }

  return getMonthKey(
    parsed.getFullYear(),
    parsed.getMonth() + 1
  );
}

// ==========================================
// Engine
// ==========================================

export class PlanningMutationEngine {
  // ========================================
  // Create Universal Task
  // ========================================

  static createTask(
    state: PlanningState,
    input: CreateTaskInput
  ): TaskCreationResult {
    const trimmedTitle =
      input.title.trim();

    if (!trimmedTitle) {
      return {
        status:
          "invalid_title",

        created:
          false,

        state,

        message:
          "Task title cannot be empty.",
      };
    }

    const task: Task = {
      id:
        Date.now(),

      title:
        trimmedTitle,

      description:
        normalizeOptionalText(
          input.description
        ),

      dueDate:
        input.dueDate,

      priority:
        input.priority ??
        "medium",

      weeklyTargetId:
        input.weeklyTargetId,

      completed:
        false,

      completedAt:
        undefined,

      createdAt:
        new Date().toISOString(),
    };

    const recalculated =
      PlanningKernel.recalculateAll({
        ...state,

        tasks: [
          ...state.tasks,
          task,
        ],
      });

    return {
      status:
        "created",

      created:
        true,

      task,

      state:
        recalculated,

      message:
        "Task created successfully.",
    };
  }

  // ========================================
  // Update Universal Task
  // ========================================

  static updateTask(
    state: PlanningState,
    taskId: number,
    updates: UpdateTaskInput
  ): TaskUpdateResult {
    const existingTask =
      state.tasks.find(
        (task) =>
          task.id ===
          taskId
      );

    if (!existingTask) {
      return {
        status:
          "task_not_found",

        updated:
          false,

        state,

        message:
          "The selected task no longer exists.",
      };
    }

    // ======================================
    // Title
    // ======================================

    let nextTitle =
      existingTask.title;

    if (
      updates.title !==
      undefined
    ) {
      const trimmedTitle =
        updates.title.trim();

      if (!trimmedTitle) {
        return {
          status:
            "invalid_title",

          updated:
            false,

          task:
            existingTask,

          state,

          message:
            "Task title cannot be empty.",
        };
      }

      nextTitle =
        trimmedTitle;
    }

    // ======================================
    // Description
    // ======================================

    let nextDescription =
      existingTask.description;

    if (
      updates.description !==
      undefined
    ) {
      nextDescription =
        normalizeOptionalText(
          updates.description
        );
    }

    // ======================================
    // Due Date
    // ======================================

    let nextDueDate =
      existingTask.dueDate;

    if (
      updates.dueDate !==
      undefined
    ) {
      nextDueDate =
        updates.dueDate ===
        null
          ? undefined
          : updates.dueDate;
    }

    // ======================================
    // Priority
    // ======================================

    const nextPriority =
      updates.priority ??
      existingTask.priority;

    // ======================================
    // Weekly Relationship
    // ======================================

    let nextWeeklyTargetId =
      existingTask.weeklyTargetId;

    if (
      updates.weeklyTargetId !==
      undefined
    ) {
      if (
        updates.weeklyTargetId ===
        null
      ) {
        nextWeeklyTargetId =
          undefined;
      } else {
        const targetExists =
          state.weeklyTargets.some(
            (target) =>
              target.id ===
              updates.weeklyTargetId
          );

        if (!targetExists) {
          return {
            status:
              "weekly_target_not_found",

            updated:
              false,

            task:
              existingTask,

            state,

            message:
              "The selected Weekly Focus no longer exists.",
          };
        }

        nextWeeklyTargetId =
          updates.weeklyTargetId;
      }
    }

    // ======================================
    // Smart Due-Date Rescheduling
    // ======================================

    const dueDateChanged =
      updates.dueDate !==
        undefined &&
      updates.dueDate !==
        null &&
      nextDueDate !==
        existingTask.dueDate;

    const shouldAutoPlace =
      dueDateChanged &&
      existingTask.weeklyTargetId !==
        undefined &&
      updates.weeklyTargetId ===
        undefined;

    if (
      shouldAutoPlace
    ) {
      const existingWeeklyTarget =
        state.weeklyTargets.find(
          (target) =>
            target.id ===
            existingTask.weeklyTargetId
        );

      const existingMonthlyTarget =
        existingWeeklyTarget
          ?.monthlyTargetId !==
        undefined
          ? state.monthlyTargets.find(
              (target) =>
                target.id ===
                existingWeeklyTarget
                  .monthlyTargetId
            )
          : undefined;

      // ====================================
      // Goal-Linked Task
      // ====================================

      if (
        existingMonthlyTarget?.goalId !==
        undefined
      ) {
        const placement =
          TaskWeekPlacementEngine.resolve(
            {
              lifeGoals:
                state.lifeGoals,

              monthlyTargets:
                state.monthlyTargets,

              weeklyTargets:
                state.weeklyTargets,
            },
            {
              scope:
                "goal",

              goalId:
                existingMonthlyTarget.goalId,

              dueDate:
                nextDueDate,
            }
          );

        if (
          placement.status !==
            "matched" ||
          !placement.weeklyTarget
        ) {
          return {
            status:
              "placement_failed",

            updated:
              false,

            task:
              existingTask,

            state,

            message:
              placement.message,
          };
        }

        nextWeeklyTargetId =
          placement.weeklyTarget.id;
      }

      // ====================================
      // Personal Planner Task
      // ====================================

      else if (
        existingMonthlyTarget &&
        existingMonthlyTarget.goalId ===
          undefined
      ) {
        const placement =
          TaskWeekPlacementEngine.resolve(
            {
              lifeGoals:
                state.lifeGoals,

              monthlyTargets:
                state.monthlyTargets,

              weeklyTargets:
                state.weeklyTargets,
            },
            {
              scope:
                "personal",

              dueDate:
                nextDueDate,
            }
          );

        if (
          placement.status !==
            "matched" ||
          !placement.weeklyTarget
        ) {
          return {
            status:
              "placement_failed",

            updated:
              false,

            task:
              existingTask,

            state,

            message:
              placement.message,
          };
        }

        nextWeeklyTargetId =
          placement.weeklyTarget.id;
      }
    }

    // ======================================
    // Build Updated Task
    // ======================================

    const updatedTask: Task = {
      ...existingTask,

      title:
        nextTitle,

      description:
        nextDescription,

      dueDate:
        nextDueDate,

      priority:
        nextPriority,

      weeklyTargetId:
        nextWeeklyTargetId,
    };

    const nextTasks =
      state.tasks.map(
        (task) =>
          task.id ===
          taskId
            ? updatedTask
            : task
      );

    const recalculated =
      PlanningKernel.recalculateAll({
        ...state,

        tasks:
          nextTasks,
      });

    return {
      status:
        "updated",

      updated:
        true,

      task:
        updatedTask,

      state:
        recalculated,

      message:
        nextWeeklyTargetId !==
          existingTask.weeklyTargetId
          ? "Task updated and moved to the correct calendar week."
          : "Task updated successfully.",
    };
  }

  // ========================================
  // Create Monthly Outcome
  // ========================================

  static createMonthlyOutcome(
    state: PlanningState,
    title: string,
    month: number,
    year: number,
    goalId?: number
  ): MonthlyOutcomeCreationResult {
    const trimmedTitle =
      title.trim();

    if (!trimmedTitle) {
      return {
        status:
          "invalid_title",

        created:
          false,

        state,

        message:
          "Monthly Outcome title cannot be empty.",
      };
    }

    if (
      !Number.isInteger(
        month
      ) ||
      month < 1 ||
      month > 12
    ) {
      return {
        status:
          "invalid_month",

        created:
          false,

        state,

        message:
          "Month must be between 1 and 12.",
      };
    }

    if (
      !Number.isInteger(
        year
      ) ||
      year < 1900 ||
      year > 9999
    ) {
      return {
        status:
          "invalid_year",

        created:
          false,

        state,

        message:
          "Year must be between 1900 and 9999.",
      };
    }

    // ======================================
    // Goal Monthly Outcome
    // ======================================

    if (
      goalId !==
      undefined
    ) {
      const goal =
        state.lifeGoals.find(
          (item) =>
            item.id ===
            goalId
        );

      if (!goal) {
        return {
          status:
            "goal_not_found",

          created:
            false,

          state,

          message:
            "The selected Life Goal no longer exists.",
        };
      }

      const duplicate =
        state.monthlyTargets.some(
          (target) =>
            target.goalId ===
              goalId &&
            target.month ===
              month &&
            target.year ===
              year
        );

      if (duplicate) {
        return {
          status:
            "duplicate_goal_month",

          created:
            false,

          state,

          message:
            "This Life Goal already has a Monthly Outcome for that month.",
        };
      }

      const requestedMonthKey =
        getMonthKey(
          year,
          month
        );

      const startMonthKey =
        getGoalStartMonthKey(
          goal.startDate
        );

      const targetMonthKey =
        getGoalTargetMonthKey(
          goal.targetDate
        );

      if (
        startMonthKey !==
          undefined &&
        requestedMonthKey <
          startMonthKey
      ) {
        return {
          status:
            "outside_goal_timeline",

          created:
            false,

          state,

          message:
            "That month is before this Life Goal begins.",
        };
      }

      if (
        targetMonthKey !==
          undefined &&
        requestedMonthKey >
          targetMonthKey
      ) {
        return {
          status:
            "outside_goal_timeline",

          created:
            false,

          state,

          message:
            "That month is after this Life Goal's target timeline.",
        };
      }
    }

    // ======================================
    // Personal Monthly Outcome
    // ======================================

    else {
      const duplicatePersonalMonth =
        state.monthlyTargets.some(
          (target) =>
            target.goalId ===
              undefined &&
            target.month ===
              month &&
            target.year ===
              year
        );

      if (
        duplicatePersonalMonth
      ) {
        return {
          status:
            "duplicate_personal_month",

          created:
            false,

          state,

          message:
            "A Personal Monthly Outcome already exists for that month.",
        };
      }
    }

    const now =
      new Date().toISOString();

    const monthlyTarget: MonthlyTarget = {
      id:
        Date.now(),

      title:
        trimmedTitle,

      month,

      year,

      goalId,

      progress:
        0,

      completed:
        false,

      completedAt:
        undefined,

      createdAt:
        now,
    };

    const recalculated =
      PlanningKernel.recalculateAll({
        ...state,

        monthlyTargets: [
          ...state.monthlyTargets,
          monthlyTarget,
        ],
      });

    return {
      status:
        "created",

      created:
        true,

      monthlyTarget,

      state:
        recalculated,

      message:
        goalId ===
        undefined
          ? "Personal Monthly Outcome created successfully."
          : "Monthly Outcome created successfully.",
    };
  }

  // ========================================
  // Update Monthly Outcome Title
  // ========================================

  static updateMonthlyOutcomeTitle(
    state: PlanningState,
    monthlyTargetId: number,
    title: string
  ): MonthlyOutcomeUpdateResult {
    const existing =
      state.monthlyTargets.find(
        (target) =>
          target.id ===
          monthlyTargetId
      );

    if (!existing) {
      return {
        status:
          "monthly_target_not_found",

        updated:
          false,

        state,

        message:
          "The selected Monthly Outcome no longer exists.",
      };
    }

    const trimmedTitle =
      title.trim();

    if (!trimmedTitle) {
      return {
        status:
          "invalid_title",

        updated:
          false,

        monthlyTarget:
          existing,

        state,

        message:
          "Monthly Outcome title cannot be empty.",
      };
    }

    const updatedTarget: MonthlyTarget = {
      ...existing,

      title:
        trimmedTitle,
    };

    const nextMonthlyTargets =
      state.monthlyTargets.map(
        (target) =>
          target.id ===
          monthlyTargetId
            ? updatedTarget
            : target
      );

    const recalculated =
      PlanningKernel.recalculateAll({
        ...state,

        monthlyTargets:
          nextMonthlyTargets,
      });

    return {
      status:
        "updated",

      updated:
        true,

      monthlyTarget:
        updatedTarget,

      state:
        recalculated,

      message:
        "Monthly Outcome updated successfully.",
    };
  }

  // ========================================
  // Validate Goal Weekly Focus Creation
  // ========================================

  static validateGoalWeeklyFocus(
    state: PlanningState,
    title: string,
    monthlyTargetId: number,
    weekStartDate: string,
    weekEndDate: string
  ): GoalWeeklyFocusValidationResult {
    const trimmedTitle =
      title.trim();

    if (!trimmedTitle) {
      return {
        status:
          "invalid_title",

        allowed:
          false,

        message:
          "Weekly Focus title cannot be empty.",
      };
    }

    const ownership =
      GoalWeekOwnershipEngine.resolve(
        {
          lifeGoals:
            state.lifeGoals,

          monthlyTargets:
            state.monthlyTargets,

          weeklyTargets:
            state.weeklyTargets,
        },
        monthlyTargetId,
        weekStartDate,
        weekEndDate
      );

    if (
      ownership.status !==
      "available"
    ) {
      return {
        status:
          ownership.status,

        allowed:
          false,

        title:
          trimmedTitle,

        message:
          ownership.message,

        ownerMonth:
          ownership.ownerMonth,

        ownerYear:
          ownership.ownerYear,

        ownerMonthlyTargetId:
          ownership
            .ownerMonthlyTarget
            ?.id,

        existingWeeklyTargetId:
          ownership
            .existingWeeklyTarget
            ?.id,
      };
    }

    return {
      status:
        "available",

      allowed:
        true,

      title:
        trimmedTitle,

      message:
        ownership.message,

      ownerMonth:
        ownership.ownerMonth,

      ownerYear:
        ownership.ownerYear,

      ownerMonthlyTargetId:
        ownership
          .ownerMonthlyTarget
          ?.id,
    };
  }

  // ========================================
  // Validate Personal Weekly Focus Creation
  // ========================================

  static validatePersonalWeeklyFocus(
    state: PlanningState,
    title: string,
    monthlyTargetId: number,
    weekStartDate: string,
    weekEndDate: string
  ): PersonalWeeklyFocusValidationResult {
    const trimmedTitle =
      title.trim();

    if (!trimmedTitle) {
      return {
        status:
          "invalid_title",

        allowed:
          false,

        message:
          "Weekly Focus title cannot be empty.",
      };
    }

    const ownership =
      PersonalWeekOwnershipEngine.resolve(
        {
          monthlyTargets:
            state.monthlyTargets,

          weeklyTargets:
            state.weeklyTargets,
        },
        monthlyTargetId,
        weekStartDate,
        weekEndDate
      );

    if (
      ownership.status !==
      "available"
    ) {
      return {
        status:
          ownership.status,

        allowed:
          false,

        title:
          trimmedTitle,

        message:
          ownership.message,

        ownerMonth:
          ownership.ownerMonth,

        ownerYear:
          ownership.ownerYear,

        ownerMonthlyTargetId:
          ownership
            .ownerMonthlyTarget
            ?.id,

        existingWeeklyTargetId:
          ownership
            .existingWeeklyTarget
            ?.id,
      };
    }

    return {
      status:
        "available",

      allowed:
        true,

      title:
        trimmedTitle,

      message:
        ownership.message,

      ownerMonth:
        ownership.ownerMonth,

      ownerYear:
        ownership.ownerYear,

      ownerMonthlyTargetId:
        ownership
          .ownerMonthlyTarget
          ?.id,
    };
  }

  // ========================================
  // Update Weekly Focus Title
  // ========================================

  static updateWeeklyFocusTitle(
    state: PlanningState,
    weeklyTargetId: number,
    title: string
  ): WeeklyFocusUpdateResult {
    const existing =
      state.weeklyTargets.find(
        (target) =>
          target.id ===
          weeklyTargetId
      );

    if (!existing) {
      return {
        status:
          "weekly_target_not_found",

        updated:
          false,

        state,

        message:
          "The selected Weekly Focus no longer exists.",
      };
    }

    const trimmedTitle =
      title.trim();

    if (!trimmedTitle) {
      return {
        status:
          "invalid_title",

        updated:
          false,

        weeklyTarget:
          existing,

        state,

        message:
          "Weekly Focus title cannot be empty.",
      };
    }

    const updatedTarget: WeeklyTarget = {
      ...existing,

      title:
        trimmedTitle,
    };

    const nextWeeklyTargets =
      state.weeklyTargets.map(
        (target) =>
          target.id ===
          weeklyTargetId
            ? updatedTarget
            : target
      );

    const recalculated =
      PlanningKernel.recalculateAll({
        ...state,

        weeklyTargets:
          nextWeeklyTargets,
      });

    return {
      status:
        "updated",

      updated:
        true,

      weeklyTarget:
        updatedTarget,

      state:
        recalculated,

      message:
        "Weekly Focus updated successfully.",
    };
  }
}