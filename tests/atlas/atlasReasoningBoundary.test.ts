import assert from "node:assert/strict";
import test from "node:test";

import {
  buildAtlasReasoningContext,
} from "../../src/atlas/reasoning/buildAtlasReasoningContext.ts";

import {
  createAtlasAIRequest,
} from "../../src/atlas/reasoning/atlasAIProvider.ts";

import type {
  AtlasReasoningContextInput,
} from "../../src/atlas/reasoning/types.ts";

const CAPTURED_AT =
  "2026-09-01T06:30:00.000Z";

const INPUT: AtlasReasoningContextInput = {
  intelligenceReport: {
    version: "1.0.0",
    snapshotCapturedAt: CAPTURED_AT,
    understanding: {
      date: "2026-09-01",
      tasks: {
        total: 3,
        active: 2,
        completed: 1,
        completedToday: 1,
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
        total: 1,
        active: 1,
        scheduledToday: 1,
        completedToday: 1,
        activeStreaks: 1,
      },
      execution: {
        totalEvents: 6,
        eventsToday: 2,
        totalXP: 60,
        xpToday: 20,
      },
    },
    priorities: {
      evaluatedAt: CAPTURED_AT,
      rankedTasks: [
        {
          taskId: 1,
          title: "Complete reasoning boundary",
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
      ],
    },
    risk: {
      evaluatedAt: CAPTURED_AT,
      overallRisk: "moderate",
      findings: [
        {
          ruleId: "overdue-task-backlog",
          category: "deadline",
          severity: "moderate",
          title: "Overdue task backlog",
          reasons: ["One active task is overdue."],
          evidence: [
            {
              metric: "overdueActiveTasks",
              value: 1,
              threshold: 1,
            },
          ],
        },
      ],
    },
  },
  dailyBrief: {
    version: "1.0.0",
    sourceReportVersion: "1.0.0",
    snapshotCapturedAt: CAPTURED_AT,
    primaryFocus: {
      kind: "priority",
      taskId: 1,
      title: "Complete reasoning boundary",
      reasons: [
        "Selected from priority rank 1 with high tier.",
        "Due today.",
      ],
    },
    topPriorities: [],
    keyRisks: [],
    positiveSignals: [
      {
        id: "tasks-completed-today",
        title: "Tasks completed today",
        reason: "1 task(s) completed today.",
      },
    ],
    suggestedNextAction: {
      kind: "start-top-priority",
      taskId: 1,
      title: "Start: Complete reasoning boundary",
      reasons: ["This is priority rank 1."],
    },
  },
  recommendationReport: {
    version: "1.0.0",
    sourceReportVersion: "1.0.0",
    snapshotCapturedAt: CAPTURED_AT,
    recommendations: [
      {
        id: "execute-now:task-1",
        rank: 1,
        category: "execute-now",
        title: "Execute now: Complete reasoning boundary",
        suggestedAction:
          "Begin the current rank-1 task.",
        reason:
          "This task is already ranked 1 in the high tier.",
        evidence: [
          {
            source: "priority",
            path: "priorities.rankedTasks[0].rank",
            value: 1,
            description:
              "Rank assigned by the Priority Engine.",
          },
        ],
      },
    ],
  },
  patternReport: {
    version: "1.0.0",
    sourceReportVersion: "1.0.0",
    snapshotCapturedAt: CAPTURED_AT,
    coverage: [
      {
        source: "execution-history",
        recordCount: 20,
        firstRecordedDate: "2026-08-01",
        lastRecordedDate: "2026-09-01",
      },
    ],
    patterns: [
      {
        id: "execution-consistency-trend:7-day",
        kind: "execution-consistency-trend",
        direction: "improving",
        title: "Task execution is improving",
        summary:
          "Five task completions were recorded versus three previously.",
        timeWindow: {
          observed: {
            label: "Current 7 days",
            startDate: "2026-08-26",
            endDate: "2026-09-01",
          },
          baseline: {
            label: "Previous 7 days",
            startDate: "2026-08-19",
            endDate: "2026-08-25",
          },
        },
        measurements: [
          {
            name: "currentTaskCompletions",
            value: 5,
            unit: "events",
          },
        ],
        comparison: {
          kind: "previous-period",
          baselineLabel:
            "Previous equal-length period",
          observedValue: 5,
          baselineValue: 3,
          difference: 2,
          unit: "events",
          interpretation:
            "The current period contains two more events.",
        },
        evidence: [
          {
            source: "execution-history",
            reference:
              'state.executionHistory[type="task_completed"]',
            recordIds: [1, 2, 3, 4, 5],
            description:
              "Canonical task-completion events.",
          },
        ],
      },
    ],
    limitations: [
      {
        id: "recurring-risk-history-unavailable",
        source: "current-intelligence-report",
        reason:
          "Historical risk reports are not retained.",
      },
      {
        id: "planning-alignment-history-unavailable",
        source: "current-intelligence-report",
        reason:
          "Historical planning snapshots are not retained.",
      },
    ],
  },
  profile: {
    name: "Nihal",
    occupation: "Engineer",
    timezone: "Asia/Kolkata",
    theme: "dark",
    atlasPersonality: "Professional",
    level: 8,
    xp: 900,
  },
};

test(
  "same trusted inputs produce the same isolated reasoning context",
  () => {
    const before = structuredClone(INPUT);
    const first = buildAtlasReasoningContext(INPUT);
    const second = buildAtlasReasoningContext(INPUT);

    assert.deepEqual(second, first);
    assert.deepEqual(INPUT, before);
    assert.equal(first.version, "1.0.0");
    assert.equal(first.snapshotCapturedAt, CAPTURED_AT);

    assert.deepEqual(first.profile, {
      name: "Nihal",
      occupation: "Engineer",
      timezone: "Asia/Kolkata",
      atlasPersonality: "Professional",
    });
    assert.equal(
      "theme" in first.profile,
      false
    );
    assert.equal("xp" in first.profile, false);
    assert.equal("level" in first.profile, false);

    assert.notStrictEqual(
      first.factualState,
      INPUT.intelligenceReport.understanding
    );
    assert.notStrictEqual(
      first.dailyBrief,
      INPUT.dailyBrief
    );
    assert.notStrictEqual(
      first.historicalPatterns,
      INPUT.patternReport.patterns
    );

    assert.deepEqual(
      first.limitations.map(
        (limitation) => ({
          id: limitation.id,
          origin: limitation.origin,
          reason: limitation.reason,
        })
      ),
      [
        {
          id: "recurring-risk-history-unavailable",
          origin: "pattern-intelligence",
          reason:
            "Historical risk reports are not retained.",
        },
        {
          id: "planning-alignment-history-unavailable",
          origin: "pattern-intelligence",
          reason:
            "Historical planning snapshots are not retained.",
        },
      ]
    );
  }
);

test(
  "provider requests expose grounded data and explicit non-mutation constraints only",
  () => {
    const context = buildAtlasReasoningContext(INPUT);
    const requestInput = {
      requestId: "request-001",
      purpose: "grounded-answer" as const,
      prompt: "What should I focus on and why?",
      memory: [
        {
          id: "memory-1",
          type: "preference" as const,
          topic: "SAT study time",
          content:
            "I prefer studying SAT in the morning.",
          source:
            "explicit_user_statement" as const,
          createdAt:
            "2026-09-04T12:00:00.000Z",
          updatedAt:
            "2026-09-04T12:00:00.000Z",
          status: "active" as const,
        },
      ],
      context,
    };
    const before = structuredClone(requestInput);

    const first = createAtlasAIRequest(requestInput);
    const second = createAtlasAIRequest(requestInput);

    assert.deepEqual(second, first);
    assert.deepEqual(requestInput, before);
    assert.deepEqual(Object.keys(first), [
      "version",
      "requestId",
      "purpose",
      "prompt",
      "memory",
      "conversation",
      "context",
      "constraints",
    ]);
    assert.deepEqual(first.memory, requestInput.memory);
    assert.notStrictEqual(first.memory, requestInput.memory);
    assert.deepEqual(first.conversation, []);
    assert.notStrictEqual(first.context, context);
    assert.equal(
      "memory" in first.context,
      false
    );
    assert.equal(
      JSON.stringify(first.context).includes(
        requestInput.memory[0].content
      ),
      false
    );
    assert.equal(
      "memory" in first.constraints,
      false
    );
    assert.deepEqual(first.constraints, {
      groundedInContextOnly: true,
      requireEvidenceReferences: true,
      allowLifeOSMutation: false,
      allowActions: false,
      allowTools: false,
      allowExternalRetrieval: false,
      allowPrediction: false,
      allowSimulation: false,
    });

    const serialized = JSON.stringify(first);

    [
      "mutationHandler",
      "dispatch",
      "setState",
      "service",
      "apiKey",
      "credentials",
      "toolDefinitions",
      "actionExecutor",
    ].forEach((forbiddenCapability) => {
      assert.equal(
        serialized.includes(forbiddenCapability),
        false
      );
    });
  }
);

test(
  "source coherence problems are added without losing historical limitations",
  () => {
    const context = buildAtlasReasoningContext({
      ...INPUT,
      dailyBrief: {
        ...INPUT.dailyBrief,
        sourceReportVersion: "0.9.0",
        snapshotCapturedAt:
          "2026-08-31T06:30:00.000Z",
      },
    });

    assert.deepEqual(
      context.limitations.map(
        (limitation) => limitation.id
      ),
      [
        "recurring-risk-history-unavailable",
        "planning-alignment-history-unavailable",
        "source-snapshot-mismatch",
        "source-version-mismatch",
      ]
    );
  }
);
