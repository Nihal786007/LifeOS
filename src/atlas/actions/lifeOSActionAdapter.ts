import type { ExecutionRecord } from "../../shared/execution";
import type { TaskCreationAcceptance } from "../../shared/taskMutation.ts";
import type { AtlasAttemptIdentity } from "./actionOutcomeTypes.ts";
import type {
  AtlasActionAuditEntry,
  AtlasActionAuditWriter,
  AtlasActionProposal,
  AtlasHabitCreatePayload,
  AtlasHabitUpdatePayload,
  AtlasLifeOSActionAdapter,
  AtlasTaskCompletePayload,
  AtlasTaskCreatePayload,
  AtlasTaskSchedulePayload,
  AtlasTaskUpdatePayload,
  AtlasTrustedMutationResult,
  AtlasWeeklyFocusCreatePayload,
} from "./types.ts";

export interface TrustedLifeOSActionPorts {
  createTask(payload: AtlasTaskCreatePayload): TaskCreationAcceptance | void;
  updateTask(taskId: number, updates: Omit<AtlasTaskUpdatePayload, "taskId">): { updated: boolean; message: string };
  completeTask(taskId: number): void;
  createHabit(payload: AtlasHabitCreatePayload): void;
  updateHabit(habitId: number, updates: Omit<AtlasHabitUpdatePayload, "habitId">): void;
  createCapture(text: string): Promise<void>;
  createGoalWeeklyFocus(payload: Omit<AtlasWeeklyFocusCreatePayload, "scope">): { created: boolean; message: string };
  createPersonalWeeklyFocus(payload: Omit<AtlasWeeklyFocusCreatePayload, "scope">): { created: boolean; message: string };
}

export function createLifeOSActionAdapter(
  ports: TrustedLifeOSActionPorts
): AtlasLifeOSActionAdapter {
  return {
    async execute(proposal: AtlasActionProposal, attempt?: Readonly<AtlasAttemptIdentity>): Promise<AtlasTrustedMutationResult> {
      switch (proposal.type) {
        case "task.create": {
          const result = ports.createTask(proposal.payload as AtlasTaskCreatePayload);
          if (result === undefined) return { executed: true }; // Legacy acknowledgement only.
          if (!attempt?.ownerUserId || attempt.actionId !== proposal.id || attempt.actionType !== "task.create") return { outcome: "unknown" };
          const identity = { version: "1.0.0" as const, actionType: "task.create" as const,
            actionId: attempt.actionId, attemptId: attempt.attemptId, ownerUserId: attempt.ownerUserId };
          if (result?.status === "rejected" && Object.keys(result).length === 1 && Object.hasOwn(result, "status")) {
            return { receipt: { ...identity, status: "rejected", assurance: "not-applied" } };
          }
          if (result?.status === "accepted" && Object.keys(result).length === 2 &&
              Object.hasOwn(result, "status") && Object.hasOwn(result, "taskId") &&
              Number.isSafeInteger(result.taskId) && result.taskId > 0) {
            return { receipt: { ...identity, status: "accepted", assurance: "canonical-accepted", entityId: result.taskId } };
          }
          return { outcome: "unknown" };
        }
        case "task.update": {
          const { taskId, ...updates } = proposal.payload as AtlasTaskUpdatePayload;
          const result = ports.updateTask(taskId, updates);
          return { executed: result.updated, entityId: taskId, reason: result.message };
        }
        case "task.complete": {
          const { taskId } = proposal.payload as AtlasTaskCompletePayload;
          ports.completeTask(taskId);
          return { executed: true, entityId: taskId };
        }
        case "habit.create":
          ports.createHabit(proposal.payload as AtlasHabitCreatePayload);
          return { executed: true };
        case "habit.update": {
          const { habitId, ...updates } = proposal.payload as AtlasHabitUpdatePayload;
          ports.updateHabit(habitId, updates);
          return { executed: true, entityId: habitId };
        }
        case "capture.create":
          await ports.createCapture(proposal.payload.text);
          return { executed: true };
        case "planning.weekly_focus.create": {
          const { scope, ...payload } = proposal.payload as AtlasWeeklyFocusCreatePayload;
          const result = scope === "goal"
            ? ports.createGoalWeeklyFocus(payload)
            : ports.createPersonalWeeklyFocus(payload);
          return { executed: result.created, reason: result.message };
        }
        case "planning.task.schedule": {
          const { taskId, dueDate, weeklyTargetId } = proposal.payload as AtlasTaskSchedulePayload;
          const result = ports.updateTask(taskId, {
            dueDate,
            ...(weeklyTargetId === undefined ? {} : { weeklyTargetId }),
          });
          return { executed: result.updated, entityId: taskId, reason: result.message };
        }
        default:
          return { executed: false, reason: "The action is not a LifeOS domain mutation." };
      }
    },
  };
}

export interface AtlasActionAuditDependencies {
  append(records: ExecutionRecord[]): unknown;
  confirmation?: "repository";
  createId(): number;
  now(): string;
}

export function createAtlasActionAuditWriter(
  dependencies: AtlasActionAuditDependencies
): AtlasActionAuditWriter {
  return {
    async record(entry: AtlasActionAuditEntry) {
      const id = dependencies.createId();
      await dependencies.append([{
        id,
        type: "system",
        entityId: id,
        title: entry.connectorId ? "ATLAS mock connector simulated" : "ATLAS action executed",
        description: entry.actionType,
        createdAt: dependencies.now(),
        xpAwarded: 0,
        metadata: {
          source: entry.source,
          atlasActionId: entry.actionId,
          actionType: entry.actionType,
          approvalRequired: entry.approvalRequired,
          ...(entry.approvedAt === undefined ? {} : { approvedAt: entry.approvedAt }),
          ...(entry.connectorId === undefined ? {} : { connectorId: entry.connectorId }),
          ...(entry.capability === undefined ? {} : { capability: entry.capability }),
          resultStatus: entry.resultStatus,
        },
      }]);
      return dependencies.confirmation === "repository"
        ? { recordIds: [id], persistence: "confirmed" as const } : [id];
    },
  };
}
