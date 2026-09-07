import assert from "node:assert/strict";
import {
  registerHooks,
} from "node:module";
import test from "node:test";

import type {
  ReviewSourceState,
} from "../../src/reviews/reviewEngine.ts";

registerHooks({
  resolve(
    specifier,
    context,
    nextResolve
  ) {
    if (
      specifier.startsWith(".") &&
      !/\.[a-z]+$/i.test(
        specifier
      )
    ) {
      return nextResolve(
        `${specifier}.ts`,
        context
      );
    }

    return nextResolve(
      specifier,
      context
    );
  },
});

const {
  ReviewEngine,
} = await import(
  "../../src/reviews/reviewEngine.ts"
);

function emptyState(): ReviewSourceState {
  return {
    tasks: [],
    habitState: {
      habits: [],
      completions: [],
    },
    executionRecords: [],
    lifeGoals: [],
    monthlyOutcomes: [],
    weeklyFocuses: [],
  };
}

function populatedState(): ReviewSourceState {
  return {
    tasks: [
      {
        id: 1,
        title: "Finish responsive shell",
        dueDate: "2026-09-09",
        priority: "high",
        completed: true,
        completedAt: "2026-09-09T10:00:00.000",
        createdAt: "2026-09-01T09:00:00.000",
      },
      {
        id: 2,
        title: "Carry older task",
        dueDate: "2026-09-08",
        priority: "medium",
        completed: false,
        createdAt: "2026-09-01T09:00:00.000",
      },
    ],
    habitState: {
      habits: [
        {
          id: 10,
          name: "Read",
          activeDays: [
            "monday",
            "tuesday",
            "wednesday",
            "thursday",
            "friday",
            "saturday",
            "sunday",
          ],
          startDate: "2026-09-01",
          archived: false,
          createdAt: "2026-09-01T08:00:00.000",
          updatedAt: "2026-09-01T08:00:00.000",
        },
      ],
      completions: [
        {
          id: 100,
          habitId: 10,
          date: "2026-09-09",
          completedAt: "2026-09-09T07:00:00.000",
        },
      ],
    },
    executionRecords: [
      {
        id: 1000,
        type: "task_completed",
        entityId: 1,
        title: "Finish responsive shell",
        createdAt: "2026-09-09T10:00:00.000",
        xpAwarded: 25,
      },
      {
        id: 10001,
        type: "habit_completed",
        entityId: 10,
        title: "Read",
        createdAt: "2026-09-09T07:00:00.000",
        xpAwarded: 10,
      },
    ],
    lifeGoals: [
      {
        id: 20,
        title: "Build LifeOS",
        progress: 40,
        completed: false,
        startDate: "2026-01-01",
        targetDate: "2026-12-31",
        createdAt: "2026-01-01T00:00:00.000",
      },
    ],
    monthlyOutcomes: [
      {
        id: 30,
        title: "Ship portfolio release",
        month: 9,
        year: 2026,
        goalId: 20,
        progress: 50,
        completed: false,
        createdAt: "2026-09-01T00:00:00.000",
      },
    ],
    weeklyFocuses: [
      {
        id: 40,
        title: "Finish Reviews V1",
        monthlyTargetId: 30,
        week: 2,
        weekStartDate: "2026-09-07",
        weekEndDate: "2026-09-13",
        progress: 25,
        completed: false,
        createdAt: "2026-09-07T00:00:00.000",
      },
    ],
  };
}

test(
  "daily review remains factual for empty trusted state",
  () => {
    const report =
      ReviewEngine.build(
        emptyState(),
        "daily",
        new Date(2026, 8, 9),
        new Date(2026, 8, 9)
      );

    assert.equal(
      report.version,
      "1.0"
    );
    assert.equal(
      report.range.startDate,
      "2026-09-09"
    );
    assert.equal(
      report.tasks.completed,
      0
    );
    assert.deepEqual(
      report.wentWell,
      []
    );
    assert.deepEqual(
      report.slipped,
      []
    );
    assert.deepEqual(
      report.carryForward,
      []
    );
  }
);

test(
  "daily review composes tasks, overdue work, habits, XP, execution, and planning",
  () => {
    const report =
      ReviewEngine.build(
        populatedState(),
        "daily",
        new Date(2026, 8, 9),
        new Date(2026, 8, 9)
      );

    assert.equal(
      report.tasks.completed,
      1
    );
    assert.equal(
      report.tasks.unfinishedDue,
      1
    );
    assert.equal(
      report.tasks.overdue,
      1
    );
    assert.deepEqual(
      report.habits,
      {
        scheduled: 1,
        completed: 1,
        missed: 0,
        completionRate: 100,
      }
    );
    assert.equal(
      report.xpEarned,
      35
    );
    assert.equal(
      report.executionCount,
      2
    );
    assert.equal(
      report.planning.focus,
      "Finish Reviews V1"
    );
  }
);

test(
  "weekly review uses Monday through Sunday and measures current habits only through today",
  () => {
    const report =
      ReviewEngine.build(
        populatedState(),
        "weekly",
        new Date(2026, 8, 9),
        new Date(2026, 8, 9)
      );

    assert.deepEqual(
      report.range,
      {
        startDate: "2026-09-07",
        endDate: "2026-09-13",
        measuredThroughDate: "2026-09-09",
        label: report.range.label,
      }
    );
    assert.equal(
      report.habits.scheduled,
      3
    );
    assert.equal(
      report.habits.completed,
      1
    );
    assert.equal(
      report.planning.active,
      1
    );
    assert.notEqual(
      report.taskTrend.direction,
      "unavailable"
    );
  }
);

test(
  "past monthly review uses the full calendar month and trusted Monthly Outcomes",
  () => {
    const report =
      ReviewEngine.build(
        populatedState(),
        "monthly",
        new Date(2026, 8, 12),
        new Date(2026, 9, 4)
      );

    assert.equal(
      report.range.startDate,
      "2026-09-01"
    );
    assert.equal(
      report.range.endDate,
      "2026-09-30"
    );
    assert.equal(
      report.range.measuredThroughDate,
      "2026-09-30"
    );
    assert.equal(
      report.planning.label,
      "Monthly Outcomes"
    );
    assert.equal(
      report.planning.active,
      1
    );
    assert.equal(
      report.planning.focus,
      "Ship portfolio release"
    );
  }
);

test(
  "legacy Weekly Focus dates remain explicitly unavailable",
  () => {
    const state =
      emptyState();

    state.weeklyFocuses.push({
      id: 1,
      title: "Legacy focus",
      week: 2,
      progress: 0,
      completed: false,
      createdAt: "2025-01-01T00:00:00.000",
    });

    const report =
      ReviewEngine.build(
        state,
        "weekly",
        new Date(2026, 8, 9),
        new Date(2026, 8, 9)
      );

    assert.equal(
      report.planning.status,
      "unavailable"
    );
    assert.match(
      report.planning.unavailableReason ?? "",
      /no calendar dates/
    );
    assert.equal(
      report.planning.focus,
      undefined
    );
  }
);

test(
  "same inputs are deterministic and remain unchanged",
  () => {
    const state =
      populatedState();

    const before =
      structuredClone(
        state
      );

    const first =
      ReviewEngine.build(
        state,
        "weekly",
        new Date(2026, 8, 9),
        new Date(2026, 8, 9)
      );

    const second =
      ReviewEngine.build(
        state,
        "weekly",
        new Date(2026, 8, 9),
        new Date(2026, 8, 9)
      );

    assert.deepEqual(
      first,
      second
    );
    assert.deepEqual(
      state,
      before
    );
  }
);
