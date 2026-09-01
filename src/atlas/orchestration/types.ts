// ==========================================
// LifeOS ATLAS AI Orchestration Contracts
// ==========================================

import type {
  AtlasIntelligenceReport,
} from "../coordinator/types";

import type {
  AtlasDailyBrief,
} from "../dailyBrief/types";

import type {
  AtlasPatternIntelligenceReport,
} from "../memoryPatterns/types";

import type {
  AtlasProviderInvocationStatus,
  AtlasProviderValidationError,
} from "../providerConformance/types";

import type {
  AtlasAICitation,
  AtlasAIProviderDescriptor,
  AtlasAIRequestPurpose,
  AtlasAIResponseStatus,
} from "../reasoning/atlasAIProvider";

import type {
  AtlasReasoningContext,
} from "../reasoning/types";

import type {
  AtlasRecommendationReport,
} from "../recommendations/types";

import type {
  AtlasCanonicalState,
} from "../state/types";

export const ATLAS_DETERMINISTIC_REASONING_PACKAGE_VERSION =
  "1.0.0" as const;

export const ATLAS_AI_ORCHESTRATION_RESULT_VERSION =
  "1.0.0" as const;

export interface AtlasDeterministicReasoningPackage {
  version:
    typeof ATLAS_DETERMINISTIC_REASONING_PACKAGE_VERSION;
  snapshotCapturedAt: string;
  intelligenceReport: AtlasIntelligenceReport;
  dailyBrief: AtlasDailyBrief;
  recommendationReport:
    AtlasRecommendationReport;
  patternReport:
    AtlasPatternIntelligenceReport;
  reasoningContext: AtlasReasoningContext;
}

export interface AtlasAIOrchestrationInput {
  state: AtlasCanonicalState;
  requestId: string;
  purpose: AtlasAIRequestPurpose;
  prompt: string;
}

export interface AtlasAIOrchestrationRequestSummary {
  requestId: string;
  purpose: AtlasAIRequestPurpose;
  prompt: string;
}

export interface AtlasAIOrchestrationProviderResult {
  invocationStatus:
    AtlasProviderInvocationStatus;
  responseStatus?: AtlasAIResponseStatus;
  descriptor?: AtlasAIProviderDescriptor;
  content?: string;
  citations: readonly AtlasAICitation[];
  limitations: readonly string[];
  errors:
    readonly AtlasProviderValidationError[];
}

export interface AtlasAIOrchestrationResult {
  version:
    typeof ATLAS_AI_ORCHESTRATION_RESULT_VERSION;
  request: AtlasAIOrchestrationRequestSummary;
  deterministic:
    AtlasDeterministicReasoningPackage;
  provider:
    AtlasAIOrchestrationProviderResult;
}
