import assert from "node:assert/strict";
import test from "node:test";
import { AtlasActionExecutor } from "../../src/atlas/actions/actionExecutor.ts";
import { AtlasActionLifecycle } from "../../src/atlas/actions/actionLifecycle.ts";
import { createAtlasActionProposal, createAtlasProposalFingerprint } from "../../src/atlas/actions/proposal.ts";
import { createLifeOSActionAdapter } from "../../src/atlas/actions/lifeOSActionAdapter.ts";
import { atlasOutcomeMessage, atlasRecoveryPolicy } from "../../src/atlas/actions/actionOutcome.ts";
import type { AtlasAttemptIdentity } from "../../src/atlas/actions/actionOutcomeTypes.ts";
import type { AtlasActionAdapter, AtlasActionAuditWriter, AtlasTrustedMutationResult } from "../../src/atlas/actions/types.ts";
import type { TaskCreationAcceptance } from "../../src/shared/taskMutation.ts";

const EMPTY = { taskIds: [], completedTaskIds: [], habitIds: [], monthlyOutcomeIds: [], weeklyFocusIds: [] };
const PRIVATE = "PRIVATE_SYNTHETIC_TASK_PAYLOAD";
const NOW = "2026-10-21T12:00:00.000Z";
function proposal() { return createAtlasActionProposal({ type: "task.create", title: "Synthetic", payload: { title: PRIVATE } }, {
  id: "atlas-action:123e4567-e89b-42d3-a456-426614174000", createdAt: NOW,
}); }
function input() {
  const p = proposal();
  return { proposal: p, approval: { version: "1.1.0" as const, actionId: p.id, source: "user" as const,
    decision: "approved" as const, decidedAt: NOW, proposalFingerprint: createAtlasProposalFingerprint(p) },
  snapshot: EMPTY, executionScope: { ownerUserId: "synthetic-a", isCurrent: () => true, readSnapshot: () => EMPTY } };
}
function ports(createTask: () => TaskCreationAcceptance | void) {
  return createLifeOSActionAdapter({ createTask, completeTask() {}, createHabit() {}, updateHabit() {},
    updateTask: () => ({ updated: true, message: "Synthetic" }), createCapture: async () => {},
    createGoalWeeklyFocus: () => ({ created: true, message: "Synthetic" }), createPersonalWeeklyFocus: () => ({ created: true, message: "Synthetic" }) });
}
function receipt(attempt: Readonly<AtlasAttemptIdentity>) {
  return { version: "1.0.0" as const, actionType: "task.create" as const, actionId: attempt.actionId,
    attemptId: attempt.attemptId, ownerUserId: attempt.ownerUserId!, status: "accepted" as const,
    assurance: "canonical-accepted" as const, entityId: 7 };
}
const accepted = () => ({ status: "accepted" as const, taskId: 7 });
const audit: AtlasActionAuditWriter = { record: async () => ({ recordIds: [9], persistence: "confirmed" }) };

test("receipt: valid canonical acceptance is stronger than invocation but not persistence", async () => {
  const result = await new AtlasActionExecutor(ports(accepted), audit).executeApprovedAction(input());
  assert.equal(result.status, "executed");
  assert.equal(result.outcome?.operation.status, "succeeded");
  if (result.outcome?.operation.status !== "succeeded") throw new Error("Missing outcome");
  assert.equal(result.outcome.operation.confirmation, "canonical-accepted");
  assert.equal(result.outcome.audit.status, "confirmed");
  assert.match(atlasOutcomeMessage(result.outcome).detail, /Local persistence and cloud synchronization are not confirmed/);
});

test("receipt: explicit canonical rejection invokes no success audit", async () => {
  let audits = 0;
  const result = await new AtlasActionExecutor(ports(() => ({ status: "rejected" })), {
    record: async () => { audits++; return [9]; },
  }).executeApprovedAction(input());
  assert.equal(result.outcome?.operation.status, "failed"); assert.equal(audits, 0);
});

for (const mode of ["synchronous", "post-dispatch"] as const) {
  test(`receipt: ${mode} exception is unknown, never safe-to-replay`, async () => {
    let calls = 0;
    const adapter = mode === "synchronous" ? ports(() => { calls++; throw new Error(PRIVATE); }) : {
      execute: async () => { calls++; await Promise.resolve(); throw new Error(PRIVATE); },
    };
    const executor = new AtlasActionExecutor(adapter, audit);
    const result = await executor.executeApprovedAction(input());
    assert.equal(result.outcome?.operation.status, "unknown");
    assert.equal(atlasRecoveryPolicy(result.outcome!).retry, "blocked-until-reconciled");
    await executor.executeApprovedAction(input()); assert.equal(calls, 1);
    assert.doesNotMatch(JSON.stringify(result), new RegExp(PRIVATE));
  });
}

