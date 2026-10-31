import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { AtlasActionLifecycle } from "../../src/atlas/actions/actionLifecycle.ts";
import type { AtlasActionLifecycleBindings } from "../../src/atlas/actions/actionLifecycle.ts";
import { AtlasActionExecutor } from "../../src/atlas/actions/actionExecutor.ts";
import { createAtlasActionProposal, createAtlasProposalFingerprint } from "../../src/atlas/actions/proposal.ts";
import { resolveAtlasActionRequestWithProvider } from "../../src/atlas/actions/candidate.ts";
import type { AtlasActionApproval, AtlasActionProposal, AtlasActionEntitySnapshot } from "../../src/atlas/actions/types.ts";

const EMPTY: AtlasActionEntitySnapshot = {
  taskIds: [], completedTaskIds: [], habitIds: [], monthlyOutcomeIds: [], weeklyFocusIds: [],
};
function proposal(type: "task.create" | "task.complete" = "task.create") {
  return createAtlasActionProposal({ type, title: "Synthetic task",
    payload: type === "task.create" ? { title: "Synthetic task" } : { taskId: 7 },
  }, { id: "atlas-action:123e4567-e89b-42d3-a456-426614174000", createdAt: "2026-10-21T10:00:00.000Z" });
}
function approval(p: AtlasActionProposal): AtlasActionApproval {
  return { version: "1.1.0", actionId: p.id, decision: "approved", source: "user",
    decidedAt: "2026-10-21T10:00:00.000Z", proposalFingerprint: createAtlasProposalFingerprint(p) };
}
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => { resolve = done; });
  return { promise, resolve };
}
function fixture() {
  let mutations = 0;
  let audits = 0;
  const bindings: AtlasActionLifecycleBindings = {
    ownerUserId: "account-a", snapshot: EMPTY,
    adapter: { execute: async () => { mutations++; return { executed: true }; } },
    auditWriter: { record: async () => { audits++; return [1]; } },
  };
  const lifecycle = new AtlasActionLifecycle("account-a");
  lifecycle.updateBindings(bindings);
  return { lifecycle, bindings, counts: () => ({ mutations, audits }) };
}
function bind(f: ReturnType<typeof fixture>, p = proposal()) {
  const ticket = f.lifecycle.beginRequest();
  assert.ok(ticket);
  assert.equal(f.lifecycle.bindProposal(ticket, p), true);
  return { ticket, p };
}

test("characterizes old executor recreation: duplicate memory is instance-local", async () => {
  let mutations = 0;
  const adapter = { execute: async () => { mutations++; return { executed: true }; } };
  const p = proposal();
  for (let i = 0; i < 2; i++) {
    await new AtlasActionExecutor(adapter).executeApprovedAction({ proposal: p, approval: approval(p), snapshot: EMPTY });
  }
  assert.equal(mutations, 2); // Why ownership must survive changing React dependencies.
});

test("out-of-order provider completions cannot replace the newest proposal", async () => {
  const f = fixture();
  const first = deferred<AtlasActionProposal>();
  const second = deferred<AtlasActionProposal>();
  const ticket1 = f.lifecycle.beginRequest()!;
  const result1 = first.promise.then(p => f.lifecycle.bindProposal(ticket1, p));
  const ticket2 = f.lifecycle.beginRequest()!;
  const result2 = second.promise.then(p => f.lifecycle.bindProposal(ticket2, p));
  const p = proposal();
  second.resolve(p);
  assert.equal(await result2, true);
  first.resolve({ ...p, title: "Obsolete request" });
  assert.equal(await result1, false);
  assert.equal(f.lifecycle.isProposalCurrent(p), true);
  assert.deepEqual(f.counts(), { mutations: 0, audits: 0 });
});

