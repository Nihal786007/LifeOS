import { assertWritableCalendar, calendarEventFingerprint, parseCalendarEventPayload, type CalendarEventPayload } from "../../../src/connectors/calendar/eventProposal.ts";
import { mapGoogleCalendar, mapGoogleCalendarEvent } from "../../../src/connectors/googleCalendar/mapping.ts";
import type { ExternalCalendarEvent } from "../../../src/connectors/googleCalendar/types.ts";
import { GOOGLE_CALENDAR_API, GOOGLE_CALENDAR_WRITE_SCOPE } from "./googleApi.ts";

export function googleEventBody(payload: CalendarEventPayload, eventId: string, fingerprint: string) {
  const time = (value: string) => payload.allDay ? { date: value } : { dateTime: value, timeZone: payload.timezone };
  return { id: eventId, summary: payload.title, start: time(payload.start), end: time(payload.end), ...(payload.location ? { location: payload.location } : {}), ...(payload.description ? { description: payload.description } : {}), extendedProperties: { private: { lifeosFingerprint: fingerprint } } };
}

/** Single insert, never an update/delete. Same approved identity maps to one Google ID. */
export async function insertApprovedGoogleEvent(fetcher: typeof fetch, input: { accessToken: string; scopes: string[]; payload: unknown; eventId: string; fingerprint: string }): Promise<ExternalCalendarEvent> {
  const payload = parseCalendarEventPayload(input.payload);
  if (await calendarEventFingerprint(payload) !== input.fingerprint) throw new Error("approval_changed");
  if (!/^[0-9a-v]{5,1024}$/.test(input.eventId)) throw new Error("invalid_event_id");
  const headers = { Authorization: `Bearer ${input.accessToken}`, "Content-Type": "application/json" };
  const call = async (url: string, init: RequestInit) => {
    const response = await fetcher(url, { ...init, signal: AbortSignal.timeout(20_000) });
    if (!response.ok && response.status !== 409) throw new Error(response.status === 401 ? "authorization_revoked" : response.status === 403 ? "calendar_not_writable" : "provider_failure");
    return response;
  };
  const calendarResponse = await call(`${GOOGLE_CALENDAR_API}/users/me/calendarList/${encodeURIComponent(payload.calendarId)}`, { headers });
  const calendar = mapGoogleCalendar(await calendarResponse.json());
  assertWritableCalendar(payload, calendar ? [calendar] : [], true, input.scopes.includes(GOOGLE_CALENDAR_WRITE_SCOPE));
  const url = `${GOOGLE_CALENDAR_API}/calendars/${encodeURIComponent(payload.calendarId)}/events`;
  let response = await call(`${url}?sendUpdates=none`, { method: "POST", headers, body: JSON.stringify(googleEventBody(payload, input.eventId, input.fingerprint)) });
  // 409 is an idempotency conflict, not permission to fabricate a success.
  if (response.status === 409) response = await call(`${url}/${input.eventId}`, { headers });
  const raw: unknown = await response.json();
  const event = calendar ? mapGoogleCalendarEvent(raw, calendar) : null;
  const properties = raw && typeof raw === "object" ? (raw as Record<string, unknown>).extendedProperties : null;
  const privateProperties = properties && typeof properties === "object" ? (properties as Record<string, unknown>).private : null;
  const bound = privateProperties && typeof privateProperties === "object" ? (privateProperties as Record<string, unknown>).lifeosFingerprint : null;
  if (!event || event.externalId !== input.eventId || event.status !== "confirmed" || bound !== input.fingerprint || event.title !== payload.title || event.allDay !== payload.allDay || event.location !== payload.location || event.description !== payload.description) throw new Error("invalid_provider_response");
  const equalTime = (actual: typeof event.start, expected: string) => actual.kind === "date" ? actual.date === expected : Date.parse(actual.dateTime) === Date.parse(expected) && !!actual.timezone && new Intl.DateTimeFormat("en", {timeZone:actual.timezone}).resolvedOptions().timeZone === new Intl.DateTimeFormat("en", {timeZone:payload.timezone}).resolvedOptions().timeZone;
  if (!equalTime(event.start, payload.start) || !equalTime(event.end, payload.end)) throw new Error("invalid_provider_response");
  return event;
}

export interface CalendarCreationJournal {
  event_id: string; audit_row_id: string; event_receipt: ExternalCalendarEvent | null; calendar_id: string;
}
export interface CalendarCreationDependencies {
  claim(): Promise<"claimed" | "pending" | "completed">;
  read(): Promise<CalendarCreationJournal>;
  insert(eventId: string): Promise<ExternalCalendarEvent>;
  finish(event: ExternalCalendarEvent): Promise<string>;
}
/** Durable server journal, not a browser cache, owns retry/audit identity. */
export async function executeCalendarCreation(payload: CalendarEventPayload, dependencies: CalendarCreationDependencies): Promise<{ event: ExternalCalendarEvent; auditRowId: string }> {
  const claim = await dependencies.claim();
  if (claim === "pending") throw new Error("creation_pending");
  const row = await dependencies.read();
  if (row.calendar_id !== payload.calendarId) throw new Error("approval_invalid");
  if (claim === "completed") {
    if (!row.event_receipt || row.event_receipt.externalId !== row.event_id || row.event_receipt.calendarId !== payload.calendarId) throw new Error("receipt_invalid");
    return { event: row.event_receipt, auditRowId: row.audit_row_id };
  }
  const event = await dependencies.insert(row.event_id);
  const auditRowId = await dependencies.finish(event);
  if (auditRowId !== row.audit_row_id) throw new Error("receipt_invalid");
  return { event, auditRowId };
}
