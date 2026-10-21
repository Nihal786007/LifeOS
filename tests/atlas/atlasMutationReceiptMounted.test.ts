import assert from "node:assert/strict";
import test from "node:test";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { runInNewContext } from "node:vm";
import { act, createElement, useLayoutEffect } from "react";
import { createRoot } from "react-dom/client";
import { JSDOM } from "jsdom";
import ts from "typescript";
import { ExecutionHistoryService } from "../../src/services/ExecutionHistoryService.ts";
import type { AsyncExecutionHistoryRepository } from "../../src/data/execution/asyncExecutionHistoryRepository.ts";
import type { AsyncTaskRepository } from "../../src/data/tasks/asyncTaskRepository.ts";
import type { ExecutionRecord } from "../../src/shared/execution.ts";
import type { Task } from "../../src/shared/types.ts";
import type { TaskCreationAcceptance } from "../../src/shared/taskMutation.ts";
import type { useAtlasActions } from "../../src/atlas/actions/useAtlasActions.ts";
import type { usePlanningExecution, PlanningExecutionProvider } from "../../src/context/PlanningExecutionContext.tsx";
import type { useTasks, TaskProvider } from "../../src/context/TaskContext.tsx";
import type AtlasActionProposalCard from "../../src/components/atlas/AtlasActionProposalCard.tsx";

function deferred() { let resolve!: () => void; const promise = new Promise<void>(done => { resolve = done; }); return { promise, resolve }; }

/** Same transpile/VM + createRoot/act approach as existing mounted tests. All
 * canonical Task/Planning code is real; only account/data/other-domain ports are synthetic. */
