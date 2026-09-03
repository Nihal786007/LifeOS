// ==========================================
// LifeOS ATLAS Evidence Presentation
// ==========================================
//
// UI-only formatting for citations that have
// already passed provider conformance.
// ==========================================

import type {
  AtlasAICitation,
} from "../reasoning/atlasAIProvider";

import type {
  AtlasReasoningContext,
} from "../reasoning/types";

export interface AtlasEvidencePresentation {
  summary: string;
  source: AtlasAICitation["source"];
  path: string;
  value: unknown;
}

function parsePath(path: string): readonly string[] {
  return path
    .replace(/\[(\d+)\]/g, ".$1")
    .replace(/^\./, "")
    .split(".");
}

export function resolveAtlasEvidenceValue(
  context: AtlasReasoningContext,
  citation: AtlasAICitation
): unknown {
  let current: unknown = context[citation.source];

  for (const segment of parsePath(citation.path)) {
    if (Array.isArray(current)) {
      current = current[Number(segment)];
      continue;
    }

    if (
      typeof current !== "object" ||
      current === null
    ) {
      return undefined;
    }

    current = (
      current as Record<string, unknown>
    )[segment];
  }

  return current;
}

function countLabel(
  value: unknown,
  singular: string,
  plural: string
): string | undefined {
  if (typeof value !== "number") {
    return undefined;
  }

  return `${value} ${value === 1 ? singular : plural}`;
}

function readableSummary(
  citation: AtlasAICitation,
  value: unknown
): string {
  if (
    citation.source === "factualState" &&
    citation.path === "tasks.completedToday"
  ) {
    return `${countLabel(
      value,
      "task",
      "tasks"
    ) ?? "Tasks"} completed today`;
  }

  if (
    citation.source === "factualState" &&
    citation.path === "habits.completedToday"
  ) {
    return `${countLabel(
      value,
      "habit",
      "habits"
    ) ?? "Habits"} completed today`;
  }

  if (
    citation.source === "factualState" &&
    citation.path === "execution.xpToday" &&
    typeof value === "number"
  ) {
    return `${value} XP recorded today`;
  }

  if (
    citation.source === "risks" &&
    citation.path === "overallRisk" &&
    value === "none"
  ) {
    return "No active risk detected";
  }

  if (
    citation.source === "dailyBrief" &&
    (
      citation.path === "primaryFocus.title" ||
      citation.path === "suggestedNextAction.title" ||
      /^(?:positiveSignals|topPriorities|keyRisks)\[\d+\]\.title$/.test(
        citation.path
      )
    ) &&
    typeof value === "string"
  ) {
    return value;
  }

  if (
    citation.source === "priorities" &&
    /rankedTasks\[\d+\]\.tier$/.test(
      citation.path
    ) &&
    typeof value === "string"
  ) {
    return `ATLAS urgency: ${value}`;
  }

  if (
    citation.source === "priorities" &&
    /rankedTasks\[\d+\]\.score$/.test(
      citation.path
    ) &&
    typeof value === "number"
  ) {
    return `ATLAS priority score: ${value}`;
  }

  if (typeof value === "string") {
    return value;
  }

  if (
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    const field = citation.path
      .split(".")
      .at(-1)
      ?.replace(/([a-z])([A-Z])/g, "$1 $2")
      .replace(/^./, (character) =>
        character.toUpperCase()
      );

    return `${field ?? "Value"}: ${String(value)}`;
  }

  return citation.explanation;
}

export function presentAtlasEvidence(
  context: AtlasReasoningContext,
  citation: AtlasAICitation
): AtlasEvidencePresentation {
  const value = resolveAtlasEvidenceValue(
    context,
    citation
  );

  return {
    summary: readableSummary(citation, value),
    source: citation.source,
    path: citation.path,
    value,
  };
}

export function formatAtlasEvidenceValue(
  value: unknown
): string {
  if (typeof value === "string") {
    return value;
  }

  return JSON.stringify(value) ?? "Unavailable";
}
