// ==========================================
// LifeOS ATLAS Deterministic Fake Provider
// ==========================================

import {
  ATLAS_AI_RESPONSE_VERSION,
} from "../reasoning/atlasAIProvider.ts";

import type {
  AtlasAIProvider,
  AtlasAIProviderDescriptor,
  AtlasAIRequest,
  AtlasAIResponse,
} from "../reasoning/atlasAIProvider";

export type FakeAtlasProviderBehavior =
  | "valid"
  | "empty-response"
  | "invalid-citation"
  | "provider-failure"
  | "mutate-request"
  | "widen-response";

export interface FakeAtlasProviderOptions {
  descriptor?: AtlasAIProviderDescriptor;
  behavior?: FakeAtlasProviderBehavior;
}

export class DeterministicFakeAtlasAIProvider
implements AtlasAIProvider {
  readonly descriptor:
    AtlasAIProviderDescriptor;

  private readonly behavior:
    FakeAtlasProviderBehavior;

  constructor(
    options: FakeAtlasProviderOptions = {}
  ) {
    this.descriptor = options.descriptor ?? {
      id: "fake-atlas",
      displayName: "Deterministic Fake ATLAS",
      kind: "local",
    };

    this.behavior = options.behavior ?? "valid";
  }

  async reason(
    request: AtlasAIRequest
  ): Promise<AtlasAIResponse> {
    if (this.behavior === "provider-failure") {
      throw new Error(
        "Deterministic fake provider failure."
      );
    }

    if (this.behavior === "mutate-request") {
      request.prompt = "Provider-mutated prompt";
    }

    const response: AtlasAIResponse = {
      version: ATLAS_AI_RESPONSE_VERSION,
      requestId: request.requestId,
      providerId: this.descriptor.id,
      status: "completed",
      content:
        this.behavior === "empty-response"
          ? ""
          : `Primary focus: ${request.context.dailyBrief.primaryFocus.title}.`,
      citations: [
        {
          source: "dailyBrief",
          path:
            this.behavior === "invalid-citation"
              ? "primaryFocus.missingField"
              : "primaryFocus.title",
          explanation:
            "The current primary focus from the deterministic Daily Brief.",
        },
      ],
      limitations:
        request.context.limitations.map(
          (limitation) => limitation.reason
        ),
    };

    if (this.behavior === "widen-response") {
      return {
        ...response,
        actions: ["mutate-lifeos"],
      } as AtlasAIResponse;
    }

    return response;
  }
}