test("cancellation before provider completion rejects the delayed candidate", async () => {
  const f = fixture();
  const ticket = f.lifecycle.beginRequest()!;
  const delayed = deferred<AtlasActionProposal>();
  const result = delayed.promise.then(p => f.lifecycle.bindProposal(ticket, p));
  f.lifecycle.invalidate();
  delayed.resolve(proposal());
  assert.equal(await result, false);
  assert.deepEqual(f.counts(), { mutations: 0, audits: 0 });
});

test("Account A request cannot bind after switching to B", () => {
  const f = fixture();
  const ticket = f.lifecycle.beginRequest()!;
  f.lifecycle.updateBindings({ ...f.bindings, ownerUserId: "account-b" });
  assert.equal(f.lifecycle.bindProposal(ticket, proposal()), false);
  assert.equal(f.lifecycle.beginRequest(), null);
});

test("account change after proposal creation rejects approved execution", async () => {
  const f = fixture();
  const { p } = bind(f);
  f.lifecycle.updateBindings({ ...f.bindings, ownerUserId: "account-b" });
  assert.equal((await f.lifecycle.execute(p, approval(p))).status, "rejected");
  assert.deepEqual(f.counts(), { mutations: 0, audits: 0 });
});

test("logout/unmount invalidates proposals and all delayed results", async () => {
  const f = fixture();
  const { p, ticket } = bind(f);
  f.lifecycle.deactivate();
  assert.equal(f.lifecycle.isCurrent(ticket), false);
  assert.equal((await f.lifecycle.execute(p, approval(p))).status, "rejected");
});

test("StrictMode cleanup/reactivation and rapid A-B-A never resurrect old tickets", () => {
  const f = fixture();
  const { ticket, p } = bind(f);
  f.lifecycle.deactivate();
  f.lifecycle.updateBindings(f.bindings);
  assert.equal(f.lifecycle.isCurrent(ticket), false);
  assert.equal(f.lifecycle.isProposalCurrent(p), false);
  assert.ok(f.lifecycle.beginRequest());
});

test("same-account rerenders keep current request and approval valid", async () => {
  const f = fixture();
  const { p, ticket } = bind(f);
  for (let i = 0; i < 5; i++) f.lifecycle.updateBindings({ ...f.bindings, snapshot: { ...EMPTY } });
  assert.equal(f.lifecycle.isCurrent(ticket), true);
  assert.equal((await f.lifecycle.execute(p, approval(p))).status, "executed");
  assert.deepEqual(f.counts(), { mutations: 1, audits: 1 });
});

test("repeated approval clicks are synchronously latched", async () => {
  const f = fixture();
  const gate = deferred<{ executed: boolean }>();
  let calls = 0;
  f.lifecycle.updateBindings({ ...f.bindings, adapter: { execute: () => { calls++; return gate.promise; } } });
  const { p } = bind(f);
  const first = f.lifecycle.execute(p, approval(p));
  assert.equal(f.lifecycle.canExecute(p), false);
  assert.equal((await f.lifecycle.execute(p, approval(p))).status, "rejected");
  assert.equal(calls, 1);
  gate.resolve({ executed: true });
  assert.equal((await first).status, "executed");
});

test("executor ownership survives adapter dependency replacement", async () => {
  const f = fixture();
  const { p } = bind(f);
  await f.lifecycle.execute(p, approval(p));
  let replacementCalls = 0;
  f.lifecycle.updateBindings({ ...f.bindings, adapter: { execute: async () => { replacementCalls++; return { executed: true }; } } });
  const ticket = f.lifecycle.beginRequest()!;
  f.lifecycle.bindProposal(ticket, p);
  assert.equal((await f.lifecycle.execute(p, approval(p))).status, "rejected");
  assert.equal(replacementCalls, 0);
  assert.deepEqual(f.counts(), { mutations: 1, audits: 1 });
});

test("latest adapter is used for a new approved action, not a stale closure", async () => {
  const f = fixture();
  const { p } = bind(f);
  let calls = 0;
  f.lifecycle.updateBindings({ ...f.bindings, adapter: { execute: async () => { calls++; return { executed: true }; } } });
  await f.lifecycle.execute(p, approval(p));
  assert.equal(calls, 1);
  assert.deepEqual(f.counts(), { mutations: 0, audits: 1 });
});

