// ==========================================
// LifeOS ATLAS Reasoning Context Types
// ==========================================

import type {
  AtlasIntelligenceReport,
} from "../coordinator/types";

import type {
  AtlasDailyBrief,
} from "../dailyBrief/types";

import type {
  AtlasHistoryCoverage,
  AtlasPatternFinding,
  AtlasPatternIntelligenceReport,
} from "../memoryPatterns/types";

import type {
  AtlasRecommendation,
  AtlasRecommendationReport,
} from "../recommendations/types";

import type {
  AtlasPriorityResult,
} from "../priority/types";

import type {
  AtlasRiskAssessment,
} from "../risk/types";

import type {
  AtlasStateUnderstanding,
} from "../understanding/types";

import type {
  UserProfile,
} from "../../shared/types";

export const ATLAS_REASONING_CONTEXT_VERSION =
  "1.0.0" as const;

export interface AtlasReasoningContextInput {
  intelligenceReport: AtlasIntelligenceReport;
  dailyBrief: AtlasDailyBrief;
  recommendationReport:
    AtlasRecommendationReport;
  patternReport:
    AtlasPatternIntelligenceReport;
  profile: UserProfile;
}

export interface AtlasReasoningProfile {
  name: string;
  occupation: string;
  timezone: string;
  atlasPersonality:
    UserProfile["atlasPersonality"];
}

export interface AtlasReasoningSourceVersions {
  intelligenceReport: string;
  dailyBrief: string;
  recommendationReport: string;
  patternReport: string;
}

export type AtlasReasoningLimitationOrigin =
  | "pattern-intelligence"
  | "reasoning-context";

export interface AtlasReasoningLimitation {
  id: string;
  origin: AtlasReasoningLimitationOrigin;
  evidenceSource: string;
  reason: string;
}

export interface AtlasReasoningContext {
  version:
    typeof ATLAS_REASONING_CONTEXT_VERSION;
  snapshotCapturedAt: string;
  sourceVersions: AtlasReasoningSourceVersions;
  profile: AtlasReasoningProfile;
  factualState: AtlasStateUnderstanding;
  priorities: AtlasPriorityResult;
  risks: AtlasRiskAssessment;
  dailyBrief: AtlasDailyBrief;
  recommendations:
    readonly AtlasRecommendation[];
  historyCoverage:
    readonly AtlasHistoryCoverage[];
  historicalPatterns:
    readonly AtlasPatternFinding[];
  limitations:
    readonly AtlasReasoningLimitation[];
}
