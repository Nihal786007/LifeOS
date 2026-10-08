import type { AtlasCanonicalState } from "../atlas/state/types";
import { buildDailyCommandCenter } from "../dashboard/dailyCommandCenterModel.ts";
import { TaskRelationshipEngine } from "../engines/TaskRelationshipEngine.ts";
import { buildAttentionReport, attentionWeek } from "../insights/attentionLedger.ts";
import type { IntendedAllocation } from "../insights/attentionLedger";
import type { GoogleCalendarReadModel } from "../connectors/googleCalendar/types";

export type DecisionReference = { kind: "task" | "goal" | "weekly-focus"; entityId: number };
export interface DecisionOption {
  id: string; label: string; kind: DecisionReference["kind"] | "commitment";
  reference?: DecisionReference;
  window?: { start: string; end: string };
}
export interface DecisionEvidence {
  source: "tasks" | "planning" | "attention" | "calendar" | "option";
  path: string; label: string; value: unknown; explanation: string; points: number;
}
export interface DecisionComparison {
  optionId: string; label: string; score: number;
  positives: DecisionEvidence[]; tradeoffs: DecisionEvidence[];
  context: DecisionEvidence[]; limitations: string[];
}
export interface DecisionResult {
  version: "1.0"; recommendedOptionId?: string; comparisons: DecisionComparison[];
  coverage: "unavailable" | "limited" | "supported"; explanation: string; errors: string[];
}
export interface DecisionInput {
  state: AtlasCanonicalState; allocation: IntendedAllocation | null;
  calendar: { connected: boolean; readModel: GoogleCalendarReadModel };
  options: readonly DecisionOption[]; now: Date;
}
/** Urgency and explicit priority carry most weight. Momentum and load are
 * descriptive only: no inferred capacity, duration, or predicted outcomes. */
export const DECISION_WEIGHTS = Object.freeze({ high: 3, medium: 2, low: 1,
  overdue: 3, today: 2, declaredPriority: 3, underAttention: 2,
  overAttention: -1, calendarConflict: -3 });

function validDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y, m, d] = value.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d;
}
function instant(value: string): number {
  return /^\d{4}-\d{2}-\d{2}T.*(?:Z|[+-]\d{2}:\d{2})$/.test(value) && validDate(value.slice(0, 10)) ? Date.parse(value) : NaN;
}

