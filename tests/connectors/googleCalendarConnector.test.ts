import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

import { AtlasConnectorRegistry, getConnectorCapabilityDefinition } from "../../src/atlas/connectors/registry.ts";
import { GoogleCalendarConnector } from "../../src/connectors/googleCalendar/googleCalendarConnector.ts";
import { eventOccursOnLocalDate, mapGoogleCalendar, mapGoogleCalendarEvent, sortExternalCalendarEvents } from "../../src/connectors/googleCalendar/mapping.ts";
import { parseGoogleCalendarCallback, parseGoogleCalendarResponse, type ExternalCalendar, type GoogleCalendarTransport } from "../../src/connectors/googleCalendar/types.ts";
import { buildGoogleAuthorizationUrl, GOOGLE_CALENDAR_SCOPES, MAX_WINDOW_DAYS, assertCalendarWindow, readGoogleCalendarData } from "../../supabase/functions/google-calendar/googleApi.ts";
import { createGoogleCalendarHandler } from "../../supabase/functions/google-calendar/handler.ts";
import { decryptConnectorSecret, encryptConnectorSecret } from "../../supabase/functions/google-calendar/vault.ts";

const calendar: ExternalCalendar = { provider: "google-calendar", externalId: "primary@example.com", name: "Primary", primary: true, selected: true, timezone: "Asia/Kolkata" };

test("registers only the three read-only Google Calendar capabilities", () => {
  for (const capability of ["calendar.accounts.read", "calendar.calendars.read", "calendar.events.read"] as const) {
    assert.deepEqual(getConnectorCapabilityDefinition(capability), { connectorId: "google-calendar", capability, operation: "read", permissionTier: "READ_ONLY", approvalRequired: false, enabledByDefault: true });
  }
});

test("authorization URL uses PKCE and only narrow read-only Calendar scopes", () => {
  const url = new URL(buildGoogleAuthorizationUrl({ clientId: "client", redirectUri: "http://localhost:5173/?lifeos_connector=google-calendar", state: "state", codeChallenge: "challenge" }));
  assert.equal(url.origin, "https://accounts.google.com");
  assert.equal(url.searchParams.get("code_challenge_method"), "S256");
  assert.equal(url.searchParams.get("access_type"), "offline");
  assert.deepEqual(url.searchParams.get("scope")?.split(" "), [...GOOGLE_CALENDAR_SCOPES]);
  assert.equal(url.searchParams.get("scope")?.includes("/auth/calendar "), false);
});

test("OAuth callback parsing distinguishes success, cancellation, and malformed callbacks", () => {
  assert.deepEqual(parseGoogleCalendarCallback("/google-calendar-callback", "?code=code&state=state"), { status: "complete", code: "code", state: "state" });
  assert.deepEqual(parseGoogleCalendarCallback("/google-calendar-callback", "?error=access_denied&state=state"), { status: "cancelled" });
  assert.deepEqual(parseGoogleCalendarCallback("/google-calendar-callback", "?code=code"), { status: "invalid" });
  assert.deepEqual(parseGoogleCalendarCallback("/", "?code=unrelated&state=unrelated"), { status: "none" });
});

test("calendar list mapping preserves useful metadata without raw Google objects", () => {
  assert.deepEqual(mapGoogleCalendar({ id: "primary@example.com", summary: "Calendar", summaryOverride: "My calendar", primary: true, selected: true, timeZone: "Asia/Kolkata", etag: "secret-noise" }), { provider: "google-calendar", externalId: "primary@example.com", name: "My calendar", primary: true, selected: true, timezone: "Asia/Kolkata" });
});

test("maps timed events without changing timestamps or timezones", () => {
  assert.deepEqual(mapGoogleCalendarEvent({ id: "event-1", summary: "Physics", start: { dateTime: "2026-09-24T10:00:00+05:30", timeZone: "Asia/Kolkata" }, end: { dateTime: "2026-09-24T11:00:00+05:30", timeZone: "Asia/Kolkata" }, location: "Lab", status: "confirmed" }, calendar), { provider: "google-calendar", externalId: "event-1", calendarId: calendar.externalId, calendarName: calendar.name, title: "Physics", start: { kind: "dateTime", dateTime: "2026-09-24T10:00:00+05:30", timezone: "Asia/Kolkata" }, end: { kind: "dateTime", dateTime: "2026-09-24T11:00:00+05:30", timezone: "Asia/Kolkata" }, allDay: false, location: "Lab", status: "confirmed" });
});

test("all-day dates remain date-only and do not shift through midnight", () => {
  const event = mapGoogleCalendarEvent({ id: "all-day", summary: "Holiday", start: { date: "2026-09-24" }, end: { date: "2026-09-26" } }, calendar)!;
  assert.equal(event.allDay, true);
  assert.equal(eventOccursOnLocalDate(event, "2026-09-24"), true);
  assert.equal(eventOccursOnLocalDate(event, "2026-09-25"), true);
  assert.equal(eventOccursOnLocalDate(event, "2026-09-26"), false);
});

