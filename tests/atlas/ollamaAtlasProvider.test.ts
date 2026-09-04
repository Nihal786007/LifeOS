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
  DEFAULT_OLLAMA_NUM_PREDICT,
} from "../../src/atlas/providers/ollama/config.ts";

import {
  ATLAS_CONVERSATION_BEGIN,
  ATLAS_CONVERSATION_END,
  ATLAS_GROUNDING_BEGIN,
  ATLAS_GROUNDING_END,
  createOllamaAtlasCitationTargets,
  createOllamaAtlasResponseSchema,
} from "../../src/atlas/providers/ollama/grounding.ts";

import {
  validateAtlasAICitation,
} from "../../src/atlas/providerConformance/validation.ts";

import {
  OLLAMA_ATLAS_CONTEXT_WINDOW,
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
    conversation: [
      {
        role: "user",
        content: "Which task matters most?",
      },
      {
        role: "assistant",
        content:
          "A previous generated answer, not evidence.",
      },
    ],
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
  const citationToken =
    createOllamaAtlasCitationTargets(
      createRequest()
    ).find(
      (target) =>
        target.source === "dailyBrief" &&
        target.path === "primaryFocus.title"
    )?.token;

  assert.ok(citationToken);

  return {
    s: "completed",
    a:
      "Focus on building the local provider.",
    c: [
      {
        r: citationToken,
        e:
          "The deterministic brief names the current focus.",
      },
    ],
    l: [],
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
    assert.equal(
      provider.config.numPredict,
      DEFAULT_OLLAMA_NUM_PREDICT
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

    assert.throws(
      () =>
        new OllamaAtlasProvider({
          config: { numPredict: 0 },
        }),
      /output-token limit/
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
        numPredict: 300,
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
      num_ctx: OLLAMA_ATLAS_CONTEXT_WINDOW,
      num_predict: 300,
    });
    assert.deepEqual(
      sent?.body.format,
      createOllamaAtlasResponseSchema(request)
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
      /untrusted conversation block/
    );
    assert.match(
      systemPrompt,
      /never cite conversation text/i
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
      grounding.endsWith(ATLAS_CONVERSATION_END)
    );

    const trustedEnd = grounding.indexOf(
      ATLAS_GROUNDING_END
    );
    const conversationStart = grounding.indexOf(
      ATLAS_CONVERSATION_BEGIN
    );
    const trustedPayload = JSON.parse(
      grounding
        .slice(
          ATLAS_GROUNDING_BEGIN.length,
          trustedEnd
        )
        .trim()
    );
    const conversationPayload = JSON.parse(
      grounding
        .slice(
          conversationStart +
            ATLAS_CONVERSATION_BEGIN.length,
          -ATLAS_CONVERSATION_END.length
        )
        .trim()
    );

    assert.equal(
      trustedPayload.requestId,
      request.requestId
    );
    assert.deepEqual(
      trustedPayload.reasoningContext,
      request.context
    );
    assert.deepEqual(
      trustedPayload.constraints,
      request.constraints
    );
    assert.equal(
      JSON.stringify(trustedPayload).includes(
        "A previous generated answer, not evidence."
      ),
      false
    );
    assert.deepEqual(
      conversationPayload.recentTurns,
      request.conversation
    );
    assert.equal(
      conversationPayload.currentUserPrompt,
      request.prompt
    );
    assert.equal(
      conversationPayload.authority,
      "linguistic-context-only"
    );
    const targets =
      createOllamaAtlasCitationTargets(request);
    assert.deepEqual(
      trustedPayload.allowedCitationPaths.dailyBrief,
      targets
        .filter(
          (target) =>
            target.source === "dailyBrief"
        )
        .map((target) => target.path)
    );
    assert.deepEqual(
      trustedPayload.citationTokens,
      targets.map(({ token, source, path }) => ({
        token,
        source,
        path,
      }))
    );
    assert.equal(
      trustedPayload.citationTokens.some(
        (target: { source: string }) =>
          target.source === "conversation"
      ),
      false
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
  "derives only resolvable relative citation choices from each request context",
  () => {
    const firstRequest = createRequest();
    const firstTargets =
      createOllamaAtlasCitationTargets(
        firstRequest
      );

    firstTargets.forEach((target, index) => {
      const validation = validateAtlasAICitation(
        {
          source: target.source,
          path: target.path,
          explanation: "Generated from trusted context.",
        },
        firstRequest.context,
        index
      );

      assert.equal(validation.valid, true);
      assert.equal(
        target.path.startsWith(`${target.source}.`),
        false
      );
      assert.equal(target.path.includes("[ruleId="), false);
    });

    assert.ok(
      firstTargets.some(
        (target) =>
          target.source === "dailyBrief" &&
          target.path === "primaryFocus.title"
      )
    );
    assert.equal(
      firstTargets.some(
        (target) =>
          target.path.includes("Nihal") ||
          target.path.includes("Build the local provider")
      ),
      false
    );

    const secondContext = structuredClone(CONTEXT);
    secondContext.recommendations = [
      {
        id: "context-specific-recommendation",
        category: "execute-now",
        rank: 1,
        title: "Use this context only",
        suggestedAction: "Use fixture evidence.",
        reason: "Fixture-specific evidence.",
        evidence: [],
      },
    ];
    const secondRequest = createAtlasAIRequest({
      requestId: "ollama-002",
      purpose: "grounded-answer",
      prompt: "What changed?",
      context: secondContext,
    });
    const secondTargets =
      createOllamaAtlasCitationTargets(
        secondRequest
      );

    assert.equal(
      firstTargets.some(
        (target) =>
          target.source === "recommendations"
      ),
      false
    );
    assert.ok(
      secondTargets.some(
        (target) =>
          target.source === "recommendations" &&
          target.path === "[0].title"
      )
    );
    assert.notDeepEqual(
      secondTargets.map(
        ({ token, source, path }) => ({
          token,
          source,
          path,
        })
      ),
      firstTargets.map(
        ({ token, source, path }) => ({
          token,
          source,
          path,
        })
      )
    );
    assert.equal(
      secondTargets.some(
        (target) =>
          target.source === "conversation"
      ),
      false
    );
  }
);

test(
  "compact schema exposes only request-local citation tokens mapped to safe paths",
  () => {
    const schema = createOllamaAtlasResponseSchema(
      createRequest()
    ) as {
      properties: {
        c: {
          items: {
            properties: {
              r: { enum: string[] };
            };
          };
        };
      };
    };
    const choices =
      schema.properties.c.items.properties.r.enum;
    const targets =
      createOllamaAtlasCitationTargets(
        createRequest()
      );

    assert.ok(choices.length > 0);
    assert.deepEqual(
      choices,
      targets.map((target) => target.token)
    );
    assert.equal(
      JSON.stringify(schema).includes("taskId"),
      false
    );
    assert.equal(
      JSON.stringify(schema).includes("riskId"),
      false
    );
    targets.forEach((target) => {
      assert.match(target.token, /^c[1-9][0-9]*$/);
      assert.equal(
        target.path.startsWith(`${target.source}.`),
        false
      );
      assert.equal(target.path.includes("[ruleId="), false);
      assert.equal(target.path.includes("[metric="), false);
    });
  }
);

test(
  "rejects unsupported citation references before conformance",
  async () => {
    const invalid = validModelOutput() as {
      c: Array<{
        r: string;
        e: string;
      }>;
    };
    invalid.c[0]!.r = "c999999";

    const result = await runAtlasProviderConformance(
      new OllamaAtlasProvider({
        transport: new MockOllamaTransport(
          chatResponse(invalid)
        ),
      }),
      createRequest()
    );

    assert.equal(result.status, "provider-error");
    assert.ok(
      result.errors.some(
        (item) => item.code === "provider-failure"
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
      "missing required compact field",
      async () => {
        const incomplete =
          validModelOutput() as Record<
            string,
            unknown
          >;
        delete incomplete.c;

        const result =
          await runAtlasProviderConformance(
            new OllamaAtlasProvider({
              transport: new MockOllamaTransport(
                chatResponse(incomplete)
              ),
            }),
            createRequest()
          );

        assert.equal(
          result.status,
          "provider-error"
        );
        assert.equal(result.response, undefined);
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
