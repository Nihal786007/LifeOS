import {
  ATLAS_ACTION_CLARIFICATION_VERSION,
  interpretAtlasActionRequest,
} from "./actionIntent.ts";
import type {
  AtlasActionIntentResult,
  AtlasActionIntentSnapshot,
} from "./actionIntent.ts";
import { parseAtlasActionProposalDraft } from "./proposal.ts";
import type {
  AtlasActionProposalDraft,
  AtlasActionType,
} from "./types.ts";

export const ATLAS_ACTION_CANDIDATE_VERSION = "1.0.0" as const;
export const ATLAS_ACTION_CANDIDATE_REQUEST_VERSION = "1.0.0" as const;
export const ATLAS_ACTION_CANDIDATE_ENTITY_LIMIT = 24 as const;

export const ATLAS_ACTION_TYPES = [
  "task.create", "task.update", "task.complete", "habit.create", "habit.update",
  "capture.create", "planning.weekly_focus.create", "planning.task.schedule",
] as const satisfies readonly AtlasActionType[];

export interface AtlasActionCandidate {
  version: typeof ATLAS_ACTION_CANDIDATE_VERSION;
  actionType: AtlasActionType;
  payload: unknown;
  rationale?: string;
}

export interface AtlasActionCandidateRequest {
  version: typeof ATLAS_ACTION_CANDIDATE_REQUEST_VERSION;
  userRequest: string;
  currentDate: string;
  allowedActionTypes: readonly AtlasActionType[];
  relevantEntities: AtlasActionIntentSnapshot;
  constraints: {
    requiresExplicitApproval: true;
    providerHasMutationAuthority: false;
    providerMayAssignRiskOrPermission: false;
    forbiddenSemantics: readonly [
      "delete",
      "messaging",
      "finance",
      "account-security",
      "shell-browser",
      "external-action",
    ];
  };
}

export type AtlasActionCandidateGenerationResult =
  | { status: "candidate"; output: unknown }
  | { status: "none" }
  | { status: "unavailable" };

export interface AtlasActionCandidateProvider {
  readonly id: string;
  generate(
    request: AtlasActionCandidateRequest
  ): Promise<AtlasActionCandidateGenerationResult>;
}

export interface AtlasActionResolution {
  outcome: AtlasActionIntentResult;
  source:
    | "provider-candidate"
    | "deterministic"
    | "deterministic-fallback"
    | "provider-rejected";
}

const CANDIDATE_KEYS = [
  "version",
  "actionType",
  "payload",
  "rationale",
] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readCandidateValue(value: unknown): unknown {
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value) as unknown;
  } catch {
    throw new Error("Provider action candidate must be valid JSON.");
  }
}

function candidateTitle(actionType: AtlasActionType): string {
  switch (actionType) {
    case "task.create": return "Prepare task creation";
    case "task.update": return "Prepare task update";
    case "task.complete": return "Prepare task completion";
    case "habit.create": return "Prepare habit creation";
    case "habit.update": return "Prepare habit update";
    case "capture.create": return "Prepare capture";
    case "planning.weekly_focus.create": return "Prepare Weekly Focus";
    case "planning.task.schedule": return "Prepare task scheduling";
  }
}

export function parseAtlasActionCandidate(value: unknown): AtlasActionCandidate {
  const parsed = readCandidateValue(value);
  if (!isRecord(parsed) || Object.keys(parsed).some(
    (key) => !CANDIDATE_KEYS.includes(key as typeof CANDIDATE_KEYS[number])
  )) {
    throw new Error("Provider action candidate contains unsupported fields.");
  }
  if (parsed.version !== ATLAS_ACTION_CANDIDATE_VERSION) {
    throw new Error("Provider action candidate version is unsupported.");
  }
  if (typeof parsed.actionType !== "string") {
    throw new Error("Provider action candidate type is invalid.");
  }

  const draft = parseAtlasActionProposalDraft({
    type: parsed.actionType,
    title: candidateTitle(parsed.actionType as AtlasActionType),
    payload: parsed.payload,
    ...(parsed.rationale === undefined ? {} : { rationale: parsed.rationale }),
  });

  return {
    version: ATLAS_ACTION_CANDIDATE_VERSION,
    actionType: draft.type,
    payload: draft.payload,
    ...(draft.rationale === undefined ? {} : { rationale: draft.rationale }),
  };
}

