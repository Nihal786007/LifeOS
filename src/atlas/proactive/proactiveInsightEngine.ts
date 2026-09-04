// ==========================================
// LifeOS ATLAS Proactive Intelligence V1
// ==========================================
//
// Pure deterministic selection from one trusted
// reasoning context. No state reads, providers,
// memory, conversation, scheduling, or mutations.
// ==========================================

import type {
  AtlasAICitation,
} from "../reasoning/atlasAIProvider";
import type {
  AtlasReasoningContext,
} from "../reasoning/types";
import type {
  AtlasPositiveSignalId,
} from "../dailyBrief/types";

import {
  ATLAS_PROACTIVE_INSIGHT_VERSION,
  ATLAS_PROACTIVE_MAX_INSIGHTS,
} from "./types.ts";
import type {
  AtlasProactiveInsight,
  AtlasProactiveInsightReport,
  AtlasProactiveSeverity,
} from "./types";

interface AtlasProactiveCandidate {
  insight: AtlasProactiveInsight;
  semanticKeys: readonly string[];
}

function citation(
  source: AtlasAICitation["source"],
  path: string,
  explanation: string
): AtlasAICitation {
  return { source, path, explanation };
}

function riskSeverity(
  severity: "critical" | "high" | "moderate"
): AtlasProactiveSeverity {
  return severity === "moderate"
    ? "attention"
    : "important";
}

function prioritySeverity(
  tier: "critical" | "high" | "medium" | "low"
): AtlasProactiveSeverity {
  if (tier === "critical" || tier === "high") {
    return "important";
  }

  return tier === "medium" ? "attention" : "info";
}

function createRiskCandidate(
  context: AtlasReasoningContext
): AtlasProactiveCandidate | undefined {
  const finding = context.risks.findings[0];
  if (!finding) return undefined;

  const evidence = [
    citation(
      "risks",
      "findings[0].title",
      "Title from the first current Risk/Drift finding."
    ),
    citation(
      "risks",
      "findings[0].severity",
      "Severity assigned by the deterministic Risk/Drift Engine."
    ),
  ];

  if (finding.reasons[0]) {
    evidence.push(
      citation(
        "risks",
        "findings[0].reasons[0]",
        "Primary explainable reason from the Risk/Drift finding."
      )
    );
  }

  return {
    semanticKeys: [`risk:${finding.ruleId}`],
    insight: {
      id: `proactive:risk:${finding.ruleId}`,
      type: "risk",
      title: finding.title,
      summary: finding.reasons[0] ??
        "A current deterministic risk requires attention.",
      severity: riskSeverity(finding.severity),
      evidence,
    },
  };
}

function createPriorityCandidate(
  context: AtlasReasoningContext
): AtlasProactiveCandidate | undefined {
  const task = context.priorities.rankedTasks[0];
  if (!task) return undefined;

  const evidence = [
    citation(
      "priorities",
      "rankedTasks[0].title",
      "Current top-ranked task from the Priority Engine."
    ),
    citation(
      "priorities",
      "rankedTasks[0].tier",
      "Urgency tier assigned by the Priority Engine."
    ),
  ];

  if (task.reasons[0]) {
    evidence.push(
      citation(
        "priorities",
        "rankedTasks[0].reasons[0]",
        "Primary explainable ranking reason."
      )
    );
  }

  return {
    semanticKeys: [`task:${task.taskId}`],
    insight: {
      id: `proactive:focus:task-${task.taskId}`,
      type: "focus",
      title: `Focus next: ${task.title}`,
      summary: task.reasons[0] ??
        `This is the current rank-${task.rank} task.`,
      severity: prioritySeverity(task.tier),
      evidence,
    },
  };
}

function createDefinePriorityCandidate(
  context: AtlasReasoningContext
): AtlasProactiveCandidate | undefined {
  if (
    context.priorities.rankedTasks.length > 0 ||
    context.dailyBrief.suggestedNextAction.kind !==
      "define-next-priority"
  ) {
    return undefined;
  }

  const action = context.dailyBrief.suggestedNextAction;
  const evidence = [
    citation(
      "dailyBrief",
      "suggestedNextAction.title",
      "Existing deterministic Daily Brief action."
    ),
  ];

  if (action.reasons[0]) {
    evidence.push(
      citation(
        "dailyBrief",
        "suggestedNextAction.reasons[0]",
        "Reason already supplied by the Daily Brief."
      )
    );
  }

  return {
    semanticKeys: ["focus:define-next-priority"],
    insight: {
      id: "proactive:focus:define-next-priority",
      type: "focus",
      title: action.title,
      summary: action.reasons[0] ??
        "No ranked task currently supplies the next focus.",
      severity: "attention",
      evidence,
    },
  };
}

