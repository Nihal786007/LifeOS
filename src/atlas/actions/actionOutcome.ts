import { ATLAS_ACTION_TYPES } from "./candidate.ts";
import type { AtlasActionExecutionResult, AtlasActionProposal } from "./types.ts";
import type { AtlasActionOutcome, AtlasAttemptIdentity, AtlasNotStartedCategory } from "./actionOutcomeTypes.ts";
export type { AtlasActionOutcome, AtlasAttemptIdentity, AtlasNotStartedCategory, AtlasSuccessAudit } from "./actionOutcomeTypes.ts";

export function createAtlasAttempt(
  proposal: AtlasActionProposal, ownerUserId: string | null,
  attemptId = crypto.randomUUID(), preparedAt = new Date().toISOString()
): AtlasAttemptIdentity {
  return { version: "1.0.0", actionId: /^atlas-action:[a-f0-9-]{36}$/i.test(proposal.id) ? proposal.id : "unsupported-action",
    actionType: ATLAS_ACTION_TYPES.includes(proposal.type) ? proposal.type : "unsupported",
    ownerUserId, attemptId, preparedAt };
}

export function notStartedResult(
  attempt: AtlasAttemptIdentity, category: AtlasNotStartedCategory, reason: string
): AtlasActionExecutionResult {
  return { status: "rejected", actionId: attempt.actionId, reason,
    outcome: { ...attempt, operation: { status: "not-started", category }, audit: { status: "not-required" } } };
}

export function atlasRecoveryPolicy(outcome: AtlasActionOutcome) {
  const operation = outcome.operation.status;
  return {
    reconciliationRequired: operation === "unknown",
    auditAttentionRequired: operation === "succeeded" && outcome.audit.status !== "confirmed",
    retry: operation === "unknown" ? "blocked-until-reconciled" as const :
      operation === "failed" || (outcome.operation.status === "not-started" && outcome.operation.category === "cancelled")
        ? "new-proposal-and-approval-only" as const : "not-offered" as const,
    automaticRetry: false as const,
  };
}

export function atlasOutcomeMessage(outcome: AtlasActionOutcome): { title: string; detail: string } {
  switch (outcome.operation.status) {
    case "not-started": return { title: outcome.operation.category === "permission-denied" ? "Action not allowed" : "Action not started", detail: outcome.operation.category === "permission-denied"
      ? "The deterministic permission policy denied this request. Nothing was dispatched."
      : outcome.operation.category === "cancelled"
      ? "Cancelled before execution. Nothing was dispatched."
      : "This submission was not dispatched. An earlier submitted attempt may still have an outcome." };
    case "in-flight": return { title: "Action in progress", detail: "An approved operation has started. Closing this view cannot undo it." };
    case "failed": return { title: "Action not applied", detail: "The trusted adapter confirmed it did not apply this operation. A new proposal and approval are required to try again." };
    case "unknown": return { title: "Action outcome unknown", detail: "The operation may have been applied. Check its account-scoped result before trying again. Do not repeat it automatically." };
    case "succeeded": return { title: outcome.audit.status === "confirmed" ? "Action acknowledged" : "Action acknowledged · audit unconfirmed",
      detail: outcome.audit.status === "confirmed"
        ? "The adapter acknowledged the action and the local audit repository confirmed its record. Cloud synchronization is separate."
        : "The adapter acknowledged the action, but its audit is not confirmed. Do not repeat the action to repair the audit." };
  }
}
