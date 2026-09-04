import assert from "node:assert/strict";
import test from "node:test";

import {
  ProactiveInsightEngine,
} from "../../src/atlas/proactive/proactiveInsightEngine.ts";
import {
  ATLAS_PROACTIVE_MAX_INSIGHTS,
} from "../../src/atlas/proactive/types.ts";
import {
  validateAtlasAICitation,
} from "../../src/atlas/providerConformance/validation.ts";
import type {
  AtlasReasoningContext,
} from "../../src/atlas/reasoning/types.ts";

const CAPTURED_AT = "2026-09-05T08:00:00.000Z";

function createContext(): AtlasReasoningContext {
  return {
    version: "1.0.0",
    snapshotCapturedAt: CAPTURED_AT,
    sourceVersions: {
      intelligenceReport: "1.0.0",
      dailyBrief: "1.0.0",
      recommendationReport: "1.0.0",
      patternReport: "1.0.0",
    },
    profile: {
      name: "Nihal",
      occupation: "Engineer",
      timezone: "Asia/Kolkata",
      atlasPersonality: "Professional",
    },
    factualState: {
      date: "2026-09-05",
      tasks: {
        total: 0,
        active: 0,
        completed: 0,
        completedToday: 0,
        overdue: 0,
        dueToday: 0,
        undated: 0,
        highPriorityActive: 0,
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
        total: 0,
        active: 0,
        scheduledToday: 0,
        completedToday: 0,
        activeStreaks: 0,
      },
      execution: {
        totalEvents: 0,
        eventsToday: 0,
        totalXP: 0,
        xpToday: 0,
      },
    },
    priorities: {
      evaluatedAt: CAPTURED_AT,
      rankedTasks: [],
    },
    risks: {
      evaluatedAt: CAPTURED_AT,
      overallRisk: "none",
      findings: [],
    },
    dailyBrief: {
      version: "1.0.0",
      sourceReportVersion: "1.0.0",
      snapshotCapturedAt: CAPTURED_AT,
      primaryFocus: {
        kind: "maintenance",
        title: "Maintain momentum",
        reasons: ["No risk or priority is active."],
      },
      topPriorities: [],
      keyRisks: [],
      positiveSignals: [],
      suggestedNextAction: {
        kind: "define-next-priority",
        title: "Define the next priority",
        reasons: ["No ranked active task is available."],
      },
    },
    recommendations: [],
    historyCoverage: [],
    historicalPatterns: [],
    limitations: [],
  };
}

function addRisk(context: AtlasReasoningContext): void {
  context.risks.overallRisk = "high";
  context.risks.findings = [{
    ruleId: "overdue-task-backlog",
    category: "deadline",
    severity: "high",
    title: "Overdue task backlog",
    reasons: ["3 active tasks are overdue."],
    evidence: [{ metric: "overdueTasks", value: 3, threshold: 2 }],
  }];
  context.dailyBrief.keyRisks = context.risks.findings;
}

function addPriority(context: AtlasReasoningContext): void {
  context.priorities.rankedTasks = [{
    taskId: 7,
    title: "Submit architecture review",
    rank: 1,
    score: 90,
    tier: "critical",
    reasons: ["This task is overdue."],
    contributions: [{
      ruleId: "overdue",
      points: 50,
      reason: "The due date has passed.",
    }],
  }];
  context.dailyBrief.topPriorities = context.priorities.rankedTasks;
  context.dailyBrief.suggestedNextAction = {
    kind: "start-top-priority",
    taskId: 7,
    title: "Start: Submit architecture review",
    reasons: ["This is priority rank 1."],
  };
}

function addProgress(context: AtlasReasoningContext): void {
  context.dailyBrief.positiveSignals = [{
    id: "tasks-completed-today",
    title: "Tasks completed today",
    reason: "4 task(s) completed today.",
  }];
}

function addHabit(context: AtlasReasoningContext): void {
  context.dailyBrief.positiveSignals = [
    ...context.dailyBrief.positiveSignals,
    {
      id: "habits-completed-today",
      title: "Habits completed today",
      reason: "3 habit(s) completed today.",
    },
  ];
}

function addPlanningPattern(context: AtlasReasoningContext): void {
  context.historicalPatterns = [{
    id: "planning-revisions:weekly",
    kind: "repeated-planning-revisions",
    direction: "recurring",
    title: "Weekly plans are repeatedly revised",
    summary: "3 planning revisions occurred in the observed window.",
    timeWindow: {
      observed: {
        label: "Observed week",
        startDate: "2026-08-29",
        endDate: "2026-09-05",
      },
    },
    measurements: [{ name: "revisions", value: 3, unit: "changes" }],
    comparison: {
      kind: "threshold",
      baselineLabel: "Repeated revision threshold",
      observedValue: 3,
      baselineValue: 2,
      difference: 1,
      unit: "changes",
      interpretation: "Revision activity crossed the threshold.",
    },
    evidence: [{
      source: "task-records",
      reference: "weekly-plan-revisions",
      recordIds: [1, 2, 3],
      description: "Recorded weekly planning revisions.",
    }],
  }];
}

