// ==========================================
// LifeOS Review Engine
// Version: 1.0
// ==========================================
//
// Pure read-only composition over existing trusted
// LifeOS state and analytics. This engine owns no
// persistence and introduces no new factual authority.
// ==========================================

import {
  AnalyticsEngine,
} from "../engines/AnalyticsEngine.ts";

import {
  HabitEngine,
} from "../engines/HabitEngine.ts";

import type {
  HabitState,
} from "../shared/habits.ts";

import type {
  ExecutionRecord,
} from "../shared/execution.ts";

import type {
  LifeGoal,
  MonthlyTarget,
  Task,
  WeeklyTarget,
} from "../shared/types.ts";

export type ReviewPeriod =
  | "daily"
  | "weekly"
  | "monthly";

export type ReviewTrendDirection =
  | "up"
  | "down"
  | "same"
  | "unavailable";

export interface ReviewSourceState {
  tasks: Task[];
  habitState: HabitState;
  executionRecords: ExecutionRecord[];
  lifeGoals: LifeGoal[];
  monthlyOutcomes: MonthlyTarget[];
  weeklyFocuses: WeeklyTarget[];
}

export interface ReviewPeriodRange {
  startDate: string;
  endDate: string;
  measuredThroughDate: string;
  label: string;
}

export interface ReviewTaskSummary {
  completed: number;
  due: number;
  completedDue: number;
  unfinishedDue: number;
  overdue: number;
  carryForward: Array<{
    id: number;
    title: string;
    dueDate: string;
  }>;
}

export interface ReviewHabitSummary {
  scheduled: number;
  completed: number;
  missed: number;
  completionRate: number;
}

export interface ReviewTrend {
  direction: ReviewTrendDirection;
  currentValue: number;
  previousValue: number;
  delta: number;
}

export interface ReviewPlanningSummary {
  status:
    | "available"
    | "partial"
    | "unavailable";
  label: string;
  active: number;
  completed: number;
  focus?: string;
  carryForward: string[];
  unavailableReason?: string;
}

export interface ReviewReport {
  version: "1.0";
  period: ReviewPeriod;
  range: ReviewPeriodRange;
  tasks: ReviewTaskSummary;
  habits: ReviewHabitSummary;
  xpEarned: number;
  executionCount: number;
  taskTrend: ReviewTrend;
  planning: ReviewPlanningSummary;
  wentWell: string[];
  slipped: string[];
  carryForward: string[];
}

interface DateRange {
  start: Date;
  end: Date;
}

function normalizeLocalDate(
  date: Date
): Date {
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate()
  );
}

function formatLocalDate(
  date: Date
): string {
  return [
    date.getFullYear(),
    String(
      date.getMonth() + 1
    ).padStart(2, "0"),
    String(
      date.getDate()
    ).padStart(2, "0"),
  ].join("-");
}

function parseLocalDate(
  value: string
): Date | undefined {
  const match =
    /^(\d{4})-(\d{2})-(\d{2})$/.exec(
      value
    );

  if (!match) {
    return undefined;
  }

  const date = new Date(
    Number(match[1]),
    Number(match[2]) - 1,
    Number(match[3])
  );

  if (
    date.getFullYear() !== Number(match[1]) ||
    date.getMonth() !== Number(match[2]) - 1 ||
    date.getDate() !== Number(match[3])
  ) {
    return undefined;
  }

  return normalizeLocalDate(
    date
  );
}

function addDays(
  date: Date,
  amount: number
): Date {
  const result =
    normalizeLocalDate(
      date
    );

  result.setDate(
    result.getDate() + amount
  );

  return result;
}

function getMonday(
  date: Date
): Date {
  const normalized =
    normalizeLocalDate(
      date
    );

  const offset =
    normalized.getDay() === 0
      ? -6
      : 1 - normalized.getDay();

  return addDays(
    normalized,
    offset
  );
}

