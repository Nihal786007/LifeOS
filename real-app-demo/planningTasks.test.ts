import test, { mock } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';
import { JSDOM } from 'jsdom';
import { act, createElement, StrictMode, useState } from 'react';
import type { ComponentType, ReactNode } from 'react';
import type { AtlasCanonicalState } from '../src/atlas/state/types';
import type { DemoRepositories } from './repository';
import type { usePlanningExecution } from '../src/context/PlanningExecutionContext';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
type Actions = ReturnType<typeof usePlanningExecution>;
type HabitActions = ReturnType<typeof import('../src/context/habitExecutionContextValue').useHabitExecution>;
type FocusPort = import('../src/focus/useFocusSession').FocusSessionController;

// Same explicit service substitutions as Vite; production providers, canonical
// state selector, mutation engines, execution/XP pipeline and page JSX are real.
function loader() {
  const cache = new Map<string, { exports: Record<string, unknown> }>();
  const bindings = new Set(['src/context/AppContext', 'src/auth/AuthContext', 'src/data/account/AccountDataContext', 'src/connectors/googleCalendar/GoogleCalendarContext'].map(path => resolve(root, path)));
  function load(path: string): Record<string, unknown> {
    const cached = cache.get(path); if (cached) return cached.exports;
    const module = { exports: {} as Record<string, unknown> }; cache.set(path, module);
    const localRequire = (id: string): unknown => {
      if (!id.startsWith('.')) return require(id);
      const absolute = resolve(dirname(path), id).replace(/\.tsx?$/, '');
      if (bindings.has(absolute)) return load(resolve(root, 'real-app-demo/bindings.ts'));
      if (absolute === resolve(root, 'src/data/DataServicesContext')) return load(resolve(root, 'real-app-demo/servicesContext.ts'));
      if (/[\\/]src[\\/](auth|data[\\/](cloud|database|account)|atlas[\\/]providers)[\\/]/.test(absolute)) throw new Error('Live service rejected');
      for (const candidate of [absolute + '.ts', absolute + '.tsx']) if (existsSync(candidate)) return load(candidate);
      throw new Error(`Unresolved relative module ${id}`);
    };
    const source = readFileSync(path, 'utf8').replaceAll('import.meta.env.DEV', 'false');
    const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 } }).outputText;
    const sandbox = { module, exports: module.exports, require: localRequire, structuredClone, Date, Error, console, crypto: globalThis.crypto, setTimeout, clearTimeout, queueMicrotask };
    for (const name of ['window', 'document', 'HTMLElement']) Object.defineProperty(sandbox, name, { get: () => Reflect.get(globalThis, name) });
    runInNewContext(output, sandbox);
    return module.exports;
  }
  return load;
}

