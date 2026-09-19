import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { createHostedAtlasRequest } from "../../src/atlas/providers/hosted/request.ts";
import { hostedTestRequest } from "../atlas/hostedAtlasFixtures.ts";
import { createAtlasReasonHandler } from "../../supabase/functions/atlas-reason/handler.ts";
import {
  HostedModelAdapterRegistry,
  type HostedModelAdapter,
} from "../../supabase/functions/atlas-reason/providerRegistry.ts";
import { HostedProviderFailure } from "../../supabase/functions/atlas-reason/providerFailure.ts";
import type { HostedProviderSelectionDiagnostic } from
  "../../supabase/functions/atlas-reason/runtimeRegistry.ts";

function adapter(overrides: Partial<HostedModelAdapter> = {}): HostedModelAdapter {
  return {
    provider: "openai", model: "mock-model",
    generate: async () => ({ commentary: "A concise grounded explanation.", factReferences: ["f1"], limitations: [], inputTokens: 50, outputTokens: 10 }),
    ...overrides,
  };
}

function request(body: unknown, token?: string) {
  return new Request("https://example.supabase.co/functions/v1/atlas-reason", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(body),
  });
}

function diagnosticRequest(token?: string) {
  return new Request(
    "https://example.supabase.co/functions/v1/atlas-reason?diagnostic=provider-selection",
    { method: "GET", headers: token ? { Authorization: `Bearer ${token}` } : {} }
  );
}

function handler(modelAdapter = adapter(), authenticate = async (token: string) =>
  token === "valid-a" ? { userId: "user-a" } : token === "valid-b" ? { userId: "user-b" } : null,
  timeoutMs = 100) {
  return createAtlasReasonHandler({
    authenticate,
    configuredProvider: modelAdapter.provider,
    registry: new HostedModelAdapterRegistry().register(modelAdapter),
    timeoutMs,
  });
}

test("backend rejects missing, invalid, and expired authentication", async () => {
  const body = createHostedAtlasRequest(hostedTestRequest());
  assert.equal((await handler()(request(body))).status, 401);
  assert.equal((await handler()(request(body, "invalid"))).status, 401);
  assert.equal((await handler()(request(body, "expired"))).status, 401);
});

test("authenticated provider diagnostic returns only safe selection metadata without invoking a model", async () => {
  let providerCalls = 0;
  const model = adapter({ generate: async () => {
    providerCalls += 1;
    throw new Error("must not run");
  } });
  const diagnostic: HostedProviderSelectionDiagnostic = {
    configuredProviderId: "qwen",
    selectedProviderId: "qwen",
    providerRegistered: true,
    qwenApiKeyPresent: true,
    qwenModelConfigured: true,
    qwenBaseUrlConfigured: true,
    mistralApiKeyPresent: false,
    mistralModelConfigured: false,
    mistralBaseUrlConfigured: false,
  };
  const reason = createAtlasReasonHandler({
    authenticate: async (token) => token === "valid-a" ? { userId: "user-a" } : null,
    configuredProvider: "qwen",
    registry: new HostedModelAdapterRegistry().register({ ...model, provider: "qwen" }),
    providerSelectionDiagnostic: diagnostic,
  });
  assert.equal((await reason(diagnosticRequest())).status, 401);
  const response = await reason(diagnosticRequest("valid-a"));
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), diagnostic);
  assert.equal(providerCalls, 0);
});

test("backend derives separate authenticated identities and never trusts client user_id", async () => {
  const identities: string[] = [];
  const model = adapter({
    generate: async (_body, options) => {
      identities.push(options.authenticatedUserId);
      return { commentary: "Grounded for this authenticated request.", factReferences: ["f1"], limitations: [] };
    },
  });
  const body = createHostedAtlasRequest(hostedTestRequest());
  assert.equal((await handler(model)(request(body, "valid-a"))).status, 200);
  assert.equal((await handler(model)(request(body, "valid-b"))).status, 200);
  assert.deepEqual(identities, ["user-a", "user-b"]);
  assert.equal((await handler(model)(request({ ...body, user_id: "user-a" }, "valid-b"))).status, 400);
});

test("backend rejects unknown refs, provider failures, oversized requests, and timeouts", async () => {
  const body = createHostedAtlasRequest(hostedTestRequest());
  const unknown = adapter({ generate: async () => ({ commentary: "Invalid evidence.", factReferences: ["unknown"], limitations: [] }) });
  assert.equal((await handler(unknown)(request(body, "valid-a"))).status, 502);
  const failing = adapter({ generate: async () => { throw new Error("provider failed"); } });
  assert.equal((await handler(failing)(request(body, "valid-a"))).status, 502);
  assert.equal((await handler()(request({ ...body, currentQuestion: "x".repeat(21_000) }, "valid-a"))).status, 400);
  const slow = adapter({ generate: async (_body, options) => new Promise((_, reject) => {
    options.signal.addEventListener("abort", () => reject(new Error("aborted")), { once: true });
  }) });
  assert.equal((await handler(slow, undefined, 5)(request(body, "valid-a"))).status, 504);
});

