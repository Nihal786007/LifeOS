// ==========================================
// LifeOS Shared Models
// Version: 1.0
// ==========================================

export interface Task {
  id: number;
  text: string;
  completed: boolean;
  completedAt?: string;
}

export interface Habit {
  id: number;
  name: string;
  streak: number;
  completedToday: boolean;
}

export interface Goal {
  id: number;
  title: string;
  completed: boolean;
}

export interface UserProfile {
  name: string;
  level: number;
  xp: number;
}