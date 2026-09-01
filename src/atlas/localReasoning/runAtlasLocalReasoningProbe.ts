// ==========================================
// LifeOS ATLAS Local Reasoning Probe
// ==========================================
//
// Removable developer harness for one grounded
// local inference. It composes existing pure
// ATLAS engines from one canonical snapshot and
// validates the provider result through the
// conformance boundary.
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
  OllamaAtlasProvider,
} from "../providers/ollama/ollamaAtlasProvider.ts";

import {
  runAtlasProviderConformance,
} from "../providerConformance/harness.ts";

import type {
  AtlasProviderInvocationResult,
} from "../providerConformance/types";

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

export const ATLAS_LOCAL_REASONING_PROBE_VERSION =
  "1.0.0" as const;

export const ATLAS_LOCAL_REASONING_PROMPT =
  "What should I focus on today and why?" as const;

export interface AtlasLocalReasoningProbeResult {
  version:
    typeof ATLAS_LOCAL_REASONING_PROBE_VERSION;
  snapshotCapturedAt: string;
  prompt: typeof ATLAS_LOCAL_REASONING_PROMPT;
  requestId: string;
  status:
    AtlasProviderInvocationResult["status"];
  content?: string;
  citations: NonNullable<
    AtlasProviderInvocationResult["response"]
  >["citations"];
  limitations: readonly string[];
  errors:
    AtlasProviderInvocationResult["errors"];
}

export async function runAtlasLocalReasoningProbe(
  state: AtlasCanonicalState,
  provider: AtlasAIProvider =
    new OllamaAtlasProvider()
): Promise<AtlasLocalReasoningProbeResult> {
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

  const requestId =
    `atlas-local-reasoning:${state.capturedAt}`;

  const request = createAtlasAIRequest({
    requestId,
    purpose: "grounded-answer",
    prompt: ATLAS_LOCAL_REASONING_PROMPT,
    context: reasoningContext,
  });

  const invocation =
    await runAtlasProviderConformance(
      provider,
      request
    );

  return {
    version:
      ATLAS_LOCAL_REASONING_PROBE_VERSION,
    snapshotCapturedAt: state.capturedAt,
    prompt: ATLAS_LOCAL_REASONING_PROMPT,
    requestId,
    status: invocation.status,
    content: invocation.response?.content,
    citations:
      invocation.response?.citations ?? [],
    limitations: invocation.limitations,
    errors: invocation.errors,
  };
}
