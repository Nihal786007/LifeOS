import { parseCalendarEventPayload, type CalendarEventPayload, type CalendarEventProposal } from "../calendar/eventProposal.ts";
export const GOOGLE_CALENDAR_PROVIDER = "google-calendar" as const;

export type ExternalCalendarProvider = typeof GOOGLE_CALENDAR_PROVIDER;

export interface ExternalCalendar {
  provider: ExternalCalendarProvider;
  externalId: string;
  name: string;
  primary: boolean;
  selected: boolean;
  timezone?: string;
  accessRole?: "owner" | "writer" | "reader" | "freeBusyReader";
}

export type ExternalCalendarEventTime =
  | { kind: "date"; date: string }
  | { kind: "dateTime"; dateTime: string; timezone?: string };

export interface ExternalCalendarEvent {
  provider: ExternalCalendarProvider;
  externalId: string;
  calendarId: string;
  calendarName: string;
  title: string;
  start: ExternalCalendarEventTime;
  end: ExternalCalendarEventTime;
  allDay: boolean;
  location?: string;
  description?: string;
  status?: "confirmed" | "tentative" | "cancelled";
}

export type GoogleCalendarConnectionState =
  | "disconnected"
  | "connecting"
  | "connected"
  | "expired"
  | "revoked"
  | "network-failure"
  | "provider-failure";

export interface GoogleCalendarConnection {
  state: GoogleCalendarConnectionState;
  accountLabel?: string;
  safeError?: string;
  canCreate?: boolean;
}

export interface GoogleCalendarReadModel {
  calendars: readonly ExternalCalendar[];
  events: readonly ExternalCalendarEvent[];
  fetchedAt: string | null;
  windowStart: string | null;
  windowEnd: string | null;
}

export type GoogleCalendarCommand =
  | { action: "status" }
  | { action: "begin"; redirectUri: string; requestWrite?: boolean }
  | { action: "complete"; code: string; state: string; redirectUri: string }
  | { action: "read"; windowStart: string; windowEnd: string; timezone: string }
  | { action: "disconnect" };
export type GoogleCalendarWriteCommand =
  | { action: "prepare"; payload: CalendarEventPayload }
  | { action: "create"; approvalId: string; fingerprint: string; payload: CalendarEventPayload; approved: true };

export type GoogleCalendarResponse =
  | { status: "disconnected" }
  | { status: "authorization-required"; authorizationUrl: string }
  | { status: "connected"; accountLabel: string; canCreate?: boolean; proposal?: CalendarEventProposal; createdEvent?: ExternalCalendarEvent; auditRowId?: string; calendars?: ExternalCalendar[]; events?: ExternalCalendarEvent[]; fetchedAt?: string; windowStart?: string; windowEnd?: string }
  | { status: "expired" | "revoked" | "provider-failure"; safeError: string };

export interface GoogleCalendarTransport {
  request(command: GoogleCalendarCommand | GoogleCalendarWriteCommand, signal?: AbortSignal): Promise<GoogleCalendarResponse>;
}

export type GoogleCalendarCallback =
  | { status: "none" }
  | { status: "cancelled" }
  | { status: "invalid" }
  | { status: "complete"; code: string; state: string };

