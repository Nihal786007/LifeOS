import assert from "node:assert/strict";
import test from "node:test";
import { AtlasActionExecutor, getAtlasActionReferenceProblem } from "../../src/atlas/actions/actionExecutor.ts";
import { AtlasPermissionEngine } from "../../src/atlas/actions/permissionEngine.ts";
import { createAtlasActionProposal, parseAtlasActionProposalDraft } from "../../src/atlas/actions/proposal.ts";
import type { AtlasActionApproval, AtlasActionEntitySnapshot, AtlasLifeOSActionAdapter, AtlasTaskCreatePayload } from "../../src/atlas/actions/types.ts";
import { createAtlasActionAuditWriter, createLifeOSActionAdapter } from "../../src/atlas/actions/lifeOSActionAdapter.ts";
import {
  continueAtlasActionClarification,
  interpretAtlasActionRequest,
  parseAtlasProviderActionDraft,
} from "../../src/atlas/actions/actionIntent.ts";
import type { AtlasActionIntentSnapshot } from "../../src/atlas/actions/actionIntent.ts";

const ID = "atlas-action:123e4567-e89b-42d3-a456-426614174000";
const NOW = "2026-09-20T10:00:00.000Z";
const EMPTY: AtlasActionEntitySnapshot = { taskIds: [], completedTaskIds: [], habitIds: [], monthlyOutcomeIds: [], weeklyFocusIds: [] };
const INTENT_STATE: AtlasActionIntentSnapshot = {
  tasks: [
    { id: 11, title: "Chemistry assignment", completed: false },
    { id: 12, title: "Apex sensor test", completed: false },
  ],
  habits: [{ id: 21, name: "Morning reading", archived: false }],
  monthlyOutcomes: [{ id: 31, title: "Finish Apex prototype" }],
  weeklyFocuses: [{ id: 41, title: "Test Apex sensors" }],
};
const INTENT_NOW = new Date(2026, 8, 20, 10, 0, 0);

function taskProposal() {
  return createAtlasActionProposal({
    type: "task.create",
    title: "Create a focused task",
    payload: { title: "Finish ultrasonic sensor test", dueDate: "2026-09-21", priority: "high" },
    rationale: "Supports the current verified focus.",
    evidenceReferences: ["priorities.rankedTasks[0]"],
  }, { id: ID, createdAt: NOW, allowedEvidenceReferences: new Set(["priorities.rankedTasks[0]"]) });
}

const APPROVED: AtlasActionApproval = {
  version: "1.0.0", actionId: ID, decision: "approved", source: "user", decidedAt: NOW,
};

test("parses a strict proposal and computes permission metadata outside model control", () => {
  const proposal = taskProposal();
  assert.equal(proposal.source, "atlas");
  assert.equal(proposal.risk, "CONFIRM_REQUIRED");
  assert.equal(proposal.requiresApproval, true);
  assert.throws(() => parseAtlasActionProposalDraft({
    type: "task.create", title: "Unsafe", risk: "READ_ONLY", requiresApproval: false,
    payload: { title: "Unsafe" },
  }), /unsupported fields/);
});

test("rejects unknown actions, malformed payloads, dates, extra fields, and evidence", () => {
  assert.throws(() => parseAtlasActionProposalDraft({ type: "shell.execute", title: "Run", payload: {} }), /not supported/);
  assert.throws(() => parseAtlasActionProposalDraft({ type: "task.create", title: "Task", payload: { title: "Task", extra: true } }), /unsupported fields/);
  assert.throws(() => parseAtlasActionProposalDraft({ type: "task.create", title: "Task", payload: { title: "Task", dueDate: "2026-02-30" } }), /valid local date/);
  assert.throws(() => createAtlasActionProposal({ type: "capture.create", title: "Capture", payload: { text: "Note" }, evidenceReferences: ["risks.unknown"] }, { id: ID, createdAt: NOW, allowedEvidenceReferences: new Set() }), /unsupported evidence/);
});

test("permission decisions are deterministic and forbid deletes, external actions, and security changes", () => {
  const engine = new AtlasPermissionEngine();
  assert.equal(engine.evaluate("reasoning.read").decision, "allowed");
  assert.equal(engine.evaluate("task.create").decision, "approval-required");
  for (const action of ["task.delete", "email.send", "finance.transfer", "account.password.change"]) {
    assert.deepEqual(engine.evaluate(action).decision, "forbidden");
  }
});