test("timed date membership follows the device date while retaining provider timezone", () => {
  const event = mapGoogleCalendarEvent({ id: "late", summary: "Late call", start: { dateTime: "2026-09-24T23:30:00-04:00", timeZone: "America/New_York" }, end: { dateTime: "2026-09-25T00:00:00-04:00", timeZone: "America/New_York" } }, calendar)!;
  assert.equal(event.start.kind === "dateTime" ? event.start.timezone : null, "America/New_York");
  const local = new Date("2026-09-24T23:30:00-04:00");
  const key = [local.getFullYear(), String(local.getMonth() + 1).padStart(2, "0"), String(local.getDate()).padStart(2, "0")].join("-");
  assert.equal(eventOccursOnLocalDate(event, key), true);
});

test("events sort deterministically by start, title, then external identity", () => {
  const event = (id: string, title: string, dateTime: string) => mapGoogleCalendarEvent({ id, summary: title, start: { dateTime }, end: { dateTime: new Date(Date.parse(dateTime) + 3_600_000).toISOString() } }, calendar)!;
  assert.deepEqual(sortExternalCalendarEvents([event("b", "B", "2026-09-25T10:00:00Z"), event("a", "A", "2026-09-24T10:00:00Z")]).map((item) => item.externalId), ["a", "b"]);
});

test("event query rejects unbounded or invalid windows", () => {
  assert.doesNotThrow(() => assertCalendarWindow("2026-09-24T00:00:00Z", "2026-10-25T00:00:00Z"));
  assert.throws(() => assertCalendarWindow("2026-09-24T00:00:00Z", new Date(Date.parse("2026-09-24T00:00:00Z") + (MAX_WINDOW_DAYS + 1) * 86_400_000).toISOString()), /invalid_request/);
});

test("Google API read uses bounded list/event requests and returns normalized empty state", async () => {
  const urls: string[] = [];
  const fetcher: typeof fetch = async (input) => {
    urls.push(String(input));
    return new Response(JSON.stringify(urls.length === 1 ? { items: [{ id: "primary@example.com", summary: "Primary", primary: true, selected: true }] } : { items: [] }), { status: 200 });
  };
  const data = await readGoogleCalendarData(fetcher, { accessToken: "not-exposed", windowStart: "2026-09-24T00:00:00Z", windowEnd: "2026-10-01T00:00:00Z", timezone: "Asia/Kolkata" });
  assert.equal(data.events.length, 0);
  assert.match(urls[0]!, /calendarList/);
  assert.match(urls[1]!, /singleEvents=true/);
  assert.match(urls[1]!, /orderBy=startTime/);
});

test("registry blocks disconnected Google Calendar and permits connected reads", async () => {
  const transport: GoogleCalendarTransport = { request: async () => ({ status: "connected", accountLabel: "test@example.com", calendars: [], events: [] }) };
  const connector = new GoogleCalendarConnector(transport);
  const registry = new AtlasConnectorRegistry([connector]);
  const request = { version: "1.0.0" as const, requestId: "read", connectorId: "google-calendar" as const, capability: "calendar.events.read" as const, payload: { windowStart: "2026-09-24T00:00:00Z", windowEnd: "2026-09-25T00:00:00Z", timezone: "UTC" } };
  assert.equal((await registry.execute(request)).status, "unavailable");
  connector.setConnectionState("connected");
  assert.equal((await registry.execute(request)).status, "success");
});

test("client response parsing accepts normalized empty connected state", () => {
  assert.deepEqual(parseGoogleCalendarResponse({ status: "connected", accountLabel: "test@example.com", calendars: [], events: [] }), { status: "connected", accountLabel: "test@example.com", calendars: [], events: [] });
});

test("client response parsing rejects malformed and extra-field provider payloads", () => {
  assert.throws(() => parseGoogleCalendarResponse({ status: "connected", accountLabel: "test@example.com", calendars: "invalid", events: [] }), /invalid response/);
  assert.throws(() => parseGoogleCalendarResponse({ status: "disconnected", rawProviderToken: "must-not-pass" }), /invalid response/);
});

test("expired and revoked authorization remain unavailable without connector mutation", async () => {
  for (const status of ["expired", "revoked"] as const) {
    const connector = new GoogleCalendarConnector({ request: async () => ({ status, safeError: `Google Calendar authorization ${status}.` }) });
    connector.setConnectionState("connected");
    const result = await connector.execute({ version: "1.0.0", requestId: status, connectorId: "google-calendar", capability: "calendar.events.read", payload: { windowStart: "2026-09-24T00:00:00Z", windowEnd: "2026-09-25T00:00:00Z", timezone: "UTC" } });
    assert.equal(result.status, "unavailable");
  }
});