test("newer entity state rejects a target removed after proposal creation", async () => {
  const f = fixture();
  f.lifecycle.updateBindings({ ...f.bindings, snapshot: { ...EMPTY, taskIds: [7] } });
  const { p } = bind(f, proposal("task.complete"));
  f.lifecycle.updateBindings(f.bindings);
  assert.equal((await f.lifecycle.execute(p, approval(p))).status, "rejected");
  assert.deepEqual(f.counts(), { mutations: 0, audits: 0 });
});

test("already completed target is rejected against the newest snapshot", async () => {
  const f = fixture();
  f.lifecycle.updateBindings({ ...f.bindings, snapshot: { ...EMPTY, taskIds: [7] } });
  const { p } = bind(f, proposal("task.complete"));
  f.lifecycle.updateBindings({ ...f.bindings, snapshot: { ...EMPTY, taskIds: [7], completedTaskIds: [7] } });
  assert.equal((await f.lifecycle.execute(p, approval(p))).status, "rejected");
  assert.deepEqual(f.counts(), { mutations: 0, audits: 0 });
});

test("invalid references cannot become actionable on delayed provider completion", () => {
  const f = fixture();
  const ticket = f.lifecycle.beginRequest()!;
  assert.equal(f.lifecycle.bindProposal(ticket, proposal("task.complete")), false);
});

test("incorrect approval fingerprint cannot invoke adapter or audit", async () => {
  const f = fixture();
  const { p } = bind(f);
  assert.equal((await f.lifecycle.execute(p, { ...approval(p), proposalFingerprint: "incorrect" })).status, "rejected");
  assert.deepEqual(f.counts(), { mutations: 0, audits: 0 });
});

test("provider cannot lower deterministic risk or gain permission", async () => {
  const f = fixture();
  const p = { ...proposal(), risk: "READ_ONLY" as const, requiresApproval: false };
  bind(f, p);
  assert.equal((await f.lifecycle.execute(p, approval(p))).status, "rejected");
  assert.deepEqual(f.counts(), { mutations: 0, audits: 0 });
});

test("forbidden action is denied even when a trusted caller binds it", async () => {
  const f = fixture();
  // Deliberately invalid runtime value, as at an untrusted boundary.
  const p = { ...proposal(), type: "finance.transfer" } as unknown as AtlasActionProposal;
  bind(f, p);
  assert.equal((await f.lifecycle.execute(p, approval(p))).status, "rejected");
  assert.deepEqual(f.counts(), { mutations: 0, audits: 0 });
});

test("altering a bound proposal invalidates its confirmation", async () => {
  const f = fixture();
  const { p } = bind(f);
  assert.equal(p.type, "task.create");
  if (p.type !== "task.create") throw new Error("Expected task creation fixture");
  const changed = { ...p, payload: { title: "Changed after review" } };
  assert.equal((await f.lifecycle.execute(changed, approval(changed))).status, "rejected");
});

test("unavailable provider retains deterministic fallback behind lifecycle and approval", async () => {
  const f = fixture();
  const ticket = f.lifecycle.beginRequest()!;
  const resolved = await resolveAtlasActionRequestWithProvider("Create a task to study SAT tomorrow", {
    snapshot: { tasks: [], habits: [], monthlyOutcomes: [], weeklyFocuses: [] },
    now: new Date(2026, 9, 21, 10), provider: { id: "unavailable", generate: async () => ({ status: "unavailable" }) },
  });
  assert.equal(resolved.source, "deterministic-fallback");
  assert.equal(resolved.outcome.status, "proposal");
  if (resolved.outcome.status !== "proposal") throw new Error("Expected fallback draft");
  const p = createAtlasActionProposal(resolved.outcome.draft, { id: proposal().id, createdAt: proposal().createdAt });
  assert.equal(f.lifecycle.bindProposal(ticket, p), true);
  assert.deepEqual(f.counts(), { mutations: 0, audits: 0 });
  assert.equal((await f.lifecycle.execute(p, approval(p))).status, "executed");
});

