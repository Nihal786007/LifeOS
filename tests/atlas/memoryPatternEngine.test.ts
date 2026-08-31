import assert from "node:assert/strict";
import test from "node:test";

import {
  MemoryPatternEngine,
} from "../../src/atlas/memoryPatterns/memoryPatternEngine.ts";

import type {
  AtlasIntelligenceReport,
} from "../../src/atlas/coordinator/types.ts";

import type {
  AtlasCanonicalState,
} from "../../src/atlas/state/types.ts";

import type {
  ExecutionRecord,
  ExecutionType,
} from "../../src/shared/execution.ts";

process.env.TZ = "UTC";

const CAPTURED_AT =
  "2026-08-31T12:00:00.000Z";

function executionRecord(
  id: number,
  type: ExecutionType,
  date: string
): ExecutionRecord {
  return {
    id,
    type,
    entityId: id,
    title: `${type} ${id}`,
    createdAt: `${date}T12:00:00.000Z`,
    xpAwarded:
      type === "task_completed" ? 10 : 0,
  };
}

const BASELINE_HABIT_DATES = [
  "2026-08-18",
  "2026-08-19",
  "2026-08-20",
  "2026-08-21",
  "2026-08-22",
  "2026-08-23",
];

const CURRENT_HABIT_DATES = [
  "2026-08-25",
  "2026-08-26",
  "2026-08-27",
  "2026-08-28",
  "2026-08-29",
  "2026-08-30",
  "2026-08-31",
];

const STATE: AtlasCanonicalState = {
  capturedAt: CAPTURED_AT,
  tasks: [
    {
      id: 1,
      title: "Late task one",
      priority: "medium",
      dueDate: "2026-08-10",
      completed: true,
      completedAt: "2026-08-12T12:00:00.000Z",
      xp: 10,
      createdAt: "2026-08-01T12:00:00.000Z",
    },
    {
      id: 2,
      title: "Late task two",
      priority: "medium",
      dueDate: "2026-08-15",
      completed: true,
      completedAt: "2026-08-16T12:00:00.000Z",
      xp: 10,
      createdAt: "2026-08-02T12:00:00.000Z",
    },
    {
      id: 3,
      title: "Still overdue",
      priority: "high",
      dueDate: "2026-08-20",
      completed: false,
      xp: 20,
      createdAt: "2026-08-03T12:00:00.000Z",
    },
    {
      id: 4,
      title: "Completed on time",
      priority: "low",
      dueDate: "2026-08-25",
      completed: true,
      completedAt: "2026-08-25T12:00:00.000Z",
      xp: 5,
      createdAt: "2026-08-04T12:00:00.000Z",
    },
  ],
  habitDefinitions: [
    {
      id: 50,
      name: "Daily review",
      activeDays: [
        "monday",
        "tuesday",
        "wednesday",
        "thursday",
        "friday",
        "saturday",
        "sunday",
      ],
      startDate: "2026-08-01",
      archived: false,
      createdAt: "2026-08-01T08:00:00.000Z",
      updatedAt: "2026-08-01T08:00:00.000Z",
    },
  ],
  habitCompletions: [
    ...BASELINE_HABIT_DATES,
    ...CURRENT_HABIT_DATES,
  ].map((date, index) => ({
    id: 5000 + index,
    habitId: 50,
    date,
    completedAt: `${date}T18:00:00.000Z`,
  })),
  lifeGoals: [],
  monthlyTargets: [],
  weeklyTargets: [],
  executionHistory: [
    executionRecord(100, "system", "2026-07-01"),
    executionRecord(
      101,
      "weekly_uncompleted",
      "2026-07-15"
    ),
    executionRecord(
      102,
      "weekly_uncompleted",
      "2026-08-05"
    ),
    executionRecord(
      103,
      "monthly_deleted",
      "2026-08-10"
    ),
    executionRecord(
      104,
      "life_goal_uncompleted",
      "2026-08-20"
    ),
    executionRecord(201, "task_completed", "2026-08-18"),
    executionRecord(202, "task_completed", "2026-08-20"),
    executionRecord(203, "task_completed", "2026-08-24"),
    executionRecord(204, "task_completed", "2026-08-25"),
    executionRecord(205, "task_completed", "2026-08-26"),
    executionRecord(206, "task_completed", "2026-08-27"),
    executionRecord(207, "task_completed", "2026-08-29"),
    executionRecord(208, "task_completed", "2026-08-31"),
  ],
  captures: [],
  profile: {
    name: "Pattern Test User",
    occupation: "Engineer",
    timezone: "UTC",
    theme: "dark",
    atlasPersonality: "Professional",
    level: 1,
    xp: 0,
  },
};

