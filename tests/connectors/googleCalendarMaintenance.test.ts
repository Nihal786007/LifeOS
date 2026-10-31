import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { googleCalendarMaintenanceHandler } from "../../supabase/functions/google-calendar/maintenance.ts";
import { executeCalendarCreation } from "../../supabase/functions/google-calendar/createEvent.ts";
import type { ExternalCalendarEvent } from "../../src/connectors/googleCalendar/types.ts";

const source = (path: string) => readFileSync(new URL(`../../${path}`, import.meta.url), "utf8");
const expected = {
  status: "maintenance",
  error: "calendar_maintenance",
  operationStarted: false,
  automaticRetry: false,
  safeError: "Google Calendar is paused for maintenance. This request started no new Calendar work. An earlier operation may still be settling.",
};
const request = (body: string) => new Request("https://synthetic.invalid/google-calendar", {
  method: "POST", headers: { Authorization: "Bearer SYNTHETIC_GATEWAY_VERIFIED_TOKEN" }, body,
});

for (const action of ["status", "read", "begin", "complete", "disconnect", "prepare", "create"]) {
  test(`maintenance rejects ${action} before parsing or dispatching it`, async () => {
    const input = request(JSON.stringify({ action, code: "SYNTHETIC_PRIVATE_CODE", approved: true }));
    const response = googleCalendarMaintenanceHandler(input);
    assert.equal(response.status, 503);
    assert.deepEqual(await response.json(), expected);
    assert.equal(input.bodyUsed, false);
    assert.equal(response.headers.get("Cache-Control"), "no-store");
    assert.equal(response.headers.get("Retry-After"), null);
  });
}

test("malformed and unknown commands are opaque maintenance requests, not successful operations", async () => {
  for (const body of ["not JSON", "", '{"action":"unknown"}', '{"action":"refresh"}']) {
    const response = googleCalendarMaintenanceHandler(request(body));
    assert.equal(response.status, 503);
    assert.deepEqual(await response.json(), expected);
  }
});

test("OPTIONS is inert CORS only, and unsupported methods cannot dispatch work", async () => {
  const preflight = googleCalendarMaintenanceHandler(new Request("https://synthetic.invalid", { method: "OPTIONS" }));
  assert.equal(preflight.status, 204);
  assert.equal(await preflight.text(), "");
  assert.equal(preflight.headers.get("Access-Control-Allow-Methods"), "POST, OPTIONS");
  for (const method of ["GET", "PUT", "PATCH", "DELETE"]) {
    const response = googleCalendarMaintenanceHandler(new Request("https://synthetic.invalid", { method }));
    assert.equal(response.status, 405);
    assert.deepEqual(await response.json(), { error: "method_not_allowed" });
  }
});

test("missing or malformed bearer remains rejected; gateway performs actual JWT verification", async () => {
  for (const authorization of ["", "Bearer ", "Basic SYNTHETIC", "Bearer one two"]) {
    const response = googleCalendarMaintenanceHandler(new Request("https://synthetic.invalid", {
      method: "POST", headers: { Authorization: authorization },
    }));
    assert.equal(response.status, 401);
    assert.deepEqual(await response.json(), { error: "authentication_required" });
  }
  const profile = source("supabase/calendar-maintenance.config.toml");
  assert.match(profile, /\[functions\.google-calendar\]\s*verify_jwt = true/);
  assert.doesNotMatch(profile, /verify_jwt\s*=\s*false/);
  assert.match(profile, /entrypoint = "\.\/functions\/google-calendar\/maintenance-entry\.ts"/);
});

test("maintenance has no Google, database, auth-refresh, storage, logging or operational imports", () => {
  const handler = source("supabase/functions/google-calendar/maintenance.ts");
  assert.doesNotMatch(handler, /\bimport\s|\bfetch\s*\(|createClient|Deno\.env|console\.|\.json\s*\(|\.text\s*\(|localStorage|\.rpc\s*\(/);
  const entry = source("supabase/functions/google-calendar/maintenance-entry.ts");
  assert.equal((entry.match(/\bimport\s/g) ?? []).length, 1);
  assert.match(entry, /from "\.\/maintenance\.ts"/);
  assert.match(entry, /Deno\.serve\(googleCalendarMaintenanceHandler\)/);
  assert.doesNotMatch(entry, /index\.ts"|createClient|Deno\.env|fetch\(|console\./);
  assert.doesNotMatch(source("supabase/config.toml"), /maintenance-entry/);
});

test("retries are inert and response cannot leak request body, credentials or headers", async () => {
  for (let attempt = 0; attempt < 3; attempt++) {
    const input = new Request("https://synthetic.invalid", {
      method: "POST", body: '{"private":"SYNTHETIC_PRIVATE_BODY"}',
      headers: { Authorization: "Bearer SYNTHETIC_SECRET_TOKEN", "X-Private": "SYNTHETIC_PRIVATE_HEADER" },
    });
    const response = googleCalendarMaintenanceHandler(input);
    const body = await response.text();
    assert.equal(response.status, 503);
    assert.equal(input.bodyUsed, false);
    assert.doesNotMatch(body + JSON.stringify([...response.headers]), /SYNTHETIC_|private/i);
    assert.deepEqual(JSON.parse(body), expected);
  }
});

test("maintenance does not cancel truthful finalization of a create already dispatched", async () => {
  let release!: () => void;
  const barrier = new Promise<void>(resolve => { release = resolve; });
  let dispatched!: () => void;
  const dispatchReached = new Promise<void>(resolve => { dispatched = resolve; });
  let inserts = 0;
  let finishes = 0;
  const payload = {
    calendarId: "synthetic-calendar", title: "Synthetic event", description: "",
    start: "2026-10-18T12:00:00Z", end: "2026-10-18T13:00:00Z", timezone: "UTC", allDay: false,
  };
  const event: ExternalCalendarEvent = {
    provider: "google-calendar", externalId: "synthetic-event", calendarId: "synthetic-calendar",
    calendarName: "Synthetic calendar", title: "Synthetic event", allDay: false,
    start: { kind: "dateTime", dateTime: payload.start, timezone: "UTC" },
    end: { kind: "dateTime", dateTime: payload.end, timezone: "UTC" },
  };
  const inFlight = executeCalendarCreation(payload, {
    claim: async () => "claimed",
    read: async () => ({ event_id: event.externalId, calendar_id: event.calendarId, audit_row_id: "synthetic-zero-xp-audit", event_receipt: null }),
    insert: async () => { inserts++; dispatched(); await barrier; return event; },
    finish: async () => { finishes++; return "synthetic-zero-xp-audit"; },
  });
  // Let the existing operation reach its dispatch before the new entrypoint serves.
  await dispatchReached;
  assert.equal(inserts, 1);
  assert.equal(googleCalendarMaintenanceHandler(request('{"action":"create"}')).status, 503);
  assert.equal(finishes, 0);
  release();
  const receipt = await inFlight;
  assert.equal(finishes, 1);
  assert.equal(inserts, 1);
  assert.equal(receipt.auditRowId, "synthetic-zero-xp-audit");
});
