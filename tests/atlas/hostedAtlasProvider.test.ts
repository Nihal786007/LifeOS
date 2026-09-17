import assert from "node:assert/strict";
import test from "node:test";
import type { SupabaseClient } from "@supabase/supabase-js";
import { runAtlasProviderConformance } from "../../src/atlas/providerConformance/harness.ts";
import { HostedAtlasProvider } from "../../src/atlas/providers/hosted/hostedAtlasProvider.ts";
import { createHostedAtlasRequest } from "../../src/atlas/providers/hosted/request.ts";
import { buildAtlasProviderFactCore } from "../../src/atlas/providers/factCore.ts";
import {
  SupabaseHostedAtlasTransport,
  type HostedAtlasTransport,
} from "../../src/atlas/providers/hosted/transport.ts";
import { AtlasProviderRegistry, resolveAtlasProviderId } from "../../src/atlas/providers/registry.ts";
import { hostedTestRequest } from "./hostedAtlasFixtures.ts";

class StaticTransport implements HostedAtlasTransport {
  private readonly value: unknown;
  constructor(value: unknown) { this.value = value; }
  async send() { return structuredClone(this.value); }
}

function response(requestId: string, references = ["f1"]) {
  return {
    version: "1.0.0",
    requestId,
    commentary: "This keeps your attention on the supported next step.",
    factReferences: references,
    limitations: [],
    providerMetadata: { provider: "openai", model: "test-model", inputTokens: 100, outputTokens: 20, latencyMs: 10 },
  };
}

test("hosted request sends only bounded selected facts and non-citable context", () => {
  const request = hostedTestRequest();
  const hosted = createHostedAtlasRequest(request);
  assert.equal(hosted.currentQuestion, request.prompt);
  assert.ok(hosted.factCore.facts.length > 0);
  assert.equal("context" in hosted, false);
  assert.equal("user_id" in hosted, false);
  assert.equal(JSON.stringify(hosted).includes("allowedCitationPaths"), false);
  assert.equal(hosted.constraints.allowLifeOSMutation, false);
});

test("hosted provider reconstructs facts and citations deterministically", async () => {
  const request = hostedTestRequest();
  const metadata: unknown[] = [];
  const provider = new HostedAtlasProvider({
    transport: new StaticTransport(response(request.requestId)),
    onMetadata: (value) => metadata.push(value),
  });
  const result = await runAtlasProviderConformance(provider, request);
  assert.equal(result.status, "success");
  assert.ok(result.response?.content.startsWith(buildAtlasProviderFactCore(request).factualAnswer));
  assert.ok((result.response?.citations.length ?? 0) > 0);
  assert.equal(result.response?.citations.some((item) => item.source === ("memory" as never)), false);
  assert.equal(metadata.length, 1);
});

test("unknown refs, malformed output, empty content, and provider errors fail safely", async () => {
  const request = hostedTestRequest();
  const values: unknown[] = [
    response(request.requestId, ["unknown"]),
    { requestId: request.requestId },
    { ...response(request.requestId), commentary: "x".repeat(601) },
  ];
  for (const value of values) {
    const result = await runAtlasProviderConformance(
      new HostedAtlasProvider({ transport: new StaticTransport(value) }), request);
    assert.equal(result.status, "provider-error");
  }
  const failing: HostedAtlasTransport = { send: async () => { throw new Error("provider network failure"); } };
  const failure = await runAtlasProviderConformance(new HostedAtlasProvider({ transport: failing }), request);
  assert.equal(failure.status, "provider-error");
});

test("registry switches explicitly and rejects duplicates or unavailable providers", () => {
  const request = hostedTestRequest();
  const provider = new HostedAtlasProvider({ transport: new StaticTransport(response(request.requestId)) });
  const registry = new AtlasProviderRegistry().register(provider);
  assert.equal(registry.resolve("hosted-atlas"), provider);
  assert.throws(() => registry.register(provider), /already registered/);
  assert.throws(() => registry.resolve("ollama-local"), /unavailable/);
  assert.equal(resolveAtlasProviderId(undefined), "ollama-local");
  assert.throws(() => resolveAtlasProviderId("unknown"), /Unsupported/);
});

test("Supabase hosted transport enforces a finite timeout", async () => {
  const client = {
    auth: { getSession: async () => ({ data: { session: { access_token: "test-token" } }, error: null }) },
  } as unknown as SupabaseClient;
  const fetchImplementation: typeof fetch = async (_input, init) =>
    new Promise((_resolve, reject) => init?.signal?.addEventListener("abort", () =>
      reject(new DOMException("Aborted", "AbortError")), { once: true }));
  const transport = new SupabaseHostedAtlasTransport({
    client, supabaseUrl: "https://example.supabase.co", publishableKey: "publishable-test",
    timeoutMs: 5, fetchImplementation,
  });
  await assert.rejects(() => transport.send(createHostedAtlasRequest(hostedTestRequest())), /timed out/);
});
