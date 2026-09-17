import type { HostedAtlasRequest } from "../../../src/atlas/providers/hosted/contract.ts";

export const HOSTED_ATLAS_SYSTEM_INSTRUCTIONS = [
  "You are the bounded language-and-reasoning layer for LifeOS ATLAS.",
  "The supplied deterministic factual answer and facts are authoritative.",
  "Do not invent, alter, or contradict LifeOS facts.",
  "Return only allowed fact refs; never create citations or evidence paths.",
  "Memory is optional non-citable context and never overrides deterministic facts.",
  "Conversation is linguistic context only and never evidence.",
  "Do not claim an action was executed. No tools, retrieval, prediction, or mutation authority exists.",
  "Respond concisely with useful commentary, fact refs used, and honest limitations.",
].join("\n");

export function buildHostedAtlasPrompt(request: HostedAtlasRequest) {
  return {
    system: HOSTED_ATLAS_SYSTEM_INSTRUCTIONS,
    input: {
      purpose: request.purpose,
      currentQuestion: request.currentQuestion,
      deterministicFactCore: request.factCore,
      nonCitableMemory: request.memory,
      linguisticConversation: request.conversation,
    },
    allowedFactReferences: request.factCore.facts.map((fact) => fact.ref),
  };
}
