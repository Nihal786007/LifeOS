import assert from "node:assert/strict";
import test from "node:test";

import type { AtlasActionIntentSnapshot } from "../../src/atlas/actions/actionIntent.ts";
import {
  ATLAS_ACTION_CANDIDATE_VERSION,
  createAtlasActionCandidateRequest,
  resolveAtlasActionRequestWithProvider,
} from "../../src/atlas/actions/candidate.ts";
import { interpretAtlasActionRequest } from "../../src/atlas/actions/actionIntent.ts";
import {
  OLLAMA_ACTION_CANDIDATE_CONTEXT_WINDOW,
  OLLAMA_ACTION_CANDIDATE_MAX_PROMPT_CHARACTERS,
  OLLAMA_ACTION_CANDIDATE_SYSTEM_PROMPT,
  OllamaAtlasActionCandidateProvider,
  createOllamaActionCandidateResponseSchema,
  serializeOllamaActionCandidateRequest,
} from "../../src/atlas/providers/ollama/ollamaAtlasActionCandidateProvider.ts";
import type {
  OllamaTransport,
  OllamaTransportRequest,
} from "../../src/atlas/providers/ollama/types.ts";
import { OllamaTransportError } from "../../src/atlas/providers/ollama/types.ts";

const NOW = new Date("2026-09-20T10:00:00.000Z");
const SNAPSHOT: AtlasActionIntentSnapshot = {
  tasks: [
    { id: 11, title: "Submit chemistry report", completed: false },
    { id: 12, title: "Review SAT vocabulary", completed: false },
  ],
  habits: [{ id: 21, name: "Read nightly" }],
  monthlyOutcomes: [{ id: 31, title: "Finish SAT preparation" }],
  weeklyFocuses: [{ id: 41, title: "Practice algebra", monthlyTargetId: 31 }],
};

class MockTransport implements OllamaTransport {
  readonly requests: OllamaTransportRequest[] = [];
  private readonly result: unknown | (() => Promise<unknown>);

  constructor(result: unknown | (() => Promise<unknown>)) {
    this.result = result;
  }

  async send(request: OllamaTransportRequest): Promise<unknown> {
    this.requests.push(structuredClone(request));
    return typeof this.result === "function"
      ? this.result()
      : structuredClone(this.result);
  }
}

function chatResponse(output: unknown): unknown {
  return {
    model: "llama3.2:3b",
    done: true,
    message: {
      role: "assistant",
      content: typeof output === "string" ? output : JSON.stringify(output),
    },
  };
}

function candidate(actionType: string, payload: unknown, extra: Record<string, unknown> = {}) {
  return {
    version: ATLAS_ACTION_CANDIDATE_VERSION,
    actionType,
    payload,
    rationale: "Prepared from the bounded request.",
    ...extra,
  };
}

function createRequest(input: string) {
  const deterministic = interpretAtlasActionRequest(input, { snapshot: SNAPSHOT, now: NOW });
  return createAtlasActionCandidateRequest(input, deterministic, SNAPSHOT, NOW);
}

test("serializes a bounded, relevance-only request with no mutation authority", () => {
  const request = createRequest("Create a high priority task tomorrow to study SAT");
  const grounding = serializeOllamaActionCandidateRequest(request);
  const parsed = JSON.parse(grounding);

  assert.equal(request.currentDate, "2026-09-20");
  assert.deepEqual(request.allowedActionTypes, ["task.create"]);
  assert.deepEqual(request.relevantEntities, {
    tasks: [], habits: [], monthlyOutcomes: [], weeklyFocuses: [],
  });
  assert.equal(parsed.contract.constraints.requiresExplicitApproval, true);
  assert.equal(parsed.contract.constraints.providerHasMutationAuthority, false);
  assert.equal(parsed.contract.constraints.providerMayAssignRiskOrPermission, false);
  assert.equal("execute" in parsed, false);
  assert.equal("approve" in parsed, false);
  assert.equal("database" in parsed, false);
  assert.ok(OLLAMA_ACTION_CANDIDATE_SYSTEM_PROMPT.length + grounding.length < OLLAMA_ACTION_CANDIDATE_MAX_PROMPT_CHARACTERS);
});

