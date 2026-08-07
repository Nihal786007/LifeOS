// ==========================================
// LifeOS Shared Models
// Version: 3.0
// ==========================================

/* =========================
   TASKS
========================= */

export interface Task {
  id: number;

  // Basic
  title: string;
  description?: string;

  // Status
  completed: boolean;
  completedAt?: string;

  // Planning
  dueDate?: string;

  priority: "low" | "medium" | "high";

  // Goal Connection
  goalId?: number;

  // Rewards
  xp: number;

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

  // Progress
  progress: number;

  completed: boolean;

  // Planning
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
  theme: "dark" | "light";

  // ATLAS Personality
  atlasPersonality:
    | "Professional"
    | "Friendly"
    | "Motivational";

  // Progress
  level: number;

  xp: number;
}
export interface MonthlyTarget {
  id: number;

  title: string;

  month: number;

  year: number;

  goalId?: number;

  completed: boolean;

  completedAt?: string;

  createdAt: string;
}
export interface WeeklyTarget {
  id: number;

  title: string;

 monthlyTargetId: number;

  week: 1 | 2 | 3 | 4 | 5;

  completed: boolean;

  completedAt?: string;

  createdAt: string;
}