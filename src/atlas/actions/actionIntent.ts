import type { HabitDefinition } from "../../shared/habits.ts";
import type { MonthlyTarget, Task, WeeklyTarget } from "../../shared/types.ts";
import { parseAtlasActionProposalDraft } from "./proposal.ts";
import { ATLAS_ACTION_WEEKDAYS } from "./types.ts";
import type { AtlasActionProposalDraft, AtlasActionType } from "./types.ts";

export const ATLAS_ACTION_CLARIFICATION_VERSION = "1.0.0" as const;

export interface AtlasActionIntentSnapshot {
  tasks: readonly Pick<Task, "id" | "title" | "completed">[];
  habits: readonly Pick<HabitDefinition, "id" | "name" | "archived">[];
  monthlyOutcomes: readonly Pick<MonthlyTarget, "id" | "title">[];
  weeklyFocuses: readonly Pick<WeeklyTarget, "id" | "title">[];
}

export interface AtlasActionClarification {
  version: typeof ATLAS_ACTION_CLARIFICATION_VERSION;
  intent: AtlasActionType;
  originalInput: string;
  question: string;
  attempt: 1;
}

export type AtlasActionIntentResult =
  | { status: "conversation" }
  | { status: "forbidden"; message: string }
  | { status: "clarification"; clarification: AtlasActionClarification }
  | { status: "proposal"; draft: AtlasActionProposalDraft };

const FORBIDDEN_PATTERNS = [
  /^(?:please\s+)?(?:delete|erase|remove|wipe|purge)\b/i,
  /^(?:please\s+)?(?:message|email|text|dm|call)\b/i,
  /^(?:please\s+)?(?:transfer|send|pay|purchase|buy)\s+(?:₹|\$|€|£|\d)/i,
  /^(?:please\s+)?(?:change|reset|disable|enable)\b.*\b(?:password|security|account|permission)\b/i,
  /^(?:please\s+)?(?:run|open|execute)\b.*\b(?:shell|terminal|powershell|command|browser automation)\b/i,
] as const;

