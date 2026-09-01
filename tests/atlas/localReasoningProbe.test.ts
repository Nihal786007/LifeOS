import assert from "node:assert/strict";
import test from "node:test";

import {
  DeterministicFakeAtlasAIProvider,
} from "../../src/atlas/providerConformance/fakeProvider.ts";

import {
  ATLAS_LOCAL_REASONING_PROMPT,
  runAtlasLocalReasoningProbe,
} from "../../src/atlas/localReasoning/runAtlasLocalReasoningProbe.ts";

import type {
  AtlasCanonicalState,
} from "../../src/atlas/state/types.ts";

const STATE: AtlasCanonicalState = {
  capturedAt: "2026-09-01T12:00:00.000Z",
  tasks: [],
  habitDefinitions: [],
  habitCompletions: [],
  lifeGoals: [],
  monthlyTargets: [],
  weeklyTargets: [],
  executionHistory: [],
  captures: [],
  profile: {
    name: "Nihal",
    occupation: "Engineer",
    timezone: "Asia/Kolkata",
    theme: "dark",
    atlasPersonality: "Professional",
    level: 1,
    xp: 0,
  },
};

test(
  "composes one canonical snapshot through deterministic intelligence and provider conformance",
  async () => {
    const before = structuredClone(STATE);

    const result =
      await runAtlasLocalReasoningProbe(
        STATE,
        new DeterministicFakeAtlasAIProvider()
      );

    assert.deepEqual(STATE, before);
    assert.equal(result.version, "1.0.0");
    assert.equal(
      result.prompt,
      "What should I focus on today and why?"
    );
    assert.equal(
      result.prompt,
      ATLAS_LOCAL_REASONING_PROMPT
    );
    assert.equal(result.status, "success");
    assert.equal(
      result.snapshotCapturedAt,
      STATE.capturedAt
    );
    assert.equal(
      result.requestId,
      `atlas-local-reasoning:${STATE.capturedAt}`
    );
    assert.match(
      result.content ?? "",
      /Maintain momentum/
    );
    assert.deepEqual(result.citations, [
      {
        source: "dailyBrief",
        path: "primaryFocus.title",
        explanation:
          "The current primary focus from the deterministic Daily Brief.",
      },
    ]);
    assert.deepEqual(result.errors, []);
    assert.ok(
      result.limitations.includes(
        "Only the current intelligence report is available (0 current risk finding(s)); historical risk reports are not retained, so recurring risk categories cannot be established."
      )
    );
  }
);
