// ==========================================
// LifeOS Goal Planning Mutation Engine
// Version: 1.0
// ==========================================

import {
  PlanningIntegrityEngine,
} from "./PlanningIntegrityEngine";

import type {
  PlanningState,
} from "./PlanningKernel";

import type {
  LifeGoal,
} from "../shared/types";

// ==========================================
// Inputs
// ==========================================

export interface CreateLifeGoalInput {
  title: string;

  description?: string;

  startDate?: string;

  targetDate?: string;
}

export interface UpdateLifeGoalInput {
  title?: string;

  description?:
    | string
    | null;

  startDate?: string;

  targetDate?:
    | string
    | null;
}

// ==========================================
// Result Status
// ==========================================

export type LifeGoalCreationStatus =
  | "created"
  | "invalid_title"
  | "invalid_start_date"
  | "invalid_target_date"
  | "invalid_timeline";

export type LifeGoalUpdateStatus =
  | "updated"
  | "goal_not_found"
  | "invalid_title"
  | "invalid_start_date"
  | "invalid_target_date"
  | "invalid_timeline"
  | "monthly_outcome_outside_timeline"
  | "weekly_focus_outside_timeline"
  | "week_ownership_conflict";

// ==========================================
// Results
// ==========================================

export interface LifeGoalCreationResult {
  status: LifeGoalCreationStatus;

  created: boolean;

  goal?: LifeGoal;

  state: PlanningState;

  message: string;
}

export interface LifeGoalUpdateResult {
  status: LifeGoalUpdateStatus;

  updated: boolean;

  goal?: LifeGoal;

  state: PlanningState;

  message: string;
}

// ==========================================
// Date Helpers
// ==========================================

function pad2(
  value: number
) {
  return String(
    value
  ).padStart(
    2,
    "0"
  );
}

function toLocalDateString(
  date: Date
) {
  return `${date.getFullYear()}-${pad2(
    date.getMonth() + 1
  )}-${pad2(
    date.getDate()
  )}`;
}

function parseDateValue(
  value?: string
) {
  if (!value) {
    return undefined;
  }

  // ========================================
  // YYYY-MM-DD
  // ========================================

  const localMatch =
    /^(\d{4})-(\d{2})-(\d{2})$/.exec(
      value
    );

  if (localMatch) {
    const year =
      Number(
        localMatch[1]
      );

    const month =
      Number(
        localMatch[2]
      );

    const day =
      Number(
        localMatch[3]
      );

    const date =
      new Date(
        year,
        month - 1,
        day
      );

    if (
      date.getFullYear() !==
        year ||
      date.getMonth() !==
        month - 1 ||
      date.getDate() !==
        day
    ) {
      return undefined;
    }

    return date;
  }

  // ========================================
  // Legacy ISO Compatibility
  // ========================================
  //
  // Older LifeOS goals currently store
  // startDate using new Date().toISOString().
  //
  // Keep reading that format during migration.
  // New goal mutations normalize dates to
  // YYYY-MM-DD.
  // ========================================

  const parsed =
    new Date(
      value
    );

  if (
    Number.isNaN(
      parsed.getTime()
    )
  ) {
    return undefined;
  }

  return parsed;
}

function normalizeDate(
  value: string
) {
  const parsed =
    parseDateValue(
      value
    );

  if (!parsed) {
    return undefined;
  }

  return toLocalDateString(
    parsed
  );
}

function compareMonth(
  firstMonth: number,
  firstYear: number,
  secondMonth: number,
  secondYear: number
) {
  const first =
    firstYear * 12 +
    firstMonth;

  const second =
    secondYear * 12 +
    secondMonth;

  return (
    first -
    second
  );
}

// ==========================================
// Timeline Validation
// ==========================================

function validateTimeline(
  startDate: string,
  targetDate?: string
) {
  const start =
    parseDateValue(
      startDate
    );

  if (!start) {
    return false;
  }

  if (!targetDate) {
    return true;
  }

  const target =
    parseDateValue(
      targetDate
    );

  if (!target) {
    return false;
  }

  return (
    target.getTime() >=
    start.getTime()
  );
}

// ==========================================
// Existing Monthly Outcome Validation
// ==========================================