async function mounted() {
  const dom = new JSDOM("<!doctype html><div id='root'></div>", { url: "https://synthetic.invalid" });
  const descriptors = new Map<string, PropertyDescriptor | undefined>();
  for (const [key, value] of Object.entries({ window: dom.window, document: dom.window.document,
    HTMLElement: dom.window.HTMLElement, Node: dom.window.Node, IS_REACT_ACT_ENVIRONMENT: true })) {
    descriptors.set(key, Object.getOwnPropertyDescriptor(globalThis, key));
    Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
  }
  const errors: unknown[][] = []; const priorError = console.error;
  console.error = (...args: unknown[]) => { errors.push(args); };
  const restore = () => {
    console.error = priorError; dom.window.close();
    for (const [key, descriptor] of descriptors) { if (descriptor) Object.defineProperty(globalThis, key, descriptor); else Reflect.deleteProperty(globalThis, key); }
  };
  let failureCleanup = async () => {};
  try {
  let persisted: Task[] = []; let history: ExecutionRecord[] = []; let taskWrites = 0; let cloudWaits = 0;
  const gate = deferred(); let owner = "synthetic-a";
  const taskRepository: AsyncTaskRepository = {
    initialize: async () => [], readCurrent: async () => structuredClone(persisted),
    replace: async tasks => { taskWrites++; const copy = structuredClone(tasks); await gate.promise; persisted = copy; },
    waitForPersistence: async () => { cloudWaits++; throw new Error("Synthetic transport disconnected"); },
    subscribe: () => () => {},
  };
  const historyRepository: AsyncExecutionHistoryRepository = {
    initialize: async () => [], readCurrent: async () => history, waitForPersistence: async () => {},
    replace: async rows => { history = rows; return history; }, append: async rows => { history = [...rows, ...history]; return history; },
    remove: async () => history, clear: async () => {}, subscribe: () => () => {},
  };
  const bTaskRepository: AsyncTaskRepository = { ...taskRepository, initialize: async () => [], readCurrent: async () => [],
    replace: async () => { throw new Error("Unexpected B mutation"); } };
  const bHistoryRepository: AsyncExecutionHistoryRepository = { ...historyRepository, initialize: async () => [], readCurrent: async () => [],
    append: async () => { throw new Error("Unexpected B audit"); } };
  const base = fileURLToPath(new URL("../../src/", import.meta.url));
  const overrides = new Map<string, object>([
    [resolve(base, "data/DataServicesContext.tsx"), { useDataServices: () => ({ taskRepository: owner === "synthetic-a" ? taskRepository : bTaskRepository }) }],
    [resolve(base, "services/ExecutionHistoryService.ts"), { ExecutionHistoryService }],
    [resolve(base, "auth/AuthContext.tsx"), { useAuth: () => ({ phase: "signed-in", identity: { userId: owner } }) }],
    [resolve(base, "data/account/AccountDataContext.tsx"), { useAccountData: () => ({ phase: "ready", ownerUserId: owner, services: { executionHistoryRepository: owner === "synthetic-a" ? historyRepository : bHistoryRepository } }) }],
    [resolve(base, "context/LifeGoalsContext.tsx"), { useLifeGoals: () => ({ lifeGoals: [] }) }],
    [resolve(base, "context/MonthlyPlanningContext.tsx"), { useMonthlyPlanning: () => ({ monthlyPlans: [] }) }],
    [resolve(base, "context/WeeklyPlanningContext.tsx"), { useWeeklyPlanning: () => ({ weeklyTargets: [], addCalendarWeeklyTarget() {} }) }],
    [resolve(base, "context/PlanningStateContext.tsx"), { usePlanningState: () => ({ replacePlanningState() {} }) }],
    [resolve(base, "context/HabitContext.tsx"), { useHabits: () => ({ habits: [] }) }],
    [resolve(base, "context/HabitExecutionContext.tsx"), { useHabitExecution: () => ({ createHabit() {}, updateHabit() {} }) }],
    [resolve(base, "context/AppContext.tsx"), { useApp: () => ({ addCapture: async () => {} }) }],
    [resolve(base, "atlas/providers/ollama/ollamaAtlasActionCandidateProvider.ts"), { OllamaAtlasActionCandidateProvider: class { readonly id = "unused"; async generate() { return { status: "unavailable" }; } } }],
  ]);
  const cache = new Map<string, { exports: unknown }>();
  const require = createRequire(import.meta.url);
  function load(filename: string): unknown {
    if (overrides.has(filename)) return overrides.get(filename);
    if (cache.has(filename)) return cache.get(filename)!.exports;
    const module = { exports: {} }; cache.set(filename, module);
    runInNewContext(ts.transpileModule(readFileSync(filename, "utf8"), { compilerOptions: {
      module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX,
    } }).outputText, { module, exports: module.exports, crypto: globalThis.crypto, structuredClone,
      console, Date, require: (id: string) => {
        if (!id.startsWith(".")) return require(id);
        const path = resolve(dirname(filename), id);
        const found = [path, `${path}.ts`, `${path}.tsx`].find(p => existsSync(p));
        if (!found) throw new Error("Synthetic module dependency missing");
        return load(found);
      } });
    return module.exports;
  }
  let controller!: ReturnType<typeof useAtlasActions>;
  let planning!: ReturnType<typeof usePlanningExecution>;
  let tasks!: ReturnType<typeof useTasks>;
  let attached = true;
  const task = load(resolve(base, "context/TaskContext.tsx")) as { TaskProvider: typeof TaskProvider; useTasks: typeof useTasks };
  const planningModule = load(resolve(base, "context/PlanningExecutionContext.tsx")) as { PlanningExecutionProvider: typeof PlanningExecutionProvider; usePlanningExecution: typeof usePlanningExecution };
  const hook = load(resolve(base, "atlas/actions/useAtlasActions.ts")) as { useAtlasActions: typeof useAtlasActions };
  const card = load(resolve(base, "components/atlas/AtlasActionProposalCard.tsx")) as { default: typeof AtlasActionProposalCard };
  function Probe() {
    const value = hook.useAtlasActions({ id: "unavailable", generate: async () => ({ status: "unavailable" }) });
    const canonicalTasks = task.useTasks(); const canonicalPlanning = planningModule.usePlanningExecution();
    useLayoutEffect(() => { controller = value; tasks = canonicalTasks; planning = canonicalPlanning; });
    return createElement(card.default, { proposal: value.proposal, result: value.result, executing: value.status === "executing",
      onApprove: value.approve, onCancel: value.cancel, onDismissResult: value.clearResult });
  }
  const root = createRoot(dom.window.document.getElementById("root")!);
  failureCleanup = async () => {
    gate.resolve(); await act(async () => { root.unmount(); });
    ExecutionHistoryService.releaseRepository(historyRepository); ExecutionHistoryService.releaseRepository(bHistoryRepository);
  };
  const render = async () => { await act(async () => { root.render(createElement(task.TaskProvider, { key: owner,
    children: createElement(planningModule.PlanningExecutionProvider, null, createElement(Probe)) })); }); };
  ExecutionHistoryService.configureRepository(historyRepository); await ExecutionHistoryService.initialize();
  await render();
  return {
    get controller() { return controller; }, get tasks() { return tasks.tasks; }, get planning() { return planning; },
    get persisted() { return persisted; }, get writes() { return taskWrites; }, get cloudWaits() { return cloudWaits; },
    get history() { return history; }, get text() { return dom.window.document.body.textContent ?? ""; },
    async create() { await act(async () => { await controller.interpret("Create a task to study SAT tomorrow"); });
      await act(async () => { const approve = controller.approve; await Promise.all([approve(), approve()]); }); },
    async switchOwner() {
      ExecutionHistoryService.releaseRepository(historyRepository);
      ExecutionHistoryService.configureRepository(bHistoryRepository); await ExecutionHistoryService.initialize();
      owner = "synthetic-b"; await render();
    },
    async settle() { await act(async () => { gate.resolve(); await gate.promise; }); },
    async unmount() { await act(async () => { root.unmount(); }); attached = false; },
    async close() {
      try { await act(async () => { gate.resolve(); if (attached) root.unmount(); }); }
      finally {
        ExecutionHistoryService.releaseRepository(historyRepository); ExecutionHistoryService.releaseRepository(bHistoryRepository);
        restore();
      }
      assert.deepEqual(errors, [], "No private logging or React warnings");
    },
  };
  } catch (error) {
    try { await failureCleanup(); } finally { restore(); }
    throw error;
  }
}