function normalize(value: string): string {
  return value.trim().replace(/[.!?]+$/g, "").replace(/^['"]|['"]$/g, "").trim();
}

function formatLocalDate(value: Date): string {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function relativeDate(input: string, now: Date): string | undefined {
  if (/\btomorrow\b/i.test(input)) {
    const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    return formatLocalDate(date);
  }
  if (/\btoday\b/i.test(input)) return formatLocalDate(now);
  return input.match(/\b\d{4}-\d{2}-\d{2}\b/)?.[0];
}

function clarification(
  intent: AtlasActionType,
  originalInput: string,
  question: string
): AtlasActionIntentResult {
  return {
    status: "clarification",
    clarification: {
      version: ATLAS_ACTION_CLARIFICATION_VERSION,
      intent,
      originalInput,
      question,
      attempt: 1,
    },
  };
}

function resolveNamed<T extends { id: number }>(
  requested: string,
  values: readonly T[],
  label: (value: T) => string
): T | undefined | "ambiguous" {
  const needle = normalize(requested).replace(/^(?:my|the)\s+/i, "").toLowerCase();
  const active = values.filter((value) => label(value).trim().length > 0);
  const exact = active.filter((value) => label(value).trim().toLowerCase() === needle);
  if (exact.length === 1) return exact[0];
  if (exact.length > 1) return "ambiguous";
  const partial = active.filter((value) => label(value).trim().toLowerCase().includes(needle));
  return partial.length === 1 ? partial[0] : partial.length > 1 ? "ambiguous" : undefined;
}

function validated(draft: AtlasActionProposalDraft): AtlasActionIntentResult {
  try {
    return { status: "proposal", draft: parseAtlasActionProposalDraft(draft) };
  } catch (error) {
    return clarification(
      draft.type,
      draft.title,
      error instanceof Error ? error.message : "Please provide valid action details."
    );
  }
}

function taskCreate(input: string, now: Date): AtlasActionIntentResult | undefined {
  if (!/^(?:please\s+)?(?:create|add|make)\b/i.test(input) || !/\btask\b/i.test(input)) return undefined;
  const priority = /\bhigh(?:[\s-]+priority)?\b/i.test(input)
    ? "high" : /\blow(?:[\s-]+priority)?\b/i.test(input) ? "low" : /\bmedium(?:[\s-]+priority)?\b/i.test(input) ? "medium" : undefined;
  const dueDate = relativeDate(input, now);
  const explicitDate = input.match(/\b\d{4}-\d{2}-\d{2}\b/)?.[0];
  let title = input
    .replace(/^(?:please\s+)?(?:create|add|make)\s+(?:a\s+)?/i, "")
    .replace(/\b(?:high|medium|low)(?:[\s-]+priority)?\b/ig, "")
    .replace(/\btask\b/i, "")
    .replace(/\b(?:today|tomorrow)\b/ig, "")
    .replace(explicitDate ?? /$^/, "")
    .replace(/^\s*to\s+/i, "")
    .replace(/\s+/g, " ");
  title = normalize(title);
  if (!title) return clarification("task.create", input, "What should the new task be called?");
  return validated({
    type: "task.create",
    title: `Create task: ${title}`,
    payload: { title, ...(priority ? { priority } : {}), ...(dueDate ? { dueDate } : {}) },
    rationale: "Prepared from your explicit task request.",
  });
}

function taskComplete(input: string, snapshot: AtlasActionIntentSnapshot): AtlasActionIntentResult | undefined {
  const match = input.match(/^(?:please\s+)?(?:mark|complete|finish)\s+(.+?)(?:\s+(?:as\s+)?(?:complete|completed|done))?$/i);
  if (!match || (!/^\s*(?:please\s+)?mark\b/i.test(input) && !/^(?:please\s+)?(?:complete|finish)\b/i.test(input))) return undefined;
  const requested = normalize(match[1].replace(/\s+(?:as\s+)?(?:complete|completed|done)$/i, ""));
  const target = resolveNamed(requested, snapshot.tasks.filter((task) => !task.completed), (task) => task.title);
  if (!target || target === "ambiguous") {
    return clarification("task.complete", input, target === "ambiguous"
      ? "More than one active task matches. Enter the exact task title."
      : "I could not find one active task with that title. Enter the exact task title.");
  }
  return validated({
    type: "task.complete",
    title: `Complete task: ${target.title}`,
    payload: { taskId: target.id },
    rationale: "Prepared for the uniquely matched active task.",
  });
}

function taskSchedule(input: string, snapshot: AtlasActionIntentSnapshot, now: Date): AtlasActionIntentResult | undefined {
  const match = input.match(/^(?:please\s+)?(?:move|schedule|reschedule)\s+(.+?)(?:\s+(?:to|for|on)\s+(today|tomorrow|\d{4}-\d{2}-\d{2}))?$/i);
  if (!match) return undefined;
  const dueDate = relativeDate(match[2] ?? "", now);
  if (!dueDate) return clarification("planning.task.schedule", input, "When should I schedule it? Use today, tomorrow, or YYYY-MM-DD.");
  const target = resolveNamed(match[1], snapshot.tasks, (task) => task.title);
  if (!target || target === "ambiguous") return clarification("planning.task.schedule", input, "Enter the exact task title and date.");
  return validated({
    type: "planning.task.schedule",
    title: `Schedule task: ${target.title}`,
    payload: { taskId: target.id, dueDate },
    rationale: "Prepared for the uniquely matched task and requested date.",
  });
}

function taskUpdate(input: string, snapshot: AtlasActionIntentSnapshot): AtlasActionIntentResult | undefined {
  const priorityMatch = input.match(/^(?:please\s+)?(?:set|change|make)\s+(.+?)\s+(?:priority\s+)?(?:to\s+)?(low|medium|high)(?:\s+priority)?$/i);
  if (!priorityMatch) return undefined;
  const target = resolveNamed(priorityMatch[1].replace(/\s+task$/i, ""), snapshot.tasks, (task) => task.title);
  if (!target || target === "ambiguous") return clarification("task.update", input, "Enter the exact task title and desired priority.");
  return validated({
    type: "task.update",
    title: `Update task: ${target.title}`,
    payload: { taskId: target.id, priority: priorityMatch[2].toLowerCase() },
    rationale: "Prepared for the uniquely matched task.",
  });
}

function habitCreate(input: string): AtlasActionIntentResult | undefined {
  const match = input.match(/^(?:please\s+)?(?:start|create|add)\s+(?:a\s+)?habit\s+(?:for\s+)?(.+?)(?:\s+every\s+day)?$/i);
  if (!match) return undefined;
  const name = normalize(match[1].replace(/\s+every\s+day$/i, ""));
  if (!name) return clarification("habit.create", input, "What should the habit be called?");
  return validated({
    type: "habit.create",
    title: `Create habit: ${name}`,
    payload: { name, activeDays: [...ATLAS_ACTION_WEEKDAYS] },
    rationale: "Prepared as an everyday habit from your explicit request.",
  });
}

function habitUpdate(input: string, snapshot: AtlasActionIntentSnapshot): AtlasActionIntentResult | undefined {
  const match = input.match(/^(?:please\s+)?rename\s+(?:my\s+)?habit\s+(.+?)\s+to\s+(.+)$/i);
  if (!match) return undefined;
  const target = resolveNamed(match[1], snapshot.habits.filter((habit) => !habit.archived), (habit) => habit.name);
  if (!target || target === "ambiguous") return clarification("habit.update", input, "Enter the exact active habit name and its new name.");
  return validated({
    type: "habit.update",
    title: `Rename habit: ${target.name}`,
    payload: { habitId: target.id, name: normalize(match[2]) },
    rationale: "Prepared for the uniquely matched active habit.",
  });
}

function captureCreate(input: string): AtlasActionIntentResult | undefined {
  const match = input.match(/^(?:please\s+)?remember\s+(?:to\s+)?(.+)$/i);
  if (!match) return undefined;
  const text = normalize(match[1]);
  if (!text) return clarification("capture.create", input, "What should I capture?");
  return validated({
    type: "capture.create",
    title: "Create capture",
    payload: { text },
    rationale: "Prepared as a quick capture from your explicit request.",
  });
}

function weeklyFocusCreate(input: string): AtlasActionIntentResult | undefined {
  if (!/\b(?:create|add|start)\b.*\bweekly focus\b/i.test(input)) return undefined;
  return clarification(
    "planning.weekly_focus.create",
    input,
    "Please provide the exact Monthly Outcome, Weekly Focus title, and week dates. ATLAS will not guess planning relationships."
  );
}

export function classifyAtlasActionIntent(input: string): AtlasActionType | "forbidden" | "conversation" {
  const text = normalize(input);
  if (!text) return "conversation";
  if (FORBIDDEN_PATTERNS.some((pattern) => pattern.test(text))) return "forbidden";
  if (/^(?:please\s+)?(?:create|add|make)\b.*\btask\b/i.test(text)) return "task.create";
  if (/^(?:please\s+)?(?:mark|complete|finish)\b/i.test(text)) return "task.complete";
  if (/^(?:please\s+)?(?:move|schedule|reschedule)\b/i.test(text)) return "planning.task.schedule";
  if (/^(?:please\s+)?(?:set|change|make)\b.*\b(?:low|medium|high)(?:\s+priority)?$/i.test(text)) return "task.update";
  if (/^(?:please\s+)?(?:start|create|add)\s+(?:a\s+)?habit\b/i.test(text)) return "habit.create";
  if (/^(?:please\s+)?rename\s+(?:my\s+)?habit\b/i.test(text)) return "habit.update";
  if (/^(?:please\s+)?remember\b/i.test(text)) return "capture.create";
  if (/\b(?:create|add|start)\b.*\bweekly focus\b/i.test(text)) return "planning.weekly_focus.create";
  return "conversation";
}

export function interpretAtlasActionRequest(input: string, options: {
  snapshot: AtlasActionIntentSnapshot;
  now: Date;
}): AtlasActionIntentResult {
  const text = normalize(input);
  const intent = classifyAtlasActionIntent(text);
  if (intent === "conversation") return { status: "conversation" };
  if (intent === "forbidden") {
    return { status: "forbidden", message: "That request is outside the permitted LifeOS action boundary and no action was prepared." };
  }
  return taskCreate(text, options.now)
    ?? taskComplete(text, options.snapshot)
    ?? taskSchedule(text, options.snapshot, options.now)
    ?? taskUpdate(text, options.snapshot)
    ?? habitCreate(text)
    ?? habitUpdate(text, options.snapshot)
    ?? captureCreate(text)
    ?? weeklyFocusCreate(text)
    ?? clarification(intent, text, "Please provide the missing action details without changing the requested action.");
}

export function continueAtlasActionClarification(
  pending: AtlasActionClarification,
  answer: string,
  options: { snapshot: AtlasActionIntentSnapshot; now: Date }
): AtlasActionIntentResult {
  if (pending.intent === "task.complete") {
    return taskComplete(`Mark ${normalize(answer)} complete`, options.snapshot)
      ?? clarification(pending.intent, pending.originalInput, pending.question);
  }
  return interpretAtlasActionRequest(answer, options);
}

export function parseAtlasProviderActionDraft(raw: string): AtlasActionProposalDraft {
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    throw new Error("Provider action output must be valid JSON.");
  }
  return parseAtlasActionProposalDraft(value);
}
