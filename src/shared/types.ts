// ==========================================
// LifeOS Shared Models
// Version: 2.0
// ==========================================

/* =========================
   TASKS
========================= */

export interface Task {
  id: number;
  text: string;
  completed: boolean;
  completedAt?: string;
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
   GOALS
========================= */

export interface Goal {
  id: number;
  title: string;
  completed: boolean;
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

  // ATLAS
  atlasPersonality:
    | "Professional"
    | "Friendly"
    | "Motivational";

  // Progress
  level: number;
  xp: number;
}