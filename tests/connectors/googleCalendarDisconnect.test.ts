import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { createRequire } from "node:module";
import { runInNewContext } from "node:vm";
import type { ReactElement } from "react";
import ts from "typescript";
import { AtlasConnectorRegistry } from "../../src/atlas/connectors/registry.ts";
import { GoogleCalendarConnector } from "../../src/connectors/googleCalendar/googleCalendarConnector.ts";
import { parseGoogleCalendarCallback, type GoogleCalendarCommand, type GoogleCalendarResponse, type GoogleCalendarConnection, type GoogleCalendarReadModel } from "../../src/connectors/googleCalendar/types.ts";
import { revokeGoogleToken, GOOGLE_REVOKE_ENDPOINT, GOOGLE_CALENDAR_WRITE_SCOPE } from "../../supabase/functions/google-calendar/googleApi.ts";
import { disconnectGoogleCalendar, type DisconnectDependencies } from "../../supabase/functions/google-calendar/disconnect.ts";
import { disconnectMessage, parseDisconnectOutcome, GOOGLE_CONNECTIONS_RECOVERY_URL, type GoogleRevocation } from "../../src/connectors/googleCalendar/disconnectOutcome.ts";
import { parseGoogleCalendarResponse } from "../../src/connectors/googleCalendar/types.ts";
import { createGoogleCalendarHandler } from "../../supabase/functions/google-calendar/handler.ts";
import { calendarEventFingerprint, type CalendarEventPayload } from "../../src/connectors/calendar/eventProposal.ts";
import { insertApprovedGoogleEvent } from "../../supabase/functions/google-calendar/createEvent.ts";

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(done => { resolve = done; });
  return { promise, resolve };
}

for (const [status, expected] of [[200, "confirmed"], [204, "unknown"], [302, "unknown"], [400, "rejected"], [401, "rejected"], [403, "rejected"], [429, "rejected"], [500, "unknown"], [503, "unknown"]] as const) {
  test(`Google revocation HTTP ${status} is ${expected}, never inferred from a body`, async () => {
    const fetcher: typeof fetch = async () => {
      const response = new Response(status === 204 ? null : "private vendor error and token", { status });
      response.json = async () => { throw new Error("must not read vendor body"); };
      response.text = async () => { throw new Error("must not read vendor body"); };
      return response;
    };
    assert.equal(await revokeGoogleToken(fetcher, "synthetic-secret"), expected);
  });
}

test("revoke uses bounded POST form, no credential query, no redirects or logging", async () => {
  const signal = new AbortController().signal;
  const fetcher: typeof fetch = async (url, init) => {
    assert.equal(url, GOOGLE_REVOKE_ENDPOINT);
    assert.equal(new URL(String(url)).search, "");
    assert.equal(init?.method, "POST");
    assert.equal(init?.redirect, "error");
    assert.equal(init?.signal, signal);
    assert.equal((init?.body as URLSearchParams).get("token"), "synthetic-secret");
    assert.deepEqual(init?.headers, { "Content-Type": "application/x-www-form-urlencoded" });
    return new Response(null, { status: 200 });
  };
  assert.equal(await revokeGoogleToken(fetcher, "synthetic-secret", signal), "confirmed");
});

for (const error of [new DOMException("private timeout", "TimeoutError"), new TypeError("private network failure")]) {
  test(`${error.name} remains unknown without propagating an error`, async () => {
    assert.equal(await revokeGoogleToken(async () => { throw error; }, "synthetic-secret"), "unknown");
  });
}

test("empty credential never invokes Google", async () => {
  assert.equal(await revokeGoogleToken(async () => { throw new Error("must not call"); }, "  "), "unknown");
});

function dependencies(overrides: Partial<DisconnectDependencies> = {}): DisconnectDependencies {
  return {
    retire: async () => ({ operationId: "operation-a", kind: "retired", revocation: "unknown", accessCiphertext: "encrypted-access", refreshCiphertext: "encrypted-refresh" }),
    decrypt: async () => "synthetic-token",
    revoke: async () => "confirmed",
    finish: async () => true,
    ...overrides,
  };
}

