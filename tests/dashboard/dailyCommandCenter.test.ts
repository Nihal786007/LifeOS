import assert from "node:assert/strict";
import test from "node:test";

import { buildDailyCommandCenter } from "../../src/dashboard/dailyCommandCenterModel.ts";
import type { AtlasRankedTask } from "../../src/atlas/priority/types.ts";
import type { AtlasCanonicalState } from "../../src/atlas/state/types.ts";

const capturedAt = "2026-09-23T08:00:00.000Z";

function createState(overrides: Partial<AtlasCanonicalState> = {}): AtlasCanonicalState {
  return {
    capturedAt,
    tasks: [
      { id: 1, title: "Finish SAT review", priority: "high", dueDate: "2026-09-23", weeklyTargetId: 300, completed: false, createdAt: "2026-09-20T09:00:00.000Z" },
      { id: 2, title: "Submit overdue form", priority: "medium", dueDate: "2026-09-22", completed: false, createdAt: "2026-09-18T09:00:00.000Z" },
      { id: 3, title: "Prepare October plan", priority: "low", dueDate: "2026-09-28", completed: false, createdAt: "2026-09-21T09:00:00.000Z" },
      { id: 4, title: "Morning review", priority: "high", dueDate: "2026-09-23", completed: true, completedAt: "2026-09-23T06:00:00.000Z", createdAt: "2026-09-20T09:00:00.000Z" },
    ],
    habitDefinitions: [
      { id: 10, name: "Read", activeDays: ["wednesday"], startDate: "2026-09-01", archived: false, createdAt: "2026-09-01T00:00:00.000Z", updatedAt: "2026-09-01T00:00:00.000Z" },
      { id: 11, name: "Exercise", activeDays: ["wednesday"], startDate: "2026-09-01", archived: false, createdAt: "2026-09-01T00:00:00.000Z", updatedAt: "2026-09-01T00:00:00.000Z" },
      { id: 12, name: "Weekly review", activeDays: ["thursday"], startDate: "2026-09-01", archived: false, createdAt: "2026-09-01T00:00:00.000Z", updatedAt: "2026-09-01T00:00:00.000Z" },
    ],
    habitCompletions: [
      { id: 20, habitId: 10, date: "2026-09-23", completedAt: "2026-09-23T05:00:00.000Z" },
    ],
    lifeGoals: [
      { id: 100, title: "Earn an excellent SAT score", progress: 25, completed: false, startDate: "2026-09-01", targetDate: "2026-12-01", createdAt: "2026-09-01T00:00:00.000Z" },
    ],
    monthlyTargets: [
      { id: 200, title: "Finish core SAT syllabus", month: 9, year: 2026, goalId: 100, progress: 40, completed: false, createdAt: "2026-09-01T00:00:00.000Z" },
    ],
    weeklyTargets: [
      { id: 300, title: "Complete algebra revision", monthlyTargetId: 200, week: 4, weekStartDate: "2026-09-21", weekEndDate: "2026-09-27", progress: 35, completed: false, createdAt: "2026-09-21T00:00:00.000Z" },
    ],
    executionHistory: [
      { id: 400, type: "task_completed", entityId: 4, title: "Morning review", createdAt: "2026-09-23T06:00:00.000Z", xpAwarded: 25 },
      { id: 401, type: "habit_completed", entityId: 10, title: "Read", createdAt: "2026-09-23T05:00:00.000Z", xpAwarded: 0 },
    ],
    captures: [],
    profile: { name: "Nihal Ahmed", occupation: "Student", timezone: "Asia/Kolkata", theme: "dark", atlasPersonality: "Professional", level: 1, xp: 0 },
    ...overrides,
  };
}

const rankedTasks: readonly AtlasRankedTask[] = [
  { taskId: 2, title: "Submit overdue form", rank: 1, score: 80, tier: "critical", reasons: ["Overdue task"], contributions: [] },
  { taskId: 1, title: "Finish SAT review", rank: 2, score: 65, tier: "high", reasons: ["Due today and aligned"], contributions: [] },
  { taskId: 3, title: "Prepare October plan", rank: 3, score: 20, tier: "low", reasons: ["Active future task"], contributions: [] },
];

