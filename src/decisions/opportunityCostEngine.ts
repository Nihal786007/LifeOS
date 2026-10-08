import type { AtlasCanonicalState } from "../atlas/state/types";
import type { GoogleCalendarReadModel } from "../connectors/googleCalendar/types";
import { buildAttentionReport } from "../insights/attentionLedger.ts";
import type { IntendedAllocation } from "../insights/attentionLedger";
import { buildDailyCommandCenter } from "../dashboard/dailyCommandCenterModel.ts";
import { HabitEngine } from "../engines/HabitEngine.ts";

export interface ProposedCommitment {
  title: string; startAt?: string; endAt?: string; date?: string;
  durationMinutes?: number; linkedGoalId?: number;
}
export interface OpportunityEvidence {
  id: string; source: "calendar" | "attention" | "tasks" | "habits";
  path: string; value: unknown; explanation: string; overlapMinutes?: number;
}
export interface OpportunityResult {
  version: "1.0"; conflicts: OpportunityEvidence[];
  possibleTradeoffs: OpportunityEvidence[]; pressure: OpportunityEvidence[];
  alternatives: string[]; limitations: string[]; errors: string[];
  overlapMinutes: number; durationMinutes: number | null;
}
export interface OpportunityInput {
  state: AtlasCanonicalState; proposed: ProposedCommitment;
  allocation: IntendedAllocation | null; now: Date;
  calendar: { connected: boolean; readModel: GoogleCalendarReadModel };
}

function localDay(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function day(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y, m, d] = value.split("-").map(Number);
  return localDay(new Date(y, m - 1, d)) === value;
}
/** Absolute offsets are required: ambiguous wall clocks are not silently resolved. */
export function opportunityInstant(value: string): number {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?(?:Z|[+-]\d{2}:\d{2})$/.test(value) || !day(value.slice(0, 10))) return NaN;
  const time = value.slice(11, 19).split(":").map(Number);
  if (time[0] > 23 || time[1] > 59 || (time[2] ?? 0) > 59) return NaN;
  return Date.parse(value);
}

/** No ranking, capacity prediction, mutations, or hypothetical execution records.
 * Evidence comes only from this invocation's supplied canonical/read models. */