export function parseGoogleCalendarCallback(pathname: string, search: string): GoogleCalendarCallback {
  if (pathname !== "/google-calendar-callback") return { status: "none" };
  const parameters = new URLSearchParams(search);
  if (parameters.has("error")) return { status: "cancelled" };
  const code = parameters.get("code")?.trim();
  const state = parameters.get("state")?.trim();
  return code && state ? { status: "complete", code, state } : { status: "invalid" };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasExactKeys(value: Record<string, unknown>, required: readonly string[], optional: readonly string[] = []): boolean {
  const keys = Object.keys(value);
  return required.every((key) => key in value)
    && keys.every((key) => required.includes(key) || optional.includes(key));
}

function isCalendar(value: unknown): value is ExternalCalendar {
  if (!isRecord(value) || !hasExactKeys(value, ["provider", "externalId", "name", "primary", "selected"], ["timezone", "accessRole"])) return false;
  return value.provider === GOOGLE_CALENDAR_PROVIDER
    && typeof value.externalId === "string"
    && typeof value.name === "string"
    && typeof value.primary === "boolean"
    && typeof value.selected === "boolean"
    && (value.timezone === undefined || typeof value.timezone === "string")
    && (value.accessRole === undefined || ["owner", "writer", "reader", "freeBusyReader"].includes(String(value.accessRole)));
}

function isEventTime(value: unknown): value is ExternalCalendarEventTime {
  if (!isRecord(value)) return false;
  if (value.kind === "date") return hasExactKeys(value, ["kind", "date"]) && typeof value.date === "string";
  return value.kind === "dateTime"
    && hasExactKeys(value, ["kind", "dateTime"], ["timezone"])
    && typeof value.dateTime === "string"
    && (value.timezone === undefined || typeof value.timezone === "string");
}

function isCalendarEvent(value: unknown): value is ExternalCalendarEvent {
  if (!isRecord(value) || !hasExactKeys(value, ["provider", "externalId", "calendarId", "calendarName", "title", "start", "end", "allDay"], ["location", "description", "status"])) return false;
  return value.provider === GOOGLE_CALENDAR_PROVIDER
    && [value.externalId, value.calendarId, value.calendarName, value.title].every((item) => typeof item === "string")
    && isEventTime(value.start)
    && isEventTime(value.end)
    && typeof value.allDay === "boolean"
    && (value.location === undefined || typeof value.location === "string")
    && (value.description === undefined || typeof value.description === "string")
    && (value.status === undefined || ["confirmed", "tentative", "cancelled"].includes(String(value.status)));
}

export function parseGoogleCalendarResponse(value: unknown): GoogleCalendarResponse {
  if (!isRecord(value) || typeof value.status !== "string") throw new Error("Google Calendar returned an invalid response.");
  if (value.status === "disconnected" && hasExactKeys(value, ["status"])) return { status: "disconnected" };
  if (value.status === "authorization-required" && hasExactKeys(value, ["status", "authorizationUrl"]) && typeof value.authorizationUrl === "string") {
    return { status: "authorization-required", authorizationUrl: value.authorizationUrl };
  }
  if (["expired", "revoked", "provider-failure"].includes(value.status)
    && hasExactKeys(value, ["status", "safeError"])
    && typeof value.safeError === "string") {
    return value as GoogleCalendarResponse;
  }
  if (value.status === "connected"
    && hasExactKeys(value, ["status", "accountLabel"], ["calendars", "events", "fetchedAt", "windowStart", "windowEnd", "canCreate", "proposal", "createdEvent", "auditRowId"])
    && typeof value.accountLabel === "string"
    && (value.calendars === undefined || (Array.isArray(value.calendars) && value.calendars.every(isCalendar)))
    && (value.events === undefined || (Array.isArray(value.events) && value.events.every(isCalendarEvent)))
    && [value.fetchedAt, value.windowStart, value.windowEnd].every((item) => item === undefined || typeof item === "string")
    && (value.canCreate === undefined || typeof value.canCreate === "boolean")
    && (value.createdEvent === undefined || isCalendarEvent(value.createdEvent))
    && (value.auditRowId === undefined || (typeof value.auditRowId === "string" && /^[0-9a-f-]{36}$/.test(value.auditRowId)))) {
    if (value.proposal !== undefined) {
      const proposal = value.proposal;
      if (!isRecord(proposal) || !hasExactKeys(proposal, ["version", "approvalId", "fingerprint", "payload", "calendarName", "permission"]) || proposal.version !== "1.0.0" || proposal.permission !== "CONFIRM_REQUIRED" || typeof proposal.calendarName !== "string" || typeof proposal.approvalId !== "string" || !/^[0-9a-f-]{36}$/.test(proposal.approvalId) || typeof proposal.fingerprint !== "string" || !/^[0-9a-f]{64}$/.test(proposal.fingerprint)) throw new Error("Invalid Calendar proposal.");
      parseCalendarEventPayload(proposal.payload);
    }
    if ((value.createdEvent === undefined) !== (value.auditRowId === undefined)) throw new Error("Invalid Calendar creation receipt.");
    return value as unknown as GoogleCalendarResponse;
  }
  throw new Error("Google Calendar returned an invalid response.");
}
