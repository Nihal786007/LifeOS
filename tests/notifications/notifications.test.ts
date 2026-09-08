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
  DEFAULT_NOTIFICATION_PREFERENCES,
  NOTIFICATION_MAX_VISIBLE,
  NotificationEngine,
} = await import("../../src/notifications/notificationEngine.ts");
const {
  NOTIFICATION_MAX_PERSISTED_IDS,
  NOTIFICATION_STORAGE_KEY,
  NotificationStore,
} = await import("../../src/notifications/notificationStore.ts");
const {
  buildAtlasState,
} = await import("../../src/atlas/state/buildAtlasState.ts");
const {
  AtlasIntelligenceCoordinator,
} = await import("../../src/atlas/coordinator/atlasIntelligenceCoordinator.ts");

import type { AtlasProactiveInsightReport } from "../../src/atlas/proactive/types.ts";
import type { AtlasStateInput } from "../../src/atlas/state/types.ts";
import type { NotificationPreferences } from "../../src/notifications/notificationEngine.ts";
import type { NotificationStorage } from "../../src/notifications/notificationStore.ts";

const TODAY = "2026-09-08";

function sourceState(
  overrides: Partial<AtlasStateInput> = {}
): AtlasStateInput {
  return {
    tasks: [],
    habitDefinitions: [],
    habitCompletions: [],
    lifeGoals: [],
    monthlyTargets: [],
    weeklyTargets: [],
    executionHistory: [],
    captures: [],
    profile: {
      name: "Test User",
      occupation: "Engineer",
      timezone: "Asia/Calcutta",
      theme: "dark",
      atlasPersonality: "Professional",
      level: 1,
      xp: 0,
    },
    ...overrides,
  };
}

function proactive(
  insights: AtlasProactiveInsightReport["insights"] = []
): AtlasProactiveInsightReport {
  return {
    version: "1.0.0",
    snapshotCapturedAt: "2026-09-08T08:00:00.000Z",
    insights,
  };
}

function derive(
  source: AtlasStateInput,
  proactiveReport = proactive(),
  preferences: NotificationPreferences = {
    ...DEFAULT_NOTIFICATION_PREFERENCES,
  }
) {
  const state = buildAtlasState(
    source,
    new Date("2026-09-08T08:00:00.000Z")
  );
  const intelligence = new AtlasIntelligenceCoordinator().createReport(state);

  return new NotificationEngine().create({
    state,
    intelligence,
    proactive: proactiveReport,
    localDate: TODAY,
    preferences,
  });
}

test("derives one aggregated overdue-task notification", () => {
  const notifications = derive(
    sourceState({
      tasks: [
        {
          id: 1,
          title: "Late one",
          dueDate: "2026-09-06",
          priority: "high",
          completed: false,
          createdAt: "2026-09-01T08:00:00.000Z",
        },
        {
          id: 2,
          title: "Late two",
          dueDate: "2026-09-07",
          priority: "medium",
          completed: false,
          createdAt: "2026-09-01T08:00:00.000Z",
        },
      ],
    })
  );

  assert.equal(notifications[0]?.id, `task:overdue:${TODAY}`);
  assert.equal(notifications[0]?.title, "2 overdue tasks");
  assert.equal(notifications[0]?.severity, "important");
});

test("derives due-today notification and omits completed tasks", () => {
  const notifications = derive(
    sourceState({
      tasks: [
        {
          id: 1,
          title: "Due",
          dueDate: TODAY,
          priority: "medium",
          completed: false,
          createdAt: "2026-09-01T08:00:00.000Z",
        },
        {
          id: 2,
          title: "Done",
          dueDate: TODAY,
          priority: "high",
          completed: true,
          completedAt: "2026-09-08T07:00:00.000Z",
          createdAt: "2026-09-01T08:00:00.000Z",
        },
      ],
    })
  );

  assert.equal(notifications[0]?.id, `task:due-today:${TODAY}`);
  assert.equal(notifications[0]?.title, "1 task due today");
});

