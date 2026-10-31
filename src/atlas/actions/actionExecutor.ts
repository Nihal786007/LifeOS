import { AtlasPermissionEngine } from "./permissionEngine.ts";
import { createAtlasProposalFingerprint } from "./proposal.ts";
import { getConnectorCapabilityDefinition, getConnectorCapabilityForAction } from "../connectors/registry.ts";
import { createAtlasAttempt, notStartedResult } from "./actionOutcome.ts";
import { readTaskCreationReceipt } from "./mutationReceipt.ts";
import type { AtlasActionOutcome, AtlasNotStartedCategory, AtlasSuccessAudit } from "./actionOutcome.ts";
import type {
  AtlasActionApproval,
  AtlasActionAuditWriter,
  AtlasActionEntitySnapshot,
  AtlasActionExecutionResult,
  AtlasActionProposal,
  AtlasHabitUpdatePayload,
  AtlasActionAdapter,
  AtlasTaskCompletePayload,
  AtlasTaskCreatePayload,
  AtlasTaskSchedulePayload,
  AtlasTaskUpdatePayload,
  AtlasWeeklyFocusCreatePayload,
} from "./types.ts";

export function getAtlasActionReferenceProblem(
  proposal: AtlasActionProposal,
  snapshot: AtlasActionEntitySnapshot
): string | undefined {
  const payload = proposal.payload;
  switch (proposal.type) {
    case "task.create":
      return (payload as AtlasTaskCreatePayload).weeklyTargetId !== undefined && !snapshot.weeklyFocusIds.includes((payload as AtlasTaskCreatePayload).weeklyTargetId!)
        ? "The referenced Weekly Focus no longer exists." : undefined;
    case "task.update": {
      const update = payload as AtlasTaskUpdatePayload;
      if (!snapshot.taskIds.includes(update.taskId)) return "The referenced task no longer exists.";
      return update.weeklyTargetId !== undefined && update.weeklyTargetId !== null && !snapshot.weeklyFocusIds.includes(update.weeklyTargetId)
        ? "The referenced Weekly Focus no longer exists." : undefined;
    }
    case "task.complete":
      if (!snapshot.taskIds.includes((payload as AtlasTaskCompletePayload).taskId)) {
        return "The referenced task no longer exists.";
      }
      return snapshot.completedTaskIds.includes((payload as AtlasTaskCompletePayload).taskId)
        ? "The referenced task is already complete." : undefined;
    case "planning.task.schedule": {
      const schedule = payload as AtlasTaskSchedulePayload;
      if (!snapshot.taskIds.includes(schedule.taskId)) return "The referenced task no longer exists.";
      return schedule.weeklyTargetId !== undefined && schedule.weeklyTargetId !== null && !snapshot.weeklyFocusIds.includes(schedule.weeklyTargetId)
        ? "The referenced Weekly Focus no longer exists." : undefined;
    }
    case "habit.update":
      return snapshot.habitIds.includes((payload as AtlasHabitUpdatePayload).habitId) ? undefined : "The referenced habit no longer exists.";
    case "planning.weekly_focus.create":
      return snapshot.monthlyOutcomeIds.includes((payload as AtlasWeeklyFocusCreatePayload).monthlyTargetId) ? undefined : "The referenced Monthly Outcome no longer exists.";
    default:
      return undefined;
  }
}

export class AtlasActionExecutor {
  private readonly adapter: AtlasActionAdapter;
  private readonly auditWriter?: AtlasActionAuditWriter;
  private readonly submittedActionIds = new Set<string>();
  private readonly outcomes = new Map<string, AtlasActionOutcome>();

  getOutcome(actionId: string): AtlasActionOutcome | null {
    const value = this.outcomes.get(actionId);
    return value ? structuredClone(value) : null;
  }

  constructor(
    adapter: AtlasActionAdapter,
    auditWriter?: AtlasActionAuditWriter
  ) {
    this.adapter = adapter;
    this.auditWriter = auditWriter;
  }

