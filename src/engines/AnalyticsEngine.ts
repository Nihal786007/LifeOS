// ==========================================
// LifeOS Analytics Engine
// Version: 1.9
// ==========================================
//
// Canonical read/computation engine for
// LifeOS productivity analytics.
//
// Responsibilities:
// - Analyze current task state
// - Analyze execution history
// - Produce overall analytics
// - Produce daily analytics
// - Produce calendar-week analytics
// - Produce calendar-month analytics
// - Produce calendar-year analytics
// - Produce real daily completion trends
// - Produce real monthly calendar-week trends
// - Produce real yearly month trends
// - Derive XP for exact periods
// - Analyze where completed effort was directed
// - Analyze execution quality by task priority
// - Explain XP earned from execution history
// - Derive personal execution records
// - Compare equivalent elapsed periods
// - Preserve historical effort classification
//
// IMPORTANT:
// - Pure computation only
// - No React
// - No localStorage
// - No context ownership
// - Calendar weeks are Monday -> Sunday
// - YYYY-MM-DD task dates are interpreted locally
// - Relationship classification is delegated to
//   TaskRelationshipEngine
// - Historical xpAwarded is the canonical XP source
// - In-progress periods compare only equivalent
//   elapsed previous-period ranges
// - Historical relationship snapshots are preferred
//   over current planning relationships
// ==========================================

import type {
  ExecutionRecord,
  ExecutionType,
} from "../shared/execution";

import type {
  LifeGoal,
  MonthlyTarget,
  Task,
  TaskPriority,
  WeeklyTarget,
} from "../shared/types";

import {
  TaskRelationshipEngine,
} from "./TaskRelationshipEngine";

import type {
  TaskRelationshipScope,
} from "./TaskRelationshipEngine";

// ==========================================
// Public Types
// ==========================================

export interface AnalyticsState {
  tasks: Task[];

  executionRecords:
    ExecutionRecord[];
}

export interface RelationshipAnalyticsState
  extends AnalyticsState {
  lifeGoals: LifeGoal[];

  monthlyTargets:
    MonthlyTarget[];

  weeklyTargets:
    WeeklyTarget[];
}

export interface OverallAnalytics {
  totalTasks: number;

  completedTasks: number;

  pendingTasks: number;

  completionRate: number;

  xpEarned: number;
}

export interface DailyAnalytics {
  date: string;

  dueTasks: number;

  completedDueTasks: number;

  pendingTasks: number;

  completedTasks: number;

  completionRate: number;

  xpEarned: number;
}

export interface WeeklyAnalytics {
  weekStartDate: string;

  weekEndDate: string;

  dueTasks: number;

  completedDueTasks: number;

  pendingTasks: number;

  completedTasks: number;

  completionRate: number;

  xpEarned: number;

  trend:
    DailyCompletionTrendPoint[];
}

export interface MonthlyAnalytics {
  monthStartDate: string;

  monthEndDate: string;

  monthLabel: string;

  dueTasks: number;

  completedDueTasks: number;

  pendingTasks: number;

  completedTasks: number;

  completionRate: number;

  xpEarned: number;

  activeDays: number;

  totalDays: number;

  trend:
    DailyCompletionTrendPoint[];

  weeks:
    MonthlyWeekTrendPoint[];
}

export interface YearlyAnalytics {
  year: number;

  yearStartDate: string;

  yearEndDate: string;

  dueTasks: number;

  completedDueTasks: number;

  pendingTasks: number;

  completedTasks: number;

  completionRate: number;

  xpEarned: number;

  activeDays: number;

  totalDays: number;

  months:
    YearMonthTrendPoint[];
}

export interface DailyCompletionTrendPoint {
  date: string;

  label: string;

  completedTasks: number;

  xpEarned: number;
}

export interface MonthlyWeekTrendPoint {
  weekStartDate: string;

  weekEndDate: string;

  periodStartDate: string;

  periodEndDate: string;

  label: string;

  dueTasks: number;

  completedDueTasks: number;

  pendingTasks: number;

  completedTasks: number;

  completionRate: number;

  xpEarned: number;
}

export interface YearMonthTrendPoint {
  month: number;

  monthStartDate: string;

  monthEndDate: string;

  label: string;

  dueTasks: number;

  completedDueTasks: number;

  pendingTasks: number;

  completedTasks: number;

  completionRate: number;

  xpEarned: number;

  activeDays: number;

  totalDays: number;
}

// ==========================================
// Effort Distribution
// ==========================================

export type EffortDistributionScope =
  | TaskRelationshipScope
  | "unresolved";

export interface EffortDistributionPoint {
  scope:
    EffortDistributionScope;

  label: string;

  completedTasks: number;

  percentage: number;
}

export interface EffortDistributionAnalytics {
  periodStartDate: string;

  periodEndDate: string;

  totalCompletedTasks: number;

  classifiedTasks: number;

  unresolvedTasks: number;

  distribution:
    EffortDistributionPoint[];
}

// ==========================================
// Priority Execution
// ==========================================

export interface PriorityExecutionPoint {
  priority: TaskPriority;

  label: string;

  totalTasks: number;

  completedTasks: number;

  pendingTasks: number;

  completionRate: number;
}

export interface PriorityExecutionAnalytics {
  periodStartDate: string;

  periodEndDate: string;

  totalTasks: number;

  completedTasks: number;

  pendingTasks: number;

  completionRate: number;

  priorities:
    PriorityExecutionPoint[];
}

// ==========================================
// XP Breakdown
// ==========================================

export type XPBreakdownCategory =
  | "task"
  | "weekly"
  | "monthly"
  | "life_goal"
  | "other";

export interface XPBreakdownPoint {
  category:
    XPBreakdownCategory;

  label: string;

  eventCount: number;

  rewardedEvents: number;

  zeroXPEvents: number;

  xpEarned: number;

  percentage: number;
}

export interface XPBreakdownAnalytics {
  periodStartDate: string;

  periodEndDate: string;

  totalXP: number;

  rewardedEvents: number;

  zeroXPCompletionEvents:
    number;

  breakdown:
    XPBreakdownPoint[];
}

// ==========================================
// Personal Bests
// ==========================================

export interface PersonalBestDay {
  date: string;

  completedTasks: number;

  xpEarned: number;
}

export interface PersonalBestMonth {
  monthStartDate: string;

  monthEndDate: string;

  label: string;

  completedTasks: number;

  xpEarned: number;

  activeDays: number;
}

export interface PersonalBestStreak {
  days: number;

  startDate?: string;

  endDate?: string;
}

export interface PersonalBestsAnalytics {
  mostTasksDay?:
    PersonalBestDay;

  mostXPDay?:
    PersonalBestDay;

  longestExecutionStreak:
    PersonalBestStreak;

  bestMonth?:
    PersonalBestMonth;
}

// ==========================================
// Period Comparison
// ==========================================

export type AnalyticsComparisonPeriod =
  | "day"
  | "week"
  | "month"
  | "year";

export type AnalyticsComparisonDirection =
  | "up"
  | "down"
  | "same";

export type AnalyticsComparisonMetricKey =
  | "completion_rate"
  | "completed_tasks"
  | "xp_earned"
  | "active_days";

export type AnalyticsComparisonUnit =
  | "percent"
  | "number"
  | "xp";

export interface AnalyticsComparisonMetric {
  key:
    AnalyticsComparisonMetricKey;

  label: string;

  currentValue: number;

  previousValue: number;

  delta: number;

  direction:
    AnalyticsComparisonDirection;

  unit:
    AnalyticsComparisonUnit;
}

