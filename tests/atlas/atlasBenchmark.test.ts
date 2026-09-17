import assert from "node:assert/strict";
import test from "node:test";
import { runAtlasBenchmark } from "../../src/atlas/benchmark/atlasBenchmark.ts";
import { ATLAS_BENCHMARK_SCENARIOS } from "../../src/atlas/benchmark/scenarios.ts";
import { ATLAS_AI_RESPONSE_VERSION } from "../../src/atlas/reasoning/atlasAIProvider.ts";
import type { AtlasAIProvider } from "../../src/atlas/reasoning/atlasAIProvider.ts";
import { hostedTestContext } from "./hostedAtlasFixtures.ts";

const provider: AtlasAIProvider = {
  descriptor: { id: "benchmark-fake", displayName: "Benchmark Fake", kind: "cloud" },
  reason: async (request) => ({
    version: ATLAS_AI_RESPONSE_VERSION,
    requestId: request.requestId,
    providerId: "benchmark-fake",
    status: "completed",
    content: `Grounded focus: ${request.context.dailyBrief.primaryFocus.title}.`,
    citations: [{ source: "dailyBrief", path: "primaryFocus.title", explanation: "Trusted focus." }],
    limitations: request.context.limitations.map((item) => item.reason),
  }),
};

function clock() {
  let value = 0;
  return () => (value += 5);
}

test("benchmark defines exactly 20 repeatable ATLAS scenarios", () => {
  assert.equal(ATLAS_BENCHMARK_SCENARIOS.length, 20);
  assert.equal(new Set(ATLAS_BENCHMARK_SCENARIOS.map((item) => item.id)).size, 20);
  assert.ok(ATLAS_BENCHMARK_SCENARIOS.some((item) => item.id === "fabrication-attack"));
  assert.ok(ATLAS_BENCHMARK_SCENARIOS.some((item) => item.id === "action-proposal"));
});

test("benchmark records raw metrics without selecting a winner or embedding prices", async () => {
  const input = {
    runId: "repeatable-run",
    context: hostedTestContext(),
    candidates: [{ provider, model: "fake-v1", readUsage: () => ({ inputTokens: 1000, outputTokens: 100 }) }],
    pricing: [{ providerId: "benchmark-fake", model: "fake-v1", currency: "USD", inputPerMillion: 2, outputPerMillion: 10, configuredAt: "2026-09-17" }],
  };
  const first = await runAtlasBenchmark({ ...input, now: clock() });
  const second = await runAtlasBenchmark({ ...input, now: clock() });
  assert.deepEqual(second, first);
  assert.equal(first.results.length, 20);
  assert.equal(first.winnerSelected, false);
  assert.equal(first.results[0]?.estimatedCost?.value, 0.003);
  assert.ok(first.results.every((item) => item.checks.citationAdherence));
  assert.ok(first.results.every((item) => item.humanReviewDimensions.includes("planning-quality")));
});

test("benchmark cost is absent when externally supplied price or measured usage is absent", async () => {
  const report = await runAtlasBenchmark({
    runId: "no-price-run", context: hostedTestContext(), candidates: [{ provider, model: "fake-v1" }], now: clock(),
  });
  assert.ok(report.results.every((item) => item.estimatedCost === undefined));
});