test("mounted receipt: real Task/Planning providers accept once before delayed local persistence", async () => {
  const h = await mounted();
  try {
    await h.create();
    assert.equal(h.tasks.length, 1); assert.equal(h.persisted.length, 0); assert.equal(h.writes, 1);
    assert.equal(h.controller.outcome?.operation.status, "succeeded");
    if (h.controller.outcome?.operation.status !== "succeeded") throw new Error("Missing outcome");
    assert.equal(h.controller.outcome.operation.confirmation, "canonical-accepted");
    assert.match(h.text, /Task accepted/); assert.match(h.text, /Local persistence and cloud synchronization are not confirmed/);
    assert.equal(h.history.length, 1); assert.equal(h.history[0].xpAwarded, 0);
    await h.settle(); assert.equal(h.persisted[0].id, h.tasks[0].id);
    assert.equal(h.controller.outcome.operation.confirmation, "canonical-accepted", "Later persistence does not fabricate a stronger receipt");
  } finally { await h.close(); }
});

test("mounted receipt: disconnected synthetic transport does not invent remote confirmation", async () => {
  const h = await mounted();
  try {
    await h.create(); assert.equal(h.cloudWaits, 0); assert.equal(h.persisted.length, 0);
    assert.match(h.text, /cloud synchronization are not confirmed/);
    await h.switchOwner();
    assert.equal(h.controller.outcome, null); assert.equal(h.controller.proposal, null);
    assert.equal(h.tasks.length, 0);
    assert.doesNotMatch(h.text, /Task accepted/);
    await h.settle(); assert.equal(h.controller.result, null);
    assert.equal(h.tasks.length, 0); assert.equal(ExecutionHistoryService.getAll().length, 0);
  } finally { await h.close(); }
});

test("mounted receipt: real canonical engine rejection and retired Task provider cannot issue acceptance", async () => {
  const h = await mounted();
  try {
    let rejected!: TaskCreationAcceptance;
    await act(async () => { rejected = h.planning.createTask({ title: " " }); });
    assert.equal(rejected.status, "rejected"); assert.equal(h.tasks.length, 0); assert.equal(h.writes, 0);
    const oldCreate = h.planning.createTask;
    await h.unmount();
    assert.equal(oldCreate({ title: "Synthetic retired provider" }).status, "rejected");
    assert.equal(h.writes, 0); assert.equal(h.history.length, 0);
  } finally { await h.close(); }
});
