// ==========================================
// LifeOS Personal Week Ownership Engine
// Version: 1.0
// ==========================================

import type {
  MonthlyTarget,
  WeeklyTarget,
} from "../shared/types";

// ==========================================
// Types
// ==========================================

export interface PersonalWeekOwnershipState {
  monthlyTargets: MonthlyTarget[];

  weeklyTargets: WeeklyTarget[];
}

export type PersonalWeekOwnershipStatus =
  | "available"
  | "invalid_week"
  | "monthly_target_not_found"
  | "not_personal_month"
  | "wrong_owner_month"
  | "duplicate_personal_week";

export interface PersonalWeekOwnershipResult {
  status: PersonalWeekOwnershipStatus;

  allowed: boolean;

  weekStartDate?: string;

  weekEndDate?: string;

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

function parseDateOnly(
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

function getUtcDateValue(
  date: Date
) {
  return Date.UTC(
    date.getFullYear(),
    date.getMonth(),
    date.getDate()
  );
}

// ==========================================
// Week Validation
// ==========================================

function isCanonicalCalendarWeek(
  weekStartDate: string,
  weekEndDate: string
) {
  const start =
    parseDateOnly(
      weekStartDate
    );

  const end =
    parseDateOnly(
      weekEndDate
    );

  if (
    !start ||
    !end
  ) {
    return false;
  }

  // Monday = 1
  if (
    start.getDay() !==
    1
  ) {
    return false;
  }

  // Sunday = 0
  if (
    end.getDay() !==
    0
  ) {
    return false;
  }

  const millisecondsPerDay =
    24 *
    60 *
    60 *
    1000;

  const difference =
    (
      getUtcDateValue(
        end
      ) -
      getUtcDateValue(
        start
      )
    ) /
    millisecondsPerDay;

  return (
    difference ===
    6
  );
}

// ==========================================
// Ownership Helpers
// ==========================================

function getOwnerPeriod(
  weekStartDate: string
) {
  const start =
    parseDateOnly(
      weekStartDate
    );

  if (!start) {
    return undefined;
  }

  return {
    month:
      start.getMonth() +
      1,

    year:
      start.getFullYear(),
  };
}

function findPersonalMonthlyTarget(
  state: PersonalWeekOwnershipState,
  month: number,
  year: number
) {
  return state.monthlyTargets.find(
    (target) =>
      target.goalId ===
        undefined &&
      target.month ===
        month &&
      target.year ===
        year
  );
}

function isPersonalWeeklyTarget(
  state: PersonalWeekOwnershipState,
  weeklyTarget: WeeklyTarget
) {
  if (
    weeklyTarget.monthlyTargetId ===
    undefined
  ) {
    return false;
  }

  const monthlyTarget =
    state.monthlyTargets.find(
      (target) =>
        target.id ===
        weeklyTarget.monthlyTargetId
    );

  return (
    monthlyTarget !==
      undefined &&
    monthlyTarget.goalId ===
      undefined
  );
}

function findExistingPersonalWeek(
  state: PersonalWeekOwnershipState,
  weekStartDate: string,
  weekEndDate: string
) {
  return state.weeklyTargets.find(
    (weeklyTarget) =>
      weeklyTarget.weekStartDate ===
        weekStartDate &&
      weeklyTarget.weekEndDate ===
        weekEndDate &&
      isPersonalWeeklyTarget(
        state,
        weeklyTarget
      )
  );
}

// ==========================================
// Engine
// ==========================================

export class PersonalWeekOwnershipEngine {
  // ========================================
  // Resolve
  // ========================================

  static resolve(
    state: PersonalWeekOwnershipState,
    monthlyTargetId: number,
    weekStartDate: string,
    weekEndDate: string
  ): PersonalWeekOwnershipResult {
    // ======================================
    // Requested Personal Month
    // ======================================

    const requestedMonthlyTarget =
      state.monthlyTargets.find(
        (target) =>
          target.id ===
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
          "The selected Personal Planner month no longer exists.",
      };
    }

    if (
      requestedMonthlyTarget.goalId !==
      undefined
    ) {
      return {
        status:
          "not_personal_month",

        allowed:
          false,

        weekStartDate,

        weekEndDate,

        requestedMonthlyTarget,

        message:
          "This month belongs to a Life Goal and cannot be used by the Personal Planner.",
      };
    }

    // ======================================
    // Canonical Monday-Sunday Week
    // ======================================

    if (
      !isCanonicalCalendarWeek(
        weekStartDate,
        weekEndDate
      )
    ) {
      return {
        status:
          "invalid_week",

        allowed:
          false,

        weekStartDate,

        weekEndDate,

        requestedMonthlyTarget,

        message:
          "Personal Planner weeks must use one real Monday-Sunday calendar week.",
      };
    }

    // ======================================
    // Canonical Owner
    // ======================================

    const ownerPeriod =
      getOwnerPeriod(
        weekStartDate
      );

    if (!ownerPeriod) {
      return {
        status:
          "invalid_week",

        allowed:
          false,

        weekStartDate,

        weekEndDate,

        requestedMonthlyTarget,

        message:
          "LifeOS could not resolve this calendar week.",
      };
    }

    const ownerMonthlyTarget =
      findPersonalMonthlyTarget(
        state,
        ownerPeriod.month,
        ownerPeriod.year
      );

    // ======================================
    // Existing Canonical Personal Week
    // ======================================

    const existingWeeklyTarget =
      findExistingPersonalWeek(
        state,
        weekStartDate,
        weekEndDate
      );

    if (
      existingWeeklyTarget
    ) {
      return {
        status:
          "duplicate_personal_week",

        allowed:
          false,

        weekStartDate,

        weekEndDate,

        requestedMonthlyTarget,

        ownerMonth:
          ownerPeriod.month,

        ownerYear:
          ownerPeriod.year,

        ownerMonthlyTarget,

        existingWeeklyTarget,

        message:
          "This real calendar week already has a Personal Weekly Focus.",
      };
    }

    // ======================================
    // Owner Month Must Exist
    // ======================================

    if (
      !ownerMonthlyTarget
    ) {
      return {
        status:
          "monthly_target_not_found",

        allowed:
          false,

        weekStartDate,

        weekEndDate,

        requestedMonthlyTarget,

        ownerMonth:
          ownerPeriod.month,

        ownerYear:
          ownerPeriod.year,

        message:
          "The Personal Planner month that owns this week has not been planned yet.",
      };
    }

    // ======================================
    // Requested Month Must Own Week
    // ======================================

    if (
      requestedMonthlyTarget.month !==
        ownerPeriod.month ||
      requestedMonthlyTarget.year !==
        ownerPeriod.year
    ) {
      return {
        status:
          "wrong_owner_month",

        allowed:
          false,

        weekStartDate,

        weekEndDate,

        requestedMonthlyTarget,

        ownerMonth:
          ownerPeriod.month,

        ownerYear:
          ownerPeriod.year,

        ownerMonthlyTarget,

        message:
          "This cross-month week is owned by the Personal Planner month containing its Monday.",
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

      requestedMonthlyTarget,

      ownerMonth:
        ownerPeriod.month,

      ownerYear:
        ownerPeriod.year,

      ownerMonthlyTarget,

      message:
        "This Personal Planner week is available for planning.",
    };
  }

  // ========================================
  // Can Create
  // ========================================

  static canCreate(
    state: PersonalWeekOwnershipState,
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
  // Find Existing Week
  // ========================================

  static findExistingWeek(
    state: PersonalWeekOwnershipState,
    weekStartDate: string,
    weekEndDate: string
  ) {
    return findExistingPersonalWeek(
      state,
      weekStartDate,
      weekEndDate
    );
  }
}