import type { CreateTaskInput, TaskPriority, UpdateTaskInput } from "../../shared/types";
import type {
  CreateHabitInput,
  HabitWeekday,
  UpdateHabitInput,
} from "../../shared/habits";

export const ATLAS_ACTION_PROPOSAL_VERSION = "1.0.0" as const;
export const ATLAS_ACTION_APPROVAL_VERSION = "1.1.0" as const;

export type AtlasActionType =
  | "task.create"
  | "task.update"
  | "task.complete"
  | "habit.create"
  | "habit.update"
  | "capture.create"
  | "planning.weekly_focus.create"
  | "planning.task.schedule"
  | "calendar.read"
  | "calendar.event.create"
  | "messaging.message.prepare"
  | "messaging.message.send"
  | "finance.balance.read"
  | "finance.transactions.read"
  | "finance.spending.summary";

export type AtlasActionRisk =
  | "READ_ONLY"
  | "LOW_RISK_WRITE"
  | "CONFIRM_REQUIRED"
  | "HIGH_RISK"
  | "FORBIDDEN";

export type AtlasTaskCreatePayload = CreateTaskInput;

export interface AtlasTaskUpdatePayload extends UpdateTaskInput {
  taskId: number;
}

export interface AtlasTaskCompletePayload {
  taskId: number;
}

export type AtlasHabitCreatePayload = CreateHabitInput;

export interface AtlasHabitUpdatePayload extends UpdateHabitInput {
  habitId: number;
}

export interface AtlasCaptureCreatePayload {
  text: string;
}

export interface AtlasWeeklyFocusCreatePayload {
  scope: "goal" | "personal";
  title: string;
  monthlyTargetId: number;
  weekStartDate: string;
  weekEndDate: string;
}

export interface AtlasTaskSchedulePayload {
  taskId: number;
  dueDate: string;
  weeklyTargetId?: number | null;
}

export interface AtlasCalendarReadPayload { date?: string; }
export interface AtlasCalendarEventCreatePayload {
  title: string;
  date: string;
  startTime?: string;
  endTime?: string;
}
export interface AtlasMessagingPayload { recipient: string; content: string; }
export interface AtlasFinanceBalanceReadPayload { accountLabel?: string; }
export interface AtlasFinanceTransactionsReadPayload { limit?: number; }
export interface AtlasFinanceSpendingSummaryPayload { period: "week" | "month"; }

export interface AtlasActionPayloadByType {
  "task.create": AtlasTaskCreatePayload;
  "task.update": AtlasTaskUpdatePayload;
  "task.complete": AtlasTaskCompletePayload;
  "habit.create": AtlasHabitCreatePayload;
  "habit.update": AtlasHabitUpdatePayload;
  "capture.create": AtlasCaptureCreatePayload;
  "planning.weekly_focus.create": AtlasWeeklyFocusCreatePayload;
  "planning.task.schedule": AtlasTaskSchedulePayload;
  "calendar.read": AtlasCalendarReadPayload;
  "calendar.event.create": AtlasCalendarEventCreatePayload;
  "messaging.message.prepare": AtlasMessagingPayload;
  "messaging.message.send": AtlasMessagingPayload;
  "finance.balance.read": AtlasFinanceBalanceReadPayload;
  "finance.transactions.read": AtlasFinanceTransactionsReadPayload;
  "finance.spending.summary": AtlasFinanceSpendingSummaryPayload;
}

interface AtlasActionProposalBase<T extends AtlasActionType> {
  version: typeof ATLAS_ACTION_PROPOSAL_VERSION;
  id: string;
  type: T;
  title: string;
  description?: string;
  createdAt: string;
  source: "atlas";
  risk: AtlasActionRisk;
  requiresApproval: boolean;
  payload: AtlasActionPayloadByType[T];
  rationale?: string;
  evidenceReferences: readonly string[];
}

export type AtlasActionProposal = {
  [T in AtlasActionType]: AtlasActionProposalBase<T>;
}[AtlasActionType];

export interface AtlasActionProposalDraft {
  type: AtlasActionType;
  title: string;
  description?: string;
  payload: unknown;
  rationale?: string;
  evidenceReferences?: readonly string[];
}

export interface AtlasActionApproval {
  version: typeof ATLAS_ACTION_APPROVAL_VERSION;
  actionId: string;
  decision: "approved" | "rejected";
  source: "user";
  decidedAt: string;
  proposalFingerprint: string;
}

export interface AtlasActionEntitySnapshot {
  taskIds: readonly number[];
  completedTaskIds: readonly number[];
  habitIds: readonly number[];
  monthlyOutcomeIds: readonly number[];
  weeklyFocusIds: readonly number[];
}

export type AtlasActionExecutionResult =
  | {
      status: "executed";
      actionId: string;
      entityId?: number;
      executionRecordIds?: readonly number[];
    }
  | {
      status: "rejected";
      actionId: string;
      reason: string;
    }
  | {
      status: "failed";
      actionId: string;
      safeError: string;
    };

export interface AtlasTrustedMutationResult {
  executed: boolean;
  entityId?: number;
  executionRecordIds?: readonly number[];
  reason?: string;
}

export interface AtlasActionAdapter {
  execute(proposal: AtlasActionProposal): Promise<AtlasTrustedMutationResult>;
}

export type AtlasLifeOSActionAdapter = AtlasActionAdapter;

export interface AtlasActionAuditEntry {
  actionId: string;
  actionType: AtlasActionType;
  approvedAt?: string;
  approvalRequired: boolean;
  source: "atlas";
  connectorId?: string;
  capability?: string;
  resultStatus: "executed";
}

export interface AtlasActionAuditWriter {
  record(entry: AtlasActionAuditEntry): Promise<readonly number[]>;
}

export const ATLAS_ACTION_PRIORITIES: readonly TaskPriority[] = [
  "low", "medium", "high",
];

export const ATLAS_ACTION_WEEKDAYS: readonly HabitWeekday[] = [
  "monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday",
];
