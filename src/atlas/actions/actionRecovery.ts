import { AtlasPermissionEngine } from "./permissionEngine.ts";
import { atlasRecoveryPolicy } from "./actionOutcome.ts";
import type { AtlasActionOutcome } from "./actionOutcome.ts";
import type { AtlasActionType } from "./types.ts";

export interface AtlasAttemptReadRequest {
  ownerUserId: string;
  actionId: string;
  actionType: AtlasActionType;
  attemptId: string;
}
export interface AtlasReadOnlyReconciler {
  readonly actionType: AtlasActionType;
  readonly mode: "read-only";
  /** Must read an authoritative per-attempt receipt, not infer failure from absence.
   * A model/provider must never supply this capability or its evidence. */
  readAttemptReceipt(request: Readonly<AtlasAttemptReadRequest>): Promise<unknown>;
}
export type AtlasReconciliationResult =
  | { status: "denied"; category: "account-mismatch" | "permission-denied" }
  | { status: "not-needed"; category: "operation-already-known" }
  | { status: "unresolved"; category: "unsupported" | "insufficient-evidence" | "read-failed" }
  | { status: "resolved"; operation: "succeeded" | "failed";
      retry: "not-offered" | "new-proposal-and-approval-only" };

export async function reconcileAtlasActionOutcome(
  outcome: AtlasActionOutcome,
  options: { currentOwner(): string | null; reader?: AtlasReadOnlyReconciler }
): Promise<AtlasReconciliationResult> {
  const ownsScope = () => {
    try { return !!outcome.ownerUserId && options.currentOwner() === outcome.ownerUserId; }
    catch { return false; }
  };
  if (!ownsScope() || !outcome.ownerUserId) return { status: "denied", category: "account-mismatch" };
  if (new AtlasPermissionEngine().evaluate(outcome.actionType).decision === "forbidden") return { status: "denied", category: "permission-denied" };
  if (outcome.operation.status !== "unknown") return { status: "not-needed", category: "operation-already-known" };
  const reader = options.reader;
  if (!reader || reader.mode !== "read-only" || reader.actionType !== outcome.actionType) {
    return { status: "unresolved", category: "unsupported" };
  }
  let evidence: unknown;
  try {
    evidence = await reader.readAttemptReceipt(Object.freeze({ ownerUserId: outcome.ownerUserId,
      actionId: outcome.actionId, actionType: outcome.actionType, attemptId: outcome.attemptId }));
  } catch { return { status: "unresolved", category: "read-failed" }; }
  if (!ownsScope()) return { status: "denied", category: "account-mismatch" };
  try {
    if (typeof evidence !== "object" || evidence === null) return { status: "unresolved", category: "insufficient-evidence" };
    const receipt = evidence as Record<string, unknown>;
    if (Object.keys(receipt).some(key => !["kind", "ownerUserId", "actionId", "actionType", "attemptId", "operation"].includes(key)) ||
        receipt.kind !== "authoritative-attempt-receipt" || receipt.ownerUserId !== outcome.ownerUserId ||
        receipt.actionId !== outcome.actionId || receipt.actionType !== outcome.actionType || receipt.attemptId !== outcome.attemptId ||
        (receipt.operation !== "succeeded" && receipt.operation !== "failed")) {
      return { status: "unresolved", category: "insufficient-evidence" };
    }
    return { status: "resolved", operation: receipt.operation,
      retry: receipt.operation === "failed" ? "new-proposal-and-approval-only" : "not-offered" };
  } catch { return { status: "unresolved", category: "insufficient-evidence" }; }
}

/** A policy answer, not an executor or permission to reuse an old approval. */
export function atlasRetryDecision(outcome: AtlasActionOutcome, currentOwner: string | null) {
  if (!currentOwner || outcome.ownerUserId !== currentOwner ||
      new AtlasPermissionEngine().evaluate(outcome.actionType).decision === "forbidden") return "denied" as const;
  return atlasRecoveryPolicy(outcome).retry;
}
