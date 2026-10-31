import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import { AtlasActionExecutor } from "../../src/atlas/actions/actionExecutor.ts";
import { AtlasActionLifecycle } from "../../src/atlas/actions/actionLifecycle.ts";
import { createAtlasActionProposal, createAtlasProposalFingerprint } from "../../src/atlas/actions/proposal.ts";
import { atlasOutcomeMessage, atlasRecoveryPolicy } from "../../src/atlas/actions/actionOutcome.ts";
import { reconcileAtlasActionOutcome, atlasRetryDecision } from "../../src/atlas/actions/actionRecovery.ts";
import { createAtlasActionAuditWriter } from "../../src/atlas/actions/lifeOSActionAdapter.ts";
import { getConnectorCapabilityForAction } from "../../src/atlas/connectors/registry.ts";
import { AtlasConnectorRegistry } from "../../src/atlas/connectors/registry.ts";
import { createConnectorActionAdapter } from "../../src/atlas/connectors/connectorActionAdapter.ts";
import type { AtlasConnector } from "../../src/atlas/connectors/types.ts";
import { ExecutionHistoryService } from "../../src/services/ExecutionHistoryService.ts";
import { parseAtlasActionCandidate } from "../../src/atlas/actions/candidate.ts";
import type { AtlasActionOutcome } from "../../src/atlas/actions/actionOutcome.ts";
import type { AtlasActionAdapter, AtlasActionAuditWriter, AtlasActionExecutionResult, AtlasTrustedMutationResult } from "../../src/atlas/actions/types.ts";
import type AtlasActionProposalCard from "../../src/components/atlas/AtlasActionProposalCard.tsx";
import type { AtlasReadOnlyReconciler } from "../../src/atlas/actions/actionRecovery.ts";
import type { AsyncExecutionHistoryRepository } from "../../src/data/execution/asyncExecutionHistoryRepository.ts";
import type { ExecutionRecord } from "../../src/shared/execution.ts";

const EMPTY = { taskIds: [], completedTaskIds: [], habitIds: [], monthlyOutcomeIds: [], weeklyFocusIds: [] };
const NOW = "2026-10-21T10:00:00.000Z";
const PRIVATE = "PRIVATE_SYNTHETIC_PAYLOAD_NOT_FOR_OUTCOMES";
function proposal() { return createAtlasActionProposal({ type: "task.create", title: "Synthetic", payload: { title: PRIVATE } }, {
  id: "atlas-action:123e4567-e89b-42d3-a456-426614174000", createdAt: NOW,
}); }
function approval(p = proposal()) { return { version: "1.1.0" as const, actionId: p.id, decision: "approved" as const,
  source: "user" as const, decidedAt: NOW, proposalFingerprint: createAtlasProposalFingerprint(p) }; }
function input(p = proposal()) { return { proposal: p, approval: approval(p), snapshot: EMPTY,
  executionScope: { ownerUserId: "synthetic-a", isCurrent: () => true, readSnapshot: () => EMPTY } }; }
function outcome(result: AtlasActionExecutionResult): AtlasActionOutcome {
  assert.ok(result.outcome); return result.outcome;
}
function deferred<T>() { let resolve!: (value: T) => void; const promise = new Promise<T>(done => { resolve = done; }); return { promise, resolve }; }
const confirmedAudit: AtlasActionAuditWriter = { record: async () => ({ recordIds: [123], persistence: "confirmed" }) };
async function uncertain() {
  const e = new AtlasActionExecutor({ execute: async () => { throw new Error(PRIVATE); } });
  return outcome(await e.executeApprovedAction(input()));
}
function reader(o: AtlasActionOutcome, operation: "succeeded" | "failed"): AtlasReadOnlyReconciler {
  return { actionType: "task.create", mode: "read-only", readAttemptReceipt: async request => ({
    kind: "authoritative-attempt-receipt", ...request, operation,
    ownerUserId: o.ownerUserId, attemptId: o.attemptId,
  }) };
}