async function mount() {
  const dom = new JSDOM('<!doctype html><div id="root"></div>', { url: 'https://synthetic.invalid' });
  const descriptors = new Map<string, PropertyDescriptor | undefined>();
  for (const [key, value] of Object.entries({ window: dom.window, document: dom.window.document, HTMLElement: dom.window.HTMLElement, IS_REACT_ACT_ENVIRONMENT: true })) {
    descriptors.set(key, Object.getOwnPropertyDescriptor(globalThis, key)); Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
  }
  // ReactDOM detects input-event support at import time. Initialize it after
  // the disposable DOM exists, rather than selecting its legacy IE event path.
  const { createRoot } = await import('react-dom/client');
  const load = loader();
  const { createDemoSnapshot } = load(resolve(root, 'real-app-demo/fixtures.ts')) as { createDemoSnapshot(): AtlasCanonicalState };
  const seed = createDemoSnapshot();
  const { createDemoRepositories } = load(resolve(root, 'real-app-demo/repository.ts')) as { createDemoRepositories(seed: AtlasCanonicalState): DemoRepositories };
  const repositories = createDemoRepositories(seed);
  const Providers = load(resolve(root, 'real-app-demo/DemoDomainProviders.tsx')).default as ComponentType<{ repositories: DemoRepositories; children?: ReactNode }>;
  const { DemoScopeProvider } = load(resolve(root, 'real-app-demo/DemoScope.tsx')) as { DemoScopeProvider: ComponentType<{ value: { snapshot: AtlasCanonicalState; unavailable(): void }; children?: ReactNode }> };
  const actionsHook = load(resolve(root, 'src/context/PlanningExecutionContext.tsx')).usePlanningExecution as () => Actions;
  const canonicalHook = load(resolve(root, 'src/atlas/state/useAtlasCanonicalState.ts')).useAtlasCanonicalState as () => AtlasCanonicalState;
  const habitHook = load(resolve(root, 'src/context/habitExecutionContextValue.ts')).useHabitExecution as () => HabitActions;
  let habitActions: HabitActions;
  let state: AtlasCanonicalState = seed; let actions: Actions;
  function Probe() { state = canonicalHook(); actions = actionsHook(); habitActions = habitHook(); return null; }
  const reactRoot = createRoot(dom.window.document.getElementById('root')!);
  async function render(page?: 'Tasks' | 'Planning' | 'Habits', extra?: ReactNode) {
    const Page = page ? load(resolve(root, `src/pages/${page}.tsx`)).default as ComponentType<{ onNavigate(): void }> : null;
    await act(async () => reactRoot.render(createElement(StrictMode, null, createElement(DemoScopeProvider, { value: { snapshot: seed, unavailable() {} } }, createElement(Providers, { repositories }, createElement(Probe), Page && createElement(Page, { onNavigate() {} }), extra)))));
  }
  await render();
  return {
    dom, repositories, seed, load, render,
    state: () => state,
    habitAct: async (operation: (actions: HabitActions) => void) => { await act(async () => operation(habitActions)); },
    act: async (operation: (actions: Actions) => void) => { await act(async () => operation(actions)); },
    async close() {
      await act(async () => reactRoot.unmount()); dom.window.close();
      for (const [key, descriptor] of descriptors) { if (descriptor) Object.defineProperty(globalThis, key, descriptor); else Reflect.deleteProperty(globalThis, key); }
    },
  };
}

test('actual providers hydrate coherent goal/month/week/task relationships under StrictMode', async () => {
  const h = await mount(); try {
    const state = h.state(); assert.equal(state.tasks.length, 3); assert.equal(state.lifeGoals.length, 2);
    for (const task of state.tasks) {
      const week = state.weeklyTargets.find(row => row.id === task.weeklyTargetId)!; assert.ok(week);
      const month = state.monthlyTargets.find(row => row.id === week.monthlyTargetId)!; assert.ok(month);
      assert.ok(state.lifeGoals.some(row => row.id === month.goalId));
    }
    assert.equal(state.executionHistory.length, 0);
  } finally { await h.close(); }
});

test('real task execution updates canonical history/XP, memory repositories and uncompletion', async () => {
  const h = await mount(); try {
    await h.act(actions => actions.completeTask(1));
    assert.equal(h.state().tasks.find(row => row.id === 1)?.completed, true);
    assert.equal(h.state().executionHistory.filter(row => row.type === 'task_completed').length, 1);
    assert.equal(h.state().executionHistory.reduce((xp, row) => xp + row.xpAwarded, 0), 25);
    assert.equal((await h.repositories.taskRepository.readCurrent()).find(row => row.id === 1)?.completed, true);
    assert.equal((await h.repositories.executionHistoryRepository.readCurrent()).length, h.state().executionHistory.length);
    await h.act(actions => actions.uncompleteTask(1));
    assert.equal(h.state().tasks.find(row => row.id === 1)?.completed, false);
    assert.ok(h.state().executionHistory.some(row => row.type === 'task_uncompleted'));
    // Existing LifeOS rules retain earned XP on undo and prevent re-awarding it.
    assert.equal(h.state().executionHistory.reduce((xp, row) => xp + row.xpAwarded, 0), 25);
    await h.act(actions => actions.completeTask(1));
    assert.equal(h.state().executionHistory.reduce((xp, row) => xp + row.xpAwarded, 0), 25);
  } finally { await h.close(); }
});

