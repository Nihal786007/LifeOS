import { AtlasPermissionEngine } from "../../atlas/actions/permissionEngine.ts";

export interface CalendarEventPayload {
  calendarId: string; title: string; start: string; end: string; allDay: boolean;
  timezone?: string; location?: string; description?: string;
}
export interface CalendarEventProposal {
  version: "1.0.0"; approvalId: string; fingerprint: string;
  payload: CalendarEventPayload; calendarName: string; permission: "CONFIRM_REQUIRED";
}
const fields = ["calendarId", "title", "start", "end", "allDay", "timezone", "location", "description"] as const;
/** Strict untrusted input parser: never accepts approval, credentials or execution fields. */
export function parseCalendarEventPayload(value: unknown): CalendarEventPayload {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("invalid_event");
  const input = value as Record<string, unknown>;
  if (Object.keys(input).some(key => !fields.includes(key as typeof fields[number]))) throw new Error("invalid_event");
  const text = (key: string, max: number): string => {
    const value = input[key];
    if (typeof value !== "string" || !value.trim() || value.length > max || [...value].some(char=>char.charCodeAt(0)<32 && ![9,10,13].includes(char.charCodeAt(0)))) throw new Error("invalid_event");
    return value.trim();
  };
  if (typeof input.allDay !== "boolean") throw new Error("invalid_event");
  const payload: CalendarEventPayload = { calendarId: text("calendarId", 512), title: text("title", 240), start: text("start", 64), end: text("end", 64), allDay: input.allDay };
  for (const [key, limit] of [["timezone", 128], ["location", 1024], ["description", 4000]] as const) {
    if (input[key] !== undefined) payload[key] = text(key, limit);
  }
  const validDate = (date: string) => /^\d{4}-\d{2}-\d{2}$/.test(date) && Number.isFinite(Date.parse(`${date}T00:00:00Z`)) && new Date(`${date}T00:00:00Z`).toISOString().slice(0, 10) === date;
  if (payload.allDay) {
    if (!validDate(payload.start) || !validDate(payload.end) || payload.end <= payload.start) throw new Error("invalid_event");
  } else {
    const rfc3339 = /^\d{4}-\d{2}-\d{2}T(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d{1,3})?(?:Z|[+-](?:0\d|1[0-4]):[0-5]\d)$/;
    if (![payload.start, payload.end].every(date => rfc3339.test(date) && validDate(date.slice(0, 10)) && Number.isFinite(Date.parse(date))) || Date.parse(payload.end) <= Date.parse(payload.start) || !payload.timezone) throw new Error("invalid_event");
  }
  if (payload.timezone) {
    try { new Intl.DateTimeFormat("en", { timeZone: payload.timezone }); }
    catch { throw new Error("invalid_timezone"); }
  }
  if (!payload.allDay && payload.timezone) {
    for (const value of [payload.start, payload.end]) {
      if (zonedWallTime(new Date(value), payload.timezone) !== value.slice(0,19)) throw new Error("timezone_offset_mismatch");
    }
  }
  return payload;
}

function zonedWallTime(date: Date, timezone: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" }).formatToParts(date);
  const value = (key: string) => parts.find(part=>part.type===key)!.value;
  return `${value("year")}-${value("month")}-${value("day")}T${value("hour")}:${value("minute")}:${value("second")}`;
}

/** Reject DST gaps/folds rather than guessing which instant the user meant. */
export function calendarWallTimeToRFC3339(wall: string, timezone: string): string {
  if (!/^\d{4}-\d{2}-\d{2}T(?:[01]\d|2[0-3]):[0-5]\d$/.test(wall)) throw new Error("Enter a valid date and time.");
  const naive = Date.parse(`${wall}:00Z`);
  const offsets = new Set<number>();
  for (const delta of [-86_400_000, 0, 86_400_000]) {
    const instant = new Date(naive+delta);
    offsets.add((Date.parse(`${zonedWallTime(instant, timezone)}Z`)-instant.getTime())/60_000);
  }
  const matches = [...offsets].filter(offset => zonedWallTime(new Date(naive-offset*60_000),timezone)===`${wall}:00`);
  if (matches.length !== 1) throw new Error("This time is missing or ambiguous because of daylight saving. Choose another time.");
  const offset = matches[0]!;
  return `${wall}:00${offset>=0?"+":"-"}${String(Math.floor(Math.abs(offset)/60)).padStart(2,"0")}:${String(Math.abs(offset)%60).padStart(2,"0")}`;
}
/** Fixed tuples bind every field independently of input object property order. */
export async function calendarEventFingerprint(value: unknown): Promise<string> {
  const payload = parseCalendarEventPayload(value);
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(JSON.stringify(fields.map(key => [key, payload[key] ?? null]))));
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, "0")).join("");
}
export function assertWritableCalendar(payload: CalendarEventPayload, calendars: readonly { externalId: string; accessRole?: string }[], connected: boolean, canCreate: boolean): void {
  const policy = new AtlasPermissionEngine().evaluate("calendar.events.create");
  if (policy.risk !== "CONFIRM_REQUIRED" || policy.decision !== "approval-required") throw new Error("permission_denied");
  if (!connected) throw new Error("disconnected");
  if (!canCreate) throw new Error("write_scope_required");
  if (!calendars.some(calendar => calendar.externalId === payload.calendarId && calendar.accessRole === "owner")) throw new Error("calendar_not_writable");
}
