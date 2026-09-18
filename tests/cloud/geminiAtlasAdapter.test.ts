import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { createHostedAtlasRequest } from "../../src/atlas/providers/hosted/request.ts";
import {
  buildGeminiAtlasRequest,
  createGeminiAtlasAdapter,
  DEFAULT_GEMINI_ATLAS_MODEL,
  extractGoogleErrorMetadata,
} from "../../supabase/functions/atlas-reason/adapters/gemini.ts";
import {
  HostedProviderFailure,
  type HostedProviderFailureCategory,
} from "../../supabase/functions/atlas-reason/providerFailure.ts";
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
  assert.equal("temperature" in body.generationConfig, false);
  assert.equal(JSON.stringify(body.generationConfig).includes("maxLength"), false);
  assert.equal(body.generationConfig.maxOutputTokens, 512);
  assert.deepEqual(
    Object.keys(body.generationConfig.responseFormat.text).sort(),
    ["mimeType", "schema"]
  );
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

test("Gemini adapter normalizes HTTP failures without leaking response bodies or credentials", async () => {
  const request = createHostedAtlasRequest(hostedTestRequest());
  const cases: ReadonlyArray<readonly [number, HostedProviderFailureCategory]> = [
    [400, "invalid_request_or_schema"],
    [401, "authentication"],
    [403, "permission"],
    [404, "model_not_found_or_unavailable"],
    [408, "timeout"],
    [429, "rate_limited"],
    [503, "provider_server_error"],
    [418, "unknown_provider_failure"],
  ];
  for (const [status, category] of cases) {
    const failing = createGeminiAtlasAdapter({
      apiKey: "server-only-secret",
      fetchImpl: async () => new Response(
        "sensitive vendor body with prompt, token, and credential details",
        { status }
      ),
    });
    await assert.rejects(() => failing.generate(request, {
      signal: new AbortController().signal,
      authenticatedUserId: "user-a",
    }), (failure: unknown) => {
      assert.ok(failure instanceof HostedProviderFailure);
      assert.equal(failure.provider, "gemini");
      assert.equal(failure.upstreamHttpStatus, status);
      assert.equal(failure.category, category);
      assert.equal(failure.googleStatus, undefined);
      assert.equal(failure.reason, undefined);
      assert.equal(failure.fieldViolationPaths, undefined);
      const serialized = JSON.stringify(failure);
      assert.equal(serialized.includes("sensitive vendor body"), false);
      assert.equal(serialized.includes("server-only-secret"), false);
      return true;
    });
  }
});

test("Gemini adapter allowlists only bounded structured Google error metadata", async () => {
  const oversized = "A".repeat(200);
  const metadata = extractGoogleErrorMetadata({
    error: {
      code: 400,
      status: "INVALID_ARGUMENT",
      message: "raw vendor message containing a credential and prompt",
      unexpected: { secret: "must-not-propagate" },
      details: [
        {
          "@type": "type.googleapis.com/google.rpc.ErrorInfo",
          reason: "INVALID_JSON_PAYLOAD",
          domain: "googleapis.com",
          metadata: { credential: "must-not-propagate" },
        },
        {
          "@type": "type.googleapis.com/google.rpc.BadRequest",
          fieldViolations: [
            { field: "generationConfig.responseFormat", description: "raw detail" },
            { field: "contents[0].parts", reason: "FIELD_INVALID" },
            { field: "generationConfig;credential=value" },
            { field: oversized },
          ],
        },
        {
          "@type": "type.googleapis.com/google.rpc.DebugInfo",
          reason: "SHOULD_NOT_PROPAGATE",
          fieldViolations: [{ field: "headers.authorization" }],
        },
      ],
    },
  });
  assert.deepEqual(metadata, {
    googleStatus: "INVALID_ARGUMENT",
    reason: "INVALID_JSON_PAYLOAD",
    fieldViolationPaths: ["generationConfig.responseFormat", "contents[0].parts"],
  });
  const serialized = JSON.stringify(metadata);
  for (const forbidden of ["raw vendor", "credential", "prompt", "must-not-propagate",
    "authorization", "SHOULD_NOT_PROPAGATE", oversized]) {
    assert.equal(serialized.includes(forbidden), false);
  }

  assert.deepEqual(extractGoogleErrorMetadata({
    error: {
      status: "x".repeat(100),
      details: [{
        "@type": "type.googleapis.com/google.rpc.ErrorInfo",
        reason: "contains spaces and untrusted text",
      }],
    },
  }), {});
});

test("Gemini adapter exposes safe JSON diagnostics and keeps non-JSON bodies opaque", async () => {
  const request = createHostedAtlasRequest(hostedTestRequest());
  const invoke = (response: Response) => createGeminiAtlasAdapter({
    apiKey: "server-only-secret",
    fetchImpl: async () => response,
  }).generate(request, {
    signal: new AbortController().signal,
    authenticatedUserId: "user-a",
  });
  await assert.rejects(() => invoke(Response.json({
    error: {
      code: 400,
      status: "INVALID_ARGUMENT",
      message: "raw message must remain private",
      details: [{
        "@type": "type.googleapis.com/google.rpc.BadRequest",
        fieldViolations: [{
          field: "generationConfig.responseFormat",
          reason: "FIELD_INVALID",
          description: "raw description must remain private",
        }],
      }],
    },
  }, { status: 400 })), (failure: unknown) => {
    assert.ok(failure instanceof HostedProviderFailure);
    assert.equal(failure.googleStatus, "INVALID_ARGUMENT");
    assert.equal(failure.reason, "FIELD_INVALID");
    assert.deepEqual(failure.fieldViolationPaths, ["generationConfig.responseFormat"]);
    const serialized = JSON.stringify(failure);
    assert.equal(serialized.includes("raw message"), false);
    assert.equal(serialized.includes("raw description"), false);
    assert.equal(serialized.includes("server-only-secret"), false);
    return true;
  });
  await assert.rejects(() => invoke(new Response(
    "credential=private prompt=private", {
      status: 400,
      headers: { "Content-Type": "text/plain" },
    }
  )), (failure: unknown) => {
    assert.ok(failure instanceof HostedProviderFailure);
    assert.equal(failure.googleStatus, undefined);
    assert.equal(failure.reason, undefined);
    assert.equal(failure.fieldViolationPaths, undefined);
    assert.equal(JSON.stringify(failure).includes("credential"), false);
    return true;
  });
});

test("Gemini adapter forwards cancellation without converting it into vendor diagnostics", async () => {
  const request = createHostedAtlasRequest(hostedTestRequest());

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
  const entrypoint = readFileSync(new URL(
    "../../supabase/functions/atlas-reason/index.ts", import.meta.url
  ), "utf8");
  const registration = readFileSync(new URL(
    "../../supabase/functions/atlas-reason/runtimeRegistry.ts", import.meta.url
  ), "utf8");
  assert.match(entrypoint, /createHostedRuntimeRegistration\(Deno\.env\)/);
  assert.match(registration, /normalized\(environment, "GEMINI_API_KEY"\)/);
  assert.match(registration, /normalized\(environment, "GEMINI_ATLAS_MODEL"\)/);
  assert.equal(`${entrypoint}\n${registration}`.includes("VITE_GEMINI"), false);
  assert.equal(registration.includes("register(createGeminiAtlasAdapter"), true);
});
