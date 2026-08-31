// ==========================================
// LifeOS ATLAS Daily Brief Types
// ==========================================

import type {
  AtlasRankedTask,
} from "../priority/types";

import type {
  AtlasRiskFinding,
  AtlasRiskRuleId,
} from "../risk/types";

export const ATLAS_DAILY_BRIEF_VERSION =
  "1.0.0" as const;

export type AtlasDailyBriefFocusKind =
  | "priority"
  | "risk"
  | "maintenance";

export interface AtlasDailyBriefPrimaryFocus {
  kind: AtlasDailyBriefFocusKind;
  title: string;
  reasons: readonly string[];
  taskId?: number;
  riskRuleId?: AtlasRiskRuleId;
}

export type AtlasPositiveSignalId =
  | "tasks-completed-today"
  | "habits-completed-today"
  | "active-habit-streaks"
  | "xp-earned-today"
  | "no-current-risk";

export interface AtlasPositiveSignal {
  id: AtlasPositiveSignalId;
  title: string;
  reason: string;
}

export type AtlasSuggestedActionKind =
  | "start-top-priority"
  | "review-key-risk"
  | "define-next-priority";

export interface AtlasSuggestedNextAction {
  kind: AtlasSuggestedActionKind;
  title: string;
  reasons: readonly string[];
  taskId?: number;
  riskRuleId?: AtlasRiskRuleId;
}

export interface AtlasDailyBrief {
  version:
    typeof ATLAS_DAILY_BRIEF_VERSION;
  sourceReportVersion: string;
  snapshotCapturedAt: string;
  primaryFocus: AtlasDailyBriefPrimaryFocus;
  topPriorities: readonly AtlasRankedTask[];
  keyRisks: readonly AtlasRiskFinding[];
  positiveSignals: readonly AtlasPositiveSignal[];
  suggestedNextAction: AtlasSuggestedNextAction;
}