for (const category of ["permission", "approval", "reference", "account"] as const) {
  test(`outcome: ${category} denial is not-started with no adapter or audit`, async () => {
    let calls = 0;
    const e = new AtlasActionExecutor({ execute: async () => { calls++; return { executed: true }; } }, confirmedAudit);
    const i = input();
    if (category === "permission") i.proposal = { ...i.proposal, risk: "READ_ONLY" };
    if (category === "approval") i.approval = { ...i.approval, proposalFingerprint: "wrong" };
    if (category === "reference") {
      i.proposal = createAtlasActionProposal({ type: "task.complete", title: "Synthetic", payload: { taskId: 7 } }, { id: i.proposal.id, createdAt: NOW });
      i.approval = approval(i.proposal);
    }
    if (category === "account") i.executionScope.isCurrent = () => false;
    const o = outcome(await e.executeApprovedAction(i));
    assert.equal(o.operation.status, "not-started"); assert.equal(o.audit.status, "not-required"); assert.equal(calls, 0);
  });
}

test("outcome: explicit cancellation before execution has no authority to dispatch", async () => {
  const lifecycle = new AtlasActionLifecycle("synthetic-a"); let calls = 0;
  lifecycle.updateBindings({ ownerUserId: "synthetic-a", snapshot: EMPTY, adapter: { execute: async () => { calls++; return { executed: true }; } }, auditWriter: confirmedAudit });
  const p = proposal(); const ticket = lifecycle.beginRequest()!; lifecycle.bindProposal(ticket, p);
  lifecycle.invalidate();
  const cancelled = lifecycle.rejectBeforeStart(p, "cancelled", "Cancelled before dispatch.");
  assert.equal(outcome(cancelled).operation.status, "not-started");
  assert.equal((await lifecycle.execute(p, approval(p))).status, "rejected"); assert.equal(calls, 0);
});

test("outcome: attempt identity stays stable from in-flight through confirmation", async () => {
  const gate = deferred<AtlasTrustedMutationResult>();
  const e = new AtlasActionExecutor({ execute: () => gate.promise }, confirmedAudit);
  const pending = e.executeApprovedAction(input());
  const inFlight = e.getOutcome(proposal().id)!;
  assert.equal(inFlight.operation.status, "in-flight");
  gate.resolve({ executed: true }); const done = outcome(await pending);
  assert.equal(done.attemptId, inFlight.attemptId); assert.equal(done.ownerUserId, "synthetic-a");
  assert.equal(done.operation.status, "succeeded"); assert.equal(done.audit.status, "confirmed");
});

test("outcome: adapter acknowledgement remains separate from repository confirmation", async () => {
  const e = new AtlasActionExecutor({ execute: async () => ({ executed: true }) }, confirmedAudit);
  const o = outcome(await e.executeApprovedAction(input()));
  assert.equal(o.operation.status, "succeeded");
  if (o.operation.status === "succeeded") assert.equal(o.operation.confirmation, "adapter-acknowledged");
  assert.equal(o.audit.status, "confirmed"); assert.equal(atlasRecoveryPolicy(o).automaticRetry, false);
});

test("outcome: adapter-confirmed non-application is not a preflight rejection", async () => {
  const e = new AtlasActionExecutor({ execute: async () => ({ executed: false, reason: PRIVATE }) }, confirmedAudit);
  const result = await e.executeApprovedAction(input()); const o = outcome(result);
  assert.equal(o.operation.status, "failed"); assert.equal(o.audit.status, "not-required");
  assert.equal(atlasRetryDecision(o, "synthetic-a"), "new-proposal-and-approval-only");
  assert.doesNotMatch(JSON.stringify(result), new RegExp(PRIVATE));
});

test("outcome: exception in fresh-reference validation is known to precede dispatch", async () => {
  let calls = 0; const e = new AtlasActionExecutor({ execute: async () => { calls++; return { executed: true }; } });
  const i = input(); i.executionScope.readSnapshot = () => { throw new Error(PRIVATE); };
  const o = outcome(await e.executeApprovedAction(i));
  assert.equal(o.operation.status, "not-started"); assert.equal(calls, 0);
  if (o.operation.status === "not-started") assert.equal(o.operation.category, "preflight-error");
});