test("derives the ordered Today task list without including future work", () => {
  const model = buildDailyCommandCenter(createState(), rankedTasks);

  assert.deepEqual(model.tasks.map(({ id, status }) => ({ id, status })), [
    { id: 2, status: "overdue" },
    { id: 1, status: "today" },
    { id: 4, status: "completed" },
  ]);
});

test("reuses deterministic ranked priorities and labels future tasks accurately", () => {
  const model = buildDailyCommandCenter(createState(), rankedTasks);

  assert.deepEqual(model.priorities.map(({ id, rank, tier, status }) => ({ id, rank, tier, status })), [
    { id: 2, rank: 1, tier: "critical", status: "overdue" },
    { id: 1, rank: 2, tier: "high", status: "today" },
    { id: 3, rank: 3, tier: "low", status: "active" },
  ]);
});

test("derives scheduled and completed habits through canonical habit history", () => {
  const model = buildDailyCommandCenter(createState(), rankedTasks);

  assert.deepEqual(model.habits, [
    { id: 11, name: "Exercise", completed: false },
    { id: 10, name: "Read", completed: true },
  ]);
  assert.equal(model.summary.habitsDue, 2);
  assert.equal(model.summary.habitsCompleted, 1);
});

test("preserves the explicit Goal to Monthly Outcome to dated Weekly Focus chain", () => {
  const model = buildDailyCommandCenter(createState(), rankedTasks);

  assert.deepEqual(model.planning, [{
    lifeGoal: "Earn an excellent SAT score",
    monthlyOutcome: "Finish core SAT syllabus",
    weeklyFocus: "Complete algebra revision",
  }]);
});

test("does not guess a current week for legacy Weekly Focus records without dates", () => {
  const state = createState({
    weeklyTargets: [{ id: 300, title: "Legacy focus", monthlyTargetId: 200, week: 4, progress: 35, completed: false, createdAt: "2026-09-21T00:00:00.000Z" }],
  });

  assert.deepEqual(buildDailyCommandCenter(state, rankedTasks).planning, [{
    lifeGoal: "Earn an excellent SAT score",
    monthlyOutcome: "Finish core SAT syllabus",
  }]);
});

test("keeps an unlinked active Life Goal separate from a personal planning chain", () => {
  const state = createState({
    monthlyTargets: [{ id: 200, title: "Personal outcome", month: 9, year: 2026, progress: 40, completed: false, createdAt: "2026-09-01T00:00:00.000Z" }],
  });

  assert.deepEqual(buildDailyCommandCenter(state, rankedTasks).planning, [
    { monthlyOutcome: "Personal outcome", weeklyFocus: "Complete algebra revision" },
    { lifeGoal: "Earn an excellent SAT score" },
  ]);
});

test("derives today's completion and XP progress only from canonical state", () => {
  const model = buildDailyCommandCenter(createState(), rankedTasks);

  assert.deepEqual(model.progress, { tasksCompleted: 1, habitsCompleted: 1, xpEarned: 25, executionCount: 2 });
  assert.deepEqual(model.summary, { tasks: 3, tasksCompleted: 1, habitsDue: 2, habitsCompleted: 1, xp: 25 });
});

test("shows the intentional daily empty state while retaining planning direction", () => {
  const state = createState({ tasks: [], habitDefinitions: [], habitCompletions: [], executionHistory: [] });
  const model = buildDailyCommandCenter(state, []);

  assert.equal(model.isEmpty, true);
  assert.equal(model.planning.length, 1);
});

test("does not mutate the canonical snapshot", () => {
  const state = createState();
  const before = structuredClone(state);

  buildDailyCommandCenter(state, rankedTasks);

  assert.deepEqual(state, before);
});
