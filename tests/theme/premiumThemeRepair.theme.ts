import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { runInNewContext } from 'node:vm';
import { execFileSync } from 'node:child_process';
import { act, createElement } from 'react';
import type { ComponentType, ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import type { JSDOM } from 'jsdom';
import ts from 'typescript';
import type { AtlasCanonicalState } from '../../src/atlas/state/types';
import type { usePlanningExecution } from '../../src/context/PlanningExecutionContext';
import type { useHabitExecution } from '../../src/context/habitExecutionContextValue';
import type { useXP } from '../../src/context/xpContextValue';
import type { useAchievements } from '../../src/context/achievementContextValue';
import type { DemoRepositories } from '../../real-app-demo/repository';
import type { Task } from '../../src/shared/types';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
type Harness = {
  dom: JSDOM; seed: AtlasCanonicalState; repositories: DemoRepositories;
  load(path: string): Record<string, unknown>;
  render(page?: 'Tasks' | 'Planning' | 'Habits', extra?: ReactNode): Promise<void>;
  state(): AtlasCanonicalState;
  act(operation: (actions: ReturnType<typeof usePlanningExecution>) => void): Promise<void>;
  habitAct(operation: (actions: ReturnType<typeof useHabitExecution>) => void): Promise<void>;
  close(): Promise<void>;
};

// Reuse the established mounted harness without importing/registering its tests.
// The original service rejection rules and genuine providers remain intact.
const harnessPath = resolve(root, 'real-app-demo/planningTasks.test.ts');
const parsed = ts.createSourceFile(harnessPath, readFileSync(harnessPath, 'utf8'), ts.ScriptTarget.Latest, true);
const declarations = parsed.statements.filter(node => !(ts.isExpressionStatement(node) && ts.isCallExpression(node.expression) && node.expression.expression.getText(parsed) === 'test'));
let harnessSource = ts.createPrinter().printFile(ts.factory.updateSourceFile(parsed, declarations));
harnessSource = harnessSource.replaceAll('import.meta.url', JSON.stringify(pathToFileURL(harnessPath).href))
  .replace(/const require = createRequire\([^;]+;/, 'const harnessRequire = externalRequire;')
  .replaceAll('return require(id);', 'return harnessRequire(id);')
  .replace("['window', 'document', 'HTMLElement']", "['window', 'document', 'HTMLElement', 'localStorage']") + '\nexport { mount };\n';
const output = ts.transpileModule(harnessSource, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 } }).outputText;
const harnessModule = { exports: {} as { mount(): Promise<Harness> } };
const projectRequire = createRequire(resolve(root, 'package.json'));
runInNewContext(output, { module: harnessModule, exports: harnessModule.exports, require: projectRequire, externalRequire: projectRequire, globalThis, Date, Error, console, structuredClone, crypto: globalThis.crypto, setTimeout, clearTimeout, queueMicrotask, Reflect });
const mount = harnessModule.exports.mount;
function component(h: Harness, file: string) { return h.load(resolve(root, file)).default as ComponentType<Record<string, unknown>>; }
function button(h: Harness, text: string) { const found = [...h.dom.window.document.querySelectorAll('button')].find(e => e.textContent?.trim() === text); assert.ok(found, text); return found; }
function input(h: Harness) { const found = h.dom.window.document.querySelector<HTMLInputElement>('input[placeholder="What needs to be done?"]'); assert.ok(found); return found; }
async function enter(h: Harness, element: HTMLInputElement | HTMLSelectElement, value: string) {
  const prototype = element.tagName === 'SELECT' ? h.dom.window.HTMLSelectElement.prototype : h.dom.window.HTMLInputElement.prototype;
  Object.getOwnPropertyDescriptor(prototype, 'value')!.set!.call(element, value);
  await act(async () => { element.dispatchEvent(new h.dom.window.Event(element.tagName === 'SELECT' ? 'change' : 'input', { bubbles: true })); });
}

