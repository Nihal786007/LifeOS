import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { createHostedAtlasRequest } from "../../src/atlas/providers/hosted/request.ts";
import { createAtlasReasonHandler } from "../../supabase/functions/atlas-reason/handler.ts";
import {
  buildMistralAtlasRequest,
  createMistralAtlasAdapter,
  DEFAULT_MISTRAL_API_BASE_URL,
  DEFAULT_MISTRAL_ATLAS_MODEL,
} from "../../supabase/functions/atlas-reason/adapters/mistral.ts";
import { HostedModelAdapterRegistry } from
  "../../supabase/functions/atlas-reason/providerRegistry.ts";
import {
  HostedProviderFailure,
  type HostedProviderFailureCategory,
} from "../../supabase/functions/atlas-reason/providerFailure.ts";
import { hostedTestRequest } from "../atlas/hostedAtlasFixtures.ts";

function mistralResponse(output: unknown, overrides: Record<string, unknown> = {}) {
  return {
    choices: [{
      finish_reason: "stop",
      message: { role: "assistant", content: JSON.stringify(output) },
    }],
    usage: { prompt_tokens: 132, completion_tokens: 29 },
    ...overrides,
  };
}

function edgeRequest(body: unknown) {
  return new Request("https://example.supabase.co/functions/v1/atlas-reason", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: "Bearer valid" },
    body: JSON.stringify(body),
  });
}