export function compareDecisions(input: DecisionInput): DecisionResult {
  const { state, options, now } = input;
  const errors: string[] = [];
  if (!Number.isFinite(now.getTime())) errors.push("Choose a valid comparison date.");
  const kind = options[0]?.kind;
  if (options.length < 2 || options.length > 3 || (kind !== "task" && options.length !== 2)) errors.push("Compare 2–3 tasks, or two goals, weekly focuses, or commitments.");
  if (options.some(o => o.kind !== kind || !["task", "goal", "weekly-focus", "commitment"].includes(o.kind))) errors.push("Choose options of the same supported type.");
  if (new Set(options.map(o => o.id)).size !== options.length || options.some(o => !o.id || !o.label.trim() || o.label.length > 120)) errors.push("Each option needs a distinct identity and a short name.");
  const refKeys = options.flatMap(o => o.reference ? [`${o.reference.kind}:${o.reference.entityId}`] : []);
  if (new Set(refKeys).size !== refKeys.length) errors.push("Choose different linked items.");
  for (const o of options) {
    if (o.kind !== "commitment" && (!o.reference || o.reference.kind !== o.kind)) errors.push("Select an existing item for each option.");
    const r = o.reference;
    if (r && (!Number.isSafeInteger(r.entityId) || r.entityId < 0 || !["task", "goal", "weekly-focus"].includes(r.kind))) errors.push("An option reference is invalid.");
    if (r && !(r.kind === "task" ? state.tasks : r.kind === "goal" ? state.lifeGoals : state.weeklyTargets).some(item => item.id === r.entityId && !item.completed)) errors.push("A linked item is completed, deleted, or unavailable. Select it again.");
    if (o.window && (o.kind !== "commitment" || !Number.isFinite(instant(o.window.start)) || !Number.isFinite(instant(o.window.end)) || instant(o.window.end) <= instant(o.window.start))) errors.push("Use a valid commitment start and end, with the end after the start.");
  }
  if (errors.length) return { version: "1.0", comparisons: [], coverage: "unavailable", explanation: "Update your options before comparing.", errors: [...new Set(errors)] };
  const relationships = { tasks: [...state.tasks], lifeGoals: [...state.lifeGoals], monthlyTargets: [...state.monthlyTargets], weeklyTargets: [...state.weeklyTargets] };
  const attention = buildAttentionReport({ ...relationships, executionRecords: state.executionHistory }, input.allocation, now);
  const daily = buildDailyCommandCenter({ ...state, capturedAt: now.toISOString(), tasks: state.tasks.filter(t => !t.dueDate || validDate(t.dueDate)) }, []);
  const week = attentionWeek(now);
  const topShare = Math.max(0, ...attention.rows.map(row => row.intended ?? 0));
  const comparisons = options.map((option): DecisionComparison => {
    const result: DecisionComparison = { optionId: option.id, label: option.label, score: 0, positives: [], tradeoffs: [], context: [], limitations: [] };
    const add = (source: DecisionEvidence["source"], path: string, label: string, value: unknown, explanation: string, points = 0) => {
      const e = { source, path, label, value, explanation, points };
      (points > 0 ? result.positives : points < 0 ? result.tradeoffs : result.context).push(e);
      result.score += points;
    };
    const r = option.reference;
    const task = r?.kind === "task" ? state.tasks.find(t => t.id === r.entityId) : undefined;
    const relationship = task ? TaskRelationshipEngine.resolve(relationships, task.id) : null;
    const weekly = r?.kind === "weekly-focus" ? state.weeklyTargets.find(w => w.id === r.entityId) : relationship?.weeklyTarget;
    const month = weekly ? state.monthlyTargets.find(m => m.id === weekly.monthlyTargetId) : undefined;
    const goal = r?.kind === "goal" ? state.lifeGoals.find(g => g.id === r.entityId) : relationship?.lifeGoal ?? (month ? state.lifeGoals.find(g => g.id === month.goalId) : undefined);
    if (task) {
      const path = `[${state.tasks.indexOf(task)}]`;
      add("tasks", `${path}.priority`, "Manual priority", task.priority, `This task has ${task.priority} manual priority.`, DECISION_WEIGHTS[task.priority]);
      const status = daily.tasks.find(t => t.id === task.id)?.status;
      if (status === "overdue" || status === "today") add("tasks", `${path}.dueDate`, "Due date", task.dueDate, status === "overdue" ? "This task is overdue." : "This task is due today.", DECISION_WEIGHTS[status]);
      else if (task.dueDate && validDate(task.dueDate)) add("tasks", `${path}.dueDate`, "Due date", task.dueDate, `This task is due ${task.dueDate}.`);
      else result.limitations.push(task.dueDate ? "The task's due date is invalid; no urgency was inferred." : "No task due date is recorded.");
      if (task.weeklyTargetId !== undefined && !relationship?.weeklyTarget) result.limitations.push("The weekly planning link is unavailable.");
    }
    if (goal) {
      add("planning", `lifeGoals[${state.lifeGoals.indexOf(goal)}].title`, "Life Goal link", goal.title, `Linked to ${goal.title}.`);
      const row = attention.rows.find(row => row.id === `goal:${goal.id}`);
      if (row?.intended !== null && row?.intended !== undefined) {
        const points = row.intended > 0 && row.intended === topShare ? DECISION_WEIGHTS.declaredPriority : 0;
        add("attention", `rows[${attention.rows.indexOf(row)}].intended`, "Declared focus share", row.intended, points ? "This goal is among your highest declared focus priorities." : "This goal has a recorded declared focus share.", points);
        for (const [signal, points, explanation] of [["under", DECISION_WEIGHTS.underAttention, "This goal received less tracked focus than your current priorities assign."], ["over", DECISION_WEIGHTS.overAttention, "This goal already received more tracked focus than your current priorities assign."]] as const) {
          if (attention.insights.some(i => i.id === signal && i.categoryIds.includes(row.id))) add("attention", `rows[${attention.rows.indexOf(row)}]`, "Reality Mirror comparison", row, explanation, points);
        }
      } else result.limitations.push("No valid declared focus allocation is available for this goal.");
      const related = state.tasks.filter(t => !t.completed && t.dueDate && validDate(t.dueDate) && t.dueDate >= week.weekStart && t.dueDate <= week.weekEnd && TaskRelationshipEngine.resolve(relationships, t.id)?.lifeGoal?.id === goal.id);
      add("tasks", "", "Current weekly dated load", state.tasks, `${related.length} unfinished tasks linked to this goal have due dates this week. This is not a capacity estimate.`);
    } else if (r) result.limitations.push("No supported active Life Goal link is available.");
    if (weekly && (!weekly.weekStartDate || !weekly.weekEndDate)) result.limitations.push("This legacy Weekly Focus has no real dates; its calendar-week status is unavailable.");
    const focus = attention.ledger.filter(entry => task ? entry.taskId === task.id : r?.kind === "weekly-focus" ? state.tasks.some(t => t.id === entry.taskId && t.weeklyTargetId === r.entityId) : goal ? entry.categoryId === `goal:${goal.id}` : false);
    if (focus.length) add("attention", "ledger", "Recent recorded Focus", attention.ledger, `${Math.floor(focus.reduce((sum, e) => sum + e.durationMs, 0) / 60_000)} minutes of Focus were recorded this week. Momentum is descriptive, not a score bonus.`);
    else result.limitations.push("No measured Focus is linked to this option this week.");
    if (option.window) {
      const start = instant(option.window.start), end = instant(option.window.end);
      add("option", "window", "User-entered window", option.window, `You entered a ${Math.round((end - start) / 60_000)}-minute window. This is not an inferred task duration.`);
      const read = input.calendar.readModel;
      if (!input.calendar.connected || !read.fetchedAt || !read.windowStart || !read.windowEnd || start < instant(read.windowStart) || end > instant(read.windowEnd) || !Number.isFinite(instant(read.windowStart)) || !Number.isFinite(instant(read.windowEnd))) result.limitations.push("Calendar evidence is unavailable for this entire time window.");
      else {
        const overlap = read.events.filter(event => event.status !== "cancelled" && event.start.kind === "dateTime" && event.end.kind === "dateTime" && instant(event.start.dateTime) < end && instant(event.end.dateTime) > start);
        if (overlap.length) add("calendar", "events", "Loaded timed calendar overlaps", read.events, "This window overlaps a loaded Google Calendar commitment.", DECISION_WEIGHTS.calendarConflict);
        else result.limitations.push("No overlap was found in loaded timed Google events. This does not prove availability; all-day events and incomplete/stale calendar reads are not assessed.");
      }
    } else result.limitations.push("Duration and time-slot availability are unknown. Habits have day schedules, not timed commitments.");
    if (!r) result.limitations.push("This unlinked commitment has no canonical priority or goal evidence; its name is not interpreted.");
    return result;
  });
  const max = Math.max(...comparisons.map(c => c.score));
  const leaders = comparisons.filter(c => c.score === max);
  const enough = comparisons.every(c => c.positives.length > 0 || c.context.some(e => e.source === "planning" || e.source === "option"));
  const recommended = leaders.length === 1 && leaders[0].positives.length > 0 && enough ? leaders[0].optionId : undefined;
  return { version: "1.0", ...(recommended ? { recommendedOptionId: recommended } : {}), comparisons,
    coverage: comparisons.every(c => c.positives.length + c.tradeoffs.length >= 2) ? "supported" : "limited",
    explanation: recommended ? "Best fit based on your current LifeOS data—not a decision made for you. You still decide."
      : leaders.length > 1 ? "These options are similarly supported by your current data. You still decide."
        : "There is not enough comparable evidence to suggest a best fit. You still decide.", errors: [] };
}
