// ==========================================
// LifeOS Shared Models
// Version: 3.1
// ==========================================

/* =========================
   TASKS
========================= */

export interface Task {
  id: number;

  // Basic
  title: string;
  description?: string;

  // Planning
  dueDate?: string;

  priority:
    | "low"
    | "medium"
    | "high";

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

  week:
    | 1
    | 2
    | 3
    | 4
    | 5;

  progress: number;

  completed: boolean;

  completedAt?: string;

  createdAt: string;
}