test('real planning commands create and rename a hierarchy and linked task without XP', async () => {
  const h = await mount(); try {
    let goalId = 0;
    await h.act(actions => { const result = actions.createLifeGoal({ title: 'Synthetic integration goal' }); assert.equal(result.created, true); goalId = result.goal!.id; });
    let monthId = 0; const now = new Date();
    await h.act(actions => { const result = actions.createMonthlyOutcome('Synthetic integration month', now.getMonth() + 1, now.getFullYear(), goalId); assert.equal(result.created, true); monthId = result.monthlyTarget!.id; });
    const week = h.seed.weeklyTargets[0];
    await h.act(actions => { assert.equal(actions.createGoalWeeklyFocus('Synthetic integration week', monthId, week.weekStartDate!, week.weekEndDate!).created, true); });
    const newWeek = h.state().weeklyTargets.find(row => row.monthlyTargetId === monthId)!; assert.ok(newWeek);
    let taskId = 0;
    await h.act(actions => { const result = actions.createTask({ title: 'Synthetic integration task', weeklyTargetId: newWeek.id, priority: 'high', dueDate: h.seed.tasks[0].dueDate }); assert.equal(result.status, 'accepted'); if (result.status === 'accepted') taskId = result.taskId; });
    await h.act(actions => { assert.equal(actions.updateTask(taskId, { title: 'Renamed synthetic task' }).updated, true); });
    assert.equal(h.state().tasks.find(row => row.id === taskId)?.title, 'Renamed synthetic task');
    assert.equal(h.state().executionHistory.length, 0);
    const stored = await h.repositories.planningRepository.initialize(); assert.ok(stored.lifeGoals.some(row => row.id === goalId));
  } finally { await h.close(); }
});

test('real mutation validation rejects empty titles and missing relationships without changing data', async () => {
  const h = await mount(); try {
    const before = JSON.stringify(await h.repositories.planningRepository.initialize());
    await h.act(actions => {
      assert.equal(actions.createLifeGoal({ title: '   ' }).created, false);
      assert.equal(actions.createTask({ title: '   ' }).status, 'rejected');
      assert.equal(actions.updateTask(1, { weeklyTargetId: 999999 }).updated, false);
      assert.equal(actions.createGoalWeeklyFocus('Bad parent', 999999, '2026-10-26', '2026-11-01').created, false);
    });
    assert.equal(JSON.stringify(await h.repositories.planningRepository.initialize()), before);
    assert.equal(h.state().tasks.length, 3); assert.equal(h.state().executionHistory.length, 0);
  } finally { await h.close(); }
});

test('actual Tasks page completion and Done filter share state with the real Planning page', async () => {
  const h = await mount(); try {
    await h.render('Tasks');
    const doc = h.dom.window.document;
    const table = doc.querySelector('[role="region"][aria-label="Task table"]')!;
    assert.ok(table.classList.contains('overflow-x-auto'));
    assert.equal(table.getAttribute('tabindex'), '0');
    const complete = doc.querySelector<HTMLButtonElement>('button[aria-label="Complete Test keyboard navigation on the campus map"]')!; assert.ok(complete);
    await act(async () => complete.click());
    assert.equal(h.state().tasks[0].completed, true);
    const done = [...doc.querySelectorAll('button')].find(button => /^Done1$/.test(button.textContent ?? ''))!; assert.ok(done);
    await act(async () => done.click());
    assert.ok(doc.querySelector('button[aria-label="Mark Test keyboard navigation on the campus map incomplete"]'));
    assert.equal(doc.querySelector('button[aria-label="Complete Work through five calculus problems"]'), null);
    await h.render('Planning');
    assert.ok(doc.body.textContent?.includes('Build useful, accessible software'));
    const openGoal = [...doc.querySelectorAll('button')].find(button => button.textContent?.includes('Build useful, accessible software'))!; assert.ok(openGoal);
    await act(async () => openGoal.click());
    assert.ok(doc.body.textContent?.includes('Build an accessible campus map'));
    assert.equal(h.state().tasks[0].completed, true);
  } finally { await h.close(); }
});

