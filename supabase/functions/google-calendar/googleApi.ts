import { mapGoogleCalendar, mapGoogleCalendarEvent, sortExternalCalendarEvents } from "../../../src/connectors/googleCalendar/mapping.ts";
import type { ExternalCalendar, ExternalCalendarEvent } from "../../../src/connectors/googleCalendar/types.ts";

export const GOOGLE_CALENDAR_SCOPES = [
  "https://www.googleapis.com/auth/calendar.calendarlist.readonly",
  "https://www.googleapis.com/auth/calendar.events.readonly",
] as const;
export const GOOGLE_AUTHORIZATION_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth";
export const GOOGLE_TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
export const GOOGLE_REVOKE_ENDPOINT = "https://oauth2.googleapis.com/revoke";
export const GOOGLE_CALENDAR_API = "https://www.googleapis.com/calendar/v3";
export const MAX_CALENDARS = 50;
export const MAX_SELECTED_CALENDARS = 10;
export const MAX_EVENTS_PER_CALENDAR = 50;
export const MAX_TOTAL_EVENTS = 200;
export const MAX_WINDOW_DAYS = 31;

export interface GoogleTokens { accessToken: string; refreshToken?: string; expiresAt: string; scopes: string[] }
export interface GoogleCalendarData { accountLabel: string; calendars: ExternalCalendar[]; events: ExternalCalendarEvent[] }

function required(value: unknown, label: string): string {
  if (typeof value !== "string" || !value.trim()) throw new Error(`invalid_${label}`);
  return value.trim();
}

export function buildGoogleAuthorizationUrl(input: { clientId: string; redirectUri: string; state: string; codeChallenge: string }): string {
  const url = new URL(GOOGLE_AUTHORIZATION_ENDPOINT);
  url.searchParams.set("client_id", input.clientId);
  url.searchParams.set("redirect_uri", input.redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", GOOGLE_CALENDAR_SCOPES.join(" "));
  url.searchParams.set("access_type", "offline");
  url.searchParams.set("prompt", "consent");
  url.searchParams.set("include_granted_scopes", "true");
  url.searchParams.set("state", input.state);
  url.searchParams.set("code_challenge", input.codeChallenge);
  url.searchParams.set("code_challenge_method", "S256");
  return url.toString();
}

async function jsonFetch(fetcher: typeof fetch, url: string, init: RequestInit): Promise<Record<string, unknown>> {
  const response = await fetcher(url, init);
  if (!response.ok) throw new Error(response.status === 401 || response.status === 403 ? "authorization_revoked" : "provider_failure");
  const data: unknown = await response.json();
  if (typeof data !== "object" || data === null || Array.isArray(data)) throw new Error("provider_failure");
  return data as Record<string, unknown>;
}

export async function exchangeGoogleCode(fetcher: typeof fetch, input: { clientId: string; clientSecret: string; code: string; verifier: string; redirectUri: string; now?: () => number }): Promise<GoogleTokens> {
  const data = await jsonFetch(fetcher, GOOGLE_TOKEN_ENDPOINT, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ client_id: input.clientId, client_secret: input.clientSecret, code: input.code, code_verifier: input.verifier, redirect_uri: input.redirectUri, grant_type: "authorization_code" }) });
  const accessToken = required(data.access_token, "token_response");
  const expiresIn = typeof data.expires_in === "number" && data.expires_in > 0 ? data.expires_in : 3_600;
  const refreshToken = typeof data.refresh_token === "string" && data.refresh_token.trim() ? data.refresh_token.trim() : undefined;
  const scopes = typeof data.scope === "string" ? data.scope.split(/\s+/).filter(Boolean) : [...GOOGLE_CALENDAR_SCOPES];
  return { accessToken, ...(refreshToken ? { refreshToken } : {}), expiresAt: new Date((input.now ?? Date.now)() + expiresIn * 1_000).toISOString(), scopes };
}

export async function refreshGoogleToken(fetcher: typeof fetch, input: { clientId: string; clientSecret: string; refreshToken: string; now?: () => number }): Promise<GoogleTokens> {
  const data = await jsonFetch(fetcher, GOOGLE_TOKEN_ENDPOINT, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ client_id: input.clientId, client_secret: input.clientSecret, refresh_token: input.refreshToken, grant_type: "refresh_token" }) });
  const accessToken = required(data.access_token, "token_response");
  const expiresIn = typeof data.expires_in === "number" && data.expires_in > 0 ? data.expires_in : 3_600;
  const scopes = typeof data.scope === "string" ? data.scope.split(/\s+/).filter(Boolean) : [...GOOGLE_CALENDAR_SCOPES];
  return { accessToken, refreshToken: input.refreshToken, expiresAt: new Date((input.now ?? Date.now)() + expiresIn * 1_000).toISOString(), scopes };
}

export function assertCalendarWindow(windowStart: string, windowEnd: string): void {
  const start = Date.parse(windowStart); const end = Date.parse(windowEnd);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start || end - start > MAX_WINDOW_DAYS * 86_400_000) throw new Error("invalid_request");
}

export async function readGoogleCalendarData(fetcher: typeof fetch, input: { accessToken: string; windowStart: string; windowEnd: string; timezone: string }): Promise<GoogleCalendarData> {
  assertCalendarWindow(input.windowStart, input.windowEnd);
  const headers = { Authorization: `Bearer ${input.accessToken}` };
  const listUrl = new URL(`${GOOGLE_CALENDAR_API}/users/me/calendarList`);
  listUrl.searchParams.set("maxResults", String(MAX_CALENDARS));
  listUrl.searchParams.set("showDeleted", "false");
  listUrl.searchParams.set("showHidden", "false");
  const list = await jsonFetch(fetcher, listUrl.toString(), { headers });
  const calendars = (Array.isArray(list.items) ? list.items : []).map(mapGoogleCalendar).filter((item): item is ExternalCalendar => item !== null);
  const selected = calendars.filter((calendar) => calendar.selected).slice(0, MAX_SELECTED_CALENDARS);
  const eventGroups = await Promise.all(selected.map(async (calendar) => {
    const url = new URL(`${GOOGLE_CALENDAR_API}/calendars/${encodeURIComponent(calendar.externalId)}/events`);
    url.searchParams.set("timeMin", input.windowStart); url.searchParams.set("timeMax", input.windowEnd);
    url.searchParams.set("timeZone", input.timezone); url.searchParams.set("singleEvents", "true");
    url.searchParams.set("orderBy", "startTime"); url.searchParams.set("showDeleted", "false");
    url.searchParams.set("maxResults", String(MAX_EVENTS_PER_CALENDAR));
    const response = await jsonFetch(fetcher, url.toString(), { headers });
    return (Array.isArray(response.items) ? response.items : []).map((event) => mapGoogleCalendarEvent(event, calendar)).filter((event): event is ExternalCalendarEvent => event !== null && event.status !== "cancelled");
  }));
  const primary = calendars.find((calendar) => calendar.primary);
  return { accountLabel: primary?.externalId ?? primary?.name ?? "Google Calendar", calendars, events: sortExternalCalendarEvents(eventGroups.flat()).slice(0, MAX_TOTAL_EVENTS) };
}

export async function revokeGoogleToken(fetcher: typeof fetch, token: string): Promise<void> {
  await fetcher(GOOGLE_REVOKE_ENDPOINT, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ token }) });
}
