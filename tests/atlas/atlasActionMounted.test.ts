import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { runInNewContext } from "node:vm";
import test from "node:test";
import { JSDOM } from "jsdom";
import { act, createContext, createElement, StrictMode, useContext, useLayoutEffect } from "react";
import { createRoot } from "react-dom/client";
import ts from "typescript";
import { ExecutionHistoryService } from "../../src/services/ExecutionHistoryService.ts";
import type { AsyncExecutionHistoryRepository } from "../../src/data/execution/asyncExecutionHistoryRepository.ts";
import type { ExecutionRecord } from "../../src/shared/execution.ts";
import type { AtlasActionCandidateGenerationResult, AtlasActionCandidateProvider } from "../../src/atlas/actions/candidate.ts";
import { DeterministicMockAtlasActionCandidateProvider } from "../../src/atlas/actions/candidate.ts";
import type { AtlasTaskCreatePayload } from "../../src/atlas/actions/types.ts";
import type { useAtlasActions } from "../../src/atlas/actions/useAtlasActions.ts";
import type AtlasActionProposalCard from "../../src/components/atlas/AtlasActionProposalCard.tsx";
import { atlasOutcomeMessage } from "../../src/atlas/actions/actionOutcome.ts";
import { getConnectorCapabilityForAction } from "../../src/atlas/connectors/registry.ts";

type Controller = ReturnType<typeof useAtlasActions>;
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(done => { resolve = done; });
  return { promise, resolve };
}
function ledger() {
  let rows: ExecutionRecord[] = [];
  const repository: AsyncExecutionHistoryRepository = {
    initialize: async () => structuredClone(rows), readCurrent: async () => structuredClone(rows),
    waitForPersistence: async () => undefined,
    replace: async records => { rows = structuredClone(records); return structuredClone(rows); },
    append: async records => { rows = [...structuredClone(records), ...rows]; return structuredClone(rows); },
    remove: async id => { rows = rows.filter(row => row.id !== id); return structuredClone(rows); },
    clear: async () => { rows = []; }, subscribe: () => () => undefined,
  };
  return { repository, rows: () => structuredClone(rows) };
}
interface Model {
  owner: string;
  readyOwner: string;
  ready: boolean;
  ledger: ReturnType<typeof ledger>;
  tasks: { id: number; title: string; completed: boolean }[];
  mutations: { owner: string; kind: string; text?: string }[];
  captureGate?: ReturnType<typeof deferred<void>>;
  captureFailure?: boolean;
}
const Context = createContext<Model | null>(null);
function useModel() {
  const value = useContext(Context);
  if (!value) throw new Error("Synthetic provider context missing");
  return value;
}
function usePlanning() {
  const model = useModel();
  const record = (kind: string, text?: string) => { model.mutations.push({ owner: model.owner, kind, text }); };
  // Intentionally new functions/objects each render, as with changing context dependencies.
  return {
    createTask: (payload: AtlasTaskCreatePayload) => record("task.create", payload.title),
    updateTask: () => { record("task.update"); return { updated: true, message: "Synthetic" }; },
    completeTask: () => record("task.complete"),
    createGoalWeeklyFocus: () => { record("planning.weekly_focus.create"); return { created: true, message: "Synthetic" }; },
    createPersonalWeeklyFocus: () => { record("planning.weekly_focus.create"); return { created: true, message: "Synthetic" }; },
  };
}

/** The actual hook is transpiled, not reimplemented. Only its provider imports are
 * replaced with real React contexts and in-memory ports. This follows the existing
 * auth-boundary transpile/VM harness pattern, adding an actual React DOM root. */
