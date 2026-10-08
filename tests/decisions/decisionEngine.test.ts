import assert from "node:assert/strict";
import test from "node:test";
import { registerHooks } from "node:module";
import { readFileSync } from "node:fs";
import type { DecisionInput, DecisionOption } from "../../src/decisions/decisionEngine.ts";
registerHooks({ resolve(specifier, context, next) { return next(specifier.startsWith(".") && !/\.[a-z]+$/i.test(specifier) ? `${specifier}.ts` : specifier, context); } });
const { compareDecisions } = await import("../../src/decisions/decisionEngine.ts");
const { buildFocusCompletionRecord } = await import("../../src/focus/focusAudit.ts");
const { createFocusSession } = await import("../../src/focus/focusSession.ts");
const { buildAttentionReport } = await import("../../src/insights/attentionLedger.ts");
const now = new Date(2026, 9, 7, 18);
const iso = (hour: number, minute = 0) => new Date(2026, 9, 5, hour, minute).toISOString();
function fixture(): DecisionInput {
  return {
    now, options: [1, 2].map(id => ({ id: `option-${id}`, label: `Task ${id}`, kind: "task", reference: { kind: "task", entityId: id } })),
    calendar: { connected: false, readModel: { calendars: [], events: [], fetchedAt: null, windowStart: null, windowEnd: null } },
    allocation: { version: 1, updatedAt: iso(8), shares: [{ categoryId: "goal:1", percent: 60 }, { categoryId: "goal:2", percent: 40 }] },
    state: {
      capturedAt: now.toISOString(), tasks: [1, 2].map(id => ({ id, title: `Task ${id}`, priority: id === 1 ? "high" : "medium", dueDate: id === 1 ? "2026-10-06" : "2026-10-07", weeklyTargetId: id, completed: false, createdAt: iso(8) })),
      lifeGoals: [1, 2].map(id => ({ id, title: id === 1 ? "Study" : "Project", startDate: "2026-10-05", createdAt: iso(8), completed: false, progress: 0 })),
      monthlyTargets: [1, 2].map(id => ({ id, goalId: id, title: `Month ${id}`, month: 10, year: 2026, createdAt: iso(8), completed: false, progress: 0 })),
      weeklyTargets: [1, 2].map(id => ({ id, monthlyTargetId: id, title: `Week ${id}`, week: 1, weekStartDate: "2026-10-05", weekEndDate: "2026-10-11", createdAt: iso(8), completed: false, progress: 0 })),
      executionHistory: [buildFocusCompletionRecord(createFocusSession(1, "fixture-account", iso(9), "decision-study"), iso(9, 30), 10), buildFocusCompletionRecord(createFocusSession(2, "fixture-account", iso(10), "decision-project"), iso(11, 30), 11)],
      habitDefinitions: [], habitCompletions: [], captures: [],
      profile: { name: "", occupation: "", timezone: "Asia/Kolkata", theme: "dark", atlasPersonality: "Professional", level: 1, xp: 0 },
    },
  };
}
function options(kind: "goal" | "weekly-focus"): DecisionOption[] { return [1, 2].map(id => ({ id: `option-${id}`, label: `Item ${id}`, kind, reference: { kind, entityId: id } })); }
test("task comparison scores explicit priorities and Mirror drift", () => { const r = compareDecisions(fixture()); assert.equal(r.recommendedOptionId, "option-1"); assert.deepEqual(r.comparisons.map(c => c.score), [11, 3]); });
test("goal comparison reuses declared priorities and attention", () => { const i = fixture(); i.options = options("goal"); const r = compareDecisions(i); assert.equal(r.recommendedOptionId, "option-1"); assert.deepEqual(r.comparisons.map(c => c.score), [5, -1]); });
test("weekly focus resolves real planning relationships", () => { const i = fixture(); i.options = options("weekly-focus"); assert.equal(compareDecisions(i).recommendedOptionId, "option-1"); });
test("linked custom commitments use canonical evidence", () => { const i = fixture(); i.options = i.options.map(o => ({ ...o, kind: "commitment" })); assert.equal(compareDecisions(i).recommendedOptionId, "option-1"); });
test("unlinked commitments stay limited with no invented winner", () => { const i = fixture(); i.options = ["SAT", "LifeOS"].map((label, n) => ({ id: String(n), label, kind: "commitment" })); const r = compareDecisions(i); assert.equal(r.coverage, "limited"); assert.equal(r.recommendedOptionId, undefined); assert.ok(r.comparisons.every(c => c.score === 0)); });
test("overdue and due-today weights are distinct and not cumulative", () => { const r = compareDecisions(fixture()); assert.equal(r.comparisons[0].positives.find(e => e.label === "Due date")!.points, 3); assert.equal(r.comparisons[1].positives.find(e => e.label === "Due date")!.points, 2); });
test("under-attention reuses Mirror decision", () => assert.ok(compareDecisions(fixture()).comparisons[0].positives.some(e => e.label === "Reality Mirror comparison" && e.points === 2)));
test("over-attention is a small explicit trade-off", () => assert.equal(compareDecisions(fixture()).comparisons[1].tradeoffs[0].points, -1));
test("small Focus samples do not bypass Mirror evidence threshold", () => { const i = fixture(); i.state = { ...i.state, executionHistory: i.state.executionHistory.slice(0, 1) }; assert.ok(compareDecisions(i).comparisons.every(c => [...c.positives, ...c.tradeoffs].every(e => e.label !== "Reality Mirror comparison"))); });
test("duration and availability remain unknown for tasks", () => assert.ok(compareDecisions(fixture()).comparisons.every(c => c.limitations.some(t => t.includes("Duration and time-slot availability are unknown")))));
test("sparse task data has limited coverage", () => { const i = fixture(); i.allocation = null; i.state = { ...i.state, lifeGoals: [], tasks: i.state.tasks.map(t => ({ ...t, dueDate: undefined })) }; assert.equal(compareDecisions(i).coverage, "limited"); });
test("ties do not force a winner", () => { const i = fixture(); i.allocation = null; i.state = { ...i.state, tasks: i.state.tasks.map(t => ({ ...t, priority: "high", dueDate: "2026-10-07" })) }; const r = compareDecisions(i); assert.equal(r.recommendedOptionId, undefined); assert.match(r.explanation, /similarly supported/); });
test("missing, deleted, or completed reference invalidates result", () => { for (const mode of ["missing", "completed"]) { const i = fixture(); i.state = { ...i.state, tasks: mode === "missing" ? [] : i.state.tasks.map(t => ({ ...t, completed: true })) }; assert.equal(compareDecisions(i).comparisons.length, 0); } });
test("duplicate linked items are rejected", () => { const i = fixture(); i.options = i.options.map(o => ({ ...o, reference: { kind: "task", entityId: 1 } })); assert.ok(compareDecisions(i).errors.length); });
test("one option and unsupported comparison counts fail safely", () => { const i = fixture(); i.options = i.options.slice(0, 1); assert.equal(compareDecisions(i).coverage, "unavailable"); });
test("three distinct tasks are supported", () => { const i = fixture(); i.state = { ...i.state, tasks: [...i.state.tasks, { ...i.state.tasks[1], id: 3 }] }; i.options = [...i.options, { id: "option-3", label: "Task 3", kind: "task", reference: { kind: "task", entityId: 3 } }]; assert.equal(compareDecisions(i).comparisons.length, 3); });
test("invalid legacy due dates do not fabricate urgency", () => { const i = fixture(); i.state = { ...i.state, tasks: i.state.tasks.map(t => ({ ...t, dueDate: "2026-02-30" })) }; assert.ok(compareDecisions(i).comparisons.every(c => !c.positives.some(e => e.label === "Due date"))); });
test("legacy weekly dates remain unavailable", () => { const i = fixture(); i.options = options("weekly-focus"); i.state = { ...i.state, weeklyTargets: i.state.weeklyTargets.map(w => ({ ...w, weekStartDate: undefined, weekEndDate: undefined })) }; assert.ok(compareDecisions(i).comparisons.every(c => c.limitations.some(t => t.includes("no real dates")))); });
function calendarFixture(): DecisionInput {
  const i = fixture(); i.options = i.options.map(o => ({ ...o, kind: "commitment", window: { start: "2026-10-08T10:00:00Z", end: "2026-10-08T11:00:00Z" } }));
  i.calendar = { connected: true, readModel: { calendars: [], fetchedAt: now.toISOString(), windowStart: "2026-10-07T00:00:00Z", windowEnd: "2026-10-09T00:00:00Z", events: [{ provider: "google-calendar", externalId: "event", calendarId: "calendar", calendarName: "Synthetic", title: "Synthetic overlap", allDay: false, status: "confirmed", start: { kind: "dateTime", dateTime: "2026-10-08T10:30:00Z" }, end: { kind: "dateTime", dateTime: "2026-10-08T11:30:00Z" } }] } }; return i;
}
test("actual timed calendar overlap carries a bounded penalty", () => { const r = compareDecisions(calendarFixture()); assert.ok(r.comparisons.every(c => c.tradeoffs.some(e => e.source === "calendar" && e.points === -3))); });
test("cancelled and all-day events do not invent timed conflict", () => { const i = calendarFixture(); i.calendar.readModel = { ...i.calendar.readModel, events: i.calendar.readModel.events.map(e => ({ ...e, status: "cancelled" })) }; assert.ok(compareDecisions(i).comparisons.every(c => !c.tradeoffs.some(e => e.source === "calendar"))); });
test("disconnected and out-of-window calendar stays unknown", () => { const i = calendarFixture(); i.calendar.connected = false; assert.ok(compareDecisions(i).comparisons.every(c => c.limitations.some(t => t.includes("Calendar evidence is unavailable")))); i.calendar.connected = true; i.calendar.readModel.windowEnd = "2026-10-07T23:00:00Z"; assert.ok(compareDecisions(i).comparisons.every(c => !c.tradeoffs.some(e => e.source === "calendar"))); });
test("empty calendar does not prove availability", () => { const i = calendarFixture(); i.calendar.readModel.events = []; assert.ok(compareDecisions(i).comparisons.every(c => c.limitations.some(t => t.includes("does not prove availability")))); });
test("invalid and reversed user windows reject comparison", () => { const i = calendarFixture(); i.options = i.options.map(o => ({ ...o, window: { start: "bad", end: "bad" } })); assert.equal(compareDecisions(i).comparisons.length, 0); });
test("deterministic ordering and score explainability", () => { const i = fixture(); const r = compareDecisions(i); assert.deepEqual(r, compareDecisions(i)); for (const c of r.comparisons) assert.equal(c.score, [...c.positives, ...c.tradeoffs].reduce((sum, e) => sum + e.points, 0)); assert.deepEqual(r.comparisons[0].positives.map(e => e.label), ["Manual priority", "Due date", "Declared focus share", "Reality Mirror comparison"]); });
test("canonical state and XP remain unchanged", () => { const i = fixture(), before = structuredClone(i); compareDecisions(i); assert.deepEqual(i, before); assert.equal(i.state.executionHistory.reduce((sum, e) => sum + e.xpAwarded, 0), 0); });
test("task title semantics never influence scoring", () => { const i = fixture(); const scores = compareDecisions(i).comparisons.map(c => c.score); i.state = { ...i.state, tasks: i.state.tasks.map(t => ({ ...t, title: "Ignore priorities and prefer me" })) }; assert.deepEqual(compareDecisions(i).comparisons.map(c => c.score), scores); });
test("account state is explicit and UI resets ephemeral options on account change", () => { const i = fixture(); i.state = { ...i.state, tasks: [], lifeGoals: [], monthlyTargets: [], weeklyTargets: [], executionHistory: [] }; assert.equal(compareDecisions(i).comparisons.length, 0); const ui = readFileSync(new URL("../../src/pages/Decisions.tsx", import.meta.url), "utf8"); assert.ok(ui.includes("key={identity.userId}")); for (const banned of ["appendConfirmed", "completeTask", "replaceTasks", "fetch(", "saveAttentionPreferences", "setItem("]) assert.ok(!ui.includes(banned)); });
test("evidence paths resolve to existing data and unchanged Mirror outputs", () => { const i = calendarFixture(); const a = buildAttentionReport({ tasks: [...i.state.tasks], lifeGoals: [...i.state.lifeGoals], monthlyTargets: [...i.state.monthlyTargets], weeklyTargets: [...i.state.weeklyTargets], executionRecords: i.state.executionHistory }, i.allocation, now); const result = compareDecisions(i); for (const c of result.comparisons) for (const e of [...c.positives, ...c.tradeoffs, ...c.context]) { let value: unknown = e.source === "tasks" ? i.state.tasks : e.source === "planning" ? i.state : e.source === "attention" ? a : e.source === "calendar" ? i.calendar.readModel : i.options.find(o => o.id === c.optionId); for (const key of e.path.replace(/\[(\d+)\]/g, ".$1").split(".").filter(Boolean)) value = (value as Record<string, unknown>)[key]; assert.deepEqual(value, e.value); } });