function getPeriodRange(
  period: ReviewPeriod,
  referenceDate: Date
): DateRange {
  const reference =
    normalizeLocalDate(
      referenceDate
    );

  if (period === "weekly") {
    const start =
      getMonday(
        reference
      );

    return {
      start,
      end: addDays(start, 6),
    };
  }

  if (period === "monthly") {
    return {
      start: new Date(
        reference.getFullYear(),
        reference.getMonth(),
        1
      ),
      end: new Date(
        reference.getFullYear(),
        reference.getMonth() + 1,
        0
      ),
    };
  }

  return {
    start: reference,
    end: reference,
  };
}

function getMeasuredThroughDate(
  range: DateRange,
  today: Date
): Date {
  const current =
    normalizeLocalDate(
      today
    );

  if (
    current.getTime() <
    range.start.getTime()
  ) {
    return addDays(
      range.start,
      -1
    );
  }

  if (
    current.getTime() >
    range.end.getTime()
  ) {
    return range.end;
  }

  return current;
}

function getPeriodLabel(
  period: ReviewPeriod,
  range: DateRange
): string {
  if (period === "daily") {
    return range.start.toLocaleDateString(
      undefined,
      {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
      }
    );
  }

  if (period === "monthly") {
    return range.start.toLocaleDateString(
      undefined,
      {
        month: "long",
        year: "numeric",
      }
    );
  }

  return `${range.start.toLocaleDateString(
    undefined,
    {
      month: "short",
      day: "numeric",
    }
  )} – ${range.end.toLocaleDateString(
    undefined,
    {
      month: "short",
      day: "numeric",
      year: "numeric",
    }
  )}`;
}

function isDateInRange(
  value: string,
  startDate: string,
  endDate: string
): boolean {
  return (
    value >= startDate &&
    value <= endDate
  );
}

function getRecordDate(
  record: ExecutionRecord
): string | undefined {
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

  return formatLocalDate(
    date
  );
}

function buildHabitSummary(
  habitState: HabitState,
  startDate: string,
  measuredThroughDate: string
): ReviewHabitSummary {
  if (
    measuredThroughDate <
    startDate
  ) {
    return {
      scheduled: 0,
      completed: 0,
      missed: 0,
      completionRate: 0,
    };
  }

  const totals =
    habitState.habits.reduce(
      (summary, habit) => {
        const analytics =
          HabitEngine.getPeriodAnalytics(
            habitState,
            habit.id,
            startDate,
            measuredThroughDate
          );

        return {
          scheduled:
            summary.scheduled +
            analytics.scheduledDays,
          completed:
            summary.completed +
            analytics.completedDays,
        };
      },
      {
        scheduled: 0,
        completed: 0,
      }
    );

  return {
    ...totals,
    missed:
      totals.scheduled -
      totals.completed,
    completionRate:
      totals.scheduled === 0
        ? 0
        : Math.round(
            (
              totals.completed /
              totals.scheduled
            ) * 100
          ),
  };
}

function buildTaskSummary(
  state: ReviewSourceState,
  period: ReviewPeriod,
  completed: number,
  due: number,
  completedDue: number,
  startDate: string,
  measuredThroughDate: string
): ReviewTaskSummary {
  const unfinished =
    measuredThroughDate < startDate
      ? []
      : state.tasks
          .filter(
            (task) =>
              !task.completed &&
              Boolean(task.dueDate) &&
              (
                period === "daily" ||
                task.dueDate! >= startDate
              ) &&
              task.dueDate! <= measuredThroughDate
          )
          .sort((left, right) => {
            const dateOrder =
              left.dueDate!.localeCompare(
                right.dueDate!
              );

            return dateOrder !== 0
              ? dateOrder
              : left.id - right.id;
          });

  return {
    completed,
    due,
    completedDue,
    unfinishedDue:
      unfinished.length,
    overdue:
      unfinished.filter(
        (task) =>
          task.dueDate! <
          measuredThroughDate
      ).length,
    carryForward:
      unfinished
        .slice(0, 4)
        .map((task) => ({
          id: task.id,
          title: task.title,
          dueDate: task.dueDate!,
        })),
  };
}