function loadHook(): typeof useAtlasActions {
  const url = new URL("../../src/atlas/actions/useAtlasActions.ts", import.meta.url);
  const require = createRequire(url);
  const module = { exports: {} as { useAtlasActions: typeof useAtlasActions } };
  const contextModules: Record<string, object> = {
    "../../auth/AuthContext": { useAuth: () => {
      const m = useModel(); return { phase: "signed-in", identity: { userId: m.owner } };
    } },
    "../../data/account/AccountDataContext": { useAccountData: () => {
      const m = useModel(); return { phase: m.ready ? "ready" : "checking", ownerUserId: m.readyOwner,
        services: { executionHistoryRepository: m.ledger.repository } };
    } },
    "../../context/PlanningExecutionContext": { usePlanningExecution: usePlanning },
    "../../context/AppContext": { useApp: () => {
      const m = useModel(); return { addCapture: async (text: string) => {
        m.mutations.push({ owner: m.owner, kind: "capture.create", text });
        if (m.captureFailure) throw new Error("Private synthetic failure detail");
        await m.captureGate?.promise;
      } };
    } },
    "../../context/habitExecutionContextValue": { useHabitExecution: () => {
      const m = useModel(); return {
        createHabit: () => m.mutations.push({ owner: m.owner, kind: "habit.create" }),
        updateHabit: () => m.mutations.push({ owner: m.owner, kind: "habit.update" }),
      };
    } },
    "../../context/TaskContext": { useTasks: () => ({ tasks: useModel().tasks }) },
    "../../context/HabitContext": { useHabits: () => { useModel(); return { habits: [] }; } },
    "../../context/MonthlyPlanningContext": { useMonthlyPlanning: () => { useModel(); return { monthlyPlans: [] }; } },
    "../../context/WeeklyPlanningContext": { useWeeklyPlanning: () => { useModel(); return { weeklyTargets: [] }; } },
    "../../services/ExecutionHistoryService": { ExecutionHistoryService },
    "../providers/ollama/ollamaAtlasActionCandidateProvider.ts": {
      OllamaAtlasActionCandidateProvider: class {
        readonly id = "synthetic-unused-default";
        async generate() { return { status: "unavailable" as const }; }
      },
    },
  };
  runInNewContext(ts.transpileModule(readFileSync(url, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText, {
    module, exports: module.exports, crypto: globalThis.crypto,
    require: (id: string) => contextModules[id] ?? require(id),
  });
  return module.exports.useAtlasActions;
}
const mountedHook = loadHook();
function loadCard(): typeof AtlasActionProposalCard {
  const url = new URL("../../src/components/atlas/AtlasActionProposalCard.tsx", import.meta.url);
  const require = createRequire(url);
  const module = { exports: {} as { default: typeof AtlasActionProposalCard } };
  runInNewContext(ts.transpileModule(readFileSync(url, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText, { module, exports: module.exports, require: (id: string) =>
    id.endsWith("/actionOutcome") ? { atlasOutcomeMessage } :
    id.endsWith("/registry") ? { getConnectorCapabilityForAction } : require(id) });
  return module.exports.default;
}
const MountedCard = loadCard();
const unavailable: AtlasActionCandidateProvider = { id: "synthetic-unavailable", generate: async () => ({ status: "unavailable" }) };

async function harness(provider = unavailable, strict = false) {
  const dom = new JSDOM("<!doctype html><div id='root'></div>", { url: "https://synthetic.invalid" });
  const descriptors = new Map<string, PropertyDescriptor | undefined>();
  for (const [name, value] of Object.entries({ window: dom.window, document: dom.window.document,
    HTMLElement: dom.window.HTMLElement, Node: dom.window.Node, IS_REACT_ACT_ENVIRONMENT: true })) {
    descriptors.set(name, Object.getOwnPropertyDescriptor(globalThis, name));
    Object.defineProperty(globalThis, name, { configurable: true, writable: true, value });
  }
  const errors: unknown[][] = [];
  const previousError = console.error;
  console.error = (...args: unknown[]) => { errors.push(args); };
  const restore = () => {
    console.error = previousError;
    dom.window.close();
    for (const [name, descriptor] of descriptors) {
      if (descriptor) Object.defineProperty(globalThis, name, descriptor);
      else Reflect.deleteProperty(globalThis, name);
    }
  };
  const a = ledger();
  const b = ledger();
  let model: Model = { owner: "synthetic-a", readyOwner: "synthetic-a", ready: true,
    ledger: a, tasks: [], mutations: [] };
  ExecutionHistoryService.configureRepository(a.repository);
  await ExecutionHistoryService.initialize();
  let current!: Controller;
  let renders = 0;
  function Probe() {
    const value = mountedHook(provider);
    useLayoutEffect(() => { current = value; renders++; });
    return createElement("div", null,
      createElement("output", null, `${value.status}:${value.proposal?.id ?? "none"}`),
      createElement("button", { onClick: value.approve }, "Approve"),
      createElement("button", { onClick: value.cancel }, "Cancel"),
      createElement(MountedCard, { proposal: value.proposal, result: value.result,
        executing: value.status === "executing", onApprove: value.approve,
        onCancel: value.cancel, onDismissResult: value.clearResult }));
  }
  const root = createRoot(dom.window.document.getElementById("root")!);
  let mounted = true;
  const render = async () => {
    await act(async () => { root.render(createElement(Context.Provider, { value: model },
      strict ? createElement(StrictMode, null, createElement(Probe)) : createElement(Probe))); });
  };
  try { await render(); } catch (error) {
    try { await act(async () => root.unmount()); }
    finally { ExecutionHistoryService.releaseRepository(model.ledger.repository); restore(); }
    throw error;
  }
  return {
    get current() { return current; }, get model() { return model; }, get renders() { return renders; }, a, b, errors,
    get text() { return dom.window.document.body.textContent ?? ""; },
    async rerender(changes: Partial<Model> = {}) { model = { ...model, ...changes }; await render(); },
    async switchToB(ready = true) {
      ExecutionHistoryService.releaseRepository(a.repository);
      ExecutionHistoryService.configureRepository(b.repository);
      await ExecutionHistoryService.initialize();
      model = { ...model, owner: "synthetic-b", readyOwner: ready ? "synthetic-b" : "synthetic-a", ready, ledger: b };
      await render();
    },
    async switchToA() {
      ExecutionHistoryService.releaseRepository(b.repository);
      ExecutionHistoryService.configureRepository(a.repository);
      await ExecutionHistoryService.initialize();
      model = { ...model, owner: "synthetic-a", readyOwner: "synthetic-a", ready: true, ledger: a };
      await render();
    },
    async approve() { await act(async () => { await current.approve(); }); },
    async interpret(input = "Create a task to study SAT tomorrow") { await act(async () => { await current.interpret(input); }); },
    async unmount() { if (mounted) { await act(async () => root.unmount()); mounted = false; } },
    async clickApproveTwice() {
      await act(async () => {
        const button = dom.window.document.querySelector("button")!;
        button.click(); button.click();
      });
    },
    async close() {
      try {
        await act(async () => { model.captureGate?.resolve(); });
        if (mounted) { await act(async () => root.unmount()); mounted = false; }
        ExecutionHistoryService.releaseRepository(model.ledger.repository);
      } finally {
        restore();
      }
      assert.deepEqual(errors, [], "No React warnings or unexpected errors");
    },
  };
}

test("mounted hook: fallback proposal survives real rerenders and repeated DOM approval clicks", async () => {
  const h = await harness();
  try {
    await h.interpret();
    assert.equal(h.current.status, "pending");
    assert.equal(h.model.mutations.length, 0);
    const id = h.current.proposal!.id;
    await h.rerender(); await h.rerender();
    assert.equal(h.current.proposal!.id, id);
    assert.ok(h.renders >= 4);
    await h.clickApproveTwice();
    assert.equal(h.current.result?.status, "executed");
    assert.equal(h.model.mutations.length, 1);
    assert.equal(h.a.rows().length, 1);
    assert.equal(h.a.rows()[0].xpAwarded, 0);
    await h.rerender(); await h.approve();
    assert.equal(h.model.mutations.length, 1);
  } finally { await h.close(); }
});

test("mounted hook: A completion after B transition cannot publish or execute in B", async () => {
  const gate = deferred<AtlasActionCandidateGenerationResult>();
  const h = await harness({ id: "deferred", generate: () => gate.promise });
  try {
    let pending!: Promise<boolean>;
    await act(async () => { pending = h.current.interpret("Create a task to study SAT tomorrow"); });
    const old = h.current;
    await h.switchToB(false);
    assert.equal(h.current.proposal, null);
    assert.equal(h.current.status, "idle");
    await act(async () => { gate.resolve({ status: "unavailable" }); await pending; await old.approve(); });
    await h.rerender({ readyOwner: "synthetic-b", ready: true });
    assert.equal(h.current.proposal, null);
    await h.approve();
    assert.equal(h.model.mutations.length, 0);
    assert.equal(h.a.rows().length + h.b.rows().length, 0);
  } finally { await h.close(); }
});

test("mounted hook: a valid provider candidate remains non-mutating until human approval", async () => {
  const h = await harness(new DeterministicMockAtlasActionCandidateProvider());
  try {
    await h.interpret();
    assert.equal(h.current.status, "pending");
    assert.equal(h.model.mutations.length, 0);
    await h.approve();
    assert.equal(h.current.result?.status, "executed");
    assert.equal(h.model.mutations.length, 1);
  } finally { await h.close(); }
});

test("mounted hook: out-of-order completions cannot replace the latest request", async () => {
  const first = deferred<AtlasActionCandidateGenerationResult>();
  const second = deferred<AtlasActionCandidateGenerationResult>();
  let calls = 0;
  const h = await harness({ id: "ordered-gates", generate: () => ++calls === 1 ? first.promise : second.promise });
  try {
    let old!: Promise<boolean>;
    let latest!: Promise<boolean>;
    await act(async () => { old = h.current.interpret("Create a task to study SAT tomorrow"); });
    await act(async () => { latest = h.current.interpret("Create a task to study chemistry tomorrow"); });
    await act(async () => { second.resolve({ status: "unavailable" }); await latest; });
    const id = h.current.proposal!.id;
    await act(async () => { first.resolve({ status: "unavailable" }); await old; });
    assert.equal(h.current.proposal!.id, id);
    await h.approve();
    assert.equal(h.model.mutations.length, 1);
    assert.match(h.model.mutations[0].text!, /chemistry/i);
  } finally { first.resolve({ status: "unavailable" }); second.resolve({ status: "unavailable" }); await h.close(); }
});

test("mounted hook: an A proposal and captured approval callback are invalid under B", async () => {
  const h = await harness();
  try {
    await h.interpret(); const approveA = h.current.approve;
    await h.switchToB();
    await act(async () => { await approveA(); });
    assert.equal(h.current.proposal, null);
    assert.equal(h.model.mutations.length, 0);
  } finally { await h.close(); }
});

test("mounted hook: unmount during generation ignores completion and captured callbacks", async () => {
  const gate = deferred<AtlasActionCandidateGenerationResult>();
  const h = await harness({ id: "deferred", generate: () => gate.promise });
  try {
    let pending!: Promise<boolean>;
    await act(async () => { pending = h.current.interpret("Create a task to study SAT tomorrow"); });
    const old = h.current;
    await h.unmount(); const renders = h.renders;
    await act(async () => { gate.resolve({ status: "unavailable" }); await pending; await old.approve(); });
    assert.equal(h.renders, renders);
    assert.equal(h.model.mutations.length, 0);
  } finally { await h.close(); }
});

test("mounted hook: cancellation fences delayed fallback and a fresh request succeeds", async () => {
  const gate = deferred<AtlasActionCandidateGenerationResult>();
  let calls = 0;
  const h = await harness({ id: "deferred-once", generate: async () => ++calls === 1 ? gate.promise : { status: "unavailable" } });
  try {
    let pending!: Promise<boolean>;
    await act(async () => { pending = h.current.interpret("Create a task to study SAT tomorrow"); });
    await act(async () => h.current.cancel());
    await act(async () => { gate.resolve({ status: "unavailable" }); await pending; });
    assert.equal(h.current.proposal, null);
    await h.interpret(); await h.approve();
    assert.equal(h.model.mutations.length, 1);
    assert.equal(h.current.result?.status, "executed");
  } finally { await h.close(); }
});

test("mounted hook: deny-by-default forbidden language never creates an executable proposal", async () => {
  const h = await harness();
  try {
    await h.interpret("Delete all my tasks"); await h.approve();
    assert.equal(h.current.proposal, null);
    assert.equal(h.model.mutations.length, 0);
  } finally { await h.close(); }
});

test("mounted hook: a changed payload cannot reuse the approved fingerprint", async () => {
  const h = await harness();
  try {
    await h.interpret();
    assert.equal(h.current.proposal?.type, "task.create");
    const p = h.current.proposal;
    if (!p || p.type !== "task.create") throw new Error("Expected task fixture");
    p.payload.title = "Changed after review";
    await h.approve();
    assert.equal(h.model.mutations.length, 0);
  } finally { await h.close(); }
});

test("mounted hook: latest committed references reject a deleted target", async () => {
  const h = await harness();
  try {
    await h.rerender({ tasks: [{ id: 7, title: "Synthetic report", completed: false }] });
    await h.interpret("Complete Synthetic report");
    assert.equal(h.current.status, "pending");
    await h.rerender({ tasks: [] }); await h.approve();
    assert.equal(h.current.result?.status, "rejected");
    assert.equal(h.model.mutations.length, 0);
  } finally { await h.close(); }
});

test("mounted hook: StrictMode effect cleanup still permits fresh approved execution", async () => {
  const h = await harness(unavailable, true);
  try {
    await h.interpret(); await h.approve();
    assert.equal(h.current.result?.status, "executed");
    assert.equal(h.model.mutations.length, 1);
    assert.equal(h.a.rows().length, 1);
  } finally { await h.close(); }
});

test("mounted hook: cancellation in the approval turn must not pretend to undo a started operation", async () => {
  const h = await harness();
  try {
    const gate = deferred<void>();
    await h.rerender({ captureGate: gate });
    await act(async () => { h.current.prepare({ type: "capture.create", title: "Synthetic capture", payload: { text: "Synthetic" } }); });
    let pending!: Promise<void>;
    await act(async () => { const beforeCommit = h.current; pending = beforeCommit.approve(); beforeCommit.cancel(); });
    assert.equal(h.current.status, "executing");
    await act(async () => { gate.resolve(); await pending; });
    assert.equal(h.current.result?.status, "executed");
    assert.equal(h.model.mutations.length, 1);
    assert.equal(h.a.rows().length, 1);
  } finally { await h.close(); }
});

test("mounted hook: a started operation completing after same-account unmount retains its audit", async () => {
  const h = await harness();
  try {
    const gate = deferred<void>();
    await h.rerender({ captureGate: gate });
    await act(async () => { h.current.prepare({ type: "capture.create", title: "Synthetic capture", payload: { text: "Synthetic" } }); });
    let pending!: Promise<void>;
    await act(async () => { pending = h.current.approve(); });
    await h.unmount();
    await act(async () => { gate.resolve(); await pending; });
    assert.equal(h.model.mutations.length, 1);
    assert.equal(h.a.rows().length, 1);
  } finally { await h.close(); }
});

test("mounted hook: in-flight ownership survives changed dependencies and captured approval callbacks", async () => {
  const h = await harness();
  try {
    const gate = deferred<void>();
    await h.rerender({ captureGate: gate });
    await act(async () => { h.current.prepare({ type: "capture.create", title: "Synthetic capture", payload: { text: "Synthetic" } }); });
    const approveBeforeRerender = h.current.approve;
    let pending!: Promise<void>;
    await act(async () => { pending = approveBeforeRerender(); });
    await h.rerender(); await h.rerender();
    await act(async () => { await approveBeforeRerender(); await h.current.approve(); });
    assert.equal(h.model.mutations.length, 1);
    assert.equal(h.current.status, "executing");
    await act(async () => { gate.resolve(); await pending; });
    assert.equal(h.current.result?.status, "executed");
    assert.equal(h.a.rows().length, 1);
  } finally { await h.close(); }
});

for (const method of ["clearResult", "dismissIntent"] as const) {
  test(`mounted hook: same-turn ${method} cannot invalidate a started operation`, async () => {
    const h = await harness();
    try {
      const gate = deferred<void>();
      await h.rerender({ captureGate: gate });
      await act(async () => { h.current.prepare({ type: "capture.create", title: "Synthetic capture", payload: { text: "Synthetic" } }); });
      let pending!: Promise<void>;
      await act(async () => { const beforeCommit = h.current; pending = beforeCommit.approve(); beforeCommit[method](); });
      assert.equal(h.current.status, "executing");
      await act(async () => { gate.resolve(); await pending; });
      assert.equal(h.current.result?.status, "executed");
      assert.equal(h.a.rows().length, 1);
    } finally { await h.close(); }
  });
}

test("mounted hook: a started A operation must not append its audit to B's active ledger", async () => {
  const h = await harness();
  try {
    const gate = deferred<void>();
    await h.rerender({ captureGate: gate });
    await act(async () => { h.current.prepare({ type: "capture.create", title: "Synthetic capture", payload: { text: "Synthetic" } }); });
    let pending!: Promise<void>;
    await act(async () => { pending = h.current.approve(); });
    await h.switchToB();
    await h.switchToA(); await h.switchToB();
    await act(async () => { gate.resolve(); await pending; });
    assert.equal(h.current.result, null);
    assert.equal(h.b.rows().length, 0);
    assert.equal(h.model.mutations.filter(m => m.owner === "synthetic-b").length, 0);
  } finally { await h.close(); }
});

test("mounted recovery: audit failure preserves acknowledged operation and warns separately", async () => {
  const h = await harness();
  try {
    h.a.repository.append = async () => { throw new Error("Private synthetic failure detail"); };
    await h.interpret(); await h.approve();
    assert.equal(h.current.result?.status, "executed");
    assert.equal(h.current.outcome?.operation.status, "succeeded");
    assert.equal(h.current.outcome?.audit.status, "unconfirmed");
    assert.match(h.text, /Action acknowledged · audit unconfirmed/);
    assert.doesNotMatch(h.text, /Private synthetic|Action could not be completed/);
    assert.equal(h.model.mutations.length, 1);
    await h.approve(); assert.equal(h.model.mutations.length, 1);
  } finally { await h.close(); }
});

test("mounted recovery: post-dispatch exception is unknown and repeated approval cannot replay it", async () => {
  const h = await harness();
  try {
    await h.rerender({ captureFailure: true });
    await act(async () => { h.current.prepare({ type: "capture.create", title: "Synthetic capture", payload: { text: "Synthetic" } }); });
    const approve = h.current.approve;
    await act(async () => { await approve(); await approve(); });
    assert.equal(h.current.result?.status, "unknown");
    assert.equal(h.current.outcome?.operation.status, "unknown");
    assert.match(h.text, /Action outcome unknown/);
    assert.match(h.text, /Do not repeat it automatically/);
    assert.equal(h.model.mutations.length, 1); assert.equal(h.a.rows().length, 0);
    assert.doesNotMatch(JSON.stringify(h.current.result), /Private synthetic/);
  } finally { await h.close(); }
});

test("mounted recovery: account switch while audit is pending cannot publish into B", async () => {
  const h = await harness(); const gate = deferred<void>();
  let pending: Promise<void> | undefined;
  try {
    const append = h.a.repository.append;
    h.a.repository.append = async rows => { await gate.promise; return append(rows); };
    await h.interpret();
    await act(async () => { pending = h.current.approve(); });
    assert.equal(h.current.outcome?.operation.status, "succeeded");
    assert.equal(h.current.outcome?.audit.status, "pending");
    await h.switchToB();
    await h.switchToA(); await h.switchToB();
    await act(async () => { gate.resolve(); await pending; });
    assert.equal(h.current.result, null); assert.equal(h.current.outcome, null);
    assert.doesNotMatch(h.text, /Action acknowledged|audit unconfirmed/);
    assert.equal(h.b.rows().length, 0); assert.equal(ExecutionHistoryService.getAll().length, 0);
  } finally { gate.resolve(); if (pending) await act(async () => { await pending; }); await h.close(); }
});

test("mounted recovery: confirmed audit survives subsequent hook unmount", async () => {
  const h = await harness();
  try {
    await h.interpret(); await h.approve();
    assert.equal(h.current.outcome?.audit.status, "confirmed");
    assert.match(h.text, /local audit repository confirmed its record/);
    await h.unmount();
    assert.equal(h.a.rows().length, 1); assert.equal(h.a.rows()[0].xpAwarded, 0);
  } finally { await h.close(); }
});