function hasMonthlyOutcomeOutsideTimeline(
  state: PlanningState,
  goalId: number,
  startDate: string,
  targetDate?: string
) {
  const start =
    parseDateValue(
      startDate
    );

  if (!start) {
    return true;
  }

  const target =
    targetDate
      ? parseDateValue(
          targetDate
        )
      : undefined;

  const goalMonths =
    state.monthlyTargets.filter(
      (monthlyTarget) =>
        monthlyTarget.goalId ===
        goalId
    );

  for (
    const monthlyTarget
    of goalMonths
  ) {
    const beforeStart =
      compareMonth(
        monthlyTarget.month,
        monthlyTarget.year,
        start.getMonth() + 1,
        start.getFullYear()
      ) <
      0;

    if (beforeStart) {
      return true;
    }

    if (target) {
      const afterTarget =
        compareMonth(
          monthlyTarget.month,
          monthlyTarget.year,
          target.getMonth() + 1,
          target.getFullYear()
        ) >
        0;

      if (afterTarget) {
        return true;
      }
    }
  }

  return false;
}

// ==========================================
// Integrity Regression Helpers
// ==========================================

const TIMELINE_SENSITIVE_ISSUES =
  new Set([
    "week_outside_goal_timeline",
    "wrong_cross_month_owner",
    "owner_month_missing",
  ]);

function getTimelineSensitiveIssueIds(
  state: PlanningState,
  goalId: number
) {
  const report =
    PlanningIntegrityEngine.auditGoal(
      state,
      goalId
    );

  return new Set(
    report.issues
      .filter(
        (issue) =>
          TIMELINE_SENSITIVE_ISSUES.has(
            issue.type
          )
      )
      .map(
        (issue) =>
          issue.id
      )
  );
}

function findNewTimelineIssue(
  previousState: PlanningState,
  nextState: PlanningState,
  goalId: number
) {
  const previousIssueIds =
    getTimelineSensitiveIssueIds(
      previousState,
      goalId
    );

  const nextReport =
    PlanningIntegrityEngine.auditGoal(
      nextState,
      goalId
    );

  return nextReport.issues.find(
    (issue) =>
      TIMELINE_SENSITIVE_ISSUES.has(
        issue.type
      ) &&
      !previousIssueIds.has(
        issue.id
      )
  );
}

// ==========================================
// Engine
// ==========================================

export class GoalPlanningMutationEngine {
  // ========================================
  // Create Life Goal
  // ========================================

  static createGoal(
    state: PlanningState,
    input: CreateLifeGoalInput
  ): LifeGoalCreationResult {
    const title =
      input.title.trim();

    if (!title) {
      return {
        status:
          "invalid_title",

        created:
          false,

        state,

        message:
          "Life Goal title cannot be empty.",
      };
    }

    const rawStartDate =
      input.startDate ??
      toLocalDateString(
        new Date()
      );

    const startDate =
      normalizeDate(
        rawStartDate
      );

    if (!startDate) {
      return {
        status:
          "invalid_start_date",

        created:
          false,

        state,

        message:
          "Life Goal start date is invalid.",
      };
    }

    let targetDate:
      | string
      | undefined;

    if (
      input.targetDate
    ) {
      targetDate =
        normalizeDate(
          input.targetDate
        );

      if (!targetDate) {
        return {
          status:
            "invalid_target_date",

          created:
            false,

          state,

          message:
            "Life Goal target date is invalid.",
        };
      }
    }

    if (
      !validateTimeline(
        startDate,
        targetDate
      )
    ) {
      return {
        status:
          "invalid_timeline",

        created:
          false,

        state,

        message:
          "Life Goal target date cannot be earlier than its start date.",
      };
    }

    const now =
      new Date().toISOString();

    const goal: LifeGoal = {
      id:
        Date.now(),

      title,

      description:
        input.description?.trim() ||
        undefined,

      progress:
        0,

      completed:
        false,

      completedAt:
        undefined,

      startDate,

      targetDate,

      createdAt:
        now,
    };

    return {
      status:
        "created",

      created:
        true,

      goal,

      state: {
        ...state,

        lifeGoals: [
          ...state.lifeGoals,
          goal,
        ],
      },

      message:
        "Life Goal created successfully.",
    };
  }

  // ========================================
  // Update Life Goal
  // ========================================