test("local retirement precedes decryption and Google; expired credentials are not refreshed", async () => {
  const calls: string[] = [];
  const result = await disconnectGoogleCalendar("a", dependencies({
    retire: async owner => { calls.push(`retire:${owner}`); return { operationId: "attempt", kind: "retired", revocation: "unknown", refreshCiphertext: "cipher" }; },
    decrypt: async ciphertext => { assert.equal(ciphertext, "cipher"); calls.push("decrypt"); return "synthetic-token"; },
    revoke: async () => { calls.push("revoke"); return "confirmed"; },
    finish: async (owner, attempt, outcome) => { calls.push(`finish:${owner}:${attempt}:${outcome}`); return true; },
  }));
  assert.deepEqual(calls, ["retire:a", "decrypt", "revoke", "finish:a:attempt:confirmed"]);
  assert.deepEqual(result, { localAccessRemoved: true, googleRevocation: "confirmed", reason: "completed" });
});

for (const revocation of ["confirmed", "rejected", "unknown"] as const) {
  test(`${revocation} stays distinct after durable retirement`, async () => {
    const result = await disconnectGoogleCalendar("a", dependencies({ revoke: async () => revocation }));
    assert.equal(result.localAccessRemoved, true);
    assert.equal(result.googleRevocation, revocation);
    assert.equal(JSON.stringify(result).includes("token"), false);
    assert.equal(parseDisconnectOutcome(result).googleRevocation, revocation);
  });
}

test("retirement failure does not call Google or claim local removal", async () => {
  let called = false;
  const result = await disconnectGoogleCalendar("a", dependencies({ retire: async () => { throw new Error("private database failure"); }, revoke: async () => { called = true; return "confirmed"; } }));
  assert.deepEqual(result, { localAccessRemoved: false, googleRevocation: "not_attempted", reason: "retirement_failed" });
  assert.equal(called, false);
});

for (const mode of ["missing", "empty", "corrupt"] as const) {
  test(`${mode} credential is retired, but Google revocation remains unknown`, async () => {
    let called = false;
    const result = await disconnectGoogleCalendar("a", dependencies({
      retire: async () => ({ operationId: "attempt", kind: "retired", revocation: "unknown", ...(mode === "missing" ? {} : { accessCiphertext: "cipher" }) }),
      decrypt: async () => { if (mode === "corrupt") throw new Error("private ciphertext"); return " "; },
      revoke: async () => { called = true; return "confirmed"; },
    }));
    assert.deepEqual(result, { localAccessRemoved: true, googleRevocation: "unknown", reason: "credential_unavailable" });
    assert.equal(called, false);
  });
}

for (const finish of [async () => false, async (): Promise<boolean> => { throw new Error("private failure"); }]) {
  test("outcome persistence failure preserves the confirmed Google and local facts", async () => {
    const result = await disconnectGoogleCalendar("a", dependencies({ finish }));
    assert.deepEqual(result, { localAccessRemoved: true, googleRevocation: "confirmed", reason: "outcome_unrecorded" });
  });
}

test("unexpected revocation exception remains unknown after retirement", async () => {
  const result = await disconnectGoogleCalendar("a", dependencies({ revoke: async () => { throw new Error("private upstream failure"); } }));
  assert.equal(result.localAccessRemoved, true);
  assert.equal(result.googleRevocation, "unknown");
});

for (const kind of ["no_connection", "in_progress", "settled"] as const) {
  test(`${kind} does not send another revocation or write a completion`, async () => {
    const result = await disconnectGoogleCalendar("a", dependencies({
      retire: async () => ({ operationId: "attempt", kind, revocation: "unknown" }),
      decrypt: async () => { throw new Error("must not decrypt"); },
      revoke: async () => { assert.fail("must not re-send"); },
      finish: async () => { assert.fail("must not overwrite"); },
    }));
    assert.equal(result.localAccessRemoved, true);
    assert.equal(result.googleRevocation, "unknown");
  });
}

test("concurrent disconnects use the durable retirement claim, not an isolate-local mutex", async () => {
  let retired = false;
  let revocations = 0;
  const gate = deferred<GoogleRevocation>();
  const deps = dependencies({
    retire: async () => {
      if (retired) return { operationId: "one", kind: "in_progress", revocation: "unknown" };
      retired = true;
      return { operationId: "one", kind: "retired", revocation: "unknown", accessCiphertext: "cipher" };
    },
    revoke: async () => { revocations++; return gate.promise; },
  });
  const first = disconnectGoogleCalendar("a", deps);
  const second = await disconnectGoogleCalendar("a", deps);
  assert.equal(second.reason, "in_progress");
  assert.equal(revocations, 1);
  gate.resolve("confirmed");
  assert.equal((await first).googleRevocation, "confirmed");
});