export interface PeriodComparisonAnalytics {
  period:
    AnalyticsComparisonPeriod;

  currentLabel: string;

  previousLabel: string;

  currentStartDate: string;

  currentEndDate: string;

  previousStartDate: string;

  previousEndDate: string;

  metrics:
    AnalyticsComparisonMetric[];
}

export interface AnalyticsSnapshot {
  overall:
    OverallAnalytics;

  today:
    DailyAnalytics;

  week:
    WeeklyAnalytics;

  month:
    MonthlyAnalytics;

  year:
    YearlyAnalytics;
}

// ==========================================
// Internal Types
// ==========================================

interface ComparisonRangeSnapshot {
  start: Date;

  end: Date;

  dueTasks: number;

  completedDueTasks: number;

  completedTasks: number;

  completionRate: number;

  xpEarned: number;

  activeDays: number;
}

interface HistoricalTaskRelationshipSnapshot {
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
// Date Helpers
// ==========================================

function padNumber(
  value: number
): string {
  return String(
    value
  ).padStart(
    2,
    "0"
  );
}

function formatLocalDate(
  date: Date
): string {
  return [
    date.getFullYear(),

    padNumber(
      date.getMonth() + 1
    ),

    padNumber(
      date.getDate()
    ),
  ].join("-");
}

function parseLocalDate(
  value?: string
): Date | undefined {
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

  date.setHours(
    0,
    0,
    0,
    0
  );

  return date;
}

function normalizeLocalDate(
  date: Date
): Date {
  const result =
    new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate()
    );

  result.setHours(
    0,
    0,
    0,
    0
  );

  return result;
}

function addDays(
  date: Date,
  amount: number
): Date {
  const result =
    new Date(
      date
    );

  result.setDate(
    result.getDate() +
      amount
  );

  return normalizeLocalDate(
    result
  );
}

function getCalendarDayDifference(
  start: Date,
  end: Date
): number {
  const startUTC =
    Date.UTC(
      start.getFullYear(),
      start.getMonth(),
      start.getDate()
    );

  const endUTC =
    Date.UTC(
      end.getFullYear(),
      end.getMonth(),
      end.getDate()
    );

  return Math.round(
    (
      endUTC -
      startUTC
    ) /
      86_400_000
  );
}

function getMonday(
  date: Date
): Date {
  const normalized =
    normalizeLocalDate(
      date
    );

  const day =
    normalized.getDay();

  const distance =
    day === 0
      ? 6
      : day - 1;

  return addDays(
    normalized,
    -distance
  );
}

function getMonthStart(
  date: Date
): Date {
  return normalizeLocalDate(
    new Date(
      date.getFullYear(),
      date.getMonth(),
      1
    )
  );
}

function getMonthEnd(
  date: Date
): Date {
  return normalizeLocalDate(
    new Date(
      date.getFullYear(),
      date.getMonth() + 1,
      0
    )
  );
}

function getYearStart(
  date: Date
): Date {
  return normalizeLocalDate(
    new Date(
      date.getFullYear(),
      0,
      1
    )
  );
}

function getYearEnd(
  date: Date
): Date {
  return normalizeLocalDate(
    new Date(
      date.getFullYear(),
      11,
      31
    )
  );
}

function maxDate(
  left: Date,
  right: Date
): Date {
  return left.getTime() >=
    right.getTime()
    ? left
    : right;
}

function minDate(
  left: Date,
  right: Date
): Date {
  return left.getTime() <=
    right.getTime()
    ? left
    : right;
}

function isWithinRange(
  date: Date,
  start: Date,
  end: Date
): boolean {
  const value =
    normalizeLocalDate(
      date
    ).getTime();

  return (
    value >=
      start.getTime() &&
    value <=
      end.getTime()
  );
}

function getEquivalentPreviousMonthEnd(
  currentEnd: Date,
  previousMonthStart: Date
): Date {
  const previousMonthEnd =
    getMonthEnd(
      previousMonthStart
    );

  const targetDay =
    Math.min(
      currentEnd.getDate(),
      previousMonthEnd.getDate()
    );

  return normalizeLocalDate(
    new Date(
      previousMonthStart.getFullYear(),
      previousMonthStart.getMonth(),
      targetDay
    )
  );
}

function getEquivalentPreviousYearEnd(
  currentEnd: Date,
  previousYear: number
): Date {
  const month =
    currentEnd.getMonth();

  const lastDay =
    new Date(
      previousYear,
      month + 1,
      0
    ).getDate();

  const day =
    Math.min(
      currentEnd.getDate(),
      lastDay
    );

  return normalizeLocalDate(
    new Date(
      previousYear,
      month,
      day
    )
  );
}

function formatMonthLabel(
  date: Date
): string {
  return date.toLocaleDateString(
    undefined,
    {
      month:
        "long",

      year:
        "numeric",
    }
  );
}

function formatMonthShortLabel(
  date: Date
): string {
  return date.toLocaleDateString(
    undefined,
    {
      month:
        "short",
    }
  );
}

function formatDayLabel(
  date: Date
): string {
  return date.toLocaleDateString(
    undefined,
    {
      month:
        "short",

      day:
        "numeric",
    }
  );
}

function formatShortDateRange(
  start: Date,
  end: Date
): string {
  const sameMonth =
    start.getFullYear() ===
      end.getFullYear() &&
    start.getMonth() ===
      end.getMonth();

  if (sameMonth) {
    const month =
      start.toLocaleDateString(
        undefined,
        {
          month:
            "short",
        }
      );

    return `${month} ${start.getDate()}–${end.getDate()}`;
  }

  const startLabel =
    start.toLocaleDateString(
      undefined,
      {
        month:
          "short",

        day:
          "numeric",
      }
    );

  const endLabel =
    end.toLocaleDateString(
      undefined,
      {
        month:
          "short",

        day:
          "numeric",
      }
    );

  return `${startLabel}–${endLabel}`;
}

function formatYearRangeLabel(
  start: Date,
  end: Date
): string {
  const startLabel =
    start.toLocaleDateString(
      undefined,
      {
        month:
          "short",

        day:
          "numeric",
      }
    );

  const endLabel =
    end.toLocaleDateString(
      undefined,
      {
        month:
          "short",

        day:
          "numeric",

        year:
          "numeric",
      }
    );

  return `${startLabel}–${endLabel}`;
}

// ==========================================
// Execution Helpers
// ==========================================

