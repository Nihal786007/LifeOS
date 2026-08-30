// ==========================================
// LifeOS Analytics Engine
// Version: 1.0
// ==========================================
//
// Canonical read/computation engine for
// LifeOS productivity analytics.
//
// Responsibilities:
// - Analyze current task state
// - Analyze execution history
// - Produce daily analytics
// - Produce calendar-week analytics
// - Produce real daily completion trends
// - Derive XP for exact periods
//
// IMPORTANT:
// - Pure computation only
// - No React
// - No localStorage
// - No context ownership
// - Calendar weeks are Monday -> Sunday
// - YYYY-MM-DD task dates are interpreted locally
// ==========================================

import type {
  ExecutionRecord,
} from "../shared/execution";

import type {
  Task,
} from "../shared/types";

// ==========================================
// Public Types
// ==========================================

export interface AnalyticsState {
  tasks: Task[];

  executionRecords: ExecutionRecord[];
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

  trend: DailyCompletionTrendPoint[];
}

export interface DailyCompletionTrendPoint {
  date: string;

  label: string;

  completedTasks: number;

  xpEarned: number;
}

export interface AnalyticsSnapshot {
  overall: OverallAnalytics;

  today: DailyAnalytics;

  week: WeeklyAnalytics;
}

// ==========================================
// Internal Date Helpers
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
  const normalized =
    new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate()
    );

  normalized.setHours(
    0,
    0,
    0,
    0
  );

  return normalized;
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

function getMonday(
  date: Date
): Date {
  const normalized =
    normalizeLocalDate(
      date
    );

  const day =
    normalized.getDay();

  const distanceFromMonday =
    day === 0
      ? 6
      : day - 1;

  return addDays(
    normalized,
    -distanceFromMonday
  );
}

function isWithinRange(
  date: Date,
  start: Date,
  end: Date
): boolean {
  const timestamp =
    normalizeLocalDate(
      date
    ).getTime();

  return (
    timestamp >=
      start.getTime() &&
    timestamp <=
      end.getTime()
  );
}

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
  if (
    !task.completedAt
  ) {
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

function getCompletionRate(
  completed: number,
  total: number
): number {
  if (
    total <= 0
  ) {
    return 0;
  }

  return Math.round(
    (
      completed /
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
  executionRecords: ExecutionRecord[]
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
  executionRecords: ExecutionRecord[],
  start: Date,
  end: Date
): number {
  return executionRecords.reduce(
    (
      total,
      record
    ) => {
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

// ==========================================
// Completion Helpers
// ==========================================

function getCompletedTaskIdsForRange(
  tasks: Task[],
  executionRecords: ExecutionRecord[],
  start: Date,
  end: Date
): Set<number> {
  const completedIds =
    new Set<number>();

  // ========================================
  // Canonical historical source:
  // execution ledger
  // ========================================

  executionRecords.forEach(
    (record) => {
      if (
        record.type !==
        "task_completed"
      ) {
        return;
      }

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

      completedIds.add(
        record.entityId
      );
    }
  );

  // ========================================
  // Fallback:
  // current task completedAt
  //
  // Supports tasks created before complete
  // execution-history coverage existed.
  // ========================================

  tasks.forEach(
    (task) => {
      if (
        !task.completed ||
        !task.completedAt
      ) {
        return;
      }

      const completedDate =
        getTaskCompletedDate(
          task
        );

      if (
        !completedDate ||
        !isWithinRange(
          completedDate,
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
  executionRecords: ExecutionRecord[],
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
// Due-Date Helpers
// ==========================================

function getTasksDueOnDate(
  tasks: Task[],
  date: Date
): Task[] {
  const targetDate =
    formatLocalDate(
      date
    );

  return tasks.filter(
    (task) =>
      task.dueDate ===
      targetDate
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
// Trend Helpers
// ==========================================

function buildDailyTrend(
  tasks: Task[],
  executionRecords: ExecutionRecord[],
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

    const xpEarned =
      getXPForRange(
        executionRecords,
        cursor,
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

      xpEarned,
    });

    cursor =
      addDays(
        cursor,
        1
      );
  }

  return points;
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

    const pendingTasks =
      totalTasks -
      completedTasks;

    return {
      totalTasks,

      completedTasks,

      pendingTasks,

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
  // Daily
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
      );

    const pendingTasks =
      dueTasks.filter(
        (task) =>
          !task.completed
      );

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

      completedDueTasks:
        completedDueTasks.length,

      pendingTasks:
        pendingTasks.length,

      completedTasks:
        completedTaskIds.size,

      completionRate:
        getCompletionRate(
          completedDueTasks.length,
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
  // Current Calendar Week
  // ========================================

  static getWeek(
    state: AnalyticsState,
    referenceDate: Date = new Date()
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
      );

    const pendingTasks =
      dueTasks.filter(
        (task) =>
          !task.completed
      );

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

      completedDueTasks:
        completedDueTasks.length,

      pendingTasks:
        pendingTasks.length,

      completedTasks:
        completedTaskIds.size,

      completionRate:
        getCompletionRate(
          completedDueTasks.length,
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
  // Snapshot
  // ========================================

  static analyze(
    state: AnalyticsState,
    referenceDate: Date = new Date()
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
    };
  }
}