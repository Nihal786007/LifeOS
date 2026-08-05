import type { Task } from "../shared/types";

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

export function getTaskAnalytics(
  tasks: Task[]
): TaskAnalytics {
  const totalTasks = tasks.length;

  const completedTasks = tasks.filter(
    (task) => task.completed
  ).length;

  const pendingTasks =
    totalTasks - completedTasks;

  const completionRate =
    totalTasks === 0
      ? 0
      : Math.round(
          (completedTasks / totalTasks) * 100
        );

  const xpEarned = tasks
    .filter((task) => task.completed)
    .reduce(
      (total, task) => total + task.xp,
      0
    );

  return {
    totalTasks,
    completedTasks,
    pendingTasks,
    completionRate,
    xpEarned,
  };
}

function isSameDay(
  date1: Date,
  date2: Date
) {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
}

export function getTodayAnalytics(
  tasks: Task[]
): PeriodAnalytics {
  const today = new Date();

  const completedToday = tasks.filter(
    (task) =>
      task.completed &&
      task.completedAt &&
      isSameDay(
        new Date(task.completedAt),
        today
      )
  );

  const pendingToday = tasks.filter(
    (task) =>
      !task.completed &&
      task.dueDate &&
      isSameDay(
        new Date(task.dueDate),
        today
      )
  );

  return {
    completedTasks: completedToday.length,
    pendingTasks: pendingToday.length,
    xpEarned: completedToday.reduce(
      (sum, task) => sum + task.xp,
      0
    ),
  };
}

export function getWeeklyAnalytics(
  tasks: Task[]
): PeriodAnalytics {
  const today = new Date();

  const weekAgo = new Date();

  weekAgo.setDate(today.getDate() - 7);

  const completedWeek = tasks.filter(
    (task) =>
      task.completed &&
      task.completedAt &&
      new Date(task.completedAt) >= weekAgo
  );

  const pendingWeek = tasks.filter(
    (task) =>
      !task.completed &&
      task.dueDate &&
      new Date(task.dueDate) >= weekAgo
  );

  return {
    completedTasks: completedWeek.length,
    pendingTasks: pendingWeek.length,
    xpEarned: completedWeek.reduce(
      (sum, task) => sum + task.xp,
      0
    ),
  };
}

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

  return days.map((day) => ({
    label: day,
    value: tasks.filter(
      (task) => task.completed
    ).length,
  }));
}