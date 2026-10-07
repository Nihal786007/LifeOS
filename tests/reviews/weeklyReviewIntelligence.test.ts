import assert from "node:assert/strict";
import test from "node:test";
import { registerHooks } from "node:module";
import { readFileSync } from "node:fs";
import type { ReviewSourceState } from "../../src/reviews/reviewEngine.ts";
import type { IntendedAllocation } from "../../src/insights/attentionLedger.ts";
registerHooks({ resolve(specifier, context, next) {
  return next(specifier.startsWith(".") && !/\.[a-z]+$/i.test(specifier) ? `${specifier}.ts` : specifier, context);
} });
const { buildWeeklyReviewSummary } = await import("../../src/reviews/weeklyReviewIntelligence.ts");
const { buildFocusCompletionRecord } = await import("../../src/focus/focusAudit.ts");
const { createFocusSession } = await import("../../src/focus/focusSession.ts");
const { buildAttentionReport } = await import("../../src/insights/attentionLedger.ts");
const { readAttentionPreferences, saveAttentionPreferences } = await import("../../src/insights/attentionPreferences.ts");
const now = new Date(2026, 9, 7, 18);
const iso = (day = 5, hour = 8, minute = 0) => new Date(2026, 9, day, hour, minute).toISOString();
const allocation: IntendedAllocation = { version: 1, updatedAt: iso(), shares: [{ categoryId: "goal:1", percent: 60 }, { categoryId: "goal:2", percent: 40 }] };
function empty(): ReviewSourceState { return { tasks: [], habitState: { habits: [], completions: [] }, executionRecords: [], lifeGoals: [], monthlyOutcomes: [], weeklyFocuses: [] }; }
function fixture(): ReviewSourceState {
  const s = empty();
  s.lifeGoals = [1, 2].map(id => ({ id, title: id === 1 ? "Study" : "Project", startDate: "2026-10-05", createdAt: iso(), completed: false, progress: 0 }));
  s.monthlyOutcomes = [1, 2].map(id => ({ id, goalId: id, title: `Month ${id}`, month: 10, year: 2026, createdAt: iso(), completed: false, progress: 0 }));
  s.weeklyFocuses = [1, 2].map(id => ({ id, monthlyTargetId: id, title: `Week ${id}`, week: 1, weekStartDate: "2026-10-05", weekEndDate: "2026-10-11", createdAt: iso(), completed: false, progress: 0 }));
  s.tasks = [1, 2, 3, 4].map(id => ({ id, title: `Task ${id}`, priority: "high", weeklyTargetId: id === 1 ? 1 : 2, dueDate: "2026-10-06", createdAt: iso(), completed: id < 3, completedAt: id < 3 ? iso(6, 16) : undefined }));
  s.habitState.habits = [1, 2].map(id => ({ id, name: id === 1 ? "Exercise" : "Reading", activeDays: ["monday", "tuesday", "wednesday"], startDate: "2026-10-05", archived: false, createdAt: iso(), updatedAt: iso() }));
  s.habitState.completions = [5, 6, 7].map(day => ({ id: day, habitId: 1, date: `2026-10-0${day}`, completedAt: iso(day, 10) }));
  s.executionRecords = [buildFocusCompletionRecord(createFocusSession(1, "fixture-account", iso(5, 9), "focus-study"), iso(5, 9, 30), 10),
    buildFocusCompletionRecord(createFocusSession(2, "fixture-account", iso(5, 10), "focus-project"), iso(5, 11, 30), 11)];
  return s;
}
const build = (s: ReviewSourceState = fixture(), a: IntendedAllocation | null = allocation) => buildWeeklyReviewSummary(s, a, now, now);
test("empty review makes no wins, drift or advice", () => { const r = build(empty(), null); assert.equal(r.evidenceCoverage.status, "empty"); assert.deepEqual([r.wins, r.needsAttention, r.nextWeekSuggestions], [[], [], []]); });
test("one evidence source is explicitly limited", () => { const s = empty(); s.tasks = fixture().tasks.slice(0, 1); assert.equal(build(s, null).evidenceCoverage.status, "limited"); });
test("task completion win uses trusted existing Review output", () => { const r = build(); assert.equal(r.wins[0].text, "You completed 2 tasks this week."); assert.equal(r.wins[0].evidence[0].value, r.details.review.tasks.completed); });
test("incomplete due high priority tasks produce drift", () => assert.ok(build().needsAttention.some(i => i.id === "priority-open")));
test("today and future tasks are not called slipped", () => { const s = fixture(); s.tasks.forEach(t => { t.dueDate = "2026-10-07"; }); assert.ok(!build(s).needsAttention.some(i => i.id === "priority-open")); });
test("invalid due date is not inferred or normalized", () => { const s = empty(); s.tasks = [{ ...fixture().tasks[2], dueDate: "2026-02-30" }]; assert.deepEqual(build(s, null).needsAttention, []); });
test("scheduled habit consistency creates a supported win", () => { const r = build(); assert.match(r.wins.find(i => i.id === "habit-consistency")!.text, /Exercise/); });
test("misses count only finished scheduled days", () => { const r = build(); assert.equal(r.details.habits[1].missedClosedDays, 2); assert.ok(r.needsAttention.some(i => i.id === "habit-missed")); });
test("unscheduled days and a single missed day generate no repeated-miss advice", () => { const s = empty(); s.habitState.habits = [{ ...fixture().habitState.habits[1], activeDays: ["tuesday"] }]; const r = build(s, null); assert.equal(r.details.habits[0].missedClosedDays, 1); assert.deepEqual(r.nextWeekSuggestions, []); });
test("one completion does not claim established consistency", () => { const s = empty(); s.habitState.habits = [{ ...fixture().habitState.habits[0], activeDays: ["monday"] }]; s.habitState.completions = fixture().habitState.completions; assert.deepEqual(build(s, null).wins, []); });
test("focus summary uses valid pause-aware ledger duration", () => { const r = build(); assert.match(r.focusSummary!.text, /2h 0m/); assert.match(r.focusSummary!.text, /Project/); assert.equal(r.details.attention.totalMs, 7_200_000); });
test("Mirror under-attention reuses unchanged Mirror insight", () => { const s = fixture(); s.tasks = s.tasks.slice(0, 2); s.habitState = empty().habitState; assert.ok(build(s).needsAttention.some(i => i.id === "focus-under")); });
test("Mirror over-attention is supported rather than invented", () => { const s = fixture(); s.tasks = s.tasks.slice(0, 2); s.habitState = empty().habitState; assert.ok(build(s).needsAttention.some(i => i.id === "focus-over")); });
test("focus suggestion derives from visible priority drift", () => { const r = build(); assert.ok(r.nextWeekSuggestions.some(i => i.basedOn === "focus-under" && i.text.includes("Study"))); });
test("multiple overdue priority tasks support fewer-task suggestion", () => assert.ok(build().nextWeekSuggestions.some(i => i.basedOn === "priority-open" && i.text.includes("fewer"))));
test("no allocation or very small focus sample produces no focus advice", () => { assert.ok(!build(fixture(), null).nextWeekSuggestions.some(i => i.basedOn.startsWith("focus-"))); const s = fixture(); s.executionRecords = s.executionRecords.slice(0, 1); assert.ok(!build(s).nextWeekSuggestions.some(i => i.basedOn.startsWith("focus-"))); });
test("three-item caps and deterministic ordering", () => { const r = build(); for (const group of [r.wins, r.needsAttention, r.nextWeekSuggestions]) assert.ok(group.length <= 3); assert.deepEqual(r.needsAttention.map(i => i.id), ["priority-open", "habit-missed", "focus-under"]); assert.deepEqual(r, build()); });
test("no suggestion survives without a visible supporting observation", () => { const r = build(); for (const s of r.nextWeekSuggestions) assert.ok(r.needsAttention.some(i => i.id === s.basedOn)); });
test("copy stays nonjudgmental and nonautomatic", () => { const r = build(); const text = [...r.wins, ...r.needsAttention, ...r.nextWeekSuggestions].map(i => i.text).join(" "); assert.doesNotMatch(text, /you failed|lazy|shame|I scheduled|rolled.over/i); assert.ok(r.nextWeekSuggestions.every(i => i.text.startsWith("Consider"))); });
test("current week uses local Monday–Sunday with no future misses", () => { const r = build(); assert.equal(r.details.review.range.startDate, "2026-10-05"); assert.equal(r.details.review.range.endDate, "2026-10-11"); assert.equal(r.details.review.range.measuredThroughDate, "2026-10-07"); });
test("prior week cannot borrow current focus; future week stays empty", () => { const s = fixture(); for (const reference of [new Date(2026, 8, 28), new Date(2026, 9, 12)]) { const r = buildWeeklyReviewSummary(s, allocation, reference, now); assert.equal(r.details.attention.totalMs, 0); assert.equal(r.details.habits[0].scheduled, 0); } });
test("future-dated completion is not a current win", () => { const s = empty(); s.tasks = [{ ...fixture().tasks[0], completedAt: iso(10) }]; assert.equal(build(s, null).details.review.tasks.completed, 0); });
test("canonical input remains unchanged and XP never changes", () => { const s = fixture(); const before = structuredClone(s); build(s); assert.deepEqual(s, before); assert.equal(s.executionRecords.reduce((sum, r) => sum + r.xpAwarded, 0), 0); });
test("Mirror formula, ledger and limitations match the reused output", () => { const s = fixture(); const mirror = buildAttentionReport({ tasks: s.tasks, lifeGoals: s.lifeGoals, monthlyTargets: s.monthlyOutcomes, weeklyTargets: s.weeklyFocuses, executionRecords: s.executionRecords }, allocation, now); assert.deepEqual(build(s).details.attention, mirror); });
test("all evidence paths resolve to exact trusted/derived values", () => { const s = fixture(); const r = build(s); const sources = { tasks: s.tasks, habits: r.details.habits, review: r.details.review, attention: r.details.attention }; for (const item of [...r.wins, ...r.needsAttention, ...r.nextWeekSuggestions]) for (const e of item.evidence) { let value: unknown = sources[e.source]; for (const key of e.path.replace(/\[(\d+)\]/g, ".$1").split(".").filter(Boolean)) value = (value as Record<string, unknown>)[key]; assert.deepEqual(value, e.value); } });
test("account-scoped preferences and runtime component prevent cross-account reuse", () => { const map = new Map<string, string>(); const storage = { getItem: (k: string) => map.get(k) ?? null, setItem: (k: string, v: string) => { map.set(k, v); } }; saveAttentionPreferences(storage, "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa", allocation); assert.equal(readAttentionPreferences(storage, "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb"), null); const ui = readFileSync(new URL("../../src/reviews/WeeklyReviewPanel.tsx", import.meta.url), "utf8"); assert.ok(ui.includes("key={identity.userId}")); });
test("review code owns no mutation, provider, or XP API", () => { for (const file of ["weeklyReviewIntelligence.ts", "WeeklyReviewPanel.tsx"]) { const code = readFileSync(new URL(`../../src/reviews/${file}`, import.meta.url), "utf8"); for (const banned of ["completeTask", "appendConfirmed", "updateHabit", "replaceLifeGoals", "HostedAtlasProvider", "fetch(", "awardXP"]) assert.ok(!code.includes(banned)); } });
test("missing hierarchy maps focus to Other focus, not guessed goal", () => { const s = fixture(); s.weeklyFocuses = []; assert.ok(build(s).focusSummary!.text.includes("Other focus")); });