test("derives incomplete scheduled habits and omits a completed day", () => {
  const habit = {
    id: 10,
    name: "Read",
    activeDays: ["tuesday" as const],
    startDate: "2026-09-01",
    archived: false,
    createdAt: "2026-09-01T08:00:00.000Z",
    updatedAt: "2026-09-01T08:00:00.000Z",
  };
  const incomplete = derive(sourceState({ habitDefinitions: [habit] }));
  const complete = derive(
    sourceState({
      habitDefinitions: [habit],
      habitCompletions: [
        {
          id: 11,
          habitId: 10,
          date: TODAY,
          completedAt: "2026-09-08T07:00:00.000Z",
        },
      ],
    })
  );

  assert.equal(incomplete[0]?.id, `habit:incomplete:${TODAY}`);
  assert.equal(incomplete[0]?.title, "1 of 1 scheduled habits remain");
  assert.equal(complete.some((item) => item.category === "habits"), false);
});

test("reuses an existing deterministic planning-risk finding", () => {
  const notifications = derive(
    sourceState({
      lifeGoals: [
        {
          id: 20,
          title: "Past goal",
          progress: 20,
          completed: false,
          startDate: "2026-01-01",
          targetDate: "2026-09-01",
          createdAt: "2026-01-01T08:00:00.000Z",
        },
      ],
    })
  );

  const planning = notifications.find((item) => item.category === "planning");
  assert.equal(planning?.id, `planning:overdue-goal:${TODAY}`);
  assert.equal(planning?.title, "Goal deadline drift");
});

test("surfaces an existing important proactive signal", () => {
  const notifications = derive(
    sourceState(),
    proactive([
      {
        id: "proactive:focus:task-88",
        type: "focus",
        title: "Focus next: Ship review",
        summary: "Existing deterministic priority signal.",
        severity: "important",
        evidence: [
          {
            source: "priorities",
            path: "rankedTasks[0].title",
            explanation: "Current trusted top priority.",
          },
        ],
      },
    ])
  );

  assert.equal(notifications[0]?.category, "atlas");
  assert.equal(
    notifications[0]?.id,
    `atlas:proactive:focus:task-88:${TODAY}`
  );
});

test("derives XP from timestamped positive execution awards", () => {
  const notifications = derive(
    sourceState({
      executionHistory: [
        {
          id: 31,
          type: "task_completed",
          entityId: 4,
          title: "Complete final task",
          createdAt: "2026-09-08T06:00:00.000Z",
          xpAwarded: 25,
        },
      ],
    })
  );

  const xp = notifications.find((item) => item.category === "xp");
  assert.equal(xp?.id, "xp:31");
  assert.equal(xp?.title, "+25 XP earned");
});

test("deduplicates planning risk against the matching proactive risk", () => {
  const notifications = derive(
    sourceState({
      lifeGoals: [
        {
          id: 20,
          title: "Past goal",
          progress: 20,
          completed: false,
          startDate: "2026-01-01",
          targetDate: "2026-09-01",
          createdAt: "2026-01-01T08:00:00.000Z",
        },
      ],
    }),
    proactive([
      {
        id: "proactive:risk:overdue-goal",
        type: "risk",
        title: "Goal deadline drift",
        summary: "Existing risk.",
        severity: "important",
        evidence: [
          {
            source: "risks",
            path: "findings[0].title",
            explanation: "Existing risk title.",
          },
        ],
      },
    ])
  );

  assert.equal(notifications.filter((item) => item.category === "planning").length, 1);
  assert.equal(notifications.filter((item) => item.category === "atlas").length, 0);
});

test("deduplicates task focus against an overdue task condition", () => {
  const notifications = derive(
    sourceState({
      tasks: [
        {
          id: 7,
          title: "Overdue focus",
          dueDate: "2026-09-07",
          priority: "high",
          completed: false,
          createdAt: "2026-09-01T08:00:00.000Z",
        },
      ],
    }),
    proactive([
      {
        id: "proactive:focus:task-7",
        type: "focus",
        title: "Focus next: Overdue focus",
        summary: "Existing priority.",
        severity: "important",
        evidence: [],
      },
    ])
  );

  assert.equal(notifications.filter((item) => item.category === "tasks").length, 1);
  assert.equal(notifications.filter((item) => item.category === "atlas").length, 0);
});

