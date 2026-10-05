import { createClient } from "npm:@supabase/supabase-js@2";
import { createGoogleCalendarHandler } from "./handler.ts";
import {
  buildGoogleAuthorizationUrl,
  exchangeGoogleCode,
  readGoogleCalendarData,
  refreshGoogleToken,
  revokeGoogleToken,
  type GoogleTokens,
} from "./googleApi.ts";
import { decryptConnectorSecret, encryptConnectorSecret, sha256Base64Url } from "./vault.ts";

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
  access_token_ciphertext: string;
  refresh_token_ciphertext: string | null;
  token_expires_at: string;
  account_label: string;
  granted_scopes: string[];
}

async function saveConnection(userId: string, tokens: GoogleTokens, accountLabel: string): Promise<void> {
  const { error } = await database.from("google_calendar_connections").upsert({
    user_id: userId,
    access_token_ciphertext: await encryptConnectorSecret(tokens.accessToken, encryptionKey),
    refresh_token_ciphertext: tokens.refreshToken ? await encryptConnectorSecret(tokens.refreshToken, encryptionKey) : null,
    token_expires_at: tokens.expiresAt,
    account_label: accountLabel,
    granted_scopes: tokens.scopes,
    updated_at: new Date().toISOString(),
  }, { onConflict: "user_id" });
  if (error) throw new Error("provider_failure");
}

async function connectionRow(userId: string): Promise<ConnectionRow | null> {
  const { data, error } = await database.from("google_calendar_connections").select("access_token_ciphertext,refresh_token_ciphertext,token_expires_at,account_label,granted_scopes").eq("user_id", userId).maybeSingle();
  if (error) {
    const code = error.code === "PGRST205" || error.code === "42P01" ? "connection_table_unavailable"
      : error.code === "42501" ? "connection_table_permission_denied"
      : error.code === "PGRST301" || error.code === "PGRST303" ? "database_authentication_failed"
      : "connection_read_failed";
    throw new Error(code);
  }
  return data as ConnectionRow | null;
}

async function validTokens(userId: string): Promise<{ tokens: GoogleTokens; accountLabel: string } | null> {
  const row = await connectionRow(userId);
  if (!row) return null;
  const accessToken = await decryptConnectorSecret(row.access_token_ciphertext, encryptionKey);
  const refreshToken = row.refresh_token_ciphertext ? await decryptConnectorSecret(row.refresh_token_ciphertext, encryptionKey) : undefined;
  let tokens: GoogleTokens = { accessToken, ...(refreshToken ? { refreshToken } : {}), expiresAt: row.token_expires_at, scopes: row.granted_scopes };
  if (Date.parse(tokens.expiresAt) <= Date.now() + 60_000) {
    if (!refreshToken) throw new Error("authorization_expired");
    tokens = await refreshGoogleToken(fetch, { clientId, clientSecret, refreshToken });
    await saveConnection(userId, tokens, row.account_label);
  }
  return { tokens, accountLabel: row.account_label };
}

async function removeConnection(userId: string): Promise<void> {
  const { error } = await database.from("google_calendar_connections").delete().eq("user_id", userId);
  if (error) throw new Error("provider_failure");
}

const handler = createGoogleCalendarHandler({
  authenticate: async (token) => {
    const { data, error } = await database.auth.getUser(token);
    return error || !data.user ? null : { userId: data.user.id };
  },
  status: async (userId) => {
    requireConfiguration();
    const current = await validTokens(userId);
    if (!current) return { status: "disconnected" };
    const now = new Date(); const end = new Date(now); end.setDate(end.getDate() + 1);
    try {
      const data = await readGoogleCalendarData(fetch, { accessToken: current.tokens.accessToken, windowStart: now.toISOString(), windowEnd: end.toISOString(), timezone: "UTC" });
      if (data.accountLabel !== current.accountLabel) await saveConnection(userId, current.tokens, data.accountLabel);
      return { status: "connected", accountLabel: data.accountLabel };
    } catch (error) {
      if (error instanceof Error && error.message === "authorization_revoked") await removeConnection(userId);
      throw error;
    }
  },
  begin: async (userId, redirectUri) => {
    requireConfiguration(); requireRedirectUri(redirectUri);
    const state = randomUrlSafe(); const verifier = randomUrlSafe(48);
    const stateHash = await sha256Base64Url(state); const challenge = await sha256Base64Url(verifier);
    await database.from("google_calendar_oauth_states").delete().eq("user_id", userId);
    const { error } = await database.from("google_calendar_oauth_states").insert({ state_hash: stateHash, user_id: userId, verifier_ciphertext: await encryptConnectorSecret(verifier, encryptionKey), redirect_uri: redirectUri, expires_at: new Date(Date.now() + 10 * 60_000).toISOString() });
    if (error) throw new Error("provider_failure");
    return { status: "authorization-required", authorizationUrl: buildGoogleAuthorizationUrl({ clientId, redirectUri, state, codeChallenge: challenge }) };
  },
  complete: async (userId, code, state, redirectUri) => {
    requireConfiguration(); requireRedirectUri(redirectUri);
    const stateHash = await sha256Base64Url(state);
    const { data, error } = await database.from("google_calendar_oauth_states").select("verifier_ciphertext,redirect_uri,expires_at").eq("state_hash", stateHash).eq("user_id", userId).maybeSingle();
    if (error || !data || data.redirect_uri !== redirectUri || Date.parse(data.expires_at) <= Date.now()) throw new Error("authorization_expired");
    await database.from("google_calendar_oauth_states").delete().eq("state_hash", stateHash).eq("user_id", userId);
    const verifier = await decryptConnectorSecret(data.verifier_ciphertext, encryptionKey);
    const tokens = await exchangeGoogleCode(fetch, { clientId, clientSecret, code, verifier, redirectUri });
    if (!tokens.refreshToken) throw new Error("authorization_expired");
    const now = new Date(); const end = new Date(now); end.setDate(end.getDate() + 1);
    const calendar = await readGoogleCalendarData(fetch, { accessToken: tokens.accessToken, windowStart: now.toISOString(), windowEnd: end.toISOString(), timezone: "UTC" });
    await saveConnection(userId, tokens, calendar.accountLabel);
    return { status: "connected", accountLabel: calendar.accountLabel };
  },
  read: async (userId, windowStart, windowEnd, timezone) => {
    requireConfiguration();
    const current = await validTokens(userId);
    if (!current) return { status: "disconnected" };
    try {
      const data = await readGoogleCalendarData(fetch, { accessToken: current.tokens.accessToken, windowStart, windowEnd, timezone });
      return { status: "connected", accountLabel: data.accountLabel, calendars: data.calendars, events: data.events, fetchedAt: new Date().toISOString(), windowStart, windowEnd };
    } catch (error) {
      if (error instanceof Error && error.message === "authorization_revoked") await removeConnection(userId);
      throw error;
    }
  },
  disconnect: async (userId) => {
    requireConfiguration();
    const current = await validTokens(userId).catch(() => null);
    try { if (current) await revokeGoogleToken(fetch, current.tokens.refreshToken ?? current.tokens.accessToken); } finally {
      await removeConnection(userId);
      await database.from("google_calendar_oauth_states").delete().eq("user_id", userId);
    }
    return { status: "disconnected" };
  },
});

Deno.serve(handler);