test("Mistral adapter sends a bounded strict JSON Schema request", async () => {
  const calls: Array<{ input: string | URL | Request; init?: RequestInit }> = [];
  const adapter = createMistralAtlasAdapter({
    apiKey: "server-only-mistral-key",
    fetchImpl: async (input, init) => {
      calls.push({ input, init });
      return Response.json(mistralResponse({
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

  assert.equal(adapter.provider, "mistral");
  assert.equal(adapter.model, DEFAULT_MISTRAL_ATLAS_MODEL);
  assert.equal(calls.length, 1);
  assert.equal(String(calls[0].input), `${DEFAULT_MISTRAL_API_BASE_URL}/chat/completions`);
  const headers = new Headers(calls[0].init?.headers);
  assert.equal(headers.get("Authorization"), "Bearer server-only-mistral-key");
  assert.equal(headers.get("Content-Type"), "application/json");
  const bodyText = String(calls[0].init?.body);
  assert.equal(bodyText.includes("server-only-mistral-key"), false);
  assert.equal(bodyText.includes("must-not-leave-edge-function"), false);
  const body = JSON.parse(bodyText);
  assert.equal(body.model, DEFAULT_MISTRAL_ATLAS_MODEL);
  assert.deepEqual(body.messages.map((message: { role: string }) => message.role),
    ["system", "user"]);
  assert.equal(body.response_format.type, "json_schema");
  assert.equal(body.response_format.json_schema.strict, true);
  assert.equal(body.response_format.json_schema.schema.additionalProperties, false);
  assert.deepEqual(body.response_format.json_schema.schema.required,
    ["commentary", "factReferences", "limitations"]);
  assert.equal(body.max_tokens, 512);
  assert.equal(body.stream, false);
  assert.equal("tools" in body, false);
  assert.equal("tool_choice" in body, false);
  assert.equal("temperature" in body, false);
  const grounding = JSON.parse(body.messages[1].content);
  assert.deepEqual(grounding.input.deterministicFactCore, request.factCore);
  assert.deepEqual(grounding.allowedFactReferences,
    request.factCore.facts.map((fact) => fact.ref));
  assert.deepEqual(grounding.input.nonCitableMemory, request.memory);
  assert.deepEqual(grounding.input.linguisticConversation, request.conversation);
  assert.deepEqual(result, {
    commentary: "Start with the highest-ranked grounded priority.",
    factReferences: ["f1"],
    limitations: [],
    inputTokens: 132,
    outputTokens: 29,
  });
});

test("Mistral request builder preserves deterministic authority and non-citable memory", () => {
  const request = createHostedAtlasRequest(hostedTestRequest());
  const body = buildMistralAtlasRequest(request, DEFAULT_MISTRAL_ATLAS_MODEL);
  const grounding = JSON.parse(body.messages[1].content);
  assert.deepEqual(grounding.input.deterministicFactCore, request.factCore);
  assert.deepEqual(grounding.allowedFactReferences,
    request.factCore.facts.map((fact) => fact.ref));
  assert.match(body.messages[0].content, /Memory is optional non-citable context/);
  assert.match(body.messages[0].content, /No tools, retrieval, prediction, or mutation authority/);
});

test("Mistral rejects malformed, extra-field, empty, truncated, and tool-bearing output", async () => {
  const request = createHostedAtlasRequest(hostedTestRequest());
  const invoke = async (payload: unknown) => createMistralAtlasAdapter({
    apiKey: "test",
    fetchImpl: async () => Response.json(payload),
  }).generate(request, {
    signal: new AbortController().signal,
    authenticatedUserId: "user-a",
  });
  await assert.rejects(() => invoke({ choices: [{
    finish_reason: "stop", message: { role: "assistant", content: "{" },
  }] }), /malformed structured output/);
  await assert.rejects(() => invoke(mistralResponse({
    commentary: "Grounded.", factReferences: ["f1"], limitations: [], extra: true,
  })), /invalid ATLAS output shape/);
  await assert.rejects(() => invoke({ choices: [{
    finish_reason: "stop", message: { role: "assistant", content: "" },
  }] }), /incomplete, empty, or tool-bearing/);
  await assert.rejects(() => invoke({ choices: [{
    finish_reason: "length", message: { role: "assistant", content: "truncated" },
  }] }), /incomplete, empty, or tool-bearing/);
  await assert.rejects(() => invoke({ choices: [{
    finish_reason: "stop",
    message: { role: "assistant", content: "{}", tool_calls: [] },
  }] }), /incomplete, empty, or tool-bearing/);
});

test("Mistral HTTP failures remain normalized, provider-identified, and opaque", async () => {
  const request = createHostedAtlasRequest(hostedTestRequest());
  const cases: ReadonlyArray<readonly [number, HostedProviderFailureCategory]> = [
    [400, "invalid_request_or_schema"], [401, "authentication"],
    [403, "permission"], [404, "model_not_found_or_unavailable"],
    [408, "timeout"], [429, "rate_limited"],
    [503, "provider_server_error"], [418, "unknown_provider_failure"],
  ];
  for (const [status, category] of cases) {
    const adapter = createMistralAtlasAdapter({
      apiKey: "server-only-secret",
      fetchImpl: async () => new Response(
        "sensitive provider body with credential and prompt details", { status }
      ),
    });
    await assert.rejects(() => adapter.generate(request, {
      signal: new AbortController().signal,
      authenticatedUserId: "user-a",
    }), (failure: unknown) => {
      assert.ok(failure instanceof HostedProviderFailure);
      assert.equal(failure.provider, "mistral");
      assert.equal(failure.upstreamHttpStatus, status);
      assert.equal(failure.category, category);
      const serialized = JSON.stringify(failure);
      assert.equal(serialized.includes("sensitive provider body"), false);
      assert.equal(serialized.includes("server-only-secret"), false);
      return true;
    });
  }
});

test("Mistral cancellation is forwarded and never converted to provider output", async () => {
  const request = createHostedAtlasRequest(hostedTestRequest());
  const controller = new AbortController();
  const adapter = createMistralAtlasAdapter({
    apiKey: "test",
    fetchImpl: async (_input, init) => {
      assert.equal(init?.signal, controller.signal);
      throw new DOMException("aborted", "AbortError");
    },
  });
  controller.abort();
  await assert.rejects(() => adapter.generate(request, {
    signal: controller.signal,
    authenticatedUserId: "user-a",
  }), /aborted/);
});

test("Mistral output cannot bypass unknown Fact Core reference validation", async () => {
  const request = createHostedAtlasRequest(hostedTestRequest());
  const adapter = createMistralAtlasAdapter({
    apiKey: "test",
    fetchImpl: async () => Response.json(mistralResponse({
      commentary: "Unsupported evidence reference.",
      factReferences: ["unknown"],
      limitations: [],
    })),
  });
  const handler = createAtlasReasonHandler({
    authenticate: async () => ({ userId: "user-a" }),
    configuredProvider: "mistral",
    registry: new HostedModelAdapterRegistry().register(adapter),
  });
  const response = await handler(edgeRequest(request));
  assert.equal(response.status, 502);
  assert.deepEqual(await response.json(), {
    error: "provider_failure",
    provider: "mistral",
    category: "unknown_provider_failure",
    message: "Hosted provider failed safely.",
  });
});

test("Mistral validates configuration and remains server-only", () => {
  assert.throws(() => createMistralAtlasAdapter({ apiKey: "   " }), /API key is required/);
  assert.throws(() => createMistralAtlasAdapter({
    apiKey: "test", apiBaseUrl: "http://insecure.example/v1",
  }), /credential-free HTTPS/);
  assert.throws(() => createMistralAtlasAdapter({
    apiKey: "test", apiBaseUrl: "https://user:password@example.com/v1",
  }), /credential-free HTTPS/);

  const entrypoint = readFileSync(new URL(
    "../../supabase/functions/atlas-reason/index.ts", import.meta.url
  ), "utf8");
  const registration = readFileSync(new URL(
    "../../supabase/functions/atlas-reason/runtimeRegistry.ts", import.meta.url
  ), "utf8");
  assert.match(registration, /normalized\(environment, "MISTRAL_API_KEY"\)/);
  assert.match(registration, /normalized\(environment, "MISTRAL_ATLAS_MODEL"\)/);
  assert.match(registration, /register\(createMistralAtlasAdapter/);
  assert.equal(`${entrypoint}\n${registration}`.includes("VITE_MISTRAL"), false);
});