test("handler rejects unauthenticated and extra-field requests", async () => {
  const dependencies = { authenticate: async () => ({ userId: "user-a" }), status: async () => ({ status: "disconnected" as const }), begin: async () => ({ status: "disconnected" as const }), complete: async () => ({ status: "disconnected" as const }), read: async () => ({ status: "disconnected" as const }), disconnect: async () => ({ status: "disconnected" as const }) };
  const handler = createGoogleCalendarHandler(dependencies);
  assert.equal((await handler(new Request("https://example.test", { method: "POST", body: "{}" }))).status, 401);
  assert.equal((await handler(new Request("https://example.test", { method: "POST", headers: { Authorization: "Bearer token", "Content-Type": "application/json" }, body: JSON.stringify({ action: "status", extra: true }) }))).status, 400);
});

test("handler scopes every operation to the authenticated account", async () => {
  const users: string[] = [];
  const handler = createGoogleCalendarHandler({ authenticate: async (token) => ({ userId: token }), status: async (userId) => { users.push(userId); return { status: "disconnected" }; }, begin: async () => ({ status: "disconnected" }), complete: async () => ({ status: "disconnected" }), read: async () => ({ status: "disconnected" }), disconnect: async () => ({ status: "disconnected" }) });
  for (const user of ["user-a", "user-b"]) await handler(new Request("https://example.test", { method: "POST", headers: { Authorization: `Bearer ${user}`, "Content-Type": "application/json" }, body: JSON.stringify({ action: "status" }) }));
  assert.deepEqual(users, ["user-a", "user-b"]);
});

test("provider failures remain safe and do not break callers", async () => {
  const fail = async () => { throw new Error("private vendor response"); };
  const handler = createGoogleCalendarHandler({ authenticate: async () => ({ userId: "user-a" }), status: fail, begin: fail, complete: fail, read: fail, disconnect: fail });
  const response = await handler(new Request("https://example.test", { method: "POST", headers: { Authorization: "Bearer token", "Content-Type": "application/json" }, body: JSON.stringify({ action: "status" }) }));
  assert.equal(response.status, 502);
  assert.equal((await response.text()).includes("private vendor response"), false);
});

test("configuration and storage diagnostics expose only allowlisted failure codes", async () => {
  for (const code of ["google_client_id_missing", "connection_table_unavailable", "connection_table_permission_denied", "private-token-and-vendor-message"]) {
    const fail = async () => { throw new Error(code); };
    const handler = createGoogleCalendarHandler({ authenticate: async () => ({ userId: "test" }), status: fail, begin: fail, complete: fail, read: fail, disconnect: fail });
    const response = await handler(new Request("https://example.test", { method: "POST", headers: { Authorization: "Bearer token", "Content-Type": "application/json" }, body: JSON.stringify({ action: "status" }) }));
    const body = await response.json();
    assert.equal(response.status, 502);
    assert.equal(body.diagnosticCode, code.startsWith("private-") ? undefined : code);
    assert.equal(JSON.stringify(body).includes("private-token"), false);
  }
});

test("server credential encryption round-trips without storing plaintext", async () => {
  const key = Buffer.alloc(32, 7).toString("base64");
  const encrypted = await encryptConnectorSecret("refresh-token", key);
  assert.equal(encrypted.includes("refresh-token"), false);
  assert.equal(await decryptConnectorSecret(encrypted, key), "refresh-token");
});

test("server-only Calendar tables receive explicit least-required Data API grants", () => {
  const migration = readFileSync(new URL("../../supabase/migrations/20261005000000_google_calendar_server_permissions.sql", import.meta.url), "utf8");
  assert.match(migration, /grant select, insert, update, delete on table public\.google_calendar_connections to service_role;/);
  assert.match(migration, /grant select, insert, delete on table public\.google_calendar_oauth_states to service_role;/);
  assert.doesNotMatch(migration, /to (anon|authenticated)|disable row level security|no force row level security/i);
  const original = readFileSync(new URL("../../supabase/migrations/20260924000000_google_calendar_connector_v1.sql", import.meta.url), "utf8");
  assert.match(original, /revoke all on table public\.google_calendar_connections from anon, authenticated/);
  assert.match(original, /revoke all on table public\.google_calendar_oauth_states from anon, authenticated/);
});

test("external calendar model cannot become a Task or award XP", () => {
  const event = mapGoogleCalendarEvent({ id: "event", summary: "Class", start: { date: "2026-09-24" }, end: { date: "2026-09-25" } }, calendar)! as unknown as Record<string, unknown>;
  assert.equal("completed" in event, false);
  assert.equal("priority" in event, false);
  assert.equal("xpAwarded" in event, false);
});

test("client source never stores Google credentials or feeds events to ATLAS", () => {
  const context = readFileSync(new URL("../../src/connectors/googleCalendar/GoogleCalendarContext.tsx", import.meta.url), "utf8");
  assert.doesNotMatch(context, /localStorage|sessionStorage|provider_refresh_token|AtlasReasoningContext|useAtlasCanonicalState/);
  const providers = readFileSync(new URL("../../src/providers/AppProviders.tsx", import.meta.url), "utf8");
  assert.match(providers, /GoogleCalendarProvider/);
  assert.match(context, /auth\.identity/);
  assert.match(context, /setReadModel\(EMPTY_READ_MODEL\)/);
});
