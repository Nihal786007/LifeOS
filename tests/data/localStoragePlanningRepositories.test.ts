import assert from "node:assert/strict";
import {
  registerHooks,
} from "node:module";
import test from "node:test";

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith(".") && !/\.[a-z]+$/i.test(specifier)) {
      return nextResolve(`${specifier}.ts`, context);
    }
    return nextResolve(specifier, context);
  },
});

const {
  LocalStorageLifeGoalRepository,
  LocalStorageMonthlyOutcomeRepository,
  LocalStorageWeeklyFocusRepository,
} = await import(
  "../../src/data/planning/localStoragePlanningRepositories.ts"
);

import type {
  PlanningStorage,
  PlanningStorageEventTarget,
} from "../../src/data/planning/localStoragePlanningRepositories.ts";
import type {
  LifeGoal,
  MonthlyTarget,
  WeeklyTarget,
} from "../../src/shared/types.ts";

const LIFE_GOAL_KEY = "lifeos-life-goals";
const MONTHLY_OUTCOME_KEY = "lifeos-monthly-plans";
const WEEKLY_FOCUS_KEY = "lifeos-weekly-targets";

const lifeGoals: LifeGoal[] = [{
  id: 101,
  title: "Ship LifeOS",
  description: "Preserve every field",
  progress: 40,
  completed: false,
  startDate: "2026-09-01",
  targetDate: "2026-12-31",
  createdAt: "2026-09-01T08:00:00.000Z",
}];

const monthlyOutcomes: MonthlyTarget[] = [{
  id: 201,
  title: "Release architecture",
  month: 9,
  year: 2026,
  goalId: 101,
  progress: 25,
  completed: false,
  createdAt: "2026-09-02T08:00:00.000Z",
}];

const datedWeeklyFocuses: WeeklyTarget[] = [{
  id: 301,
  title: "Persistence boundaries",
  monthlyTargetId: 201,
  week: 2,
  weekStartDate: "2026-09-07",
  weekEndDate: "2026-09-13",
  progress: 50,
  completed: false,
  createdAt: "2026-09-07T08:00:00.000Z",
}];

const legacyWeeklyFocuses: WeeklyTarget[] = [{
  id: 302,
  title: "Legacy focus",
  monthlyTargetId: 201,
  week: 1,
  progress: 10,
  completed: false,
  createdAt: "2026-09-01T08:00:00.000Z",
}];

class MemoryStorage implements PlanningStorage {
  readonly values = new Map<string, string>();
  readonly reads: string[] = [];
  readonly writes: string[] = [];

  getItem(key: string): string | null {
    this.reads.push(key);
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.writes.push(key);
    this.values.set(key, value);
  }
}

class MemoryStorageEvents implements PlanningStorageEventTarget {
  private readonly listeners = new Set<EventListener>();

  addEventListener(_type: "storage", listener: EventListener): void {
    this.listeners.add(listener);
  }

  removeEventListener(_type: "storage", listener: EventListener): void {
    this.listeners.delete(listener);
  }

  dispatch(key: string): void {
    for (const listener of this.listeners) {
      listener({ key } as unknown as Event);
    }
  }
}

function repositories(storage: MemoryStorage, events?: MemoryStorageEvents) {
  return {
    lifeGoals: new LocalStorageLifeGoalRepository(storage, events),
    monthlyOutcomes: new LocalStorageMonthlyOutcomeRepository(storage, events),
    weeklyFocuses: new LocalStorageWeeklyFocusRepository(storage, events),
  };
}

test("missing planning values load as empty without writing", () => {
  const storage = new MemoryStorage();
  const repository = repositories(storage);

  assert.deepEqual(repository.lifeGoals.load(), []);
  assert.deepEqual(repository.monthlyOutcomes.load(), []);
  assert.deepEqual(repository.weeklyFocuses.load(), []);
  assert.deepEqual(storage.writes, []);
});

test("valid planning collections load unchanged", () => {
  const storage = new MemoryStorage();
  storage.values.set(LIFE_GOAL_KEY, JSON.stringify(lifeGoals));
  storage.values.set(MONTHLY_OUTCOME_KEY, JSON.stringify(monthlyOutcomes));
  storage.values.set(WEEKLY_FOCUS_KEY, JSON.stringify(datedWeeklyFocuses));
  const repository = repositories(storage);

  assert.deepEqual(repository.lifeGoals.load(), lifeGoals);
  assert.deepEqual(repository.monthlyOutcomes.load(), monthlyOutcomes);
  assert.deepEqual(repository.weeklyFocuses.load(), datedWeeklyFocuses);
});

test("save and load round-trips every planning collection", () => {
  const storage = new MemoryStorage();
  const repository = repositories(storage);
  repository.lifeGoals.save(lifeGoals);
  repository.monthlyOutcomes.save(monthlyOutcomes);
  repository.weeklyFocuses.save(datedWeeklyFocuses);

  assert.deepEqual(repository.lifeGoals.load(), lifeGoals);
  assert.deepEqual(repository.monthlyOutcomes.load(), monthlyOutcomes);
  assert.deepEqual(repository.weeklyFocuses.load(), datedWeeklyFocuses);
});

