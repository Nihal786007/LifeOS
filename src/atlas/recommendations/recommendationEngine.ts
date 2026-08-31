// ==========================================
// LifeOS ATLAS Recommendation Engine
// ==========================================
//
// Produces a small ranked recommendation set
// from one completed intelligence report.
// Existing priority order, risk order, severity,
// and understanding facts remain authoritative.
// ==========================================

import type {
  AtlasIntelligenceReport,
} from "../coordinator/types";

import type {
  AtlasRiskFinding,
  AtlasRiskRuleId,
} from "../risk/types";

import {
  ATLAS_RECOMMENDATION_REPORT_VERSION,
} from "./types.ts";

import type {
  AtlasRecommendation,
  AtlasRecommendationCategory,
  AtlasRecommendationEvidence,
  AtlasRecommendationReport,
} from "./types";

const MAX_RECOMMENDATIONS = 4;

const PLANNING_RULES = new Set<AtlasRiskRuleId>([
  "broken-planning-link",
  "planning-alignment-gap",
  "completed-parent-conflict",
]);

const OVERLOAD_RULES = new Set<AtlasRiskRuleId>([
  "active-task-overload",
  "high-priority-overload",
]);

function getRiskRecommendationCategory(
  finding: AtlasRiskFinding
): AtlasRecommendationCategory {
  if (PLANNING_RULES.has(finding.ruleId)) {
    return "repair-planning";
  }

  if (OVERLOAD_RULES.has(finding.ruleId)) {
    return "reduce-overload";
  }

  return "mitigate-risk";
}

function getRiskAction(
  category: AtlasRecommendationCategory,
  finding: AtlasRiskFinding
): string {
  if (category === "repair-planning") {
    return (
      "Review the affected planning relationships " +
      "and restore a valid goal-to-task chain."
    );
  }

  if (category === "reduce-overload") {
    return (
      "Reduce concurrent active work and decide " +
      "which commitments remain genuinely urgent."
    );
  }

  return `Address the recorded evidence for: ${finding.title}.`;
}

function createRiskRecommendation(
  finding: AtlasRiskFinding
): Omit<AtlasRecommendation, "rank"> {
  const category =
    getRiskRecommendationCategory(finding);

  const evidence: AtlasRecommendationEvidence[] = [
    {
      source: "risk",
      path: `risk.findings[ruleId=${finding.ruleId}].severity`,
      value: finding.severity,
      description:
        "Severity assigned by the Risk/Drift Engine.",
    },
    ...finding.evidence.map((item) => ({
      source: "risk" as const,
      path: `risk.findings[ruleId=${finding.ruleId}].evidence[metric=${item.metric}]`,
      value: item.value,
      description: `${item.metric} measured ${item.value} against threshold ${item.threshold}.`,
    })),
  ];

  return {
    id: `${category}:${finding.ruleId}`,
    category,
    title: finding.title,
    suggestedAction: getRiskAction(
      category,
      finding
    ),
    reason: finding.reasons.join(" "),
    evidence,
  };
}

function createExecuteRecommendation(
  report: AtlasIntelligenceReport
): Omit<AtlasRecommendation, "rank"> | undefined {
  const task = report.priorities.rankedTasks[0];

  if (!task) {
    return undefined;
  }

  return {
    id: `execute-now:task-${task.taskId}`,
    category: "execute-now",
    title: `Execute now: ${task.title}`,
    suggestedAction:
      `Begin the current rank-${task.rank} task: ${task.title}.`,
    reason: [
      `This task is already ranked ${task.rank} in the ${task.tier} tier.`,
      ...task.reasons,
    ].join(" "),
    evidence: [
      {
        source: "priority",
        path: "priorities.rankedTasks[0].taskId",
        value: task.taskId,
        description:
          "Task selected from the first existing priority result.",
      },
      {
        source: "priority",
        path: "priorities.rankedTasks[0].rank",
        value: task.rank,
        description:
          "Rank assigned by the Priority Engine.",
      },
      {
        source: "priority",
        path: "priorities.rankedTasks[0].tier",
        value: task.tier,
        description:
          "Tier assigned by the Priority Engine.",
      },
      {
        source: "priority",
        path: "priorities.rankedTasks[0].score",
        value: task.score,
        description:
          "Existing explainable Priority Engine score.",
      },
    ],
  };
}

function createMomentumRecommendation(
  report: AtlasIntelligenceReport
): Omit<AtlasRecommendation, "rank"> | undefined {
  if (
    report.risk.overallRisk === "critical" ||
    report.risk.overallRisk === "high"
  ) {
    return undefined;
  }

  const facts = [
    {
      path: "understanding.tasks.completedToday",
      value:
        report.understanding.tasks.completedToday,
      description: "Tasks completed today.",
    },
    {
      path: "understanding.habits.completedToday",
      value:
        report.understanding.habits.completedToday,
      description: "Habits completed today.",
    },
    {
      path: "understanding.habits.activeStreaks",
      value:
        report.understanding.habits.activeStreaks,
      description: "Active habit streaks.",
    },
    {
      path: "understanding.execution.xpToday",
      value: report.understanding.execution.xpToday,
      description: "XP recorded today.",
    },
  ].filter((fact) => fact.value > 0);

  if (facts.length < 2) {
    return undefined;
  }

  return {
    id: "protect-momentum:daily-wins",
    category: "protect-momentum",
    title: "Protect today's momentum",
    suggestedAction:
      "Continue the current routine without adding unnecessary new commitments.",
    reason:
      `${facts.length} independent positive execution signals are active while overall risk is ${report.risk.overallRisk}.`,
    evidence: facts.map((fact) => ({
      source: "understanding" as const,
      path: fact.path,
      value: fact.value,
      description: fact.description,
    })),
  };
}

export class RecommendationEngine {
  create(
    report: AtlasIntelligenceReport
  ): AtlasRecommendationReport {
    const candidates: Omit<
      AtlasRecommendation,
      "rank"
    >[] = [];

    const usedRiskCategories =
      new Set<AtlasRecommendationCategory>();

    report.risk.findings.forEach((finding) => {
      const category =
        getRiskRecommendationCategory(finding);

      if (usedRiskCategories.has(category)) {
        return;
      }

      usedRiskCategories.add(category);
      candidates.push(
        createRiskRecommendation(finding)
      );
    });

    const executeRecommendation =
      createExecuteRecommendation(report);

    if (executeRecommendation) {
      candidates.push(executeRecommendation);
    }

    const momentumRecommendation =
      createMomentumRecommendation(report);

    if (momentumRecommendation) {
      candidates.push(momentumRecommendation);
    }

    const recommendations = candidates
      .slice(0, MAX_RECOMMENDATIONS)
      .map((recommendation, index) => ({
        ...recommendation,
        rank: index + 1,
        evidence: recommendation.evidence.map(
          (item) => ({
            ...item,
          })
        ),
      }));

    return {
      version:
        ATLAS_RECOMMENDATION_REPORT_VERSION,
      sourceReportVersion: report.version,
      snapshotCapturedAt:
        report.snapshotCapturedAt,
      recommendations,
    };
  }
}
