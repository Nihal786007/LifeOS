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
  AtlasAIOrchestrator,
} from "../orchestration/AtlasAIOrchestrator.ts";

import type {
  AtlasAIProvider,
} from "../reasoning/atlasAIProvider";

import {
  OllamaAtlasProvider,
} from "../providers/ollama/ollamaAtlasProvider.ts";

import type {
  AtlasProviderInvocationStatus,
  AtlasProviderValidationError,
} from "../providerConformance/types";

import type {
  AtlasAICitation,
} from "../reasoning/atlasAIProvider";

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
  status: AtlasProviderInvocationStatus;
  content?: string;
  citations: readonly AtlasAICitation[];
  limitations: readonly string[];
  errors: readonly AtlasProviderValidationError[];
}

export async function runAtlasLocalReasoningProbe(
  state: AtlasCanonicalState,
  provider: AtlasAIProvider =
    new OllamaAtlasProvider()
): Promise<AtlasLocalReasoningProbeResult> {
  const requestId =
    `atlas-local-reasoning:${state.capturedAt}`;

  const orchestration =
    await new AtlasAIOrchestrator(
      provider
    ).reason({
      state,
      requestId,
      purpose: "grounded-answer",
      prompt: ATLAS_LOCAL_REASONING_PROMPT,
    });

  return {
    version:
      ATLAS_LOCAL_REASONING_PROBE_VERSION,
    snapshotCapturedAt:
      orchestration.deterministic
        .snapshotCapturedAt,
    requestId,
    prompt: ATLAS_LOCAL_REASONING_PROMPT,
    status:
      orchestration.provider.invocationStatus,
    content: orchestration.provider.content,
    citations:
      orchestration.provider.citations,
    limitations:
      orchestration.provider.limitations,
    errors: orchestration.provider.errors,
  };
}
