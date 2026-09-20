import type { ExecutionRecord } from "../../shared/execution";
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
  createTask(payload: AtlasTaskCreatePayload): void;
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
    async execute(proposal: AtlasActionProposal): Promise<AtlasTrustedMutationResult> {
      switch (proposal.type) {
        case "task.create":
          ports.createTask(proposal.payload as AtlasTaskCreatePayload);
          return { executed: true };
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
      }
    },
  };
}

export interface AtlasActionAuditDependencies {
  append(records: ExecutionRecord[]): void;
  createId(): number;
  now(): string;
}

export function createAtlasActionAuditWriter(
  dependencies: AtlasActionAuditDependencies
): AtlasActionAuditWriter {
  return {
    async record(entry: AtlasActionAuditEntry): Promise<readonly number[]> {
      const id = dependencies.createId();
      dependencies.append([{
        id,
        type: "system",
        entityId: id,
        title: "ATLAS action executed",
        description: entry.actionType,
        createdAt: dependencies.now(),
        xpAwarded: 0,
        metadata: {
          source: entry.source,
          atlasActionId: entry.actionId,
          actionType: entry.actionType,
          approvalRequired: entry.approvalRequired,
          approvedAt: entry.approvedAt,
        },
      }]);
      return [id];
    },
  };
}
