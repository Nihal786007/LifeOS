// ==========================================
// LifeOS ATLAS Proactive Intelligence Types
// ==========================================

import type {
  AtlasAICitation,
} from "../reasoning/atlasAIProvider";

export const ATLAS_PROACTIVE_INSIGHT_VERSION =
  "1.0.0" as const;

export const ATLAS_PROACTIVE_MAX_INSIGHTS =
  3 as const;

export type AtlasProactiveInsightType =
  | "risk"
  | "focus"
  | "progress"
  | "habit"
  | "planning";

export type AtlasProactiveSeverity =
  | "info"
  | "attention"
  | "important";

export interface AtlasProactiveInsight {
  id: string;
  type: AtlasProactiveInsightType;
  title: string;
  summary: string;
  severity: AtlasProactiveSeverity;
  evidence: readonly AtlasAICitation[];
}

export interface AtlasProactiveInsightReport {
  version:
    typeof ATLAS_PROACTIVE_INSIGHT_VERSION;
  snapshotCapturedAt: string;
  insights: readonly AtlasProactiveInsight[];
}