function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(canonicalJson).join(",")}]`;
  }
  if (isRecord(value)) {
    return `{${Object.keys(value).sort().map(
      (key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`
    ).join(",")}}`;
  }
  return JSON.stringify(value);
}

function candidatesAgree(
  deterministic: AtlasActionProposalDraft,
  candidate: AtlasActionCandidate
): boolean {
  const normalizeForAgreement = (value: unknown): unknown => {
    if (typeof value === "string") return value.trim().replace(/\s+/g, " ").toLocaleLowerCase("en-US");
    if (Array.isArray(value)) return value.map(normalizeForAgreement);
    if (isRecord(value)) {
      return Object.fromEntries(
        Object.entries(value).map(([key, nested]) => [key, normalizeForAgreement(nested)])
      );
    }
    return value;
  };
  return deterministic.type === candidate.actionType &&
    canonicalJson(normalizeForAgreement(deterministic.payload)) ===
      canonicalJson(normalizeForAgreement(candidate.payload));
}

function disagreement(
  input: string,
  actionType: AtlasActionType
): AtlasActionIntentResult {
  return {
    status: "clarification",
    clarification: {
      version: ATLAS_ACTION_CLARIFICATION_VERSION,
      intent: actionType,
      originalInput: input,
      question: "ATLAS found conflicting action details. Restate the exact action, target, and date.",
      attempt: 1,
    },
  };
}

function cloneIntentSnapshot(
  snapshot: AtlasActionIntentSnapshot
): AtlasActionIntentSnapshot {
  return {
    tasks: snapshot.tasks.map((task) => ({ ...task })),
    habits: snapshot.habits.map((habit) => ({ ...habit })),
    monthlyOutcomes: snapshot.monthlyOutcomes.map((item) => ({ ...item })),
    weeklyFocuses: snapshot.weeklyFocuses.map((item) => ({ ...item })),
  };
}

function formatLocalDate(value: Date): string {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function allowedTypesFor(
  deterministic: AtlasActionIntentResult
): readonly AtlasActionType[] {
  if (deterministic.status === "proposal") return [deterministic.draft.type];
  if (deterministic.status === "clarification") return [deterministic.clarification.intent];
  return ATLAS_ACTION_TYPES;
}

function selectRelevantEntities(
  snapshot: AtlasActionIntentSnapshot,
  allowedActionTypes: readonly AtlasActionType[]
): AtlasActionIntentSnapshot {
  const allowed = new Set(allowedActionTypes);
  const needsTasks = allowed.has("task.update") || allowed.has("task.complete") ||
    allowed.has("planning.task.schedule");
  const needsHabits = allowed.has("habit.update");
  const needsPlanning = allowed.has("planning.weekly_focus.create") ||
    allowed.has("planning.task.schedule");
  return cloneIntentSnapshot({
    tasks: needsTasks ? snapshot.tasks.slice(0, ATLAS_ACTION_CANDIDATE_ENTITY_LIMIT) : [],
    habits: needsHabits ? snapshot.habits.slice(0, ATLAS_ACTION_CANDIDATE_ENTITY_LIMIT) : [],
    monthlyOutcomes: needsPlanning ? snapshot.monthlyOutcomes.slice(0, ATLAS_ACTION_CANDIDATE_ENTITY_LIMIT) : [],
    weeklyFocuses: needsPlanning ? snapshot.weeklyFocuses.slice(0, ATLAS_ACTION_CANDIDATE_ENTITY_LIMIT) : [],
  });
}

export function createAtlasActionCandidateRequest(
  input: string,
  deterministic: AtlasActionIntentResult,
  snapshot: AtlasActionIntentSnapshot,
  now: Date
): AtlasActionCandidateRequest {
  const allowedActionTypes = allowedTypesFor(deterministic);
  return {
    version: ATLAS_ACTION_CANDIDATE_REQUEST_VERSION,
    userRequest: input,
    currentDate: formatLocalDate(now),
    allowedActionTypes,
    relevantEntities: selectRelevantEntities(snapshot, allowedActionTypes),
    constraints: {
      requiresExplicitApproval: true,
      providerHasMutationAuthority: false,
      providerMayAssignRiskOrPermission: false,
      forbiddenSemantics: [
        "delete", "messaging", "finance", "account-security", "shell-browser", "external-action",
      ],
    },
  };
}

export async function resolveAtlasActionRequestWithProvider(
  input: string,
  options: {
    snapshot: AtlasActionIntentSnapshot;
    now: Date;
    provider: AtlasActionCandidateProvider;
  }
): Promise<AtlasActionResolution> {
  const deterministic = interpretAtlasActionRequest(input, options);
  if (deterministic.status === "forbidden") {
    return { outcome: deterministic, source: "deterministic" };
  }

  let generated: AtlasActionCandidateGenerationResult;
  try {
    generated = await options.provider.generate(
      createAtlasActionCandidateRequest(
        input,
        deterministic,
        options.snapshot,
        options.now
      )
    );
  } catch {
    return { outcome: deterministic, source: "deterministic-fallback" };
  }

  if (generated.status === "unavailable") {
    return { outcome: deterministic, source: "deterministic-fallback" };
  }
  if (generated.status === "none") {
    return { outcome: deterministic, source: "deterministic" };
  }

  let candidate: AtlasActionCandidate;
  try {
    candidate = parseAtlasActionCandidate(generated.output);
  } catch {
    if (deterministic.status === "clarification") {
      return { outcome: deterministic, source: "provider-rejected" };
    }
    return {
      outcome: {
        status: "forbidden",
        message: "ATLAS rejected an unsafe or invalid action candidate. No action was prepared.",
      },
      source: "provider-rejected",
    };
  }

  if (deterministic.status !== "proposal" ||
      !candidatesAgree(deterministic.draft, candidate)) {
    return {
      outcome: disagreement(input, candidate.actionType),
      source: "provider-rejected",
    };
  }

  return {
    outcome: {
      status: "proposal",
      draft: {
        ...deterministic.draft,
        ...(candidate.rationale === undefined
          ? {}
          : { rationale: candidate.rationale }),
      },
    },
    source: "provider-candidate",
  };
}

export class DeterministicMockAtlasActionCandidateProvider
implements AtlasActionCandidateProvider {
  readonly id = "deterministic-mock";

  async generate(
    request: AtlasActionCandidateRequest
  ): Promise<AtlasActionCandidateGenerationResult> {
    const outcome = interpretAtlasActionRequest(request.userRequest, {
      snapshot: request.relevantEntities,
      now: new Date(`${request.currentDate}T12:00:00`),
    });
    if (outcome.status !== "proposal") return { status: "none" };
    return {
      status: "candidate",
      output: {
        version: ATLAS_ACTION_CANDIDATE_VERSION,
        actionType: outcome.draft.type,
        payload: outcome.draft.payload,
        ...(outcome.draft.rationale === undefined
          ? {}
          : { rationale: outcome.draft.rationale }),
      },
    };
  }
}
