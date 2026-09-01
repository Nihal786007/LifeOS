import assert from "node:assert/strict";
import test from "node:test";

import {
  createAtlasAIRequest,
} from "../../src/atlas/reasoning/atlasAIProvider.ts";

import type {
  AtlasAIProviderDescriptor,
  AtlasAIRequest,
} from "../../src/atlas/reasoning/atlasAIProvider.ts";

import type {
  AtlasReasoningContext,
} from "../../src/atlas/reasoning/types.ts";

import {
  DeterministicFakeAtlasAIProvider,
} from "../../src/atlas/providerConformance/fakeProvider.ts";

import {
  runAtlasProviderConformance,
} from "../../src/atlas/providerConformance/harness.ts";

import {
  validateAtlasAICitation,
  validateProviderDescriptor,
} from "../../src/atlas/providerConformance/validation.ts";

const CAPTURED_AT =
  "2026-09-01T12:00:00.000Z";

const CONTEXT: AtlasReasoningContext = {
  version: "1.0.0",
  snapshotCapturedAt: CAPTURED_AT,
  sourceVersions: {
    intelligenceReport: "1.0.0",
    dailyBrief: "1.0.0",
    recommendationReport: "1.0.0",
    patternReport: "1.0.0",
  },
  profile: {
    name: "Nihal",
    occupation: "Engineer",
    timezone: "Asia/Kolkata",
    atlasPersonality: "Professional",
  },
  factualState: {
    date: "2026-09-01",
    tasks: {
      total: 1,
      active: 1,
      completed: 0,
      completedToday: 0,
      overdue: 0,
      dueToday: 1,
      undated: 0,
      highPriorityActive: 1,
    },
    planning: {
      activeGoals: 1,
      completedGoals: 0,
      overdueGoals: 0,
      activeMonthlyTargets: 1,
      activeWeeklyTargets: 1,
      unlinkedMonthlyTargets: 0,
      unlinkedWeeklyTargets: 0,
      unlinkedTasks: 0,
    },
    habits: {
      total: 1,
      active: 1,
      scheduledToday: 1,
      completedToday: 0,
      activeStreaks: 1,
    },
    execution: {
      totalEvents: 4,
      eventsToday: 0,
      totalXP: 40,
      xpToday: 0,
    },
  },
  priorities: {
    evaluatedAt: CAPTURED_AT,
    rankedTasks: [],
  },
  risks: {
    evaluatedAt: CAPTURED_AT,
    overallRisk: "none",
    findings: [],
  },
  dailyBrief: {
    version: "1.0.0",
    sourceReportVersion: "1.0.0",
    snapshotCapturedAt: CAPTURED_AT,
    primaryFocus: {
      kind: "priority",
      taskId: 1,
      title: "Build provider conformance",
      reasons: ["Selected from priority rank 1."],
    },
    topPriorities: [],
    keyRisks: [],
    positiveSignals: [],
    suggestedNextAction: {
      kind: "start-top-priority",
      taskId: 1,
      title: "Start: Build provider conformance",
      reasons: ["This is priority rank 1."],
    },
  },
  recommendations: [],
  historyCoverage: [
    {
      source: "execution-history",
      recordCount: 4,
      firstRecordedDate: "2026-08-20",
      lastRecordedDate: "2026-08-31",
    },
  ],
  historicalPatterns: [],
  limitations: [
    {
      id: "recurring-risk-history-unavailable",
      origin: "pattern-intelligence",
      evidenceSource:
        "current-intelligence-report",
      reason:
        "Historical risk reports are not retained.",
    },
  ],
};

function createRequest(): AtlasAIRequest {
  return createAtlasAIRequest({
    requestId: "conformance-001",
    purpose: "grounded-answer",
    prompt: "What is my primary focus?",
    context: CONTEXT,
  });
}

test(
  "accepts a conforming deterministic provider and preserves correlation and limitations",
  async () => {
    const provider =
      new DeterministicFakeAtlasAIProvider();
    const request = createRequest();
    const before = structuredClone(request);

    const first = await runAtlasProviderConformance(
      provider,
      request
    );
    const second = await runAtlasProviderConformance(
      provider,
      request
    );

    assert.deepEqual(second, first);
    assert.deepEqual(request, before);
    assert.equal(first.status, "success");
    assert.equal(
      first.response?.requestId,
      request.requestId
    );
    assert.equal(
      first.response?.providerId,
      provider.descriptor.id
    );
    assert.deepEqual(first.errors, []);
    assert.deepEqual(first.limitations, [
      "Historical risk reports are not retained.",
    ]);
    assert.deepEqual(
      first.response?.citations,
      [
        {
          source: "dailyBrief",
          path: "primaryFocus.title",
          explanation:
            "The current primary focus from the deterministic Daily Brief.",
        },
      ]
    );
  }
);