test('Task edit reset initializes every field before commit and rerenders preserve the draft', async () => {
  const h = await mount(); try {
    const Form = component(h, 'src/components/planning/TaskModal.tsx'); const task = { ...h.seed.tasks[0], description: 'Synthetic context' };
    const props = { open: true, task, onClose() {} }; const before = JSON.stringify(h.state());
    await h.render(undefined, createElement(Form, props)); assert.equal(input(h).value, task.title);
    assert.equal(h.dom.window.document.querySelector('textarea')?.value, task.description);
    assert.equal(h.dom.window.document.querySelector<HTMLInputElement>('input[type="date"]')?.value, task.dueDate);
    assert.equal(h.dom.window.document.querySelector('select')?.value, task.priority);
    assert.equal(h.dom.window.document.querySelectorAll('select')[1]?.value, String(task.weeklyTargetId));
    await enter(h, input(h), 'Unsaved draft'); await h.render(undefined, createElement(Form, props));
    assert.equal(input(h).value, 'Unsaved draft'); assert.equal(JSON.stringify(h.state()), before);
  } finally { await h.close(); }
});

test('Task reference change replaces old fields and clears old validation without a mutation', async () => {
  const h = await mount(); try {
    const Form = component(h, 'src/components/planning/TaskModal.tsx'); const before = JSON.stringify(h.state());
    await h.render(undefined, createElement(Form, { open: true, task: h.seed.tasks[0], onClose() {} }));
    await enter(h, input(h), ''); await act(async () => button(h, 'Save Changes').click());
    assert.match(h.dom.window.document.body.textContent!, /Task title cannot be empty/);
    await h.render(undefined, createElement(Form, { open: true, task: h.seed.tasks[1], onClose() {} }));
    assert.equal(input(h).value, h.seed.tasks[1].title); assert.doesNotMatch(h.dom.window.document.body.textContent!, /Task title cannot be empty/);
    assert.equal(JSON.stringify(h.state()), before);
  } finally { await h.close(); }
});

test('Task close/reopen clears draft and applies the existing create defaults', async () => {
  const h = await mount(); try {
    const Form = component(h, 'src/components/planning/TaskModal.tsx'); let closes = 0;
    const props = { open: true, defaultDueDate: '2026-10-31', defaultWeeklyTargetId: 301, onClose() { closes++; } };
    await h.render(undefined, createElement(Form, props)); await enter(h, input(h), 'Discard me');
    await act(async () => button(h, 'Cancel').click()); assert.equal(closes, 1);
    await h.render(undefined, createElement(Form, { ...props, open: false }));
    await h.render(undefined, createElement(Form, props)); assert.equal(input(h).value, '');
    assert.equal(h.dom.window.document.querySelector<HTMLInputElement>('input[type="date"]')?.value, '2026-10-31');
    assert.equal(h.dom.window.document.querySelectorAll('select')[1]?.value, '301'); assert.equal(h.state().tasks.length, 3); assert.equal(h.state().executionHistory.length, 0);
  } finally { await h.close(); }
});

test('Task default date/week changes while open reset exactly as the former effect did', async () => {
  const h = await mount(); try {
    const Form = component(h, 'src/components/planning/TaskModal.tsx');
    await h.render(undefined, createElement(Form, { open: true, defaultDueDate: '2026-10-30', defaultWeeklyTargetId: 301, onClose() {} }));
    await enter(h, input(h), 'Old default draft');
    await h.render(undefined, createElement(Form, { open: true, defaultDueDate: '2026-10-31', defaultWeeklyTargetId: 302, onClose() {} }));
    assert.equal(input(h).value, ''); assert.equal(h.dom.window.document.querySelector<HTMLInputElement>('input[type="date"]')?.value, '2026-10-31');
    assert.equal(h.dom.window.document.querySelectorAll('select')[1]?.value, '302'); assert.equal(h.state().executionHistory.length, 0);
  } finally { await h.close(); }
});

