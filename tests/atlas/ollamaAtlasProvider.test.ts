import assert from "node:assert/strict";
import test from "node:test";

import { createAtlasAIRequest } from "../../src/atlas/reasoning/atlasAIProvider.ts";
import type { AtlasAIRequest } from "../../src/atlas/reasoning/atlasAIProvider.ts";
import type { AtlasReasoningContext } from "../../src/atlas/reasoning/types.ts";
import { runAtlasProviderConformance } from "../../src/atlas/providerConformance/harness.ts";
import { validateAtlasAICitation } from "../../src/atlas/providerConformance/validation.ts";
import { resolveOllamaAtlasProviderConfig, DEFAULT_OLLAMA_BASE_URL, DEFAULT_OLLAMA_MODEL, DEFAULT_OLLAMA_NUM_PREDICT } from "../../src/atlas/providers/ollama/config.ts";
import { buildOllamaAtlasFactCore, resolveOllamaAtlasGroundedFact } from "../../src/atlas/providers/ollama/factCore.ts";
import {
  ATLAS_CONVERSATION_BEGIN,
  ATLAS_GROUNDING_BEGIN,
  ATLAS_GROUNDING_END,
  ATLAS_MEMORY_BEGIN,
  OLLAMA_ATLAS_MAX_PROMPT_CHARACTERS,
  OLLAMA_ATLAS_PROVIDER_CONVERSATION_TURNS,
  OLLAMA_ATLAS_SYSTEM_PROMPT,
  assertOllamaAtlasPromptBudget,
  createOllamaAtlasQuestionRelevance,
  createOllamaAtlasResponseSchema,
  serializeAtlasReasoningGrounding,
} from "../../src/atlas/providers/ollama/grounding.ts";
import { OLLAMA_ATLAS_CONTEXT_WINDOW, OllamaAtlasProvider } from "../../src/atlas/providers/ollama/ollamaAtlasProvider.ts";
import type { OllamaTransport, OllamaTransportRequest } from "../../src/atlas/providers/ollama/types.ts";
import { OllamaTransportError } from "../../src/atlas/providers/ollama/types.ts";

const CAPTURED_AT = "2026-09-01T12:00:00.000Z";
const CONTEXT: AtlasReasoningContext = {
  version: "1.0.0",
  snapshotCapturedAt: CAPTURED_AT,
  sourceVersions: { intelligenceReport: "1.0.0", dailyBrief: "1.0.0", recommendationReport: "1.0.0", patternReport: "1.0.0" },
  profile: { name: "Nihal", occupation: "Engineer", timezone: "Asia/Kolkata", atlasPersonality: "Professional" },
  factualState: {
    date: "2026-09-01",
    tasks: { total: 1, active: 1, completed: 0, completedToday: 0, overdue: 0, dueToday: 1, undated: 0, highPriorityActive: 1 },
    planning: { activeGoals: 1, completedGoals: 0, overdueGoals: 0, activeMonthlyTargets: 1, activeWeeklyTargets: 1, unlinkedMonthlyTargets: 0, unlinkedWeeklyTargets: 0, unlinkedTasks: 0 },
    habits: { total: 1, active: 1, scheduledToday: 0, completedToday: 0, activeStreaks: 0 },
    execution: { totalEvents: 4, eventsToday: 0, totalXP: 40, xpToday: 0 },
  },
  priorities: { evaluatedAt: CAPTURED_AT, rankedTasks: [] },
  risks: { evaluatedAt: CAPTURED_AT, overallRisk: "none", findings: [] },
  dailyBrief: {
    version: "1.0.0", sourceReportVersion: "1.0.0", snapshotCapturedAt: CAPTURED_AT,
    primaryFocus: { kind: "maintenance", title: "Maintain momentum", reasons: ["No ranked active task is available."] },
    topPriorities: [], keyRisks: [], positiveSignals: [],
    suggestedNextAction: { kind: "define-next-priority", title: "Define the next priority", reasons: ["No ranked active task is available."] },
  },
  recommendations: [],
  historyCoverage: [
    { source: "execution-history", recordCount: 0 },
    { source: "habit-completion-history", recordCount: 0 },
    { source: "task-records", recordCount: 0 },
  ],
  historicalPatterns: [],
  limitations: [{ id: "risk-history-unavailable", origin: "pattern-intelligence", evidenceSource: "current-intelligence-report", reason: "Historical risk reports are not retained." }],
};

