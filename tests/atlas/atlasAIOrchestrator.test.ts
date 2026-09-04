import assert from "node:assert/strict";
import test from "node:test";

import {
  AtlasAIOrchestrator,
} from "../../src/atlas/orchestration/AtlasAIOrchestrator.ts";

import {
  DeterministicFakeAtlasAIProvider,
} from "../../src/atlas/providerConformance/fakeProvider.ts";

import {
  ATLAS_AI_RESPONSE_VERSION,
} from "../../src/atlas/reasoning/atlasAIProvider.ts";

import type {
  AtlasAIProvider,
  AtlasAIRequest,
  AtlasAIResponse,
} from "../../src/atlas/reasoning/atlasAIProvider.ts";

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

const INPUT = {
  state: STATE,
  requestId: "orchestration-001",
  purpose: "grounded-answer" as const,
  prompt: "What should I focus on today?",
};

class CapturingProvider
implements AtlasAIProvider {
  readonly descriptor = {
    id: "capturing-provider",
    displayName: "Capturing Provider",
    kind: "local" as const,
  };

  readonly requests: AtlasAIRequest[] = [];

  async reason(
    request: AtlasAIRequest
  ): Promise<AtlasAIResponse> {
    this.requests.push(structuredClone(request));

    return {
      version: ATLAS_AI_RESPONSE_VERSION,
      requestId: request.requestId,
      providerId: this.descriptor.id,
      status: "completed",
      content:
        `Primary focus: ${request.context.dailyBrief.primaryFocus.title}.`,
      citations: [
        {
          source: "dailyBrief",
          path: "primaryFocus.title",
          explanation:
            "The deterministic brief supplies the focus.",
        },
      ],
      limitations:
        request.context.limitations.map(
          (item) => item.reason
        ),
    };
  }
}

function containsFunction(value: unknown): boolean {
  if (typeof value === "function") {
    return true;
  }

  if (
    typeof value !== "object" ||
    value === null
  ) {
    return false;
  }

  return Object.values(value).some(
    containsFunction
  );
}

test(
  "builds the same isolated deterministic reasoning package from the same trusted snapshot",
  () => {
    const before = structuredClone(STATE);
    const orchestrator =
      new AtlasAIOrchestrator(
        new DeterministicFakeAtlasAIProvider()
      );

    const first =
      orchestrator.buildDeterministicPackage(
        STATE
      );
    const second =
      orchestrator.buildDeterministicPackage(
        STATE
      );

    assert.deepEqual(second, first);
    assert.deepEqual(STATE, before);
    assert.equal(first.version, "1.0.0");
    assert.equal(
      first.snapshotCapturedAt,
      STATE.capturedAt
    );
    assert.equal(
      first.intelligenceReport.snapshotCapturedAt,
      STATE.capturedAt
    );
    assert.deepEqual(
      first.reasoningContext.dailyBrief,
      first.dailyBrief
    );
    assert.deepEqual(
      first.reasoningContext.recommendations,
      first.recommendationReport.recommendations
    );
    assert.deepEqual(
      first.reasoningContext.historicalPatterns,
      first.patternReport.patterns
    );
  }
);

test(
  "injects one provider and returns a validated UI-facing production result",
  async () => {
    const provider = new CapturingProvider();
    const orchestrator =
      new AtlasAIOrchestrator(provider);
    const before = structuredClone(STATE);

    const result = await orchestrator.reason(INPUT);

    assert.deepEqual(STATE, before);
    assert.equal(provider.requests.length, 1);
    assert.deepEqual(
      provider.requests[0]?.conversation,
      []
    );
    assert.deepEqual(
      provider.requests[0]?.context,
      result.deterministic.reasoningContext
    );
    assert.equal(
      result.provider.invocationStatus,
      "success"
    );
    assert.equal(
      result.provider.responseStatus,
      "completed"
    );
    assert.equal(
      result.provider.descriptor?.id,
      provider.descriptor.id
    );
    assert.match(
      result.provider.content ?? "",
      /Maintain momentum/
    );
    assert.deepEqual(result.provider.errors, []);
    assert.deepEqual(
      result.provider.citations,
      [
        {
          source: "dailyBrief",
          path: "primaryFocus.title",
          explanation:
            "The deterministic brief supplies the focus.",
        },
      ]
    );
  }
);