test('fresh demo storage resets all changes and never claims durable or cloud persistence', async () => {
  const h = await mount(); try {
    await h.act(actions => actions.completeTask(1));
    const { createDemoRepositories } = h.load(resolve(root, 'real-app-demo/repository.ts')) as { createDemoRepositories(seed: AtlasCanonicalState): DemoRepositories };
    const fresh = createDemoRepositories(h.seed);
    assert.equal((await fresh.taskRepository.readCurrent()).filter(row => row.completed).length, 0);
    assert.equal((await fresh.executionHistoryRepository.readCurrent()).length, 0);
    await assert.rejects(fresh.taskRepository.waitForPersistence(), /memory only/);
    await assert.rejects(fresh.executionHistoryRepository.waitForPersistence!(), /memory only/);
    const rows = await fresh.taskRepository.readCurrent(); rows[0].title = 'Mutated copy';
    assert.notEqual((await fresh.taskRepository.readCurrent())[0].title, 'Mutated copy');
    const auth = h.load(resolve(root, 'real-app-demo/bindings.ts')) as { useAuth(): { identity: unknown }; useAccountData(): { ownerUserId: unknown } };
    assert.equal(auth.useAuth().identity, null); assert.equal(auth.useAccountData().ownerUserId, null);
  } finally { await h.close(); }
});

async function goalDialogHarness() {
  const h = await mount();
  // JSDOM lacks top-layer APIs. Model opening/closing only; real native
  // modality, Escape and keyboard traversal are separately verified in browser.
  h.dom.window.HTMLDialogElement.prototype.showModal = function () {
    this.open = true;
    this.querySelector<HTMLElement>('[autofocus], input, button')?.focus();
  };
  h.dom.window.HTMLDialogElement.prototype.close = function () { this.open = false; };
  await h.render('Planning');
  const doc = h.dom.window.document;
  const trigger = [...doc.querySelectorAll('button')].find(button => button.textContent?.trim() === 'New Goal')!;
  async function open() { trigger.focus(); await act(async () => trigger.click()); return doc.querySelector('dialog')!; }
  return { ...h, doc, trigger, open };
}

test('Goal modal native cancel path closes, restores focus, clears draft and never mutates planning', async () => {
  const h = await goalDialogHarness(); try {
    const before = JSON.stringify(await h.repositories.planningRepository.initialize());
    let dialog = await h.open();
    const title = dialog.querySelector<HTMLInputElement>('input')!;
    assert.equal(h.doc.activeElement, title);
    assert.equal(title.labels?.[0]?.textContent?.trim(), 'Goal Title');
    // Native Escape emits cancel; no creation callback or submit is involved.
    await act(async () => dialog.dispatchEvent(new h.dom.window.Event('cancel', { bubbles: false, cancelable: true })));
    assert.equal(h.doc.querySelector('dialog'), null); assert.equal(h.doc.activeElement, h.trigger);
    dialog = await h.open();
    assert.equal(dialog.querySelector<HTMLInputElement>('input')!.value, '');
    assert.equal(JSON.stringify(await h.repositories.planningRepository.initialize()), before);
    assert.equal(h.state().executionHistory.length, 0);
  } finally { await h.close(); }
});

