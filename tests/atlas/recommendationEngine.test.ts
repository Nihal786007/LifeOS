import assert from "node:assert/strict";
import test from "node:test";

import {
  RecommendationEngine,
} from "../../src/atlas/recommendations/recommendationEngine.ts";

import type {
  AtlasIntelligenceReport,
} from "../../src/atlas/coordinator/types.ts";

const CAPTURED_AT =
  "2026-08-31T12:00:00.000Z";

const BASE_REPORT: AtlasIntelligenceReport = {
  version: "1.0.0",
  snapshotCapturedAt: CAPTURED_AT,
  understanding: {
    date: "2026-08-31",
    tasks: {
      total: 12,
      active: 10,
      completed: 2,
      completedToday: 1,
      overdue: 2,
      dueToday: 1,
      undated: 2,
      highPriorityActive: 3,
    },
    planning: {
      activeGoals: 1,
      completedGoals: 0,
      overdueGoals: 0,
      activeMonthlyTargets: 1,
      activeWeeklyTargets: 1,
      unlinkedMonthlyTargets: 1,
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
      totalEvents: 5,
      eventsToday: 2,
      totalXP: 80,
      xpToday: 20,
    },
  },
  priorities: {
    evaluatedAt: CAPTURED_AT,
    rankedTasks: [
      {
        taskId: 1,
        title: "Finish the intelligence layer",
        rank: 1,
        score: 85,
        tier: "critical",
        reasons: [
          "Marked as high priority.",
          "Due today.",
        ],
        contributions: [
          {
            ruleId: "task-priority",
            points: 30,
            reason: "Marked as high priority.",
          },
          {
            ruleId: "due-today",
            points: 40,
            reason: "Due today.",
          },
        ],
      },
    ],
  },
  risk: {
    evaluatedAt: CAPTURED_AT,
    overallRisk: "high",
    findings: [
      {
        ruleId: "broken-planning-link",
        category: "data-integrity",
        severity: "high",
        title: "Broken planning links",
        reasons: [
          "One planning relationship points to a missing parent.",
        ],
        evidence: [
          {
            metric: "brokenMonthlyToGoalLinks",
            value: 1,
            threshold: 1,
          },
        ],
      },
      {
        ruleId: "active-task-overload",
        category: "capacity",
        severity: "high",
        title: "Active task overload",
        reasons: [
          "Ten tasks are active at the same time.",
        ],
        evidence: [
          {
            metric: "activeTasks",
            value: 10,
            threshold: 10,
          },
        ],
      },
      {
        ruleId: "execution-stall",
        category: "execution-drift",
        severity: "high",
        title: "Execution has stalled",
        reasons: [
          "No task completion is recorded in the last seven days.",
        ],
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
        reasons: ["Two active tasks are overdue."],
        evidence: [
          {
            metric: "overdueActiveTasks",
            value: 2,
            threshold: 1,
          },
        ],
      },
    ],
  },
};

test(
  "ranks one explainable recommendation per risk category before execute-now",
  () => {
    const engine = new RecommendationEngine();
    const before = structuredClone(BASE_REPORT);

    const first = engine.create(BASE_REPORT);
    const second = engine.create(BASE_REPORT);

    assert.deepEqual(second, first);
    assert.deepEqual(BASE_REPORT, before);
    assert.equal(first.version, "1.0.0");
    assert.equal(first.sourceReportVersion, "1.0.0");

    assert.deepEqual(
      first.recommendations.map(
        (recommendation) => ({
          id: recommendation.id,
          rank: recommendation.rank,
          category: recommendation.category,
        })
      ),
      [
        {
          id: "repair-planning:broken-planning-link",
          rank: 1,
          category: "repair-planning",
        },
        {
          id: "reduce-overload:active-task-overload",
          rank: 2,
          category: "reduce-overload",
        },
        {
          id: "mitigate-risk:execution-stall",
          rank: 3,
          category: "mitigate-risk",
        },
        {
          id: "execute-now:task-1",
          rank: 4,
          category: "execute-now",
        },
      ]
    );

    assert.deepEqual(
      first.recommendations[0]?.evidence.map(
        (item) => item.path
      ),
      [
        "risk.findings[ruleId=broken-planning-link].severity",
        "risk.findings[ruleId=broken-planning-link].evidence[metric=brokenMonthlyToGoalLinks]",
      ]
    );

    assert.deepEqual(
      first.recommendations[3]?.evidence.map(
        (item) => item.path
      ),
      [
        "priorities.rankedTasks[0].taskId",
        "priorities.rankedTasks[0].rank",
        "priorities.rankedTasks[0].tier",
        "priorities.rankedTasks[0].score",
      ]
    );
  }
);

test(
  "protects momentum only when multiple positive facts exist without high risk",
  () => {
    const report: AtlasIntelligenceReport = {
      ...BASE_REPORT,
      risk: {
        ...BASE_REPORT.risk,
        overallRisk: "none",
        findings: [],
      },
    };

    const result =
      new RecommendationEngine().create(report);

    assert.deepEqual(
      result.recommendations.map(
        (recommendation) =>
          recommendation.category
      ),
      ["execute-now", "protect-momentum"]
    );

    const momentum = result.recommendations[1];

    assert.equal(
      momentum?.id,
      "protect-momentum:daily-wins"
    );
    assert.deepEqual(
      momentum?.evidence.map((item) => item.path),
      [
        "understanding.tasks.completedToday",
        "understanding.habits.completedToday",
        "understanding.habits.activeStreaks",
        "understanding.execution.xpToday",
      ]
    );
  }
);