test("authenticated handler never accepts a caller-supplied owner for disconnect", async () => {
  const owners: string[] = [];
  const base = async () => ({ status: "disconnected" as const });
  const handler = createGoogleCalendarHandler({ authenticate: async token => token === "valid-b" ? { userId: "b" } : null, status: base, begin: base, complete: base, read: base, disconnect: async owner => { owners.push(owner); return { status: "disconnected", disconnectOutcome: await disconnectGoogleCalendar(owner, dependencies()) }; } });
  const request = (body: object, token = "valid-b") => new Request("https://synthetic.test", { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: JSON.stringify(body) });
  assert.equal((await handler(request({ action: "disconnect", userId: "a" }))).status, 400);
  assert.equal((await handler(request({ action: "disconnect" }, "expired"))).status, 401);
  const response = await handler(request({ action: "disconnect" }));
  assert.equal(response.status, 200);
  assert.deepEqual(owners, ["b"]);
  assert.equal(parseGoogleCalendarResponse(await response.json()).status, "disconnected");
});

test("response parser rejects credentials and impossible local-success claims", () => {
  for (const outcome of [
    { localAccessRemoved: false, googleRevocation: "confirmed", reason: "completed" },
    { localAccessRemoved: true, googleRevocation: "confirmed", reason: "in_progress" },
    { localAccessRemoved: true, googleRevocation: "unknown", reason: "completed", token: "private" },
  ]) assert.throws(() => parseGoogleCalendarResponse({ status: "disconnected", disconnectOutcome: outcome }));
});

