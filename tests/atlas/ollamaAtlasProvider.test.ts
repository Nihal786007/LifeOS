import assert from "node:assert/strict";
import test from "node:test";

import {
  createAtlasAIRequest,
} from "../../src/atlas/reasoning/atlasAIProvider.ts";

import type {
  AtlasAIRequest,
} from "../../src/atlas/reasoning/atlasAIProvider.ts";

import type {
  AtlasReasoningContext,
} from "../../src/atlas/reasoning/types.ts";

import {
  runAtlasProviderConformance,
} from "../../src/atlas/providerConformance/harness.ts";

import {
  DEFAULT_OLLAMA_BASE_URL,
  DEFAULT_OLLAMA_MODEL,
} from "../../src/atlas/providers/ollama/config.ts";

import {
  ATLAS_GROUNDING_BEGIN,
  ATLAS_GROUNDING_END,
  OLLAMA_ATLAS_RESPONSE_SCHEMA,
} from "../../src/atlas/providers/ollama/grounding.ts";

import {
  OllamaAtlasProvider,
} from "../../src/atlas/providers/ollama/ollamaAtlasProvider.ts";

import type {
  OllamaTransport,
  OllamaTransportRequest,
} from "../../src/atlas/providers/ollama/types.ts";

import {
  OllamaTransportError,
} from "../../src/atlas/providers/ollama/types.ts";

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
      title: "Build the local provider",
      reasons: ["Selected from priority rank 1."],
    },
    topPriorities: [],
    keyRisks: [],
    positiveSignals: [],
    suggestedNextAction: {
      kind: "start-top-priority",
      taskId: 1,
      title: "Start: Build the local provider",
      reasons: ["This is priority rank 1."],
    },
  },
  recommendations: [],
  historyCoverage: [],
  historicalPatterns: [],
  limitations: [
    {
      id: "risk-history-unavailable",
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
    requestId: "ollama-001",
    purpose: "grounded-answer",
    prompt: "What should I focus on?",
    context: CONTEXT,
  });
}

class MockOllamaTransport
implements OllamaTransport {
  requests: OllamaTransportRequest[] = [];

  private readonly response:
    | unknown
    | (() => Promise<unknown>);

  constructor(
    response:
      | unknown
      | (() => Promise<unknown>)
  ) {
    this.response = response;
  }

  async send(
    request: OllamaTransportRequest
  ): Promise<unknown> {
    this.requests.push(structuredClone(request));

    if (typeof this.response === "function") {
      return this.response();
    }

    return structuredClone(this.response);
  }
}

function chatResponse(
  modelOutput: unknown
): unknown {
  return {
    model: "llama3.2:3b",
    done: true,
    message: {
      role: "assistant",
      content:
        typeof modelOutput === "string"
          ? modelOutput
          : JSON.stringify(modelOutput),
    },
  };
}

function validModelOutput(): unknown {
  return {
    status: "completed",
    content:
      "Focus on building the local provider.",
    citations: [
      {
        source: "dailyBrief",
        path: "primaryFocus.title",
        explanation:
          "The deterministic brief names the current focus.",
      },
    ],
    limitations: [],
  };
}

test(
  "uses safe local defaults and rejects remote or cloud configuration",
  () => {
    const provider = new OllamaAtlasProvider({
      transport: new MockOllamaTransport(
        chatResponse(validModelOutput())
      ),
    });

    assert.equal(
      provider.config.baseUrl,
      DEFAULT_OLLAMA_BASE_URL
    );
    assert.equal(
      provider.config.model,
      DEFAULT_OLLAMA_MODEL
    );

    assert.throws(
      () =>
        new OllamaAtlasProvider({
          config: {
            baseUrl: "https://ollama.com",
          },
        }),
      /loopback-only/
    );

    assert.throws(
      () =>
        new OllamaAtlasProvider({
          config: {
            model: "gpt-oss:120b-cloud",
          },
        }),
      /Cloud-tagged/
    );
  }
);

