import type { GoogleCalendarCommand, GoogleCalendarWriteCommand, GoogleCalendarResponse } from "../../../src/connectors/googleCalendar/types.ts";
import { parseCalendarEventPayload } from "../../../src/connectors/calendar/eventProposal.ts";

const SAFE_FAILURE_CODES = new Set([
  "supabase_configuration_missing", "google_client_id_missing", "google_client_secret_missing",
  "google_encryption_key_missing", "google_redirect_allowlist_missing", "connection_table_unavailable",
  "connection_table_permission_denied", "database_authentication_failed", "connection_read_failed",
  "connector_encryption_unavailable",
]);
const SAFE_CREATE_ERRORS: Record<string, string> = {
  approval_invalid: "This approval is no longer valid. Preview and approve the event again.",
  approval_changed: "Event details changed. Preview and approve them again.",
  creation_pending: "This approval is still being confirmed. Check Google Calendar and retry this same approval after one minute.",
  write_scope_required: "Google Calendar event creation permission is required. Reconnect to grant it.",
  calendar_not_writable: "This calendar is no longer writable. Choose a calendar you own and preview again.",
  invalid_provider_response: "Google did not return a verifiable creation receipt. Check Google Calendar before retrying this same approval.",
};

export interface GoogleCalendarHandlerDependencies {
  authenticate(token: string): Promise<{ userId: string } | null>;
  status(userId: string): Promise<GoogleCalendarResponse>;
  begin(userId: string, redirectUri: string, requestWrite?: boolean): Promise<GoogleCalendarResponse>;
  prepare?(userId: string, payload: GoogleCalendarWriteCommand & { action: "prepare" }): Promise<GoogleCalendarResponse>;
  create?(userId: string, input: GoogleCalendarWriteCommand & { action: "create" }): Promise<GoogleCalendarResponse>;
  complete(userId: string, code: string, state: string, redirectUri: string): Promise<GoogleCalendarResponse>;
  read(userId: string, windowStart: string, windowEnd: string, timezone: string): Promise<GoogleCalendarResponse>;
  disconnect(userId: string): Promise<GoogleCalendarResponse>;
}

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS" } });
}

function bearer(request: Request): string | undefined {
  return request.headers.get("Authorization")?.match(/^Bearer\s+(.+)$/i)?.[1]?.trim() || undefined;
}

function command(value: unknown): GoogleCalendarCommand | GoogleCalendarWriteCommand {
  if (typeof value !== "object" || value === null || Array.isArray(value)) throw new Error("invalid_request");
  const source = value as Record<string, unknown>;
  const keys = Object.keys(source).sort();
  const exact = (expected: string[]) => keys.length === expected.length && expected.sort().every((key, index) => keys[index] === key);
  if (source.action === "status" && exact(["action"])) return { action: "status" };
  if (source.action === "disconnect" && exact(["action"])) return { action: "disconnect" };
  if (source.action === "begin" && exact(["action", "redirectUri"]) && typeof source.redirectUri === "string") return { action: "begin", redirectUri: source.redirectUri };
  if (source.action === "begin" && exact(["action", "redirectUri", "requestWrite"]) && typeof source.redirectUri === "string" && typeof source.requestWrite === "boolean") return { action: "begin", redirectUri: source.redirectUri, requestWrite: source.requestWrite };
  if (source.action === "prepare" && exact(["action", "payload"])) return { action: "prepare", payload: parseCalendarEventPayload(source.payload) };
  if (source.action === "create" && exact(["action", "payload", "approvalId", "fingerprint", "approved"]) && source.approved === true && typeof source.approvalId === "string" && /^[0-9a-f-]{36}$/.test(source.approvalId) && typeof source.fingerprint === "string" && /^[0-9a-f]{64}$/.test(source.fingerprint)) return { action: "create", payload: parseCalendarEventPayload(source.payload), approvalId: source.approvalId, fingerprint: source.fingerprint, approved: true };
  if (source.action === "complete" && exact(["action", "code", "redirectUri", "state"]) && typeof source.code === "string" && typeof source.state === "string" && typeof source.redirectUri === "string") return { action: "complete", code: source.code, state: source.state, redirectUri: source.redirectUri };
  if (source.action === "read" && exact(["action", "timezone", "windowEnd", "windowStart"]) && typeof source.windowStart === "string" && typeof source.windowEnd === "string" && typeof source.timezone === "string") return { action: "read", windowStart: source.windowStart, windowEnd: source.windowEnd, timezone: source.timezone };
  throw new Error("invalid_request");
}

export function createGoogleCalendarHandler(dependencies: GoogleCalendarHandlerDependencies) {
  return async (request: Request): Promise<Response> => {
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS" } });
    if (request.method !== "POST") return json(405, { error: "method_not_allowed" });
    const token = bearer(request);
    if (!token) return json(401, { error: "authentication_required" });
    const identity = await dependencies.authenticate(token);
    if (!identity) return json(401, { error: "invalid_or_expired_token" });
    let input: GoogleCalendarCommand | GoogleCalendarWriteCommand;
    try { input = command(await request.json()); } catch { return json(400, { error: "invalid_request" }); }
    try {
      const result = input.action === "status" ? await dependencies.status(identity.userId)
        : input.action === "begin" ? await dependencies.begin(identity.userId, input.redirectUri, input.requestWrite)
        : input.action === "complete" ? await dependencies.complete(identity.userId, input.code, input.state, input.redirectUri)
        : input.action === "read" ? await dependencies.read(identity.userId, input.windowStart, input.windowEnd, input.timezone)
        : input.action === "prepare" && dependencies.prepare ? await dependencies.prepare(identity.userId, input)
        : input.action === "create" && dependencies.create ? await dependencies.create(identity.userId, input)
        : input.action !== "disconnect" ? { status: "provider-failure" as const, safeError: "Calendar event creation is unavailable." }
        : await dependencies.disconnect(identity.userId);
      return json(200, result);
    } catch (error) {
      const code = error instanceof Error ? error.message : "provider_failure";
      if (Object.hasOwn(SAFE_CREATE_ERRORS, code)) return json(200, { status: "provider-failure", safeError: SAFE_CREATE_ERRORS[code] });
      const status = code === "authorization_revoked" ? "revoked" : code === "authorization_expired" ? "expired" : "provider-failure";
      return json(502, { status, safeError: status === "revoked" ? "Google Calendar authorization was revoked." : status === "expired" ? "Google Calendar authorization expired." : "Google Calendar is temporarily unavailable.", ...(SAFE_FAILURE_CODES.has(code) ? { diagnosticCode: code } : {}) });
    }
  };
}
