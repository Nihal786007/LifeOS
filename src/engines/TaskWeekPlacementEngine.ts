// ==========================================
// LifeOS Task Week Placement Engine
// Version: 1.0
// ==========================================

import {
  getCalendarWeekForDate,
} from "../calendar/goalWeeks";

import type {
  LifeGoal,
  MonthlyTarget,
  WeeklyTarget,
} from "../shared/types";

// ==========================================
// Types
// ==========================================

export type TaskPlacementScope =
  | "standalone"
  | "goal"
  | "personal";

export interface TaskWeekPlacementState {
  lifeGoals: LifeGoal[];

  monthlyTargets: MonthlyTarget[];

  weeklyTargets: WeeklyTarget[];
}

export interface TaskWeekPlacementInput {
  scope: TaskPlacementScope;

  dueDate?: string;

  /**
   * Required when scope === "goal".
   */
  goalId?: number;
}

export type TaskWeekPlacementStatus =
  | "standalone"
  | "no_due_date"
  | "goal_not_found"
  | "outside_goal_timeline"
  | "monthly_plan_missing"
  | "weekly_focus_missing"
  | "matched";

export interface TaskWeekPlacementResult {
  status: TaskWeekPlacementStatus;

  scope: TaskPlacementScope;

  dueDate?: string;

  weekStartDate?: string;

  weekEndDate?: string;

  weekLabel?: string;

  goal?: LifeGoal;

  monthlyTarget?: MonthlyTarget;

  weeklyTarget?: WeeklyTarget;

  message: string;
}

// ==========================================
// Helpers
// ==========================================

function parseLocalDate(
  value?: string
) {
  if (!value) {
    return undefined;
  }

  const match =
    /^(\d{4})-(\d{2})-(\d{2})$/.exec(
      value
    );

  if (!match) {
    return undefined;
  }

  const year =
    Number(
      match[1]
    );

  const month =
    Number(
      match[2]
    );

  const day =
    Number(
      match[3]
    );

  const date =
    new Date(
      year,
      month - 1,
      day
    );

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return undefined;
  }

  return date;
}

function isDateInsideGoalTimeline(
  dueDate: string,
  goal: LifeGoal
) {
  const due =
    parseLocalDate(
      dueDate
    );

  const start =
    parseLocalDate(
      goal.startDate
    );

  const target =
    parseLocalDate(
      goal.targetDate
    );

  if (
    !due ||
    !start
  ) {
    return true;
  }

  if (
    due.getTime() <
    start.getTime()
  ) {
    return false;
  }

  if (
    target &&
    due.getTime() >
      target.getTime()
  ) {
    return false;
  }

  return true;
}

function getMonthlyTargetForWeeklyTarget(
  state: TaskWeekPlacementState,
  weeklyTarget: WeeklyTarget
) {
  if (
    weeklyTarget.monthlyTargetId ===
    undefined
  ) {
    return undefined;
  }

  return state.monthlyTargets.find(
    (monthlyTarget) =>
      monthlyTarget.id ===
      weeklyTarget.monthlyTargetId
  );
}

// ==========================================
// Engine
// ==========================================

export class TaskWeekPlacementEngine {
  // ========================================
  // Resolve
  // ========================================