test("executor refuses missing, forged, rejected, mismatched, and forbidden approval", async () => {
  let calls = 0;
  const adapter: AtlasLifeOSActionAdapter = { execute: async () => { calls += 1; return { executed: true }; } };
  const executor = new AtlasActionExecutor(adapter);
  const proposal = taskProposal();
  assert.equal((await executor.executeApprovedAction({ proposal, snapshot: EMPTY })).status, "rejected");
  assert.equal((await executor.executeApprovedAction({ proposal, snapshot: EMPTY, approval: { ...APPROVED, source: "model" as never } })).status, "rejected");
  assert.equal((await executor.executeApprovedAction({ proposal, snapshot: EMPTY, approval: { ...APPROVED, decision: "rejected" } })).status, "rejected");
  assert.equal((await executor.executeApprovedAction({ proposal, snapshot: EMPTY, approval: { ...APPROVED, actionId: "atlas-action:00000000-0000-4000-8000-000000000000" } })).status, "rejected");
  assert.equal(calls, 0);
});

test("approved execution calls only the trusted adapter and records zero-XP audit identity", async () => {
  const calls: string[] = [];
  const executor = new AtlasActionExecutor(
    { execute: async (proposal) => { calls.push(proposal.type); return { executed: true, entityId: 42 }; } },
    { record: async (entry) => { assert.equal(entry.source, "atlas"); assert.equal(entry.approvalRequired, true); return [99]; } }
  );
  const result = await executor.executeApprovedAction({ proposal: taskProposal(), approval: APPROVED, snapshot: EMPTY });
  assert.deepEqual(calls, ["task.create"]);
  assert.deepEqual(result, { status: "executed", actionId: ID, entityId: 42, executionRecordIds: [99] });
});

test("stale entity relationships are rejected before mutation", async () => {
  let called = false;
  const executor = new AtlasActionExecutor({ execute: async () => { called = true; return { executed: true }; } });
  const proposal = createAtlasActionProposal({ type: "task.complete", title: "Complete task", payload: { taskId: 77 } }, { id: ID, createdAt: NOW });
  const result = await executor.executeApprovedAction({ proposal, approval: APPROVED, snapshot: EMPTY });
  assert.equal(result.status, "rejected");
  assert.equal(called, false);
});

test("already-completed task proposals are rejected before mutation", async () => {
  let called = false;
  const executor = new AtlasActionExecutor({ execute: async () => { called = true; return { executed: true }; } });
  const proposal = createAtlasActionProposal({ type: "task.complete", title: "Complete task", payload: { taskId: 77 } }, { id: ID, createdAt: NOW });
  const result = await executor.executeApprovedAction({
    proposal,
    approval: APPROVED,
    snapshot: { ...EMPTY, taskIds: [77], completedTaskIds: [77] },
  });
  assert.deepEqual(result, { status: "rejected", actionId: ID, reason: "The referenced task is already complete." });
  assert.equal(called, false);
});

test("trusted LifeOS adapter routes task creation without repository access", async () => {
  const calls: unknown[] = [];
  const adapter = createLifeOSActionAdapter({
    createTask: (payload) => { calls.push(["createTask", payload]); },
    updateTask: () => ({ updated: true, message: "updated" }),
    completeTask: () => undefined,
    createHabit: () => undefined,
    updateHabit: () => undefined,
    createCapture: async () => undefined,
    createGoalWeeklyFocus: () => ({ created: true, message: "created" }),
    createPersonalWeeklyFocus: () => ({ created: true, message: "created" }),
  });
  const result = await adapter.execute(taskProposal());
  assert.equal(result.executed, true);
  assert.deepEqual(calls, [["createTask", {
    title: "Finish ultrasonic sensor test", dueDate: "2026-09-21", priority: "high",
  }]]);
});

test("audit writer uses the existing ledger shape without awarding XP", async () => {
  const records: unknown[] = [];
  const writer = createAtlasActionAuditWriter({
    append: (items) => { records.push(...items); },
    createId: () => 101,
    now: () => NOW,
  });
  assert.deepEqual(await writer.record({
    actionId: ID, actionType: "task.create", approvedAt: NOW,
    approvalRequired: true, source: "atlas",
  }), [101]);
  assert.deepEqual(records, [{
    id: 101,
    type: "system",
    entityId: 101,
    title: "ATLAS action executed",
    description: "task.create",
    createdAt: NOW,
    xpAwarded: 0,
    metadata: {
      source: "atlas", atlasActionId: ID, actionType: "task.create",
      approvalRequired: true, approvedAt: NOW,
    },
  }]);
});