test('Task prop changes while closed render no form and the next open selects only the new Task', async () => {
  const h = await mount(); try {
    const Form = component(h, 'src/components/planning/TaskModal.tsx');
    await h.render(undefined, createElement(Form, { open: false, task: h.seed.tasks[0], onClose() {} }));
    await h.render(undefined, createElement(Form, { open: false, task: h.seed.tasks[1], onClose() {} }));
    assert.equal(h.dom.window.document.querySelector('input'), null);
    await h.render(undefined, createElement(Form, { open: true, task: h.seed.tasks[1], onClose() {} }));
    assert.equal(input(h).value, h.seed.tasks[1].title); assert.equal(h.state().tasks.length, 3);
  } finally { await h.close(); }
});

test('Task save remains bound to the reviewed Task and updates only through the canonical provider', async () => {
  const h = await mount(); try {
    const Form = component(h, 'src/components/planning/TaskModal.tsx'); const task: Task = h.seed.tasks[1];
    await h.render(undefined, createElement(Form, { open: true, task, onClose() {} }));
    await enter(h, input(h), 'Renamed exact synthetic Task'); await act(async () => button(h, 'Save Changes').click());
    assert.equal(h.state().tasks.find(row => row.id === task.id)?.title, 'Renamed exact synthetic Task');
    assert.equal(h.state().tasks.find(row => row.id === 1)?.title, h.seed.tasks[0].title);
    assert.equal(h.state().executionHistory.reduce((n, row) => n + row.xpAwarded, 0), 0);
  } finally { await h.close(); }
});

test('Monthly locked Goal transitions update the context while preserving the title draft', async () => {
  const h = await mount(); try {
    const Form = component(h, 'src/components/planning/MonthlyTargetModal.tsx'); const props = { open: true, month: 10, year: 2026, lockedGoalId: 101, onClose() {} };
    await h.render(undefined, createElement(Form, props)); const field = h.dom.window.document.querySelector<HTMLInputElement>('input')!;
    await enter(h, field, 'Monthly draft'); await h.render(undefined, createElement(Form, { ...props, lockedGoalId: 102 }));
    assert.equal(h.dom.window.document.querySelector('input')?.value, 'Monthly draft');
    assert.match(h.dom.window.document.body.textContent!, /Learn with intention/); assert.equal(h.dom.window.document.querySelector('select'), null);
    assert.equal(h.state().executionHistory.length, 0); assert.equal(h.state().monthlyTargets.length, 2);
  } finally { await h.close(); }
});

test('Monthly unlocked selection survives ordinary rerenders and resets when its lock is removed', async () => {
  const h = await mount(); try {
    const Form = component(h, 'src/components/planning/MonthlyTargetModal.tsx'); const props = { open: true, month: 10, year: 2026, onClose() {} };
    await h.render(undefined, createElement(Form, props)); await enter(h, h.dom.window.document.querySelector('select')!, '102');
    await h.render(undefined, createElement(Form, props)); assert.equal(h.dom.window.document.querySelector('select')?.value, '102');
    await h.render(undefined, createElement(Form, { ...props, lockedGoalId: 101 })); await h.render(undefined, createElement(Form, props));
    assert.equal(h.dom.window.document.querySelector('select')?.value, ''); assert.equal(h.state().monthlyTargets.length, 2);
  } finally { await h.close(); }
});

test('Monthly external close/reopen preserves the existing title lifetime and resets optional Goal', async () => {
  const h = await mount(); try {
    const Form = component(h, 'src/components/planning/MonthlyTargetModal.tsx'); const props = { open: true, month: 10, year: 2026, onClose() {} };
    await h.render(undefined, createElement(Form, props)); await enter(h, h.dom.window.document.querySelector('input')!, 'Parent-owned draft'); await enter(h, h.dom.window.document.querySelector('select')!, '102');
    await h.render(undefined, createElement(Form, { ...props, open: false })); await h.render(undefined, createElement(Form, props));
    assert.equal(h.dom.window.document.querySelector('input')?.value, 'Parent-owned draft'); assert.equal(h.dom.window.document.querySelector('select')?.value, '');
  } finally { await h.close(); }
});

