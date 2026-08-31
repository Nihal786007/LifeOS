// ==========================================
// LifeOS ATLAS Deterministic Daily Brief
// ==========================================
//
// Transforms one completed intelligence report
// into a structured brief. It does not re-read
// canonical state or repeat engine calculations.
// ==========================================

import type {
  AtlasIntelligenceReport,
} from "../coordinator/types";

import type {
  AtlasRankedTask,
} from "../priority/types";

import type {
  AtlasRiskFinding,
} from "../risk/types";

import {
  ATLAS_DAILY_BRIEF_VERSION,
} from "./types.ts";

import type {
  AtlasDailyBrief,
  AtlasDailyBriefPrimaryFocus,
  AtlasPositiveSignal,
  AtlasSuggestedNextAction,
} from "./types";

const MAX_TOP_PRIORITIES = 3;
const MAX_KEY_RISKS = 3;

function copyPriority(
  task: AtlasRankedTask
): AtlasRankedTask {
  return {
    ...task,
    reasons: [...task.reasons],
    contributions: task.contributions.map(
      (contribution) => ({
        ...contribution,
      })
    ),
  };
}

function copyRisk(
  finding: AtlasRiskFinding
): AtlasRiskFinding {
  return {
    ...finding,
    reasons: [...finding.reasons],
    evidence: finding.evidence.map(
      (item) => ({
        ...item,
      })
    ),
  };
}

function selectPrimaryFocus(
  topPriority: AtlasRankedTask | undefined,
  keyRisk: AtlasRiskFinding | undefined
): AtlasDailyBriefPrimaryFocus {
  if (topPriority) {
    return {
      kind: "priority",
      taskId: topPriority.taskId,
      title: topPriority.title,
      reasons: [
        `Selected from priority rank ${topPriority.rank} with ${topPriority.tier} tier.`,
        ...topPriority.reasons,
      ],
    };
  }

  if (keyRisk) {
    return {
      kind: "risk",
      riskRuleId: keyRisk.ruleId,
      title: keyRisk.title,
      reasons: [
        "No ranked active task is available.",
        `Selected as the first ${keyRisk.severity} risk finding.`,
        ...keyRisk.reasons,
      ],
    };
  }

  return {
    kind: "maintenance",
    title: "Maintain momentum",
    reasons: [
      "No ranked active task is available.",
      "No risk or drift finding is active.",
    ],
  };
}

function collectPositiveSignals(
  report: AtlasIntelligenceReport
): AtlasPositiveSignal[] {
  const signals: AtlasPositiveSignal[] = [];

  const {
    tasks,
    habits,
    execution,
  } = report.understanding;

  if (tasks.completedToday > 0) {
    signals.push({
      id: "tasks-completed-today",
      title: "Tasks completed today",
      reason: `${tasks.completedToday} task(s) completed today.`,
    });
  }

  if (habits.completedToday > 0) {
    signals.push({
      id: "habits-completed-today",
      title: "Habits completed today",
      reason: `${habits.completedToday} habit(s) completed today.`,
    });
  }

  if (habits.activeStreaks > 0) {
    signals.push({
      id: "active-habit-streaks",
      title: "Habit streaks active",
      reason: `${habits.activeStreaks} active habit streak(s) are being maintained.`,
    });
  }

  if (execution.xpToday > 0) {
    signals.push({
      id: "xp-earned-today",
      title: "XP earned today",
      reason: `${execution.xpToday} XP recorded today.`,
    });
  }

  if (report.risk.overallRisk === "none") {
    signals.push({
      id: "no-current-risk",
      title: "No current risk detected",
      reason:
        "No deterministic risk or drift rule was triggered.",
    });
  }

  return signals;
}

function selectNextAction(
  topPriority: AtlasRankedTask | undefined,
  keyRisk: AtlasRiskFinding | undefined
): AtlasSuggestedNextAction {
  if (topPriority) {
    return {
      kind: "start-top-priority",
      taskId: topPriority.taskId,
      title: `Start: ${topPriority.title}`,
      reasons: [
        `This is priority rank ${topPriority.rank}.`,
        ...topPriority.reasons,
      ],
    };
  }

  if (keyRisk) {
    return {
      kind: "review-key-risk",
      riskRuleId: keyRisk.ruleId,
      title: `Review: ${keyRisk.title}`,
      reasons: [
        "No ranked active task is available.",
        `This is the first ${keyRisk.severity} risk finding.`,
        ...keyRisk.reasons,
      ],
    };
  }

  return {
    kind: "define-next-priority",
    title: "Define the next priority",
    reasons: [
      "No ranked active task is available.",
      "No active risk requires review.",
    ],
  };
}

export class DailyBriefEngine {
  create(
    report: AtlasIntelligenceReport
  ): AtlasDailyBrief {
    const topPriorities =
      report.priorities.rankedTasks
        .slice(0, MAX_TOP_PRIORITIES)
        .map(copyPriority);

    const keyRisks = report.risk.findings
      .slice(0, MAX_KEY_RISKS)
      .map(copyRisk);

    const topPriority = topPriorities[0];
    const keyRisk = keyRisks[0];

    return {
      version: ATLAS_DAILY_BRIEF_VERSION,
      sourceReportVersion: report.version,
      snapshotCapturedAt:
        report.snapshotCapturedAt,
      primaryFocus: selectPrimaryFocus(
        topPriority,
        keyRisk
      ),
      topPriorities,
      keyRisks,
      positiveSignals:
        collectPositiveSignals(report),
      suggestedNextAction: selectNextAction(
        topPriority,
        keyRisk
      ),
    };
  }
}