function createRequest(prompt = "What should I do next?", conversation: AtlasAIRequest["conversation"] = [], memory: AtlasAIRequest["memory"] = []): AtlasAIRequest {
  return createAtlasAIRequest({ requestId: `request:${prompt}`, purpose: "grounded-answer", prompt, conversation, memory, context: CONTEXT });
}

class MockTransport implements OllamaTransport {
  requests: OllamaTransportRequest[] = [];
  private readonly response: unknown | (() => Promise<unknown>);
  constructor(response: unknown | (() => Promise<unknown>)) {
    this.response = response;
  }
  async send(request: OllamaTransportRequest): Promise<unknown> {
    this.requests.push(structuredClone(request));
    return typeof this.response === "function" ? this.response() : structuredClone(this.response);
  }
}

function chatResponse(output: unknown): unknown {
  return { model: "llama3.2:3b", done: true, message: { role: "assistant", content: typeof output === "string" ? output : JSON.stringify(output) } };
}

function validOutput(request: AtlasAIRequest, commentary = "This gives you a clear place to begin.") {
  const core = buildOllamaAtlasFactCore(request);
  return { x: commentary, r: core.facts[0] ? [core.facts[0].ref] : [], l: [] };
}

test("uses safe local configuration defaults without changing output bounds", () => {
  const config = resolveOllamaAtlasProviderConfig();
  assert.equal(config.baseUrl, DEFAULT_OLLAMA_BASE_URL);
  assert.equal(config.model, DEFAULT_OLLAMA_MODEL);
  assert.equal(config.numPredict, DEFAULT_OLLAMA_NUM_PREDICT);
  assert.equal(OLLAMA_ATLAS_CONTEXT_WINDOW, 8_192);
  assert.throws(() => resolveOllamaAtlasProviderConfig({ baseUrl: "https://example.com" }), /loopback-only/);
});

test("builds deterministic zero-valued habit and accomplishment fact cores", () => {
  const habits = buildOllamaAtlasFactCore(createRequest("How are my habits today?"));
  assert.equal(habits.status, "completed");
  assert.match(habits.factualAnswer, /0 habits scheduled today, 0 habits completed today, and 0 active streaks/);
  assert.deepEqual(habits.facts.map((fact) => fact.value), [0, 0, 0]);

  const execution = buildOllamaAtlasFactCore(createRequest("What did I accomplish today?"));
  assert.equal(execution.status, "completed");
  assert.match(execution.factualAnswer, /0 tasks.*0 habits.*0 execution events.*0 XP/);
});

test("treats none and supported empty collections as known current risk facts", () => {
  const core = buildOllamaAtlasFactCore(createRequest("What risks do I have right now?"));
  assert.equal(core.status, "completed");
  assert.equal(core.factualAnswer, "ATLAS detects no active risk right now.");
  assert.deepEqual(core.facts.map((fact) => fact.value), ["none", []]);
});

test("treats a resolvable false value as a known fact", () => {
  const request = createRequest();
  const extended = request as AtlasAIRequest & {
    context: AtlasReasoningContext & {
      profile: AtlasReasoningContext["profile"] & { available: boolean };
    };
  };
  extended.context.profile.available = false;
  const fact = resolveOllamaAtlasGroundedFact(
    extended,
    "f1",
    "Profile availability",
    "profile",
    "available"
  );
  assert.equal(fact?.value, false);
});

test("keeps genuinely unavailable weekly history distinct from known zero values", () => {
  const core = buildOllamaAtlasFactCore(createRequest("How am I doing this week?"));
  assert.equal(core.status, "insufficient-evidence");
  assert.match(core.factualAnswer, /Weekly performance history is unavailable/);
  assert.deepEqual(core.facts, []);
  assert.deepEqual(core.citations, []);
});

test("renders trusted task, goal, XP, and next-action cores deterministically", () => {
  const cases = [
    ["What are my tasks today?", /1 active task, 1 task due today, and 0 overdue tasks/],
    ["Am I behind on any goal?", /1 active goal, 0 completed goals, and 0 overdue goals/],
    ["How much XP did I earn?", /0 XP today and have 40 total XP/],
    ["What should I do next?", /Your next action is: Define the next priority/],
  ] as const;
  cases.forEach(([question, expected]) => assert.match(buildOllamaAtlasFactCore(createRequest(question)).factualAnswer, expected));
});

