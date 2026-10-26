import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';
import { JSDOM } from 'jsdom';
import { act, createElement } from 'react';
import type { ComponentType, ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';
import type { AtlasCanonicalState } from '../src/atlas/state/types';
import { createReadOnlyDemoTaskRepository } from './repository.ts';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const cache = new Map<string, { exports: Record<string, unknown> }>();
const demoBindings = new Set(['src/atlas/state/useAtlasCanonicalState', 'src/context/AppContext', 'src/context/PlanningExecutionContext', 'src/context/HabitExecutionContext', 'src/auth/AuthContext', 'src/data/account/AccountDataContext', 'src/connectors/googleCalendar/GoogleCalendarContext'].map(path => resolve(root, path)));
const noopComponent = () => null;
const normalize = (path: string) => path.replace(/\.tsx?$/, '');

// V1 fixed-snapshot presentation regression. V2 separately mounts the real
// domain providers and engines in planningTasks.test.ts.
// Fail rather than loading production auth/database modules into the test.
function compile(path: string, source: string): Record<string, unknown> {
  const module = { exports: {} as Record<string, unknown> };
  const localRequire = (id: string): unknown => {
    if (!id.startsWith('.')) return require(id);
    const absolute = normalize(resolve(dirname(path), id));
    if (demoBindings.has(absolute)) return load(resolve(root, 'real-app-demo/bindings.ts'));
    if (absolute === resolve(root, 'src/focus/useFocusSession')) return { useFocusSession: () => ({ session: null, outcome: null }) };
    if (absolute === resolve(root, 'src/atlas/composition/createLocalAtlasAIOrchestrator')) return { createAtlasAIOrchestrator: () => orchestrator };
    if (absolute === resolve(root, 'src/components/notifications/NotificationCenter')) return { __esModule: true, default: noopComponent };
    if (absolute === resolve(root, 'src/components/capture/CaptureModal')) return { __esModule: true, default: noopComponent };
    if (absolute === resolve(root, 'src/atlas/localReasoning/AtlasLocalReasoningProbe')) return { AtlasLocalReasoningProbe: noopComponent };
    if (absolute.startsWith(resolve(root, 'src/pages'))) return { __esModule: true, default: noopComponent };
    if (/[\\/]src[\\/](auth|data[\\/](cloud|database|account))[\\/]/.test(absolute)) throw new Error('Production service import rejected');
    for (const candidate of [absolute + '.ts', absolute + '.tsx']) if (existsSync(candidate)) return load(candidate);
    return require(id);
  };
  const output = ts.transpileModule(source.replaceAll('import.meta.env.DEV', 'false'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 } }).outputText;
  runInNewContext(output, { module, exports: module.exports, require: localRequire, structuredClone, Date, console, crypto: globalThis.crypto, setTimeout, clearTimeout });
  return module.exports;
}
function load(path: string): Record<string, unknown> {
  const existing = cache.get(path); if (existing) return existing.exports;
  const module = { exports: {} as Record<string, unknown> }; cache.set(path, module);
  module.exports = compile(path, readFileSync(path, 'utf8'));
  return module.exports;
}
const { createDemoSnapshot } = load(resolve(root, 'real-app-demo/fixtures.ts')) as { createDemoSnapshot(now?: Date): AtlasCanonicalState };
const { AtlasAIOrchestrator } = load(resolve(root, 'src/atlas/orchestration/AtlasAIOrchestrator.ts')) as { AtlasAIOrchestrator: new (provider: unknown) => unknown };
const orchestrator = new AtlasAIOrchestrator({ descriptor: { id: 'offline', kind: 'local', displayName: 'Offline' }, reason: async () => { throw new Error('Unavailable'); } });
const { DemoScopeProvider } = load(resolve(root, 'real-app-demo/DemoScope.tsx')) as { DemoScopeProvider: ComponentType<{ value: { snapshot: AtlasCanonicalState; unavailable(feature: string): void }; children?: ReactNode }> };
const Dashboard = load(resolve(root, 'src/dashboard/DailyCommandCenter.tsx')).default as ComponentType<{ orchestrator: unknown; onNavigate(page: string): void; onOpenCapture(): void; onStartFocus(): void }>;
const snapshot = createDemoSnapshot(new Date('2026-10-25T10:00:00+05:30'));
const wrap = (children: ReactNode, unavailable: (feature: string) => void = () => undefined) => createElement(DemoScopeProvider, { value: { snapshot, unavailable } }, children);