  static resolve(
    state: TaskWeekPlacementState,
    input: TaskWeekPlacementInput
  ): TaskWeekPlacementResult {
    // ======================================
    // Standalone
    // ======================================

    if (
      input.scope ===
      "standalone"
    ) {
      return {
        status:
          "standalone",

        scope:
          input.scope,

        dueDate:
          input.dueDate,

        message:
          "Standalone task does not require planner placement.",
      };
    }

    // ======================================
    // Due Date Required For Auto Placement
    // ======================================

    if (
      !input.dueDate
    ) {
      return {
        status:
          "no_due_date",

        scope:
          input.scope,

        message:
          "Choose a due date to place this task into a real calendar week.",
      };
    }

    const calendarWeek =
      getCalendarWeekForDate(
        input.dueDate
      );

    if (
      !calendarWeek
    ) {
      return {
        status:
          "no_due_date",

        scope:
          input.scope,

        dueDate:
          input.dueDate,

        message:
          "LifeOS could not resolve the selected due date.",
      };
    }

    // ======================================
    // Life Goal Placement
    // ======================================

    if (
      input.scope ===
      "goal"
    ) {
      const goal =
        state.lifeGoals.find(
          (candidate) =>
            candidate.id ===
            input.goalId
        );

      if (!goal) {
        return {
          status:
            "goal_not_found",

          scope:
            input.scope,

          dueDate:
            input.dueDate,

          weekStartDate:
            calendarWeek.weekStartDate,

          weekEndDate:
            calendarWeek.weekEndDate,

          weekLabel:
            calendarWeek.displayLabel,

          message:
            "Select a valid Life Goal before placing this task.",
        };
      }

      // ====================================
      // Goal Timeline Boundary
      // ====================================

      if (
        !isDateInsideGoalTimeline(
          input.dueDate,
          goal
        )
      ) {
        return {
          status:
            "outside_goal_timeline",

          scope:
            input.scope,

          dueDate:
            input.dueDate,

          weekStartDate:
            calendarWeek.weekStartDate,

          weekEndDate:
            calendarWeek.weekEndDate,

          weekLabel:
            calendarWeek.displayLabel,

          goal,

          message:
            `This task falls outside the active timeline of "${goal.title}".`,
        };
      }

      // ====================================
      // Find Goal Weekly Focus
      // ====================================

      const goalWeeklyTarget =
        state.weeklyTargets.find(
          (weeklyTarget) => {
            if (
              weeklyTarget.weekStartDate !==
                calendarWeek.weekStartDate ||
              weeklyTarget.weekEndDate !==
                calendarWeek.weekEndDate
            ) {
              return false;
            }

            const monthlyTarget =
              getMonthlyTargetForWeeklyTarget(
                state,
                weeklyTarget
              );

            return (
              monthlyTarget?.goalId ===
              goal.id
            );
          }
        );

      if (
        goalWeeklyTarget
      ) {
        const monthlyTarget =
          getMonthlyTargetForWeeklyTarget(
            state,
            goalWeeklyTarget
          );

        return {
          status:
            "matched",

          scope:
            input.scope,

          dueDate:
            input.dueDate,

          weekStartDate:
            calendarWeek.weekStartDate,

          weekEndDate:
            calendarWeek.weekEndDate,

          weekLabel:
            calendarWeek.displayLabel,

          goal,

          monthlyTarget,

          weeklyTarget:
            goalWeeklyTarget,

          message:
            `Task will be placed in ${calendarWeek.displayLabel}.`,
        };
      }

      // ====================================
      // Determine Whether Month Exists
      // ====================================

      const dueDate =
        parseLocalDate(
          input.dueDate
        );

      const matchingMonthlyTarget =
        dueDate
          ? state.monthlyTargets.find(
              (monthlyTarget) =>
                monthlyTarget.goalId ===
                  goal.id &&
                monthlyTarget.month ===
                  dueDate.getMonth() +
                    1 &&
                monthlyTarget.year ===
                  dueDate.getFullYear()
            )
          : undefined;

      if (
        !matchingMonthlyTarget
      ) {
        return {
          status:
            "monthly_plan_missing",

          scope:
            input.scope,

          dueDate:
            input.dueDate,

          weekStartDate:
            calendarWeek.weekStartDate,

          weekEndDate:
            calendarWeek.weekEndDate,

          weekLabel:
            calendarWeek.displayLabel,

          goal,

          message:
            `No monthly outcome is planned for "${goal.title}" on this date.`,
        };
      }

      return {
        status:
          "weekly_focus_missing",

        scope:
          input.scope,

        dueDate:
          input.dueDate,

        weekStartDate:
          calendarWeek.weekStartDate,

        weekEndDate:
          calendarWeek.weekEndDate,

        weekLabel:
          calendarWeek.displayLabel,

        goal,

        monthlyTarget:
          matchingMonthlyTarget,

        message:
          `No weekly focus exists for ${calendarWeek.displayLabel}.`,
      };
    }

    // ======================================
    // Personal Planner Placement
    // ======================================

    const personalWeeklyTarget =
      state.weeklyTargets.find(
        (weeklyTarget) => {
          if (
            weeklyTarget.weekStartDate !==
              calendarWeek.weekStartDate ||
            weeklyTarget.weekEndDate !==
              calendarWeek.weekEndDate
          ) {
            return false;
          }

          const monthlyTarget =
            getMonthlyTargetForWeeklyTarget(
              state,
              weeklyTarget
            );

          return (
            monthlyTarget !==
              undefined &&
            monthlyTarget.goalId ===
              undefined
          );
        }
      );

    if (
      personalWeeklyTarget
    ) {
      const monthlyTarget =
        getMonthlyTargetForWeeklyTarget(
          state,
          personalWeeklyTarget
        );

      return {
        status:
          "matched",

        scope:
          input.scope,

        dueDate:
          input.dueDate,

        weekStartDate:
          calendarWeek.weekStartDate,

        weekEndDate:
          calendarWeek.weekEndDate,

        weekLabel:
          calendarWeek.displayLabel,

        monthlyTarget,

        weeklyTarget:
          personalWeeklyTarget,

        message:
          `Task will be placed in ${calendarWeek.displayLabel}.`,
      };
    }

    const dueDate =
      parseLocalDate(
        input.dueDate
      );

    const personalMonth =
      dueDate
        ? state.monthlyTargets.find(
            (monthlyTarget) =>
              monthlyTarget.goalId ===
                undefined &&
              monthlyTarget.month ===
                dueDate.getMonth() +
                  1 &&
              monthlyTarget.year ===
                dueDate.getFullYear()
          )
        : undefined;

    if (
      !personalMonth
    ) {
      return {
        status:
          "monthly_plan_missing",

        scope:
          input.scope,

        dueDate:
          input.dueDate,

        weekStartDate:
          calendarWeek.weekStartDate,

        weekEndDate:
          calendarWeek.weekEndDate,

        weekLabel:
          calendarWeek.displayLabel,

        message:
          "No Personal Planner month exists for this date.",
      };
    }

    return {
      status:
        "weekly_focus_missing",

      scope:
        input.scope,

      dueDate:
        input.dueDate,

      weekStartDate:
        calendarWeek.weekStartDate,

      weekEndDate:
        calendarWeek.weekEndDate,

      weekLabel:
        calendarWeek.displayLabel,

      monthlyTarget:
        personalMonth,

      message:
        `No Personal Planner weekly focus exists for ${calendarWeek.displayLabel}.`,
    };
  }

  // ========================================
  // Convenience
  // ========================================

  static getWeeklyTargetId(
    state: TaskWeekPlacementState,
    input: TaskWeekPlacementInput
  ) {
    const result =
      this.resolve(
        state,
        input
      );

    return result.status ===
      "matched"
      ? result.weeklyTarget
          ?.id
      : undefined;
  }
}