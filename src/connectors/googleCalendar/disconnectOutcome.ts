export type GoogleRevocation = "confirmed" | "rejected" | "unknown";
export interface GoogleDisconnectOutcome {
  localAccessRemoved: boolean;
  googleRevocation: GoogleRevocation | "not_attempted";
  reason: "completed" | "no_connection" | "in_progress" | "credential_unavailable" | "retirement_failed" | "outcome_unrecorded";
}

export const GOOGLE_CONNECTIONS_RECOVERY_URL = "https://myaccount.google.com/connections";

export function disconnectMessage(outcome: GoogleDisconnectOutcome): string {
  if (!outcome.localAccessRemoved) return "LifeOS couldn't complete disconnection. Please try again. Google authorization was not confirmed revoked.";
  if (outcome.reason === "outcome_unrecorded") return "LifeOS retired the selected connection, but couldn't verify its final saved status. Refresh the connection status and review Google Account access before reconnecting.";
  if (outcome.reason === "in_progress") return "LifeOS has removed its stored connection. Google revocation is still being checked. If this persists, try Disconnect again after one minute.";
  if (outcome.reason === "no_connection") return "LifeOS has no stored connection. This is not new confirmation of Google revocation. Review access in your Google Account if needed.";
  if (outcome.googleRevocation === "confirmed") return "Google confirmed the authorization was revoked. LifeOS has removed this connection. Google's revocation may take time to fully apply.";
  return "LifeOS has removed its connection, but Google revocation could not be confirmed. Review third-party access in your Google Account before reconnecting.";
}

export function parseDisconnectOutcome(value: unknown): GoogleDisconnectOutcome {
  if (typeof value !== "object" || !value || Array.isArray(value)) throw new Error("Invalid disconnect outcome.");
  const record = value as Record<string, unknown>;
  if (Object.keys(record).sort().join(",") !== "googleRevocation,localAccessRemoved,reason"
    || typeof record.localAccessRemoved !== "boolean"
    || !["confirmed", "rejected", "unknown", "not_attempted"].includes(String(record.googleRevocation))
    || !["completed", "no_connection", "in_progress", "credential_unavailable", "retirement_failed", "outcome_unrecorded"].includes(String(record.reason))
    || (!record.localAccessRemoved && (record.reason !== "retirement_failed" || record.googleRevocation !== "not_attempted"))
    || (record.localAccessRemoved && record.reason === "retirement_failed")
    || (record.localAccessRemoved && record.reason !== "no_connection" && record.googleRevocation === "not_attempted")
    || (record.reason === "credential_unavailable" && record.googleRevocation !== "unknown")
    || (record.reason === "in_progress" && record.googleRevocation !== "unknown")) throw new Error("Invalid disconnect outcome.");
  return record as unknown as GoogleDisconnectOutcome;
}
