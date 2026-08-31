// ==========================================
// LifeOS ATLAS Recommendation Types
// ==========================================

export const ATLAS_RECOMMENDATION_REPORT_VERSION =
  "1.0.0" as const;

export type AtlasRecommendationCategory =
  | "execute-now"
  | "mitigate-risk"
  | "repair-planning"
  | "protect-momentum"
  | "reduce-overload";

export type AtlasRecommendationEvidenceSource =
  | "priority"
  | "risk"
  | "understanding";

export interface AtlasRecommendationEvidence {
  source: AtlasRecommendationEvidenceSource;
  path: string;
  value: string | number | boolean;
  description: string;
}

export interface AtlasRecommendation {
  id: string;
  rank: number;
  category: AtlasRecommendationCategory;
  title: string;
  suggestedAction: string;
  reason: string;
  evidence: readonly AtlasRecommendationEvidence[];
}

export interface AtlasRecommendationReport {
  version:
    typeof ATLAS_RECOMMENDATION_REPORT_VERSION;
  sourceReportVersion: string;
  snapshotCapturedAt: string;
  recommendations:
    readonly AtlasRecommendation[];
}
