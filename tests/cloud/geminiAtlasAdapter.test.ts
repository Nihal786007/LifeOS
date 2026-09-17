import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { createHostedAtlasRequest } from "../../src/atlas/providers/hosted/request.ts";
import {
  buildGeminiAtlasRequest,
  createGeminiAtlasAdapter,
  DEFAULT_GEMINI_ATLAS_MODEL,
} from "../../supabase/functions/atlas-reason/adapters/gemini.ts";
import { hostedTestRequest } from "../atlas/hostedAtlasFixtures.ts";

function geminiResponse(output: unknown, overrides: Record<string, unknown> = {}) {
  return {
    candidates: [{
      finishReason: "STOP",
      content: { parts: [{ text: JSON.stringify(output) }] },
    }],
    usageMetadata: { promptTokenCount: 120, candidatesTokenCount: 30 },
    ...overrides,
  };
}

test("Gemini adapter serializes only bounded ATLAS grounding with structured output", async () => {
  const calls: Array<{ input: string | URL | Request; init?: RequestInit }> = [];
  const adapter = createGeminiAtlasAdapter({
    apiKey: "server-only-test-key",
    fetchImpl: async (input, init) => {
      calls.push({ input, init });
      return Response.json(geminiResponse({
        commentary: "Start with the highest-ranked grounded priority.",
        factReferences: ["f1"],
        limitations: [],
      }));
    },
  });
  const request = createHostedAtlasRequest(hostedTestRequest());
  const result = await adapter.generate(request, {
    signal: new AbortController().signal,
    authenticatedUserId: "must-not-leave-edge-function",
  });
  assert.equal(adapter.provider, "gemini");
  assert.equal(adapter.model, DEFAULT_GEMINI_ATLAS_MODEL);
  assert.equal(calls.length, 1);
  assert.match(String(calls[0].input), /gemini-3\.8-flash:generateContent$/);
  const headers = new Headers(calls[0].init?.headers);
  assert.equal(headers.get("x-goog-api-key"), "server-only-test-key");
  const bodyText = String(calls[0].init?.body);
  assert.equal(bodyText.includes("server-only-test-key"), false);
  assert.equal(bodyText.includes("must-not-leave-edge-function"), false);
  const body = JSON.parse(bodyText);
  assert.equal(body.generationConfig.responseFormat.text.mimeType, "application/json");
  assert.deepEqual(body.generationConfig.responseFormat.text.schema.required,
    ["commentary", "factReferences", "limitations"]);
  const grounding = JSON.parse(body.contents[0].parts[0].text);
  assert.deepEqual(grounding.allowedFactReferences,
    request.factCore.facts.map((fact) => fact.ref));
  assert.equal(grounding.input.deterministicFactCore.facts.length,
    request.factCore.facts.length);
  assert.equal("user_id" in grounding, false);
  assert.deepEqual(result, {
    commentary: "Start with the highest-ranked grounded priority.",
    factReferences: ["f1"],
    limitations: [],
    inputTokens: 120,
    outputTokens: 30,
  });
});

test("Gemini prompt preserves memory as non-citable and conversation as linguistic context", () => {
  const request = createHostedAtlasRequest(hostedTestRequest());
  const body = buildGeminiAtlasRequest(request);
  const grounding = JSON.parse(body.contents[0].parts[0].text);
  assert.deepEqual(grounding.input.nonCitableMemory, request.memory);
  assert.deepEqual(grounding.input.linguisticConversation, request.conversation);
  assert.deepEqual(grounding.allowedFactReferences,
    request.factCore.facts.map((fact) => fact.ref));
  assert.match(body.systemInstruction.parts[0].text, /Memory is optional non-citable context/);
  assert.match(body.systemInstruction.parts[0].text, /Conversation is linguistic context only/);
});

test("Gemini adapter rejects malformed, extra-field, empty, and truncated outputs", async () => {
  const request = createHostedAtlasRequest(hostedTestRequest());
  const invoke = async (payload: unknown) => createGeminiAtlasAdapter({
    apiKey: "test",
    fetchImpl: async () => Response.json(payload),
  }).generate(request, {
    signal: new AbortController().signal,
    authenticatedUserId: "user-a",
  });
  await assert.rejects(() => invoke({ candidates: [{
    finishReason: "STOP", content: { parts: [{ text: "{" }] },
  }] }), /malformed structured output/);
  await assert.rejects(() => invoke(geminiResponse({
    commentary: "Grounded.", factReferences: ["f1"], limitations: [], extra: true,
  })), /invalid ATLAS output shape/);
  await assert.rejects(() => invoke({ candidates: [{
    finishReason: "STOP", content: { parts: [{ text: "" }] },
  }] }), /incomplete or empty/);
  await assert.rejects(() => invoke({ candidates: [{
    finishReason: "MAX_TOKENS",
    content: { parts: [{ text: JSON.stringify({
      commentary: "Truncated", factReferences: ["f1"], limitations: [],
    }) }] },
  }] }), /incomplete or empty/);
});

test("Gemini adapter surfaces HTTP errors and forwards cancellation without leaking response bodies", async () => {
  const request = createHostedAtlasRequest(hostedTestRequest());
  const failing = createGeminiAtlasAdapter({
    apiKey: "secret",
    fetchImpl: async () => new Response("sensitive vendor error", { status: 429 }),
  });
  await assert.rejects(() => failing.generate(request, {
    signal: new AbortController().signal,
    authenticatedUserId: "user-a",
  }), (failure: unknown) => failure instanceof Error &&
    failure.message === "Gemini request failed with HTTP 429.");

  const controller = new AbortController();
  const cancelling = createGeminiAtlasAdapter({
    apiKey: "secret",
    fetchImpl: async (_input, init) => {
      assert.equal(init?.signal, controller.signal);
      throw new DOMException("aborted", "AbortError");
    },
  });
  controller.abort();
  await assert.rejects(() => cancelling.generate(request, {
    signal: controller.signal,
    authenticatedUserId: "user-a",
  }), /aborted/);
});

test("Gemini remains server-only and is registered only when its server secret exists", () => {
  const source = readFileSync(new URL(
    "../../supabase/functions/atlas-reason/index.ts", import.meta.url
  ), "utf8");
  assert.match(source, /Deno\.env\.get\("GEMINI_API_KEY"\)/);
  assert.match(source, /Deno\.env\.get\("GEMINI_ATLAS_MODEL"\)/);
  assert.equal(source.includes("VITE_GEMINI"), false);
  assert.equal(source.includes("register(createGeminiAtlasAdapter"), true);
});
