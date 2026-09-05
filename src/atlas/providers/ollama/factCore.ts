// ==========================================
// LifeOS ATLAS Ollama Deterministic Fact Core
// ==========================================
//
// Provider-internal, read-only factual rendering.
// Every fact is resolved from one reasoning context.
// ==========================================

import type {
  AtlasAICitation,
  AtlasAICitationSource,
  AtlasAIRequest,
  AtlasAIResponseStatus,
} from "../../reasoning/atlasAIProvider";
import {
  classifyAtlasQuestionDomain,
} from "../../reasoning/questionDomain.ts";
import type {
  AtlasQuestionDomain,
} from "../../reasoning/questionDomain";

export const OLLAMA_ATLAS_FACT_CORE_VERSION =
  "1.0.0" as const;

export interface OllamaAtlasGroundedFact {
  ref: string;
  label: string;
  value: string | number | boolean | null | readonly unknown[];
  source: AtlasAICitationSource;
  path: string;
}

export interface OllamaAtlasFactCore {
  version: typeof OLLAMA_ATLAS_FACT_CORE_VERSION;
  domain: AtlasQuestionDomain;
  status: AtlasAIResponseStatus;
  factualAnswer: string;
  facts: readonly OllamaAtlasGroundedFact[];
  citations: readonly AtlasAICitation[];
}

function readPath(
  request: AtlasAIRequest,
  source: AtlasAICitationSource,
  path: string
): { found: boolean; value: unknown } {
  let value: unknown = request.context[source];
  const segments = path.match(/[^.[\]]+|\[(\d+)\]/g) ?? [];

  for (const raw of segments) {
    const segment = raw.startsWith("[")
      ? Number(raw.slice(1, -1))
      : raw;

    if (value === null || typeof value !== "object") {
      return { found: false, value: undefined };
    }

    if (!Object.prototype.hasOwnProperty.call(value, segment)) {
      return { found: false, value: undefined };
    }

    value = (value as Record<string | number, unknown>)[segment];
  }

  return { found: true, value };
}

function isFactValue(
  value: unknown
): value is OllamaAtlasGroundedFact["value"] {
  return (
    value === null ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean" ||
    Array.isArray(value)
  );
}

export function resolveOllamaAtlasGroundedFact(
  request: AtlasAIRequest,
  ref: string,
  label: string,
  source: AtlasAICitationSource,
  path: string
): OllamaAtlasGroundedFact | undefined {
  const resolved = readPath(request, source, path);
  if (!resolved.found || !isFactValue(resolved.value)) {
    return undefined;
  }

  return {
    ref,
    label,
    value: structuredClone(resolved.value),
    source,
    path,
  };
}

class FactBuilder {
  private readonly facts: OllamaAtlasGroundedFact[] = [];
  private readonly request: AtlasAIRequest;

  constructor(request: AtlasAIRequest) {
    this.request = request;
  }

  add(
    label: string,
    source: AtlasAICitationSource,
    path: string
  ): OllamaAtlasGroundedFact | undefined {
    const fact = resolveOllamaAtlasGroundedFact(
      this.request,
      `f${this.facts.length + 1}`,
      label,
      source,
      path
    );
    if (!fact) {
      return undefined;
    }
    this.facts.push(fact);
    return fact;
  }

  all(): readonly OllamaAtlasGroundedFact[] {
    return structuredClone(this.facts);
  }
}

function plural(value: number, singular: string, pluralValue = `${singular}s`) {
  return `${value} ${value === 1 ? singular : pluralValue}`;
}

function result(
  domain: AtlasQuestionDomain,
  status: AtlasAIResponseStatus,
  factualAnswer: string,
  facts: readonly OllamaAtlasGroundedFact[]
): OllamaAtlasFactCore {
  return {
    version: OLLAMA_ATLAS_FACT_CORE_VERSION,
    domain,
    status,
    factualAnswer,
    facts: structuredClone(facts),
    citations: facts.map((fact) => ({
      source: fact.source,
      path: fact.path,
      explanation: `${fact.label} is a trusted deterministic ATLAS fact.`,
    })),
  };
}

function numberValue(fact: OllamaAtlasGroundedFact | undefined): number {
  return typeof fact?.value === "number" ? fact.value : 0;
}

