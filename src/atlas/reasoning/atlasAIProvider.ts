// ==========================================
// LifeOS ATLAS AI Provider Boundary
// ==========================================
//
// Provider-neutral contracts only. No provider
// implementation, transport, credentials, tools,
// or LifeOS mutation handles are defined here.
// ==========================================

import type {
  AtlasReasoningContext,
} from "./types";

export const ATLAS_AI_REQUEST_VERSION =
  "1.0.0" as const;

export const ATLAS_AI_RESPONSE_VERSION =
  "1.0.0" as const;

export type AtlasAIRequestPurpose =
  | "grounded-answer"
  | "explain-priority"
  | "explain-risk"
  | "explain-pattern"
  | "narrate-daily-brief";

export interface AtlasAIRequestConstraints {
  groundedInContextOnly: true;
  requireEvidenceReferences: true;
  allowLifeOSMutation: false;
  allowActions: false;
  allowTools: false;
  allowExternalRetrieval: false;
  allowPrediction: false;
  allowSimulation: false;
}

export interface AtlasAIRequest {
  version: typeof ATLAS_AI_REQUEST_VERSION;
  requestId: string;
  purpose: AtlasAIRequestPurpose;
  prompt: string;
  context: AtlasReasoningContext;
  constraints: AtlasAIRequestConstraints;
}

export interface AtlasAIRequestInput {
  requestId: string;
  purpose: AtlasAIRequestPurpose;
  prompt: string;
  context: AtlasReasoningContext;
}

export type AtlasAIResponseStatus =
  | "completed"
  | "insufficient-evidence"
  | "refused";

export type AtlasAICitationSource =
  | "factualState"
  | "priorities"
  | "risks"
  | "dailyBrief"
  | "recommendations"
  | "historyCoverage"
  | "historicalPatterns"
  | "limitations"
  | "profile";

export interface AtlasAICitation {
  source: AtlasAICitationSource;
  path: string;
  explanation: string;
}

export interface AtlasAIResponse {
  version: typeof ATLAS_AI_RESPONSE_VERSION;
  requestId: string;
  providerId: string;
  status: AtlasAIResponseStatus;
  content: string;
  citations: readonly AtlasAICitation[];
  limitations: readonly string[];
}

export type AtlasAIProviderKind =
  | "local"
  | "cloud";

export interface AtlasAIProviderDescriptor {
  id: string;
  displayName: string;
  kind: AtlasAIProviderKind;
}

export interface AtlasAIProvider {
  readonly descriptor:
    AtlasAIProviderDescriptor;

  reason(
    request: AtlasAIRequest
  ): Promise<AtlasAIResponse>;
}

const REQUEST_CONSTRAINTS:
  AtlasAIRequestConstraints = {
    groundedInContextOnly: true,
    requireEvidenceReferences: true,
    allowLifeOSMutation: false,
    allowActions: false,
    allowTools: false,
    allowExternalRetrieval: false,
    allowPrediction: false,
    allowSimulation: false,
  };

export function createAtlasAIRequest(
  input: AtlasAIRequestInput
): AtlasAIRequest {
  return {
    version: ATLAS_AI_REQUEST_VERSION,
    requestId: input.requestId,
    purpose: input.purpose,
    prompt: input.prompt,
    context: structuredClone(input.context),
    constraints: {
      ...REQUEST_CONSTRAINTS,
    },
  };
}
