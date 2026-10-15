import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import { runInNewContext } from "node:vm";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import type { ReactElement } from "react";
import ts from "typescript";
import { selectAuthDataAccess } from "../../src/auth/authState.ts";
import type { AuthState } from "../../src/auth/types.ts";

const require = createRequire(import.meta.url);
function loadBoundary(auth: AuthState, account: Record<string, unknown>) {
  const source = readFileSync(new URL("../../src/components/auth/AuthDataBoundary.tsx", import.meta.url), "utf8");
  const module = { exports: {} as { default: (props: { children: string }) => React.ReactNode } };
  runInNewContext(ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText, {
    module, exports: module.exports,
    require: (id: string) => {
      if (id.endsWith("/authState")) return { selectAuthDataAccess };
      if (id.endsWith("/AuthContext")) return { useAuth: () => auth };
      if (id.endsWith("/AccountDataContext")) return { useAccountData: () => account };
      if (id === "./AuthScreen") return { __esModule: true, default: () => createElement("div", null, "SIGN_IN") };
      return require(id);
    },
  });
  return renderToStaticMarkup(createElement(module.exports.default, { children: "PRIVATE_ACCOUNT_A" }));
}

const signedIn = (userId: string): AuthState => ({ phase: "signed-in", identity: { userId, email: null }, error: null });
const readyA = { phase: "ready", ownerUserId: "account-a", services: {}, conflictDomains: [] };

test("a stale ready snapshot never renders under a different authenticated identity", () => {
  assert.doesNotMatch(loadBoundary(signedIn("account-b"), readyA), /PRIVATE_ACCOUNT_A/);
});

for (const [name, auth, account] of [
  ["logout", { phase: "signed-out", identity: null, error: null }, readyA],
  ["expired session being restored", { phase: "hydrating", identity: null, error: null }, readyA],
  ["authentication error", { phase: "error", identity: null, error: "expired" }, readyA],
  ["missing identity", { phase: "signed-in", identity: null, error: null }, readyA],
  ["blank identity", signedIn(" "), readyA],
  ["B loading while A remains in memory", signedIn("account-b"), { ...readyA, phase: "checking" }],
  ["untagged ready state", signedIn("account-a"), { ...readyA, ownerUserId: null }],
  ["ready without hydrated services", signedIn("account-a"), { ...readyA, services: null }],
] as const) {
  test(`${name} blocks protected content`, () => {
    assert.doesNotMatch(loadBoundary(auth as AuthState, account), /PRIVATE_ACCOUNT_A/);
  });
}

test("same-user reauthentication remains available without depending on network status", () => {
  assert.match(loadBoundary(signedIn("account-a"), { ...readyA, syncStatus: { connected: false } }), /PRIVATE_ACCOUNT_A/);
});

test("rapid A → B → A never exposes A under B, even before cleanup", () => {
  for (const owner of ["account-a", "account-b", "account-a", "account-b"]) {
    assert.equal(loadBoundary(signedIn(owner), readyA).includes("PRIVATE_ACCOUNT_A"), owner === "account-a");
  }
});

function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>(done => { resolve = done; });
  return { promise, resolve };
}

interface AccountValue {
  phase: string;
  ownerUserId: string | null;
  services: { owner: string } | null;
  syncStatus: unknown;
  chooseCloud(): Promise<void>;
  chooseAdoption(): Promise<void>;
}

/** Runs the actual provider with isolated hook/effect scheduling and mock services.
 * No network, persistent storage, real identity, or canonical mutation is used.
 */
