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
  LocalStorageHabitRepository,
} = await import(
  "../../src/data/habits/localStorageHabitRepository.ts"
);

import type {
  HabitStorage,
  HabitStorageEventTarget,
} from "../../src/data/habits/localStorageHabitRepository.ts";
import type {
  HabitState,
} from "../../src/shared/habits.ts";

const HABIT_STATE_KEY = "lifeos-habit-state-v2";

const habitState = {
  habits: [{
    id: 101,
    name: "Deep work",
    description: "Protect focused time",
    activeDays: ["monday", "wednesday", "friday"],
    startDate: "2026-09-01",
    archived: true,
    archivedAt: "2026-09-07T18:00:00.000Z",
    createdAt: "2026-09-01T08:00:00.000Z",
    updatedAt: "2026-09-07T18:00:00.000Z",
    sourceLabel: "preserve-me",
  }],
  completions: [{
    id: 201,
    habitId: 101,
    date: "2026-09-05",
    completedAt: "2026-09-05T20:30:00.000Z",
    importedBy: "existing-data",
  }],
} as unknown as HabitState;

class MemoryStorage implements HabitStorage {
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

class MemoryStorageEvents implements HabitStorageEventTarget {
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

test("missing storage loads an empty canonical state without writing", () => {
  const storage = new MemoryStorage();
  const repository = new LocalStorageHabitRepository(storage);

  assert.deepEqual(repository.load(), { habits: [], completions: [] });
  assert.deepEqual(storage.writes, []);
});

test("valid definitions and completions load unchanged", () => {
  const storage = new MemoryStorage();
  storage.values.set(HABIT_STATE_KEY, JSON.stringify(habitState));

  assert.deepEqual(new LocalStorageHabitRepository(storage).load(), habitState);
});

test("save and load round-trips the exact canonical envelope", () => {
  const storage = new MemoryStorage();
  const repository = new LocalStorageHabitRepository(storage);

  repository.save(habitState);

  assert.deepEqual(repository.load(), habitState);
  assert.deepEqual(JSON.parse(storage.values.get(HABIT_STATE_KEY) ?? "null"), habitState);
});

test("malformed JSON safely falls back without rewriting stored data", () => {
  const storage = new MemoryStorage();
  storage.values.set(HABIT_STATE_KEY, "{bad-habit-state");

  assert.deepEqual(
    new LocalStorageHabitRepository(storage).load(),
    { habits: [], completions: [] }
  );
  assert.deepEqual(storage.writes, []);
  assert.equal(storage.values.get(HABIT_STATE_KEY), "{bad-habit-state");
});

test("invalid top-level envelopes fall back atomically without writing", () => {
  for (const value of [[], null, "invalid", { habits: [] }]) {
    const storage = new MemoryStorage();
    storage.values.set(HABIT_STATE_KEY, JSON.stringify(value));

    assert.deepEqual(
      new LocalStorageHabitRepository(storage).load(),
      { habits: [], completions: [] }
    );
    assert.deepEqual(storage.writes, []);
  }
});

test("invalid habit definitions make the complete envelope fall back safely", () => {
  const storage = new MemoryStorage();
  storage.values.set(HABIT_STATE_KEY, JSON.stringify({
    habits: [{ ...habitState.habits[0], activeDays: ["nonday"] }],
    completions: habitState.completions,
  }));

  assert.deepEqual(
    new LocalStorageHabitRepository(storage).load(),
    { habits: [], completions: [] }
  );
});

test("invalid completions make the complete envelope fall back safely", () => {
  const storage = new MemoryStorage();
  storage.values.set(HABIT_STATE_KEY, JSON.stringify({
    habits: habitState.habits,
    completions: [{ ...habitState.completions[0], habitId: "101" }],
  }));

  assert.deepEqual(
    new LocalStorageHabitRepository(storage).load(),
    { habits: [], completions: [] }
  );
});

test("repository uses only the existing Habits 2.0 storage key", () => {
  const storage = new MemoryStorage();
  const repository = new LocalStorageHabitRepository(storage);

  repository.load();
  repository.save(habitState);

  assert.deepEqual(storage.reads, [HABIT_STATE_KEY]);
  assert.deepEqual(storage.writes, [HABIT_STATE_KEY]);
});

test("definition identity, schedule, lifecycle, and timestamps remain exact", () => {
  const storage = new MemoryStorage();
  storage.values.set(HABIT_STATE_KEY, JSON.stringify(habitState));
  const loaded = new LocalStorageHabitRepository(storage).load();

  assert.equal(loaded.habits[0]?.id, 101);
  assert.deepEqual(loaded.habits[0]?.activeDays, ["monday", "wednesday", "friday"]);
  assert.equal(loaded.habits[0]?.startDate, "2026-09-01");
  assert.equal(loaded.habits[0]?.archived, true);
  assert.equal(loaded.habits[0]?.archivedAt, "2026-09-07T18:00:00.000Z");
  assert.equal(loaded.habits[0]?.createdAt, "2026-09-01T08:00:00.000Z");
  assert.equal(loaded.habits[0]?.updatedAt, "2026-09-07T18:00:00.000Z");
  assert.deepEqual(loaded.habits[0], habitState.habits[0]);
});

test("completion relationship, local date, and timestamp remain exact", () => {
  const storage = new MemoryStorage();
  storage.values.set(HABIT_STATE_KEY, JSON.stringify(habitState));
  const completion = new LocalStorageHabitRepository(storage).load().completions[0];

  assert.equal(completion?.id, 201);
  assert.equal(completion?.habitId, 101);
  assert.equal(completion?.date, "2026-09-05");
  assert.equal(completion?.completedAt, "2026-09-05T20:30:00.000Z");
  assert.deepEqual(completion, habitState.completions[0]);
});

test("unknown fields are preserved and derived habit values are never introduced", () => {
  const storage = new MemoryStorage();
  const repository = new LocalStorageHabitRepository(storage);
  repository.save(habitState);
  const loaded = repository.load() as HabitState & {
    habits: Array<HabitState["habits"][number] & { sourceLabel?: string }>;
    completions: Array<HabitState["completions"][number] & { importedBy?: string }>;
  };

  assert.equal(loaded.habits[0]?.sourceLabel, "preserve-me");
  assert.equal(loaded.completions[0]?.importedBy, "existing-data");
  for (const key of [
    "streak",
    "longestStreak",
    "completionPercentage",
    "scheduledToday",
    "completedToday",
    "missedDays",
    "analytics",
  ]) {
    assert.equal(key in (loaded.habits[0] ?? {}), false);
    assert.equal(key in loaded, false);
  }
});

test("subscription reacts only to the habit key and can be removed", () => {
  const storage = new MemoryStorage();
  const events = new MemoryStorageEvents();
  const repository = new LocalStorageHabitRepository(storage, events);
  let calls = 0;
  const unsubscribe = repository.subscribe(() => { calls += 1; });

  events.dispatch("lifeos-tasks");
  events.dispatch(HABIT_STATE_KEY);
  assert.equal(calls, 1);

  unsubscribe();
  events.dispatch(HABIT_STATE_KEY);
  assert.equal(calls, 1);
});
