import { HabitEngine } from "../engines/HabitEngine.ts";
import type { AtlasRankedTask } from "../atlas/priority/types.ts";
import type { AtlasCanonicalState } from "../atlas/state/types.ts";
import type { TaskPriority } from "../shared/types.ts";

export type DailyTaskStatus = "overdue" | "today" | "active" | "completed";

export interface DailyTaskItem {
  id: number;
  title: string;
  priority: TaskPriority;
  status: DailyTaskStatus;
  dueDate?: string;
  weeklyFocus?: string;
  monthlyOutcome?: string;
  lifeGoal?: string;
}

export interface DailyPriorityItem extends DailyTaskItem {
  rank: number;
  tier: AtlasRankedTask["tier"];
  reasons: readonly string[];
}

export interface DailyHabitItem { id: number; name: string; completed: boolean }
export interface PlanningChain { lifeGoal?: string; monthlyOutcome?: string; weeklyFocus?: string }

export interface DailyCommandCenterModel {
  dateKey: string;
  dateLabel: string;
  greeting: string;
  summary: { tasks: number; tasksCompleted: number; habitsDue: number; habitsCompleted: number; xp: number };
  priorities: readonly DailyPriorityItem[];
  tasks: readonly DailyTaskItem[];
  habits: readonly DailyHabitItem[];
  planning: readonly PlanningChain[];
  progress: { tasksCompleted: number; habitsCompleted: number; xpEarned: number; executionCount: number };
  isEmpty: boolean;
}

function dateKey(value: string): string | undefined {
  const local = /^(\d{4}-\d{2}-\d{2})/.exec(value);
  if (local) return local[1];
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return undefined;
  return [parsed.getFullYear(), String(parsed.getMonth() + 1).padStart(2, "0"), String(parsed.getDate()).padStart(2, "0")].join("-");
}

function getGreeting(capturedAt: string, displayName: string, timezone: string): string {
  let hour = new Date(capturedAt).getHours();
  try {
    const part = new Intl.DateTimeFormat("en-US", { hour: "numeric", hourCycle: "h23", timeZone: timezone })
      .formatToParts(new Date(capturedAt)).find((item) => item.type === "hour");
    if (part) hour = Number(part.value);
  } catch {
    // Invalid legacy timezone values must not break the Dashboard.
  }
  const salutation = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const firstName = displayName.trim().split(/\s+/)[0];
  return firstName ? `${salutation}, ${firstName}` : salutation;
}

function compareTasks(a: DailyTaskItem, b: DailyTaskItem): number {
  const statusOrder: Record<DailyTaskStatus, number> = { overdue: 0, today: 1, active: 2, completed: 3 };
  const priorityOrder: Record<TaskPriority, number> = { high: 0, medium: 1, low: 2 };
  return statusOrder[a.status] - statusOrder[b.status] || priorityOrder[a.priority] - priorityOrder[b.priority] || a.title.localeCompare(b.title) || a.id - b.id;
}

