import { AtlasPermissionEngine } from "./permissionEngine.ts";
import {
  ATLAS_ACTION_PRIORITIES,
  ATLAS_ACTION_PROPOSAL_VERSION,
  ATLAS_ACTION_WEEKDAYS,
} from "./types.ts";
import type {
  AtlasActionPayloadByType,
  AtlasActionProposal,
  AtlasActionProposalDraft,
  AtlasActionType,
} from "./types";

const ACTION_TYPES = new Set<AtlasActionType>([
  "task.create", "task.update", "task.complete", "habit.create", "habit.update",
  "capture.create", "planning.weekly_focus.create", "planning.task.schedule",
]);
const TOP_LEVEL_KEYS = [
  "type", "title", "description", "payload", "rationale", "evidenceReferences",
] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasOnlyKeys(value: Record<string, unknown>, allowed: readonly string[]): boolean {
  return Object.keys(value).every((key) => allowed.includes(key));
}

function requiredText(value: unknown, field: string, max = 240): string {
  if (typeof value !== "string" || value.trim().length === 0 || value.trim().length > max) {
    throw new Error(`${field} must be non-empty and at most ${max} characters.`);
  }
  return value.trim();
}

function optionalText(value: unknown, field: string, max = 500): string | undefined {
  if (value === undefined) return undefined;
  return requiredText(value, field, max);
}

function positiveId(value: unknown, field: string): number {
  if (!Number.isSafeInteger(value) || (value as number) <= 0) {
    throw new Error(`${field} must be a positive integer.`);
  }
  return value as number;
}

function localDate(value: unknown, field: string): string {
  if (typeof value !== "string") throw new Error(`${field} must be a local date.`);
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) throw new Error(`${field} must use YYYY-MM-DD.`);
  const parsed = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  if (parsed.getFullYear() !== Number(match[1]) ||
      parsed.getMonth() !== Number(match[2]) - 1 ||
      parsed.getDate() !== Number(match[3])) {
    throw new Error(`${field} must be a valid local date.`);
  }
  return value;
}

function optionalLocalDate(value: unknown, field: string): string | undefined {
  return value === undefined ? undefined : localDate(value, field);
}

function priority(value: unknown) {
  if (value === undefined) return undefined;
  if (!ATLAS_ACTION_PRIORITIES.includes(value as never)) {
    throw new Error("priority is invalid.");
  }
  return value as "low" | "medium" | "high";
}

function optionalRelationship(value: unknown, field: string): number | null | undefined {
  if (value === undefined || value === null) return value;
  return positiveId(value, field);
}

function parsePayload<T extends AtlasActionType>(
  type: T,
  value: unknown
): AtlasActionPayloadByType[T] {
  if (!isRecord(value)) throw new Error(`${type} payload must be an object.`);
  switch (type) {
    case "task.create": {
      if (!hasOnlyKeys(value, ["title", "description", "dueDate", "priority", "weeklyTargetId"])) throw new Error("task.create payload contains unsupported fields.");
      return {
        title: requiredText(value.title, "task title"),
        ...(optionalText(value.description, "task description") === undefined ? {} : { description: optionalText(value.description, "task description") }),
        ...(optionalLocalDate(value.dueDate, "task due date") === undefined ? {} : { dueDate: optionalLocalDate(value.dueDate, "task due date") }),
        ...(priority(value.priority) === undefined ? {} : { priority: priority(value.priority) }),
        ...(value.weeklyTargetId === undefined ? {} : { weeklyTargetId: positiveId(value.weeklyTargetId, "weeklyTargetId") }),
      } as unknown as AtlasActionPayloadByType[T];
    }
    case "task.update": {
      if (!hasOnlyKeys(value, ["taskId", "title", "description", "dueDate", "priority", "weeklyTargetId"])) throw new Error("task.update payload contains unsupported fields.");
      const updates = Object.keys(value).filter((key) => key !== "taskId");
      if (updates.length === 0) throw new Error("task.update requires at least one update.");
      return {
        taskId: positiveId(value.taskId, "taskId"),
        ...(value.title === undefined ? {} : { title: requiredText(value.title, "task title") }),
        ...(value.description === undefined ? {} : { description: value.description === null ? null : requiredText(value.description, "task description", 500) }),
        ...(value.dueDate === undefined ? {} : { dueDate: value.dueDate === null ? null : localDate(value.dueDate, "task due date") }),
        ...(priority(value.priority) === undefined ? {} : { priority: priority(value.priority) }),
        ...(value.weeklyTargetId === undefined ? {} : { weeklyTargetId: optionalRelationship(value.weeklyTargetId, "weeklyTargetId") }),
      } as unknown as AtlasActionPayloadByType[T];
    }
    case "task.complete":
      if (!hasOnlyKeys(value, ["taskId"])) throw new Error("task.complete payload contains unsupported fields.");
      return { taskId: positiveId(value.taskId, "taskId") } as unknown as AtlasActionPayloadByType[T];
    case "habit.create": {
      if (!hasOnlyKeys(value, ["name", "description", "activeDays", "startDate"])) throw new Error("habit.create payload contains unsupported fields.");
      if (!Array.isArray(value.activeDays) || value.activeDays.length === 0 ||
          !value.activeDays.every((day) => ATLAS_ACTION_WEEKDAYS.includes(day as never))) {
        throw new Error("habit activeDays must contain supported weekdays.");
      }
      return {
        name: requiredText(value.name, "habit name"),
        ...(optionalText(value.description, "habit description") === undefined ? {} : { description: optionalText(value.description, "habit description") }),
        activeDays: [...new Set(value.activeDays)] as never,
        ...(optionalLocalDate(value.startDate, "habit start date") === undefined ? {} : { startDate: optionalLocalDate(value.startDate, "habit start date") }),
      } as unknown as AtlasActionPayloadByType[T];
    }
    case "habit.update": {
      if (!hasOnlyKeys(value, ["habitId", "name", "description", "activeDays", "startDate"])) throw new Error("habit.update payload contains unsupported fields.");
      if (Object.keys(value).filter((key) => key !== "habitId").length === 0) throw new Error("habit.update requires at least one update.");
      if (value.activeDays !== undefined && (!Array.isArray(value.activeDays) || value.activeDays.length === 0 || !value.activeDays.every((day) => ATLAS_ACTION_WEEKDAYS.includes(day as never)))) throw new Error("habit activeDays must contain supported weekdays.");
      return {
        habitId: positiveId(value.habitId, "habitId"),
        ...(value.name === undefined ? {} : { name: requiredText(value.name, "habit name") }),
        ...(value.description === undefined ? {} : { description: value.description === null ? null : requiredText(value.description, "habit description", 500) }),
        ...(value.activeDays === undefined ? {} : { activeDays: [...new Set(value.activeDays)] }),
        ...(value.startDate === undefined ? {} : { startDate: localDate(value.startDate, "habit start date") }),
      } as unknown as AtlasActionPayloadByType[T];
    }
    case "capture.create":
      if (!hasOnlyKeys(value, ["text"])) throw new Error("capture.create payload contains unsupported fields.");
      return { text: requiredText(value.text, "capture text", 1000) } as unknown as AtlasActionPayloadByType[T];
    case "planning.weekly_focus.create": {
      if (!hasOnlyKeys(value, ["scope", "title", "monthlyTargetId", "weekStartDate", "weekEndDate"])) throw new Error("planning.weekly_focus.create payload contains unsupported fields.");
      if (value.scope !== "goal" && value.scope !== "personal") throw new Error("weekly focus scope is invalid.");
      const weekStartDate = localDate(value.weekStartDate, "weekStartDate");
      const weekEndDate = localDate(value.weekEndDate, "weekEndDate");
      if (weekStartDate > weekEndDate) throw new Error("weekly focus dates are out of order.");
      return { scope: value.scope, title: requiredText(value.title, "weekly focus title"), monthlyTargetId: positiveId(value.monthlyTargetId, "monthlyTargetId"), weekStartDate, weekEndDate } as unknown as AtlasActionPayloadByType[T];
    }
    case "planning.task.schedule":
      if (!hasOnlyKeys(value, ["taskId", "dueDate", "weeklyTargetId"])) throw new Error("planning.task.schedule payload contains unsupported fields.");
      return { taskId: positiveId(value.taskId, "taskId"), dueDate: localDate(value.dueDate, "task due date"), ...(value.weeklyTargetId === undefined ? {} : { weeklyTargetId: optionalRelationship(value.weeklyTargetId, "weeklyTargetId") }) } as unknown as AtlasActionPayloadByType[T];
  }
}

