import type {
  AtlasAIRequestConstraints,
  AtlasAIRequestPurpose,
  AtlasConversationTurn,
} from "../../reasoning/atlasAIProvider";
import type { AtlasMemoryType } from "../../memory/types";

export const HOSTED_ATLAS_REQUEST_VERSION = "1.0.0" as const;
export const HOSTED_ATLAS_RESPONSE_VERSION = "1.0.0" as const;
export const HOSTED_ATLAS_MAX_REQUEST_BYTES = 20_000 as const;
export const HOSTED_ATLAS_MAX_COMMENTARY_LENGTH = 600 as const;
export const HOSTED_ATLAS_MAX_LIMITATIONS = 2 as const;
export const HOSTED_ATLAS_MAX_FACT_REFERENCES = 3 as const;

export const HOSTED_ATLAS_PROVIDER_FAMILIES = [
  "openai",
  "gemini",
  "qwen",
  "grok",
  "mistral",
  "deepseek",
] as const;

export type HostedAtlasProviderFamily =
  (typeof HOSTED_ATLAS_PROVIDER_FAMILIES)[number];

export interface HostedAtlasFact {
  ref: string;
  label: string;
  value: unknown;
}

export interface HostedAtlasMemoryContext {
  type: AtlasMemoryType;
  topic: string;
  content: string;
}

export interface HostedAtlasRequest {
  version: typeof HOSTED_ATLAS_REQUEST_VERSION;
  requestId: string;
  purpose: AtlasAIRequestPurpose;
  currentQuestion: string;
  factCore: {
    version: string;
    domain: string;
    evidenceStatus: "completed" | "insufficient-evidence" | "refused";
    factualAnswer: string;
    facts: readonly HostedAtlasFact[];
  };
  memory: readonly HostedAtlasMemoryContext[];
  conversation: readonly AtlasConversationTurn[];
  constraints: AtlasAIRequestConstraints;
}

export interface HostedAtlasProviderMetadata {
  provider: HostedAtlasProviderFamily;
  model: string;
  inputTokens?: number;
  outputTokens?: number;
  latencyMs?: number;
}