test("caps the visible list at twelve with stable execution ordering", () => {
  const notifications = derive(
    sourceState({
      executionHistory: Array.from({ length: 20 }, (_, index) => ({
        id: index + 1,
        type: "task_completed" as const,
        entityId: index + 1,
        title: `Completed ${index + 1}`,
        createdAt: `2026-09-08T${String(index).padStart(2, "0")}:00:00.000`,
        xpAwarded: 10,
      })),
    })
  );

  assert.equal(notifications.length, NOTIFICATION_MAX_VISIBLE);
  assert.equal(notifications[0]?.id, "xp:20");
});

test("omits disabled categories", () => {
  const notifications = derive(
    sourceState({
      tasks: [
        {
          id: 1,
          title: "Late",
          dueDate: "2026-09-07",
          priority: "high",
          completed: false,
          createdAt: "2026-09-01T08:00:00.000Z",
        },
      ],
    }),
    proactive(),
    { ...DEFAULT_NOTIFICATION_PREFERENCES, tasks: false }
  );

  assert.equal(notifications.some((item) => item.category === "tasks"), false);
});

test("empty canonical state produces a calm empty derived list", () => {
  assert.deepEqual(derive(sourceState()), []);
});

class MemoryStorage implements NotificationStorage {
  readonly values = new Map<string, string>();

  getItem(key: string) {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string) {
    this.values.set(key, value);
  }

  removeItem(key: string) {
    this.values.delete(key);
  }
}

test("persists read and dismissed IDs across store instances", () => {
  const storage = new MemoryStorage();
  const first = new NotificationStore(storage);
  let state = first.load();
  state = first.markRead(state, "task:one");
  first.dismiss(state, "habit:one");

  const reloaded = new NotificationStore(storage).load();
  assert.deepEqual(reloaded.readIds, ["task:one"]);
  assert.deepEqual(reloaded.dismissedIds, ["habit:one"]);
});

test("mark all read persists every supplied current notification ID", () => {
  const storage = new MemoryStorage();
  const store = new NotificationStore(storage);
  const state = store.markAllRead(store.load(), ["one", "two", "three"]);

  assert.deepEqual(state.readIds, ["one", "two", "three"]);
  assert.deepEqual(new NotificationStore(storage).load().readIds, state.readIds);
});

test("category preferences persist and default to enabled", () => {
  const storage = new MemoryStorage();
  const store = new NotificationStore(storage);
  assert.deepEqual(store.load().preferences, DEFAULT_NOTIFICATION_PREFERENCES);

  store.setCategoryEnabled(store.load(), "atlas", false);
  assert.equal(new NotificationStore(storage).load().preferences.atlas, false);
});

test("bounds persisted read and dismissed ID collections", () => {
  const storage = new MemoryStorage();
  const store = new NotificationStore(storage);
  const ids = Array.from(
    { length: NOTIFICATION_MAX_PERSISTED_IDS + 25 },
    (_, index) => `id-${index}`
  );
  let state = store.markAllRead(store.load(), ids);
  for (const id of ids) state = store.dismiss(state, id);

  assert.equal(state.readIds.length, NOTIFICATION_MAX_PERSISTED_IDS);
  assert.equal(state.dismissedIds.length, NOTIFICATION_MAX_PERSISTED_IDS);
  assert.equal(state.readIds[0], "id-25");
  assert.equal(state.dismissedIds[0], "id-25");
});

test("storage contains UI state only and never notification facts", () => {
  const storage = new MemoryStorage();
  const store = new NotificationStore(storage);
  store.markRead(store.load(), "task:overdue:2026-09-08");

  const raw = storage.getItem(NOTIFICATION_STORAGE_KEY) ?? "";
  assert.match(raw, /readIds/);
  assert.doesNotMatch(raw, /title|message|createdAt|evidenceKeys|sourceEntityId/);
});
