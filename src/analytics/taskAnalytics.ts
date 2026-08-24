import type {
  ExecutionRecord,
} from "../shared/execution";

import type {
  Task,
} from "../shared/types";

export interface TaskAnalytics {
  totalTasks: number;
  completedTasks: number;
  pendingTasks: number;
  completionRate: number;
  xpEarned: number;
}

export interface PeriodAnalytics {
  completedTasks: number;
  pendingTasks: number;
  xpEarned: number;
}

export interface TrendPoint {
  label: string;
  value: number;
}

// ==========================================
// XP Helpers
// ==========================================

function getTaskXP(
  executionRecords: ExecutionRecord[]
): number {
  return executionRecords
    .filter(
      (record) =>
        record.type ===
        "task_completed"
    )
    .reduce(
      (total, record) =>
        total +
        Math.max(
          0,
          Number.isFinite(
            record.xpAwarded
          )
            ? record.xpAwarded
            : 0
        ),
      0
    );
}

function getTaskXPForPeriod(
  executionRecords: ExecutionRecord[],
  predicate: (
    record: ExecutionRecord
  ) => boolean
): number {
  return executionRecords
    .filter(
      (record) =>
        record.type ===
          "task_completed" &&
        predicate(record)
    )
    .reduce(
      (total, record) =>
        total +
        Math.max(
          0,
          Number.isFinite(
            record.xpAwarded
          )
            ? record.xpAwarded
            : 0
        ),
      0
    );
}

// ==========================================
// Overall Task Analytics
// ==========================================

export function getTaskAnalytics(
  tasks: Task[],
  executionRecords: ExecutionRecord[] = []
): TaskAnalytics {
  const totalTasks =
    tasks.length;

  const completedTasks =
    tasks.filter(
      (task) =>
        task.completed
    ).length;

  const pendingTasks =
    totalTasks -
    completedTasks;

  const completionRate =
    totalTasks === 0
      ? 0
      : Math.round(
          (
            completedTasks /
            totalTasks
          ) * 100
        );

  const xpEarned =
    getTaskXP(
      executionRecords
    );

  return {
    totalTasks,
    completedTasks,
    pendingTasks,
    completionRate,
    xpEarned,
  };
}

// ==========================================
// Date Helpers
// ==========================================

function isSameDay(
  date1: Date,
  date2: Date
): boolean {
  return (
    date1.getFullYear() ===
      date2.getFullYear() &&
    date1.getMonth() ===
      date2.getMonth() &&
    date1.getDate() ===
      date2.getDate()
  );
}

// ==========================================
// Today Analytics
// ==========================================

export function getTodayAnalytics(
  tasks: Task[],
  executionRecords: ExecutionRecord[] = []
): PeriodAnalytics {
  const today =
    new Date();

  const completedToday =
    tasks.filter(
      (task) =>
        task.completed &&
        task.completedAt &&
        isSameDay(
          new Date(
            task.completedAt
          ),
          today
        )
    );

  const pendingToday =
    tasks.filter(
      (task) =>
        !task.completed &&
        task.dueDate &&
        isSameDay(
          new Date(
            task.dueDate
          ),
          today
        )
    );

  const xpEarned =
    getTaskXPForPeriod(
      executionRecords,
      (record) =>
        isSameDay(
          new Date(
            record.createdAt
          ),
          today
        )
    );

  return {
    completedTasks:
      completedToday.length,

    pendingTasks:
      pendingToday.length,

    xpEarned,
  };
}

// ==========================================
// Weekly Analytics
// ==========================================

export function getWeeklyAnalytics(
  tasks: Task[],
  executionRecords: ExecutionRecord[] = []
): PeriodAnalytics {
  const today =
    new Date();

  const weekAgo =
    new Date();

  weekAgo.setDate(
    today.getDate() - 7
  );

  const completedWeek =
    tasks.filter(
      (task) =>
        task.completed &&
        task.completedAt &&
        new Date(
          task.completedAt
        ) >= weekAgo
    );

  const pendingWeek =
    tasks.filter(
      (task) =>
        !task.completed &&
        task.dueDate &&
        new Date(
          task.dueDate
        ) >= weekAgo
    );

  const xpEarned =
    getTaskXPForPeriod(
      executionRecords,
      (record) =>
        new Date(
          record.createdAt
        ) >= weekAgo
    );

  return {
    completedTasks:
      completedWeek.length,

    pendingTasks:
      pendingWeek.length,

    xpEarned,
  };
}

// ==========================================
// Completion Trend
// ==========================================

export function getCompletionTrend(
  tasks: Task[]
): TrendPoint[] {
  const days = [
    "Mon",
    "Tue",
    "Wed",
    "Thu",
    "Fri",
    "Sat",
    "Sun",
  ];

  return days.map(
    (day) => ({
      label: day,

      value:
        tasks.filter(
          (task) =>
            task.completed
        ).length,
    })
  );
}