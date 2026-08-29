// ==========================================
// LifeOS Goal Week Ownership Engine
// Version: 1.0
// ==========================================

import type {
  LifeGoal,
  MonthlyTarget,
  WeeklyTarget,
} from "../shared/types";

// ==========================================
// Types
// ==========================================

export interface GoalWeekOwnershipState {
  lifeGoals: LifeGoal[];

  monthlyTargets: MonthlyTarget[];

  weeklyTargets: WeeklyTarget[];
}

export type GoalWeekOwnershipStatus =
  | "available"
  | "invalid_week"
  | "monthly_target_not_found"
  | "goal_not_found"
  | "outside_goal_timeline"
  | "wrong_owner_month"
  | "duplicate_goal_week";

export interface GoalWeekOwnershipResult {
  status: GoalWeekOwnershipStatus;

  allowed: boolean;

  weekStartDate?: string;

  weekEndDate?: string;

  goal?: LifeGoal;

  requestedMonthlyTarget?: MonthlyTarget;

  ownerMonth?: number;

  ownerYear?: number;

  ownerMonthlyTarget?: MonthlyTarget;

  existingWeeklyTarget?: WeeklyTarget;

  message: string;
}

// ==========================================
// Date Helpers
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

  // Prevent impossible values such as
  // 2026-02-31 from silently rolling forward.
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

function startOfDay(
  date: Date
) {
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate()
  );
}

function addDays(
  date: Date,
  days: number
) {
  const next =
    new Date(
      date
    );

  next.setDate(
    next.getDate() +
      days
  );

  return startOfDay(
    next
  );
}

function isMonday(
  date: Date
) {
  return (
    date.getDay() ===
    1
  );
}

function isSunday(
  date: Date
) {
  return (
    date.getDay() ===
    0
  );
}

function isCanonicalCalendarWeek(
  start: Date,
  end: Date
) {
  if (
    !isMonday(
      start
    ) ||
    !isSunday(
      end
    )
  ) {
    return false;
  }

  const expectedEnd =
    addDays(
      start,
      6
    );

  return (
    expectedEnd.getTime() ===
    end.getTime()
  );
}

function rangesOverlap(
  firstStart: Date,
  firstEnd: Date,
  secondStart: Date,
  secondEnd: Date
) {
  return (
    firstStart.getTime() <=
      secondEnd.getTime() &&
    firstEnd.getTime() >=
      secondStart.getTime()
  );
}

// ==========================================
// Goal Active Range
// ==========================================

function getGoalStart(
  goal: LifeGoal
) {
  return parseLocalDate(
    goal.startDate
  );
}

function getGoalEnd(
  goal: LifeGoal
) {
  return parseLocalDate(
    goal.targetDate
  );
}

function getFirstActiveDayInsideWeek(
  goal: LifeGoal,
  weekStart: Date,
  weekEnd: Date
) {
  const goalStart =
    getGoalStart(
      goal
    );

  if (!goalStart) {
    return weekStart;
  }

  const goalEnd =
    getGoalEnd(
      goal
    );

  const effectiveGoalEnd =
    goalEnd ??
    weekEnd;

  if (
    !rangesOverlap(
      weekStart,
      weekEnd,
      goalStart,
      effectiveGoalEnd
    )
  ) {
    return undefined;
  }

  if (
    goalStart.getTime() >
    weekStart.getTime()
  ) {
    return startOfDay(
      goalStart
    );
  }

  return startOfDay(
    weekStart
  );
}

// ==========================================
// Relationship Helpers
// ==========================================

function getMonthlyTarget(
  state: GoalWeekOwnershipState,
  monthlyTargetId: number
) {
  return state.monthlyTargets.find(
    (target) =>
      target.id ===
      monthlyTargetId
  );
}

function getGoalForMonthlyTarget(
  state: GoalWeekOwnershipState,
  monthlyTarget: MonthlyTarget
) {
  if (
    monthlyTarget.goalId ===
    undefined
  ) {
    return undefined;
  }

  return state.lifeGoals.find(
    (goal) =>
      goal.id ===
      monthlyTarget.goalId
  );
}

function findOwnerMonthlyTarget(
  state: GoalWeekOwnershipState,
  goalId: number,
  ownerMonth: number,
  ownerYear: number
) {
  return state.monthlyTargets.find(
    (target) =>
      target.goalId ===
        goalId &&
      target.month ===
        ownerMonth &&
      target.year ===
        ownerYear
  );
}

function findExistingGoalWeek(
  state: GoalWeekOwnershipState,
  goalId: number,
  weekStartDate: string,
  weekEndDate: string
) {
  return state.weeklyTargets.find(
    (weeklyTarget) => {
      if (
        weeklyTarget.weekStartDate !==
          weekStartDate ||
        weeklyTarget.weekEndDate !==
          weekEndDate
      ) {
        return false;
      }

      if (
        weeklyTarget.monthlyTargetId ===
        undefined
      ) {
        return false;
      }

      const monthlyTarget =
        state.monthlyTargets.find(
          (candidate) =>
            candidate.id ===
            weeklyTarget.monthlyTargetId
        );

      return (
        monthlyTarget?.goalId ===
        goalId
      );
    }
  );
}