function getExecutionDate(
  record: ExecutionRecord
): Date | undefined {
  const date =
    new Date(
      record.createdAt
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

function getTaskCompletedDate(
  task: Task
): Date | undefined {
  if (!task.completedAt) {
    return undefined;
  }

  const date =
    new Date(
      task.completedAt
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

// ==========================================
// Historical Relationship Helpers
// ==========================================

function isTaskRelationshipScope(
  value: unknown
): value is TaskRelationshipScope {
  return (
    value ===
      "standalone" ||
    value ===
      "weekly" ||
    value ===
      "personal" ||
    value ===
      "goal"
  );
}

function parseOptionalNumber(
  value: unknown
): number | undefined {
  return typeof value ===
    "number" &&
    Number.isFinite(
      value
    )
    ? value
    : undefined;
}

function parseTaskRelationshipSnapshot(
  value: unknown
):
  | HistoricalTaskRelationshipSnapshot
  | undefined {
  if (
    !value ||
    typeof value !==
      "object" ||
    Array.isArray(
      value
    )
  ) {
    return undefined;
  }

  const candidate =
    value as Record<
      string,
      unknown
    >;

  const taskId =
    candidate.taskId;

  const scope =
    candidate.scope;

  if (
    typeof taskId !==
      "number" ||
    !Number.isFinite(
      taskId
    ) ||
    !isTaskRelationshipScope(
      scope
    )
  ) {
    return undefined;
  }

  return {
    taskId,

    scope,

    weeklyTargetId:
      parseOptionalNumber(
        candidate.weeklyTargetId
      ),

    monthlyTargetId:
      parseOptionalNumber(
        candidate.monthlyTargetId
      ),

    lifeGoalId:
      parseOptionalNumber(
        candidate.lifeGoalId
      ),
  };
}

function getRecordTaskRelationshipSnapshots(
  record: ExecutionRecord
): HistoricalTaskRelationshipSnapshot[] {
  const metadata =
    record.metadata;

  if (
    !metadata ||
    metadata.relationshipSnapshotVersion !==
      1
  ) {
    return [];
  }

  const snapshots =
    metadata.taskRelationshipSnapshots;

  if (
    !Array.isArray(
      snapshots
    )
  ) {
    return [];
  }

  return snapshots
    .map(
      (snapshot) =>
        parseTaskRelationshipSnapshot(
          snapshot
        )
    )
    .filter(
      (
        snapshot
      ): snapshot is HistoricalTaskRelationshipSnapshot =>
        snapshot !==
        undefined
    );
}

function getHistoricalRelationshipScopesForRange(
  executionRecords:
    ExecutionRecord[],
  start: Date,
  end: Date
): Map<
  number,
  TaskRelationshipScope
> {
  const result =
    new Map<
      number,
      TaskRelationshipScope
    >();

  const records =
    executionRecords
      .map(
        (record) => ({
          record,

          date:
            getExecutionDate(
              record
            ),
        })
      )
      .filter(
        (
          item
        ): item is {
          record:
            ExecutionRecord;
          date: Date;
        } =>
          item.date !==
            undefined &&
          isWithinRange(
            item.date,
            start,
            end
          )
      )
      .sort(
        (
          left,
          right
        ) =>
          left.date.getTime() -
          right.date.getTime()
      );

  records.forEach(
    ({
      record,
    }) => {
      const snapshots =
        getRecordTaskRelationshipSnapshots(
          record
        );

      snapshots.forEach(
        (snapshot) => {
          if (
            !result.has(
              snapshot.taskId
            )
          ) {
            result.set(
              snapshot.taskId,
              snapshot.scope
            );
          }
        }
      );
    }
  );

  return result;
}

// ==========================================
// Math Helpers
// ==========================================

function getCompletionRate(
  completed: number,
  total: number
): number {
  if (total <= 0) {
    return 0;
  }

  return Math.round(
    (
      completed /
      total
    ) * 100
  );
}

function getPercentage(
  value: number,
  total: number
): number {
  if (total <= 0) {
    return 0;
  }

  return Math.round(
    (
      value /
      total
    ) * 100
  );
}

// ==========================================
// XP Helpers
// ==========================================

function getRecordXP(
  record: ExecutionRecord
): number {
  const value =
    Number(
      record.xpAwarded
    );

  if (
    !Number.isFinite(
      value
    ) ||
    value <= 0
  ) {
    return 0;
  }

  return value;
}

function getTotalXP(
  executionRecords:
    ExecutionRecord[]
): number {
  return executionRecords.reduce(
    (
      total,
      record
    ) =>
      total +
      getRecordXP(
        record
      ),
    0
  );
}

function getXPForRange(
  executionRecords:
    ExecutionRecord[],
  start: Date,
  end: Date
): number {
  return executionRecords.reduce(
    (
      total,
      record
    ) => {
      const date =
        getExecutionDate(
          record
        );

      if (
        !date ||
        !isWithinRange(
          date,
          start,
          end
        )
      ) {
        return total;
      }

      return (
        total +
        getRecordXP(
          record
        )
      );
    },
    0
  );
}

function getXPBreakdownCategory(
  type: ExecutionType
): XPBreakdownCategory {
  switch (type) {
    case "task_completed":
      return "task";

    case "weekly_completed":
      return "weekly";

    case "monthly_completed":
      return "monthly";

    case "life_goal_completed":
      return "life_goal";

    default:
      return "other";
  }
}

function getXPBreakdownLabel(
  category:
    XPBreakdownCategory
): string {
  switch (category) {
    case "task":
      return "Task Completions";

    case "weekly":
      return "Weekly Focuses";

    case "monthly":
      return "Monthly Outcomes";

    case "life_goal":
      return "Life Goals";

    case "other":
    default:
      return "Other XP";
  }
}

function isRewardableCompletionType(
  type: ExecutionType
): boolean {
  return (
    type ===
      "task_completed" ||
    type ===
      "weekly_completed" ||
    type ===
      "monthly_completed" ||
    type ===
      "life_goal_completed"
  );
}

function buildXPBreakdown(
  state: AnalyticsState,
  start: Date,
  end: Date
): XPBreakdownAnalytics {
  const categories:
    XPBreakdownCategory[] = [
      "task",
      "weekly",
      "monthly",
      "life_goal",
      "other",
    ];

  const accumulator: Record<
    XPBreakdownCategory,
    {
      eventCount: number;
      rewardedEvents: number;
      zeroXPEvents: number;
      xpEarned: number;
    }
  > = {
    task: {
      eventCount: 0,
      rewardedEvents: 0,
      zeroXPEvents: 0,
      xpEarned: 0,
    },

    weekly: {
      eventCount: 0,
      rewardedEvents: 0,
      zeroXPEvents: 0,
      xpEarned: 0,
    },

    monthly: {
      eventCount: 0,
      rewardedEvents: 0,
      zeroXPEvents: 0,
      xpEarned: 0,
    },

    life_goal: {
      eventCount: 0,
      rewardedEvents: 0,
      zeroXPEvents: 0,
      xpEarned: 0,
    },

    other: {
      eventCount: 0,
      rewardedEvents: 0,
      zeroXPEvents: 0,
      xpEarned: 0,
    },
  };

  state.executionRecords.forEach(
    (record) => {
      const date =
        getExecutionDate(
          record
        );

      if (
        !date ||
        !isWithinRange(
          date,
          start,
          end
        )
      ) {
        return;
      }

      const xp =
        getRecordXP(
          record
        );

      const rewardable =
        isRewardableCompletionType(
          record.type
        );

      if (
        xp <= 0 &&
        !rewardable
      ) {
        return;
      }

      const category =
        getXPBreakdownCategory(
          record.type
        );

      const bucket =
        accumulator[
          category
        ];

      bucket.eventCount +=
        1;

      if (xp > 0) {
        bucket.rewardedEvents +=
          1;

        bucket.xpEarned +=
          xp;
      } else if (
        rewardable
      ) {
        bucket.zeroXPEvents +=
          1;
      }
    }
  );

  const totalXP =
    categories.reduce(
      (
        total,
        category
      ) =>
        total +
        accumulator[
          category
        ].xpEarned,
      0
    );

  const rewardedEvents =
    categories.reduce(
      (
        total,
        category
      ) =>
        total +
        accumulator[
          category
        ].rewardedEvents,
      0
    );

  const zeroXPCompletionEvents =
    categories.reduce(
      (
        total,
        category
      ) =>
        total +
        accumulator[
          category
        ].zeroXPEvents,
      0
    );

  return {
    periodStartDate:
      formatLocalDate(
        start
      ),

    periodEndDate:
      formatLocalDate(
        end
      ),

    totalXP,

    rewardedEvents,

    zeroXPCompletionEvents,

    breakdown:
      categories.map(
        (category) => ({
          category,

          label:
            getXPBreakdownLabel(
              category
            ),

          eventCount:
            accumulator[
              category
            ].eventCount,

          rewardedEvents:
            accumulator[
              category
            ].rewardedEvents,

          zeroXPEvents:
            accumulator[
              category
            ].zeroXPEvents,

          xpEarned:
            accumulator[
              category
            ].xpEarned,

          percentage:
            getPercentage(
              accumulator[
                category
              ].xpEarned,
              totalXP
            ),
        })
      ),
  };
}

// ==========================================
// Completion Helpers
// ==========================================

function getCompletedTaskIdsForRange(
  tasks: Task[],
  executionRecords:
    ExecutionRecord[],
  start: Date,
  end: Date
): Set<number> {
  const completedIds =
    new Set<number>();

  executionRecords.forEach(
    (record) => {
      const recordDate =
        getExecutionDate(
          record
        );

      if (
        !recordDate ||
        !isWithinRange(
          recordDate,
          start,
          end
        )
      ) {
        return;
      }

      if (
        record.type ===
        "task_completed"
      ) {
        completedIds.add(
          record.entityId
        );
      }

      const snapshots =
        getRecordTaskRelationshipSnapshots(
          record
        );

      snapshots.forEach(
        (snapshot) => {
          completedIds.add(
            snapshot.taskId
          );
        }
      );
    }
  );

  tasks.forEach(
    (task) => {
      if (
        !task.completed ||
        !task.completedAt
      ) {
        return;
      }

      const date =
        getTaskCompletedDate(
          task
        );

      if (
        !date ||
        !isWithinRange(
          date,
          start,
          end
        )
      ) {
        return;
      }

      completedIds.add(
        task.id
      );
    }
  );

  return completedIds;
}

function getCompletedTaskIdsForDay(
  tasks: Task[],
  executionRecords:
    ExecutionRecord[],
  date: Date
): Set<number> {
  const day =
    normalizeLocalDate(
      date
    );

  return getCompletedTaskIdsForRange(
    tasks,
    executionRecords,
    day,
    day
  );
}

// ==========================================
// Due Date Helpers
// ==========================================

function getTasksDueOnDate(
  tasks: Task[],
  date: Date
): Task[] {
  const value =
    formatLocalDate(
      date
    );

  return tasks.filter(
    (task) =>
      task.dueDate ===
      value
  );
}

function getTasksDueInRange(
  tasks: Task[],
  start: Date,
  end: Date
): Task[] {
  return tasks.filter(
    (task) => {
      const dueDate =
        parseLocalDate(
          task.dueDate
        );

      if (!dueDate) {
        return false;
      }

      return isWithinRange(
        dueDate,
        start,
        end
      );
    }
  );
}

// ==========================================
// Effort Helpers
// ==========================================

function getEffortLabel(
  scope:
    EffortDistributionScope
): string {
  switch (scope) {
    case "goal":
      return "Goal Work";

    case "personal":
      return "Personal";

    case "weekly":
      return "Weekly Focus";

    case "standalone":
      return "Standalone";

    case "unresolved":
    default:
      return "Unresolved";
  }
}

function buildEffortDistribution(
  state:
    RelationshipAnalyticsState,
  start: Date,
  end: Date
): EffortDistributionAnalytics {
  const completedTaskIds =
    getCompletedTaskIdsForRange(
      state.tasks,
      state.executionRecords,
      start,
      end
    );

  const historicalScopes =
    getHistoricalRelationshipScopesForRange(
      state.executionRecords,
      start,
      end
    );

  const counts: Record<
    EffortDistributionScope,
    number
  > = {
    goal: 0,
    personal: 0,
    weekly: 0,
    standalone: 0,
    unresolved: 0,
  };

  const relationshipState = {
    lifeGoals:
      state.lifeGoals,

    monthlyTargets:
      state.monthlyTargets,

    weeklyTargets:
      state.weeklyTargets,

    tasks:
      state.tasks,
  };

  completedTaskIds.forEach(
    (taskId) => {
      const historicalScope =
        historicalScopes.get(
          taskId
        );

      if (
        historicalScope
      ) {
        counts[
          historicalScope
        ] += 1;

        return;
      }

      const task =
        state.tasks.find(
          (item) =>
            item.id ===
            taskId
        );

      if (!task) {
        counts.unresolved +=
          1;

        return;
      }

      const relationship =
        TaskRelationshipEngine.resolve(
          relationshipState,
          task.id
        );

      if (!relationship) {
        counts.unresolved +=
          1;

        return;
      }

      counts[
        relationship.scope
      ] += 1;
    }
  );

  const totalCompletedTasks =
    completedTaskIds.size;

  const classifiedTasks =
    totalCompletedTasks -
    counts.unresolved;

  const scopes:
    EffortDistributionScope[] = [
      "goal",
      "personal",
      "weekly",
      "standalone",
      "unresolved",
    ];

  return {
    periodStartDate:
      formatLocalDate(
        start
      ),

    periodEndDate:
      formatLocalDate(
        end
      ),

    totalCompletedTasks,

    classifiedTasks,

    unresolvedTasks:
      counts.unresolved,

    distribution:
      scopes.map(
        (scope) => ({
          scope,

          label:
            getEffortLabel(
              scope
            ),

          completedTasks:
            counts[
              scope
            ],

          percentage:
            getPercentage(
              counts[
                scope
              ],
              totalCompletedTasks
            ),
        })
      ),
  };
}

// ==========================================
// Priority Helpers
// ==========================================

function getPriorityLabel(
  priority: TaskPriority
): string {
  switch (priority) {
    case "high":
      return "High Priority";

    case "medium":
      return "Medium Priority";

    case "low":
    default:
      return "Low Priority";
  }
}

function buildPriorityExecution(
  state: AnalyticsState,
  start: Date,
  end: Date
): PriorityExecutionAnalytics {
  const dueTasks =
    getTasksDueInRange(
      state.tasks,
      start,
      end
    );

  const priorities:
    TaskPriority[] = [
      "high",
      "medium",
      "low",
    ];

  const points =
    priorities.map(
      (priority) => {
        const tasks =
          dueTasks.filter(
            (task) =>
              task.priority ===
              priority
          );

        const completed =
          tasks.filter(
            (task) =>
              task.completed
          ).length;

        return {
          priority,

          label:
            getPriorityLabel(
              priority
            ),

          totalTasks:
            tasks.length,

          completedTasks:
            completed,

          pendingTasks:
            tasks.length -
            completed,

          completionRate:
            getCompletionRate(
              completed,
              tasks.length
            ),
        };
      }
    );

  const completedTasks =
    dueTasks.filter(
      (task) =>
        task.completed
    ).length;

  return {
    periodStartDate:
      formatLocalDate(
        start
      ),

    periodEndDate:
      formatLocalDate(
        end
      ),

    totalTasks:
      dueTasks.length,

    completedTasks,

    pendingTasks:
      dueTasks.length -
      completedTasks,

    completionRate:
      getCompletionRate(
        completedTasks,
        dueTasks.length
      ),

    priorities:
      points,
  };
}

// ==========================================
// Trend Helpers
// ==========================================

function buildDailyTrend(
  tasks: Task[],
  executionRecords:
    ExecutionRecord[],
  start: Date,
  end: Date
): DailyCompletionTrendPoint[] {
  const points:
    DailyCompletionTrendPoint[] = [];

  let cursor =
    normalizeLocalDate(
      start
    );

  const finalDate =
    normalizeLocalDate(
      end
    );

  while (
    cursor.getTime() <=
    finalDate.getTime()
  ) {
    const completedTaskIds =
      getCompletedTaskIdsForDay(
        tasks,
        executionRecords,
        cursor
      );

    points.push({
      date:
        formatLocalDate(
          cursor
        ),

      label:
        cursor.toLocaleDateString(
          undefined,
          {
            weekday:
              "short",
          }
        ),

      completedTasks:
        completedTaskIds.size,

      xpEarned:
        getXPForRange(
          executionRecords,
          cursor,
          cursor
        ),
    });

    cursor =
      addDays(
        cursor,
        1
      );
  }

  return points;
}

function buildMonthlyWeekTrend(
  tasks: Task[],
  executionRecords:
    ExecutionRecord[],
  monthStart: Date,
  monthEnd: Date
): MonthlyWeekTrendPoint[] {
  const points:
    MonthlyWeekTrendPoint[] = [];

  let weekStart =
    getMonday(
      monthStart
    );

  while (
    weekStart.getTime() <=
    monthEnd.getTime()
  ) {
    const weekEnd =
      addDays(
        weekStart,
        6
      );

    const periodStart =
      maxDate(
        weekStart,
        monthStart
      );

    const periodEnd =
      minDate(
        weekEnd,
        monthEnd
      );

    const dueTasks =
      getTasksDueInRange(
        tasks,
        periodStart,
        periodEnd
      );

    const completedDueTasks =
      dueTasks.filter(
        (task) =>
          task.completed
      ).length;

    const completedTaskIds =
      getCompletedTaskIdsForRange(
        tasks,
        executionRecords,
        periodStart,
        periodEnd
      );

    points.push({
      weekStartDate:
        formatLocalDate(
          weekStart
        ),

      weekEndDate:
        formatLocalDate(
          weekEnd
        ),

      periodStartDate:
        formatLocalDate(
          periodStart
        ),

      periodEndDate:
        formatLocalDate(
          periodEnd
        ),

      label:
        formatShortDateRange(
          periodStart,
          periodEnd
        ),

      dueTasks:
        dueTasks.length,

      completedDueTasks,

      pendingTasks:
        dueTasks.length -
        completedDueTasks,

      completedTasks:
        completedTaskIds.size,

      completionRate:
        getCompletionRate(
          completedDueTasks,
          dueTasks.length
        ),

      xpEarned:
        getXPForRange(
          executionRecords,
          periodStart,
          periodEnd
        ),
    });

    weekStart =
      addDays(
        weekStart,
        7
      );
  }

  return points;
}

function buildYearMonthTrend(
  state: AnalyticsState,
  referenceDate: Date
): YearMonthTrendPoint[] {
  const year =
    referenceDate.getFullYear();

  const points:
    YearMonthTrendPoint[] = [];

  for (
    let monthIndex = 0;
    monthIndex < 12;
    monthIndex += 1
  ) {
    const monthReference =
      new Date(
        year,
        monthIndex,
        1
      );

    const month =
      AnalyticsEngine.getMonth(
        state,
        monthReference
      );

    points.push({
      month:
        monthIndex + 1,

      monthStartDate:
        month.monthStartDate,

      monthEndDate:
        month.monthEndDate,

      label:
        formatMonthShortLabel(
          monthReference
        ),

      dueTasks:
        month.dueTasks,

      completedDueTasks:
        month.completedDueTasks,

      pendingTasks:
        month.pendingTasks,

      completedTasks:
        month.completedTasks,

      completionRate:
        month.completionRate,

      xpEarned:
        month.xpEarned,

      activeDays:
        month.activeDays,

      totalDays:
        month.totalDays,
    });
  }

  return points;
}

// ==========================================
// Personal Best Helpers
// ==========================================

function getEarliestAnalyticsDate(
  state: AnalyticsState
): Date | undefined {
  const dates: Date[] = [];

  state.executionRecords.forEach(
    (record) => {
      const date =
        getExecutionDate(
          record
        );

      if (date) {
        dates.push(
          normalizeLocalDate(
            date
          )
        );
      }
    }
  );

  state.tasks.forEach(
    (task) => {
      const date =
        getTaskCompletedDate(
          task
        );

      if (date) {
        dates.push(
          normalizeLocalDate(
            date
          )
        );
      }
    }
  );

  if (
    dates.length === 0
  ) {
    return undefined;
  }

  return dates.reduce(
    (
      earliest,
      date
    ) =>
      date.getTime() <
      earliest.getTime()
        ? date
        : earliest
  );
}

function buildPersonalBests(
  state: AnalyticsState,
  referenceDate: Date
): PersonalBestsAnalytics {
  const earliestDate =
    getEarliestAnalyticsDate(
      state
    );

  if (!earliestDate) {
    return {
      mostTasksDay:
        undefined,

      mostXPDay:
        undefined,

      longestExecutionStreak: {
        days: 0,
      },

      bestMonth:
        undefined,
    };
  }

  const endDate =
    normalizeLocalDate(
      referenceDate
    );

  const trend =
    buildDailyTrend(
      state.tasks,
      state.executionRecords,
      earliestDate,
      endDate
    );

  const mostTasksPoint =
    trend.reduce<
      DailyCompletionTrendPoint |
      undefined
    >(
      (
        best,
        point
      ) => {
        if (
          !best ||
          point.completedTasks >
            best.completedTasks ||
          (
            point.completedTasks ===
              best.completedTasks &&
            point.xpEarned >
              best.xpEarned
          )
        ) {
          return point;
        }

        return best;
      },
      undefined
    );

  const mostXPPoint =
    trend.reduce<
      DailyCompletionTrendPoint |
      undefined
    >(
      (
        best,
        point
      ) => {
        if (
          !best ||
          point.xpEarned >
            best.xpEarned ||
          (
            point.xpEarned ===
              best.xpEarned &&
            point.completedTasks >
              best.completedTasks
          )
        ) {
          return point;
        }

        return best;
      },
      undefined
    );

  let currentStreak = 0;

  let currentStart:
    string | undefined;

  let bestStreak = 0;

  let bestStart:
    string | undefined;

  let bestEnd:
    string | undefined;

  trend.forEach(
    (point) => {
      if (
        point.completedTasks >
        0
      ) {
        if (
          currentStreak ===
          0
        ) {
          currentStart =
            point.date;
        }

        currentStreak +=
          1;

        if (
          currentStreak >
          bestStreak
        ) {
          bestStreak =
            currentStreak;

          bestStart =
            currentStart;

          bestEnd =
            point.date;
        }

        return;
      }

      currentStreak = 0;

      currentStart =
        undefined;
    }
  );

  let monthCursor =
    getMonthStart(
      earliestDate
    );

  const finalMonth =
    getMonthStart(
      endDate
    );

  let bestMonth:
    PersonalBestMonth |
    undefined;

  while (
    monthCursor.getTime() <=
    finalMonth.getTime()
  ) {
    const month =
      AnalyticsEngine.getMonth(
        state,
        monthCursor
      );

    const candidate:
      PersonalBestMonth = {
        monthStartDate:
          month.monthStartDate,

        monthEndDate:
          month.monthEndDate,

        label:
          month.monthLabel,

        completedTasks:
          month.completedTasks,

        xpEarned:
          month.xpEarned,

        activeDays:
          month.activeDays,
      };

    if (
      !bestMonth ||
      candidate.completedTasks >
        bestMonth.completedTasks ||
      (
        candidate.completedTasks ===
          bestMonth.completedTasks &&
        candidate.activeDays >
          bestMonth.activeDays
      ) ||
      (
        candidate.completedTasks ===
          bestMonth.completedTasks &&
        candidate.activeDays ===
          bestMonth.activeDays &&
        candidate.xpEarned >
          bestMonth.xpEarned
      )
    ) {
      bestMonth =
        candidate;
    }

    monthCursor =
      getMonthStart(
        new Date(
          monthCursor.getFullYear(),
          monthCursor.getMonth() + 1,
          1
        )
      );
  }

  return {
    mostTasksDay:
      mostTasksPoint &&
      mostTasksPoint.completedTasks >
        0
        ? {
            date:
              mostTasksPoint.date,

            completedTasks:
              mostTasksPoint.completedTasks,

            xpEarned:
              mostTasksPoint.xpEarned,
          }
        : undefined,

    mostXPDay:
      mostXPPoint &&
      mostXPPoint.xpEarned >
        0
        ? {
            date:
              mostXPPoint.date,

            completedTasks:
              mostXPPoint.completedTasks,

            xpEarned:
              mostXPPoint.xpEarned,
          }
        : undefined,

    longestExecutionStreak: {
      days:
        bestStreak,

      startDate:
        bestStart,

      endDate:
        bestEnd,
    },

    bestMonth:
      bestMonth &&
      (
        bestMonth.completedTasks >
          0 ||
        bestMonth.xpEarned >
          0
      )
        ? bestMonth
        : undefined,
  };
}

// ==========================================
// Comparison Helpers
// ==========================================

function getComparisonDirection(
  delta: number
): AnalyticsComparisonDirection {
  if (delta > 0) {
    return "up";
  }

  if (delta < 0) {
    return "down";
  }

  return "same";
}

function createComparisonMetric(
  key:
    AnalyticsComparisonMetricKey,
  label: string,
  currentValue: number,
  previousValue: number,
  unit:
    AnalyticsComparisonUnit
): AnalyticsComparisonMetric {
  const delta =
    currentValue -
    previousValue;

  return {
    key,

    label,

    currentValue,

    previousValue,

    delta,

    direction:
      getComparisonDirection(
        delta
      ),

    unit,
  };
}

function buildComparisonRangeSnapshot(
  state: AnalyticsState,
  start: Date,
  end: Date
): ComparisonRangeSnapshot {
  const dueTasks =
    getTasksDueInRange(
      state.tasks,
      start,
      end
    );

  const completedDueTasks =
    dueTasks.filter(
      (task) =>
        task.completed
    ).length;

  const completedTaskIds =
    getCompletedTaskIdsForRange(
      state.tasks,
      state.executionRecords,
      start,
      end
    );

  const trend =
    buildDailyTrend(
      state.tasks,
      state.executionRecords,
      start,
      end
    );

  const activeDays =
    trend.filter(
      (point) =>
        point.completedTasks >
          0 ||
        point.xpEarned >
          0
    ).length;

  return {
    start,

    end,

    dueTasks:
      dueTasks.length,

    completedDueTasks,

    completedTasks:
      completedTaskIds.size,

    completionRate:
      getCompletionRate(
        completedDueTasks,
        dueTasks.length
      ),

    xpEarned:
      getXPForRange(
        state.executionRecords,
        start,
        end
      ),

    activeDays,
  };
}

function buildComparisonMetrics(
  current:
    ComparisonRangeSnapshot,
  previous:
    ComparisonRangeSnapshot
): AnalyticsComparisonMetric[] {
  return [
    createComparisonMetric(
      "completion_rate",
      "Completion Rate",
      current.completionRate,
      previous.completionRate,
      "percent"
    ),

    createComparisonMetric(
      "completed_tasks",
      "Completed Tasks",
      current.completedTasks,
      previous.completedTasks,
      "number"
    ),

    createComparisonMetric(
      "xp_earned",
      "XP Earned",
      current.xpEarned,
      previous.xpEarned,
      "xp"
    ),

    createComparisonMetric(
      "active_days",
      "Active Days",
      current.activeDays,
      previous.activeDays,
      "number"
    ),
  ];
}

function buildDayComparison(
  state: AnalyticsState,
  referenceDate: Date
): PeriodComparisonAnalytics {
  const currentDate =
    normalizeLocalDate(
      referenceDate
    );

  const previousDate =
    addDays(
      currentDate,
      -1
    );

  const current =
    buildComparisonRangeSnapshot(
      state,
      currentDate,
      currentDate
    );

  const previous =
    buildComparisonRangeSnapshot(
      state,
      previousDate,
      previousDate
    );

  return {
    period:
      "day",

    currentLabel:
      formatDayLabel(
        currentDate
      ),

    previousLabel:
      formatDayLabel(
        previousDate
      ),

    currentStartDate:
      formatLocalDate(
        currentDate
      ),

    currentEndDate:
      formatLocalDate(
        currentDate
      ),

    previousStartDate:
      formatLocalDate(
        previousDate
      ),

    previousEndDate:
      formatLocalDate(
        previousDate
      ),

    metrics:
      buildComparisonMetrics(
        current,
        previous
      ),
  };
}

function buildWeekComparison(
  state: AnalyticsState,
  referenceDate: Date
): PeriodComparisonAnalytics {
  const reference =
    normalizeLocalDate(
      referenceDate
    );

  const currentStart =
    getMonday(
      reference
    );

  const currentFullEnd =
    addDays(
      currentStart,
      6
    );

  const currentEnd =
    minDate(
      reference,
      currentFullEnd
    );

  const elapsedDays =
    getCalendarDayDifference(
      currentStart,
      currentEnd
    );

  const previousStart =
    addDays(
      currentStart,
      -7
    );

  const previousFullEnd =
    addDays(
      previousStart,
      6
    );

  const previousEnd =
    minDate(
      addDays(
        previousStart,
        elapsedDays
      ),
      previousFullEnd
    );

  const current =
    buildComparisonRangeSnapshot(
      state,
      currentStart,
      currentEnd
    );

  const previous =
    buildComparisonRangeSnapshot(
      state,
      previousStart,
      previousEnd
    );

  return {
    period:
      "week",

    currentLabel:
      formatShortDateRange(
        currentStart,
        currentEnd
      ),

    previousLabel:
      formatShortDateRange(
        previousStart,
        previousEnd
      ),

    currentStartDate:
      formatLocalDate(
        currentStart
      ),

    currentEndDate:
      formatLocalDate(
        currentEnd
      ),

    previousStartDate:
      formatLocalDate(
        previousStart
      ),

    previousEndDate:
      formatLocalDate(
        previousEnd
      ),

    metrics:
      buildComparisonMetrics(
        current,
        previous
      ),
  };
}

function buildMonthComparison(
  state: AnalyticsState,
  referenceDate: Date
): PeriodComparisonAnalytics {
  const reference =
    normalizeLocalDate(
      referenceDate
    );

  const currentStart =
    getMonthStart(
      reference
    );

  const currentFullEnd =
    getMonthEnd(
      reference
    );

  const currentEnd =
    minDate(
      reference,
      currentFullEnd
    );

  const previousStart =
    getMonthStart(
      new Date(
        currentStart.getFullYear(),
        currentStart.getMonth() - 1,
        1
      )
    );

  const previousEnd =
    getEquivalentPreviousMonthEnd(
      currentEnd,
      previousStart
    );

  const current =
    buildComparisonRangeSnapshot(
      state,
      currentStart,
      currentEnd
    );

  const previous =
    buildComparisonRangeSnapshot(
      state,
      previousStart,
      previousEnd
    );

  return {
    period:
      "month",

    currentLabel:
      formatShortDateRange(
        currentStart,
        currentEnd
      ),

    previousLabel:
      formatShortDateRange(
        previousStart,
        previousEnd
      ),

    currentStartDate:
      formatLocalDate(
        currentStart
      ),

    currentEndDate:
      formatLocalDate(
        currentEnd
      ),

    previousStartDate:
      formatLocalDate(
        previousStart
      ),

    previousEndDate:
      formatLocalDate(
        previousEnd
      ),

    metrics:
      buildComparisonMetrics(
        current,
        previous
      ),
  };
}

function buildYearComparison(
  state: AnalyticsState,
  referenceDate: Date
): PeriodComparisonAnalytics {
  const reference =
    normalizeLocalDate(
      referenceDate
    );

  const currentStart =
    getYearStart(
      reference
    );

  const currentFullEnd =
    getYearEnd(
      reference
    );

  const currentEnd =
    minDate(
      reference,
      currentFullEnd
    );

  const previousYear =
    currentStart.getFullYear() -
    1;

  const previousStart =
    normalizeLocalDate(
      new Date(
        previousYear,
        0,
        1
      )
    );

  const previousEnd =
    getEquivalentPreviousYearEnd(
      currentEnd,
      previousYear
    );

  const current =
    buildComparisonRangeSnapshot(
      state,
      currentStart,
      currentEnd
    );

  const previous =
    buildComparisonRangeSnapshot(
      state,
      previousStart,
      previousEnd
    );

  return {
    period:
      "year",

    currentLabel:
      formatYearRangeLabel(
        currentStart,
        currentEnd
      ),

    previousLabel:
      formatYearRangeLabel(
        previousStart,
        previousEnd
      ),

    currentStartDate:
      formatLocalDate(
        currentStart
      ),

    currentEndDate:
      formatLocalDate(
        currentEnd
      ),

    previousStartDate:
      formatLocalDate(
        previousStart
      ),

    previousEndDate:
      formatLocalDate(
        previousEnd
      ),

    metrics:
      buildComparisonMetrics(
        current,
        previous
      ),
  };
}

// ==========================================
// Analytics Engine
// ==========================================

export class AnalyticsEngine {
  // ========================================
  // Overall
  // ========================================

  static getOverall(
    state: AnalyticsState
  ): OverallAnalytics {
    const totalTasks =
      state.tasks.length;

    const completedTasks =
      state.tasks.filter(
        (task) =>
          task.completed
      ).length;

    return {
      totalTasks,

      completedTasks,

      pendingTasks:
        totalTasks -
        completedTasks,

      completionRate:
        getCompletionRate(
          completedTasks,
          totalTasks
        ),

      xpEarned:
        getTotalXP(
          state.executionRecords
        ),
    };
  }

  // ========================================
  // Day
  // ========================================

  static getDay(
    state: AnalyticsState,
    date: Date = new Date()
  ): DailyAnalytics {
    const day =
      normalizeLocalDate(
        date
      );

    const dueTasks =
      getTasksDueOnDate(
        state.tasks,
        day
      );

    const completedDueTasks =
      dueTasks.filter(
        (task) =>
          task.completed
      ).length;

    const completedTaskIds =
      getCompletedTaskIdsForDay(
        state.tasks,
        state.executionRecords,
        day
      );

    return {
      date:
        formatLocalDate(
          day
        ),

      dueTasks:
        dueTasks.length,

      completedDueTasks,

      pendingTasks:
        dueTasks.length -
        completedDueTasks,

      completedTasks:
        completedTaskIds.size,

      completionRate:
        getCompletionRate(
          completedDueTasks,
          dueTasks.length
        ),

      xpEarned:
        getXPForRange(
          state.executionRecords,
          day,
          day
        ),
    };
  }

  // ========================================
  // Week
  // ========================================

  static getWeek(
    state: AnalyticsState,
    referenceDate:
      Date = new Date()
  ): WeeklyAnalytics {
    const weekStart =
      getMonday(
        referenceDate
      );

    const weekEnd =
      addDays(
        weekStart,
        6
      );

    const dueTasks =
      getTasksDueInRange(
        state.tasks,
        weekStart,
        weekEnd
      );

    const completedDueTasks =
      dueTasks.filter(
        (task) =>
          task.completed
      ).length;

    const completedTaskIds =
      getCompletedTaskIdsForRange(
        state.tasks,
        state.executionRecords,
        weekStart,
        weekEnd
      );

    return {
      weekStartDate:
        formatLocalDate(
          weekStart
        ),

      weekEndDate:
        formatLocalDate(
          weekEnd
        ),

      dueTasks:
        dueTasks.length,

      completedDueTasks,

      pendingTasks:
        dueTasks.length -
        completedDueTasks,

      completedTasks:
        completedTaskIds.size,

      completionRate:
        getCompletionRate(
          completedDueTasks,
          dueTasks.length
        ),

      xpEarned:
        getXPForRange(
          state.executionRecords,
          weekStart,
          weekEnd
        ),

      trend:
        buildDailyTrend(
          state.tasks,
          state.executionRecords,
          weekStart,
          weekEnd
        ),
    };
  }

  // ========================================
  // Month
  // ========================================

  static getMonth(
    state: AnalyticsState,
    referenceDate:
      Date = new Date()
  ): MonthlyAnalytics {
    const monthStart =
      getMonthStart(
        referenceDate
      );

    const monthEnd =
      getMonthEnd(
        referenceDate
      );

    const dueTasks =
      getTasksDueInRange(
        state.tasks,
        monthStart,
        monthEnd
      );

    const completedDueTasks =
      dueTasks.filter(
        (task) =>
          task.completed
      ).length;

    const completedTaskIds =
      getCompletedTaskIdsForRange(
        state.tasks,
        state.executionRecords,
        monthStart,
        monthEnd
      );

    const trend =
      buildDailyTrend(
        state.tasks,
        state.executionRecords,
        monthStart,
        monthEnd
      );

    const activeDays =
      trend.filter(
        (point) =>
          point.completedTasks >
            0 ||
          point.xpEarned >
            0
      ).length;

    return {
      monthStartDate:
        formatLocalDate(
          monthStart
        ),

      monthEndDate:
        formatLocalDate(
          monthEnd
        ),

      monthLabel:
        formatMonthLabel(
          monthStart
        ),

      dueTasks:
        dueTasks.length,

      completedDueTasks,

      pendingTasks:
        dueTasks.length -
        completedDueTasks,

      completedTasks:
        completedTaskIds.size,

      completionRate:
        getCompletionRate(
          completedDueTasks,
          dueTasks.length
        ),

      xpEarned:
        getXPForRange(
          state.executionRecords,
          monthStart,
          monthEnd
        ),

      activeDays,

      totalDays:
        monthEnd.getDate(),

      trend,

      weeks:
        buildMonthlyWeekTrend(
          state.tasks,
          state.executionRecords,
          monthStart,
          monthEnd
        ),
    };
  }

  // ========================================
  // Year
  // ========================================

  static getYear(
    state: AnalyticsState,
    referenceDate:
      Date = new Date()
  ): YearlyAnalytics {
    const yearStart =
      getYearStart(
        referenceDate
      );

    const yearEnd =
      getYearEnd(
        referenceDate
      );

    const dueTasks =
      getTasksDueInRange(
        state.tasks,
        yearStart,
        yearEnd
      );

    const completedDueTasks =
      dueTasks.filter(
        (task) =>
          task.completed
      ).length;

    const completedTaskIds =
      getCompletedTaskIdsForRange(
        state.tasks,
        state.executionRecords,
        yearStart,
        yearEnd
      );

    const months =
      buildYearMonthTrend(
        state,
        referenceDate
      );

    const activeDays =
      months.reduce(
        (
          total,
          month
        ) =>
          total +
          month.activeDays,
        0
      );

    const year =
      referenceDate.getFullYear();

    const leapYear =
      year % 4 === 0 &&
      (
        year % 100 !== 0 ||
        year % 400 === 0
      );

    return {
      year,

      yearStartDate:
        formatLocalDate(
          yearStart
        ),

      yearEndDate:
        formatLocalDate(
          yearEnd
        ),

      dueTasks:
        dueTasks.length,

      completedDueTasks,

      pendingTasks:
        dueTasks.length -
        completedDueTasks,

      completedTasks:
        completedTaskIds.size,

      completionRate:
        getCompletionRate(
          completedDueTasks,
          dueTasks.length
        ),

      xpEarned:
        getXPForRange(
          state.executionRecords,
          yearStart,
          yearEnd
        ),

      activeDays,

      totalDays:
        leapYear
          ? 366
          : 365,

      months,
    };
  }

  // ========================================
  // Effort
  // ========================================

  static getEffortDistribution(
    state:
      RelationshipAnalyticsState,
    start: Date,
    end: Date
  ): EffortDistributionAnalytics {
    return buildEffortDistribution(
      state,
      normalizeLocalDate(
        start
      ),
      normalizeLocalDate(
        end
      )
    );
  }

  static getDayEffort(
    state:
      RelationshipAnalyticsState,
    date: Date = new Date()
  ): EffortDistributionAnalytics {
    const day =
      normalizeLocalDate(
        date
      );

    return buildEffortDistribution(
      state,
      day,
      day
    );
  }

  static getWeekEffort(
    state:
      RelationshipAnalyticsState,
    referenceDate:
      Date = new Date()
  ): EffortDistributionAnalytics {
    const start =
      getMonday(
        referenceDate
      );

    return buildEffortDistribution(
      state,
      start,
      addDays(
        start,
        6
      )
    );
  }

  static getMonthEffort(
    state:
      RelationshipAnalyticsState,
    referenceDate:
      Date = new Date()
  ): EffortDistributionAnalytics {
    return buildEffortDistribution(
      state,
      getMonthStart(
        referenceDate
      ),
      getMonthEnd(
        referenceDate
      )
    );
  }

  static getYearEffort(
    state:
      RelationshipAnalyticsState,
    referenceDate:
      Date = new Date()
  ): EffortDistributionAnalytics {
    return buildEffortDistribution(
      state,
      getYearStart(
        referenceDate
      ),
      getYearEnd(
        referenceDate
      )
    );
  }

  // ========================================
  // Priority
  // ========================================

  static getPriorityExecution(
    state: AnalyticsState,
    start: Date,
    end: Date
  ): PriorityExecutionAnalytics {
    return buildPriorityExecution(
      state,
      normalizeLocalDate(
        start
      ),
      normalizeLocalDate(
        end
      )
    );
  }

  static getDayPriorityExecution(
    state: AnalyticsState,
    date: Date = new Date()
  ): PriorityExecutionAnalytics {
    const day =
      normalizeLocalDate(
        date
      );

    return buildPriorityExecution(
      state,
      day,
      day
    );
  }

  static getWeekPriorityExecution(
    state: AnalyticsState,
    referenceDate:
      Date = new Date()
  ): PriorityExecutionAnalytics {
    const start =
      getMonday(
        referenceDate
      );

    return buildPriorityExecution(
      state,
      start,
      addDays(
        start,
        6
      )
    );
  }

  static getMonthPriorityExecution(
    state: AnalyticsState,
    referenceDate:
      Date = new Date()
  ): PriorityExecutionAnalytics {
    return buildPriorityExecution(
      state,
      getMonthStart(
        referenceDate
      ),
      getMonthEnd(
        referenceDate
      )
    );
  }

  static getYearPriorityExecution(
    state: AnalyticsState,
    referenceDate:
      Date = new Date()
  ): PriorityExecutionAnalytics {
    return buildPriorityExecution(
      state,
      getYearStart(
        referenceDate
      ),
      getYearEnd(
        referenceDate
      )
    );
  }

  // ========================================
  // XP Breakdown
  // ========================================

  static getXPBreakdown(
    state: AnalyticsState,
    start: Date,
    end: Date
  ): XPBreakdownAnalytics {
    return buildXPBreakdown(
      state,
      normalizeLocalDate(
        start
      ),
      normalizeLocalDate(
        end
      )
    );
  }

  static getDayXPBreakdown(
    state: AnalyticsState,
    date: Date = new Date()
  ): XPBreakdownAnalytics {
    const day =
      normalizeLocalDate(
        date
      );

    return buildXPBreakdown(
      state,
      day,
      day
    );
  }

  static getWeekXPBreakdown(
    state: AnalyticsState,
    referenceDate:
      Date = new Date()
  ): XPBreakdownAnalytics {
    const start =
      getMonday(
        referenceDate
      );

    return buildXPBreakdown(
      state,
      start,
      addDays(
        start,
        6
      )
    );
  }

  static getMonthXPBreakdown(
    state: AnalyticsState,
    referenceDate:
      Date = new Date()
  ): XPBreakdownAnalytics {
    return buildXPBreakdown(
      state,
      getMonthStart(
        referenceDate
      ),
      getMonthEnd(
        referenceDate
      )
    );
  }

  static getYearXPBreakdown(
    state: AnalyticsState,
    referenceDate:
      Date = new Date()
  ): XPBreakdownAnalytics {
    return buildXPBreakdown(
      state,
      getYearStart(
        referenceDate
      ),
      getYearEnd(
        referenceDate
      )
    );
  }

  // ========================================
  // Personal Bests
  // ========================================

  static getPersonalBests(
    state: AnalyticsState,
    referenceDate:
      Date = new Date()
  ): PersonalBestsAnalytics {
    return buildPersonalBests(
      state,
      referenceDate
    );
  }

  // ========================================
  // Comparison
  // ========================================

  static getDayComparison(
    state: AnalyticsState,
    referenceDate:
      Date = new Date()
  ): PeriodComparisonAnalytics {
    return buildDayComparison(
      state,
      referenceDate
    );
  }

  static getWeekComparison(
    state: AnalyticsState,
    referenceDate:
      Date = new Date()
  ): PeriodComparisonAnalytics {
    return buildWeekComparison(
      state,
      referenceDate
    );
  }

  static getMonthComparison(
    state: AnalyticsState,
    referenceDate:
      Date = new Date()
  ): PeriodComparisonAnalytics {
    return buildMonthComparison(
      state,
      referenceDate
    );
  }

  static getYearComparison(
    state: AnalyticsState,
    referenceDate:
      Date = new Date()
  ): PeriodComparisonAnalytics {
    return buildYearComparison(
      state,
      referenceDate
    );
  }

  // ========================================
  // Snapshot
  // ========================================

  static analyze(
    state: AnalyticsState,
    referenceDate:
      Date = new Date()
  ): AnalyticsSnapshot {
    return {
      overall:
        this.getOverall(
          state
        ),

      today:
        this.getDay(
          state,
          referenceDate
        ),

      week:
        this.getWeek(
          state,
          referenceDate
        ),

      month:
        this.getMonth(
          state,
          referenceDate
        ),

      year:
        this.getYear(
          state,
          referenceDate
        ),
    };
  }
}