test("cancel does not undo a started operation; another request cannot run concurrently", async () => {
  const f = fixture();
  const gate = deferred<{ executed: boolean }>();
  f.lifecycle.updateBindings({ ...f.bindings, adapter: { execute: () => gate.promise } });
  const { p } = bind(f);
  const running = f.lifecycle.execute(p, approval(p));
  f.lifecycle.invalidate();
  assert.equal(f.lifecycle.beginRequest(), null);
  gate.resolve({ executed: true });
  assert.equal((await running).status, "executed");
  assert.equal(f.lifecycle.isProposalCurrent(p), false);
  assert.deepEqual(f.counts(), { mutations: 0, audits: 1 });
});

test("delayed operation retains its original bound audit writer, never the new account's writer", async () => {
  const f = fixture();
  const gate = deferred<{ executed: boolean }>();
  f.lifecycle.updateBindings({ ...f.bindings, adapter: { execute: () => gate.promise } });
  const { p } = bind(f);
  const running = f.lifecycle.execute(p, approval(p));
  let foreignAudits = 0;
  f.lifecycle.updateBindings({ ...f.bindings, ownerUserId: "account-b", auditWriter: { record: async () => { foreignAudits++; return []; } } });
  gate.resolve({ executed: true });
  assert.equal((await running).status, "executed");
  assert.equal(foreignAudits, 0);
  assert.deepEqual(f.counts(), { mutations: 0, audits: 1 });
});

test("executor fences account scope immediately before adapter invocation", async () => {
  const p = proposal();
  let checks = 0;
  let calls = 0;
  const executor = new AtlasActionExecutor({ execute: async () => { calls++; return { executed: true }; } });
  const result = await executor.executeApprovedAction({ proposal: p, approval: approval(p), snapshot: EMPTY,
    executionScope: { isCurrent: () => ++checks === 1, readSnapshot: () => EMPTY },
  });
  assert.equal(result.status, "rejected");
  assert.equal(checks, 2);
  assert.equal(calls, 0);
});

test("executor ignores captured references when a fresh scope snapshot is supplied", async () => {
  const p = proposal("task.complete");
  let calls = 0;
  const executor = new AtlasActionExecutor({ execute: async () => { calls++; return { executed: true }; } });
  const result = await executor.executeApprovedAction({ proposal: p, approval: approval(p), snapshot: { ...EMPTY, taskIds: [7] },
    executionScope: { isCurrent: () => true, readSnapshot: () => EMPTY },
  });
  assert.equal(result.status, "rejected");
  assert.equal(calls, 0);
});

test("hook wiring keeps lifecycle independent from changing mutation adapters", () => {
  const source = readFileSync(new URL("../../src/atlas/actions/useAtlasActions.ts", import.meta.url), "utf8");
  assert.match(source, /new AtlasActionLifecycle\(ownerUserId\), \[ownerUserId\]/);
  assert.match(source, /useLayoutEffect\(\(\) => \(\) => lifecycle.deactivate\(\), \[lifecycle\]\)/);
  assert.match(source, /if \(!lifecycle.isCurrent\(ticket\)\) return true/);
  assert.match(source, /!lifecycle.canExecute\(proposal\)/);
  assert.match(source, /if \(!lifecycle.isProposalCurrent\(proposal\)\) return/);
  assert.match(source, /stateScope === lifecycle \? proposal : null/);
  assert.match(source, /const currentClarification = stateScope === lifecycle \? clarification : null/);
  assert.match(source, /setProposal\(null\);\s+setResult\(null\);\s+setIntentFeedback\(null\);\s+if \(!currentClarification\) setClarification\(null\)/);
});
