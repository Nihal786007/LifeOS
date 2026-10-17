import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { runInNewContext } from "node:vm";
import test from "node:test";
import type { ReactElement } from "react";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";
import { CaptureDeletionGuard } from "../../src/components/capture/captureDeletion.ts";
import type { CaptureDeletionState } from "../../src/components/capture/captureDeletion.ts";

const a = { id: 11, text: "Synthetic first thought", createdAt: "2026-10-01T12:00:00.000Z" };
const b = { id: 22, text: "Synthetic second thought", createdAt: "2026-10-02T12:00:00.000Z" };
const state = (): CaptureDeletionState => ({ ownerId: "account-a", scope: {}, ready: true, captures: [a, b] });

test("confirmation deletes only the selected exact ID, not its list position", async () => {
  const guard = new CaptureDeletionGuard(), current = state(), calls: number[] = [];
  const target = guard.select(b.id, current)!;
  assert.equal(await guard.confirm(target, { ...current, captures: [b, a] }, async id => { calls.push(id); }), true);
  assert.deepEqual(calls, [b.id]);
});

for (const [label, change] of [
  ["changed text", (s: CaptureDeletionState) => ({ ...s, captures: [{ ...a, text: "Edited" }, b] })],
  ["changed timestamp / replaced identity", (s: CaptureDeletionState) => ({ ...s, captures: [{ ...a, createdAt: b.createdAt }, b] })],
  ["missing record", (s: CaptureDeletionState) => ({ ...s, captures: [b] })],
  ["duplicate canonical ID", (s: CaptureDeletionState) => ({ ...s, captures: [a, a, b] })],
  ["account switch", (s: CaptureDeletionState) => ({ ...s, ownerId: "account-b" })],
  ["logout", (s: CaptureDeletionState) => ({ ...s, ownerId: null, ready: false })],
  ["same user with new repository scope", (s: CaptureDeletionState) => ({ ...s, scope: {} })],
  ["hydration pending", (s: CaptureDeletionState) => ({ ...s, ready: false })],
] as const) {
  test(`${label} cancels approval without invoking deletion`, async () => {
    const guard = new CaptureDeletionGuard(), current = state();
    const target = guard.select(a.id, current)!;
    let calls = 0;
    assert.equal(await guard.confirm(target, change(current), async () => { calls++; }), false);
    assert.equal(calls, 0);
    assert.equal(guard.isCurrent(target, current), false);
  });
}

test("cancel and stale confirmation callbacks cannot delete a later selection", async () => {
  const guard = new CaptureDeletionGuard(), current = state(), calls: number[] = [];
  const old = guard.select(a.id, current)!;
  guard.cancel();
  guard.select(b.id, current);
  assert.equal(await guard.confirm(old, current, async id => { calls.push(id); }), false);
  assert.deepEqual(calls, []);
});

test("double clicks and repeated approval execute exactly once", async () => {
  const guard = new CaptureDeletionGuard(), current = state(), calls: number[] = [];
  const target = guard.select(a.id, current)!;
  let release!: () => void;
  const pending = guard.confirm(target, current, id => { calls.push(id); return new Promise<void>(resolve => { release = resolve; }); });
  assert.equal(guard.select(b.id, current), null);
  assert.equal(await guard.confirm(target, current, async id => { calls.push(id); }), false);
  release(); await pending;
  assert.equal(await guard.confirm(target, current, async id => { calls.push(id); }), false);
  assert.deepEqual(calls, [a.id]);
});

test("failed deletion requires a new review and propagates the failure", async () => {
  const guard = new CaptureDeletionGuard(), current = state();
  const target = guard.select(a.id, current)!;
  await assert.rejects(guard.confirm(target, current, async () => { throw new Error("synthetic failure"); }));
  assert.equal(guard.isCurrent(target, current), false);
  assert.ok(guard.select(a.id, current));
});

test("invalid selection and ambiguous identity never open a confirmation", () => {
  const guard = new CaptureDeletionGuard(), current = state();
  assert.equal(guard.select(999, current), null);
  assert.equal(guard.select(a.id, { ...current, captures: [a, a] }), null);
  assert.equal(guard.select(a.id, { ...current, ready: false }), null);
  assert.equal(guard.select(a.id, { ...current, scope: null }), null);
});

test("review snapshot is immutable and contains exact unnormalized content", () => {
  const guard = new CaptureDeletionGuard(), current = state();
  const original = { ...a, text: "  Synthetic\n<not HTML>  " };
  const target = guard.select(a.id, { ...current, captures: [original] })!;
  original.text = "Changed in place";
  assert.equal(target.text, "  Synthetic\n<not HTML>  ");
  assert.equal(Object.isFrozen(target), true);
  assert.equal(guard.isCurrent(target, { ...current, captures: [original] }), false);
});

