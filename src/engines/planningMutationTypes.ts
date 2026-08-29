// ==========================================
// LifeOS Planning Mutation Types
// Version: 2.0
// ==========================================

import type {
  MonthlyTarget,
  Task,
  WeeklyTarget,
} from "../shared/types";

import type {
  PlanningState,
} from "./PlanningKernel";

import type {
  GoalWeekOwnershipStatus,
} from "./GoalWeekOwnershipEngine";

// ==========================================
// Task Creation
// ==========================================

export type TaskCreationStatus =
  | "created"
  | "invalid_title";

export interface TaskCreationResult {
  status: TaskCreationStatus;

  created: boolean;

  task?: Task;

  state: PlanningState;

  message: string;
}

// ==========================================
// Task Update
// ==========================================

export type TaskUpdateStatus =
  | "updated"
  | "task_not_found"
  | "invalid_title"
  | "weekly_target_not_found"
  | "placement_failed";

export interface TaskUpdateResult {
  status: TaskUpdateStatus;

  updated: boolean;

  task?: Task;

  state: PlanningState;

  message: string;
}

// ==========================================
// Monthly Outcome Creation
// ==========================================

export type MonthlyOutcomeCreationStatus =
  | "created"
  | "invalid_title"
  | "invalid_month"
  | "invalid_year"
  | "goal_not_found"
  | "outside_goal_timeline"
  | "duplicate_goal_month";

export interface MonthlyOutcomeCreationResult {
  status: MonthlyOutcomeCreationStatus;

  created: boolean;

  monthlyTarget?: MonthlyTarget;

  state: PlanningState;

  message: string;
}

// ==========================================
// Monthly Outcome Title Update
// ==========================================

export type MonthlyOutcomeUpdateStatus =
  | "updated"
  | "monthly_target_not_found"
  | "invalid_title";

export interface MonthlyOutcomeUpdateResult {
  status: MonthlyOutcomeUpdateStatus;

  updated: boolean;

  monthlyTarget?: MonthlyTarget;

  state: PlanningState;

  message: string;
}

// ==========================================
// Goal Weekly Focus Validation
// ==========================================

export type GoalWeekOwnershipFailureStatus =
  Exclude<
    GoalWeekOwnershipStatus,
    "available"
  >;

export type GoalWeeklyFocusValidationStatus =
  | "available"
  | "invalid_title"
  | GoalWeekOwnershipFailureStatus;

export interface GoalWeeklyFocusValidationResult {
  status: GoalWeeklyFocusValidationStatus;

  allowed: boolean;

  title?: string;

  message: string;

  ownerMonth?: number;

  ownerYear?: number;

  ownerMonthlyTargetId?: number;

  existingWeeklyTargetId?: number;
}

// ==========================================
// Goal Weekly Focus Creation
// ==========================================

export type GoalWeeklyFocusCreationStatus =
  | "created"
  | "invalid_title"
  | GoalWeekOwnershipFailureStatus;

export interface GoalWeeklyFocusCreationResult {
  status: GoalWeeklyFocusCreationStatus;

  created: boolean;

  message: string;

  ownerMonth?: number;

  ownerYear?: number;

  ownerMonthlyTargetId?: number;

  existingWeeklyTargetId?: number;
}

// ==========================================
// Weekly Focus Title Update
// ==========================================

export type WeeklyFocusUpdateStatus =
  | "updated"
  | "weekly_target_not_found"
  | "invalid_title";

export interface WeeklyFocusUpdateResult {
  status: WeeklyFocusUpdateStatus;

  updated: boolean;

  weeklyTarget?: WeeklyTarget;

  state: PlanningState;

  message: string;
}