for (const failure of ["synchronous-throw", "accepted-then-thrown", "timeout", "lost-acknowledgement"] as const) {
  test(`outcome: ${failure} after invocation remains unknown and cannot replay`, async () => {
    let calls = 0;
    const adapter: AtlasActionAdapter = { execute: () => { calls++; if (failure === "synchronous-throw") throw new Error(PRIVATE); return Promise.reject(new Error(`${failure}: ${PRIVATE}`)); } };
    const e = new AtlasActionExecutor(adapter, confirmedAudit);
    const result = await e.executeApprovedAction(input()); const o = outcome(result);
    assert.equal(result.status, "unknown"); assert.equal(o.operation.status, "unknown");
    assert.equal(atlasRetryDecision(o, "synthetic-a"), "blocked-until-reconciled");
    assert.equal((await e.executeApprovedAction(input())).status, "rejected"); assert.equal(calls, 1);
    assert.doesNotMatch(JSON.stringify(result), new RegExp(PRIVATE));
  });
}

for (const value of [undefined, null, {}, { executed: "true" }, { executed: true, entityId: PRIVATE }, { outcome: "unknown" }]) {
  test(`outcome: malformed/uncertain adapter response ${JSON.stringify(value)} fails closed`, async () => {
    const e = new AtlasActionExecutor({ execute: async () => value as AtlasTrustedMutationResult }, confirmedAudit);
    const o = outcome(await e.executeApprovedAction(input()));
    assert.equal(o.operation.status, "unknown"); assert.equal(o.audit.status, "not-required");
  });
}

for (const state of ["throw", "legacy-receipt", "missing-writer", "malformed-receipt"] as const) {
  test(`outcome: success survives ${state} without claiming confirmed auditing`, async () => {
    const writer: AtlasActionAuditWriter | undefined = state === "missing-writer" ? undefined : {
      record: async () => { if (state === "throw") throw new Error(PRIVATE); return state === "legacy-receipt" ? [5] : []; },
    };
    const e = new AtlasActionExecutor({ execute: async () => ({ executed: true }) }, writer);
    const result = await e.executeApprovedAction(input()); const o = outcome(result);
    assert.equal(result.status, "executed"); assert.equal(o.operation.status, "succeeded");
    assert.notEqual(o.audit.status, "confirmed"); assert.equal(atlasRecoveryPolicy(o).auditAttentionRequired, true);
    assert.equal(atlasRetryDecision(o, "synthetic-a"), "not-offered");
    assert.doesNotMatch(JSON.stringify(result), new RegExp(PRIVATE));
    if (state === "malformed-receipt") {
      const malformed = { recordIds: new Array<number>(1), persistence: "confirmed" as const };
      const sparse = new AtlasActionExecutor({ execute: async () => ({ executed: true }) }, { record: async () => malformed });
      const checked = outcome(await sparse.executeApprovedAction(input()));
      assert.equal(checked.operation.status, "succeeded");
      assert.equal(checked.audit.status, "unconfirmed", "Sparse IDs cannot certify audit persistence");
    }
  });
}

test("outcome: audit is pending while repository acknowledgement is outstanding", async () => {
  const gate = deferred<readonly number[]>();
  const e = new AtlasActionExecutor({ execute: async () => ({ executed: true }) }, { record: () => gate.promise });
  const running = e.executeApprovedAction(input()); await Promise.resolve();
  const pending = e.getOutcome(proposal().id)!;
  assert.equal(pending.operation.status, "succeeded"); assert.equal(pending.audit.status, "pending");
  gate.resolve([123]); await running;
});

test("outcome: audit helper waits for the supplied repository promise", async () => {
  const gate = deferred<void>();
  const writer = createAtlasActionAuditWriter({ append: () => gate.promise, confirmation: "repository", createId: () => 123, now: () => NOW });
  let settled = false;
  const pending = writer.record({ source: "atlas", actionId: proposal().id, actionType: "task.create", approvalRequired: true, resultStatus: "executed" }).then(value => { settled = true; return value; });
  await Promise.resolve(); assert.equal(settled, false);
  gate.resolve(); assert.deepEqual(await pending, { recordIds: [123], persistence: "confirmed" });
});

