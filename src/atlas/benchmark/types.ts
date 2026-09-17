import type {
  AtlasAIProvider,
  AtlasAIRequestPurpose,
  AtlasConversationTurn,
} from "../reasoning/atlasAIProvider";
import type { AtlasMemoryItem } from "../memory/types";
import type { AtlasReasoningContext } from "../reasoning/types";
import type { AtlasProviderValidationError } from "../providerConformance/types";

export const ATLAS_BENCHMARK_VERSION = "1.0.0" as const;

export type AtlasBenchmarkMemoryMode = "none" | "relevant" | "irrelevant";

export interface AtlasBenchmarkScenario {
  id: string;
  title: string;
  purpose: AtlasAIRequestPurpose;
  prompt: string;
  memoryMode: AtlasBenchmarkMemoryMode;
  conversation?: readonly AtlasConversationTurn[];
  expectedBehavior: readonly string[];
}

export interface AtlasBenchmarkTokenUsage {
  inputTokens?: number;
  outputTokens?: number;
}

export interface AtlasBenchmarkPriceMetadata {
  providerId: string;
  model: string;
  currency: string;
  inputPerMillion: number;
  outputPerMillion: number;
  configuredAt: string;
  source?: string;
}

export interface AtlasBenchmarkCandidate {
  provider: AtlasAIProvider;
  model: string;
  readUsage?: (requestId: string) => AtlasBenchmarkTokenUsage | undefined;
}

export interface AtlasBenchmarkInput {
  runId: string;
  context: AtlasReasoningContext;
  candidates: readonly AtlasBenchmarkCandidate[];
  relevantMemory?: readonly AtlasMemoryItem[];
  irrelevantMemory?: readonly AtlasMemoryItem[];
  pricing?: readonly AtlasBenchmarkPriceMetadata[];
  now?: () => number;
}

export interface AtlasBenchmarkChecks {
  structuredOutputValid: boolean;
  deterministicFactAdherence: boolean;
  citationAdherence: boolean;
  memoryBoundaryAdherence: boolean;
  instructionFollowing: boolean;
  conciseUsefulness: boolean;
  hallucinationResistance: boolean;
  actionBoundaryCompliance: boolean;
}

export interface AtlasBenchmarkResult {
  scenarioId: string;
  providerId: string;
  model: string;
  status: string;
  latencyMs: number;
  inputTokens?: number;
  outputTokens?: number;
  estimatedCost?: { currency: string; value: number; pricingConfiguredAt: string };
  content?: string;
  citationCount: number;
  malformedResponse: boolean;
  timeout: boolean;
  providerError: boolean;
  errors: readonly AtlasProviderValidationError[];
  checks: AtlasBenchmarkChecks;
  humanReviewDimensions: readonly [
    "planning-quality",
    "natural-assistant-tone"
  ];
}

export interface AtlasBenchmarkReport {
  version: typeof ATLAS_BENCHMARK_VERSION;
  runId: string;
  scenarioCount: number;
  candidateCount: number;
  results: readonly AtlasBenchmarkResult[];
  winnerSelected: false;
}