test("UI distinguishes confirmed, locally removed, no connection and failed retirement", () => {
  assert.match(disconnectMessage({ localAccessRemoved: true, googleRevocation: "confirmed", reason: "completed" }), /Google confirmed/);
  assert.match(disconnectMessage({ localAccessRemoved: true, googleRevocation: "unknown", reason: "completed" }), /could not be confirmed/);
  assert.match(disconnectMessage({ localAccessRemoved: true, googleRevocation: "rejected", reason: "completed" }), /could not be confirmed/);
  assert.match(disconnectMessage({ localAccessRemoved: true, googleRevocation: "confirmed", reason: "no_connection" }), /not new confirmation/);
  assert.match(disconnectMessage({ localAccessRemoved: false, googleRevocation: "not_attempted", reason: "retirement_failed" }), /couldn't complete/);
  assert.equal(GOOGLE_CONNECTIONS_RECOVERY_URL, "https://myaccount.google.com/connections");
});

const source = (path: string) => readFileSync(new URL(`../../${path}`, import.meta.url), "utf8");
test("SQL fence is server-only, atomic and leaves approval/audit/canonical tables untouched", () => {
  const sql = source("supabase/migrations/20261017000000_google_calendar_disconnect_fence.sql");
  assert.match(sql, /force row level security/);
  assert.match(sql, /revoke all on public\.google_calendar_connection_lifecycle from public, anon, authenticated/);
  assert.match(sql, /revoke all on public\.google_calendar_connections,public\.google_calendar_oauth_states,\s*public\.google_calendar_connection_lifecycle from public,anon,authenticated,service_role/);
  assert.equal((sql.match(/pg_advisory_xact_lock/g) ?? []).length, 5);
  assert.doesNotMatch(sql, /(?:insert into|update|delete from|alter table) public\.(execution_records|google_calendar_event_approvals|tasks|life_goals)/);
  assert.equal((sql.match(/security definer set search_path=''/g) ?? []).length, 7);
  assert.doesNotMatch(sql, /grant .* to (?:anon|authenticated)/i);
  assert.match(sql, /where user_id=p_user_id and generation=p_operation_id and phase='disconnecting'/);
});

test("refresh cannot insert a deleted authorization; callback requires unexpired matching generation/state", () => {
  const sql = source("supabase/migrations/20261017000000_google_calendar_disconnect_fence.sql");
  assert.match(sql, /r\.generation is distinct from p_authorization_id then return false/);
  assert.match(sql, /s\.generation is distinct from r\.generation or s\.expires_at<=now\(\)/);
  assert.match(sql, /state_hash=p_state_hash and user_id=p_user_id;/);
  assert.match(sql, /where user_id=p_user_id and authorization_id=p_authorization_id/);
  assert.match(sql, /if r\.phase='disconnecting' then raise exception 'disconnect_in_progress'/);
});

test("PKCE completion preserves least privilege and serializes state consumption without a row lock", () => {
  const sql = source("supabase/migrations/20261017000000_google_calendar_disconnect_fence.sql");
  const store = sql.slice(sql.indexOf("create function public.store_google_calendar_connection"), sql.indexOf("create function public.retire_google_calendar_connection"));
  assert.match(store, /pg_advisory_xact_lock\(hashtextextended\(p_user_id::text,17003\)\)[\s\S]*select \* into s[\s\S]*delete from public\.google_calendar_oauth_states where user_id=p_user_id;/);
  assert.doesNotMatch(store, /select \* into s[^;]*for update/i);
  assert.match(store, /where user_id=p_user_id for update/);
  assert.match(source("supabase/migrations/20261005000000_google_calendar_server_permissions.sql"), /grant select, insert, delete on table public\.google_calendar_oauth_states to service_role/);
  assert.doesNotMatch(sql, /grant[^;]*update[^;]*on (?:table )?public\.google_calendar_oauth_states/i);
});

test("abandoned attempt settles only as unknown, never retries a removed credential", () => {
  const sql = source("supabase/migrations/20261017000000_google_calendar_disconnect_fence.sql");
  assert.match(sql, /r\.started_at < now\(\)-interval '60 seconds'/);
  assert.match(sql, /phase='disconnected',revocation='unknown'/);
});

test("server integration no longer refreshes to disconnect or upserts stale tokens", () => {
  const server = source("supabase/functions/google-calendar/index.ts");
  assert.doesNotMatch(server, /\.upsert\(/);
  const disconnect = server.slice(server.indexOf("disconnect: async"));
  assert.doesNotMatch(disconnect, /validTokens|refreshGoogleToken|console\./);
  assert.match(disconnect, /retire_google_calendar_connection/);
  assert.match(server, /rpc\("forget_revoked_google_calendar_connection", \{ p_user_id: userId, p_authorization_id: authorizationId \}\)/);
  assert.doesNotMatch(server, /\.from\("google_calendar_(?:connections|oauth_states|connection_lifecycle)"\)/);
  assert.match(server, /await assertCurrentConnection\(userId, current.authorizationId\)/);
});

test("disconnect modules cannot log credentials or mutate XP/history/journals", () => {
  const module = source("supabase/functions/google-calendar/disconnect.ts");
  assert.doesNotMatch(module, /console\.|execution_records|xpAwarded|google_calendar_event_approvals/);
  const ui = source("src/pages/Settings.tsx");
  assert.match(ui, /role="status" aria-live="polite"/);
  assert.match(ui, /GOOGLE_CONNECTIONS_RECOVERY_URL/);
  assert.match(ui, /No Google events will be deleted/);
});

/** Actual React provider source with deterministic hooks and mock authenticated
 * transport. No browser storage, Google, Supabase or canonical writes. */
function calendarProviderHarness(owner: string) {
  const require = createRequire(import.meta.url);
  let cursor = 0;
  let unmounted = false;
  let lateUpdates = 0;
  const slots: unknown[] = [];
  const effects = new Map<number, { deps: readonly unknown[]; cleanup?: () => void }>();
  const pending: (() => void)[] = [];
  const calls: string[] = [];
  const navigations: string[] = [];
  let responder: (command: GoogleCalendarCommand) => Promise<GoogleCalendarResponse> = async () => ({ status: "connected", accountLabel: owner, calendars: [], events: [] });
  const client = { functions: { invoke: async (_name: string, input: { body: GoogleCalendarCommand }) => {
    calls.push(input.body.action);
    return { data: await responder(input.body), error: null };
  } } };
  function memo(factory: () => unknown, deps: readonly unknown[]) {
    const index = cursor++;
    const cached = slots[index] as { deps: readonly unknown[]; value: unknown } | undefined;
    if (!cached || deps.some((dep, i) => !Object.is(dep, cached.deps[i]))) slots[index] = { deps, value: factory() };
    return (slots[index] as { value: unknown }).value;
  }
  const hooks = {
    createContext: () => ({ Provider: "mock-calendar-context" }),
    useState: (initial: unknown) => {
      const index = cursor++;
      if (!(index in slots)) slots[index] = initial;
      return [slots[index], (next: unknown) => { if (unmounted) lateUpdates++; else slots[index] = next; }];
    },
    useRef: (initial: unknown) => {
      const index = cursor++;
      if (!(index in slots)) slots[index] = { current: initial };
      return slots[index];
    },
    useMemo: memo,
    useCallback: (fn: unknown, deps: readonly unknown[]) => memo(() => fn, deps),
    useEffect: (fn: () => void | (() => void), deps: readonly unknown[]) => {
      const index = cursor++;
      const previous = effects.get(index);
      if (previous && deps.every((dep, i) => Object.is(dep, previous.deps[i]))) return;
      pending.push(() => {
        previous?.cleanup?.();
        const cleanup = fn();
        effects.set(index, { deps, ...(cleanup ? { cleanup } : {}) });
      });
    },
  };
  interface Value {
    connection: GoogleCalendarConnection;
    readModel: GoogleCalendarReadModel;
    refresh(): Promise<void>;
    disconnect(): Promise<void>;
    connect(): Promise<void>;
  }
  const module = { exports: {} as { GoogleCalendarProvider: (props: object) => ReactElement<{ value: Value }> } };
  runInNewContext(ts.transpileModule(source("src/connectors/googleCalendar/GoogleCalendarContext.tsx"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText, {
    module, exports: module.exports, crypto, AbortSignal, Intl, Date,
    location: { origin: "http://localhost:5173", pathname: "/", search: "", assign: (url: string) => navigations.push(url) },
    require: (id: string) => {
      if (id === "react") return hooks;
      if (id.endsWith("/AuthContext")) return { useAuth: () => ({ phase: "signed-in", identity: { userId: owner } }) };
      if (id.endsWith("/supabaseClient")) return { supabaseClient: client };
      if (id.endsWith("/registry")) return { AtlasConnectorRegistry };
      if (id === "./googleCalendarConnector") return { GoogleCalendarConnector };
      if (id === "./types") return { parseGoogleCalendarResponse, parseGoogleCalendarCallback };
      if (id.endsWith("/eventProposal")) return {};
      if (id.endsWith("/approvalRecovery")) return { browserCalendarApprovalRecovery: () => ({ load: async () => null }) };
      return require(id);
    },
  });
  const render = () => { cursor = 0; return module.exports.GoogleCalendarProvider({ children: null, client }).props.value; };
  const settle = async () => {
    for (let i = 0; i < 30; i++) { render(); pending.splice(0).forEach(fn => fn()); await Promise.resolve(); }
    return render();
  };
  return {
    render, settle, calls, navigations,
    respond: (next: typeof responder) => { responder = next; },
    unmount: () => { unmounted = true; effects.forEach(effect => effect.cleanup?.()); },
    lateUpdates: () => lateUpdates,
  };
}

test("duplicate UI disconnect clicks dispatch exactly once and stop reads/reconnect until settled", async () => {
  const h = calendarProviderHarness("a");
  assert.equal((await h.settle()).connection.state, "connected");
  const gate = deferred<GoogleCalendarResponse>();
  h.respond(async () => gate.promise);
  const start = h.calls.length;
  const first = h.render().disconnect();
  await h.render().disconnect();
  await h.render().refresh();
  await h.render().connect();
  assert.deepEqual(h.calls.slice(start), ["disconnect"]);
  assert.equal(h.render().readModel.events.length, 0);
  gate.resolve({ status: "disconnected", disconnectOutcome: { localAccessRemoved: true, googleRevocation: "unknown", reason: "completed" } });
  await first;
  assert.equal(h.render().connection.state, "disconnected");
});

test("a read that completes after disconnect cannot resurrect connected UI", async () => {
  const h = calendarProviderHarness("a");
  await h.settle();
  const read = deferred<GoogleCalendarResponse>();
  h.respond(async command => command.action === "read" ? read.promise : { status: "disconnected" });
  const pending = h.render().refresh();
  await h.render().disconnect();
  read.resolve({ status: "connected", accountLabel: "stale-a", calendars: [], events: [] });
  await pending;
  assert.equal(h.render().connection.state, "disconnected");
  assert.equal(h.render().connection.accountLabel, undefined);
});

test("old consent-start response cannot navigate after disconnect invalidates it", async () => {
  const h = calendarProviderHarness("a");
  await h.settle();
  const begin = deferred<GoogleCalendarResponse>();
  h.respond(async command => command.action === "begin" ? begin.promise : { status: "disconnected" });
  const pending = h.render().connect();
  await h.render().disconnect();
  begin.resolve({ status: "authorization-required", authorizationUrl: "https://accounts.google.com/synthetic" });
  await pending;
  assert.deepEqual(h.navigations, []);
});

test("late disconnect cannot update an unmounted A provider or B's new provider", async () => {
  const a = calendarProviderHarness("a");
  await a.settle();
  const gate = deferred<GoogleCalendarResponse>();
  a.respond(async () => gate.promise);
  const pending = a.render().disconnect();
  a.unmount();
  const b = calendarProviderHarness("b");
  assert.equal((await b.settle()).connection.accountLabel, "b");
  gate.resolve({ status: "disconnected" });
  await pending;
  assert.equal(a.lateUpdates(), 0);
  assert.equal(b.render().connection.accountLabel, "b");
});

test("retirement failure UI does not pretend it is disconnected", async () => {
  const h = calendarProviderHarness("a");
  await h.settle();
  h.respond(async () => ({ status: "disconnected", disconnectOutcome: { localAccessRemoved: false, googleRevocation: "not_attempted", reason: "retirement_failed" } }));
  await h.render().disconnect();
  assert.equal(h.render().connection.state, "provider-failure");
  assert.equal(h.render().connection.disconnectOutcome?.localAccessRemoved, false);
});

test("client transport uncertainty does not leave cached Google events usable", async () => {
  const h = calendarProviderHarness("a");
  await h.settle();
  h.respond(async () => { throw new Error("private network details"); });
  await h.render().disconnect();
  assert.equal(h.render().connection.state, "network-failure");
  assert.equal(h.render().readModel.events.length, 0);
  assert.doesNotMatch(h.render().connection.safeError ?? "", /private/);
});

test("disconnect during asynchronous calendar validation blocks the approved event POST", async () => {
  const payload: CalendarEventPayload = { calendarId: "test@example.test", title: "Synthetic event", start: "2026-10-10", end: "2026-10-11", allDay: true, timezone: "UTC" };
  const calendar = deferred<Response>();
  let active = true;
  let requests = 0;
  const pending = insertApprovedGoogleEvent(async () => { requests++; return calendar.promise; }, {
    accessToken: "synthetic-token", scopes: [GOOGLE_CALENDAR_WRITE_SCOPE], payload, eventId: "abcdef0123456789", fingerprint: await calendarEventFingerprint(payload),
    assertAuthorization: async () => { if (!active) throw new Error("authorization_revoked"); },
  });
  await Promise.resolve();
  active = false;
  calendar.resolve(new Response(JSON.stringify({ id: payload.calendarId, summary: "Synthetic calendar", accessRole: "owner" })));
  await assert.rejects(pending, /authorization_revoked/);
  assert.ok(requests <= 1, "no Google event POST after the authorization was retired");
});

test("already-retired authorization fails before any approved-create transport call", async () => {
  const payload: CalendarEventPayload = { calendarId: "test@example.test", title: "Synthetic event", start: "2026-10-10", end: "2026-10-11", allDay: true, timezone: "UTC" };
  let calls = 0;
  await assert.rejects(insertApprovedGoogleEvent(async () => { calls++; return new Response(); }, {
    accessToken: "synthetic-token", scopes: [GOOGLE_CALENDAR_WRITE_SCOPE], payload, eventId: "abcdef0123456789", fingerprint: await calendarEventFingerprint(payload),
    assertAuthorization: async () => { throw new Error("authorization_revoked"); },
  }), /authorization_revoked/);
  assert.equal(calls, 0);
});

test("unrecorded outcome wording does not claim final saved status is verified", () => {
  assert.match(disconnectMessage({ localAccessRemoved: true, googleRevocation: "confirmed", reason: "outcome_unrecorded" }), /couldn't verify its final saved status/);
  assert.throws(() => parseDisconnectOutcome({ localAccessRemoved: true, googleRevocation: "not_attempted", reason: "completed" }));
  const server = source("supabase/functions/google-calendar/index.ts").split("disconnect: async")[1]!;
  assert.doesNotMatch(server, /requireConfiguration\(\)/);
});
