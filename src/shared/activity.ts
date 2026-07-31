export type ActivityType =
  | "task"
  | "habit"
  | "event"
  | "study"
  | "robotics"
  | "university";

export type ActivityStatus =
  | "planned"
  | "in_progress"
  | "completed"
  | "cancelled";

export type ActivityPriority =
  | "low"
  | "medium"
  | "high"
  | "critical";

export interface Activity {
  id: string;

  title: string;

  description?: string;

  type: ActivityType;

  category: string;

  start: Date;

  end?: Date;

  status: ActivityStatus;

  priority: ActivityPriority;

  xpReward: number;

  estimatedMinutes?: number;

  completedAt?: Date;

  notes?: string;

  createdAt: Date;

  updatedAt: Date;
}