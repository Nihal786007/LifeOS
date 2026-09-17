import type { AtlasAIRequest } from "../../reasoning/atlasAIProvider";
import {
  ATLAS_PROVIDER_FACT_CORE_VERSION,
  buildAtlasProviderFactCore,
} from "../factCore.ts";
import {
  HOSTED_ATLAS_REQUEST_VERSION,
  assertHostedAtlasRequest,
} from "./contract.ts";
import type { HostedAtlasRequest } from "./contract";

export function createHostedAtlasRequest(request: AtlasAIRequest): HostedAtlasRequest {
  const factCore = buildAtlasProviderFactCore(request);
  const hostedRequest: HostedAtlasRequest = {
    version: HOSTED_ATLAS_REQUEST_VERSION,
    requestId: request.requestId,
    purpose: request.purpose,
    currentQuestion: request.prompt,
    factCore: {
      version: ATLAS_PROVIDER_FACT_CORE_VERSION,
      domain: factCore.domain,
      evidenceStatus: factCore.status,
      factualAnswer: factCore.factualAnswer,
      facts: factCore.facts.map(({ ref, label, value }) => ({ ref, label, value })),
    },
    memory: request.memory
      .filter((item) => item.status === "active")
      .slice(-3)
      .map(({ type, topic, content }) => ({ type, topic, content })),
    conversation: request.conversation.slice(-2),
    constraints: { ...request.constraints },
  };
  assertHostedAtlasRequest(hostedRequest);
  return structuredClone(hostedRequest);
}
