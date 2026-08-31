import assert from "node:assert/strict";
import test from "node:test";

import {
  AtlasIntelligenceCoordinator,
} from "../../src/atlas/coordinator/atlasIntelligenceCoordinator.ts";

import type {
  AtlasCanonicalState,
} from "../../src/atlas/state/types.ts";

process.env.TZ = "UTC";

const FIXED_SNAPSHOT: AtlasCanonicalState = {
  capturedAt: "2026-08-31T12:00:00.000Z",
  tasks: [
    {
      id: 1,
      title: "Finish architecture review",
      priority: "high",
      dueDate: "2026-08-30",
      weeklyTargetId: 301,
      completed: false,
      xp: 20,
      createdAt: "2026-08-01T09:00:00.000Z",
    },
    {
      id: 2,
      title: "Prepare daily plan",
      priority: "medium",
      dueDate: "2026-08-31",
      completed: false,
      xp: 10,
      createdAt: "2026-08-30T09:00:00.000Z",
    },
    {
      id: 3,
      title: "Organize reference notes",
      priority: "low",
      completed: false,
      xp: 5,
      createdAt: "2026-08-30T10:00:00.000Z",
    },
  ],
  habitDefinitions: [
    {
      id: 11,
      name: "Daily reflection",
      activeDays: [
        "monday",
        "tuesday",
        "wednesday",
        "thursday",
        "friday",
        "saturday",
        "sunday",
      ],
      startDate: "2026-08-29",
      archived: false,
      createdAt: "2026-08-29T08:00:00.000Z",
      updatedAt: "2026-08-29T08:00:00.000Z",
    },
  ],
  habitCompletions: [
    {
      id: 1101,
      habitId: 11,
      date: "2026-08-29",
      completedAt: "2026-08-29T18:00:00.000Z",
    },
    {
      id: 1102,
      habitId: 11,
      date: "2026-08-30",
      completedAt: "2026-08-30T18:00:00.000Z",
    },
    {
      id: 1103,
      habitId: 11,
      date: "2026-08-31",
      completedAt: "2026-08-31T08:00:00.000Z",
    },
  ],
  lifeGoals: [
    {
      id: 101,
      title: "Build LifeOS",
      progress: 50,
      completed: false,
      startDate: "2026-01-01T00:00:00.000Z",
      targetDate: "2026-12-31",
      createdAt: "2026-01-01T00:00:00.000Z",
    },
  ],
  monthlyTargets: [
    {
      id: 201,
      title: "Complete ATLAS foundation",
      month: 8,
      year: 2026,
      goalId: 101,
      progress: 50,
      completed: false,
      createdAt: "2026-08-01T00:00:00.000Z",
    },
  ],
  weeklyTargets: [
    {
      id: 301,
      title: "Finish intelligence core",
      monthlyTargetId: 201,
      week: 5,
      progress: 50,
      completed: false,
      createdAt: "2026-08-24T00:00:00.000Z",
    },
  ],
  executionHistory: [
    {
      id: 401,
      type: "task_completed",
      entityId: 99,
      title: "Completed prior task",
      createdAt: "2026-08-30T10:00:00.000Z",
      xpAwarded: 10,
    },
  ],
  captures: [],
  profile: {
    name: "ATLAS Test User",
    occupation: "Engineer",
    timezone: "UTC",
    theme: "dark",
    atlasPersonality: "Professional",
    level: 1,
    xp: 0,
  },
};

test(
  "one fixed snapshot produces a stable composed report",
  () => {
    const coordinator =
      new AtlasIntelligenceCoordinator();

    const first = coordinator.createReport(
      FIXED_SNAPSHOT
    );
    const second = coordinator.createReport(
      FIXED_SNAPSHOT
    );

    assert.deepEqual(second, first);
    assert.equal(first.version, "1.0.0");
    assert.equal(
      first.snapshotCapturedAt,
      FIXED_SNAPSHOT.capturedAt
    );

    assert.deepEqual(first.understanding, {
      date: "2026-08-31",
      tasks: {
        total: 3,
        active: 3,
        completed: 0,
        completedToday: 0,
        overdue: 1,
        dueToday: 1,
        undated: 1,
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
        total: 1,
        active: 1,
        scheduledToday: 1,
        completedToday: 1,
        activeStreaks: 1,
      },
      execution: {
        totalEvents: 1,
        eventsToday: 0,
        totalXP: 10,
        xpToday: 0,
      },
    });

    assert.deepEqual(
      first.priorities.rankedTasks.map(
        (task) => ({
          taskId: task.taskId,
          rank: task.rank,
          score: task.score,
          tier: task.tier,
          ruleIds: task.contributions.map(
            (item) => item.ruleId
          ),
        })
      ),
      [
        {
          taskId: 1,
          rank: 1,
          score: 125,
          tier: "critical",
          ruleIds: [
            "task-priority",
            "overdue",
            "weekly-alignment",
            "monthly-alignment",
            "goal-alignment",
            "stale-task",
          ],
        },
        {
          taskId: 2,
          rank: 2,
          score: 55,
          tier: "high",
          ruleIds: [
            "task-priority",
            "due-today",
          ],
        },
        {
          taskId: 3,
          rank: 3,
          score: 0,
          tier: "low",
          ruleIds: [],
        },
      ]
    );

    assert.equal(
      first.risk.overallRisk,
      "moderate"
    );
    assert.deepEqual(
      first.risk.findings.map(
        (finding) => ({
          ruleId: finding.ruleId,
          severity: finding.severity,
        })
      ),
      [
        {
          ruleId: "overdue-task-backlog",
          severity: "moderate",
        },
        {
          ruleId: "stale-task-backlog",
          severity: "moderate",
        },
      ]
    );
  }
);