function buildTrend(
  state: ReviewSourceState,
  period: ReviewPeriod,
  referenceDate: Date
): ReviewTrend {
  if (period === "daily") {
    return {
      direction: "unavailable",
      currentValue: 0,
      previousValue: 0,
      delta: 0,
    };
  }

  const analyticsState = {
    tasks: state.tasks,
    executionRecords:
      state.executionRecords,
  };

  const comparison =
    period === "weekly"
      ? AnalyticsEngine.getWeekComparison(
          analyticsState,
          referenceDate
        )
      : AnalyticsEngine.getMonthComparison(
          analyticsState,
          referenceDate
        );

  const metric =
    comparison.metrics.find(
      (item) =>
        item.key ===
        "completed_tasks"
    );

  if (!metric) {
    return {
      direction: "unavailable",
      currentValue: 0,
      previousValue: 0,
      delta: 0,
    };
  }

  return {
    direction: metric.direction,
    currentValue:
      metric.currentValue,
    previousValue:
      metric.previousValue,
    delta: metric.delta,
  };
}

function buildPlanningSummary(
  state: ReviewSourceState,
  period: ReviewPeriod,
  startDate: string,
  endDate: string
): ReviewPlanningSummary {
  if (period === "monthly") {
    const start =
      parseLocalDate(
        startDate
      );

    if (!start) {
      return {
        status: "unavailable",
        label: "Monthly Outcomes",
        active: 0,
        completed: 0,
        carryForward: [],
        unavailableReason:
          "Monthly planning dates are unavailable.",
      };
    }

    const outcomes =
      state.monthlyOutcomes
        .filter(
          (outcome) =>
            outcome.month ===
              start.getMonth() + 1 &&
            outcome.year ===
              start.getFullYear()
        )
        .sort(
          (left, right) =>
            left.id - right.id
        );

    return {
      status: "available",
      label: "Monthly Outcomes",
      active:
        outcomes.filter(
          (outcome) =>
            !outcome.completed
        ).length,
      completed:
        outcomes.filter(
          (outcome) =>
            outcome.completed
        ).length,
      focus:
        outcomes.find(
          (outcome) =>
            !outcome.completed
        )?.title,
      carryForward:
        outcomes
          .filter(
            (outcome) =>
              !outcome.completed
          )
          .slice(0, 3)
          .map(
            (outcome) =>
              outcome.title
          ),
    };
  }

  const dated: WeeklyTarget[] = [];
  let legacyCount = 0;

  state.weeklyFocuses.forEach(
    (focus) => {
      if (
        !focus.weekStartDate ||
        !focus.weekEndDate ||
        !parseLocalDate(
          focus.weekStartDate
        ) ||
        !parseLocalDate(
          focus.weekEndDate
        )
      ) {
        legacyCount += 1;
        return;
      }

      if (
        focus.weekStartDate <=
          endDate &&
        focus.weekEndDate >=
          startDate
      ) {
        dated.push(
          focus
        );
      }
    }
  );

  dated.sort(
    (left, right) =>
      left.id - right.id
  );

  const status =
    legacyCount > 0
      ? dated.length > 0
        ? "partial"
        : "unavailable"
      : "available";

  return {
    status,
    label:
      period === "daily"
        ? "Planning focus"
        : "Weekly Focus",
    active:
      dated.filter(
        (focus) =>
          !focus.completed
      ).length,
    completed:
      dated.filter(
        (focus) =>
          focus.completed
      ).length,
    focus:
      dated.find(
        (focus) =>
          !focus.completed
      )?.title ??
      dated[0]?.title,
    carryForward:
      dated
        .filter(
          (focus) =>
            !focus.completed
        )
        .slice(0, 3)
        .map(
          (focus) =>
            focus.title
        ),
    unavailableReason:
      legacyCount > 0
        ? `${legacyCount} legacy Weekly Focus ${
            legacyCount === 1
              ? "item has"
              : "items have"
          } no calendar dates and cannot be included.`
        : undefined,
  };
}

