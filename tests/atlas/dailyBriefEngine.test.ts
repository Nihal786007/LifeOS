import assert from "node:assert/strict";
import test from "node:test";

import {
  DailyBriefEngine,
} from "../../src/atlas/dailyBrief/dailyBriefEngine.ts";

import type {
  AtlasIntelligenceReport,
} from "../../src/atlas/coordinator/types.ts";

const REPORT: AtlasIntelligenceReport = {
  version: "1.0.0",
  snapshotCapturedAt:
    "2026-08-31T12:00:00.000Z",
  understanding: {
    date: "2026-08-31",
    tasks: {
      total: 4,
      active: 2,
      completed: 2,
      completedToday: 2,
      overdue: 1,
      dueToday: 1,
      undated: 0,
      highPriorityActive: 1,
    },
    planning: {
      activeGoals: 1,
      completedGoals: 0,
      overdueGoals: 0,
      activeMonthlyTargets: 1,
      activeWeeklyTargets: 1,
      unlinkedMonthlyTargets: 0,
      unlinkedWeeklyTargets: 0,
      unlinkedTasks: 0,
    },
    habits: {
      total: 2,
      active: 2,
      scheduledToday: 2,
      completedToday: 1,
      activeStreaks: 1,
    },
    execution: {
      totalEvents: 8,
      eventsToday: 3,
      totalXP: 100,
      xpToday: 20,
    },
  },
  priorities: {
    evaluatedAt:
      "2026-08-31T12:00:00.000Z",
    rankedTasks: [
      {
        taskId: 1,
        title: "Finish ATLAS brief",
        rank: 1,
        score: 70,
        tier: "high",
        reasons: ["Due today."],
        contributions: [
          {
            ruleId: "due-today",
            points: 40,
            reason: "Due today.",
          },
        ],
      },
      {
        taskId: 2,
        title: "Review architecture",
        rank: 2,
        score: 45,
        tier: "medium",
        reasons: ["Marked as medium priority."],
        contributions: [
          {
            ruleId: "task-priority",
            points: 15,
            reason: "Marked as medium priority.",
          },
        ],
      },
      {
        taskId: 3,
        title: "Organize notes",
        rank: 3,
        score: 15,
        tier: "low",
        reasons: ["Due in 7 day(s)."],
        contributions: [
          {
            ruleId: "due-this-week",
            points: 15,
            reason: "Due in 7 day(s).",
          },
        ],
      },
      {
        taskId: 4,
        title: "Later task",
        rank: 4,
        score: 0,
        tier: "low",
        reasons: [],
        contributions: [],
      },
    ],
  },
  risk: {
    evaluatedAt:
      "2026-08-31T12:00:00.000Z",
    overallRisk: "high",
    findings: [
      {
        ruleId: "execution-stall",
        category: "execution-drift",
        severity: "high",
        title: "Execution has stalled",
        reasons: ["No recent completion."],
        evidence: [
          {
            metric: "taskCompletionsLast7Days",
            value: 0,
            threshold: 1,
          },
        ],
      },
      {
        ruleId: "overdue-task-backlog",
        category: "deadline",
        severity: "moderate",
        title: "Overdue task backlog",
        reasons: ["One task is overdue."],
        evidence: [
          {
            metric: "overdueActiveTasks",
            value: 1,
            threshold: 1,
          },
        ],
      },
      {
        ruleId: "stale-task-backlog",
        category: "execution-drift",
        severity: "moderate",
        title: "Stale task backlog",
        reasons: ["One task is stale."],
        evidence: [
          {
            metric: "activeTasksAtLeast30DaysOld",
            value: 1,
            threshold: 1,
          },
        ],
      },
      {
        ruleId: "planning-alignment-gap",
        category: "planning-drift",
        severity: "moderate",
        title: "Tasks are disconnected from goals",
        reasons: ["No complete planning path."],
        evidence: [
          {
            metric: "fullyAlignedActiveTasks",
            value: 0,
            threshold: 1,
          },
        ],
      },
    ],
  },
};

test(
  "selects a deterministic explainable brief from an intelligence report",
  () => {
    const engine = new DailyBriefEngine();
    const first = engine.create(REPORT);
    const second = engine.create(REPORT);

    assert.deepEqual(second, first);
    assert.equal(first.version, "1.0.0");
    assert.equal(first.sourceReportVersion, "1.0.0");

    assert.deepEqual(first.primaryFocus, {
      kind: "priority",
      taskId: 1,
      title: "Finish ATLAS brief",
      reasons: [
        "Selected from priority rank 1 with high tier.",
        "Due today.",
      ],
    });

    assert.deepEqual(
      first.topPriorities.map((task) => task.taskId),
      [1, 2, 3]
    );
    assert.deepEqual(
      first.keyRisks.map((risk) => risk.ruleId),
      [
        "execution-stall",
        "overdue-task-backlog",
        "stale-task-backlog",
      ]
    );
    assert.deepEqual(
      first.positiveSignals.map(
        (signal) => signal.id
      ),
      [
        "tasks-completed-today",
        "habits-completed-today",
        "active-habit-streaks",
        "xp-earned-today",
      ]
    );
    assert.deepEqual(first.suggestedNextAction, {
      kind: "start-top-priority",
      taskId: 1,
      title: "Start: Finish ATLAS brief",
      reasons: [
        "This is priority rank 1.",
        "Due today.",
      ],
    });

    assert.notStrictEqual(
      first.topPriorities[0],
      REPORT.priorities.rankedTasks[0]
    );
    assert.notStrictEqual(
      first.keyRisks[0],
      REPORT.risk.findings[0]
    );
  }
);

test(
  "uses the stable maintenance fallback when no work or risk exists",
  () => {
    const engine = new DailyBriefEngine();
    const emptyReport: AtlasIntelligenceReport = {
      ...REPORT,
      understanding: {
        ...REPORT.understanding,
        tasks: {
          ...REPORT.understanding.tasks,
          active: 0,
          completedToday: 0,
        },
        habits: {
          ...REPORT.understanding.habits,
          completedToday: 0,
          activeStreaks: 0,
        },
        execution: {
          ...REPORT.understanding.execution,
          xpToday: 0,
        },
      },
      priorities: {
        ...REPORT.priorities,
        rankedTasks: [],
      },
      risk: {
        ...REPORT.risk,
        overallRisk: "none",
        findings: [],
      },
    };

    const brief = engine.create(emptyReport);

    assert.deepEqual(brief.primaryFocus, {
      kind: "maintenance",
      title: "Maintain momentum",
      reasons: [
        "No ranked active task is available.",
        "No risk or drift finding is active.",
      ],
    });
    assert.deepEqual(brief.positiveSignals, [
      {
        id: "no-current-risk",
        title: "No current risk detected",
        reason:
          "No deterministic risk or drift rule was triggered.",
      },
    ]);
    assert.deepEqual(brief.suggestedNextAction, {
      kind: "define-next-priority",
      title: "Define the next priority",
      reasons: [
        "No ranked active task is available.",
        "No active risk requires review.",
      ],
    });
  }
);