test(
  "serializes only the ATLAS request into a strict delimited grounding call",
  async () => {
    const transport = new MockOllamaTransport(
      chatResponse(validModelOutput())
    );
    const provider = new OllamaAtlasProvider({
      config: {
        model: "llama3.2:1b",
        timeoutMs: 12_345,
      },
      transport,
    });
    const request = createRequest();
    const before = structuredClone(request);

    const result = await runAtlasProviderConformance(
      provider,
      request
    );

    assert.equal(result.status, "success");
    assert.deepEqual(request, before);
    assert.equal(transport.requests.length, 1);

    const sent = transport.requests[0];
    assert.equal(
      sent?.url,
      "http://127.0.0.1:11434/api/chat"
    );
    assert.equal(sent?.timeoutMs, 12_345);
    assert.equal(sent?.body.model, "llama3.2:1b");
    assert.equal(sent?.body.stream, false);
    assert.equal(sent?.body.think, false);
    assert.deepEqual(sent?.body.options, {
      temperature: 0,
      seed: 0,
    });
    assert.deepEqual(
      sent?.body.format,
      OLLAMA_ATLAS_RESPONSE_SCHEMA
    );
    assert.equal("tools" in (sent?.body ?? {}), false);

    const systemPrompt =
      sent?.body.messages[0]?.content ?? "";
    assert.match(
      systemPrompt,
      /Use only the evidence/
    );
    assert.match(
      systemPrompt,
      /userPrompt field is the question/
    );
    assert.match(
      systemPrompt,
      /Never invent facts/
    );
    assert.match(
      systemPrompt,
      /Citation source/
    );
    assert.match(
      systemPrompt,
      /Do not request or perform LifeOS mutations/
    );

    const grounding =
      sent?.body.messages[1]?.content ?? "";
    assert.ok(
      grounding.startsWith(ATLAS_GROUNDING_BEGIN)
    );
    assert.ok(
      grounding.endsWith(ATLAS_GROUNDING_END)
    );

    const serialized = grounding
      .slice(
        ATLAS_GROUNDING_BEGIN.length,
        -ATLAS_GROUNDING_END.length
      )
      .trim();
    const payload = JSON.parse(serialized);

    assert.equal(payload.requestId, request.requestId);
    assert.equal(payload.userPrompt, request.prompt);
    assert.deepEqual(
      payload.reasoningContext,
      request.context
    );
    assert.deepEqual(
      payload.constraints,
      request.constraints
    );
    assert.deepEqual(result.limitations, [
      "Historical risk reports are not retained.",
    ]);
    assert.deepEqual(
      result.response?.limitations,
      result.limitations
    );
  }
);

test(
  "surfaces invalid citations through provider conformance",
  async () => {
    const invalid = validModelOutput() as {
      citations: Array<{
        source: string;
        path: string;
        explanation: string;
      }>;
    };
    invalid.citations[0]!.path =
      "primaryFocus.nonexistent";

    const result = await runAtlasProviderConformance(
      new OllamaAtlasProvider({
        transport: new MockOllamaTransport(
          chatResponse(invalid)
        ),
      }),
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
  "handles unavailable, malformed, widened, and empty model results structurally",
  async (context) => {
    await context.test(
      "network and unavailable transport failure",
      async () => {
        const result = await runAtlasProviderConformance(
          new OllamaAtlasProvider({
            transport: new MockOllamaTransport(
              async () => {
                throw new OllamaTransportError(
                  "network",
                  "Local Ollama is unavailable or the loopback request failed."
                );
              }
            ),
          }),
          createRequest()
        );

        assert.equal(result.status, "provider-error");
        assert.equal(
          result.errors[0]?.code,
          "provider-failure"
        );
      }
    );

    await context.test(
      "timeout transport failure",
      async () => {
        const result = await runAtlasProviderConformance(
          new OllamaAtlasProvider({
            transport: new MockOllamaTransport(
              async () => {
                throw new OllamaTransportError(
                  "timeout",
                  "Local Ollama timed out after 30000 ms."
                );
              }
            ),
          }),
          createRequest()
        );

        assert.equal(result.status, "provider-error");
        assert.match(
          result.errors[0]?.message ?? "",
          /timed out/
        );
      }
    );

    await context.test(
      "malformed chat envelope",
      async () => {
        const result = await runAtlasProviderConformance(
          new OllamaAtlasProvider({
            transport: new MockOllamaTransport({
              done: true,
            }),
          }),
          createRequest()
        );

        assert.equal(result.status, "provider-error");
      }
    );

    await context.test(
      "malformed structured JSON",
      async () => {
        const result = await runAtlasProviderConformance(
          new OllamaAtlasProvider({
            transport: new MockOllamaTransport(
              chatResponse("not-json")
            ),
          }),
          createRequest()
        );

        assert.equal(result.status, "provider-error");
      }
    );

    await context.test(
      "authority-widening output",
      async () => {
        const widened = {
          ...(validModelOutput() as object),
          action: "complete-task",
        };
        const result = await runAtlasProviderConformance(
          new OllamaAtlasProvider({
            transport: new MockOllamaTransport(
              chatResponse(widened)
            ),
          }),
          createRequest()
        );

        assert.equal(result.status, "provider-error");
      }
    );

    await context.test(
      "empty assistant output",
      async () => {
        const result = await runAtlasProviderConformance(
          new OllamaAtlasProvider({
            transport: new MockOllamaTransport(
              chatResponse("")
            ),
          }),
          createRequest()
        );

        assert.equal(result.status, "empty-response");
        assert.equal(
          result.errors[0]?.code,
          "empty-response"
        );
      }
    );
  }
);

test(
  "rejects unexpected tool calls even without a tools request field",
  async () => {
    const result = await runAtlasProviderConformance(
      new OllamaAtlasProvider({
        transport: new MockOllamaTransport({
          done: true,
          message: {
            role: "assistant",
            content: JSON.stringify(validModelOutput()),
            tool_calls: [
              { function: { name: "write_task" } },
            ],
          },
        }),
      }),
      createRequest()
    );

    assert.equal(result.status, "provider-error");
    assert.match(
      result.errors[0]?.message ?? "",
      /unsupported tool call/
    );
  }
);
