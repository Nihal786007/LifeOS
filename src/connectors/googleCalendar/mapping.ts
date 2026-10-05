import {
  GOOGLE_CALENDAR_PROVIDER,
  type ExternalCalendar,
  type ExternalCalendarEvent,
  type ExternalCalendarEventTime,
} from "./types.ts";

type UnknownRecord = Record<string, unknown>;

function record(value: unknown): UnknownRecord | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? value as UnknownRecord
    : null;
}

function boundedString(value: unknown, max: number): string | undefined {
  if (typeof value !== "string") return undefined;
  const normalized = value.trim();
  return normalized && normalized.length <= max ? normalized : undefined;
}

function eventTime(value: unknown): ExternalCalendarEventTime | null {
  const source = record(value);
  if (!source) return null;
  const date = boundedString(source.date, 10);
  if (date && /^\d{4}-\d{2}-\d{2}$/.test(date)) return { kind: "date", date };
  const dateTime = boundedString(source.dateTime, 64);
  if (!dateTime || !Number.isFinite(Date.parse(dateTime))) return null;
  const timezone = boundedString(source.timeZone, 128);
  return { kind: "dateTime", dateTime, ...(timezone ? { timezone } : {}) };
}

export function mapGoogleCalendar(value: unknown): ExternalCalendar | null {
  const source = record(value);
  if (!source) return null;
  const externalId = boundedString(source.id, 512);
  const name = boundedString(source.summaryOverride, 512) ?? boundedString(source.summary, 512);
  if (!externalId || !name) return null;
  const timezone = boundedString(source.timeZone, 128);
  return {
    provider: GOOGLE_CALENDAR_PROVIDER,
    externalId,
    name,
    primary: source.primary === true,
    selected: source.selected !== false,
    ...(timezone ? { timezone } : {}),
    ...(["owner", "writer", "reader", "freeBusyReader"].includes(String(source.accessRole)) ? { accessRole: source.accessRole as ExternalCalendar["accessRole"] } : {}),
  };
}

export function mapGoogleCalendarEvent(value: unknown, calendar: ExternalCalendar): ExternalCalendarEvent | null {
  const source = record(value);
  if (!source) return null;
  const externalId = boundedString(source.id, 512);
  const title = boundedString(source.summary, 1_024) ?? "Untitled event";
  const start = eventTime(source.start);
  const end = eventTime(source.end);
  if (!externalId || !start || !end || start.kind !== end.kind) return null;
  const status = source.status === "confirmed" || source.status === "tentative" || source.status === "cancelled" ? source.status : undefined;
  const location = boundedString(source.location, 1_024);
  const description = boundedString(source.description, 4_000);
  return {
    provider: GOOGLE_CALENDAR_PROVIDER,
    externalId,
    calendarId: calendar.externalId,
    calendarName: calendar.name,
    title,
    start,
    end,
    allDay: start.kind === "date",
    ...(location ? { location } : {}),
    ...(description ? { description } : {}),
    ...(status ? { status } : {}),
  };
}

function startSortValue(event: ExternalCalendarEvent): string {
  return event.start.kind === "date" ? `${event.start.date}T00:00:00` : event.start.dateTime;
}

export function sortExternalCalendarEvents(events: readonly ExternalCalendarEvent[]): ExternalCalendarEvent[] {
  return [...events].sort((left, right) => startSortValue(left).localeCompare(startSortValue(right)) || left.title.localeCompare(right.title) || left.externalId.localeCompare(right.externalId));
}

export function eventOccursOnLocalDate(event: ExternalCalendarEvent, dateKey: string): boolean {
  if (event.start.kind === "date") return event.start.date <= dateKey && event.end.kind === "date" && event.end.date > dateKey;
  const date = new Date(event.start.dateTime);
  if (!Number.isFinite(date.getTime())) return false;
  return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, "0"), String(date.getDate()).padStart(2, "0")].join("-") === dateKey;
}