function providerHarness() {
  let auth = signedIn("account-a");
  const slots: unknown[] = [];
  let cursor = 0;
  const effects = new Map<number, { deps: readonly unknown[]; cleanup?: () => void }>();
  const pending: (() => void)[] = [];
  let disconnectGate: ReturnType<typeof deferred> | null = null;
  let hydrationGate: ReturnType<typeof deferred> | null = null;
  let current: { userId: string; database: object; registerCleanup: () => () => void } | null = null;
  let binding = true;
  let conflict = false;
  const writes: string[] = [];
  const lifecycle: string[] = [];
  class Conflict extends Error { domains = ["tasks"]; }
  const manager = {
    current: () => current,
    deactivate: async () => {
      lifecycle.push("disconnect");
      await disconnectGate?.promise;
      current = null;
    },
    activate: async (userId: string) => {
      lifecycle.push(`hydrate:${userId}`);
      await hydrationGate?.promise;
      current = {
        userId,
        database: { currentStatus: { connected: true, hasSynced: true }, registerListener: () => () => undefined },
        registerCleanup: () => () => undefined,
      };
      return current;
    },
  };
  const hooks = {
    createContext: () => ({ Provider: "mock-context" }),
    useState: (initial: unknown) => {
      const index = cursor++;
      if (!(index in slots)) slots[index] = initial;
      return [slots[index], (next: unknown) => { slots[index] = next; }];
    },
    useRef: (initial: unknown) => {
      const index = cursor++;
      if (!(index in slots)) slots[index] = { current: initial };
      return slots[index];
    },
    useCallback: (fn: unknown) => fn,
    useMemo: (fn: () => unknown) => fn(),
    useEffect: (fn: () => void | (() => void), deps: readonly unknown[]) => {
      const index = cursor++;
      const previous = effects.get(index);
      if (previous && deps.every((value, i) => Object.is(value, previous.deps[i]))) return;
      pending.push(() => {
        previous?.cleanup?.();
        const cleanup = fn();
        effects.set(index, { deps, ...(cleanup ? { cleanup } : {}) });
      });
    },
  };
  const module = { exports: {} as { AccountDataProvider: (props: object) => ReactElement<{ value: AccountValue }> } };
  const source = readFileSync(new URL("../../src/data/account/AccountDataContext.tsx", import.meta.url), "utf8");
  runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText, {
    module, exports: module.exports,
    require: (id: string) => {
      if (id === "react") return hooks;
      if (id.endsWith("/AuthContext")) return { useAuth: () => auth };
      if (id.endsWith("/supabaseClient")) return { supabaseClient: null };
      if (id.endsWith("/createAuthenticatedPowerSync")) return { createAuthenticatedPowerSyncSessionManager: () => manager };
      if (id === "./authenticatedDataServices") return { createAuthenticatedDataServices: (_db: unknown, owner: string) => ({ owner }) };
      if (id.endsWith("/DataServicesContext")) return { createUnboundBrowserDataServices: () => ({}) };
      if (id === "./adoptLocalData") return {
        snapshotData: async () => undefined, AdoptionConflictError: Conflict,
        adoptCanonicalLocalData: async () => { if (conflict) throw new Conflict(); writes.push("adopt"); },
      };
      if (id === "./accountBinding") return {
        readAccountBinding: async () => binding ? {} : null,
        writeAccountBinding: async (_db: unknown, user: string) => { writes.push(`bind:${user}`); },
      };
      if (id === "./adoptionJournal") return { clearAdoptionJournal: async () => undefined };
      return require(id);
    },
  });
  const render = () => {
    cursor = 0;
    return module.exports.AccountDataProvider({ manager, children: null }).props.value;
  };
  const commit = () => { pending.splice(0).forEach(fn => fn()); };
  const settle = async () => {
    for (let i = 0; i < 30; i++) { render(); commit(); await Promise.resolve(); }
    return render();
  };
  return {
    render, commit, settle, writes, lifecycle,
    authenticate: (next: AuthState) => { auth = next; },
    delayDisconnect: () => { disconnectGate = deferred(); return disconnectGate; },
    delayHydration: () => { hydrationGate = deferred(); return hydrationGate; },
    requireSetup: () => { binding = false; },
    createConflict: () => { conflict = true; },
  };
}

test("provider masks old services synchronously while disconnect is delayed", async () => {
  const harness = providerHarness();
  assert.equal((await harness.settle()).services?.owner, "account-a");
  const gate = harness.delayDisconnect();
  harness.authenticate(signedIn("account-b"));
  assert.equal(harness.render().services, null); // Before effects run.
  const waiting = await harness.settle();
  assert.equal(waiting.phase, "checking");
  assert.equal(waiting.syncStatus, null);
  gate.resolve();
  assert.equal((await harness.settle()).services?.owner, "account-b");
  assert.deepEqual(harness.writes, []);
});

