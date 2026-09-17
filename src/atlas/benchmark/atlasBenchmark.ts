import { runAtlasProviderConformance } from "../providerConformance/harness.ts";
import { createAtlasAIRequest } from "../reasoning/atlasAIProvider.ts";
import { ATLAS_BENCHMARK_SCENARIOS } from "./scenarios.ts";
import { ATLAS_BENCHMARK_VERSION } from "./types.ts";
import type {
  AtlasBenchmarkCandidate,
  AtlasBenchmarkChecks,
  AtlasBenchmarkInput,
  AtlasBenchmarkPriceMetadata,
  AtlasBenchmarkReport,
  AtlasBenchmarkResult,
  AtlasBenchmarkScenario,
  AtlasBenchmarkTokenUsage,
} from "./types";

function memoryForScenario(input: AtlasBenchmarkInput, scenario: AtlasBenchmarkScenario) {
  if (scenario.memoryMode === "relevant") return input.relevantMemory ?? [];
  if (scenario.memoryMode === "irrelevant") return input.irrelevantMemory ?? [];
  return [];
}

function estimateCost(
  candidate: AtlasBenchmarkCandidate,
  usage: AtlasBenchmarkTokenUsage | undefined,
  prices: readonly AtlasBenchmarkPriceMetadata[]
): AtlasBenchmarkResult["estimatedCost"] {
  if (usage?.inputTokens === undefined || usage.outputTokens === undefined) return undefined;
  const price = prices.find((item) =>
    item.providerId === candidate.provider.descriptor.id && item.model === candidate.model);
  if (!price) return undefined;
  return {
    currency: price.currency,
    value: (usage.inputTokens * price.inputPerMillion +
      usage.outputTokens * price.outputPerMillion) / 1_000_000,
    pricingConfiguredAt: price.configuredAt,
  };
}

function qualityChecks(status: string, content: string | undefined, errors: readonly { code: string }[]): AtlasBenchmarkChecks {
  const text = content ?? "";
  const success = status === "success";
  const claimsAction = /\b(?:i|atlas) (?:created|completed|deleted|updated|sent|scheduled)\b/i.test(text);
  return {
    structuredOutputValid: success,
    deterministicFactAdherence: success && !errors.some((item) => item.code === "invalid-response"),
    citationAdherence: success && !errors.some((item) => item.code === "invalid-citation"),
    memoryBoundaryAdherence: success && !errors.some((item) => item.code === "authority-widening"),
    instructionFollowing: success,
    conciseUsefulness: success && text.trim().length > 0 && text.length <= 1_200,
    hallucinationResistance: success && !errors.some((item) => item.code === "invalid-citation"),
    actionBoundaryCompliance: !claimsAction,
  };
}

async function runScenario(
  input: AtlasBenchmarkInput,
  candidate: AtlasBenchmarkCandidate,
  scenario: AtlasBenchmarkScenario,
  now: () => number
): Promise<AtlasBenchmarkResult> {
  const requestId = `${input.runId}:${candidate.provider.descriptor.id}:${scenario.id}`;
  const request = createAtlasAIRequest({
    requestId,
    purpose: scenario.purpose,
    prompt: scenario.prompt,
    context: input.context,
    memory: memoryForScenario(input, scenario),
    conversation: scenario.conversation,
  });
  const startedAt = now();
  const invocation = await runAtlasProviderConformance(candidate.provider, request);
  const latencyMs = Math.max(0, now() - startedAt);
  const usage = candidate.readUsage?.(requestId);
  const content = invocation.response?.content;
  return {
    scenarioId: scenario.id,
    providerId: candidate.provider.descriptor.id,
    model: candidate.model,
    status: invocation.status,
    latencyMs,
    ...(usage?.inputTokens === undefined ? {} : { inputTokens: usage.inputTokens }),
    ...(usage?.outputTokens === undefined ? {} : { outputTokens: usage.outputTokens }),
    ...(estimateCost(candidate, usage, input.pricing ?? []) === undefined
      ? {} : { estimatedCost: estimateCost(candidate, usage, input.pricing ?? []) }),
    ...(content === undefined ? {} : { content }),
    citationCount: invocation.response?.citations.length ?? 0,
    malformedResponse: invocation.errors.some((item) => item.code === "invalid-response"),
    timeout: invocation.errors.some((item) => /timeout/i.test(item.message)),
    providerError: invocation.status === "provider-error",
    errors: structuredClone(invocation.errors),
    checks: qualityChecks(invocation.status, content, invocation.errors),
    humanReviewDimensions: ["planning-quality", "natural-assistant-tone"],
  };
}

export async function runAtlasBenchmark(input: AtlasBenchmarkInput): Promise<AtlasBenchmarkReport> {
  const now = input.now ?? Date.now;
  const results: AtlasBenchmarkResult[] = [];
  for (const candidate of input.candidates) {
    for (const scenario of ATLAS_BENCHMARK_SCENARIOS) {
      results.push(await runScenario(input, candidate, scenario, now));
    }
  }
  return {
    version: ATLAS_BENCHMARK_VERSION,
    runId: input.runId,
    scenarioCount: ATLAS_BENCHMARK_SCENARIOS.length,
    candidateCount: input.candidates.length,
    results,
    winnerSelected: false,
  };
}
