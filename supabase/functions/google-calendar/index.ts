import { createClient } from "npm:@supabase/supabase-js@2";
import { createGoogleCalendarHandler } from "./handler.ts";
import {
  buildGoogleAuthorizationUrl,
  exchangeGoogleCode,
  readGoogleCalendarData,
  refreshGoogleToken,
  revokeGoogleToken,
  type GoogleTokens,
  GOOGLE_CALENDAR_WRITE_SCOPE,
} from "./googleApi.ts";
import { executeCalendarCreation, insertApprovedGoogleEvent } from "./createEvent.ts";
import { assertWritableCalendar, calendarEventFingerprint, parseCalendarEventPayload } from "../../../src/connectors/calendar/eventProposal.ts";
import { decryptConnectorSecret, encryptConnectorSecret, sha256Base64Url } from "./vault.ts";
import { disconnectGoogleCalendar, type RetiredGoogleConnection } from "./disconnect.ts";
import { parseDisconnectOutcome } from "../../../src/connectors/googleCalendar/disconnectOutcome.ts";
import type { GoogleCalendarResponse } from "../../../src/connectors/googleCalendar/types.ts";

const supabaseUrl = Deno.env.get("SUPABASE_URL")?.trim() ?? "";
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")?.trim() ?? "";
const clientId = Deno.env.get("GOOGLE_CALENDAR_CLIENT_ID")?.trim() ?? "";
const clientSecret = Deno.env.get("GOOGLE_CALENDAR_CLIENT_SECRET")?.trim() ?? "";
const encryptionKey = Deno.env.get("GOOGLE_CALENDAR_TOKEN_ENCRYPTION_KEY")?.trim() ?? "";
const allowedRedirects = new Set((Deno.env.get("GOOGLE_CALENDAR_REDIRECT_URIS") ?? "").split(",").map((value) => value.trim()).filter(Boolean));
const database = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });

function requireConfiguration(): void {
  if (!supabaseUrl || !serviceRoleKey) throw new Error("supabase_configuration_missing");
  if (!clientId) throw new Error("google_client_id_missing");
  if (!clientSecret) throw new Error("google_client_secret_missing");
  if (!encryptionKey) throw new Error("google_encryption_key_missing");
  if (allowedRedirects.size === 0) throw new Error("google_redirect_allowlist_missing");
}
function requireRedirectUri(value: string): string {
  if (!allowedRedirects.has(value)) throw new Error("provider_failure");
  return value;
}
function randomUrlSafe(bytes = 32): string {
  const value = crypto.getRandomValues(new Uint8Array(bytes));
  let binary = ""; value.forEach((byte) => { binary += String.fromCharCode(byte); });
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

interface ConnectionRow {
  authorization_id: string;
  access_token_ciphertext: string;
  refresh_token_ciphertext: string | null;
  token_expires_at: string;
  account_label: string;
  granted_scopes: string[];
}

async function saveConnection(userId: string, tokens: GoogleTokens, accountLabel: string, authorizationId?: string, stateHash?: string): Promise<void> {
  const { data, error } = await database.rpc("store_google_calendar_connection", {
    p_user_id: userId,
    p_authorization_id: authorizationId ?? null,
    p_state_hash: stateHash ?? null,
    p_access: await encryptConnectorSecret(tokens.accessToken, encryptionKey),
    p_refresh: tokens.refreshToken ? await encryptConnectorSecret(tokens.refreshToken, encryptionKey) : null,
    p_expires: tokens.expiresAt,
    p_label: accountLabel,
    p_scopes: tokens.scopes,
  });
  if (error) throw new Error("provider_failure");
  if (data !== true) throw new Error("authorization_revoked");
}

async function connectionRow(userId: string): Promise<ConnectionRow | null> {
  const { data, error } = await database.rpc("read_google_calendar_connection", { p_user_id: userId });
  if (error) {
    const code = error.code === "PGRST205" || error.code === "42P01" ? "connection_table_unavailable"
      : error.code === "42501" ? "connection_table_permission_denied"
      : error.code === "PGRST301" || error.code === "PGRST303" ? "database_authentication_failed"
      : "connection_read_failed";
    throw new Error(code);
  }
  if (!data || typeof data !== "object" || !("connection" in data)) throw new Error("connection_read_failed");
  return data.connection as ConnectionRow | null;
}

async function validTokens(userId: string): Promise<{ tokens: GoogleTokens; accountLabel: string; authorizationId: string } | null> {
  const row = await connectionRow(userId);
  if (!row) return null;
  const accessToken = await decryptConnectorSecret(row.access_token_ciphertext, encryptionKey);
  const refreshToken = row.refresh_token_ciphertext ? await decryptConnectorSecret(row.refresh_token_ciphertext, encryptionKey) : undefined;
  let tokens: GoogleTokens = { accessToken, ...(refreshToken ? { refreshToken } : {}), expiresAt: row.token_expires_at, scopes: row.granted_scopes };
  if (Date.parse(tokens.expiresAt) <= Date.now() + 60_000) {
    if (!refreshToken) throw new Error("authorization_expired");
    tokens = await refreshGoogleToken(fetch, { clientId, clientSecret, refreshToken, previousScopes: row.granted_scopes });
    await saveConnection(userId, tokens, row.account_label, row.authorization_id);
  }
  return { tokens, accountLabel: row.account_label, authorizationId: row.authorization_id };
}

async function removeConnection(userId: string, authorizationId: string): Promise<void> {
  const { error } = await database.rpc("forget_revoked_google_calendar_connection", { p_user_id: userId, p_authorization_id: authorizationId });
  if (error) throw new Error("provider_failure");
}

async function assertCurrentConnection(userId: string, authorizationId: string): Promise<void> {
  const current = await connectionRow(userId);
  if (!current || current.authorization_id !== authorizationId) throw new Error("authorization_revoked");
}

async function disconnectedStatus(userId: string): Promise<GoogleCalendarResponse> {
  const { data: snapshot, error } = await database.rpc("read_google_calendar_connection", { p_user_id: userId });
  if (error) throw new Error("provider_failure");
  if (!snapshot || typeof snapshot !== "object" || !("lifecycle" in snapshot)) throw new Error("provider_failure");
  const data = snapshot.lifecycle;
  if (!data) return { status: "disconnected" };
  const outcome = parseDisconnectOutcome({ localAccessRemoved: true, googleRevocation: data.revocation, reason: data.phase === "disconnecting" ? "in_progress" : "no_connection" });
  return { status: "disconnected", disconnectOutcome: outcome };
}

const handler = createGoogleCalendarHandler({
  authenticate: async (token) => {
    const { data, error } = await database.auth.getUser(token);
    return error || !data.user ? null : { userId: data.user.id };
  },
  status: async (userId) => {
    requireConfiguration();
    const current = await validTokens(userId);
    if (!current) return disconnectedStatus(userId);
    const now = new Date(); const end = new Date(now); end.setDate(end.getDate() + 1);
    try {
      const data = await readGoogleCalendarData(fetch, { accessToken: current.tokens.accessToken, windowStart: now.toISOString(), windowEnd: end.toISOString(), timezone: "UTC" });
      if (data.accountLabel !== current.accountLabel) await saveConnection(userId, current.tokens, data.accountLabel, current.authorizationId);
      await assertCurrentConnection(userId, current.authorizationId);
      return { status: "connected", accountLabel: data.accountLabel, canCreate: current.tokens.scopes.includes(GOOGLE_CALENDAR_WRITE_SCOPE) };
    } catch (error) {
      if (error instanceof Error && error.message === "authorization_revoked") await removeConnection(userId, current.authorizationId);
      throw error;
    }
  },
  begin: async (userId, redirectUri, requestWrite) => {
    requireConfiguration(); requireRedirectUri(redirectUri);
    const state = randomUrlSafe(); const verifier = randomUrlSafe(48);
    const stateHash = await sha256Base64Url(state); const challenge = await sha256Base64Url(verifier);
    const { error } = await database.rpc("begin_google_calendar_oauth", { p_user_id: userId, p_hash: stateHash, p_verifier: await encryptConnectorSecret(verifier, encryptionKey), p_redirect: redirectUri, p_expires: new Date(Date.now() + 10 * 60_000).toISOString() });
    if (error) throw new Error("provider_failure");
    return { status: "authorization-required", authorizationUrl: buildGoogleAuthorizationUrl({ clientId, redirectUri, state, codeChallenge: challenge, requestWrite }) };
  },
  complete: async (userId, code, state, redirectUri) => {
    requireConfiguration(); requireRedirectUri(redirectUri);
    const stateHash = await sha256Base64Url(state);
    const { data, error } = await database.rpc("read_google_calendar_oauth_state", { p_user_id: userId, p_state_hash: stateHash });
    if (error || !data || data.redirect_uri !== redirectUri || Date.parse(data.expires_at) <= Date.now()) throw new Error("authorization_expired");
    // Consume state atomically with the final save, so disconnect can fence an
    // already-running code exchange without allowing a late callback to reconnect.
    const verifier = await decryptConnectorSecret(data.verifier_ciphertext, encryptionKey);
    const tokens = await exchangeGoogleCode(fetch, { clientId, clientSecret, code, verifier, redirectUri });
    if (!tokens.refreshToken) throw new Error("authorization_expired");
    const now = new Date(); const end = new Date(now); end.setDate(end.getDate() + 1);
    const calendar = await readGoogleCalendarData(fetch, { accessToken: tokens.accessToken, windowStart: now.toISOString(), windowEnd: end.toISOString(), timezone: "UTC" });
    await saveConnection(userId, tokens, calendar.accountLabel, undefined, stateHash);
    return { status: "connected", accountLabel: calendar.accountLabel, canCreate: tokens.scopes.includes(GOOGLE_CALENDAR_WRITE_SCOPE) };
  },
  read: async (userId, windowStart, windowEnd, timezone) => {
    requireConfiguration();
    const current = await validTokens(userId);
    if (!current) return disconnectedStatus(userId);
    try {
      const data = await readGoogleCalendarData(fetch, { accessToken: current.tokens.accessToken, windowStart, windowEnd, timezone });
      await assertCurrentConnection(userId, current.authorizationId);
      return { status: "connected", accountLabel: data.accountLabel, canCreate: current.tokens.scopes.includes(GOOGLE_CALENDAR_WRITE_SCOPE), calendars: data.calendars, events: data.events, fetchedAt: new Date().toISOString(), windowStart, windowEnd };
    } catch (error) {
      if (error instanceof Error && error.message === "authorization_revoked") await removeConnection(userId, current.authorizationId);
      throw error;
    }
  },
  prepare: async (userId, input) => {
    requireConfiguration();
    const current = await validTokens(userId);
    if (!current) return disconnectedStatus(userId);
    const payload = parseCalendarEventPayload(input.payload);
    const start = new Date(); const end = new Date(start.getTime() + 86_400_000);
    const data = await readGoogleCalendarData(fetch, { accessToken: current.tokens.accessToken, windowStart: start.toISOString(), windowEnd: end.toISOString(), timezone: "UTC" });
    assertWritableCalendar(payload, data.calendars, true, current.tokens.scopes.includes(GOOGLE_CALENDAR_WRITE_SCOPE));
    const approvalId = crypto.randomUUID();
    const fingerprint = await calendarEventFingerprint(payload);
    const eventId = (await sha256Base64Url(`${userId}:${approvalId}`));
    // Hex encoding is a subset of Google's allowed base32hex alphabet.
    const eventDigest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(eventId));
    const googleId = Array.from(new Uint8Array(eventDigest), byte => byte.toString(16).padStart(2,"0")).join("");
    const { error } = await database.from("google_calendar_event_approvals").insert({ id: approvalId, user_id: userId, authorization_id: current.authorizationId, payload_hash: fingerprint, calendar_id: payload.calendarId, event_id: googleId, audit_row_id: crypto.randomUUID(), execution_id: String(Date.now()), expires_at: new Date(Date.now()+15*60_000).toISOString() });
    if (error) throw new Error("provider_failure");
    await assertCurrentConnection(userId, current.authorizationId);
    return { status: "connected", accountLabel: current.accountLabel, canCreate: true, proposal: { version: "1.0.0", approvalId, fingerprint, payload, calendarName: data.calendars.find(calendar=>calendar.externalId===payload.calendarId)!.name, permission: "CONFIRM_REQUIRED" } };
  },
  create: async (userId, input) => {
    requireConfiguration();
    const current = await validTokens(userId);
    if (!current) return disconnectedStatus(userId);
    const payload = parseCalendarEventPayload(input.payload);
    if (await calendarEventFingerprint(payload) !== input.fingerprint || !current.tokens.scopes.includes(GOOGLE_CALENDAR_WRITE_SCOPE)) throw new Error("approval_invalid");
    const receipt = await executeCalendarCreation(payload, {
      claim: async () => {
        const { data, error } = await database.rpc("claim_google_calendar_creation", { p_user_id: userId, p_id: input.approvalId, p_hash: input.fingerprint, p_authorization_id: current.authorizationId });
        if (error || !["claimed", "pending", "completed"].includes(data)) throw new Error("approval_invalid");
        return data;
      },
      read: async () => {
        const { data, error } = await database.from("google_calendar_event_approvals").select("event_id,audit_row_id,event_receipt,calendar_id").eq("user_id",userId).eq("id",input.approvalId).single();
        if (error || !data) throw new Error("approval_invalid");
        return data;
      },
      insert: async eventId => {
        const latest = await connectionRow(userId);
        if (!latest || latest.authorization_id !== current.authorizationId) throw new Error("authorization_revoked");
        return insertApprovedGoogleEvent(fetch, { accessToken: current.tokens.accessToken, scopes: current.tokens.scopes, payload, eventId, fingerprint: input.fingerprint, assertAuthorization: () => assertCurrentConnection(userId, current.authorizationId) });
      },
      finish: async event => {
        // Once Google confirms the write, audit it even if the browser disconnected.
        const { data, error } = await database.rpc("finish_google_calendar_creation", { p_user_id: userId, p_id: input.approvalId, p_event: event });
        if (error || typeof data !== "string") throw new Error("provider_failure");
        return data;
      },
    });
    await assertCurrentConnection(userId, current.authorizationId);
    return { status: "connected", accountLabel: current.accountLabel, canCreate: true, createdEvent: receipt.event, auditRowId: receipt.auditRowId };
  },
  disconnect: async (userId) => {
    // Retirement must not depend on a still-configured OAuth client, redirect
    // allowlist or decryptable key. Missing crypto becomes an unknown revocation.
    if (!supabaseUrl || !serviceRoleKey) throw new Error("supabase_configuration_missing");
    const outcome = await disconnectGoogleCalendar(userId, {
      retire: async owner => {
        const { data, error } = await database.rpc("retire_google_calendar_connection", { p_user_id: owner });
        if (error || !data) throw new Error("provider_failure");
        return data as RetiredGoogleConnection;
      },
      decrypt: ciphertext => decryptConnectorSecret(ciphertext, encryptionKey),
      revoke: token => revokeGoogleToken(fetch, token),
      finish: async (owner, operationId, revocation) => {
        const { data, error } = await database.rpc("finish_google_calendar_disconnect", { p_user_id: owner, p_operation_id: operationId, p_revocation: revocation });
        if (error) throw new Error("provider_failure");
        return data === true;
      },
    });
    return { status: "disconnected", disconnectOutcome: outcome };
  },
});

Deno.serve(handler);