// Isolated hook harness runs the actual UI handlers. No DOM, auth, network or stores.
const require = createRequire(import.meta.url);
type Node = ReactElement<Record<string, unknown>>;
function elements(value: unknown): Node[] {
  if (Array.isArray(value)) return value.flatMap(elements);
  if (!value || typeof value !== "object" || !("props" in value)) return [];
  const node = value as Node;
  return [node, ...elements(node.props.children)];
}
function ui() {
  const slots: unknown[] = [], effects: (() => void)[] = [], dependencies = new Map<number, readonly unknown[]>();
  let cursor = 0;
  const writes: number[] = [];
  const app = { captures: [a, b], capturePersistence: { phase: "hydrated", error: null }, deleteCapture: async (id: number) => { writes.push(id); } };
  const auth = { phase: "signed-in", identity: { userId: "account-a" } };
  const account = { phase: "ready", ownerUserId: "account-a", services: {} };
  const hooks = {
    useState(initial: unknown) { const index = cursor++; if (!(index in slots)) slots[index] = typeof initial === "function" ? initial() : initial; return [slots[index], (value: unknown) => { slots[index] = value; }]; },
    useRef(initial: unknown) { const index = cursor++; if (!(index in slots)) slots[index] = { current: initial }; return slots[index]; },
    useLayoutEffect(effect: () => void, deps?: readonly unknown[]) { const index = cursor++, previous = dependencies.get(index); if (!deps || !previous || deps.some((dep, i) => dep !== previous[i])) { dependencies.set(index, deps ?? []); effects.push(effect); } },
  };
  const module = { exports: {} as { default(): Node } };
  const source = readFileSync(new URL("../../src/components/capture/RecentCaptures.tsx", import.meta.url), "utf8");
  runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText, {
    module, exports: module.exports,
    require: (id: string) => {
      if (id === "react") return hooks;
      if (id.endsWith("/AppContext")) return { useApp: () => app };
      if (id.endsWith("/AuthContext")) return { useAuth: () => auth };
      if (id.endsWith("/AccountDataContext")) return { useAccountData: () => account };
      if (id === "./captureDeletion") return { CaptureDeletionGuard };
      return require(id);
    },
  });
  function render() { cursor = 0; const tree = module.exports.default(); effects.splice(0).forEach(effect => effect()); return elements(tree); }
  const select = (nodes: Node[], id: number) => (nodes.find(node => node.props["aria-label"] === `Delete thought: ${id === a.id ? a.text : b.text}`)!.props.onClick as () => void)();
  const confirmation = (nodes: Node[]) => nodes.find(node => typeof node.type === "function" && "target" in node.props);
  return { app, auth, account, writes, render, select, confirmation };
}

test("actual UI shows exact escaped text/ID, destructive scope and explicit cancel/confirm", () => {
  const h = ui(); h.select(h.render(), a.id);
  const dialog = h.confirmation(h.render())!;
  assert.deepEqual(h.writes, []);
  const markup = renderToStaticMarkup(createElement(dialog.type, dialog.props));
  assert.match(markup, /Capture ID: 11/);
  assert.match(markup, /Synthetic first thought/);
  assert.match(markup, /including its synced copy/);
  assert.match(markup, /Permanently delete/);
  assert.match(markup, /Cancel/);
  assert.match(markup, /<dialog/);
  assert.match(markup, /aria-labelledby="delete-capture-title"/);
});

test("actual UI reordered list and stale list callback still select the same ID", async () => {
  const h = ui(), old = h.render();
  h.app.captures = [b, a]; h.render(); h.select(old, a.id);
  const dialog = h.confirmation(h.render())!;
  (dialog.props.onConfirm as () => void)(); await Promise.resolve();
  assert.deepEqual(h.writes, [a.id]);
});

test("actual UI cancels without mutation", () => {
  const h = ui(); h.select(h.render(), a.id);
  (h.confirmation(h.render())!.props.onCancel as () => void)();
  assert.equal(h.confirmation(h.render()), undefined);
  assert.deepEqual(h.writes, []);
});

for (const reason of ["text", "missing", "account", "scope"] as const) {
  test(`actual UI closes for ${reason} change and rejects retained confirm callback`, async () => {
    const h = ui(); h.select(h.render(), a.id);
    const old = h.confirmation(h.render())!;
    if (reason === "text") h.app.captures = [{ ...a, text: "Edited" }, b];
    if (reason === "missing") h.app.captures = [b];
    if (reason === "account") h.auth.identity.userId = "account-b";
    if (reason === "scope") h.account.services = {};
    assert.equal(h.confirmation(h.render()), undefined);
    (old.props.onConfirm as () => void)(); await Promise.resolve();
    assert.deepEqual(h.writes, []);
  });
}

