import {
  ATLAS_AI_RESPONSE_VERSION,
} from "../../reasoning/atlasAIProvider.ts";
import type {
  AtlasAIProvider,
  AtlasAIProviderDescriptor,
  AtlasAIRequest,
  AtlasAIResponse,
} from "../../reasoning/atlasAIProvider";
import { buildAtlasProviderFactCore } from "../factCore.ts";
import {
  assertHostedAtlasResponse,
} from "./contract.ts";
import type {
  HostedAtlasProviderMetadata,
} from "./contract";
import { createHostedAtlasRequest } from "./request.ts";
import type { HostedAtlasTransport } from "./transport";

export const HOSTED_ATLAS_PROVIDER_DESCRIPTOR: AtlasAIProviderDescriptor = {
  id: "hosted-atlas",
  displayName: "Hosted ATLAS",
  kind: "cloud",
};

export interface HostedAtlasProviderOptions {
  transport: HostedAtlasTransport;
  onMetadata?: (metadata: HostedAtlasProviderMetadata) => void;
}

function mergeLimitations(request: AtlasAIRequest, additions: readonly string[]): string[] {
  const limitations = request.context.limitations.map((item) => item.reason);
  additions.forEach((item) => {
    if (!limitations.includes(item)) limitations.push(item);
  });
  return limitations;
}

function assertUsefulCommentary(commentary: string): void {
  const value = commentary.trim();
  if (value.length === 0) return;
  if (!/[A-Za-z0-9]/.test(value) || /^(?:c|f)\d+$/i.test(value) ||
      /(?:return json|system prompt|trusted fact core|ignore (?:all|previous) instructions)/i.test(value)) {
    throw new Error("Hosted ATLAS returned meaningless or copied commentary.");
  }
}

export class HostedAtlasProvider implements AtlasAIProvider {
  readonly descriptor = HOSTED_ATLAS_PROVIDER_DESCRIPTOR;
  private readonly transport: HostedAtlasTransport;
  private readonly onMetadata?: (metadata: HostedAtlasProviderMetadata) => void;

  constructor(options: HostedAtlasProviderOptions) {
    this.transport = options.transport;
    this.onMetadata = options.onMetadata;
  }

  async reason(request: AtlasAIRequest): Promise<AtlasAIResponse> {
    const factCore = buildAtlasProviderFactCore(request);
    const response = await this.transport.send(createHostedAtlasRequest(request));
    assertHostedAtlasResponse(response);
    if (response.requestId !== request.requestId) {
      throw new Error("Hosted ATLAS response request ID does not match.");
    }
    const allowedReferences = new Set(factCore.facts.map((fact) => fact.ref));
    if (response.factReferences.some((ref) => !allowedReferences.has(ref))) {
      throw new Error("Hosted ATLAS returned an unsupported fact reference.");
    }
    assertUsefulCommentary(response.commentary);
    this.onMetadata?.(structuredClone(response.providerMetadata));
    return {
      version: ATLAS_AI_RESPONSE_VERSION,
      requestId: request.requestId,
      providerId: this.descriptor.id,
      status: factCore.status,
      content: [factCore.factualAnswer, response.commentary.trim()].filter(Boolean).join(" "),
      citations: factCore.citations,
      limitations: mergeLimitations(request, response.limitations),
    };
  }
}