test("recovery: wrong-account reconciliation never invokes the read capability", async () => {
  const o = await uncertain(); let reads = 0;
  const r = reader(o, "succeeded"); r.readAttemptReceipt = async () => { reads++; return {}; };
  assert.deepEqual(await reconcileAtlasActionOutcome(o, { currentOwner: () => "synthetic-b", reader: r }), { status: "denied", category: "account-mismatch" });
  assert.equal(reads, 0); assert.equal(atlasRetryDecision(o, "synthetic-b"), "denied");
});

for (const operation of ["succeeded", "failed"] as const) {
  test(`recovery: a matching authoritative attempt receipt resolves ${operation} without dispatch`, async () => {
    const o = await uncertain();
    const result = await reconcileAtlasActionOutcome(o, { currentOwner: () => "synthetic-a", reader: reader(o, operation) });
    assert.equal(result.status, "resolved"); if (result.status === "resolved") assert.equal(result.operation, operation);
    assert.equal(o.operation.status, "unknown"); // Read-only result, no mutation of the execution ledger.
  });
}

for (const evidence of [null, { exists: false }, { operation: "failed" }, { kind: "authoritative-attempt-receipt", ownerUserId: "synthetic-b" }]) {
  test(`recovery: insufficient or absent evidence ${JSON.stringify(evidence)} cannot authorize a retry`, async () => {
    const o = await uncertain(); const r = reader(o, "succeeded"); r.readAttemptReceipt = async () => evidence;
    assert.deepEqual(await reconcileAtlasActionOutcome(o, { currentOwner: () => "synthetic-a", reader: r }), { status: "unresolved", category: "insufficient-evidence" });
    assert.equal(atlasRetryDecision(o, "synthetic-a"), "blocked-until-reconciled");
  });
}

test("recovery: unsupported connectors have no implicit reconciliation authority", async () => {
  const o = await uncertain();
  assert.deepEqual(await reconcileAtlasActionOutcome(o, { currentOwner: () => "synthetic-a" }), { status: "unresolved", category: "unsupported" });
});

test("recovery: account switch during a bounded read discards its evidence", async () => {
  const o = await uncertain(); const gate = deferred<unknown>(); let owner = "synthetic-a";
  const r = reader(o, "succeeded"); r.readAttemptReceipt = () => gate.promise;
  const pending = reconcileAtlasActionOutcome(o, { currentOwner: () => owner, reader: r });
  owner = "synthetic-b"; gate.resolve({});
  assert.deepEqual(await pending, { status: "denied", category: "account-mismatch" });
});

test("recovery: read exceptions remain opaque and unresolved", async () => {
  const o = await uncertain(); const r = reader(o, "succeeded"); r.readAttemptReceipt = async () => { throw new Error(PRIVATE); };
  const result = await reconcileAtlasActionOutcome(o, { currentOwner: () => "synthetic-a", reader: r });
  assert.deepEqual(result, { status: "unresolved", category: "read-failed" });
  assert.doesNotMatch(JSON.stringify(result), new RegExp(PRIVATE));
});

test("recovery: forbidden type denies both reconciliation and retry", async () => {
  const o = { ...await uncertain(), actionType: "unsupported" as const };
  assert.deepEqual(await reconcileAtlasActionOutcome(o, { currentOwner: () => "synthetic-a" }), { status: "denied", category: "permission-denied" });
  assert.equal(atlasRetryDecision(o, "synthetic-a"), "denied");
});