// ==========================================
// Engine
// ==========================================

export class GoalWeekOwnershipEngine {
  // ========================================
  // Resolve Ownership
  // ========================================

  static resolve(
    state: GoalWeekOwnershipState,
    monthlyTargetId: number,
    weekStartDate: string,
    weekEndDate: string
  ): GoalWeekOwnershipResult {
    const weekStart =
      parseLocalDate(
        weekStartDate
      );

    const weekEnd =
      parseLocalDate(
        weekEndDate
      );

    // ======================================
    // Validate Canonical Real Week
    // ======================================

    if (
      !weekStart ||
      !weekEnd ||
      !isCanonicalCalendarWeek(
        weekStart,
        weekEnd
      )
    ) {
      return {
        status:
          "invalid_week",

        allowed:
          false,

        weekStartDate,

        weekEndDate,

        message:
          "Weekly Focus must use one real Monday-to-Sunday calendar week.",
      };
    }

    // ======================================
    // Requested Monthly Target
    // ======================================

    const requestedMonthlyTarget =
      getMonthlyTarget(
        state,
        monthlyTargetId
      );

    if (
      !requestedMonthlyTarget
    ) {
      return {
        status:
          "monthly_target_not_found",

        allowed:
          false,

        weekStartDate,

        weekEndDate,

        message:
          "The selected monthly outcome no longer exists.",
      };
    }

    // ======================================
    // Goal
    // ======================================

    const goal =
      getGoalForMonthlyTarget(
        state,
        requestedMonthlyTarget
      );

    if (!goal) {
      return {
        status:
          "goal_not_found",

        allowed:
          false,

        weekStartDate,

        weekEndDate,

        requestedMonthlyTarget,

        message:
          "This monthly outcome is not attached to a valid Life Goal.",
      };
    }

    // ======================================
    // Active Goal Ownership Day
    // ======================================

    const firstActiveDay =
      getFirstActiveDayInsideWeek(
        goal,
        weekStart,
        weekEnd
      );

    if (
      !firstActiveDay
    ) {
      return {
        status:
          "outside_goal_timeline",

        allowed:
          false,

        weekStartDate,

        weekEndDate,

        goal,

        requestedMonthlyTarget,

        message:
          "This calendar week falls outside the active Life Goal timeline.",
      };
    }

    const ownerMonth =
      firstActiveDay.getMonth() +
      1;

    const ownerYear =
      firstActiveDay.getFullYear();

    const ownerMonthlyTarget =
      findOwnerMonthlyTarget(
        state,
        goal.id,
        ownerMonth,
        ownerYear
      );

    // ======================================
    // Existing Same Goal + Same Real Week
    // ======================================

    const existingWeeklyTarget =
      findExistingGoalWeek(
        state,
        goal.id,
        weekStartDate,
        weekEndDate
      );

    if (
      existingWeeklyTarget
    ) {
      return {
        status:
          "duplicate_goal_week",

        allowed:
          false,

        weekStartDate,

        weekEndDate,

        goal,

        requestedMonthlyTarget,

        ownerMonth,

        ownerYear,

        ownerMonthlyTarget,

        existingWeeklyTarget,

        message:
          `This Life Goal already has a Weekly Focus for ${weekStartDate} → ${weekEndDate}.`,
      };
    }

    // ======================================
    // Month Ownership
    // ======================================

    const requestedOwnsWeek =
      requestedMonthlyTarget.month ===
        ownerMonth &&
      requestedMonthlyTarget.year ===
        ownerYear;

    if (
      !requestedOwnsWeek
    ) {
      return {
        status:
          "wrong_owner_month",

        allowed:
          false,

        weekStartDate,

        weekEndDate,

        goal,

        requestedMonthlyTarget,

        ownerMonth,

        ownerYear,

        ownerMonthlyTarget,

        message:
          ownerMonthlyTarget
            ? `This real week belongs to "${ownerMonthlyTarget.title}".`
            : `This real week belongs to ${ownerMonth}/${ownerYear}, but that monthly outcome has not been planned yet.`,
      };
    }

    // ======================================
    // Available
    // ======================================

    return {
      status:
        "available",

      allowed:
        true,

      weekStartDate,

      weekEndDate,

      goal,

      requestedMonthlyTarget,

      ownerMonth,

      ownerYear,

      ownerMonthlyTarget:
        requestedMonthlyTarget,

      message:
        "This real calendar week is available for this monthly outcome.",
    };
  }

  // ========================================
  // Convenience
  // ========================================

  static canCreate(
    state: GoalWeekOwnershipState,
    monthlyTargetId: number,
    weekStartDate: string,
    weekEndDate: string
  ) {
    return this.resolve(
      state,
      monthlyTargetId,
      weekStartDate,
      weekEndDate
    ).allowed;
  }

  // ========================================
  // Existing Goal Week Lookup
  // ========================================

  static findExistingWeek(
    state: GoalWeekOwnershipState,
    goalId: number,
    weekStartDate: string,
    weekEndDate: string
  ) {
    return findExistingGoalWeek(
      state,
      goalId,
      weekStartDate,
      weekEndDate
    );
  }
}