export function analyzeOpportunityCost(input: OpportunityInput): OpportunityResult {
  const { state, proposed: p, now } = input;
  const result: OpportunityResult = { version: "1.0", conflicts: [], possibleTradeoffs: [], pressure: [], alternatives: [], limitations: [], errors: [], overlapMinutes: 0, durationMinutes: null };
  const start = p.startAt ? opportunityInstant(p.startAt) : NaN;
  const end = p.endAt ? opportunityInstant(p.endAt) : NaN;
  if (!p.title.trim() || p.title.length > 120) result.errors.push("Give this commitment a short name.");
  if (!Number.isFinite(now.getTime())) result.errors.push("The analysis date is unavailable.");
  if (p.date && !day(p.date)) result.errors.push("Choose a valid date.");
  if ((p.startAt || p.endAt) && (!Number.isFinite(start) || !Number.isFinite(end) || end <= start)) result.errors.push("Choose valid start and end times, with the end after the start.");
  if (p.durationMinutes !== undefined && (!Number.isFinite(p.durationMinutes) || p.durationMinutes <= 0 || p.durationMinutes > 31 * 1440)) result.errors.push("Enter a positive duration of no more than 31 days.");
  if (Number.isFinite(end) && end - start > 31 * 86400000) result.errors.push("Check a period of no more than 31 days.");
  if (Number.isFinite(end) && p.durationMinutes !== undefined && Math.abs((end - start) / 60000 - p.durationMinutes) > 0.001) result.errors.push("Duration must match the entered start and end times.");
  if (p.linkedGoalId !== undefined && !state.lifeGoals.some(g => g.id === p.linkedGoalId && !g.completed)) result.errors.push("The related Life Goal is no longer active. Select it again.");
  if (result.errors.length) return result;
  const timed = Number.isFinite(start) && Number.isFinite(end);
  result.durationMinutes = timed ? (end - start) / 60000 : p.durationMinutes ?? null;
  const from = timed ? localDay(new Date(start)) : p.date;
  const through = timed ? localDay(new Date(end - 1)) : p.date;
  if (!timed) result.limitations.push("No exact start/end window is known; schedule overlap cannot be assessed.");
  if (result.durationMinutes === null) result.limitations.push("No duration is recorded for this hypothetical commitment.");
  result.limitations.push("Your actual availability may differ. Unrecorded commitments and working hours are unknown.", "LifeOS Tasks have due dates, not timed start/end boundaries. Habit schedules identify days, not occupied hours.");
  const read = input.calendar.readModel;
  if (!input.calendar.connected) result.limitations.push("Google Calendar is not connected; its schedule is unavailable.");
  else if (timed) {
    const coverage = opportunityInstant(read.windowStart ?? "") <= start && opportunityInstant(read.windowEnd ?? "") >= end && Number.isFinite(opportunityInstant(read.fetchedAt ?? ""));
    if (!coverage) result.limitations.push("Loaded Google Calendar evidence does not cover this entire window.");
    result.limitations.push("Calendar evidence is a loaded snapshot, not a guarantee of current availability. Recurring events are assessed only as loaded occurrences.");
    const groups = new Map<string, number[]>();
    read.events.forEach((event, index) => {
      const key = JSON.stringify([event.provider, event.calendarId, event.externalId]);
      groups.set(key, [...(groups.get(key) ?? []), index]);
    });
    const intervals: [number, number][] = [];
    for (const [key, indices] of [...groups.entries()].sort(([a], [b]) => a.localeCompare(b))) {
      const index = indices[0], event = read.events[index];
      if (indices.some(i => {
        const other = read.events[i];
        return other.status !== event.status || other.allDay !== event.allDay || other.start.kind !== event.start.kind || other.end.kind !== event.end.kind ||
          (other.start.kind === "dateTime" && event.start.kind === "dateTime" && opportunityInstant(other.start.dateTime) !== opportunityInstant(event.start.dateTime)) ||
          (other.end.kind === "dateTime" && event.end.kind === "dateTime" && opportunityInstant(other.end.dateTime) !== opportunityInstant(event.end.dateTime));
      })) { result.limitations.push("Conflicting representations of one calendar occurrence were omitted."); continue; }
      if (event.status === "cancelled") continue;
      if (event.allDay || event.start.kind === "date" || event.end.kind === "date") {
        if (event.start.kind === "date" && event.end.kind === "date" && from && through && event.start.date <= through && event.end.date > from) result.limitations.push("An all-day event is recorded; it does not prove the whole day is unavailable.");
        continue;
      }
      const a = opportunityInstant(event.start.dateTime), b = opportunityInstant(event.end.dateTime);
      if (!Number.isFinite(a) || !Number.isFinite(b) || b <= a) { result.limitations.push("A calendar occurrence has unusable time boundaries and was omitted."); continue; }
      const overlap = Math.min(end, b) - Math.max(start, a);
      if (overlap <= 0) continue;
      intervals.push([Math.max(start, a), Math.min(end, b)]);
      result.conflicts.push({ id: key, source: "calendar", path: `events[${index}]`, value: event, overlapMinutes: overlap / 60000, explanation: `Your proposed window overlaps “${event.title}”.` });
    }
    // Union, not sum: simultaneous events must not inflate occupied overlap.
    intervals.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    let until = -Infinity, ms = 0;
    for (const [a, b] of intervals) { ms += Math.max(0, b - Math.max(a, until)); until = Math.max(until, b); }
    result.overlapMinutes = ms / 60000;
  }
  const attention = buildAttentionReport({ tasks: [...state.tasks], lifeGoals: [...state.lifeGoals], monthlyTargets: [...state.monthlyTargets], weeklyTargets: [...state.weeklyTargets], executionRecords: state.executionHistory }, input.allocation, now);
  if (p.linkedGoalId === undefined) result.limitations.push("No related Life Goal was selected; the activity name is not interpreted.");
  else if (attention.allocationError || !attention.insights.some(i => i.id === "under" || i.id === "over")) result.limitations.push("Reality Mirror has no supported focus difference to explain yet.");
  else {
    for (const insight of attention.insights.filter(i => i.id === "under" || i.id === "over")) {
      for (const categoryId of insight.categoryIds) {
        const index = attention.rows.findIndex(r => r.id === categoryId), row = attention.rows[index];
        if (!row || !categoryId.startsWith("goal:")) continue;
        const sameGoal = categoryId === `goal:${p.linkedGoalId}`;
        if (insight.id === "under" && sameGoal) continue;
        if (insight.id === "over" && !sameGoal) continue;
        result.possibleTradeoffs.push({ id: `${insight.id}:${categoryId}`, source: "attention", path: `rows[${index}]`, value: row, explanation: insight.id === "under" ? `“${row.label}” has received less tracked focus than intended. This commitment would add time toward another goal, but does not prove it will displace this one.` : `The related goal “${row.label}” has already received more tracked focus than intended. That is a possible priority trade-off, not a reason you must cancel.` });
      }
    }
  }
  const daily = buildDailyCommandCenter({ ...state, capturedAt: `${localDay(now)}T12:00:00`, tasks: state.tasks.filter(t => !t.dueDate || day(t.dueDate)) }, []);
  for (const task of [...state.tasks].sort((a, b) => a.id - b.id)) {
    if (task.completed) continue;
    const overdue = task.priority === "high" && daily.tasks.some(t => t.id === task.id && t.status === "overdue");
    const due = !!(from && through && task.dueDate && day(task.dueDate) && task.dueDate >= from && task.dueDate <= through);
    if (overdue || due) result.pressure.push({ id: `task:${task.id}`, source: "tasks", path: `[${state.tasks.indexOf(task)}]`, value: task, explanation: overdue ? `“${task.title}” is an unfinished high-priority overdue Task. Its duration and time slot are unknown.` : `“${task.title}” is due during the proposed dates. A due date does not establish a schedule conflict.` });
  }
  if (from && through) for (const habit of [...state.habitDefinitions].sort((a, b) => a.id - b.id)) {
    const dates = HabitEngine.getScheduledDates(habit, from, through);
    if (dates.length) result.pressure.push({ id: `habit:${habit.id}`, source: "habits", path: `[${state.habitDefinitions.indexOf(habit)}]`, value: habit, explanation: `“${habit.name}” is scheduled on ${dates.length} day${dates.length === 1 ? "" : "s"} in this period; no timed conflict or required hours are inferred.` });
  }
  result.alternatives = ["Keep your plan; the choice is yours.", ...(result.conflicts.length ? ["Review the conflicting event.", "Consider another time or a shorter commitment; no free slot has been identified."] : []), ...(result.possibleTradeoffs.length || result.pressure.length ? ["Review your priorities or compare alternatives in Decisions."] : [])];
  result.limitations = [...new Set(result.limitations)];
  return result;
}