const REPORT: AtlasIntelligenceReport = {
  version: "1.0.0",
  snapshotCapturedAt: CAPTURED_AT,
  understanding: {
    date: "2026-08-31",
    tasks: {
      total: 4,
      active: 1,
      completed: 3,
      completedToday: 0,
      overdue: 1,
      dueToday: 0,
      undated: 0,
      highPriorityActive: 1,
    },
    planning: {
      activeGoals: 0,
      completedGoals: 0,
      overdueGoals: 0,
      activeMonthlyTargets: 0,
      activeWeeklyTargets: 0,
      unlinkedMonthlyTargets: 0,
      unlinkedWeeklyTargets: 0,
      unlinkedTasks: 0,
    },
    habits: {
      total: 1,
      active: 1,
      scheduledToday: 1,
      completedToday: 1,
      activeStreaks: 1,
    },
    execution: {
      totalEvents: 13,
      eventsToday: 1,
      totalXP: 80,
      xpToday: 10,
    },
  },
  priorities: {
    evaluatedAt: CAPTURED_AT,
    rankedTasks: [],
  },
  risk: {
    evaluatedAt: CAPTURED_AT,
    overallRisk: "moderate",
    findings: [
      {
        ruleId: "planning-alignment-gap",
        category: "planning-drift",
        severity: "moderate",
        title: "Tasks are disconnected from goals",
        reasons: ["Current planning path is incomplete."],
        evidence: [],
      },
    ],
  },
};

test(
  "extracts only supported deterministic patterns with explicit evidence",
  () => {
    const engine = new MemoryPatternEngine();
    const input = {
      state: STATE,
      report: REPORT,
    };
    const before = structuredClone(input);

    const first = engine.analyze(input);
    const second = engine.analyze(input);

    assert.deepEqual(second, first);
    assert.deepEqual(input, before);
    assert.equal(first.version, "1.0.0");
    assert.equal(first.sourceReportVersion, "1.0.0");

    assert.deepEqual(
      first.patterns.map((pattern) => ({
        kind: pattern.kind,
        direction: pattern.direction,
      })),
      [
        {
          kind: "recurring-overdue-behavior",
          direction: "recurring",
        },
        {
          kind: "execution-consistency-trend",
          direction: "improving",
        },
        {
          kind: "habit-consistency-trend",
          direction: "stable",
        },
        {
          kind: "repeated-planning-revisions",
          direction: "recurring",
        },
        {
          kind: "sustained-positive-momentum",
          direction: "sustained",
        },
      ]
    );

    assert.deepEqual(
      first.patterns[0]?.comparison,
      {
        kind: "threshold",
        baselineLabel: "Pattern threshold",
        observedValue: 75,
        baselineValue: 50,
        difference: 25,
        unit: "percent",
        interpretation:
          "The observed late-outcome rate meets or exceeds the 50% recurrence threshold.",
      }
    );

    assert.deepEqual(
      first.patterns[1]?.timeWindow,
      {
        observed: {
          label: "Current 7 days",
          startDate: "2026-08-25",
          endDate: "2026-08-31",
        },
        baseline: {
          label: "Previous 7 days",
          startDate: "2026-08-18",
          endDate: "2026-08-24",
        },
      }
    );

    assert.deepEqual(
      first.patterns[1]?.comparison,
      {
        kind: "previous-period",
        baselineLabel: "Previous equal-length period",
        observedValue: 5,
        baselineValue: 3,
        difference: 2,
        unit: "events",
        interpretation:
          "The current period contains 2 more task-completion event(s).",
      }
    );

    assert.deepEqual(
      first.patterns[2]?.comparison,
      {
        kind: "previous-period",
        baselineLabel: "Previous equal-length period",
        observedValue: 100,
        baselineValue: 86,
        difference: 14,
        unit: "percent",
        interpretation:
          "Habit completion changed by 14 percentage point(s).",
      }
    );

    assert.deepEqual(
      first.patterns[3]?.comparison,
      {
        kind: "previous-period",
        baselineLabel: "Previous equal-length period",
        observedValue: 3,
        baselineValue: 1,
        difference: 2,
        unit: "events",
        interpretation:
          "The current period contains at least three planning revisions and exceeds the previous period.",
      }
    );

    first.patterns.forEach((pattern) => {
      assert.ok(pattern.measurements.length > 0);
      assert.ok(pattern.evidence.length > 0);
      pattern.evidence.forEach((evidence) => {
        assert.ok(evidence.reference.length > 0);
        assert.ok(evidence.recordIds.length > 0);
      });
    });

    assert.deepEqual(
      first.limitations.map(
        (limitation) => limitation.id
      ),
      [
        "recurring-risk-history-unavailable",
        "planning-alignment-history-unavailable",
      ]
    );
  }
);

test(
  "refuses combined analysis when state and report snapshots differ",
  () => {
    const mismatchedReport: AtlasIntelligenceReport = {
      ...REPORT,
      snapshotCapturedAt:
        "2026-08-30T12:00:00.000Z",
    };

    const result = new MemoryPatternEngine().analyze({
      state: STATE,
      report: mismatchedReport,
    });

    assert.deepEqual(result.patterns, []);
    assert.equal(
      result.limitations[0]?.id,
      "snapshot-mismatch"
    );
  }
);