test("every deterministic fact and citation resolves through existing strict validation", () => {
  const questions = ["What are my tasks today?", "How are my habits today?", "Am I behind on any goal?", "What risks do I have right now?", "What did I accomplish today?", "What should I do next?"];
  questions.forEach((question) => {
    const request = createRequest(question);
    const core = buildOllamaAtlasFactCore(request);
    core.citations.forEach((citation, index) => assert.equal(validateAtlasAICitation(citation, request.context, index).valid, true));
    assert.equal(core.facts.length, core.citations.length);
  });
});

test("serializes only compact relevant facts and omits full and duplicated context", () => {
  const grounding = serializeAtlasReasoningGrounding(createRequest("How are my habits today?"));
  assert.match(grounding, new RegExp(ATLAS_GROUNDING_BEGIN));
  assert.match(grounding, new RegExp(ATLAS_GROUNDING_END));
  assert.match(grounding, /"habits\.scheduledToday"/);
  assert.doesNotMatch(grounding, /reasoningContext|allowedCitationPaths|relevantTrustedEvidence|Build the local provider|Historical risk reports/);
  assert.equal((grounding.match(/"facts"/g) ?? []).length, 1);
});

test("keeps current question separate and bounds provider-specific conversation", () => {
  const conversation = Array.from({ length: 6 }, (_, index) => ({ role: index % 2 ? "assistant" as const : "user" as const, content: `turn-${index}` }));
  const grounding = serializeAtlasReasoningGrounding(createRequest("Why that one?", conversation));
  assert.match(grounding, new RegExp(ATLAS_CONVERSATION_BEGIN));
  assert.match(grounding, /"currentQuestion":"Why that one\?"/);
  assert.doesNotMatch(grounding, /turn-0|turn-3/);
  assert.match(grounding, /turn-4/);
  assert.match(grounding, /turn-5/);
  assert.equal(OLLAMA_ATLAS_PROVIDER_CONVERSATION_TURNS, 2);
});

test("memory stays bounded, untrusted, and absent from fact references", () => {
  const memory = Array.from({ length: 4 }, (_, index) => ({ id: `m${index}`, type: "preference" as const, topic: `topic-${index}`, content: `content-${index}`, source: "explicit_user_statement" as const, createdAt: CAPTURED_AT, updatedAt: CAPTURED_AT, status: "active" as const }));
  const request = createRequest("How are my habits today?", [], memory);
  const grounding = serializeAtlasReasoningGrounding(request);
  const core = buildOllamaAtlasFactCore(request);
  assert.match(grounding, new RegExp(ATLAS_MEMORY_BEGIN));
  assert.match(grounding, /"citable":false/);
  assert.doesNotMatch(grounding, /topic-0/);
  assert.match(grounding, /topic-1|topic-3/);
  assert.equal(core.facts.every((fact) => !fact.source.includes("memory")), true);
});

test("classification metadata remains relevance-only and cannot become a citation source", () => {
  const relevance = createOllamaAtlasQuestionRelevance(createRequest("How are my habits today?"));
  assert.equal(relevance.domain, "habits");
  assert.equal(relevance.authority, "relevance-only-not-evidence");
  assert.equal(relevance.preferredCitationTargets.every((target) => target.source === "factualState"), true);
});

test("enforces a deterministic prompt-size guard below the model context limit", () => {
  const questions = [
    "What are my tasks today?",
    "How are my habits today?",
    "Am I behind on any goal?",
    "What risks do I have right now?",
    "What did I accomplish today?",
    "How much XP did I earn?",
    "Give me my daily status.",
    "How am I doing this week?",
    "What should I do next?",
  ];
  questions.forEach((question) => {
    const grounding = serializeAtlasReasoningGrounding(createRequest(question));
    assert.ok(OLLAMA_ATLAS_SYSTEM_PROMPT.length + grounding.length < OLLAMA_ATLAS_MAX_PROMPT_CHARACTERS);
    assert.doesNotThrow(() => assertOllamaAtlasPromptBudget(OLLAMA_ATLAS_SYSTEM_PROMPT, grounding));
  });
  assert.throws(() => assertOllamaAtlasPromptBudget("x".repeat(OLLAMA_ATLAS_MAX_PROMPT_CHARACTERS), "x"), /exceeds the safe/);
});

