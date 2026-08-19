// ==========================================
// LifeOS Execution Models
// Version: 2.0
// ==========================================

export type ExecutionType =
  | "task_completed"
  | "task_uncompleted"
  | "task_deleted"

  | "weekly_completed"
  | "weekly_uncompleted"
  | "weekly_deleted"

  | "monthly_completed"
  | "monthly_uncompleted"
  | "monthly_deleted"

  | "life_goal_completed"
  | "life_goal_uncompleted"
  | "life_goal_deleted"

  | "xp_earned"

  | "achievement_unlocked"

  | "habit_completed"

  | "system";

export interface ExecutionRecord {
  id: number;

  type: ExecutionType;

  entityId: number;

  title: string;

  description?: string;

  createdAt: string;

  xpAwarded: number;

  icon?: string;

  color?: string;

  metadata?: Record<string, unknown>;
}