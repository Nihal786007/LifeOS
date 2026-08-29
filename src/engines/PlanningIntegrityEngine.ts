// ==========================================
// LifeOS Planning Integrity Engine
// Version: 1.0
// ==========================================

import type {
  LifeGoal,
  MonthlyTarget,
  Task,
  WeeklyTarget,
} from "../shared/types";

// ==========================================
// State
// ==========================================

export interface PlanningIntegrityState {
  lifeGoals: LifeGoal[];

  monthlyTargets: MonthlyTarget[];

  weeklyTargets: WeeklyTarget[];

  tasks: Task[];
}

// ==========================================
// Issue Types
// ==========================================

export type PlanningIntegritySeverity =
  | "error"
  | "warning";

export type PlanningIntegrityIssueType =
  | "duplicate_goal_month"
  | "orphan_monthly_target"
  | "orphan_weekly_target"
  | "orphan_task"
  | "invalid_calendar_week"
  | "duplicate_goal_week"
  | "week_outside_goal_timeline"
  | "wrong_cross_month_owner"
  | "owner_month_missing";

export interface PlanningIntegrityIssue {
  id: string;

  type: PlanningIntegrityIssueType;

  severity: PlanningIntegritySeverity;

  message: string;

  goalId?: number;

  monthlyTargetId?: number;

  weeklyTargetId?: number;

  taskId?: number;

  weekStartDate?: string;

  weekEndDate?: string;
}

// ==========================================
// Report
// ==========================================

export interface PlanningIntegrityReport {
  healthy: boolean;

  errorCount: number;

  warningCount: number;

  issues: PlanningIntegrityIssue[];
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