export function buildDailyCommandCenter(
  state: AtlasCanonicalState,
  rankedTasks: readonly AtlasRankedTask[]
): DailyCommandCenterModel {
  const today = dateKey(state.capturedAt) ?? state.capturedAt.slice(0, 10);
  const capturedDate = new Date(state.capturedAt);
  const weeklyById = new Map(state.weeklyTargets.map((item) => [item.id, item]));
  const monthlyById = new Map(state.monthlyTargets.map((item) => [item.id, item]));
  const goalsById = new Map(state.lifeGoals.map((item) => [item.id, item]));

  const toTaskItem = (task: AtlasCanonicalState["tasks"][number]): DailyTaskItem => {
    const weekly = task.weeklyTargetId === undefined ? undefined : weeklyById.get(task.weeklyTargetId);
    const monthly = weekly?.monthlyTargetId === undefined ? undefined : monthlyById.get(weekly.monthlyTargetId);
    const goal = monthly?.goalId === undefined ? undefined : goalsById.get(monthly.goalId);
    const completedToday = task.completed && dateKey(task.completedAt ?? "") === today;
    const due = task.dueDate ? dateKey(task.dueDate) : undefined;
    return {
      id: task.id,
      title: task.title,
      priority: task.priority,
      status: completedToday
        ? "completed"
        : due && due < today
          ? "overdue"
          : due === today
            ? "today"
            : "active",
      ...(due ? { dueDate: due } : {}),
      ...(weekly ? { weeklyFocus: weekly.title } : {}),
      ...(monthly ? { monthlyOutcome: monthly.title } : {}),
      ...(goal ? { lifeGoal: goal.title } : {}),
    };
  };

  const tasks = state.tasks
    .filter((task) => {
      if (task.completed) return dateKey(task.completedAt ?? "") === today;
      const due = task.dueDate ? dateKey(task.dueDate) : undefined;
      return due !== undefined && due <= today;
    })
    .map(toTaskItem)
    .sort(compareTasks);

  const taskMap = new Map(state.tasks.map((task) => [task.id, task]));
  const priorities = rankedTasks.slice(0, 3).flatMap((ranked) => {
    const task = taskMap.get(ranked.taskId);
    return !task || task.completed ? [] : [{ ...toTaskItem(task), rank: ranked.rank, tier: ranked.tier, reasons: ranked.reasons }];
  });

  const habitState = { habits: [...state.habitDefinitions], completions: [...state.habitCompletions] };
  const habits = state.habitDefinitions
    .filter((habit) => HabitEngine.isScheduledForDate(habit, today))
    .map((habit) => ({ id: habit.id, name: habit.name, completed: HabitEngine.isCompletedOnDate(habitState, habit.id, today) }))
    .sort((a, b) => Number(a.completed) - Number(b.completed) || a.name.localeCompare(b.name));

  const currentMonth = capturedDate.getMonth() + 1;
  const currentYear = capturedDate.getFullYear();
  const planning: PlanningChain[] = state.monthlyTargets
    .filter((item) => !item.completed && item.month === currentMonth && item.year === currentYear)
    .slice(0, 3)
    .map((monthly) => {
      const goal = monthly.goalId === undefined ? undefined : goalsById.get(monthly.goalId);
      const weekly = state.weeklyTargets.find((item) =>
        !item.completed && item.monthlyTargetId === monthly.id && item.weekStartDate !== undefined && item.weekEndDate !== undefined && item.weekStartDate <= today && item.weekEndDate >= today
      );
      return {
        ...(goal && !goal.completed ? { lifeGoal: goal.title } : {}),
        monthlyOutcome: monthly.title,
        ...(weekly ? { weeklyFocus: weekly.title } : {}),
      };
    });

  const representedGoalTitles = new Set(planning.flatMap((item) => item.lifeGoal ? [item.lifeGoal] : []));
  for (const goal of state.lifeGoals) {
    if (planning.length >= 3) break;
    if (!goal.completed && !representedGoalTitles.has(goal.title)) {
      planning.push({ lifeGoal: goal.title });
    }
  }

  const eventsToday = state.executionHistory.filter((record) => dateKey(record.createdAt) === today);
  const tasksCompleted = state.tasks.filter((task) => task.completed && dateKey(task.completedAt ?? "") === today).length;
  const habitsCompleted = habits.filter((habit) => habit.completed).length;
  const xpEarned = eventsToday.reduce((total, record) => total + record.xpAwarded, 0);

  return {
    dateKey: today,
    dateLabel: new Intl.DateTimeFormat("en-US", { weekday: "long", month: "long", day: "numeric" }).format(capturedDate),
    greeting: getGreeting(state.capturedAt, state.profile.name, state.profile.timezone),
    summary: { tasks: tasks.length, tasksCompleted, habitsDue: habits.length, habitsCompleted, xp: xpEarned },
    priorities,
    tasks,
    habits,
    planning,
    progress: { tasksCompleted, habitsCompleted, xpEarned, executionCount: eventsToday.length },
    isEmpty: tasks.length === 0 && habits.length === 0 && eventsToday.length === 0,
  };
}