test('Goal modal Cancel preserves state and cannot invoke creation', async () => {
  const h = await goalDialogHarness(); try {
    const dialog = await h.open();
    const cancel = [...dialog.querySelectorAll('button')].find(button => button.textContent === 'Cancel')!;
    await act(async () => cancel.click());
    assert.equal(h.doc.querySelector('dialog'), null); assert.equal(h.doc.activeElement, h.trigger);
    assert.equal(h.state().lifeGoals.length, 2); assert.equal(h.state().tasks.length, 3);
    assert.equal(h.state().executionHistory.length, 0);
  } finally { await h.close(); }
});

test('real modal wraps Tab/Shift+Tab at its boundaries without submitting', async () => {
  const h = await goalDialogHarness(); try {
    const dialog = await h.open();
    const first = dialog.querySelector<HTMLInputElement>('input')!;
    const last = [...dialog.querySelectorAll('button')].at(-1)!;
    last.focus();
    const tab = new h.dom.window.KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true });
    await act(async () => last.dispatchEvent(tab));
    assert.equal(tab.defaultPrevented, true); assert.equal(h.doc.activeElement, first);
    const back = new h.dom.window.KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true, cancelable: true });
    await act(async () => first.dispatchEvent(back));
    assert.equal(back.defaultPrevented, true); assert.equal(h.doc.activeElement, last);
    assert.equal(h.state().lifeGoals.length, 2); assert.equal(h.state().executionHistory.length, 0);
  } finally { await h.close(); }
});

test('shared modal safely closes when its invoking control disappears', async () => {
  const h = await goalDialogHarness(); try {
    const dialog = await h.open();
    h.trigger.remove();
    await act(async () => dialog.dispatchEvent(new h.dom.window.Event('cancel', { cancelable: true })));
    assert.equal(h.doc.querySelector('dialog'), null);
    assert.equal(h.state().lifeGoals.length, 2); assert.equal(h.state().executionHistory.length, 0);
  } finally { await h.close(); }
});

test('shared Modal preserves legacy callers that do not opt into native dismissal', async () => {
  const h = await mount(); try {
    const Modal = h.load(resolve(root, 'src/components/ui/Modal.tsx')).default as ComponentType<{ open: boolean; title: string; children: ReactNode }>;
    await h.render(undefined, createElement(Modal, { open: true, title: 'Existing dialog', children: 'Existing content' }));
    assert.equal(h.dom.window.document.querySelector('dialog'), null);
    assert.equal(h.dom.window.document.querySelector('[role="dialog"]')?.getAttribute('aria-modal'), 'true');
    assert.ok(h.dom.window.document.body.textContent?.includes('Existing content'));
    await h.render(undefined, createElement(Modal, { open: false, title: 'Existing dialog', children: 'Existing content' }));
    assert.equal(h.dom.window.document.querySelector('[role="dialog"]'), null);
  } finally { await h.close(); }
});

test('nested opt-in Modal cancellation and focus wrapping do not dismiss or submit its parent', async () => {
  const h = await goalDialogHarness(); try {
    const Modal = h.load(resolve(root, 'src/components/ui/Modal.tsx')).default as ComponentType<{ open: boolean; title: string; children: ReactNode; onClose(): void }>;
    function Layers() {
      const [parent, setParent] = useState(false); const [child, setChild] = useState(false);
      return createElement('div', null,
        createElement('button', { onClick: () => setParent(true) }, 'Open parent'),
        createElement(Modal, { open: parent, title: 'Parent', onClose: () => setParent(false), children:
          createElement('div', null, createElement('button', { onClick: () => setChild(true) }, 'Open child'),
            createElement(Modal, { open: child, title: 'Child', onClose: () => setChild(false), children: createElement('button', null, 'Child control') })) }));
    }
    await h.render(undefined, createElement(Layers));
    const opener = h.doc.querySelector<HTMLButtonElement>('button')!; opener.focus();
    await act(async () => opener.click());
    const childOpener = [...h.doc.querySelectorAll('button')].find(button => button.textContent === 'Open child')!; childOpener.focus();
    await act(async () => childOpener.click());
    const child = h.doc.querySelector('dialog dialog')!; assert.ok(child);
    const control = child.querySelector<HTMLButtonElement>('button')!; control.focus();
    await act(async () => control.dispatchEvent(new h.dom.window.KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true })));
    assert.equal(h.doc.activeElement, control);
    await act(async () => child.dispatchEvent(new h.dom.window.Event('cancel', { bubbles: true, cancelable: true })));
    assert.equal(h.doc.querySelectorAll('dialog').length, 1); assert.equal(h.doc.activeElement, childOpener);
    const parent = h.doc.querySelector('dialog')!;
    await act(async () => parent.dispatchEvent(new h.dom.window.Event('cancel', { cancelable: true })));
    assert.equal(h.doc.querySelector('dialog'), null); assert.equal(h.doc.activeElement, opener);
    assert.equal(h.state().lifeGoals.length, 2); assert.equal(h.state().executionHistory.length, 0);
  } finally { await h.close(); }
});

