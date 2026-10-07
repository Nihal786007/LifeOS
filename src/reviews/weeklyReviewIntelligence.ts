import { HabitEngine } from "../engines/HabitEngine.ts";
import { buildAttentionReport, attentionWeek, UNCATEGORIZED } from "../insights/attentionLedger.ts";
import type { AttentionReport, IntendedAllocation } from "../insights/attentionLedger.ts";
import { ReviewEngine } from "./reviewEngine.ts";
import type { ReviewReport, ReviewSourceState } from "./reviewEngine.ts";

export interface ReviewEvidence {
  source: "review" | "attention" | "tasks" | "habits";
  path: string;
  label: string;
  value: unknown;
}
export interface ReviewInsight { id: string; text: string; evidence: ReviewEvidence[] }
export interface ReviewSuggestion extends ReviewInsight { basedOn: string }
export interface WeeklyHabitEvidence {
  id: number; name: string; scheduled: number; completed: number; missedClosedDays: number;
}
export interface WeeklyReviewSummary {
  version: "1.0";
  wins: ReviewInsight[];
  needsAttention: ReviewInsight[];
  nextWeekSuggestions: ReviewSuggestion[];
  focusSummary: ReviewInsight | null;
  evidenceCoverage: { status: "empty" | "limited" | "recorded"; message: string; limitations: string[] };
  details: { review: ReviewReport; attention: AttentionReport; habits: WeeklyHabitEvidence[] };
}

function localDate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
function dated(value: string | undefined): string | null {
  if (!value) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [y, m, d] = value.split("-").map(Number);
    const parsed = new Date(y, m - 1, d);
    return localDate(parsed) === value ? value : null;
  }
  const parsed = new Date(value);
  return Number.isFinite(parsed.getTime()) ? localDate(parsed) : null;
}
export function reviewFocusDuration(ms: number): string {
  const minutes = Math.floor(ms / 60_000);
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
}

/** Read-only weekly composition. Stable rule order; each group is capped at 3.
 * No rollover inference, historical schedule reconstruction, or model advice.
 * Closed-day misses exclude today. Mirror drift uses its existing insight rules.
 */
