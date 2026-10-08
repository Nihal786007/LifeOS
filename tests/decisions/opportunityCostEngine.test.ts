import assert from "node:assert/strict";
import test from "node:test";
import { registerHooks } from "node:module";
import { readFileSync } from "node:fs";
import type { OpportunityInput } from "../../src/decisions/opportunityCostEngine.ts";
import type { ExternalCalendarEvent } from "../../src/connectors/googleCalendar/types.ts";
registerHooks({ resolve(specifier, context, next) { return next(specifier.startsWith(".") && !/\.[a-z]+$/i.test(specifier) ? `${specifier}.ts` : specifier, context); } });
const { analyzeOpportunityCost: analyze, opportunityInstant } = await import("../../src/decisions/opportunityCostEngine.ts");
const { buildFocusCompletionRecord } = await import("../../src/focus/focusAudit.ts");
const { createFocusSession } = await import("../../src/focus/focusSession.ts");
function fixture(): OpportunityInput {
  return { now: new Date(2026, 9, 8, 12), proposed: { title: "Hypothetical", startAt: "2026-10-08T18:30:00Z", endAt: "2026-10-08T19:30:00Z" }, allocation: null,
    calendar: { connected: true, readModel: { calendars: [], events: [], fetchedAt: "2026-10-08T12:00:00Z", windowStart: "2026-10-01T00:00:00Z", windowEnd: "2026-11-01T00:00:00Z" } },
    state: { capturedAt: "2026-10-08T12:00:00Z", tasks: [], lifeGoals: [], monthlyTargets: [], weeklyTargets: [], executionHistory: [], habitDefinitions: [], habitCompletions: [], captures: [], profile: { name: "", occupation: "", timezone: "Asia/Kolkata", theme: "dark", atlasPersonality: "Professional", level: 1, xp: 0 } } };
}
function event(id = "one", start = "2026-10-08T19:00:00Z", end = "2026-10-08T20:00:00Z"): ExternalCalendarEvent {
  return { provider: "google-calendar", externalId: id, calendarId: "calendar", calendarName: "Synthetic", title: "Synthetic event", start: { kind: "dateTime", dateTime: start }, end: { kind: "dateTime", dateTime: end }, allDay: false };
}
function withEvents(...events: ExternalCalendarEvent[]) { const i = fixture(); i.calendar.readModel.events = events; return i; }
test("exact timed overlap is 30 minutes", () => assert.equal(analyze(withEvents(event())).overlapMinutes, 30));
test("non-overlapping occurrence", () => assert.equal(analyze(withEvents(event("one", "2026-10-08T20:00:00Z", "2026-10-08T21:00:00Z"))).conflicts.length, 0));
test("adjacent boundaries do not overlap", () => assert.equal(analyze(withEvents(event("one", "2026-10-08T19:30:00Z"))).conflicts.length, 0));
test("simultaneous events keep individual evidence but union duration", () => { const r = analyze(withEvents(event(), event("two"))); assert.equal(r.conflicts.length, 2); assert.equal(r.overlapMinutes, 30); });
test("same calendar occurrence duplicated is counted once", () => { const r = analyze(withEvents(event(), event())); assert.equal(r.conflicts.length, 1); assert.equal(r.overlapMinutes, 30); });
test("distinct events are not deduplicated by title", () => assert.equal(analyze(withEvents(event(), event("two"))).conflicts.length, 2));
test("contradictory duplicate occurrence is omitted honestly", () => { const r = analyze(withEvents(event(), event("one", "2026-10-08T18:00:00Z"))); assert.equal(r.conflicts.length, 0); assert.match(r.limitations.join(" "), /Conflicting representations/); });
test("midnight and overnight overlap", () => { const i = withEvents(event("one", "2026-10-09T00:00:00Z", "2026-10-09T01:00:00Z")); i.proposed.startAt = "2026-10-08T23:30:00Z"; i.proposed.endAt = "2026-10-09T00:30:00Z"; assert.equal(analyze(i).overlapMinutes, 30); });
test("offset conversion uses instants", () => { const i = withEvents(event()); i.proposed.startAt = "2026-10-09T00:00:00+05:30"; i.proposed.endAt = "2026-10-09T01:00:00+05:30"; assert.equal(analyze(i).overlapMinutes, 30); });
test("DST spring transition duration uses explicit offsets", () => { const i = fixture(); i.proposed = { title: "DST", startAt: "2026-03-08T01:30:00-05:00", endAt: "2026-03-08T03:30:00-04:00" }; assert.equal(analyze(i).durationMinutes, 60); });
test("DST repeated hour distinguished by offset", () => { const i = fixture(); i.proposed = { title: "DST", startAt: "2026-11-01T01:30:00-04:00", endAt: "2026-11-01T01:30:00-05:00" }; assert.equal(analyze(i).durationMinutes, 60); });
test("ambiguous offset-free timestamp rejected", () => { const i = fixture(); i.proposed.startAt = "2026-11-01T01:30:00"; assert.ok(analyze(i).errors.length); });
test("all-day event is not occupied timed availability", () => { const e = event(); e.allDay = true; e.start = { kind: "date", date: "2026-10-08" }; e.end = { kind: "date", date: "2026-10-10" }; const r = analyze(withEvents(e)); assert.equal(r.overlapMinutes, 0); assert.match(r.limitations.join(" "), /all-day/); });
test("cancelled event is omitted", () => { const e = event(); e.status = "cancelled"; assert.equal(analyze(withEvents(e)).conflicts.length, 0); });
test("unknown duration and date-only remain honest", () => { const i = fixture(); i.proposed = { title: "Unknown", date: "2026-10-08" }; const r = analyze(i); assert.equal(r.durationMinutes, null); assert.equal(r.conflicts.length, 0); assert.match(r.limitations.join(" "), /No exact/); });
test("duration without time does not infer slot", () => { const i = fixture(); i.proposed = { title: "Unknown", durationMinutes: 120 }; assert.equal(analyze(i).durationMinutes, 120); assert.equal(analyze(i).conflicts.length, 0); });
test("invalid end time and inconsistent duration fail", () => { const i = fixture(); i.proposed.endAt = i.proposed.startAt; assert.ok(analyze(i).errors.length); i.proposed.endAt = "2026-10-08T19:30:00Z"; i.proposed.durationMinutes = 30; assert.ok(analyze(i).errors.length); });
test("invalid calendar/time values do not normalize", () => { assert.ok(Number.isNaN(opportunityInstant("2026-02-30T19:00:00Z"))); assert.ok(Number.isNaN(opportunityInstant("2026-10-08T25:00:00Z"))); });
function attentionFixture() {
  const i = fixture(); const stamp = new Date(2026, 9, 5, 9).toISOString();
  i.state.lifeGoals = [1, 2].map(id => ({ id, title: `Goal ${id}`, completed: false, progress: 0, startDate: "2026-10-05", createdAt: stamp }));
  i.state.monthlyTargets = [1, 2].map(id => ({ id, goalId: id, title: "Month", month: 10, year: 2026, completed: false, progress: 0, createdAt: stamp }));
  i.state.weeklyTargets = [1, 2].map(id => ({ id, monthlyTargetId: id, title: "Week", week: 1, completed: false, progress: 0, createdAt: stamp }));
  i.state.tasks = [1, 2].map(id => ({ id, weeklyTargetId: id, title: `Task ${id}`, completed: false, priority: "high", createdAt: stamp }));
  i.state.executionHistory = [buildFocusCompletionRecord(createFocusSession(1, "synthetic", stamp, "opportunity-a"), new Date(2026, 9, 5, 9, 30).toISOString(), 10), buildFocusCompletionRecord(createFocusSession(2, "synthetic", new Date(2026, 9, 5, 10).toISOString(), "opportunity-b"), new Date(2026, 9, 5, 11, 30).toISOString(), 11)];
  i.allocation = { version: 1, updatedAt: stamp, shares: [{ categoryId: "goal:1", percent: 60 }, { categoryId: "goal:2", percent: 40 }] }; i.proposed.linkedGoalId = 2;
  return i;
}
test("under-attended other goal is possible trade-off not proven loss", () => { const r = analyze(attentionFixture()); assert.ok(r.possibleTradeoffs.some(e => e.id === "under:goal:1" && /does not prove/.test(e.explanation))); });
test("over-attended linked goal reuses Mirror insight", () => assert.ok(analyze(attentionFixture()).possibleTradeoffs.some(e => e.id === "over:goal:2")));
test("missing Mirror allocation does not fabricate drift", () => { const i = attentionFixture(); i.allocation = null; assert.equal(analyze(i).possibleTradeoffs.length, 0); });
test("completed or deleted goal reference rejected", () => { const i = fixture(); i.proposed.linkedGoalId = 999; assert.ok(analyze(i).errors.length); });
test("high overdue task pressure does not invent duration", () => { const i = fixture(); i.state.tasks = [{ id: 1, title: "Synthetic", priority: "high", completed: false, dueDate: "2026-10-07", createdAt: i.state.capturedAt }]; const r = analyze(i); assert.equal(r.pressure.length, 1); assert.match(r.pressure[0].explanation, /unknown/); assert.equal(r.conflicts.length, 0); });
test("completed task omitted from pressure", () => { const i = fixture(); i.state.tasks = [{ id: 1, title: "Synthetic", priority: "high", completed: true, dueDate: "2026-10-07", createdAt: i.state.capturedAt }]; assert.equal(analyze(i).pressure.length, 0); });
test("habit schedule is day-level only", () => { const i = fixture(); i.proposed = { title: "Habit", date: "2026-10-08" }; i.state.habitDefinitions = [{ id: 1, name: "Habit", activeDays: ["thursday"], archived: false, startDate: "2026-10-01", createdAt: i.state.capturedAt, updatedAt: i.state.capturedAt }]; const r = analyze(i); assert.equal(r.pressure.length, 1); assert.match(r.pressure[0].explanation, /no timed conflict/); });
test("disconnected calendar cannot contribute cached rows", () => { const i = withEvents(event()); i.calendar.connected = false; assert.equal(analyze(i).conflicts.length, 0); });
test("partial calendar coverage stated explicitly", () => { const i = fixture(); i.calendar.readModel.windowEnd = "2026-10-08T19:00:00Z"; assert.match(analyze(i).limitations.join(" "), /does not cover/); });
test("sparse evidence never invents availability", () => { const r = analyze(fixture()); assert.equal(r.conflicts.length + r.possibleTradeoffs.length + r.pressure.length, 0); assert.match(r.limitations.join(" "), /actual availability may differ/); assert.ok(!JSON.stringify(r).includes("hours free")); });
test("stable conflict order and identical result", () => { const i = withEvents(event("z"), event("a")); const r = analyze(i); assert.deepEqual(r, analyze(i)); assert.deepEqual(r.conflicts.map(e => (e.value as ExternalCalendarEvent).externalId), ["a", "z"]); });
test("analysis does not mutate canonical state or XP", () => { const i = attentionFixture(); const before = structuredClone(i); analyze(i); assert.deepEqual(i, before); assert.equal(i.state.executionHistory.reduce((n, e) => n + e.xpAwarded, 0), 0); });
test("separate account inputs do not retain prior evidence", () => { assert.equal(analyze(withEvents(event())).conflicts.length, 1); assert.equal(analyze(fixture()).conflicts.length, 0); const page = readFileSync(new URL("../../src/pages/Decisions.tsx", import.meta.url), "utf8"); assert.match(page, /key=\{identity.userId\}/); });
test("presentation/engine contain no automatic action or storage writes", () => { for (const path of ["../../src/decisions/opportunityCostEngine.ts", "../../src/components/decisions/OpportunityCostSection.tsx"]) { const text = readFileSync(new URL(path, import.meta.url), "utf8"); assert.doesNotMatch(text, /localStorage\.(setItem|removeItem)|fetch\(|updateTask\(|createTask\(|executeAction\(/); } });