test('real Habits creates schedules and memory reads remain independent', async () => {
  const h=await mount(); try {
    await h.habitAct(a=>a.createHabit({name:'Synthetic reading practice',activeDays:['monday','tuesday','wednesday','thursday','friday','saturday','sunday'],startDate:h.seed.tasks[0].dueDate!}));
    assert.equal(h.state().habitDefinitions.length,3);
    const stored=await h.repositories.habitRepository.initialize();assert.equal(stored.habits.length,3);
    stored.habits[0].name='Changed copy';assert.notEqual((await h.repositories.habitRepository.initialize()).habits[0].name,'Changed copy');
    assert.equal(h.state().executionHistory.length,0);
  }finally{await h.close();}
});
test('real Habit completion is exact-date, idempotent, shared and zero XP',async()=>{
  const h=await mount();try{
    const date=h.seed.tasks[0].dueDate!;
    await h.habitAct(a=>a.completeHabit(401,date));await h.habitAct(a=>a.completeHabit(401,date));
    assert.equal(h.state().habitCompletions.length,1);assert.equal(h.state().executionHistory.length,1);
    assert.equal(h.state().executionHistory[0].xpAwarded,0);assert.equal((await h.repositories.habitRepository.initialize()).completions.length,1);
    await h.habitAct(a=>a.uncompleteHabit(401,date));assert.equal(h.state().habitCompletions.length,0);assert.equal(h.state().executionHistory.length,2);
    assert.equal(h.state().executionHistory.reduce((sum,r)=>sum+r.xpAwarded,0),0);
  }finally{await h.close();}
});
test('real Habit archive/restore preserves history and real monthly/weekly controls render',async()=>{
  const h=await mount();try{
    const date=h.seed.tasks[0].dueDate!;
    await h.habitAct(a=>a.completeHabit(401,date));await h.habitAct(a=>a.archiveHabit(401));
    assert.equal(h.state().habitDefinitions.find(x=>x.id===401)?.archived,true);assert.equal(h.state().habitCompletions.length,1);
    await h.habitAct(a=>a.restoreHabit(401));assert.equal(h.state().habitDefinitions.find(x=>x.id===401)?.archived,false);
    const before=h.state().executionHistory.length;await h.habitAct(a=>a.completeHabit(999999,date));assert.equal(h.state().executionHistory.length,before);
    await h.render('Habits');assert.ok(h.dom.window.document.body.textContent?.includes('Monthly'));
    assert.ok([...h.dom.window.document.querySelectorAll<HTMLButtonElement>('button[title="Future scheduled day"]')].every(b=>b.disabled));
  }finally{await h.close();}
});
function focusAdapter(h:Awaited<ReturnType<typeof mount>>,now:()=>number){
  const Controller=h.load(resolve(root,'real-app-demo/focusController.ts')).DemoFocusController as typeof import('./focusController').DemoFocusController;
  return new Controller(h.state().tasks,h.repositories.executionHistoryRepository,now,()=>crypto.randomUUID());
}
test('Focus real pause-aware timing records exactly one zero-XP event without Task completion',async()=>{
  const h=await mount();try{
    let now=Date.now();const c=focusAdapter(h,()=>now);c.start(1);const id=c.getSnapshot().session!.sessionId;c.start(2);assert.equal(c.getSnapshot().session!.sessionId,id);
    now+=10000;c.pause();now+=20000;c.tick();assert.equal(c.getSnapshot().elapsedMs,10000);c.resume();now+=5000;
    await act(async()=>{await Promise.all([c.end(),c.end()]);});
    assert.equal(c.getSnapshot().outcome?.durationMs,15000);assert.equal(h.state().executionHistory.length,1);assert.equal(h.state().executionHistory[0].xpAwarded,0);assert.equal(h.state().tasks[0].completed,false);
    await act(async()=>{await c.end();});assert.equal(h.state().executionHistory.length,1);assert.equal((await h.repositories.executionHistoryRepository.readCurrent()).length,1);
  }finally{await h.close();}
});
test('Focus rejects invalid/completed tasks and invalidates a removed canonical task',async()=>{
  const h=await mount();try{
    const c=focusAdapter(h,Date.now);c.start(99999);assert.equal(c.getSnapshot().session,null);
    c.setTasks(h.state().tasks.map(t=>({...t,completed:true})));c.start(1);assert.equal(c.getSnapshot().session,null);
    c.setTasks(h.state().tasks);c.start(1);c.setTasks(h.state().tasks.filter(t=>t.id!==1));assert.equal(c.getSnapshot().session,null);assert.equal(h.state().executionHistory.length,0);
  }finally{await h.close();}
});
test('failed Focus audit acknowledgement keeps session open without a success claim',async()=>{
  const h=await mount();try{
    let now=Date.now();const c=focusAdapter(h,()=>now);c.start(1);now+=10000;h.repositories.executionHistoryRepository.append=async()=>{throw Error('Synthetic append failure');};
    await act(async()=>{await c.end();});assert.ok(c.getSnapshot().session);assert.equal(c.getSnapshot().outcome,null);assert.match(c.getSnapshot().error!,/Synthetic append failure/);assert.equal(h.state().executionHistory.length,0);
  }finally{await h.close();}
});
test('Focus cannot write into a replacement repository or publish after deactivation',async()=>{
  const h=await mount();const Service=h.load(resolve(root,'src/services/ExecutionHistoryService.ts')).ExecutionHistoryService as typeof import('../src/services/ExecutionHistoryService').ExecutionHistoryService;
  try{
    let now=Date.now();const c=focusAdapter(h,()=>now);c.start(1);now+=1000;
    const other={...h.repositories.executionHistoryRepository,initialize:async()=>[],append:async()=>{throw Error('Foreign repository must not be called');}};
    Service.configureRepository(other);await Service.initialize();await c.end();assert.equal(c.getSnapshot().outcome,null);assert.match(c.getSnapshot().error!,/scope/);assert.equal(Service.getAll().length,0);
    Service.releaseRepository(other);Service.configureRepository(h.repositories.executionHistoryRepository);await Service.initialize();c.deactivate();const before=c.getSnapshot();await c.end();assert.equal(c.getSnapshot(),before);
  }finally{await h.close();}
});
async function focusHarness(){
  const h=await goalDialogHarness();const useController=h.load(resolve(root,'real-app-demo/useDemoFocusSession.ts')).useDemoFocusSession as ()=>FocusPort;
  const Focus=h.load(resolve(root,'src/focus/FocusMode.tsx')).default as ComponentType<{controller:FocusPort;orchestrator:unknown;initialTaskId:number;onExit():void;onContinue():void}>;
  const Orchestrator=h.load(resolve(root,'src/atlas/orchestration/AtlasAIOrchestrator.ts')).AtlasAIOrchestrator as new(p:unknown)=>unknown;
  const orchestrator=new Orchestrator({descriptor:{id:'synthetic-unavailable',kind:'local',displayName:'Unavailable'},reason:async()=>{throw Error('No provider');}});let controller:FocusPort;
  function View(){controller=useController();return createElement(Focus,{controller,orchestrator,initialTaskId:1,onExit(){},onContinue(){}});}
  await h.render(undefined,createElement(View));
  const click=async(text:string)=>{const b=[...h.doc.querySelectorAll('button')].find(b=>b.textContent?.trim()===text);assert.ok(b,text);await act(async()=>b.click());};
  return {...h,controller:()=>controller,click};
}
test('mounted real Focus cancellation preserves the session and repeated confirmation records once',async()=>{
  let now=Date.now();const clock=mock.method(Date,'now',()=>now);const h=await focusHarness();try{
    await h.click('Start Focus');now+=12000;await h.click('Pause');await h.click('End Session');const dialog=h.doc.querySelector('dialog')!;assert.ok(dialog.open);
    await act(async()=>dialog.dispatchEvent(new h.dom.window.Event('cancel',{bubbles:true,cancelable:true})));assert.equal(h.doc.querySelector('dialog'),null);assert.equal(h.state().executionHistory.length,0);
    await h.click('End Session');await act(async()=>h.doc.querySelector('dialog')!.dispatchEvent(new h.dom.window.MouseEvent('mousedown',{bubbles:true})));assert.equal(h.doc.querySelector('dialog'),null);assert.equal(h.state().executionHistory.length,0);
    await h.click('End Session');const confirm=[...h.doc.querySelectorAll('dialog button')].find(b=>b.textContent==='End Session') as HTMLButtonElement;
    await act(async()=>{confirm.click();confirm.click();});assert.equal(h.state().executionHistory.length,1);assert.ok(h.doc.body.textContent?.includes('Session recorded'));
    await h.click('Keep Task Open');assert.equal(h.state().tasks[0].completed,false);assert.equal(h.controller().outcome,null);
  }finally{await h.close();clock.mock.restore();}
});
test('mounted real Focus completes the canonical Task only after separate explicit choice',async()=>{
  let now=Date.now();const clock=mock.method(Date,'now',()=>now);const h=await focusHarness();try{
    await h.click('Start Focus');now+=5000;await h.click('End Session');const confirm=[...h.doc.querySelectorAll('dialog button')].find(b=>b.textContent==='End Session') as HTMLButtonElement;await act(async()=>confirm.click());
    assert.equal(h.state().tasks[0].completed,false);await h.click('Complete Task');assert.equal(h.state().tasks[0].completed,true);assert.equal(h.state().executionHistory.filter(r=>r.type==='task_completed').length,1);assert.equal(h.state().executionHistory.reduce((sum,r)=>sum+r.xpAwarded,0),25);
  }finally{await h.close();clock.mock.restore();}
});

test('late Focus audit may finish in its own memory ledger but cannot publish after unmount',async()=>{
  const h=await mount();try{
    let now=Date.now();const c=focusAdapter(h,()=>now);const original=h.repositories.executionHistoryRepository.append;
    let release!:()=>void;const barrier=new Promise<void>(resolve=>{release=resolve;});
    h.repositories.executionHistoryRepository.append=async rows=>{await barrier;return original(rows);};
    c.start(1);now+=1000;const before=c.getSnapshot();
    await act(async()=>{const pending=c.end();c.deactivate();release();await pending;});
    assert.equal(c.getSnapshot(),before);assert.equal(h.state().executionHistory.length,1);assert.equal(h.state().executionHistory[0].xpAwarded,0);
    const fresh=createElement('span');await h.render(undefined,fresh);
    const make=h.load(resolve(root,'real-app-demo/repository.ts')).createDemoRepositories as typeof import('./repository').createDemoRepositories;
    const reset=make(h.seed);assert.equal((await reset.habitRepository.initialize()).completions.length,0);assert.equal((await reset.executionHistoryRepository.initialize()).length,0);
  }finally{await h.close();}
});