test(
  "rejects invalid descriptors and descriptor authority fields",
  async () => {
    const invalidDescriptor = {
      id: "Invalid Provider",
      displayName: "",
      kind: "remote",
      tools: ["write-task"],
    };

    const validation = validateProviderDescriptor(
      invalidDescriptor
    );

    assert.equal(validation.valid, false);
    assert.ok(
      validation.errors.every(
        (item) =>
          item.code === "invalid-descriptor"
      )
    );

    const provider =
      new DeterministicFakeAtlasAIProvider({
        descriptor:
          invalidDescriptor as unknown as
            AtlasAIProviderDescriptor,
      });

    const result = await runAtlasProviderConformance(
      provider,
      createRequest()
    );

    assert.equal(result.status, "validation-error");
  }
);

test(
  "accepts valid citation paths and rejects missing or unsafe paths",
  () => {
    const valid = validateAtlasAICitation(
      {
        source: "historyCoverage",
        path: "[0].recordCount",
        explanation: "Recorded history size.",
      },
      CONTEXT,
      0
    );

    const missing = validateAtlasAICitation(
      {
        source: "dailyBrief",
        path: "primaryFocus.missingField",
        explanation: "Missing field.",
      },
      CONTEXT,
      0
    );

    const unsafe = validateAtlasAICitation(
      {
        source: "profile",
        path: "__proto__.polluted",
        explanation: "Unsafe path.",
      },
      CONTEXT,
      0
    );

    assert.equal(valid.valid, true);
    assert.equal(missing.valid, false);
    assert.equal(unsafe.valid, false);
    assert.equal(
      missing.errors[0]?.code,
      "invalid-citation"
    );
  }
);

test(
  "surfaces invalid provider citations as validation errors",
  async () => {
    const provider =
      new DeterministicFakeAtlasAIProvider({
        behavior: "invalid-citation",
      });

    const result = await runAtlasProviderConformance(
      provider,
      createRequest()
    );

    assert.equal(result.status, "validation-error");
    assert.ok(
      result.errors.some(
        (item) => item.code === "invalid-citation"
      )
    );
    assert.equal(result.response, undefined);
  }
);

test(
  "handles empty responses and provider failures structurally",
  async () => {
    const empty = await runAtlasProviderConformance(
      new DeterministicFakeAtlasAIProvider({
        behavior: "empty-response",
      }),
      createRequest()
    );

    const failure = await runAtlasProviderConformance(
      new DeterministicFakeAtlasAIProvider({
        behavior: "provider-failure",
      }),
      createRequest()
    );

    assert.equal(empty.status, "empty-response");
    assert.equal(
      empty.errors[0]?.code,
      "empty-response"
    );
    assert.equal(failure.status, "provider-error");
    assert.equal(
      failure.errors[0]?.code,
      "provider-failure"
    );
    assert.deepEqual(failure.limitations, [
      "Historical risk reports are not retained.",
    ]);
  }
);

test(
  "detects request mutation and response authority widening without changing the caller request",
  async () => {
    const request = createRequest();
    const before = structuredClone(request);

    const mutated = await runAtlasProviderConformance(
      new DeterministicFakeAtlasAIProvider({
        behavior: "mutate-request",
      }),
      request
    );

    const widened = await runAtlasProviderConformance(
      new DeterministicFakeAtlasAIProvider({
        behavior: "widen-response",
      }),
      request
    );

    assert.deepEqual(request, before);
    assert.equal(mutated.status, "validation-error");
    assert.ok(
      mutated.errors.some(
        (item) => item.code === "request-mutated"
      )
    );
    assert.equal(widened.status, "validation-error");
    assert.ok(
      widened.errors.some(
        (item) => item.code === "authority-widening"
      )
    );
  }
);

test(
  "rejects requests that attempt to enable additional authority",
  async () => {
    const request = createRequest();
    const widenedRequest = {
      ...request,
      constraints: {
        ...request.constraints,
        allowTools: true,
      },
      actionExecutor: "write-task",
    } as unknown as AtlasAIRequest;

    const result = await runAtlasProviderConformance(
      new DeterministicFakeAtlasAIProvider(),
      widenedRequest
    );

    assert.equal(result.status, "validation-error");
    assert.ok(
      result.errors.some(
        (item) => item.code === "authority-widening"
      )
    );
  }
);
