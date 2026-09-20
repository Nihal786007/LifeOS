import assert from "node:assert/strict";
import test from "node:test";
import { AtlasActionExecutor } from "../../src/atlas/actions/actionExecutor.ts";
import { AtlasPermissionEngine } from "../../src/atlas/actions/permissionEngine.ts";
import { createAtlasActionProposal, parseAtlasActionProposalDraft } from "../../src/atlas/actions/proposal.ts";
import type { AtlasActionApproval, AtlasActionEntitySnapshot, AtlasLifeOSActionAdapter } from "../../src/atlas/actions/types.ts";

const ID = "atlas-action:123e4567-e89b-42d3-a456-426614174000";
const NOW = "2026-09-20T10:00:00.000Z";
const EMPTY: AtlasActionEntitySnapshot = { taskIds: [], habitIds: [], monthlyOutcomeIds: [], weeklyFocusIds: [] };

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
