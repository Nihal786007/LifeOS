/** No vendor bodies or credential-derived diagnostics cross this boundary. */
import type { GoogleRevocation, GoogleDisconnectOutcome } from "../../../src/connectors/googleCalendar/disconnectOutcome.ts";
export type { GoogleRevocation } from "../../../src/connectors/googleCalendar/disconnectOutcome.ts";

export interface RetiredGoogleConnection {
  operationId: string;
  kind: "retired" | "no_connection" | "in_progress" | "settled";
  revocation: GoogleRevocation | "not_attempted";
  accessCiphertext?: string;
  refreshCiphertext?: string | null;
}

export interface DisconnectDependencies {
  // Atomically removes usable credentials and pending OAuth state, under a per-user fence.
  retire(userId: string): Promise<RetiredGoogleConnection>;
  decrypt(ciphertext: string): Promise<string>;
  revoke(token: string): Promise<GoogleRevocation>;
  finish(userId: string, operationId: string, revocation: GoogleRevocation): Promise<boolean>;
}

export async function disconnectGoogleCalendar(userId: string, dependencies: DisconnectDependencies): Promise<GoogleDisconnectOutcome> {
  let retired: RetiredGoogleConnection;
  try { retired = await dependencies.retire(userId); }
  catch { return { localAccessRemoved: false, googleRevocation: "not_attempted", reason: "retirement_failed" }; }
  if (retired.kind !== "retired") {
    return { localAccessRemoved: true, googleRevocation: retired.revocation, reason: retired.kind === "in_progress" ? "in_progress" : retired.kind === "no_connection" ? "no_connection" : "completed" };
  }
  let revocation: GoogleRevocation = "unknown";
  let reason: GoogleDisconnectOutcome["reason"] = "credential_unavailable";
  try {
    const ciphertext = retired.refreshCiphertext || retired.accessCiphertext;
    const token = ciphertext ? await dependencies.decrypt(ciphertext) : "";
    if (token.trim()) {
      reason = "completed";
      revocation = await dependencies.revoke(token);
    }
  } catch { /* Retirement is durable even when decryption/transport is unavailable. */ }
  try {
    if (!await dependencies.finish(userId, retired.operationId, revocation)) reason = "outcome_unrecorded";
  } catch { reason = "outcome_unrecorded"; }
  return { localAccessRemoved: true, googleRevocation: revocation, reason };
}
