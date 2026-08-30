// ==========================================
// LifeOS Habit Models
// Version: 2.0
// ==========================================
//
// Canonical models for Habits 2.0.
//
// IMPORTANT:
// - Habit definitions describe WHAT should happen.
// - HabitCompletion records describe WHAT DID happen.
// - Streaks and completion percentages are derived.
// - completedToday is never stored as canonical state.
// ==========================================

// ==========================================
// Habit Weekdays
// ==========================================

export type HabitWeekday =
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday"
  | "saturday"
  | "sunday";

// ==========================================
// Habit
// ==========================================

export interface HabitDefinition {
  id: number;

  // Basic
  name: string;

  description?: string;

  // ========================================
  // Schedule
  // ========================================
  //
  // Empty arrays are not allowed by the
  // mutation layer.
  //
  // Examples:
  //
  // Every day:
  // [
  //   "monday",
  //   "tuesday",
  //   ...
  // ]
  //
  // Gym:
  // [
  //   "monday",
  //   "wednesday",
  //   "friday"
  // ]

  activeDays: HabitWeekday[];

  // Local YYYY-MM-DD date on which the habit
  // becomes active.

  startDate: string;

  // ========================================
  // Lifecycle
  // ========================================

  archived: boolean;

  archivedAt?: string;

  // ========================================
  // Metadata
  // ========================================

  createdAt: string;

  updatedAt: string;
}

// ==========================================
// Habit Completion
// ==========================================

export interface HabitCompletion {
  id: number;

  habitId: number;

  // Local calendar date:
  // YYYY-MM-DD
  //
  // This is the canonical identity of the
  // completion day.

  date: string;

  // Precise execution timestamp.

  completedAt: string;
}

// ==========================================
// Creation Contract
// ==========================================

export interface CreateHabitInput {
  name: string;

  description?: string;

  activeDays: HabitWeekday[];

  startDate?: string;
}

// ==========================================
// Update Contract
// ==========================================

export interface UpdateHabitInput {
  name?: string;

  description?:
    | string
    | null;

  activeDays?:
    HabitWeekday[];

  startDate?: string;
}

// ==========================================
// Habit State
// ==========================================

export interface HabitState {
  habits:
    HabitDefinition[];

  completions:
    HabitCompletion[];
}