test("provider-like output cannot claim execution or bypass proposal validation", () => {
  assert.throws(() => parseAtlasActionProposalDraft({
    type: "task.create",
    title: "Pretend execution",
    payload: { title: "Task" },
    status: "executed",
  }), /unsupported fields/);
});

test("controlled task flow mutates exactly once only after explicit approval", async () => {
  const tasks: AtlasTaskCreatePayload[] = [];
  const audits: unknown[] = [];
  const adapter = createLifeOSActionAdapter({
    createTask: (payload) => { tasks.push(payload); },
    updateTask: () => ({ updated: true, message: "updated" }),
    completeTask: () => undefined,
    createHabit: () => undefined,
    updateHabit: () => undefined,
    createCapture: async () => undefined,
    createGoalWeeklyFocus: () => ({ created: true, message: "created" }),
    createPersonalWeeklyFocus: () => ({ created: true, message: "created" }),
  });
  const executor = new AtlasActionExecutor(adapter, createAtlasActionAuditWriter({
    append: (records) => { audits.push(...records); },
    createId: () => 202,
    now: () => NOW,
  }));
  const proposal = taskProposal();

  assert.equal(tasks.length, 0);
  assert.equal((await executor.executeApprovedAction({ proposal, snapshot: EMPTY })).status, "rejected");
  assert.equal(tasks.length, 0);
  assert.equal(audits.length, 0);

  assert.equal((await executor.executeApprovedAction({ proposal, approval: APPROVED, snapshot: EMPTY })).status, "executed");
  assert.equal(tasks.length, 1);
  assert.equal(audits.length, 1);
  assert.equal((audits[0] as { xpAwarded: number }).xpAwarded, 0);
});

test("natural language creates strict task, habit, capture, and completion drafts", () => {
  const task = interpretAtlasActionRequest("Create a high-priority task tomorrow to study SAT", { snapshot: INTENT_STATE, now: INTENT_NOW });
  assert.equal(task.status, "proposal");
  if (task.status === "proposal") assert.deepEqual(task.draft.payload, { title: "study SAT", priority: "high", dueDate: "2026-09-21" });

  const complete = interpretAtlasActionRequest("Mark my chemistry assignment complete", { snapshot: INTENT_STATE, now: INTENT_NOW });
  assert.equal(complete.status, "proposal");
  if (complete.status === "proposal") assert.deepEqual(complete.draft.payload, { taskId: 11 });

  const habit = interpretAtlasActionRequest("Start a habit for reading every day", { snapshot: INTENT_STATE, now: INTENT_NOW });
  assert.equal(habit.status, "proposal");
  if (habit.status === "proposal") assert.equal((habit.draft.payload as { activeDays: string[] }).activeDays.length, 7);

  const capture = interpretAtlasActionRequest("Remember to buy batteries", { snapshot: INTENT_STATE, now: INTENT_NOW });
  assert.equal(capture.status, "proposal");
  if (capture.status === "proposal") assert.deepEqual(capture.draft.payload, { text: "buy batteries" });
});

test("forbidden and unsupported language never creates an executable proposal", () => {
  for (const input of ["Delete all my tasks", "Message my friend", "Transfer ₹500"]) {
    assert.equal(interpretAtlasActionRequest(input, { snapshot: INTENT_STATE, now: INTENT_NOW }).status, "forbidden");
  }
  assert.deepEqual(interpretAtlasActionRequest("How are my habits today?", { snapshot: INTENT_STATE, now: INTENT_NOW }), { status: "conversation" });
});

test("ambiguous, missing, invalid, and changed references ask for clarification", () => {
  const ambiguousState = { ...INTENT_STATE, tasks: [...INTENT_STATE.tasks, { id: 13, title: "Chemistry assignment draft", completed: false }] };
  const ambiguous = interpretAtlasActionRequest("Mark chemistry complete", { snapshot: ambiguousState, now: INTENT_NOW });
  assert.equal(ambiguous.status, "clarification");
  const missing = interpretAtlasActionRequest("Mark unknown assignment complete", { snapshot: INTENT_STATE, now: INTENT_NOW });
  assert.equal(missing.status, "clarification");
  const invalidDate = interpretAtlasActionRequest("Create a task to study SAT 2026-02-30", { snapshot: INTENT_STATE, now: INTENT_NOW });
  assert.equal(invalidDate.status, "clarification");
});