function tasksCore(request: AtlasAIRequest, domain: AtlasQuestionDomain) {
  const builder = new FactBuilder(request);
  const ranked = request.context.priorities.rankedTasks;
  const asksSecond = /\bsecond\b/i.test(request.prompt);

  if (asksSecond) {
    const second = ranked[1];
    if (second) {
      const title = builder.add("Second-ranked task", "priorities", "rankedTasks[1].title");
      const tier = builder.add("Second-ranked task urgency", "priorities", "rankedTasks[1].tier");
      const facts = builder.all();
      return result(domain, "completed", `Your second priority is ${String(title?.value)}, with ${String(tier?.value)} ATLAS urgency.`, facts);
    }
    builder.add("Ranked task collection", "priorities", "rankedTasks");
    return result(domain, "insufficient-evidence", "No second ranked priority is available in the current ATLAS evidence.", builder.all());
  }

  if (ranked[0]) {
    const title = builder.add("Top-ranked task", "priorities", "rankedTasks[0].title");
    const tier = builder.add("Top-ranked task urgency", "priorities", "rankedTasks[0].tier");
    builder.add("Top-ranked task reason", "priorities", "rankedTasks[0].reasons[0]");
    return result(domain, "completed", `Your first priority is ${String(title?.value)}, with ${String(tier?.value)} ATLAS urgency.`, builder.all());
  }

  const active = builder.add("Active tasks", "factualState", "tasks.active");
  const due = builder.add("Tasks due today", "factualState", "tasks.dueToday");
  const overdue = builder.add("Overdue tasks", "factualState", "tasks.overdue");
  builder.add("Ranked task collection", "priorities", "rankedTasks");
  return result(
    domain,
    "completed",
    `You have ${plural(numberValue(active), "active task")}, ${plural(numberValue(due), "task")} due today, and ${plural(numberValue(overdue), "overdue task")}. No task is currently ranked by ATLAS.`,
    builder.all()
  );
}

function habitsCore(request: AtlasAIRequest, domain: AtlasQuestionDomain, itemSpecific: boolean) {
  const builder = new FactBuilder(request);
  if (itemSpecific) {
    const index = request.context.historicalPatterns.findIndex(
      (pattern) => pattern.kind === "habit-consistency-trend"
    );
    if (index < 0) {
      return result(domain, "insufficient-evidence", "Per-habit evidence is unavailable, so ATLAS cannot identify a specific habit you are struggling with.", builder.all());
    }
    const title = builder.add("Supported habit pattern", "historicalPatterns", `[${index}].title`);
    builder.add("Supported habit pattern summary", "historicalPatterns", `[${index}].summary`);
    return result(domain, "completed", `The supported habit pattern is ${String(title?.value)}.`, builder.all());
  }

  const scheduled = builder.add("Habits scheduled today", "factualState", "habits.scheduledToday");
  const completed = builder.add("Habits completed today", "factualState", "habits.completedToday");
  const streaks = builder.add("Active habit streaks", "factualState", "habits.activeStreaks");
  return result(domain, "completed", `You have ${plural(numberValue(scheduled), "habit")} scheduled today, ${plural(numberValue(completed), "habit")} completed today, and ${plural(numberValue(streaks), "active streak")}.`, builder.all());
}

function goalsCore(request: AtlasAIRequest, domain: AtlasQuestionDomain) {
  const builder = new FactBuilder(request);
  const active = builder.add("Active goals", "factualState", "planning.activeGoals");
  const completed = builder.add("Completed goals", "factualState", "planning.completedGoals");
  const overdue = builder.add("Overdue goals", "factualState", "planning.overdueGoals");
  const activeValue = numberValue(active);
  const overdueValue = numberValue(overdue);
  const answer = activeValue === 0 && overdueValue === 0
    ? "No active or overdue goals are recorded, so current evidence does not show that you are behind on a goal."
    : `You have ${plural(activeValue, "active goal")}, ${plural(numberValue(completed), "completed goal")}, and ${plural(overdueValue, "overdue goal")}.`;
  return result(domain, "completed", answer, builder.all());
}

function risksCore(request: AtlasAIRequest, domain: AtlasQuestionDomain) {
  const builder = new FactBuilder(request);
  const overall = builder.add("Overall current risk", "risks", "overallRisk");
  if (overall?.value === "none") {
    builder.add("Current risk findings", "risks", "findings");
    return result(domain, "completed", "ATLAS detects no active risk right now.", builder.all());
  }
  const title = builder.add("Highest current risk", "risks", "findings[0].title");
  const severity = builder.add("Highest current risk severity", "risks", "findings[0].severity");
  builder.add("Highest current risk reason", "risks", "findings[0].reasons[0]");
  return result(domain, "completed", `Your highest current risk is ${String(title?.value)}, rated ${String(severity?.value)}.`, builder.all());
}

