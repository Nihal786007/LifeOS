// ==========================================
// LifeOS ATLAS Production AI Orchestrator
// ==========================================
//
// Provider-neutral, read-only composition boundary.
// It owns deterministic ATLAS assembly and invokes
// one injected provider exclusively through the
// existing request and conformance contracts.
// ==========================================

import {
  AtlasIntelligenceCoordinator,
} from "../coordinator/atlasIntelligenceCoordinator.ts";

import {
  DailyBriefEngine,
} from "../dailyBrief/dailyBriefEngine.ts";

import {
  MemoryPatternEngine,
} from "../memoryPatterns/memoryPatternEngine.ts";

import {
  runAtlasProviderConformance,
} from "../providerConformance/harness.ts";

import {
  createAtlasAIRequest,
} from "../reasoning/atlasAIProvider.ts";

import type {
  AtlasAIProvider,
} from "../reasoning/atlasAIProvider";

import {
  buildAtlasReasoningContext,
} from "../reasoning/buildAtlasReasoningContext.ts";

import {
  RecommendationEngine,
} from "../recommendations/recommendationEngine.ts";

import type {
  AtlasCanonicalState,
} from "../state/types";

import {
  ATLAS_AI_ORCHESTRATION_RESULT_VERSION,
  ATLAS_DETERMINISTIC_REASONING_PACKAGE_VERSION,
} from "./types.ts";

import type {
  AtlasAIOrchestrationInput,
  AtlasAIOrchestrationResult,
  AtlasDeterministicReasoningPackage,
} from "./types";

export class AtlasAIOrchestrator {
  private readonly provider: AtlasAIProvider;

  constructor(provider: AtlasAIProvider) {
    this.provider = provider;
  }

  buildDeterministicPackage(
    state: AtlasCanonicalState
  ): AtlasDeterministicReasoningPackage {
    const intelligenceReport =
      new AtlasIntelligenceCoordinator().createReport(
        state
      );

    const dailyBrief =
      new DailyBriefEngine().create(
        intelligenceReport
      );

    const recommendationReport =
      new RecommendationEngine().create(
        intelligenceReport
      );

    const patternReport =
      new MemoryPatternEngine().analyze({
        state,
        report: intelligenceReport,
      });

    const reasoningContext =
      buildAtlasReasoningContext({
        intelligenceReport,
        dailyBrief,
        recommendationReport,
        patternReport,
        profile: state.profile,
      });

    return structuredClone({
      version:
        ATLAS_DETERMINISTIC_REASONING_PACKAGE_VERSION,
      snapshotCapturedAt: state.capturedAt,
      intelligenceReport,
      dailyBrief,
      recommendationReport,
      patternReport,
      reasoningContext,
    });
  }

  async reason(
    input: AtlasAIOrchestrationInput
  ): Promise<AtlasAIOrchestrationResult> {
    const deterministic =
      this.buildDeterministicPackage(
        input.state
      );

    const request = createAtlasAIRequest({
      requestId: input.requestId,
      purpose: input.purpose,
      prompt: input.prompt,
      context: deterministic.reasoningContext,
    });

    const invocation =
      await runAtlasProviderConformance(
        this.provider,
        request
      );

    return structuredClone({
      version:
        ATLAS_AI_ORCHESTRATION_RESULT_VERSION,
      request: {
        requestId: input.requestId,
        purpose: input.purpose,
        prompt: input.prompt,
      },
      deterministic,
      provider: {
        invocationStatus: invocation.status,
        responseStatus:
          invocation.response?.status,
        descriptor: invocation.provider,
        content: invocation.response?.content,
        citations:
          invocation.response?.citations ?? [],
        limitations: invocation.limitations,
        errors: invocation.errors,
      },
    });
  }
}