  static updateGoal(
    state: PlanningState,
    goalId: number,
    updates: UpdateLifeGoalInput
  ): LifeGoalUpdateResult {
    const existingGoal =
      state.lifeGoals.find(
        (goal) =>
          goal.id ===
          goalId
      );

    if (!existingGoal) {
      return {
        status:
          "goal_not_found",

        updated:
          false,

        state,

        message:
          "The selected Life Goal no longer exists.",
      };
    }

    // ======================================
    // Title
    // ======================================

    let title =
      existingGoal.title;

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

          goal:
            existingGoal,

          state,

          message:
            "Life Goal title cannot be empty.",
        };
      }

      title =
        trimmedTitle;
    }

    // ======================================
    // Description
    // ======================================

    let description =
      existingGoal.description;

    if (
      updates.description !==
      undefined
    ) {
      description =
        updates.description ===
        null
          ? undefined
          : updates.description.trim() ||
            undefined;
    }

    // ======================================
    // Start Date
    // ======================================

    let startDate =
      normalizeDate(
        existingGoal.startDate
      );

    if (!startDate) {
      return {
        status:
          "invalid_start_date",

        updated:
          false,

        goal:
          existingGoal,

        state,

        message:
          "The existing Life Goal start date is invalid.",
      };
    }

    if (
      updates.startDate !==
      undefined
    ) {
      const normalizedStart =
        normalizeDate(
          updates.startDate
        );

      if (!normalizedStart) {
        return {
          status:
            "invalid_start_date",

          updated:
            false,

          goal:
            existingGoal,

          state,

          message:
            "Life Goal start date is invalid.",
        };
      }

      startDate =
        normalizedStart;
    }

    // ======================================
    // Target Date
    // ======================================

    let targetDate =
      existingGoal.targetDate
        ? normalizeDate(
            existingGoal.targetDate
          )
        : undefined;

    if (
      existingGoal.targetDate &&
      !targetDate
    ) {
      return {
        status:
          "invalid_target_date",

        updated:
          false,

        goal:
          existingGoal,

        state,

        message:
          "The existing Life Goal target date is invalid.",
      };
    }

    if (
      updates.targetDate !==
      undefined
    ) {
      if (
        updates.targetDate ===
        null
      ) {
        targetDate =
          undefined;
      } else {
        const normalizedTarget =
          normalizeDate(
            updates.targetDate
          );

        if (!normalizedTarget) {
          return {
            status:
              "invalid_target_date",

            updated:
              false,

            goal:
              existingGoal,

            state,

            message:
              "Life Goal target date is invalid.",
          };
        }

        targetDate =
          normalizedTarget;
      }
    }

    // ======================================
    // Timeline Order
    // ======================================

    if (
      !validateTimeline(
        startDate,
        targetDate
      )
    ) {
      return {
        status:
          "invalid_timeline",

        updated:
          false,

        goal:
          existingGoal,

        state,

        message:
          "Life Goal target date cannot be earlier than its start date.",
      };
    }

    // ======================================
    // Existing Monthly Outcomes
    // ======================================

    if (
      hasMonthlyOutcomeOutsideTimeline(
        state,
        existingGoal.id,
        startDate,
        targetDate
      )
    ) {
      return {
        status:
          "monthly_outcome_outside_timeline",

        updated:
          false,

        goal:
          existingGoal,

        state,

        message:
          "This timeline change would place an existing Monthly Outcome outside the Life Goal timeline.",
      };
    }

    // ======================================
    // Candidate Updated Goal
    // ======================================

    const updatedGoal: LifeGoal = {
      ...existingGoal,

      title,

      description,

      startDate,

      targetDate,
    };

    const nextState: PlanningState = {
      ...state,

      lifeGoals:
        state.lifeGoals.map(
          (goal) =>
            goal.id ===
            goalId
              ? updatedGoal
              : goal
        ),
    };

    // ======================================
    // Existing Weekly Focus Safety
    // ======================================
    //
    // Compare integrity before and after.
    //
    // This means an unrelated pre-existing
    // warning does not block harmless title
    // or description edits.
    //
    // Only NEW timeline/ownership problems
    // introduced by this mutation are rejected.
    // ======================================

    const newIssue =
      findNewTimelineIssue(
        state,
        nextState,
        existingGoal.id
      );

    if (
      newIssue
    ) {
      if (
        newIssue.type ===
        "week_outside_goal_timeline"
      ) {
        return {
          status:
            "weekly_focus_outside_timeline",

          updated:
            false,

          goal:
            existingGoal,

          state,

          message:
            "This timeline change would place an existing Weekly Focus outside the Life Goal timeline.",
        };
      }

      return {
        status:
          "week_ownership_conflict",

        updated:
          false,

        goal:
          existingGoal,

        state,

        message:
          newIssue.message,
      };
    }

    return {
      status:
        "updated",

      updated:
        true,

      goal:
        updatedGoal,

      state:
        nextState,

      message:
        "Life Goal updated successfully.",
    };
  }
}