test('Monthly Cancel clears draft/validation and cannot create a planning record', async () => {
  const h = await mount(); try {
    const Form = component(h, 'src/components/planning/MonthlyTargetModal.tsx'); let closed = 0; const props = { open: true, month: 10, year: 2026, onClose() { closed++; } };
    await h.render(undefined, createElement(Form, props)); await act(async () => button(h, 'Plan Month').click());
    assert.match(h.dom.window.document.body.textContent!, /Please enter a Monthly Outcome/);
    await enter(h, h.dom.window.document.querySelector('input')!, 'Discarded month'); await act(async () => button(h, 'Cancel').click());
    await h.render(undefined, createElement(Form, { ...props, open: false })); await h.render(undefined, createElement(Form, props));
    assert.equal(closed, 1); assert.equal(h.dom.window.document.querySelector('input')?.value, ''); assert.doesNotMatch(h.dom.window.document.body.textContent!, /Please enter a Monthly Outcome/);
    assert.equal(h.state().monthlyTargets.length, 2); assert.equal(h.state().executionHistory.length, 0);
  } finally { await h.close(); }
});

test('Monthly Habit selection falls back before commit and does not revive an archived selection', async () => {
  const h = await mount(); try {
    const Calendar = component(h, 'src/components/habits/MonthlyHabitCalendar.tsx'); await h.render(undefined, createElement(Calendar));
    await act(async () => button(h, 'Take a walk').click()); assert.match(button(h, 'Take a walk').className, /border-lifeos-accent/);
    await h.habitAct(actions => actions.archiveHabit(402)); assert.equal([...h.dom.window.document.querySelectorAll('button')].some(b => b.textContent === 'Take a walk'), false);
    assert.match(button(h, 'Read for twenty minutes').className, /border-lifeos-accent/);
    await h.habitAct(actions => actions.restoreHabit(402)); assert.match(button(h, 'Read for twenty minutes').className, /border-lifeos-accent/);
    assert.doesNotMatch(button(h, 'Take a walk').className, /border-lifeos-accent/);
    assert.equal(h.state().executionHistory.reduce((n, row) => n + row.xpAwarded, 0), 0);
  } finally { await h.close(); }
});

test('Monthly Habit empty/restore transition preserves completions and chosen calendar month', async () => {
  const h = await mount(); try {
    const Calendar = component(h, 'src/components/habits/MonthlyHabitCalendar.tsx'); await h.render(undefined, createElement(Calendar));
    await h.habitAct(actions => actions.completeHabit(401, h.seed.tasks[0].dueDate!));
    await act(async () => button(h, '← Previous').click()); const month = h.dom.window.document.querySelector('h2')!.textContent;
    await h.habitAct(actions => { actions.archiveHabit(401); }); await h.habitAct(actions => { actions.archiveHabit(402); });
    assert.match(h.dom.window.document.body.textContent!, /No Active Habits/);
    await h.habitAct(actions => actions.restoreHabit(401)); assert.equal(h.dom.window.document.querySelector('h2')!.textContent, month);
    assert.equal(h.state().habitCompletions.length, 1); assert.equal(h.state().executionHistory.reduce((n, row) => n + row.xpAwarded, 0), 0);
  } finally { await h.close(); }
});

test('XP provider and extracted hook share one ledger-derived context with no repeated award', async () => {
  const h = await mount(); try {
    const Provider = h.load(resolve(root, 'src/context/XPContext.tsx')).XPProvider as ComponentType<{ children?: ReactNode }>;
    const hook = h.load(resolve(root, 'src/context/xpContextValue.ts')).useXP as typeof useXP;
    let total = -1; function Probe() { total = hook().totalXP; return null; }
    await h.render(undefined, createElement(Provider, null, createElement(Probe))); assert.equal(total, 0);
    await h.act(actions => actions.completeTask(1)); assert.equal(total, 25);
    await h.act(actions => actions.uncompleteTask(1)); await h.act(actions => actions.completeTask(1)); assert.equal(total, 25);
    await h.render(); await h.render(undefined, createElement(Provider, null, createElement(Probe))); assert.equal(total, 25);
  } finally { await h.close(); }
});