test("backend returns only sanitized hosted-provider diagnostic metadata", async () => {
  const body = createHostedAtlasRequest(hostedTestRequest());
  const diagnosed = adapter({
    provider: "gemini",
    generate: async () => {
      throw new HostedProviderFailure({
        provider: "gemini",
        upstreamHttpStatus: 404,
        category: "model_not_found_or_unavailable",
        googleStatus: "NOT_FOUND",
        reason: "MODEL_NOT_FOUND",
        fieldViolationPaths: ["generationConfig.responseFormat"],
      });
    },
  });
  const response = await handler(diagnosed)(request(body, "valid-a"));
  assert.equal(response.status, 502);
  assert.deepEqual(await response.json(), {
    error: "provider_failure",
    provider: "gemini",
    upstreamStatus: 404,
    category: "model_not_found_or_unavailable",
    googleStatus: "NOT_FOUND",
    reason: "MODEL_NOT_FOUND",
    fieldViolationPaths: ["generationConfig.responseFormat"],
  });

  const unknown = adapter({
    provider: "gemini",
    generate: async () => {
      throw new Error("vendor response body containing credential and prompt details");
    },
  });
  const unknownResponse = await handler(unknown)(request(body, "valid-a"));
  assert.equal(unknownResponse.status, 502);
  const unknownBody = await unknownResponse.text();
  assert.deepEqual(JSON.parse(unknownBody), {
    error: "provider_failure",
    provider: "gemini",
    category: "unknown_provider_failure",
    message: "Hosted provider failed safely.",
  });
  assert.equal(unknownBody.includes("credential"), false);
  assert.equal(unknownBody.includes("prompt details"), false);
});

test("Qwen provider failures preserve only the safe selected provider ID", async () => {
  const body = createHostedAtlasRequest(hostedTestRequest());
  const qwen = adapter({
    provider: "qwen",
    generate: async () => {
      throw new HostedProviderFailure({
        provider: "qwen",
        upstreamHttpStatus: 503,
        category: "provider_server_error",
      });
    },
  });
  const response = await handler(qwen)(request(body, "valid-a"));
  assert.equal(response.status, 502);
  assert.deepEqual(await response.json(), {
    error: "provider_failure",
    provider: "qwen",
    upstreamStatus: 503,
    category: "provider_server_error",
  });
});

test("Mistral provider failures preserve only the safe selected provider ID", async () => {
  const body = createHostedAtlasRequest(hostedTestRequest());
  const mistral = adapter({
    provider: "mistral",
    generate: async () => {
      throw new HostedProviderFailure({
        provider: "mistral",
        upstreamHttpStatus: 429,
        category: "rate_limited",
      });
    },
  });
  const response = await handler(mistral)(request(body, "valid-a"));
  assert.equal(response.status, 502);
  assert.deepEqual(await response.json(), {
    error: "provider_failure",
    provider: "mistral",
    upstreamStatus: 429,
    category: "rate_limited",
  });
});

test("backend timeout diagnostics remain local and sanitized", async () => {
  const body = createHostedAtlasRequest(hostedTestRequest());
  const slow = adapter({
    provider: "gemini",
    generate: async (_body, options) => new Promise((_, reject) => {
      options.signal.addEventListener("abort", () => reject(new Error("raw timeout detail")), {
        once: true,
      });
    }),
  });
  const response = await handler(slow, undefined, 5)(request(body, "valid-a"));
  assert.equal(response.status, 504);
  assert.deepEqual(await response.json(), {
    error: "provider_timeout",
    provider: "gemini",
    category: "timeout",
    message: "Hosted provider timed out.",
  });
});

test("client source contains no hosted vendor API secret names", () => {
  const files = [
    "../../src/atlas/providers/hosted/contract.ts",
    "../../src/atlas/providers/hosted/request.ts",
    "../../src/atlas/providers/hosted/transport.ts",
    "../../src/atlas/providers/hosted/hostedAtlasProvider.ts",
    "../../src/atlas/providers/registry.ts",
    "../../src/atlas/composition/createLocalAtlasAIOrchestrator.ts",
  ];
  const source = files.map((file) => readFileSync(new URL(file, import.meta.url), "utf8")).join("\n");
  for (const secret of ["OPENAI_API_KEY", "GEMINI_API_KEY", "QWEN_API_KEY", "XAI_API_KEY", "MISTRAL_API_KEY", "DEEPSEEK_API_KEY"]) {
    assert.equal(source.includes(secret), false);
  }
});
