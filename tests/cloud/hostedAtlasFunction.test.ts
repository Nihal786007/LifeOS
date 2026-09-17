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

function handler(modelAdapter = adapter(), authenticate = async (token: string) =>
  token === "valid-a" ? { userId: "user-a" } : token === "valid-b" ? { userId: "user-b" } : null,
  timeoutMs = 100) {
  return createAtlasReasonHandler({
    authenticate,
    configuredProvider: "openai",
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