test(
  "passes bounded provider-neutral conversation without changing factual context",
  async () => {
    const provider = new CapturingProvider();
    const orchestrator =
      new AtlasAIOrchestrator(provider);
    const conversation = [
      {
        role: "user" as const,
        content: "What should I focus on?",
      },
      {
        role: "assistant" as const,
        content: "Maintain momentum.",
      },
    ];

    const result = await orchestrator.reason({
      ...INPUT,
      prompt: "Why that one?",
      conversation,
    });

    assert.deepEqual(
      provider.requests[0]?.conversation,
      conversation
    );
    assert.deepEqual(
      provider.requests[0]?.context,
      result.deterministic.reasoningContext
    );
    assert.equal(
      JSON.stringify(
        provider.requests[0]?.context
      ).includes("Maintain momentum."),
      false
    );
  }
);

test(
  "passes active user-confirmed memory without reinterpreting it or merging it into factual context",
  async () => {
    const provider = new CapturingProvider();
    const orchestrator = new AtlasAIOrchestrator(provider);
    const memory = [{
      id: "memory-1",
      type: "preference" as const,
      topic: "SAT study time",
      content: "I prefer studying SAT in the morning.",
      source: "explicit_user_statement" as const,
      createdAt: "2026-09-04T12:00:00.000Z",
      updatedAt: "2026-09-04T12:00:00.000Z",
      status: "active" as const,
    }];
    const before = structuredClone(memory);

    const result = await orchestrator.reason({
      ...INPUT,
      memory,
    });

    assert.deepEqual(memory, before);
    assert.deepEqual(provider.requests[0]?.memory, memory);
    assert.deepEqual(
      provider.requests[0]?.context,
      result.deterministic.reasoningContext
    );
    assert.equal(
      JSON.stringify(result.deterministic.reasoningContext).includes(
        memory[0].content
      ),
      false
    );
  }
);

test(
  "preserves empty, provider-error, and validation-error conformance outcomes",
  async (context) => {
    const cases = [
      {
        behavior: "empty-response" as const,
        status: "empty-response",
        errorCode: "empty-response",
      },
      {
        behavior: "provider-failure" as const,
        status: "provider-error",
        errorCode: "provider-failure",
      },
      {
        behavior: "invalid-citation" as const,
        status: "validation-error",
        errorCode: "invalid-citation",
      },
    ] as const;

    for (const item of cases) {
      await context.test(
        item.behavior,
        async () => {
          const result =
            await new AtlasAIOrchestrator(
              new DeterministicFakeAtlasAIProvider({
                behavior: item.behavior,
              })
            ).reason(INPUT);

          assert.equal(
            result.provider.invocationStatus,
            item.status
          );
          assert.ok(
            result.provider.errors.some(
              (error) =>
                error.code === item.errorCode
            )
          );
          assert.equal(
            result.provider.content,
            undefined
          );
          assert.equal(
            result.provider.citations.length,
            0
          );
        }
      );
    }
  }
);

test(
  "exposes deterministic data and standard provider results without provider internals or authority handles",
  async () => {
    const result =
      await new AtlasAIOrchestrator(
        new DeterministicFakeAtlasAIProvider()
      ).reason(INPUT);

    assert.deepEqual(
      Object.keys(result).sort(),
      [
        "deterministic",
        "provider",
        "request",
        "version",
      ]
    );
    assert.deepEqual(
      Object.keys(result.provider).sort(),
      [
        "citations",
        "content",
        "descriptor",
        "errors",
        "invocationStatus",
        "limitations",
        "responseStatus",
      ]
    );
    assert.equal(containsFunction(result), false);

    const serialized = JSON.stringify(result);

    assert.equal(
      serialized.includes("transport"),
      false
    );
    assert.equal(
      serialized.includes("baseUrl"),
      false
    );
    assert.equal(
      serialized.includes("timeoutMs"),
      false
    );
    assert.equal(
      serialized.includes("allowLifeOSMutation"),
      false
    );
  }
);