function findPositiveSignal(
  context: AtlasReasoningContext,
  preferredIds: readonly AtlasPositiveSignalId[]
) {
  for (const id of preferredIds) {
    const index = context.dailyBrief.positiveSignals.findIndex(
      (signal) => signal.id === id
    );
    if (index >= 0) {
      return {
        signal: context.dailyBrief.positiveSignals[index]!,
        index,
      };
    }
  }
  return undefined;
}

function createPositiveCandidate(
  context: AtlasReasoningContext,
  type: "progress" | "habit",
  preferredIds: readonly AtlasPositiveSignalId[]
): AtlasProactiveCandidate | undefined {
  const match = findPositiveSignal(context, preferredIds);
  if (!match) return undefined;

  const { signal, index } = match;
  return {
    semanticKeys: [`positive-signal:${signal.id}`],
    insight: {
      id: `proactive:${type}:${signal.id}`,
      type,
      title: signal.title,
      summary: signal.reason,
      severity: "info",
      evidence: [
        citation(
          "dailyBrief",
          `positiveSignals[${index}].title`,
          "Existing deterministic positive signal."
        ),
        citation(
          "dailyBrief",
          `positiveSignals[${index}].reason`,
          "Measured reason supplied by the Daily Brief."
        ),
      ],
    },
  };
}

function createPlanningCandidate(
  context: AtlasReasoningContext
): AtlasProactiveCandidate | undefined {
  const index = context.historicalPatterns.findIndex(
    (pattern) =>
      pattern.kind === "repeated-planning-revisions"
  );
  if (index < 0) return undefined;

  const pattern = context.historicalPatterns[index]!;
  return {
    semanticKeys: [`pattern:${pattern.id}`],
    insight: {
      id: `proactive:planning:${pattern.id}`,
      type: "planning",
      title: pattern.title,
      summary: pattern.summary,
      severity:
        pattern.direction === "recurring" ||
        pattern.direction === "declining"
          ? "attention"
          : "info",
      evidence: [
        citation(
          "historicalPatterns",
          `[${index}].title`,
          "Supported planning-history pattern title."
        ),
        citation(
          "historicalPatterns",
          `[${index}].summary`,
          "Measured planning-history pattern summary."
        ),
      ],
    },
  };
}

function evidenceKey(citationValue: AtlasAICitation): string {
  return `${citationValue.source}:${citationValue.path}`;
}

function selectDistinctInsights(
  candidates: readonly (AtlasProactiveCandidate | undefined)[]
): AtlasProactiveInsight[] {
  const insights: AtlasProactiveInsight[] = [];
  const usedSemanticKeys = new Set<string>();
  const usedEvidence = new Set<string>();

  for (const candidate of candidates) {
    if (!candidate) continue;

    const overlapsSemantic = candidate.semanticKeys.some(
      (key) => usedSemanticKeys.has(key)
    );
    const overlapsEvidence = candidate.insight.evidence.some(
      (item) => usedEvidence.has(evidenceKey(item))
    );

    if (overlapsSemantic || overlapsEvidence) continue;

    insights.push(structuredClone(candidate.insight));
    candidate.semanticKeys.forEach((key) => usedSemanticKeys.add(key));
    candidate.insight.evidence.forEach((item) =>
      usedEvidence.add(evidenceKey(item))
    );

    if (insights.length === ATLAS_PROACTIVE_MAX_INSIGHTS) break;
  }

  return insights;
}

export class ProactiveInsightEngine {
  create(
    context: AtlasReasoningContext
  ): AtlasProactiveInsightReport {
    const candidates = [
      createRiskCandidate(context),
      createPriorityCandidate(context),
      createDefinePriorityCandidate(context),
      createPositiveCandidate(
        context,
        "progress",
        ["tasks-completed-today", "xp-earned-today"]
      ),
      createPositiveCandidate(
        context,
        "habit",
        ["habits-completed-today", "active-habit-streaks"]
      ),
      createPlanningCandidate(context),
    ];

    return {
      version: ATLAS_PROACTIVE_INSIGHT_VERSION,
      snapshotCapturedAt: context.snapshotCapturedAt,
      insights: selectDistinctInsights(candidates),
    };
  }
}