test("outcome: snapshots and metadata do not expose the payload-bearing approval fingerprint", async () => {
  const o = await uncertain();
  assert.doesNotMatch(JSON.stringify(o), new RegExp(PRIVATE));
  assert.equal("proposalFingerprint" in o, false);
  const e = new AtlasActionExecutor({ execute: async () => ({ executed: true }) }, confirmedAudit);
  const result = await e.executeApprovedAction(input()); const snapshot = e.getOutcome(proposal().id)!;
  snapshot.attemptId = "changed";
  assert.notEqual(e.getOutcome(proposal().id)!.attemptId, snapshot.attemptId);
  assert.ok(result.outcome);
  result.outcome.attemptId = "changed-returned-envelope";
  assert.notEqual(e.getOutcome(proposal().id)!.attemptId, result.outcome.attemptId);

  const gate = deferred<AtlasTrustedMutationResult>();
  const original = proposal();
  const entries: unknown[] = [];
  const held = new AtlasActionExecutor({ execute: dispatched => { dispatched.id = PRIVATE; return gate.promise; } }, {
    record: async entry => { entries.push(entry); return { recordIds: [123], persistence: "confirmed" }; },
  });
  const originalInput = input(original);
  const pending = held.executeApprovedAction(originalInput);
  original.id = PRIVATE;
  originalInput.approval.decidedAt = PRIVATE;
  gate.resolve({ executed: true });
  const completed = await pending;
  assert.equal(completed.actionId, proposal().id, "Caller mutation cannot retarget an in-flight result");
  assert.doesNotMatch(JSON.stringify(entries), new RegExp(PRIVATE));
});

test("outcome: provider candidates cannot assign outcomes or reconciliation authority", () => {
  for (const field of ["outcome", "audit", "reconciliation", "attemptId"]) {
    assert.throws(() => parseAtlasActionCandidate({ version: "1.0.0", actionType: "task.create", payload: { title: "Synthetic" }, [field]: "forged" }), /unsupported fields/);
  }
});

