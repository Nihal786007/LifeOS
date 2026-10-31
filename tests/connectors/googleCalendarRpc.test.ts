import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { runInNewContext } from "node:vm";
import test from "node:test";
import ts from "typescript";
import { GOOGLE_CALENDAR_WRITE_SCOPE } from "../../supabase/functions/google-calendar/googleApi.ts";
import { calendarEventFingerprint } from "../../src/connectors/calendar/eventProposal.ts";

const source = (path: string) => readFileSync(new URL(`../../${path}`, import.meta.url), "utf8");
const A = "11111111-1111-4111-8111-111111111111";
const authorization = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const redirect = "http://localhost/synthetic-callback";

/** Execute the actual Edge entrypoint. All database/Google transport is synthetic;
 * unexpected transport (including raw protected-table access) fails the test. */
function harness() {
  const require = createRequire(import.meta.url);
  const calls: { name: string; args: Record<string, unknown> }[] = [];
  let row: Record<string, unknown> | null = {
    authorization_id: authorization, access_token_ciphertext: "cipher:synthetic-access",
    refresh_token_ciphertext: "cipher:synthetic-refresh", token_expires_at: "2099-01-01T00:00:00Z",
    account_label: "Synthetic calendar", granted_scopes: [GOOGLE_CALENDAR_WRITE_SCOPE],
  };
  let state: Record<string, unknown> | null = null;
  let googleCalls = 0;
  let refreshes = 0;
  let writes = 0;
  let googleFailure = false;
  let staleRefresh = false;
  let databaseFailure = false;
  let completed = false;
  let accountLabel = "Synthetic calendar";
  let handler!: (request: Request) => Promise<Response>;
  const rpc = async (name: string, args: Record<string, unknown>) => {
    calls.push({ name, args });
    assert.equal(args.p_user_id, A);
    if (databaseFailure) return { data: null, error: { code: "42501", message: "PRIVATE_DATABASE_DETAIL" } };
    let data: unknown;
    switch (name) {
      case "read_google_calendar_connection": data = { connection: row, lifecycle: { phase: row ? "active" : "disconnected", revocation: "unknown" } }; break;
      case "begin_google_calendar_oauth": state = { verifier_ciphertext: args.p_verifier, redirect_uri: args.p_redirect, expires_at: args.p_expires }; data = null; break;
      case "read_google_calendar_oauth_state": data = state; break;
      case "store_google_calendar_connection":
        data = staleRefresh ? false : args.p_state_hash ? state !== null : args.p_authorization_id === authorization;
        if (data === true && args.p_state_hash) state = null;
        if (data === true) row = { authorization_id: authorization, access_token_ciphertext: args.p_access, refresh_token_ciphertext: args.p_refresh, token_expires_at: args.p_expires, account_label: args.p_label, granted_scopes: args.p_scopes };
        break;
      case "forget_revoked_google_calendar_connection": assert.equal(args.p_authorization_id, authorization); row = null; data = true; break;
      case "retire_google_calendar_connection": row = null; data = { operationId: authorization, kind: "retired", revocation: "unknown", accessCiphertext: "cipher:synthetic-access" }; break;
      case "finish_google_calendar_disconnect": data = true; break;
      case "claim_google_calendar_creation": data = completed ? "completed" : "claimed"; break;
      case "finish_google_calendar_creation": completed = true; data = "synthetic-audit"; break;
      default: assert.fail(`Unexpected RPC ${name}`);
    }
    return { data, error: null };
  };
  const event = { provider: "google-calendar", externalId: "synthetic-event", calendarId: "synthetic-calendar", calendarName: "Synthetic calendar", title: "Synthetic event", start: { dateTime: "2026-10-20T10:00:00Z" }, end: { dateTime: "2026-10-20T11:00:00Z" }, allDay: false };
  const database = {
    auth: { getUser: async (token: string) => ({ data: { user: token === "synthetic-valid" ? { id: A } : null }, error: null }) }, rpc,
    from: (table: string) => {
      assert.equal(table, "google_calendar_event_approvals", "Raw protected access is forbidden");
      const query = { select: () => query, eq: () => query, single: async () => ({ data: { event_id: "synthetic-event", audit_row_id: "synthetic-audit", event_receipt: completed ? event : null, calendar_id: "synthetic-calendar" }, error: null }), insert: async (value: Record<string, unknown>) => { assert.equal(value.user_id, A); return { error: null }; } };
      return query;
    },
  };
  const google = require("../../supabase/functions/google-calendar/googleApi.ts") as typeof import("../../supabase/functions/google-calendar/googleApi.ts");
  const creation = require("../../supabase/functions/google-calendar/createEvent.ts") as typeof import("../../supabase/functions/google-calendar/createEvent.ts");
  runInNewContext(ts.transpileModule(source("supabase/functions/google-calendar/index.ts"), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, {
    exports: {}, crypto, Date, Error, btoa, TextEncoder, Uint8Array,
    fetch: () => { assert.fail("No real network permitted"); },
    Deno: { env: { get: (key: string) => key === "GOOGLE_CALENDAR_REDIRECT_URIS" ? redirect : "SYNTHETIC_CONFIG" }, serve: (value: typeof handler) => { handler = value; } },
    require: (id: string) => {
      if (id.startsWith("npm:")) return { createClient: () => database };
      if (id === "./vault.ts") return { encryptConnectorSecret: async (value: string) => `cipher:${value}`, decryptConnectorSecret: async (value: string) => value.replace(/^cipher:/, ""), sha256Base64Url: async (value: string) => `hash-${value}` };
      if (id === "./googleApi.ts") return { ...google,
        readGoogleCalendarData: async () => { googleCalls++; if (googleFailure) throw new Error("authorization_revoked"); return { accountLabel, calendars: [{ provider: "google-calendar", externalId: "synthetic-calendar", name: "Synthetic calendar", accessRole: "owner", primary: true }], events: [] }; },
        exchangeGoogleCode: async () => { googleCalls++; return { accessToken: "synthetic-new", refreshToken: "synthetic-refresh", expiresAt: "2099-01-01T00:00:00Z", scopes: [GOOGLE_CALENDAR_WRITE_SCOPE] }; },
        refreshGoogleToken: async () => { refreshes++; return { accessToken: "synthetic-refreshed", refreshToken: "synthetic-refresh", expiresAt: "2099-01-01T00:00:00Z", scopes: [GOOGLE_CALENDAR_WRITE_SCOPE] }; },
        revokeGoogleToken: async () => { googleCalls++; return "confirmed"; },
      };
      if (id === "./createEvent.ts") return { ...creation, insertApprovedGoogleEvent: async () => { writes++; return event; } };
      return require(new URL(`../../supabase/functions/google-calendar/${id}`, import.meta.url).pathname.replace(/^\/(.:)/, "$1"));
    },
  });
  return {
    calls, setLabel: () => { accountLabel = "Synthetic updated label"; }, setExpired: () => { row!.token_expires_at = "2000-01-01T00:00:00Z"; }, failGoogle: () => { googleFailure = true; }, failDatabase: () => { databaseFailure = true; }, staleRefresh: () => { staleRefresh = true; },
    counts: () => ({ googleCalls, refreshes, writes }),
    request: async (body: object, token = "synthetic-valid") => {
      const response = await handler(new Request("https://synthetic.invalid", { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: JSON.stringify(body) }));
      const value = await response.json();
      assert.doesNotMatch(JSON.stringify(value), /cipher:|synthetic-access|synthetic-refresh|synthetic-valid|PRIVATE_DATABASE_DETAIL|access_token_ciphertext/);
      return { status: response.status, value };
    },
  };
}

test("actual Edge status and read use RPC-only credential access and verified owner", async () => {
  const h = harness();
  assert.equal((await h.request({ action: "status" })).value.status, "connected");
  assert.equal((await h.request({ action: "read", windowStart: "2026-10-20T00:00:00Z", windowEnd: "2026-10-21T00:00:00Z", timezone: "UTC" })).value.status, "connected");
  assert.ok(h.calls.every(call => call.args.p_user_id === A));
  assert.equal(h.counts().googleCalls, 2);
});

test("actual Edge rejects expired JWT and browser-supplied owner before RPC access", async () => {
  const h = harness();
  assert.equal((await h.request({ action: "status" }, "expired")).status, 401);
  assert.equal((await h.request({ action: "status", userId: "forged" })).status, 400);
  assert.equal(h.calls.length, 0);
});

test("actual Edge OAuth initiation and completion preserve encrypted PKCE and consume once", async () => {
  const h = harness();
  assert.equal((await h.request({ action: "begin", redirectUri: redirect })).value.status, "authorization-required");
  const callback = { action: "complete", redirectUri: redirect, code: "synthetic-code", state: "synthetic-state" };
  assert.equal((await h.request(callback)).value.status, "connected");
  const count = h.counts().googleCalls;
  assert.equal((await h.request(callback)).value.status, "expired");
  assert.equal(h.counts().googleCalls, count);
  assert.ok(h.calls.some(call => call.name === "store_google_calendar_connection" && call.args.p_state_hash === "hash-synthetic-state"));
});

test("actual Edge safe refresh is conditional; stale refresh never reaches Calendar read", async () => {
  const h = harness(); h.setExpired();
  assert.equal((await h.request({ action: "status" })).value.status, "connected");
  assert.equal(h.counts().refreshes, 1);
  assert.ok(h.calls.some(call => call.name === "store_google_calendar_connection" && call.args.p_authorization_id === authorization && call.args.p_state_hash === null));
  const stale = harness(); stale.setExpired(); stale.staleRefresh();
  assert.equal((await stale.request({ action: "status" })).value.status, "revoked");
  assert.equal(stale.counts().googleCalls, 0);
});

test("actual Edge revoked read retires only exact authorization through cleanup RPC", async () => {
  const h = harness(); h.failGoogle();
  assert.equal((await h.request({ action: "status" })).value.status, "revoked");
  assert.ok(h.calls.some(call => call.name === "forget_revoked_google_calendar_connection" && call.args.p_authorization_id === authorization));
  assert.equal((await h.request({ action: "status" })).value.status, "disconnected");
});

test("actual Edge disconnect uses retirement/finalizer RPCs and never leaks encrypted results", async () => {
  const h = harness();
  const response = await h.request({ action: "disconnect" });
  assert.equal(response.value.disconnectOutcome.googleRevocation, "confirmed");
  assert.deepEqual(h.calls.map(call => call.name), ["retire_google_calendar_connection", "finish_google_calendar_disconnect"]);
});

test("actual Edge reconnect after retirement uses new PKCE and restores authorized reads", async () => {
  const h = harness();
  assert.equal((await h.request({ action: "disconnect" })).value.status, "disconnected");
  assert.equal((await h.request({ action: "status" })).value.status, "disconnected");
  await h.request({ action: "begin", redirectUri: redirect });
  assert.equal((await h.request({ action: "complete", redirectUri: redirect, code: "synthetic-code", state: "synthetic-state" })).value.status, "connected");
  assert.equal((await h.request({ action: "status" })).value.status, "connected");
});

test("actual Edge account-label updates retain conditional authorization fencing", async () => {
  const h = harness(); h.setLabel();
  assert.equal((await h.request({ action: "status" })).value.accountLabel, "Synthetic updated label");
  const save = h.calls.find(call => call.name === "store_google_calendar_connection");
  assert.equal(save?.args.p_authorization_id, authorization);
  assert.equal(save?.args.p_state_hash, null);
});

test("actual Edge preserves exact-approved create, receipt retry and single mock dispatch", async () => {
  const h = harness();
  const payload = { calendarId: "synthetic-calendar", title: "Synthetic event", allDay: false, start: "2026-10-20T10:00:00Z", end: "2026-10-20T11:00:00Z", timezone: "UTC" };
  const prepare = await h.request({ action: "prepare", payload });
  assert.equal(prepare.value.status, "connected");
  const command = { action: "create", payload, approvalId: "ffffffff-ffff-4fff-8fff-ffffffffffff", fingerprint: await calendarEventFingerprint(payload), approved: true };
  assert.equal((await h.request(command)).value.createdEvent.externalId, "synthetic-event");
  assert.equal((await h.request(command)).value.createdEvent.externalId, "synthetic-event");
  assert.equal(h.counts().writes, 1);
  assert.equal(h.calls.filter(call => call.name === "finish_google_calendar_creation").length, 1);
});

test("actual Edge fails closed on RPC permission failure without vendor details", async () => {
  const h = harness(); h.failDatabase();
  const response = await h.request({ action: "status" });
  assert.equal(response.status, 502);
  assert.equal(response.value.status, "provider-failure");
  assert.equal(h.counts().googleCalls, 0);
});

test("permanent SQL boundary rejects unreviewed owners, overloads and inherited raw access", () => {
  const sql = source("supabase/migrations/20261017000000_google_calendar_disconnect_fence.sql");
  for (const guard of ["calendar_rpc_owner_prerequisite", "calendar_rpc_caller_prerequisite", "calendar_rpc_signature_conflict", "calendar_table_owner_prerequisite", "calendar_raw_access_remains", "calendar_rpc_access_prerequisite"]) assert.ok(sql.includes(guard));
  assert.doesNotMatch(sql, /security invoker|execute format|alter default privileges|grant [^;]* on (?:table )?public\.[^;]* to service_role/i);
  assert.equal((sql.match(/grant execute on function/g) ?? []).length, 7);
  assert.equal((sql.match(/from public,anon,authenticated,service_role;/g) ?? []).length, 8);
  assert.match(sql, /l\.generation=c\.authorization_id and l\.phase='active'/);
  assert.match(sql, /s\.state_hash=p_state_hash and s\.expires_at>now\(\)/);
});