  async executeApprovedAction(input: {
    proposal: AtlasActionProposal;
    approval?: AtlasActionApproval;
    snapshot: AtlasActionEntitySnapshot;
    executionScope?: {
      ownerUserId?: string;
      isCurrent(): boolean;
      readSnapshot(): AtlasActionEntitySnapshot;
    };
  }): Promise<AtlasActionExecutionResult> {
    let proposal = input.proposal;
    const { approval, snapshot } = input;
    const attempt = createAtlasAttempt(proposal, input.executionScope?.ownerUserId ?? null);
    const reject = (category: AtlasNotStartedCategory, reason: string) => {
      const result = notStartedResult(attempt, category, reason);
      if (category !== "duplicate-submission" && result.outcome) this.outcomes.set(proposal.id, result.outcome);
      return result;
    };
    if (this.submittedActionIds.has(proposal.id)) return reject("duplicate-submission", "This ATLAS action has already been submitted.");
    let startedAt: string;
    let dispatchProposal: AtlasActionProposal;
    let approvalRequired: boolean;
    let approvedAt: string | undefined;
    try {
      const permission = new AtlasPermissionEngine().evaluate(proposal.type);
      if (permission.decision === "forbidden") return reject("permission-denied", permission.reason);
      if (proposal.source !== "atlas" || proposal.risk !== permission.risk ||
          proposal.requiresApproval !== (permission.decision === "approval-required")) {
        return reject("permission-denied", "The proposal permission metadata is invalid.");
      }
      approvalRequired = permission.decision === "approval-required";
      if (approvalRequired && (!approval || approval.version !== "1.1.0" || approval.source !== "user" ||
          approval.actionId !== proposal.id || approval.decision !== "approved" ||
          approval.proposalFingerprint !== createAtlasProposalFingerprint(proposal) ||
          Number.isNaN(Date.parse(approval.decidedAt)))) {
        return reject("approval-invalid", "Explicit current user approval is required.");
      }
      approvedAt = approvalRequired ? approval?.decidedAt : undefined;
      const scope = input.executionScope;
      if (scope && !scope.isCurrent()) return reject("account-stale", "The action account scope is no longer current.");
      const problem = getAtlasActionReferenceProblem(proposal, scope ? scope.readSnapshot() : snapshot);
      if (problem) return reject("reference-invalid", problem);
      dispatchProposal = structuredClone(proposal);
      // Retain a private validated snapshot for completion/audit metadata. Neither
      // the caller nor the adapter may retarget it while an operation is pending.
      proposal = structuredClone(dispatchProposal);
      if (scope && !scope.isCurrent()) {
        return reject("account-stale", "The action account scope is no longer current.");
      }
      startedAt = new Date().toISOString();
    } catch {
      return reject("preflight-error", "The action could not be validated. Nothing was dispatched.");
    }
    const publish = (outcome: AtlasActionOutcome) => {
      this.outcomes.set(proposal.id, structuredClone(outcome));
      return structuredClone(outcome);
    };
    this.submittedActionIds.add(proposal.id);
    publish({ ...attempt, operation: { status: "in-flight", startedAt }, audit: { status: "not-required" } });
    const unknown = (category: "adapter-exception" | "adapter-uncertain" | "malformed-adapter-result"): AtlasActionExecutionResult => ({
      status: "unknown", actionId: proposal.id, safeError: "The operation may have been applied. Reconcile its result before trying again.",
      outcome: publish({ ...attempt, operation: { status: "unknown", category, startedAt, completedAt: new Date().toISOString() }, audit: { status: "not-required" } }),
    });
    let mutation: unknown;
    try {
      mutation = await this.adapter.execute(dispatchProposal, Object.freeze({ ...attempt }));
    } catch {
      // A thrown error after invocation is not proof that no mutation occurred.
      return unknown("adapter-exception");
    }
    let entityId: number | undefined;
    let executionRecordIds: number[] = [];
    let confirmation: "adapter-acknowledged" | "canonical-accepted" = "adapter-acknowledged";
    try {
      if (typeof mutation !== "object" || mutation === null) return unknown("malformed-adapter-result");
      const value = mutation as Record<string, unknown>;
      if ("receipt" in value) {
        if (Object.keys(value).length !== 1 || !Object.hasOwn(value, "receipt")) return unknown("malformed-adapter-result");
        const receipt = readTaskCreationReceipt(value.receipt, attempt);
        if (!receipt) return unknown("malformed-adapter-result");
        if (receipt.status === "rejected") return {
          status: "rejected", actionId: proposal.id, reason: "The canonical task mutation was not accepted.",
          outcome: publish({ ...attempt, operation: { status: "failed", category: "adapter-declined", startedAt, completedAt: new Date().toISOString() }, audit: { status: "not-required" } }),
        };
        entityId = receipt.entityId;
        confirmation = receipt.assurance;
      } else {
        if (value.outcome === "unknown") return unknown("adapter-uncertain");
        if (value.executed !== true && value.executed !== false) return unknown("malformed-adapter-result");
        if (value.entityId !== undefined) {
          if (typeof value.entityId !== "number" || !Number.isSafeInteger(value.entityId) || value.entityId <= 0) return unknown("malformed-adapter-result");
          entityId = value.entityId;
        }
        if (value.executionRecordIds !== undefined) {
          if (!Array.isArray(value.executionRecordIds) || value.executionRecordIds.length > 1000 ||
              !Array.from(value.executionRecordIds).every(id => typeof id === "number" && Number.isSafeInteger(id) && id > 0)) return unknown("malformed-adapter-result");
          executionRecordIds = [...value.executionRecordIds];
        }
        if (!value.executed) return {
          status: "rejected", actionId: proposal.id, reason: "The trusted adapter confirmed that this operation was not applied.",
          outcome: publish({ ...attempt, operation: { status: "failed", category: "adapter-declined", startedAt, completedAt: new Date().toISOString() }, audit: { status: "not-required" } }),
        };
      }
    } catch { return unknown("malformed-adapter-result"); }
    const operation = { status: "succeeded" as const, confirmation, startedAt, completedAt: new Date().toISOString() };
    publish({ ...attempt, operation, audit: this.auditWriter ? { status: "pending" } : { status: "not-configured" } });
    let audit: AtlasSuccessAudit = { status: "not-configured" };
    let auditIds: readonly number[] = [];
    if (this.auditWriter) try {
      const capability = getConnectorCapabilityForAction(proposal.type);
      const connectorDefinition = capability ? getConnectorCapabilityDefinition(capability) : undefined;
      const receipt = await this.auditWriter.record({
        actionId: proposal.id,
        actionType: proposal.type,
        ...(approvedAt === undefined ? {} : { approvedAt }),
        approvalRequired,
        source: "atlas",
        ...(connectorDefinition ? { connectorId: connectorDefinition.connectorId, capability: connectorDefinition.capability } : {}),
        resultStatus: "executed",
      });
      const confirmed = !Array.isArray(receipt) && "persistence" in receipt && receipt.persistence === "confirmed";
      const ids = Array.isArray(receipt) ? receipt : "recordIds" in receipt ? receipt.recordIds : [];
      if (Array.isArray(ids) && ids.length > 0 && ids.length <= 1000 &&
          Array.from(ids).every(id => typeof id === "number" && Number.isSafeInteger(id) && id > 0)) {
        auditIds = [...ids];
        audit = confirmed ? { status: "confirmed", recordIds: auditIds } : { status: "unconfirmed", category: "receipt-unconfirmed" };
      } else audit = { status: "unconfirmed", category: "receipt-unconfirmed" };
    } catch {
      audit = { status: "unconfirmed", category: "append-error" };
    }
    return {
      status: "executed",
      actionId: proposal.id,
      ...(entityId === undefined ? {} : { entityId }),
      executionRecordIds: [...executionRecordIds, ...auditIds],
      outcome: publish({ ...attempt, operation, audit }),
    };
  }
}
