// ==========================================
// LifeOS ATLAS Priority Types
// ==========================================

export type AtlasPriorityTier =
  | "critical"
  | "high"
  | "medium"
  | "low";

export type AtlasPriorityRuleId =
  | "task-priority"
  | "overdue"
  | "due-today"
  | "due-soon"
  | "due-this-week"
  | "weekly-alignment"
  | "monthly-alignment"
  | "goal-alignment"
  | "stale-task";

export interface AtlasPriorityContribution {
  ruleId: AtlasPriorityRuleId;
  points: number;
  reason: string;
}

export interface AtlasRankedTask {
  taskId: number;
  title: string;
  rank: number;
  score: number;
  tier: AtlasPriorityTier;
  reasons: readonly string[];
  contributions: readonly AtlasPriorityContribution[];
}

export interface AtlasPriorityResult {
  evaluatedAt: string;
  rankedTasks: readonly AtlasRankedTask[];
}
