import assert from "node:assert/strict";
import test from "node:test";

import {
  atlasInteractionReducer,
  getAtlasInteractionError,
  INITIAL_ATLAS_INTERACTION_STATE,
} from "../../src/atlas/interaction/interactionState.ts";

import type {
  AtlasAIOrchestrationResult,
} from "../../src/atlas/orchestration/types.ts";

import {
  presentAtlasEvidence,
  resolveAtlasEvidenceValue,
} from "../../src/atlas/interaction/evidencePresentation.ts";

import type {
  AtlasAICitation,
} from "../../src/atlas/reasoning/atlasAIProvider.ts";

import type {
  AtlasReasoningContext,
} from "../../src/atlas/reasoning/types.ts";

const RESULT = {
  version: "1.0.0",
  request: {
    requestId: "request-1",
    purpose: "grounded-answer",
    prompt: "What should I focus on?",
  },
  deterministic: {},
  provider: {
    invocationStatus: "success",
    responseStatus: "completed",
    descriptor: {
      id: "fake-atlas",
      displayName: "Fake ATLAS",
      kind: "local",
    },
    content: "Maintain momentum.",
    citations: [],
    limitations: [],
    errors: [],
  },
} as unknown as AtlasAIOrchestrationResult;

test(
  "moves through idle, loading, and success for the active request",
  () => {
    const loading = atlasInteractionReducer(
      INITIAL_ATLAS_INTERACTION_STATE,
      {
        type: "request-started",
        requestId: "request-1",
      }
    );

    const success = atlasInteractionReducer(
      loading,
      {
        type: "request-succeeded",
        requestId: "request-1",
        result: RESULT,
      }
    );

    assert.equal(loading.status, "loading");
    assert.equal(success.status, "success");
    assert.deepEqual(success.result, RESULT);
  }
);

test(
  "cancellation returns to idle and ignores the stale completion",
  () => {
    const loading = atlasInteractionReducer(
      INITIAL_ATLAS_INTERACTION_STATE,
      {
        type: "request-started",
        requestId: "request-1",
      }
    );

    const cancelled = atlasInteractionReducer(
      loading,
      {
        type: "request-cancelled",
        requestId: "request-1",
      }
    );

    const staleCompletion =
      atlasInteractionReducer(
        cancelled,
        {
          type: "request-succeeded",
          requestId: "request-1",
          result: RESULT,
        }
      );

    assert.deepEqual(
      cancelled,
      INITIAL_ATLAS_INTERACTION_STATE
    );
    assert.deepEqual(
      staleCompletion,
      INITIAL_ATLAS_INTERACTION_STATE
    );
  }
);

test(
  "a newer request cannot be overwritten by an older response",
  () => {
    const first = atlasInteractionReducer(
      INITIAL_ATLAS_INTERACTION_STATE,
      {
        type: "request-started",
        requestId: "request-1",
      }
    );

    const second = atlasInteractionReducer(
      first,
      {
        type: "request-started",
        requestId: "request-2",
      }
    );

    const stale = atlasInteractionReducer(
      second,
      {
        type: "request-succeeded",
        requestId: "request-1",
        result: RESULT,
      }
    );

    assert.equal(stale.status, "loading");
    assert.equal(
      stale.activeRequestId,
      "request-2"
    );
  }
);

test(
  "maps offline, empty, and validation failures to safe user-facing errors",
  () => {
    const createFailure = (
      invocationStatus:
        | "provider-error"
        | "empty-response"
        | "validation-error",
      message: string
    ) =>
      ({
        ...RESULT,
        provider: {
          invocationStatus,
          citations: [],
          limitations: [],
          errors: [
            {
              code:
                invocationStatus === "empty-response"
                  ? "empty-response"
                  : invocationStatus === "validation-error"
                  ? "invalid-citation"
                  : "provider-failure",
              path: "provider.reason",
              message,
            },
          ],
        },
      } as AtlasAIOrchestrationResult);

    assert.equal(
      getAtlasInteractionError(
        createFailure(
          "provider-error",
          "Local Ollama is unavailable."
        )
      ).kind,
      "provider-offline"
    );
    assert.equal(
      getAtlasInteractionError(
        createFailure("empty-response", "Empty")
      ).kind,
      "empty-response"
    );
    assert.equal(
      getAtlasInteractionError(
        createFailure(
          "validation-error",
          "Invalid citation"
        )
      ).kind,
      "validation-failure"
    );
  }
);

test(
  "presents validated evidence readably while preserving its exact source, path, and value",
  () => {
    const context = {
      factualState: {
        tasks: { completedToday: 6 },
        habits: { completedToday: 5 },
        execution: { xpToday: 200 },
      },
      risks: { overallRisk: "none" },
      dailyBrief: {
        primaryFocus: {
          title: "Maintain momentum",
          reasons: [
            "No ranked active task is available.",
          ],
        },
      },
    } as unknown as AtlasReasoningContext;
    const cases: Array<{
      citation: AtlasAICitation;
      summary: string;
      value: unknown;
    }> = [
      {
        citation: {
          source: "factualState",
          path: "tasks.completedToday",
          explanation: "Task completion evidence.",
        },
        summary: "6 tasks completed today",
        value: 6,
      },
      {
        citation: {
          source: "factualState",
          path: "habits.completedToday",
          explanation: "Habit completion evidence.",
        },
        summary: "5 habits completed today",
        value: 5,
      },
      {
        citation: {
          source: "factualState",
          path: "execution.xpToday",
          explanation: "XP evidence.",
        },
        summary: "200 XP recorded today",
        value: 200,
      },
      {
        citation: {
          source: "risks",
          path: "overallRisk",
          explanation: "Risk evidence.",
        },
        summary: "No active risk detected",
        value: "none",
      },
      {
        citation: {
          source: "dailyBrief",
          path: "primaryFocus.title",
          explanation: "Current focus evidence.",
        },
        summary: "Maintain momentum",
        value: "Maintain momentum",
      },
      {
        citation: {
          source: "dailyBrief",
          path: "primaryFocus.reasons[0]",
          explanation: "Primary focus evidence.",
        },
        summary: "No ranked active task is available.",
        value: "No ranked active task is available.",
      },
    ];

    cases.forEach(({ citation, summary, value }) => {
      const before = structuredClone(citation);
      const presented = presentAtlasEvidence(
        context,
        citation
      );

      assert.equal(presented.summary, summary);
      assert.equal(presented.source, citation.source);
      assert.equal(presented.path, citation.path);
      assert.equal(presented.value, value);
      assert.equal(
        resolveAtlasEvidenceValue(context, citation),
        value
      );
      assert.deepEqual(citation, before);
    });
  }
);