function card(result: AtlasActionExecutionResult) {
  const require = createRequire(import.meta.url);
  const module = { exports: {} as { default: typeof AtlasActionProposalCard } };
  const url = new URL("../../src/components/atlas/AtlasActionProposalCard.tsx", import.meta.url);
  runInNewContext(ts.transpileModule(readFileSync(url, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText,
    { module, exports: module.exports, require: (id: string) => id.endsWith("/actionOutcome") ? { atlasOutcomeMessage } :
      id.endsWith("/registry") ? { getConnectorCapabilityForAction } : require(id) });
  return renderToStaticMarkup(createElement(module.exports.default, { result, proposal: proposal(), executing: false,
    onApprove() {}, onCancel() {}, onDismissResult() {} }));
}

test("UI: unknown outcome explicitly warns against automatic repeat", async () => {
  const e = new AtlasActionExecutor({ execute: async () => { throw new Error(PRIVATE); } });
  const html = card(await e.executeApprovedAction(input()));
  assert.match(html, /Action outcome unknown/); assert.match(html, /Do not repeat it automatically/);
  assert.doesNotMatch(html, /Approved action completed|Action could not be completed|PRIVATE_SYNTHETIC/);
});

test("UI: audit failure is not displayed as operation failure or fully audited success", async () => {
  const e = new AtlasActionExecutor({ execute: async () => ({ executed: true }) }, { record: async () => { throw new Error(PRIVATE); } });
  const html = card(await e.executeApprovedAction(input()));
  assert.match(html, /audit unconfirmed/); assert.match(html, /Do not repeat the action/);
  assert.doesNotMatch(html, /Action could not be completed|PRIVATE_SYNTHETIC/);
});

test("audit: repository generation fences a delayed confirmation even when mutation counters collide", async () => {
  const gate = deferred<ExecutionRecord[]>(); let bRows: ExecutionRecord[] = [];
  const make = (): AsyncExecutionHistoryRepository => ({ initialize: async () => [], readCurrent: async () => [], waitForPersistence: async () => undefined,
    append: async () => [], replace: async () => [], remove: async () => [], clear: async () => undefined, subscribe: () => () => undefined });
  const a = make(); const b = make(); a.append = () => gate.promise;
  b.append = async rows => { bRows = [...rows]; return bRows; };
  const record = (id: number): ExecutionRecord => ({ id, type: "system", entityId: id, title: "Synthetic audit", createdAt: NOW, xpAwarded: 0 });
  try {
    ExecutionHistoryService.configureRepository(a); await ExecutionHistoryService.initialize();
    const old = ExecutionHistoryService.appendConfirmedForRepository(a, [record(1)]);
    const rejected = assert.rejects(old);
    ExecutionHistoryService.releaseRepository(a); ExecutionHistoryService.configureRepository(b); await ExecutionHistoryService.initialize();
    await ExecutionHistoryService.appendConfirmedForRepository(b, [record(2)]);
    gate.resolve([record(1)]); await rejected;
    assert.deepEqual(ExecutionHistoryService.getAll().map(row => row.id), [2]);
    assert.deepEqual(bRows.map(row => row.id), [2]); assert.equal(ExecutionHistoryService.getTotalXP(), 0);

    // Repository ownership must also hold while hydration is still outstanding.
    const hydration = deferred<ExecutionRecord[]>();
    ExecutionHistoryService.releaseRepository(b);
    a.initialize = () => hydration.promise;
    b.initialize = async () => bRows;
    ExecutionHistoryService.configureRepository(a);
    const staleInitialization = ExecutionHistoryService.initialize();
    const rejectedInitialization = assert.rejects(staleInitialization);
    ExecutionHistoryService.releaseRepository(a);
    ExecutionHistoryService.configureRepository(b);
    await ExecutionHistoryService.initialize();
    hydration.resolve([record(99)]);
    await rejectedInitialization;
    assert.deepEqual(ExecutionHistoryService.getAll().map(row => row.id), [2]);

    const optimistic = deferred<ExecutionRecord[]>();
    ExecutionHistoryService.releaseRepository(b);
    a.initialize = async () => [];
    a.append = () => optimistic.promise;
    ExecutionHistoryService.configureRepository(a);
    await ExecutionHistoryService.initialize();
    ExecutionHistoryService.append([record(3)]);
    ExecutionHistoryService.releaseRepository(a);
    ExecutionHistoryService.configureRepository(b);
    await ExecutionHistoryService.initialize();
    b.append = async rows => { bRows = [...rows, ...bRows]; return bRows; };
    await ExecutionHistoryService.appendConfirmedForRepository(b, [record(4)]);
    optimistic.resolve([record(3)]);
    await Promise.resolve(); await Promise.resolve();
    assert.deepEqual(ExecutionHistoryService.getAll().map(row => row.id), [4, 2]);
  } finally { ExecutionHistoryService.releaseRepository(a); ExecutionHistoryService.releaseRepository(b); }
});

for (const mode of ["preflight-unavailable", "post-dispatch-unavailable", "forged-not-started", "wrong-response-id"] as const) {
  test(`connector outcome: ${mode} cannot misclassify the dispatch boundary`, async () => {
    let calls = 0;
    const connector: AtlasConnector = { id: "calendar", capabilities: ["calendar.read"],
      connectionState: () => mode === "preflight-unavailable" ? "disconnected" : "connected",
      execute: async request => { calls++;
        if (mode === "wrong-response-id") return { status: "success", requestId: "not-this-action" };
        return { status: "unavailable", requestId: request.requestId, safeError: PRIVATE,
          ...(mode === "forged-not-started" ? { dispatch: "not-started" as const } : {}) };
      },
    };
    const p = createAtlasActionProposal({ type: "calendar.read", title: "Synthetic read", payload: {} }, { id: proposal().id, createdAt: NOW });
    const e = new AtlasActionExecutor(createConnectorActionAdapter(new AtlasConnectorRegistry([connector])));
    const result = await e.executeApprovedAction({ ...input(p), proposal: p });
    assert.equal(outcome(result).operation.status, mode === "preflight-unavailable" ? "failed" : "unknown");
    assert.equal(calls, mode === "preflight-unavailable" ? 0 : 1);
    assert.doesNotMatch(JSON.stringify(result), new RegExp(PRIVATE));
  });
}
