import type { AtlasAttemptIdentity } from "./actionOutcomeTypes.ts";
import type { AtlasTaskCreationReceipt } from "./mutationReceiptTypes.ts";

/** Only trusted canonical ports can issue evidence; this parser grants no authority. */
export function readTaskCreationReceipt(value: unknown, attempt: AtlasAttemptIdentity): AtlasTaskCreationReceipt | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const raw = value as Record<string, unknown>;
  const { version, actionType, actionId, attemptId, ownerUserId, status, assurance, entityId } = raw;
  const keys = status === "accepted"
    ? ["version", "actionType", "actionId", "attemptId", "ownerUserId", "status", "assurance", "entityId"]
    : ["version", "actionType", "actionId", "attemptId", "ownerUserId", "status", "assurance"];
  if (Object.keys(raw).length !== keys.length || Object.keys(raw).some(key => !keys.includes(key)) ||
      version !== "1.0.0" || actionType !== "task.create" || attempt.actionType !== actionType ||
      actionId !== attempt.actionId || attemptId !== attempt.attemptId ||
      !ownerUserId || ownerUserId !== attempt.ownerUserId) return null;
  const identity = { version: "1.0.0" as const, actionType: "task.create" as const,
    actionId: attempt.actionId, attemptId: attempt.attemptId, ownerUserId: attempt.ownerUserId! };
  if (status === "accepted" && assurance === "canonical-accepted" && typeof entityId === "number" && Number.isSafeInteger(entityId) && entityId > 0) {
    return { ...identity, status, assurance, entityId };
  }
  return status === "rejected" && assurance === "not-applied" ? { ...identity, status, assurance } : null;
}