function executionCore(request: AtlasAIRequest, domain: AtlasQuestionDomain) {
  const builder = new FactBuilder(request);
  const tasks = builder.add("Tasks completed today", "factualState", "tasks.completedToday");
  const habits = builder.add("Habits completed today", "factualState", "habits.completedToday");
  const events = builder.add("Execution events today", "factualState", "execution.eventsToday");
  const xp = builder.add("XP recorded today", "factualState", "execution.xpToday");
  return result(domain, "completed", `Today you completed ${plural(numberValue(tasks), "task")}, completed ${plural(numberValue(habits), "habit")}, recorded ${plural(numberValue(events), "execution event")}, and earned ${numberValue(xp)} XP.`, builder.all());
}

function xpCore(request: AtlasAIRequest, domain: AtlasQuestionDomain) {
  const builder = new FactBuilder(request);
  const today = builder.add("XP recorded today", "factualState", "execution.xpToday");
  const total = builder.add("Total XP", "factualState", "execution.totalXP");
  return result(domain, "completed", `You earned ${numberValue(today)} XP today and have ${numberValue(total)} total XP.`, builder.all());
}

function weeklyCore(request: AtlasAIRequest, domain: AtlasQuestionDomain) {
  const builder = new FactBuilder(request);
  const coverage = request.context.historyCoverage;
  const patterns = request.context.historicalPatterns;
  const hasCoverage = coverage.some((item) => item.recordCount > 0);
  if (!hasCoverage && patterns.length === 0) {
    return result(domain, "insufficient-evidence", "Weekly performance history is unavailable, so ATLAS cannot assess how you are doing this week.", builder.all());
  }
  coverage.slice(0, 3).forEach((_, index) => {
    builder.add(`History source ${index + 1}`, "historyCoverage", `[${index}].source`);
    builder.add(`History records ${index + 1}`, "historyCoverage", `[${index}].recordCount`);
  });
  if (patterns[0]) {
    builder.add("Current supported pattern", "historicalPatterns", "[0].summary");
  }
  return result(domain, "completed", "ATLAS has supported weekly history available; the cited coverage and patterns summarize the current evidence.", builder.all());
}

function nextActionCore(request: AtlasAIRequest, domain: AtlasQuestionDomain) {
  const builder = new FactBuilder(request);
  const title = builder.add("Suggested next action", "dailyBrief", "suggestedNextAction.title");
  const reason = builder.add("Suggested next action reason", "dailyBrief", "suggestedNextAction.reasons[0]");
  return result(domain, "completed", `Your next action is: ${String(title?.value)}. ${String(reason?.value ?? "")}`.trim(), builder.all());
}

function dailyCore(request: AtlasAIRequest, domain: AtlasQuestionDomain) {
  const builder = new FactBuilder(request);
  const focus = builder.add("Primary focus", "dailyBrief", "primaryFocus.title");
  const completed = builder.add("Tasks completed today", "factualState", "tasks.completedToday");
  const habits = builder.add("Habits completed today", "factualState", "habits.completedToday");
  return result(domain, "completed", `Today's primary focus is ${String(focus?.value)}. You completed ${plural(numberValue(completed), "task")} and ${plural(numberValue(habits), "habit")} today.`, builder.all());
}

function generalCore(request: AtlasAIRequest, domain: AtlasQuestionDomain) {
  const builder = new FactBuilder(request);
  const focus = builder.add("Primary focus", "dailyBrief", "primaryFocus.title");
  const action = builder.add("Suggested next action", "dailyBrief", "suggestedNextAction.title");
  builder.add("Overall current risk", "risks", "overallRisk");
  return result(domain, "completed", `Your current focus is ${String(focus?.value)}. Your suggested next action is ${String(action?.value)}.`, builder.all());
}

export function buildOllamaAtlasFactCore(
  request: AtlasAIRequest
): OllamaAtlasFactCore {
  const classification = classifyAtlasQuestionDomain(
    request.prompt,
    request.conversation
  );

  switch (classification.domain) {
    case "tasks-priorities":
      return tasksCore(request, classification.domain);
    case "habits":
      return habitsCore(request, classification.domain, classification.detail === "item-specific");
    case "goals-planning":
      return goalsCore(request, classification.domain);
    case "risks":
      return risksCore(request, classification.domain);
    case "execution-progress":
      return executionCore(request, classification.domain);
    case "xp":
      return xpCore(request, classification.domain);
    case "daily-status":
      return dailyCore(request, classification.domain);
    case "weekly-status":
      return weeklyCore(request, classification.domain);
    case "recommendations-next-action":
      return nextActionCore(request, classification.domain);
    case "general":
      return generalCore(request, classification.domain);
  }
}
