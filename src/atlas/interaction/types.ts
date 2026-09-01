// ==========================================
// LifeOS ATLAS Interaction Controller Types
// ==========================================

import type {
  AtlasAIOrchestrationResult,
} from "../orchestration/types";

export type AtlasInteractionStatus =
  | "idle"
  | "loading"
  | "success"
  | "error";

export type AtlasInteractionErrorKind =
  | "provider-offline"
  | "empty-response"
  | "validation-failure"
  | "provider-failure";

export interface AtlasInteractionError {
  kind: AtlasInteractionErrorKind;
  title: string;
  message: string;
}

export interface AtlasInteractionState {
  status: AtlasInteractionStatus;
  activeRequestId?: string;
  result?: AtlasAIOrchestrationResult;
  error?: AtlasInteractionError;
}

export type AtlasInteractionEvent =
  | {
      type: "request-started";
      requestId: string;
    }
  | {
      type: "request-succeeded";
      requestId: string;
      result: AtlasAIOrchestrationResult;
    }
  | {
      type: "request-failed";
      requestId: string;
      result: AtlasAIOrchestrationResult;
      error: AtlasInteractionError;
    }
  | {
      type: "request-cancelled";
      requestId: string;
    }
  | {
      type: "source-changed";
    };