test("delayed B hydration cannot publish A services or late B state after switching back", async () => {
  const harness = providerHarness();
  await harness.settle();
  const gate = harness.delayHydration();
  harness.authenticate(signedIn("account-b"));
  assert.equal((await harness.settle()).services, null);
  harness.authenticate(signedIn("account-a"));
  assert.equal(harness.render().services, null);
  harness.commit();
  gate.resolve();
  const result = await harness.settle();
  assert.equal(result.ownerUserId, "account-a");
  assert.equal(result.services?.owner, "account-a");
  assert.deepEqual(harness.writes, []);
});

test("logout and invalid identity synchronously remove services without deleting data", async () => {
  for (const auth of [
    { phase: "signed-out", identity: null, error: null },
    { phase: "error", identity: null, error: "expired" },
    signedIn(" "),
  ] as AuthState[]) {
    const harness = providerHarness();
    await harness.settle();
    harness.authenticate(auth);
    const result = harness.render();
    assert.equal(result.services, null);
    assert.equal(result.ownerUserId, null);
    assert.equal(result.syncStatus, null);
    assert.deepEqual(harness.writes, []);
  }
});

test("same-user auth refresh preserves the ready services and does not reconnect", async () => {
  const harness = providerHarness();
  const ready = await harness.settle();
  const calls = harness.lifecycle.length;
  harness.authenticate(signedIn("account-a"));
  assert.equal((await harness.settle()).services, ready.services);
  assert.equal(harness.lifecycle.length, calls);
});

test("cloud setup remains explicit, owner-scoped and does not adopt local data", async () => {
  const harness = providerHarness();
  harness.requireSetup();
  assert.equal((await harness.settle()).phase, "needs-choice");
  await harness.render().chooseCloud();
  assert.equal(harness.render().services?.owner, "account-a");
  assert.deepEqual(harness.writes, ["bind:account-a"]);
});

test("adoption conflict stays gated with its owner and cannot bind the account", async () => {
  const harness = providerHarness();
  harness.requireSetup();
  harness.createConflict();
  await harness.settle();
  await harness.render().chooseAdoption();
  assert.equal(harness.render().phase, "conflict");
  assert.equal(harness.render().ownerUserId, "account-a");
  assert.equal(harness.render().services, null);
  assert.deepEqual(harness.writes, []);
  harness.authenticate(signedIn("account-b"));
  assert.equal(harness.render().phase, "checking");
});

test("canonical provider subtree has an identity key so React cannot reuse A state for B", () => {
  let owner = "account-a";
  const module = { exports: {} as { AppProviders: (props: { children: null }) => ReactElement } };
  const source = readFileSync(new URL("../../src/providers/AppProviders.tsx", import.meta.url), "utf8");
  runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText, {
    module, exports: module.exports,
    require: (id: string) => {
      if (id === "react/jsx-runtime") return require(id);
      if (id.endsWith("/AccountDataContext")) return { useAccountData: () => ({ ownerUserId: owner, services: { owner } }), AccountDataProvider: "account-provider" };
      if (id.endsWith("/AuthDataBoundary")) return { default: "boundary" };
      return new Proxy({}, { get: (_target, name) => String(name) });
    },
  });
  function canonicalElement() {
    const tree = module.exports.AppProviders({ children: null });
    const account = (tree.props as { children: ReactElement }).children;
    const boundary = (account.props as { children: ReactElement }).children;
    const canonical = (boundary.props as { children: ReactElement }).children;
    return (canonical.type as (props: object) => ReactElement)(canonical.props as object);
  }
  const a = canonicalElement();
  owner = "account-b";
  const b = canonicalElement();
  assert.equal(a.key, "account-a");
  assert.equal(b.key, "account-b");
  assert.notEqual(a.key, b.key);
});
