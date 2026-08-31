// ==========================================
// LifeOS ATLAS Risk and Drift Types
// ==========================================

export type AtlasRiskSeverity =
  | "critical"
  | "high"
  | "moderate";

export type AtlasOverallRisk =
  | AtlasRiskSeverity
  | "none";

export type AtlasRiskCategory =
  | "deadline"
  | "capacity"
  | "execution-drift"
  | "planning-drift"
  | "data-integrity";

export type AtlasRiskRuleId =
  | "overdue-task-backlog"
  | "overdue-goal"
  | "active-task-overload"
  | "high-priority-overload"
  | "execution-stall"
  | "stale-task-backlog"
  | "broken-planning-link"
  | "planning-alignment-gap"
  | "completed-parent-conflict";

export interface AtlasRiskEvidence {
  metric: string;
  value: number;
  threshold: number;
}

export interface AtlasRiskFinding {
  ruleId: AtlasRiskRuleId;
  category: AtlasRiskCategory;
  severity: AtlasRiskSeverity;
  title: string;
  reasons: readonly string[];
  evidence: readonly AtlasRiskEvidence[];
}

export interface AtlasRiskAssessment {
  evaluatedAt: string;
  overallRisk: AtlasOverallRisk;
  findings: readonly AtlasRiskFinding[];
}