export function parseAtlasActionProposalDraft(value: unknown): AtlasActionProposalDraft {
  if (!isRecord(value) || !hasOnlyKeys(value, TOP_LEVEL_KEYS)) {
    throw new Error("ATLAS action proposal contains unsupported fields.");
  }
  if (typeof value.type !== "string" || !ACTION_TYPES.has(value.type as AtlasActionType)) {
    throw new Error("ATLAS action type is not supported.");
  }
  const evidenceReferences = value.evidenceReferences ?? [];
  if (!Array.isArray(evidenceReferences) || evidenceReferences.length > 12 ||
      !evidenceReferences.every((ref) => typeof ref === "string" && /^[A-Za-z][A-Za-z0-9.[\]_-]{0,199}$/.test(ref))) {
    throw new Error("ATLAS evidence references are invalid.");
  }
  return {
    type: value.type as AtlasActionType,
    title: requiredText(value.title, "proposal title"),
    ...(optionalText(value.description, "proposal description") === undefined ? {} : { description: optionalText(value.description, "proposal description") }),
    payload: parsePayload(value.type as AtlasActionType, value.payload),
    ...(optionalText(value.rationale, "proposal rationale", 1000) === undefined ? {} : { rationale: optionalText(value.rationale, "proposal rationale", 1000) }),
    evidenceReferences: [...evidenceReferences] as string[],
  };
}

export function createAtlasActionProposal(
  draftValue: unknown,
  options: {
    id: string;
    createdAt: string;
    allowedEvidenceReferences?: ReadonlySet<string>;
  }
): AtlasActionProposal {
  const draft = parseAtlasActionProposalDraft(draftValue);
  if (!/^atlas-action:[0-9a-f-]{36}$/i.test(options.id)) throw new Error("ATLAS action ID is invalid.");
  if (Number.isNaN(Date.parse(options.createdAt))) throw new Error("ATLAS action timestamp is invalid.");
  if (options.allowedEvidenceReferences && draft.evidenceReferences?.some((ref) => !options.allowedEvidenceReferences!.has(ref))) throw new Error("ATLAS action references unsupported evidence.");
  const permission = new AtlasPermissionEngine().evaluate(draft.type);
  if (permission.decision === "forbidden") throw new Error(permission.reason);
  return {
    version: ATLAS_ACTION_PROPOSAL_VERSION,
    id: options.id,
    type: draft.type,
    title: draft.title,
    ...(draft.description === undefined ? {} : { description: draft.description }),
    createdAt: options.createdAt,
    source: "atlas",
    risk: permission.risk,
    requiresApproval: permission.decision === "approval-required",
    payload: draft.payload,
    ...(draft.rationale === undefined ? {} : { rationale: draft.rationale }),
    evidenceReferences: [...(draft.evidenceReferences ?? [])],
  } as AtlasActionProposal;
}