test('Extracted context hooks retain their missing-provider guards', async () => {
  const h = await mount(); try {
    for (const [file, name] of [['xpContextValue', 'useXP'], ['achievementContextValue', 'useAchievements'], ['habitExecutionContextValue', 'useHabitExecution']]) {
      const hook = h.load(resolve(root, 'src/context/' + file + '.ts'))[name] as () => unknown;
      function Missing() { hook(); return null; }
      assert.throws(() => renderToStaticMarkup(createElement(Missing)), /must be used inside/);
    }
    assert.equal(h.state().executionHistory.length, 0);
  } finally { await h.close(); }
});

test('Achievement provider/hook share one context and preserve existing synthetic storage semantics', async () => {
  const h = await mount(); const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: h.dom.window.localStorage });
  try {
    const Provider = h.load(resolve(root, 'src/context/AchievementContext.tsx')).AchievementProvider as ComponentType<{ children?: ReactNode }>;
    const hook = h.load(resolve(root, 'src/context/achievementContextValue.ts')).useAchievements as typeof useAchievements;
    let actions: ReturnType<typeof useAchievements> | undefined; function Probe() { actions = hook(); return null; }
    await h.render(undefined, createElement(Provider, null, createElement(Probe))); assert.ok(actions);
    const fixture = { id: 'synthetic-proof', title: 'Synthetic', description: 'Disposable test', icon: '', xpReward: 20 };
    await act(async () => { actions!.unlockAchievement(fixture); }); await act(async () => { actions!.unlockAchievement(fixture); });
    assert.equal(actions!.unlockedAchievements.length, 1); assert.equal(actions!.isUnlocked(fixture.id), true);
    assert.equal(JSON.parse(h.dom.window.localStorage.getItem('lifeos-achievements')!).length, 1);
    await act(async () => actions!.clearAchievements()); assert.equal(actions!.unlockedAchievements.length, 0); assert.equal(h.state().executionHistory.length, 0);
  } finally { if (descriptor) Object.defineProperty(globalThis, 'localStorage', descriptor); else Reflect.deleteProperty(globalThis, 'localStorage'); await h.close(); }
});

test('Memoized weekly slot count refreshes when canonical weekly targets change', async () => {
  const h = await mount(); try {
    const Month = component(h, 'src/components/planning/GoalMonthPlanner.tsx');
    const props = () => ({ month: h.seed.monthlyTargets[0], weeklyTargets: h.state().weeklyTargets.filter(w => w.monthlyTargetId === 201) });
    await h.render(undefined, createElement(Month, props()));
    const open = [...h.dom.window.document.querySelectorAll('button')].find(b => b.textContent?.includes('Build an accessible campus map')); assert.ok(open);
    await act(async () => open.click()); const count = () => Number(h.dom.window.document.body.textContent!.match(/(\d+)\/\d+ owned weeks planned/)?.[1]); assert.equal(count(), 1);
    await h.act(actions => { actions.deleteWeeklyTarget(301); }); await h.render(undefined, createElement(Month, props())); assert.equal(count(), 0);
    assert.equal(h.state().executionHistory.reduce((n, row) => n + row.xpAwarded, 0), 0);
  } finally { await h.close(); }
});

