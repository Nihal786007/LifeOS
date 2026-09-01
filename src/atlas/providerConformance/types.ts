// ==========================================
// LifeOS ATLAS Provider Conformance Types
// ==========================================

import type {
  AtlasAIProviderDescriptor,
  AtlasAIResponse,
} from "../reasoning/atlasAIProvider";

export type AtlasProviderValidationErrorCode =
  | "invalid-descriptor"
  | "invalid-request"
  | "authority-widening"
  | "request-mutated"
  | "invalid-response"
  | "request-id-mismatch"
  | "provider-id-mismatch"
  | "invalid-citation"
  | "empty-response"
  | "provider-failure";

export interface AtlasProviderValidationError {
  code: AtlasProviderValidationErrorCode;
  path: string;
  message: string;
}

export interface AtlasProviderValidationResult {
  valid: boolean;
  errors:
    readonly AtlasProviderValidationError[];
}

export type AtlasProviderInvocationStatus =
  | "success"
  | "validation-error"
  | "empty-response"
  | "provider-error";

export interface AtlasProviderInvocationResult {
  status: AtlasProviderInvocationStatus;
  provider?: AtlasAIProviderDescriptor;
  response?: AtlasAIResponse;
  errors:
    readonly AtlasProviderValidationError[];
  limitations: readonly string[];
}