test("sends strict local Ollama JSON generation with no tools", async () => {
  const request = createRequest("Create a high priority task tomorrow to study SAT");
  const transport = new MockTransport(chatResponse(candidate("task.create", {
    title: "study SAT", priority: "high", dueDate: "2026-09-21",
  })));
  const provider = new OllamaAtlasActionCandidateProvider({ transport });
  const result = await provider.generate(request);
  const sent = transport.requests[0];

  assert.equal(result.status, "candidate");
  assert.equal(sent.url, "http://127.0.0.1:11434/api/chat");
  assert.equal(sent.body.stream, false);
  assert.equal(sent.body.think, false);
  assert.equal(sent.body.options.temperature, 0);
  assert.equal(sent.body.options.num_ctx, OLLAMA_ACTION_CANDIDATE_CONTEXT_WINDOW);
  assert.equal("tools" in sent.body, false);
  assert.deepEqual(sent.body.format, createOllamaActionCandidateResponseSchema(request));
  assert.deepEqual((sent.body.format as { properties: { actionType: { enum: string[] } } }).properties.actionType.enum, ["task.create", "none"]);
});

test("a valid local candidate still becomes only a deterministic proposal", async () => {
  const transport = new MockTransport(chatResponse(candidate("task.create", {
    title: "study SAT", priority: "high", dueDate: "2026-09-21",
  })));
  const resolution = await resolveAtlasActionRequestWithProvider(
    "Create a high priority task tomorrow to study SAT",
    { snapshot: SNAPSHOT, now: NOW, provider: new OllamaAtlasActionCandidateProvider({ transport }) }
  );

  assert.equal(resolution.source, "provider-candidate");
  assert.equal(resolution.outcome.status, "proposal");
  if (resolution.outcome.status === "proposal") {
    assert.equal("approved" in resolution.outcome.draft, false);
    assert.equal("executed" in resolution.outcome.draft, false);
    assert.equal("risk" in resolution.outcome.draft, false);
    assert.deepEqual(resolution.outcome.draft.payload, {
      title: "study SAT", priority: "high", dueDate: "2026-09-21",
    });
  }
});

test("case-only provider wording agrees while deterministic payload remains canonical", async () => {
  const transport = new MockTransport(chatResponse(candidate("task.create", {
    title: "Study SAT", priority: "high", dueDate: "2026-09-21",
  })));
  const resolution = await resolveAtlasActionRequestWithProvider(
    "Create a high priority task tomorrow to study SAT",
    { snapshot: SNAPSHOT, now: NOW, provider: new OllamaAtlasActionCandidateProvider({ transport }) }
  );
  assert.equal(resolution.source, "provider-candidate");
  assert.equal(resolution.outcome.status, "proposal");
  if (resolution.outcome.status === "proposal") {
    assert.equal(resolution.outcome.draft.payload.title, "study SAT");
  }
});

test("natural paraphrases retain deterministic agreement", async (suite) => {
  const cases = [
    ["Tomorrow remind me to call the dentist", "task.create", { title: "call the dentist", dueDate: "2026-09-21" }],
    ["I need to revise chemistry tomorrow evening", "task.create", { title: "revise chemistry", dueDate: "2026-09-21" }],
    ["I finished Submit chemistry report", "task.complete", { taskId: 11 }],
    ["Start helping me meditate every day", "habit.create", {
      name: "meditate",
      activeDays: ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"],
    }],
  ] as const;

  for (const [input, actionType, payload] of cases) {
    await suite.test(input, async () => {
      const provider = new OllamaAtlasActionCandidateProvider({
        transport: new MockTransport(chatResponse(candidate(actionType, payload))),
      });
      const result = await resolveAtlasActionRequestWithProvider(input, { snapshot: SNAPSHOT, now: NOW, provider });
      assert.equal(result.source, "provider-candidate");
      assert.equal(result.outcome.status, "proposal");
    });
  }
});