test("unknown references are rejected before proposal presentation", () => {
  const proposal = createAtlasActionProposal({
    type: "task.complete", title: "Complete missing task", payload: { taskId: 999 },
  }, { id: ID, createdAt: NOW });
  assert.equal(getAtlasActionReferenceProblem(proposal, EMPTY), "The referenced task no longer exists.");
});

test("one bounded clarification can resolve an exact task without becoming evidence", () => {
  const first = interpretAtlasActionRequest("Mark chemistry complete", {
    snapshot: { ...INTENT_STATE, tasks: [...INTENT_STATE.tasks, { id: 13, title: "Chemistry notes", completed: false }] },
    now: INTENT_NOW,
  });
  assert.equal(first.status, "clarification");
  if (first.status !== "clarification") return;
  const resolved = continueAtlasActionClarification(first.clarification, "Chemistry assignment", { snapshot: INTENT_STATE, now: INTENT_NOW });
  assert.equal(resolved.status, "proposal");
  if (resolved.status === "proposal") assert.deepEqual(resolved.draft.payload, { taskId: 11 });
});

test("provider drafts remain strict, non-executable, and reject malformed or widened output", () => {
  assert.deepEqual(parseAtlasProviderActionDraft(JSON.stringify({
    type: "capture.create", title: "Create capture", payload: { text: "buy batteries" },
  })).payload, { text: "buy batteries" });
  assert.throws(() => parseAtlasProviderActionDraft("not-json"), /valid JSON/);
  assert.throws(() => parseAtlasProviderActionDraft(JSON.stringify({
    type: "task.create", title: "Create", payload: { title: "Task" }, executed: true,
  })), /unsupported fields/);
  assert.throws(() => parseAtlasProviderActionDraft(JSON.stringify({
    type: "task.create", title: "Create", payload: { title: "run powershell script" },
  })), /unsupported executable/);
});

test("the same approved proposal cannot execute twice", async () => {
  let mutations = 0;
  const executor = new AtlasActionExecutor({ execute: async () => { mutations += 1; return { executed: true }; } });
  assert.equal((await executor.executeApprovedAction({ proposal: taskProposal(), approval: APPROVED, snapshot: EMPTY })).status, "executed");
  const duplicate = await executor.executeApprovedAction({ proposal: taskProposal(), approval: APPROVED, snapshot: EMPTY });
  assert.deepEqual(duplicate, { status: "rejected", actionId: ID, reason: "This ATLAS action has already been submitted." });
  assert.equal(mutations, 1);
});

test("controlled natural-language runtime requires approval and produces one mutation plus one audit", async () => {
  const intent = interpretAtlasActionRequest("Create a task to study SAT tomorrow", { snapshot: INTENT_STATE, now: INTENT_NOW });
  assert.equal(intent.status, "proposal");
  if (intent.status !== "proposal") return;
  const proposal = createAtlasActionProposal(intent.draft, { id: ID, createdAt: NOW });
  const tasks: unknown[] = [];
  const audits: unknown[] = [];
  const adapter = createLifeOSActionAdapter({
    createTask: (payload) => { tasks.push(payload); },
    updateTask: () => ({ updated: true, message: "updated" }),
    completeTask: () => undefined,
    createHabit: () => undefined,
    updateHabit: () => undefined,
    createCapture: async () => undefined,
    createGoalWeeklyFocus: () => ({ created: true, message: "created" }),
    createPersonalWeeklyFocus: () => ({ created: true, message: "created" }),
  });
  const executor = new AtlasActionExecutor(adapter, createAtlasActionAuditWriter({
    append: (records) => { audits.push(...records); }, createId: () => 303, now: () => NOW,
  }));

  assert.equal(tasks.length, 0, "proposal presentation is non-mutating");
  assert.equal(audits.length, 0, "proposal presentation has no audit side effect");
  assert.equal((await executor.executeApprovedAction({ proposal, snapshot: EMPTY })).status, "rejected");
  assert.equal(tasks.length, 0, "missing approval remains non-mutating");

  const result = await executor.executeApprovedAction({ proposal, approval: APPROVED, snapshot: EMPTY });
  assert.equal(result.status, "executed");
  assert.equal(tasks.length, 1);
  assert.equal(audits.length, 1);
  assert.equal((audits[0] as { xpAwarded: number }).xpAwarded, 0);
});
