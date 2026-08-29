// ==========================================
// LifeOS Shared Models
// Version: 3.4
// ==========================================

/* =========================
TASKS
========================= */

export type TaskPriority =
  | "low"
  | "medium"
  | "high";

export interface CreateTaskInput {
  title: string;

  description?: string;

  dueDate?: string;

  priority?: TaskPriority;

  weeklyTargetId?: number;
}

/**
 * Universal Task mutation contract.
 *
 * undefined
 * → leave the existing value unchanged.
 *
 * null
 * → intentionally clear an optional value.
 *
 * Task relationship changes must still be
 * validated by the planning architecture.
 */
export interface UpdateTaskInput {
  title?: string;

  description?:
    | string
    | null;

  dueDate?:
    | string
    | null;

  priority?: TaskPriority;

  weeklyTargetId?:
    | number
    | null;
}

export interface Task {
  id: number;

  // Basic
  title: string;
  description?: string;

  // Planning
  dueDate?: string;

  priority: TaskPriority;

  // Optional Connection
  weeklyTargetId?: number;

  // Status
  completed: boolean;
  completedAt?: string;

  // Metadata
  createdAt: string;
}

/* =========================
LIFE GOALS
========================= */

export interface LifeGoal {
  id: number;

  // Basic
  title: string;
  description?: string;

  // Calculated by planning/execution architecture
  progress: number;

  // Status
  completed: boolean;
  completedAt?: string;

  // Timeline
  startDate: string;
  targetDate?: string;

  // Metadata
  createdAt: string;
}

/* =========================
HABITS
========================= */

export interface Habit {
  id: number;

  name: string;

  streak: number;

  completedToday: boolean;
}

/* =========================
QUICK CAPTURE
========================= */

export interface Capture {
  id: number;

  text: string;

  createdAt: string;
}

/* =========================
USER PROFILE
========================= */

export interface UserProfile {
  // Basic Profile
  name: string;

  occupation: string;

  timezone: string;

  // Appearance
  theme:
    | "dark"
    | "light";

  // ATLAS Personality
  atlasPersonality:
    | "Professional"
    | "Friendly"
    | "Motivational";

  // Legacy Progress
  //
  // Real XP now comes from XPContext.
  // Profile migration will happen separately.
  level: number;

  xp: number;
}

/* =========================
MONTHLY TARGETS
========================= */

export interface MonthlyTarget {
  id: number;

  title: string;

  month: number;

  year: number;

  goalId?: number;

  progress: number;

  completed: boolean;

  completedAt?: string;

  createdAt: string;
}

/* =========================
WEEKLY TARGETS
========================= */

export interface WeeklyTarget {
  id: number;

  title: string;

  monthlyTargetId?: number;

  /**
   * Legacy month-relative week number.
   *
   * Kept temporarily so existing LifeOS data and
   * older UI remain compatible while the planner
   * migrates to real calendar-date weeks.
   *
   * New Planning V2 UI should prefer:
   * weekStartDate + weekEndDate.
   */
  week:
    | 1
    | 2
    | 3
    | 4
    | 5;

  /**
   * Real calendar identity for this week.
   *
   * Stored as local date strings:
   * YYYY-MM-DD
   *
   * Optional during migration because older saved
   * WeeklyTargets do not contain these fields yet.
   */
  weekStartDate?: string;

  weekEndDate?: string;

  progress: number;

  completed: boolean;

  completedAt?: string;

  createdAt: string;
}