function buildWentWell(
  tasks: ReviewTaskSummary,
  habits: ReviewHabitSummary,
  xpEarned: number,
  planning: ReviewPlanningSummary
): string[] {
  const signals: string[] = [];

  if (tasks.completed > 0) {
    signals.push(
      `${tasks.completed} ${
        tasks.completed === 1
          ? "task"
          : "tasks"
      } completed.`
    );
  }

  if (habits.completed > 0) {
    signals.push(
      `${habits.completed} of ${habits.scheduled} scheduled habit check-ins completed.`
    );
  }

  if (xpEarned > 0) {
    signals.push(
      `${xpEarned} XP earned from recorded execution.`
    );
  }

  if (planning.completed > 0) {
    signals.push(
      `${planning.completed} ${planning.label.toLowerCase()} ${
        planning.completed === 1
          ? "item"
          : "items"
      } completed.`
    );
  }

  return signals;
}

function buildSlipped(
  tasks: ReviewTaskSummary,
  habits: ReviewHabitSummary
): string[] {
  const signals: string[] = [];

  if (
    tasks.unfinishedDue > 0 &&
    tasks.overdue > 0
  ) {
    signals.push(
      `${tasks.unfinishedDue} due ${
        tasks.unfinishedDue === 1
          ? "task remains"
          : "tasks remain"
      } unfinished, including ${tasks.overdue} overdue.`
    );
  } else if (
    tasks.unfinishedDue > 0
  ) {
    signals.push(
      `${tasks.unfinishedDue} due ${
        tasks.unfinishedDue === 1
          ? "task remains"
          : "tasks remain"
      } unfinished.`
    );
  }

  if (habits.missed > 0) {
    signals.push(
      `${habits.missed} scheduled habit ${
        habits.missed === 1
          ? "check-in was"
          : "check-ins were"
      } not completed.`
    );
  }

  return signals;
}

export class ReviewEngine {
  static build(
    state: ReviewSourceState,
    period: ReviewPeriod,
    referenceDate: Date,
    today: Date = new Date()
  ): ReviewReport {
    const range =
      getPeriodRange(
        period,
        referenceDate
      );

    const measuredThrough =
      getMeasuredThroughDate(
        range,
        today
      );

    const startDate =
      formatLocalDate(
        range.start
      );

    const endDate =
      formatLocalDate(
        range.end
      );

    const measuredThroughDate =
      formatLocalDate(
        measuredThrough
      );

    const analyticsState = {
      tasks: state.tasks,
      executionRecords:
        state.executionRecords,
    };

    const analytics =
      period === "daily"
        ? AnalyticsEngine.getDay(
            analyticsState,
            referenceDate
          )
        : period === "weekly"
          ? AnalyticsEngine.getWeek(
              analyticsState,
              referenceDate
            )
          : AnalyticsEngine.getMonth(
              analyticsState,
              referenceDate
            );

    const tasks =
      buildTaskSummary(
        state,
        period,
        analytics.completedTasks,
        analytics.dueTasks,
        analytics.completedDueTasks,
        startDate,
        measuredThroughDate
      );

    const habits =
      buildHabitSummary(
        state.habitState,
        startDate,
        measuredThroughDate
      );

    const planning =
      buildPlanningSummary(
        state,
        period,
        startDate,
        endDate
      );

    const carryForward = [
      ...tasks.carryForward.map(
        (task) =>
          `${task.title} · due ${task.dueDate}`
      ),
      ...planning.carryForward.map(
        (title) =>
          `${planning.label}: ${title}`
      ),
    ].slice(0, 5);

    return {
      version: "1.0",
      period,
      range: {
        startDate,
        endDate,
        measuredThroughDate,
        label:
          getPeriodLabel(
            period,
            range
          ),
      },
      tasks,
      habits,
      xpEarned:
        analytics.xpEarned,
      executionCount:
        state.executionRecords.filter(
          (record) => {
            const date =
              getRecordDate(
                record
              );

            return Boolean(
              date &&
              measuredThroughDate >=
                startDate &&
              isDateInRange(
                date,
                startDate,
                measuredThroughDate
              )
            );
          }
        ).length,
      taskTrend:
        buildTrend(
          state,
          period,
          referenceDate
        ),
      planning,
      wentWell:
        buildWentWell(
          tasks,
          habits,
          analytics.xpEarned,
          planning
        ),
      slipped:
        buildSlipped(
          tasks,
          habits
        ),
      carryForward,
    };
  }
}