export interface HostedAtlasResponse {
  version: typeof HOSTED_ATLAS_RESPONSE_VERSION;
  requestId: string;
  commentary: string;
  factReferences: readonly string[];
  limitations: readonly string[];
  providerMetadata: HostedAtlasProviderMetadata;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasExactKeys(value: Record<string, unknown>, expected: readonly string[]): boolean {
  const actual = Object.keys(value).sort();
  const required = [...expected].sort();
  return actual.length === required.length &&
    actual.every((key, index) => key === required[index]);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

export function hostedAtlasPayloadBytes(value: unknown): number {
  return new TextEncoder().encode(JSON.stringify(value)).byteLength;
}

export function assertHostedAtlasRequest(value: unknown): asserts value is HostedAtlasRequest {
  if (!isRecord(value) || !hasExactKeys(value, [
    "version", "requestId", "purpose", "currentQuestion", "factCore",
    "memory", "conversation", "constraints",
  ])) throw new Error("Hosted ATLAS request has an invalid shape.");
  if (value.version !== HOSTED_ATLAS_REQUEST_VERSION ||
      !isNonEmptyString(value.requestId) || !isNonEmptyString(value.purpose) ||
      !isNonEmptyString(value.currentQuestion)) {
    throw new Error("Hosted ATLAS request metadata is invalid.");
  }
  if (hostedAtlasPayloadBytes(value) > HOSTED_ATLAS_MAX_REQUEST_BYTES) {
    throw new Error("Hosted ATLAS request exceeds the bounded payload limit.");
  }
  if (!isRecord(value.factCore) || !hasExactKeys(value.factCore, [
    "version", "domain", "evidenceStatus", "factualAnswer", "facts",
  ]) || !isNonEmptyString(value.factCore.version) ||
      !isNonEmptyString(value.factCore.domain) ||
      !isNonEmptyString(value.factCore.factualAnswer) ||
      !["completed", "insufficient-evidence", "refused"].includes(String(value.factCore.evidenceStatus)) ||
      !Array.isArray(value.factCore.facts) || value.factCore.facts.length > 12) {
    throw new Error("Hosted ATLAS deterministic Fact Core is invalid.");
  }
  for (const fact of value.factCore.facts) {
    if (!isRecord(fact) || !hasExactKeys(fact, ["ref", "label", "value"]) ||
        !isNonEmptyString(fact.ref) || !isNonEmptyString(fact.label)) {
      throw new Error("Hosted ATLAS fact is invalid.");
    }
  }
  if (!Array.isArray(value.memory) || value.memory.length > 3 ||
      !value.memory.every((item) => isRecord(item) &&
        hasExactKeys(item, ["type", "topic", "content"]) &&
        isNonEmptyString(item.type) && isNonEmptyString(item.topic) &&
        isNonEmptyString(item.content))) {
    throw new Error("Hosted ATLAS memory context is invalid.");
  }
  if (!Array.isArray(value.conversation) || value.conversation.length > 2 ||
      !value.conversation.every((turn) => isRecord(turn) &&
        hasExactKeys(turn, ["role", "content"]) &&
        (turn.role === "user" || turn.role === "assistant") &&
        isNonEmptyString(turn.content))) {
    throw new Error("Hosted ATLAS conversation context is invalid.");
  }
  if (!isRecord(value.constraints) ||
      value.constraints.groundedInContextOnly !== true ||
      value.constraints.requireEvidenceReferences !== true ||
      value.constraints.allowLifeOSMutation !== false ||
      value.constraints.allowActions !== false ||
      value.constraints.allowTools !== false ||
      value.constraints.allowExternalRetrieval !== false ||
      value.constraints.allowPrediction !== false ||
      value.constraints.allowSimulation !== false) {
    throw new Error("Hosted ATLAS authority constraints are invalid.");
  }
}

export function assertHostedAtlasResponse(value: unknown): asserts value is HostedAtlasResponse {
  if (!isRecord(value) || !hasExactKeys(value, [
    "version", "requestId", "commentary", "factReferences", "limitations",
    "providerMetadata",
  ])) throw new Error("Hosted ATLAS response has an invalid shape.");
  if (value.version !== HOSTED_ATLAS_RESPONSE_VERSION ||
      !isNonEmptyString(value.requestId) || !isNonEmptyString(value.commentary) ||
      value.commentary.length > HOSTED_ATLAS_MAX_COMMENTARY_LENGTH ||
      !Array.isArray(value.factReferences) ||
      value.factReferences.length > HOSTED_ATLAS_MAX_FACT_REFERENCES ||
      !value.factReferences.every(isNonEmptyString) ||
      !Array.isArray(value.limitations) ||
      value.limitations.length > HOSTED_ATLAS_MAX_LIMITATIONS ||
      !value.limitations.every((item) => isNonEmptyString(item) && item.length <= 240)) {
    throw new Error("Hosted ATLAS response content is invalid.");
  }
  const metadata = value.providerMetadata;
  if (!isRecord(metadata) || !hasExactKeys(metadata, [
    "provider", "model", ...("inputTokens" in metadata ? ["inputTokens"] : []),
    ...("outputTokens" in metadata ? ["outputTokens"] : []),
    ...("latencyMs" in metadata ? ["latencyMs"] : []),
  ]) || !HOSTED_ATLAS_PROVIDER_FAMILIES.includes(metadata.provider as HostedAtlasProviderFamily) ||
      !isNonEmptyString(metadata.model)) {
    throw new Error("Hosted ATLAS provider metadata is invalid.");
  }
  for (const key of ["inputTokens", "outputTokens", "latencyMs"] as const) {
    const item = metadata[key];
    if (item !== undefined &&
        (typeof item !== "number" || !Number.isFinite(item) || item < 0)) {
      throw new Error("Hosted ATLAS usage metadata is invalid.");
    }
  }
}