test("malformed, empty, network, and timeout responses use deterministic fallback", async (suite) => {
  const cases: Array<[string, unknown | (() => Promise<unknown>) ]> = [
    ["malformed", chatResponse("not-json")],
    ["empty", chatResponse("")],
    ["network", async () => { throw new OllamaTransportError("network", "offline"); }],
    ["timeout", async () => { throw new OllamaTransportError("timeout", "timed out"); }],
  ];
  for (const [name, response] of cases) {
    await suite.test(name, async () => {
      const provider = new OllamaAtlasActionCandidateProvider({ transport: new MockTransport(response) });
      const result = await resolveAtlasActionRequestWithProvider(
        "Create a high priority task tomorrow to study SAT",
        { snapshot: SNAPSHOT, now: NOW, provider }
      );
      assert.equal(result.source, "deterministic-fallback");
      assert.equal(result.outcome.status, "proposal");
    });
  }
});

test("forged fields, tool calls, unknown references, and disagreement are rejected", async (suite) => {
  const cases: Array<[string, unknown, string]> = [
    ["forged approval", chatResponse(candidate("task.create", { title: "study SAT", priority: "high", dueDate: "2026-09-21" }, { approved: true })), "forbidden"],
    ["forged risk", chatResponse(candidate("task.create", { title: "study SAT", priority: "high", dueDate: "2026-09-21" }, { risk: "safe" })), "forbidden"],
    ["tool call", { message: { content: "{}", tool_calls: [{ function: { name: "create_task" } }] } }, "forbidden"],
    ["unknown reference", chatResponse(candidate("task.complete", { taskId: 999 })), "clarification"],
    ["disagreement", chatResponse(candidate("task.create", { title: "different task", priority: "high", dueDate: "2026-09-21" })), "clarification"],
  ];

  for (const [name, response, expectedStatus] of cases) {
    await suite.test(name, async () => {
      const input = name === "unknown reference" ? "Complete Submit chemistry report" : "Create a high priority task tomorrow to study SAT";
      const provider = new OllamaAtlasActionCandidateProvider({ transport: new MockTransport(response) });
      const result = await resolveAtlasActionRequestWithProvider(input, { snapshot: SNAPSHOT, now: NOW, provider });
      assert.equal(result.source, "provider-rejected");
      assert.equal(result.outcome.status, expectedStatus);
    });
  }
});

test("invalid provider output cannot replace deterministic ambiguity with a guess", async () => {
  const provider = new OllamaAtlasActionCandidateProvider({
    transport: new MockTransport(chatResponse(candidate("task.complete", { taskId: 999 }, { approved: true }))),
  });
  const result = await resolveAtlasActionRequestWithProvider(
    "I finished my work",
    { snapshot: SNAPSHOT, now: NOW, provider }
  );
  assert.equal(result.source, "provider-rejected");
  assert.equal(result.outcome.status, "clarification");
});

test("unsupported requests and explicit no-candidate output never become proposals", async () => {
  const output = {
    version: ATLAS_ACTION_CANDIDATE_VERSION,
    actionType: "none",
    payload: {},
  };
  const provider = new OllamaAtlasActionCandidateProvider({ transport: new MockTransport(chatResponse(output)) });
  const result = await resolveAtlasActionRequestWithProvider(
    "Tell me a joke",
    { snapshot: SNAPSHOT, now: NOW, provider }
  );
  assert.equal(result.source, "deterministic");
  assert.equal(result.outcome.status, "conversation");
});

test("prompt-size validation fails closed before transport", async () => {
  const transport = new MockTransport(chatResponse({}));
  const provider = new OllamaAtlasActionCandidateProvider({ transport });
  const request = createRequest("x");
  await assert.rejects(
    () => provider.generate({ ...request, userRequest: "x".repeat(501) }),
    /1 to 500 characters/
  );
  assert.equal(transport.requests.length, 0);
});