test("provider returns deterministic factual content and citations through the unchanged contract", async () => {
  const request = createRequest("How are my habits today?");
  const transport = new MockTransport(chatResponse(validOutput(request)));
  const result = await runAtlasProviderConformance(new OllamaAtlasProvider({ transport }), request);
  assert.equal(result.status, "success");
  assert.equal(result.response?.version, "1.0.0");
  assert.equal(result.response?.requestId, request.requestId);
  assert.match(result.response?.content ?? "", /^You have 0 habits scheduled today/);
  assert.match(result.response?.content ?? "", /clear place to begin/);
  assert.deepEqual(result.response?.citations.map(({ source, path }) => ({ source, path })), [
    { source: "factualState", path: "habits.scheduledToday" },
    { source: "factualState", path: "habits.completedToday" },
    { source: "factualState", path: "habits.activeStreaks" },
  ]);
  assert.equal("facts" in (result.response ?? {}), false);
  assert.ok(transport.requests[0]);
});

test("compact response schema permits only current request fact references", () => {
  const request = createRequest("What risks do I have right now?");
  const core = buildOllamaAtlasFactCore(request);
  const schema = createOllamaAtlasResponseSchema(request, core) as { properties: { r: { items: { enum: string[] } } } };
  assert.deepEqual(schema.properties.r.items.enum, core.facts.map((fact) => fact.ref));
  assert.deepEqual(Object.keys(schema).sort(), ["additionalProperties", "properties", "required", "type"]);
});

for (const [name, commentary] of [
  ["punctuation-only", ":["],
  ["bare fact token", "f1"],
  ["bare citation token", "c2"],
  ["copied guidance", "Answer trusted recommendations first."],
] as const) {
  test(`rejects ${name} commentary without repair`, async () => {
    const request = createRequest();
    const output = validOutput(request, commentary);
    const result = await runAtlasProviderConformance(new OllamaAtlasProvider({ transport: new MockTransport(chatResponse(output)) }), request);
    assert.equal(result.status, "provider-error");
    assert.equal(result.response, undefined);
    assert.match(result.errors[0]?.message ?? "", /meaningless or copied/);
  });
}

test("rejects unknown fact references before provider conformance", async () => {
  const request = createRequest();
  const result = await runAtlasProviderConformance(new OllamaAtlasProvider({ transport: new MockTransport(chatResponse({ x: "A short interpretation.", r: ["f999"], l: [] })) }), request);
  assert.equal(result.status, "provider-error");
  assert.match(result.errors[0]?.message ?? "", /unsupported fact reference/);
});

test("rejects malformed JSON, missing fields, widened output, and tool calls", async (suite) => {
  const request = createRequest();
  const cases: Array<[string, unknown]> = [
    ["malformed JSON", chatResponse("not-json")],
    ["missing fields", chatResponse({ x: "Commentary", r: [] })],
    ["widened output", chatResponse({ ...validOutput(request), action: "complete-task" })],
    ["tool calls", { message: { role: "assistant", content: JSON.stringify(validOutput(request)), tool_calls: [{ function: { name: "write_task" } }] } }],
  ];
  for (const [name, response] of cases) {
    await suite.test(name, async () => {
      const result = await runAtlasProviderConformance(new OllamaAtlasProvider({ transport: new MockTransport(response) }), request);
      assert.equal(result.status, "provider-error");
      assert.equal(result.response, undefined);
    });
  }
});

test("handles empty, network, and timeout results structurally", async (suite) => {
  const request = createRequest();
  await suite.test("empty", async () => {
    const result = await runAtlasProviderConformance(new OllamaAtlasProvider({ transport: new MockTransport(chatResponse("")) }), request);
    assert.equal(result.status, "empty-response");
  });
  for (const kind of ["network", "timeout"] as const) {
    await suite.test(kind, async () => {
      const transport = new MockTransport(async () => { throw new OllamaTransportError(kind, kind === "timeout" ? "Local Ollama timed out after 30000 ms." : "Local Ollama is unavailable."); });
      const result = await runAtlasProviderConformance(new OllamaAtlasProvider({ transport }), request);
      assert.equal(result.status, "provider-error");
    });
  }
});

test("provider request exposes no tools, mutation handles, or full-context prompt", async () => {
  const request = createRequest();
  const transport = new MockTransport(chatResponse(validOutput(request, "")));
  await new OllamaAtlasProvider({ transport }).reason(request);
  const body = transport.requests[0]?.body;
  assert.ok(body);
  assert.equal("tools" in body, false);
  assert.equal(JSON.stringify(body).includes("allowLifeOSMutation"), false);
  assert.equal(JSON.stringify(body).includes("reasoningContext"), false);
  assert.equal(body.options.num_ctx, OLLAMA_ATLAS_CONTEXT_WINDOW);
  assert.equal(body.options.num_predict, DEFAULT_OLLAMA_NUM_PREDICT);
});