test("malformed JSON safely falls back and is never rewritten by load", () => {
  const storage = new MemoryStorage();
  storage.values.set(LIFE_GOAL_KEY, "{bad-goals");
  storage.values.set(MONTHLY_OUTCOME_KEY, "{bad-months");
  storage.values.set(WEEKLY_FOCUS_KEY, "{bad-weeks");
  const repository = repositories(storage);

  assert.deepEqual(repository.lifeGoals.load(), []);
  assert.deepEqual(repository.monthlyOutcomes.load(), []);
  assert.deepEqual(repository.weeklyFocuses.load(), []);
  assert.deepEqual(storage.writes, []);
  assert.equal(storage.values.get(LIFE_GOAL_KEY), "{bad-goals");
  assert.equal(storage.values.get(MONTHLY_OUTCOME_KEY), "{bad-months");
  assert.equal(storage.values.get(WEEKLY_FOCUS_KEY), "{bad-weeks");
});

test("invalid top-level planning payloads safely fall back", () => {
  const storage = new MemoryStorage();
  storage.values.set(LIFE_GOAL_KEY, JSON.stringify({ lifeGoals }));
  storage.values.set(MONTHLY_OUTCOME_KEY, JSON.stringify("not-an-array"));
  storage.values.set(WEEKLY_FOCUS_KEY, JSON.stringify(42));
  const repository = repositories(storage);

  assert.deepEqual(repository.lifeGoals.load(), []);
  assert.deepEqual(repository.monthlyOutcomes.load(), []);
  assert.deepEqual(repository.weeklyFocuses.load(), []);
});

test("structurally invalid planning records safely fall back", () => {
  const storage = new MemoryStorage();
  storage.values.set(LIFE_GOAL_KEY, JSON.stringify([{ id: "101" }]));
  storage.values.set(MONTHLY_OUTCOME_KEY, JSON.stringify([{ id: 201 }]));
  storage.values.set(WEEKLY_FOCUS_KEY, JSON.stringify([{ week: 6 }]));
  const repository = repositories(storage);

  assert.deepEqual(repository.lifeGoals.load(), []);
  assert.deepEqual(repository.monthlyOutcomes.load(), []);
  assert.deepEqual(repository.weeklyFocuses.load(), []);
});

test("repositories use the three existing storage keys", () => {
  const storage = new MemoryStorage();
  const repository = repositories(storage);
  repository.lifeGoals.load();
  repository.monthlyOutcomes.load();
  repository.weeklyFocuses.load();
  repository.lifeGoals.save(lifeGoals);
  repository.monthlyOutcomes.save(monthlyOutcomes);
  repository.weeklyFocuses.save(datedWeeklyFocuses);

  assert.deepEqual(storage.reads, [
    LIFE_GOAL_KEY,
    MONTHLY_OUTCOME_KEY,
    WEEKLY_FOCUS_KEY,
  ]);
  assert.deepEqual(storage.writes, [
    LIFE_GOAL_KEY,
    MONTHLY_OUTCOME_KEY,
    WEEKLY_FOCUS_KEY,
  ]);
});

test("numeric IDs and hierarchy relationships remain exact", () => {
  const storage = new MemoryStorage();
  const repository = repositories(storage);
  repository.lifeGoals.save(lifeGoals);
  repository.monthlyOutcomes.save(monthlyOutcomes);
  repository.weeklyFocuses.save(datedWeeklyFocuses);

  assert.equal(repository.lifeGoals.load()[0]?.id, 101);
  assert.equal(repository.monthlyOutcomes.load()[0]?.goalId, 101);
  assert.equal(repository.weeklyFocuses.load()[0]?.monthlyTargetId, 201);
});

test("weekly compatibility number and date fields remain unchanged", () => {
  const storage = new MemoryStorage();
  const repository = repositories(storage);
  repository.weeklyFocuses.save(datedWeeklyFocuses);
  const loaded = repository.weeklyFocuses.load()[0];

  assert.equal(loaded?.week, 2);
  assert.equal(loaded?.weekStartDate, "2026-09-07");
  assert.equal(loaded?.weekEndDate, "2026-09-13");
  assert.deepEqual(loaded, datedWeeklyFocuses[0]);
});

test("legacy Weekly Focus without dates remains unchanged", () => {
  const storage = new MemoryStorage();
  storage.values.set(WEEKLY_FOCUS_KEY, JSON.stringify(legacyWeeklyFocuses));
  const loaded = repositories(storage).weeklyFocuses.load();

  assert.deepEqual(loaded, legacyWeeklyFocuses);
  assert.equal(loaded[0]?.weekStartDate, undefined);
  assert.equal(loaded[0]?.weekEndDate, undefined);
  assert.deepEqual(storage.writes, []);
});

test("each repository subscribes only to its own storage key", () => {
  const storage = new MemoryStorage();
  const events = new MemoryStorageEvents();
  const repository = repositories(storage, events);
  const calls = { lifeGoals: 0, monthlyOutcomes: 0, weeklyFocuses: 0 };
  const unsubscribers = [
    repository.lifeGoals.subscribe(() => { calls.lifeGoals += 1; }),
    repository.monthlyOutcomes.subscribe(() => { calls.monthlyOutcomes += 1; }),
    repository.weeklyFocuses.subscribe(() => { calls.weeklyFocuses += 1; }),
  ];

  events.dispatch(LIFE_GOAL_KEY);
  events.dispatch(MONTHLY_OUTCOME_KEY);
  events.dispatch(WEEKLY_FOCUS_KEY);
  events.dispatch("unrelated-key");
  assert.deepEqual(calls, {
    lifeGoals: 1,
    monthlyOutcomes: 1,
    weeklyFocuses: 1,
  });

  for (const unsubscribe of unsubscribers) unsubscribe();
  events.dispatch(LIFE_GOAL_KEY);
  assert.equal(calls.lifeGoals, 1);
});