test('Personality initializer repair preserves every greeting branch at fixed synthetic hours', () => {
  const file = 'src/atlas/engines/personalityEngine.ts'; const before = execFileSync('git', ['show', '7447c377ddbe249af7d730cd1026c6799a0da62c:' + file], { cwd: root, encoding: 'utf8' });
  const after = readFileSync(resolve(root, file), 'utf8');
  for (const hour of [2, 13, 20]) {
    const engines = [before, after].map(source => { const module = { exports: {} as { PersonalityEngine: new () => { greeting(a: number, b: number, c: number): string } } }; const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText; runInNewContext(code, { module, exports: module.exports, Date: class extends Date { getHours() { return hour; } } }); return new module.exports.PersonalityEngine(); });
    for (const args of [[0, 0, 0], [9, 10, 90], [5, 10, 50], [1, 10, 10]]) assert.equal(engines[0].greeting(args[0], args[1], args[2]), engines[1].greeting(args[0], args[1], args[2]));
  }
});

test('Theme control typography and dialog footer scope do not override unrelated utilities', () => {
  const css = readFileSync(resolve(root, 'src/index.css'), 'utf8');
  assert.match(css, /button, input, select, textarea \{ font-family: inherit; \}/); assert.doesNotMatch(css, /button, input, select, textarea \{ font: inherit;/);
  assert.match(css, /dialog \.lifeos-dialog-actions \{ flex-wrap: wrap; \}/); assert.doesNotMatch(css, /dialog \[class\*="justify-end"\]/);
  const card = readFileSync(resolve(root, 'src/components/ui/StatCard.tsx'), 'utf8'); assert.ok(card.includes('className={`text-xl ${color}`}'));
});

test('Actual ThemeProvider follows synthetic system changes, explicit override and memory-only preference lifetime', async () => {
  const h = await mount(); try {
    let dark = false; const listeners = new Set<(event: { matches: boolean }) => void>();
    h.dom.window.matchMedia = (() => ({ get matches() { return dark; }, addEventListener(_type: string, listener: (event: { matches: boolean }) => void) { listeners.add(listener); }, removeEventListener(_type: string, listener: (event: { matches: boolean }) => void) { listeners.delete(listener); } })) as unknown as typeof h.dom.window.matchMedia;
    const Provider = h.load(resolve(root, 'src/theme/ThemeProvider.tsx')).ThemeProvider as ComponentType<{ storage: Pick<Storage, 'getItem' | 'setItem'>; children?: ReactNode }>;
    const hook = h.load(resolve(root, 'src/theme/themeContext.ts')).useTheme as () => { preference: 'system' | 'light' | 'dark'; setPreference(value: 'system' | 'light' | 'dark'): void };
    const memory = new Map<string, string>(); const storage = { getItem: (key: string) => memory.get(key) ?? null, setItem: (key: string, value: string) => { memory.set(key, value); } };
    let theme: ReturnType<typeof hook> | undefined; function Probe() { theme = hook(); return null; }
    const render = () => h.render(undefined, createElement(Provider, { storage }, createElement(Probe)));
    await render(); assert.equal(h.dom.window.document.documentElement.dataset.theme, 'light'); assert.equal(theme!.preference, 'system');
    await act(async () => { dark = true; for (const callback of listeners) callback({ matches: dark }); }); assert.equal(h.dom.window.document.documentElement.dataset.theme, 'dark');
    await act(async () => theme!.setPreference('light')); assert.equal(h.dom.window.document.documentElement.dataset.theme, 'light'); assert.equal(memory.get('lifeos-appearance-v1'), 'light');
    await act(async () => { dark = false; for (const callback of listeners) callback({ matches: dark }); }); await act(async () => { dark = true; for (const callback of listeners) callback({ matches: dark }); }); assert.equal(h.dom.window.document.documentElement.dataset.theme, 'light');
    await act(async () => theme!.setPreference('system')); assert.equal(h.dom.window.document.documentElement.dataset.theme, 'dark');
    await h.render(); assert.equal(listeners.size, 0); memory.clear(); dark = false; await render(); assert.equal(theme!.preference, 'system'); assert.equal(h.dom.window.document.documentElement.dataset.theme, 'light');
    assert.equal(h.state().executionHistory.length, 0);
  } finally { await h.close(); }
});