export function buildWeeklyReviewSummary(
  state: ReviewSourceState,
  allocation: IntendedAllocation | null,
  referenceDate: Date,
  now: Date
): WeeklyReviewSummary {
  const week = attentionWeek(referenceDate);
  const cutoff = new Date(Math.min(now.getTime(), week.end.getTime() - 1));
  const through = localDate(cutoff);
  const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
  const closedThrough = localDate(new Date(Math.min(yesterday.getTime(), week.end.getTime() - 1)));
  // Existing analytics may inspect the full selected week. Exclude future-dated
  // evidence from this composition, without altering canonical records/engines.
  const measuredState: ReviewSourceState = {
    ...state,
    executionRecords: state.executionRecords.filter(record => Date.parse(record.createdAt) <= cutoff.getTime()),
    tasks: state.tasks.filter(task => Date.parse(task.createdAt) <= cutoff.getTime()).map(task =>
      task.completedAt && Date.parse(task.completedAt) > cutoff.getTime()
        ? { ...task, completed: false, completedAt: undefined } : task),
  };
  const review = ReviewEngine.build(measuredState, "weekly", referenceDate, now);
  const attention = buildAttentionReport({
    tasks: state.tasks, lifeGoals: state.lifeGoals, monthlyTargets: state.monthlyOutcomes,
    weeklyTargets: state.weeklyFocuses, executionRecords: measuredState.executionRecords,
  }, allocation, cutoff < week.start ? week.start : cutoff);
  const habits = state.habitState.habits.map(habit => {
    const measured = HabitEngine.getPeriodAnalytics(state.habitState, habit.id, week.weekStart, through);
    const closed = HabitEngine.getPeriodAnalytics(state.habitState, habit.id, week.weekStart, closedThrough);
    return { id: habit.id, name: habit.name, scheduled: measured.scheduledDays,
      completed: measured.completedDays, missedClosedDays: closed.missedDays };
  }).sort((a, b) => a.id - b.id);
  const evidence = (source: ReviewEvidence["source"], path: string, label: string, value: unknown): ReviewEvidence => ({ source, path, label, value });
  const wins: ReviewInsight[] = [];
  const needsAttention: ReviewInsight[] = [];
  const nextWeekSuggestions: ReviewSuggestion[] = [];
  const suggest = (basedOn: ReviewInsight, text: string) => nextWeekSuggestions.push({
    id: `${basedOn.id}:suggestion`, text, basedOn: basedOn.id, evidence: basedOn.evidence,
  });
  if (review.tasks.completed > 0) wins.push({ id: "tasks-completed", text: `You completed ${review.tasks.completed} ${review.tasks.completed === 1 ? "task" : "tasks"} this week.`,
    evidence: [evidence("review", "tasks.completed", "Tasks completed", review.tasks.completed)] });
  // At least two scheduled completions and >=80% consistency. No praise for
  // one check-in; a zero schedule is unknown, not perfect consistency.
  const consistent = [...habits].filter(h => h.scheduled >= 2 && h.completed >= 2 && h.completed / h.scheduled >= 0.8)
    .sort((a, b) => b.completed / b.scheduled - a.completed / a.scheduled || b.completed - a.completed || a.id - b.id)[0];
  if (consistent) wins.push({ id: "habit-consistency", text: `You kept ${consistent.name} consistent on its scheduled days.`,
    evidence: [evidence("habits", `[${habits.indexOf(consistent)}]`, "Scheduled habit check-ins", consistent)] });
  const focusSummary: ReviewInsight | null = attention.totalMs > 0 ? {
    id: "tracked-focus", text: `You recorded ${reviewFocusDuration(attention.totalMs)} of tracked focus this week.`,
    evidence: [evidence("attention", "totalMs", "Recorded Focus duration (milliseconds)", attention.totalMs)],
  } : null;
  if (focusSummary) wins.push(focusSummary);

  const unfinished = state.tasks.filter(task => {
    const due = dated(task.dueDate);
    return !task.completed && due !== null && due >= week.weekStart && due <= closedThrough
      && dated(task.createdAt) !== null && dated(task.createdAt)! <= through;
  });
  const high = unfinished.filter(task => task.priority === "high");
  const taskEvidence = (items: typeof high) => items.map(task => evidence("tasks", `[${state.tasks.indexOf(task)}]`, "Current unfinished task", task));
  if (high.length > 0) {
    const insight = { id: "priority-open", text: `${high.length === 1 ? "One high-priority task is" : `${high.length} high-priority tasks are`} still open with due dates earlier in this week.`, evidence: taskEvidence(high) };
    needsAttention.push(insight);
    if (high.length >= 2) suggest(insight, "Consider planning fewer high-priority tasks next week before adding more.");
  } else if (unfinished.length > 0) needsAttention.push({ id: "overdue-open", text: `${unfinished.length} ${unfinished.length === 1 ? "task is" : "tasks are"} still open past a due date in this week.`, evidence: taskEvidence(unfinished) });
  const missed = [...habits].filter(h => h.missedClosedDays >= 2).sort((a, b) => b.missedClosedDays - a.missedClosedDays || a.id - b.id)[0];
  if (missed) {
    const insight = { id: "habit-missed", text: `${missed.name} has missed scheduled days this week. Today's open check-in is not counted as missed.`,
      evidence: [evidence("habits", `[${habits.indexOf(missed)}]`, "Habit schedule and closed-day misses", missed)] };
    needsAttention.push(insight);
    suggest(insight, `Consider reviewing ${missed.name}'s scheduled days before next week.`);
  }
  // Consume Mirror's existing under/over decisions, never recalculate alignment.
  for (const kind of ["under", "over"]) {
    const signal = attention.insights.find(item => item.id === kind);
    const row = signal && attention.rows.find(item => item.id === signal.categoryIds[0]);
    if (!row) continue;
    const label = row.id === UNCATEGORIZED ? "Other focus" : row.label;
    const insight = { id: `focus-${kind}`, text: `${label} received ${kind === "under" ? "less" : "more"} tracked focus than your current priorities assign.`,
      evidence: [evidence("attention", `rows[${attention.rows.indexOf(row)}]`, "Current planned and recorded focus", row)] };
    needsAttention.push(insight);
    if (kind === "under" && row.id !== UNCATEGORIZED && row.intended !== null && row.intended > 0) {
      suggest(insight, `Consider protecting a Focus block for ${label} next week.`);
    }
  }
  const focused = [...attention.rows].filter(row => row.durationMs > 0).sort((a, b) => b.durationMs - a.durationMs || a.id.localeCompare(b.id));
  if (focusSummary && focused.length && (focused.length === 1 || focused[0].durationMs > focused[1].durationMs)) {
    focusSummary.text += ` Most tracked focus went to ${focused[0].id === UNCATEGORIZED ? "Other focus" : focused[0].label}.`;
    focusSummary.evidence.push(evidence("attention", `rows[${attention.rows.indexOf(focused[0])}]`, "Largest recorded focus area", focused[0]));
  }
  const sourceCount = Number(review.tasks.completed > 0 || unfinished.length > 0)
    + Number(habits.some(h => h.scheduled > 0)) + Number(attention.totalMs > 0);
  const limitations = [
    "Tasks and planning links reflect their current state. Rollover history is unavailable.",
    "Habit schedules reflect current definitions; earlier schedule versions are unavailable.",
    ...attention.limitations,
    ...(review.planning.unavailableReason ? [review.planning.unavailableReason] : []),
  ];
  const status = sourceCount === 0 ? "empty" : sourceCount < 2 ? "limited" : "recorded";
  const visibleAttention = needsAttention.slice(0, 3);
  return { version: "1.0", wins: wins.slice(0, 3), needsAttention: visibleAttention,
    nextWeekSuggestions: nextWeekSuggestions.filter(s => visibleAttention.some(i => i.id === s.basedOn)).slice(0, 3), focusSummary,
    evidenceCoverage: { status, message: status === "empty" ? "Not enough activity recorded yet. Use Tasks, Habits, and Focus Mode to build a useful weekly review."
      : status === "limited" ? "LifeOS has limited activity recorded for this week. This review covers only what is recorded."
      : "This review covers recorded activity, not your whole week.", limitations },
    details: { review, attention, habits } };
}