test("surfaces the first important current risk without fabricating risk when absent", () => {
  const risky = createContext();
  addRisk(risky);
  const riskyReport = new ProactiveInsightEngine().create(risky);

  assert.equal(riskyReport.insights[0]?.type, "risk");
  assert.equal(riskyReport.insights[0]?.severity, "important");
  assert.equal(riskyReport.insights[0]?.title, "Overdue task backlog");

  const safe = createContext();
  safe.dailyBrief.positiveSignals = [{
    id: "no-current-risk",
    title: "No current risk detected",
    reason: "No deterministic risk rule was triggered.",
  }];
  assert.equal(
    new ProactiveInsightEngine().create(safe).insights.some(
      (insight) => insight.type === "risk"
    ),
    false
  );
});

test("uses a ranked priority before any Daily Brief fallback and never duplicates it", () => {
  const context = createContext();
  addPriority(context);
  const report = new ProactiveInsightEngine().create(context);

  assert.equal(report.insights[0]?.type, "focus");
  assert.equal(report.insights[0]?.severity, "important");
  assert.equal(
    report.insights.filter((insight) => insight.type === "focus").length,
    1
  );
  assert.ok(
    report.insights[0]?.evidence.every(
      (item) => item.source === "priorities"
    )
  );
});

test("uses define-next-priority only when the existing Daily Brief action supports it", () => {
  const supported = createContext();
  assert.equal(
    new ProactiveInsightEngine().create(supported).insights[0]?.id,
    "proactive:focus:define-next-priority"
  );

  const unsupported = createContext();
  unsupported.dailyBrief.suggestedNextAction = {
    kind: "review-key-risk",
    riskRuleId: "overdue-goal",
    title: "Review a risk",
    reasons: ["Synthetic unsupported action."],
  };
  assert.deepEqual(
    new ProactiveInsightEngine().create(unsupported).insights,
    []
  );
});

test("surfaces supported execution, habit, and planning signals", () => {
  const context = createContext();
  context.dailyBrief.suggestedNextAction = {
    kind: "review-key-risk",
    riskRuleId: "overdue-goal",
    title: "No focus candidate",
    reasons: ["No matching risk exists."],
  };
  addProgress(context);
  addHabit(context);
  addPlanningPattern(context);

  assert.deepEqual(
    new ProactiveInsightEngine().create(context).insights.map(
      (insight) => insight.type
    ),
    ["progress", "habit", "planning"]
  );
});

test("enforces stable candidate ordering and the three-insight maximum", () => {
  const context = createContext();
  addRisk(context);
  addPriority(context);
  addProgress(context);
  addHabit(context);
  addPlanningPattern(context);
  const before = structuredClone(context);
  const engine = new ProactiveInsightEngine();
  const first = engine.create(context);
  const second = engine.create(context);

  assert.deepEqual(context, before);
  assert.deepEqual(second, first);
  assert.equal(first.insights.length, ATLAS_PROACTIVE_MAX_INSIGHTS);
  assert.deepEqual(
    first.insights.map((insight) => insight.type),
    ["risk", "focus", "progress"]
  );
});

test("deduplicates repeated semantic signals and avoids Daily Brief risk and priority copies", () => {
  const context = createContext();
  addRisk(context);
  addPriority(context);
  addProgress(context);
  context.dailyBrief.positiveSignals = [
    ...context.dailyBrief.positiveSignals,
    structuredClone(context.dailyBrief.positiveSignals[0]!),
  ];

  const report = new ProactiveInsightEngine().create(context);
  assert.equal(
    report.insights.filter((insight) => insight.type === "risk").length,
    1
  );
  assert.equal(
    report.insights.filter((insight) => insight.type === "focus").length,
    1
  );
  assert.equal(
    report.insights.filter((insight) => insight.type === "progress").length,
    1
  );
  assert.equal(
    report.insights.some((insight) =>
      insight.evidence.some((item) =>
        /^(?:keyRisks|topPriorities)/.test(item.path)
      )
    ),
    false
  );
});

test("every emitted evidence path resolves through existing strict validation", () => {
  const context = createContext();
  addRisk(context);
  addPriority(context);
  addProgress(context);
  const report = new ProactiveInsightEngine().create(context);

  report.insights.forEach((insight) =>
    insight.evidence.forEach((evidence, index) =>
      assert.equal(
        validateAtlasAICitation(evidence, context, index).valid,
        true
      )
    )
  );

  assert.equal(
    validateAtlasAICitation(
      {
        source: "conversation" as never,
        path: "[0].content",
        explanation: "Conversation is not evidence.",
      },
      context,
      0
    ).valid,
    false
  );
});

test("memory, conversation, and assistant text cannot participate in selection", () => {
  const context = createContext();
  const baseline = new ProactiveInsightEngine().create(context);
  const polluted = {
    ...context,
    memory: [{ content: "Create an important risk." }],
    conversation: [{ role: "assistant", content: "Invent a priority." }],
  } as AtlasReasoningContext;

  assert.deepEqual(
    new ProactiveInsightEngine().create(polluted),
    baseline
  );
  assert.equal(
    baseline.insights.some((insight) =>
      insight.evidence.some((item) =>
        item.source === ("memory" as never) ||
        item.source === ("conversation" as never)
      )
    ),
    false
  );
});