test("actual UI consumes approval once and disables every repeated delete click", async () => {
  const h = ui(); h.select(h.render(), b.id);
  const old = h.confirmation(h.render())!;
  (old.props.onConfirm as () => void)();
  (old.props.onConfirm as () => void)();
  const tree = h.render();
  const deletes = tree.filter(node => String(node.props["aria-label"] ?? "").startsWith("Delete thought:"));
  assert.ok(deletes.every(node => node.props.disabled === true));
  await Promise.resolve(); assert.deepEqual(h.writes, [b.id]);
});

test("dialog keeps native modality, scoped keyboard wrapping, Escape and safe focus restoration", () => {
  const source = readFileSync(new URL("../../src/components/capture/RecentCaptures.tsx", import.meta.url), "utf8");
  assert.match(source, /\.showModal\(\)/);
  assert.match(source, /cancelButton\.current\?\.focus\(\)/);
  assert.match(source, /onCancel=\{event => \{ event\.preventDefault\(\); onCancel\(\); \}\}/);
  assert.match(source, /previousFocus\.isConnected && !previousFocus\.matches\(":disabled"\)\) previousFocus\.focus\(\)/);
  assert.match(source, /onKeyDown=\{wrapFocus\}/);
  assert.doesNotMatch(source, /document\.addEventListener/);
  assert.doesNotMatch(source, /window\.confirm|console\.|telemetry|analytics/);
});

function keyboardHarness() {
  const source = readFileSync(new URL("../../src/components/capture/RecentCaptures.tsx", import.meta.url), "utf8");
  const start = source.indexOf("  function wrapFocus(");
  const end = source.indexOf("\n  return <dialog", start);
  assert.ok(start >= 0 && end > start);
  let active: object | null = null;
  const buttons: { disabled: boolean; focus(): void }[] = [
    { disabled: false, focus() { active = buttons[0]; } },
    { disabled: false, focus() { active = buttons[1]; } },
  ];
  const documentMock = { get activeElement() { return active; } };
  type Event = { key: string; shiftKey: boolean; altKey: boolean; ctrlKey: boolean; metaKey: boolean; preventDefault(): void; currentTarget: { querySelectorAll(): object[] } };
  const module = { exports: {} as { wrapFocus(event: Event): void } };
  runInNewContext(ts.transpileModule(`export ${source.slice(start, end).trim()}`, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, { module, exports: module.exports, document: documentMock });
  return {
    buttons, index: () => buttons.indexOf(active as typeof buttons[number]), outside() { active = {}; },
    key(key: string, shiftKey = false, ctrlKey = false) {
      let prevented = false;
      module.exports.wrapFocus({ key, shiftKey, ctrlKey, altKey: false, metaKey: false, preventDefault() { prevented = true; }, currentTarget: { querySelectorAll() { return buttons.filter(button => !button.disabled); } } });
      return prevented;
    },
  };
}

test("actual scoped handler wraps forward before native focus can leave the dialog", () => {
  const h = keyboardHarness(); h.buttons[0].focus();
  for (const expected of [1, 0, 1, 0]) { assert.equal(h.key("Tab"), true); assert.equal(h.index(), expected); }
});

test("actual scoped handler wraps Shift+Tab in reverse", () => {
  const h = keyboardHarness(); h.buttons[0].focus();
  for (const expected of [1, 0, 1, 0]) { assert.equal(h.key("Tab", true), true); assert.equal(h.index(), expected); }
});

test("Tab from an unfocused dialog or scrollable text returns to its controls", () => {
  const h = keyboardHarness(); h.outside();
  assert.equal(h.key("Tab"), true); assert.equal(h.index(), 0);
  h.outside(); assert.equal(h.key("Tab", true), true); assert.equal(h.index(), 1);
});

test("Escape, Enter and browser shortcut modifiers are not intercepted", () => {
  const h = keyboardHarness(); h.buttons[0].focus();
  assert.equal(h.key("Escape"), false); assert.equal(h.key("Enter"), false);
  assert.equal(h.key("Tab", false, true), false); assert.equal(h.index(), 0);
});

test("disabled controls are excluded; no enabled control is handled without throwing", () => {
  const h = keyboardHarness(); h.buttons[1].disabled = true; h.buttons[0].focus();
  assert.equal(h.key("Tab"), true); assert.equal(h.index(), 0);
  h.buttons[0].disabled = true; assert.equal(h.key("Tab"), false);
});

test("focus restoration safely skips a removed or disabled originating button", () => {
  const source = readFileSync(new URL("../../src/components/capture/RecentCaptures.tsx", import.meta.url), "utf8");
  const line = source.split("\n").find(value => value.includes("previousFocus instanceof HTMLElement"))!;
  for (const [isConnected, disabled, expected] of [[true, false, 1], [false, false, 0], [true, true, 0]] as const) {
    let focused = 0;
    class Element { isConnected = isConnected; matches() { return disabled; } focus() { focused++; } }
    runInNewContext(line, { previousFocus: new Element(), HTMLElement: Element });
    assert.equal(focused, expected);
  }
});
