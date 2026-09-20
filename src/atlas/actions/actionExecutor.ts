import { AtlasPermissionEngine } from "./permissionEngine.ts";
import type {
  AtlasActionApproval,
  AtlasActionAuditWriter,
  AtlasActionEntitySnapshot,
  AtlasActionExecutionResult,
  AtlasActionProposal,
  AtlasHabitUpdatePayload,
  AtlasLifeOSActionAdapter,
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
  private readonly adapter: AtlasLifeOSActionAdapter;
  private readonly auditWriter?: AtlasActionAuditWriter;
  private readonly executingActionIds = new Set<string>();
  private readonly executedActionIds = new Set<string>();

  constructor(
    adapter: AtlasLifeOSActionAdapter,
    auditWriter?: AtlasActionAuditWriter
  ) {
    this.adapter = adapter;
    this.auditWriter = auditWriter;
  }

  async executeApprovedAction(input: {
    proposal: AtlasActionProposal;
    approval?: AtlasActionApproval;
    snapshot: AtlasActionEntitySnapshot;
  }): Promise<AtlasActionExecutionResult> {
    const { proposal, approval, snapshot } = input;
    if (this.executingActionIds.has(proposal.id) || this.executedActionIds.has(proposal.id)) {
      return { status: "rejected", actionId: proposal.id, reason: "This ATLAS action has already been submitted." };
    }
    const permission = new AtlasPermissionEngine().evaluate(proposal.type);
    if (permission.decision === "forbidden") {
      return { status: "rejected", actionId: proposal.id, reason: permission.reason };
    }
    if (proposal.source !== "atlas" || proposal.risk !== permission.risk ||
        proposal.requiresApproval !== (permission.decision === "approval-required")) {
      return { status: "rejected", actionId: proposal.id, reason: "The proposal permission metadata is invalid." };
    }
    if (!approval || approval.version !== "1.0.0" || approval.source !== "user" ||
        approval.actionId !== proposal.id || approval.decision !== "approved" ||
        Number.isNaN(Date.parse(approval.decidedAt))) {
      return { status: "rejected", actionId: proposal.id, reason: "Explicit current user approval is required." };
    }
    const problem = getAtlasActionReferenceProblem(proposal, snapshot);
    if (problem) return { status: "rejected", actionId: proposal.id, reason: problem };

    this.executingActionIds.add(proposal.id);
    try {
      const mutation = await this.adapter.execute(proposal);
      if (!mutation.executed) {
        this.executingActionIds.delete(proposal.id);
        return { status: "rejected", actionId: proposal.id, reason: mutation.reason ?? "The trusted LifeOS mutation was not applied." };
      }
      this.executedActionIds.add(proposal.id);
      const auditIds = this.auditWriter
        ? await this.auditWriter.record({
            actionId: proposal.id,
            actionType: proposal.type,
            approvedAt: approval.decidedAt,
            approvalRequired: true,
            source: "atlas",
          })
        : [];
      this.executingActionIds.delete(proposal.id);
      return {
        status: "executed",
        actionId: proposal.id,
        ...(mutation.entityId === undefined ? {} : { entityId: mutation.entityId }),
        executionRecordIds: [...(mutation.executionRecordIds ?? []), ...auditIds],
      };
    } catch {
      this.executingActionIds.delete(proposal.id);
      return { status: "failed", actionId: proposal.id, safeError: "The approved LifeOS action could not be completed safely." };
    }
  }
}