for (const field of ["attemptId", "ownerUserId", "actionId", "actionType", "version", "assurance", "entityId", "extra"] as const) {
  test(`receipt: incorrect or malformed ${field} cannot upgrade confirmation`, async () => {
    const adapter: AtlasActionAdapter = { execute: async (_p, attempt) => {
      const raw: Record<string, unknown> = receipt(attempt!);
      raw[field] = field === "entityId" ? -1 : field === "extra" ? PRIVATE : "wrong";
      return { receipt: raw } as unknown as AtlasTrustedMutationResult;
    } };
    const result = await new AtlasActionExecutor(adapter, audit).executeApprovedAction(input());
    assert.equal(result.outcome?.operation.status, "unknown");
    assert.equal(result.outcome?.audit.status, "not-required");
    assert.doesNotMatch(JSON.stringify(result), new RegExp(PRIVATE));
  });
}

test("receipt: stale receipt from an earlier attempt is not authoritative for a fresh attempt", async () => {
  let old: ReturnType<typeof receipt> | undefined;
  const adapter: AtlasActionAdapter = { execute: async (_p, attempt) => {
    old ??= receipt(attempt!); return { receipt: old };
  } };
  assert.equal((await new AtlasActionExecutor(adapter).executeApprovedAction(input())).status, "executed");
  assert.equal((await new AtlasActionExecutor(adapter).executeApprovedAction(input())).status, "unknown");
});

test("receipt: audit append failure cannot erase canonical acceptance or justify replay", async () => {
  const executor = new AtlasActionExecutor(ports(accepted), { record: async () => { throw new Error(PRIVATE); } });
  const result = await executor.executeApprovedAction(input());
  assert.equal(result.status, "executed"); assert.equal(result.outcome?.audit.status, "unconfirmed");
  assert.equal(atlasRecoveryPolicy(result.outcome!).retry, "not-offered");
  assert.equal((await executor.executeApprovedAction(input())).status, "rejected");
});

test("receipt: legacy void port remains acknowledgement-only", async () => {
  const result = await new AtlasActionExecutor(ports(() => {}), audit).executeApprovedAction(input());
  assert.equal(result.outcome?.operation.status, "succeeded");
  if (result.outcome?.operation.status !== "succeeded") throw new Error("Missing outcome");
  assert.equal(result.outcome.operation.confirmation, "adapter-acknowledged");
});

test("receipt: malformed canonical port result cannot silently become an acknowledgement", async () => {
  const adapter = ports(() => ({ status: "accepted", taskId: 7, persistence: "remote" }) as TaskCreationAcceptance);
  assert.equal((await new AtlasActionExecutor(adapter).executeApprovedAction(input())).status, "unknown");
  const inherited: AtlasActionAdapter = { execute: async (_p, attempt) =>
    Object.assign(Object.create({ receipt: receipt(attempt!) }), { extra: PRIVATE }) as AtlasTrustedMutationResult };
  assert.equal((await new AtlasActionExecutor(inherited).executeApprovedAction(input())).status, "unknown");
});

test("receipt: immutable invocation identity excludes payload-bearing approval fingerprints", async () => {
  const entries: unknown[] = [];
  const adapter: AtlasActionAdapter = { execute: async (_p, attempt) => {
    assert.ok(Object.isFrozen(attempt));
    assert.deepEqual(Object.keys(attempt!).sort(), ["version", "actionId", "actionType", "ownerUserId", "attemptId", "preparedAt"].sort());
    assert.doesNotMatch(JSON.stringify(attempt), new RegExp(PRIVATE));
    return { receipt: receipt(attempt!) };
  } };
  const result = await new AtlasActionExecutor(adapter, { record: async entry => { entries.push(entry); return [9]; } }).executeApprovedAction(input());
  assert.doesNotMatch(JSON.stringify([result, entries]), new RegExp(PRIVATE));
});

test("receipt: missing account ownership cannot certify a canonical result", async () => {
  const i = input();
  const result = await new AtlasActionExecutor(ports(accepted)).executeApprovedAction({ proposal: i.proposal, approval: i.approval, snapshot: EMPTY });
  assert.equal(result.status, "unknown");
});

test("receipt: late completion and repeated approvals retain A's bound writer across transitions", async () => {
  let finish!: () => void;
  const gate = new Promise<void>(resolve => { finish = resolve; });
  const a = new AtlasActionLifecycle("synthetic-a"); let aCalls = 0; let bCalls = 0; let aAudits = 0; let bAudits = 0;
  const aBindings = { ownerUserId: "synthetic-a", snapshot: EMPTY, adapter: {
    execute: async (_p: unknown, attempt?: Readonly<AtlasAttemptIdentity>) => { aCalls++; await gate; return { receipt: receipt(attempt!) }; },
  }, auditWriter: { record: async () => { aAudits++; return [9]; } } };
  a.updateBindings(aBindings);
  const p = proposal(); a.bindProposal(a.beginRequest()!, p);
  const approval = input().approval;
  const running = a.execute(p, approval); await a.execute(p, approval);
  a.deactivate();
  const b = new AtlasActionLifecycle("synthetic-b");
  b.updateBindings({ ownerUserId: "synthetic-b", snapshot: EMPTY, adapter: { execute: async () => { bCalls++; return { executed: true }; } },
    auditWriter: { record: async () => { bAudits++; return [9]; } } });
  finish(); const result = await running;
  assert.equal(result.outcome?.ownerUserId, "synthetic-a"); assert.equal(result.status, "executed");
  assert.deepEqual([aCalls, bCalls, aAudits, bAudits], [1, 0, 1, 0]);
});