  // Prevent invalid dates such as 2026-02-31
  // from silently becoming a different date.
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
// Calendar Week Validation
// ==========================================

function isCanonicalCalendarWeek(
  weekStartDate?: string,
  weekEndDate?: string
) {
  const start =
    parseLocalDate(
      weekStartDate
    );

  const end =
    parseLocalDate(
      weekEndDate
    );

  if (
    !start ||
    !end
  ) {
    return false;
  }

  // Monday
  if (
    start.getDay() !==
    1
  ) {
    return false;
  }

  // Sunday
  if (
    end.getDay() !==
    0
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

// ==========================================
// Relationship Helpers
// ==========================================

function getGoal(
  state: PlanningIntegrityState,
  goalId: number
) {
  return state.lifeGoals.find(
    (goal) =>
      goal.id ===
      goalId
  );
}

function getMonthlyTarget(
  state: PlanningIntegrityState,
  monthlyTargetId: number
) {
  return state.monthlyTargets.find(
    (target) =>
      target.id ===
      monthlyTargetId
  );
}

function getWeeklyTarget(
  state: PlanningIntegrityState,
  weeklyTargetId: number
) {
  return state.weeklyTargets.find(
    (target) =>
      target.id ===
      weeklyTargetId
  );
}

// ==========================================
// Goal Week Ownership
// ==========================================

function getFirstActiveDayInsideWeek(
  goal: LifeGoal,
  weekStartDate: string,
  weekEndDate: string
) {
  const weekStart =
    parseLocalDate(
      weekStartDate
    );

  const weekEnd =
    parseLocalDate(
      weekEndDate
    );

  const goalStart =
    parseLocalDate(
      goal.startDate
    );

  const goalEnd =
    parseLocalDate(
      goal.targetDate
    );

  if (
    !weekStart ||
    !weekEnd ||
    !goalStart
  ) {
    return undefined;
  }

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
// Issue Builder
// ==========================================

function createIssue(
  type: PlanningIntegrityIssueType,
  severity: PlanningIntegritySeverity,
  message: string,
  metadata: Omit<
    PlanningIntegrityIssue,
    | "id"
    | "type"
    | "severity"
    | "message"
  > = {}
): PlanningIntegrityIssue {
  const identityParts = [
    type,

    metadata.goalId ??
      "",

    metadata.monthlyTargetId ??
      "",

    metadata.weeklyTargetId ??
      "",

    metadata.taskId ??
      "",

    metadata.weekStartDate ??
      "",

    metadata.weekEndDate ??
      "",
  ];

  return {
    id:
      identityParts.join(
        ":"
      ),

    type,

    severity,

    message,

    ...metadata,
  };
}

// ==========================================
// Engine
// ==========================================

export class PlanningIntegrityEngine {
  // ========================================
  // Audit
  // ========================================

  static audit(
    state: PlanningIntegrityState
  ): PlanningIntegrityReport {
    const issues:
      PlanningIntegrityIssue[] = [];

    // ======================================
    // 1. Orphan Monthly Targets
    // ======================================

    for (
      const monthlyTarget
      of state.monthlyTargets
    ) {
      if (
        monthlyTarget.goalId ===
        undefined
      ) {
        continue;
      }

      const goal =
        getGoal(
          state,
          monthlyTarget.goalId
        );

      if (!goal) {
        issues.push(
          createIssue(
            "orphan_monthly_target",
            "error",
            `Monthly outcome "${monthlyTarget.title}" points to a Life Goal that no longer exists.`,
            {
              goalId:
                monthlyTarget.goalId,

              monthlyTargetId:
                monthlyTarget.id,
            }
          )
        );
      }
    }

    // ======================================
    // 2. Duplicate Goal Months
    // ======================================

    const monthlyGroups =
      new Map<
        string,
        MonthlyTarget[]
      >();

    for (
      const monthlyTarget
      of state.monthlyTargets
    ) {
      if (
        monthlyTarget.goalId ===
        undefined
      ) {
        continue;
      }

      const key =
        `${monthlyTarget.goalId}:${monthlyTarget.year}:${monthlyTarget.month}`;

      const group =
        monthlyGroups.get(
          key
        ) ?? [];

      group.push(
        monthlyTarget
      );

      monthlyGroups.set(
        key,
        group
      );
    }

    for (
      const group
      of monthlyGroups.values()
    ) {
      if (
        group.length <=
        1
      ) {
        continue;
      }

      const first =
        group[0];

      issues.push(
        createIssue(
          "duplicate_goal_month",
          "error",
          `This Life Goal has ${group.length} monthly outcomes for ${first.month}/${first.year}. Only one monthly outcome is allowed per goal per month.`,
          {
            goalId:
              first.goalId,

            monthlyTargetId:
              first.id,
          }
        )
      );
    }

    // ======================================
    // 3. Orphan Weekly Targets
    // ======================================

    for (
      const weeklyTarget
      of state.weeklyTargets
    ) {
      if (
        weeklyTarget.monthlyTargetId ===
        undefined
      ) {
        continue;
      }

      const monthlyTarget =
        getMonthlyTarget(
          state,
          weeklyTarget.monthlyTargetId
        );

      if (!monthlyTarget) {
        issues.push(
          createIssue(
            "orphan_weekly_target",
            "error",
            `Weekly Focus "${weeklyTarget.title}" points to a monthly outcome that no longer exists.`,
            {
              monthlyTargetId:
                weeklyTarget.monthlyTargetId,

              weeklyTargetId:
                weeklyTarget.id,

              weekStartDate:
                weeklyTarget.weekStartDate,

              weekEndDate:
                weeklyTarget.weekEndDate,
            }
          )
        );
      }
    }

    // ======================================
    // 4. Invalid Real Calendar Weeks
    // ======================================
    //
    // Legacy weekly targets without real dates
    // are ignored during migration.
    //
    // If one real-date field exists, both must
    // form a valid Monday-Sunday week.
    // ======================================

    for (
      const weeklyTarget
      of state.weeklyTargets
    ) {
      const hasAnyRealDate =
        Boolean(
          weeklyTarget.weekStartDate
        ) ||
        Boolean(
          weeklyTarget.weekEndDate
        );

      if (!hasAnyRealDate) {
        continue;
      }

      if (
        !isCanonicalCalendarWeek(
          weeklyTarget.weekStartDate,
          weeklyTarget.weekEndDate
        )
      ) {
        issues.push(
          createIssue(
            "invalid_calendar_week",
            "error",
            `Weekly Focus "${weeklyTarget.title}" does not use one canonical Monday-to-Sunday calendar week.`,
            {
              weeklyTargetId:
                weeklyTarget.id,

              monthlyTargetId:
                weeklyTarget.monthlyTargetId,

              weekStartDate:
                weeklyTarget.weekStartDate,

              weekEndDate:
                weeklyTarget.weekEndDate,
            }
          )
        );
      }
    }

    // ======================================
    // 5. Duplicate Goal Real Weeks
    // ======================================

    const goalWeekGroups =
      new Map<
        string,
        WeeklyTarget[]
      >();

    for (
      const weeklyTarget
      of state.weeklyTargets
    ) {
      if (
        !weeklyTarget.weekStartDate ||
        !weeklyTarget.weekEndDate ||
        weeklyTarget.monthlyTargetId ===
          undefined
      ) {
        continue;
      }

      const monthlyTarget =
        getMonthlyTarget(
          state,
          weeklyTarget.monthlyTargetId
        );

      if (
        !monthlyTarget ||
        monthlyTarget.goalId ===
          undefined
      ) {
        continue;
      }

      const key =
        `${monthlyTarget.goalId}:${weeklyTarget.weekStartDate}:${weeklyTarget.weekEndDate}`;

      const group =
        goalWeekGroups.get(
          key
        ) ?? [];

      group.push(
        weeklyTarget
      );

      goalWeekGroups.set(
        key,
        group
      );
    }

    for (
      const group
      of goalWeekGroups.values()
    ) {
      if (
        group.length <=
        1
      ) {
        continue;
      }

      const first =
        group[0];

      const monthlyTarget =
        first.monthlyTargetId !==
        undefined
          ? getMonthlyTarget(
              state,
              first.monthlyTargetId
            )
          : undefined;

      issues.push(
        createIssue(
          "duplicate_goal_week",
          "error",
          `This Life Goal has ${group.length} Weekly Focuses for the same real calendar week ${first.weekStartDate} -> ${first.weekEndDate}.`,
          {
            goalId:
              monthlyTarget
                ?.goalId,

            monthlyTargetId:
              first.monthlyTargetId,

            weeklyTargetId:
              first.id,

            weekStartDate:
              first.weekStartDate,

            weekEndDate:
              first.weekEndDate,
          }
        )
      );
    }

    // ======================================
    // 6. Goal Week Timeline + Ownership
    // ======================================

    for (
      const weeklyTarget
      of state.weeklyTargets
    ) {
      if (
        !weeklyTarget.weekStartDate ||
        !weeklyTarget.weekEndDate ||
        weeklyTarget.monthlyTargetId ===
          undefined
      ) {
        continue;
      }

      if (
        !isCanonicalCalendarWeek(
          weeklyTarget.weekStartDate,
          weeklyTarget.weekEndDate
        )
      ) {
        continue;
      }

      const monthlyTarget =
        getMonthlyTarget(
          state,
          weeklyTarget.monthlyTargetId
        );

      if (
        !monthlyTarget ||
        monthlyTarget.goalId ===
          undefined
      ) {
        continue;
      }

      const goal =
        getGoal(
          state,
          monthlyTarget.goalId
        );

      if (!goal) {
        continue;
      }

      const firstActiveDay =
        getFirstActiveDayInsideWeek(
          goal,
          weeklyTarget.weekStartDate,
          weeklyTarget.weekEndDate
        );

      // ====================================
      // Week Outside Goal Timeline
      // ====================================

      if (
        !firstActiveDay
      ) {
        issues.push(
          createIssue(
            "week_outside_goal_timeline",
            "error",
            `Weekly Focus "${weeklyTarget.title}" falls outside the active timeline of "${goal.title}".`,
            {
              goalId:
                goal.id,

              monthlyTargetId:
                monthlyTarget.id,

              weeklyTargetId:
                weeklyTarget.id,

              weekStartDate:
                weeklyTarget.weekStartDate,

              weekEndDate:
                weeklyTarget.weekEndDate,
            }
          )
        );

        continue;
      }

      // ====================================
      // Determine Canonical Owner Month
      // ====================================

      const ownerMonth =
        firstActiveDay.getMonth() +
        1;

      const ownerYear =
        firstActiveDay.getFullYear();

      const correctOwnerMonth =
        state.monthlyTargets.find(
          (candidate) =>
            candidate.goalId ===
              goal.id &&
            candidate.month ===
              ownerMonth &&
            candidate.year ===
              ownerYear
        );

      // ====================================
      // Owner Month Missing
      // ====================================

      if (
        !correctOwnerMonth
      ) {
        issues.push(
          createIssue(
            "owner_month_missing",
            "warning",
            `Weekly Focus "${weeklyTarget.title}" belongs to ${ownerMonth}/${ownerYear}, but that monthly outcome has not been planned for "${goal.title}".`,
            {
              goalId:
                goal.id,

              monthlyTargetId:
                monthlyTarget.id,

              weeklyTargetId:
                weeklyTarget.id,

              weekStartDate:
                weeklyTarget.weekStartDate,

              weekEndDate:
                weeklyTarget.weekEndDate,
            }
          )
        );

        continue;
      }

      // ====================================
      // Wrong Cross-Month Owner
      // ====================================

      if (
        correctOwnerMonth.id !==
        monthlyTarget.id
      ) {
        issues.push(
          createIssue(
            "wrong_cross_month_owner",
            "error",
            `Weekly Focus "${weeklyTarget.title}" is stored under "${monthlyTarget.title}", but this real week belongs to "${correctOwnerMonth.title}".`,
            {
              goalId:
                goal.id,

              monthlyTargetId:
                monthlyTarget.id,

              weeklyTargetId:
                weeklyTarget.id,

              weekStartDate:
                weeklyTarget.weekStartDate,

              weekEndDate:
                weeklyTarget.weekEndDate,
            }
          )
        );
      }
    }

    // ======================================
    // 7. Orphan Tasks
    // ======================================

    for (
      const task
      of state.tasks
    ) {
      if (
        task.weeklyTargetId ===
        undefined
      ) {
        continue;
      }

      const weeklyTarget =
        getWeeklyTarget(
          state,
          task.weeklyTargetId
        );

      if (!weeklyTarget) {
        issues.push(
          createIssue(
            "orphan_task",
            "error",
            `Task "${task.title}" points to a Weekly Focus that no longer exists.`,
            {
              taskId:
                task.id,

              weeklyTargetId:
                task.weeklyTargetId,
            }
          )
        );
      }
    }

    // ======================================
    // Report
    // ======================================

    const errorCount =
      issues.filter(
        (issue) =>
          issue.severity ===
          "error"
      ).length;

    const warningCount =
      issues.filter(
        (issue) =>
          issue.severity ===
          "warning"
      ).length;

    return {
      healthy:
        errorCount ===
        0,

      errorCount,

      warningCount,

      issues,
    };
  }

  // ========================================
  // Goal-Specific Audit
  // ========================================

  static auditGoal(
    state: PlanningIntegrityState,
    goalId: number
  ): PlanningIntegrityReport {
    const report =
      this.audit(
        state
      );

    const goalIssues =
      report.issues.filter(
        (issue) =>
          issue.goalId ===
            goalId
      );

    const errorCount =
      goalIssues.filter(
        (issue) =>
          issue.severity ===
          "error"
      ).length;

    const warningCount =
      goalIssues.filter(
        (issue) =>
          issue.severity ===
          "warning"
      ).length;

    return {
      healthy:
        errorCount ===
        0,

      errorCount,

      warningCount,

      issues:
        goalIssues,
    };
  }

  // ========================================
  // Convenience
  // ========================================

  static isHealthy(
    state: PlanningIntegrityState
  ) {
    return this.audit(
      state
    ).healthy;
  }
}