test('shell extraction preserves the original production App markup with identical bindings', () => {
  // Keep comparing to the pre-extraction App after this checkpoint is committed.
  const original = execFileSync('git', ['show', 'b3147b18d8f6840c73ff5486db993dceed3ca9f7:src/App.tsx'], { cwd: root, encoding: 'utf8' });
  const Before = compile(resolve(root, 'src/App.tsx'), original).default as ComponentType;
  const After = load(resolve(root, 'src/App.tsx')).default as ComponentType;
  assert.equal(renderToStaticMarkup(wrap(createElement(After))), renderToStaticMarkup(wrap(createElement(Before))));
});

test('real Dashboard derives all five snapshot fields, priorities, linked plans and capture empty state', () => {
  const html = renderToStaticMarkup(wrap(createElement(Dashboard, { orchestrator, onNavigate: () => undefined, onOpenCapture: () => undefined, onStartFocus: () => undefined })));
  for (const text of ['Daily command center', 'Primary focus', 'Daily snapshot', 'Habits due', 'Habits done', 'XP today', 'Top priorities', 'Today’s tasks', 'Habits today', 'Goals in motion', 'Capture inbox']) assert.ok(html.includes(text), text);
  assert.ok(html.includes('Test the first accessible route'));
  assert.ok(!html.includes('Google · read-only'));
  assert.ok(!html.includes('Today’s schedule'));
});

test('in-memory Task port returns independent copies and rejects mutation/persistence claims', async () => {
  const repository = createReadOnlyDemoTaskRepository(snapshot.tasks);
  const rows = await repository.initialize(); rows[0].title = 'Changed';
  assert.notEqual((await repository.readCurrent())[0].title, 'Changed');
  await assert.rejects(repository.replace([]), /unavailable/);
  await assert.rejects(repository.waitForPersistence(), /no persistent repository/);
  assert.equal((await repository.readCurrent()).length, 3);
});

test('demo has no authenticated identity, account owner, services or Calendar connection', () => {
  const bindings = load(resolve(root, 'real-app-demo/bindings.ts')) as { useAuth(): { phase: string; identity: unknown }; useAccountData(): { ownerUserId: unknown; services: unknown }; useGoogleCalendar(): { connection: { state: string }; readModel: { events: unknown[] } } };
  assert.equal(bindings.useAuth().phase, 'signed-out'); assert.equal(bindings.useAuth().identity, null);
  assert.equal(bindings.useAccountData().ownerUserId, null); assert.equal(bindings.useAccountData().services, null);
  assert.equal(bindings.useGoogleCalendar().connection.state, 'disconnected'); assert.equal(bindings.useGoogleCalendar().readModel.events.length, 0);
});

test('mounted real Dashboard completion/habit/focus controls report unavailable without changing data', async () => {
  const dom = new JSDOM('<!doctype html><div id="root"></div>', { url: 'https://synthetic.invalid' });
  const descriptors = new Map<string, PropertyDescriptor | undefined>();
  for (const [key, value] of Object.entries({ window: dom.window, document: dom.window.document, HTMLElement: dom.window.HTMLElement, IS_REACT_ACT_ENVIRONMENT: true })) {
    descriptors.set(key, Object.getOwnPropertyDescriptor(globalThis, key)); Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
  }
  const errors: unknown[][] = []; const oldError = console.error; console.error = (...args) => errors.push(args);
  const reactRoot = createRoot(dom.window.document.getElementById('root')!);
  const before = JSON.stringify(snapshot); const notices: string[] = [];
  try {
    await act(async () => reactRoot.render(wrap(createElement(Dashboard, { orchestrator, onNavigate: () => notices.push('navigation'), onOpenCapture: () => notices.push('capture'), onStartFocus: () => notices.push('focus') }), feature => notices.push(feature))));
    const buttons = [...dom.window.document.querySelectorAll('button')];
    const complete = buttons.find(button => button.getAttribute('aria-label')?.startsWith('Complete:'))!;
    await act(async () => { complete.click(); complete.click(); });
    const habit = buttons.find(button => button.textContent?.includes('Take a walk'))!;
    await act(async () => habit.click());
    const focus = buttons.find(button => button.textContent?.includes('Start Focus'))!;
    await act(async () => focus.click());
    assert.equal(notices.filter(value => value === 'Task completion').length, 2);
    assert.ok(notices.includes('Habit completion')); assert.ok(notices.includes('focus'));
    assert.equal(JSON.stringify(snapshot), before);
  } finally {
    await act(async () => reactRoot.unmount()); console.error = oldError; dom.window.close();
    for (const [key, descriptor] of descriptors) { if (descriptor) Object.defineProperty(globalThis, key, descriptor); else Reflect.deleteProperty(globalThis, key); }
  }
  assert.deepEqual(errors, []);
});
