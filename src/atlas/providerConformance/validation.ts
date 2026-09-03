// ==========================================
// LifeOS ATLAS Provider Contract Validation
// ==========================================

import {
  ATLAS_AI_REQUEST_VERSION,
  ATLAS_AI_RESPONSE_VERSION,
  ATLAS_CONVERSATION_MAX_TURNS,
} from "../reasoning/atlasAIProvider.ts";

import type {
  AtlasAICitation,
  AtlasAIProviderDescriptor,
  AtlasAIRequest,
} from "../reasoning/atlasAIProvider";

import type {
  AtlasReasoningContext,
} from "../reasoning/types";

import type {
  AtlasProviderValidationError,
  AtlasProviderValidationResult,
} from "./types";

const DESCRIPTOR_KEYS = [
  "id",
  "displayName",
  "kind",
] as const;

const REQUEST_KEYS = [
  "version",
  "requestId",
  "purpose",
  "prompt",
  "conversation",
  "context",
  "constraints",
] as const;

const CONVERSATION_TURN_KEYS = [
  "role",
  "content",
] as const;

const CONTEXT_KEYS = [
  "version",
  "snapshotCapturedAt",
  "sourceVersions",
  "profile",
  "factualState",
  "priorities",
  "risks",
  "dailyBrief",
  "recommendations",
  "historyCoverage",
  "historicalPatterns",
  "limitations",
] as const;

const CONSTRAINT_KEYS = [
  "groundedInContextOnly",
  "requireEvidenceReferences",
  "allowLifeOSMutation",
  "allowActions",
  "allowTools",
  "allowExternalRetrieval",
  "allowPrediction",
  "allowSimulation",
] as const;

const RESPONSE_KEYS = [
  "version",
  "requestId",
  "providerId",
  "status",
  "content",
  "citations",
  "limitations",
] as const;

const CITATION_KEYS = [
  "source",
  "path",
  "explanation",
] as const;

const REQUEST_PURPOSES = new Set([
  "grounded-answer",
  "explain-priority",
  "explain-risk",
  "explain-pattern",
  "narrate-daily-brief",
]);

const RESPONSE_STATUSES = new Set([
  "completed",
  "insufficient-evidence",
  "refused",
]);

const CITATION_SOURCES = new Set([
  "factualState",
  "priorities",
  "risks",
  "dailyBrief",
  "recommendations",
  "historyCoverage",
  "historicalPatterns",
  "limitations",
  "profile",
]);

const FORBIDDEN_PATH_SEGMENTS = new Set([
  "__proto__",
  "prototype",
  "constructor",
]);

function isRecord(
  value: unknown
): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

function hasExactKeys(
  value: Record<string, unknown>,
  expected: readonly string[]
): boolean {
  const actual = Object.keys(value).sort();
  const required = [...expected].sort();

  return (
    actual.length === required.length &&
    actual.every(
      (key, index) => key === required[index]
    )
  );
}

function error(
  code: AtlasProviderValidationError["code"],
  path: string,
  message: string
): AtlasProviderValidationError {
  return { code, path, message };
}

function result(
  errors: AtlasProviderValidationError[]
): AtlasProviderValidationResult {
  return {
    valid: errors.length === 0,
    errors,
  };
}

function parseCitationPath(
  path: string
): string[] | undefined {
  if (!path || path.trim() !== path) {
    return undefined;
  }

  let normalized = path.replace(
    /\[(0|[1-9]\d*)\]/g,
    ".$1"
  );

  if (normalized.startsWith(".")) {
    normalized = normalized.slice(1);
  }

  if (
    normalized.includes("[") ||
    normalized.includes("]")
  ) {
    return undefined;
  }

  const segments = normalized.split(".");

  if (
    segments.length === 0 ||
    segments.some(
      (segment) =>
        !/^(?:[A-Za-z][A-Za-z0-9]*|\d+)$/.test(
          segment
        ) ||
        FORBIDDEN_PATH_SEGMENTS.has(segment)
    )
  ) {
    return undefined;
  }

  return segments;
}

function resolvesContextPath(
  context: AtlasReasoningContext,
  citation: AtlasAICitation
): boolean {
  const segments = parseCitationPath(
    citation.path
  );

  if (!segments) {
    return false;
  }

  let current: unknown =
    context[citation.source];

  for (const segment of segments) {
    if (Array.isArray(current)) {
      if (!/^\d+$/.test(segment)) {
        return false;
      }

      const index = Number(segment);

      if (index >= current.length) {
        return false;
      }

      current = current[index];
      continue;
    }

    if (
      !isRecord(current) ||
      !Object.prototype.hasOwnProperty.call(
        current,
        segment
      )
    ) {
      return false;
    }

    current = current[segment];
  }

  return current !== undefined;
}

export function validateProviderDescriptor(
  descriptor: unknown
): AtlasProviderValidationResult {
  const errors: AtlasProviderValidationError[] = [];

  if (!isRecord(descriptor)) {
    return result([
      error(
        "invalid-descriptor",
        "descriptor",
        "Provider descriptor must be an object."
      ),
    ]);
  }

  if (!hasExactKeys(descriptor, DESCRIPTOR_KEYS)) {
    errors.push(
      error(
        "invalid-descriptor",
        "descriptor",
        "Provider descriptor contains missing or unsupported fields."
      )
    );
  }

  if (
    typeof descriptor.id !== "string" ||
    !/^[a-z0-9][a-z0-9._-]*$/.test(
      descriptor.id
    )
  ) {
    errors.push(
      error(
        "invalid-descriptor",
        "descriptor.id",
        "Provider ID must use lowercase letters, numbers, dots, underscores, or hyphens."
      )
    );
  }

  if (
    typeof descriptor.displayName !== "string" ||
    descriptor.displayName.trim().length === 0
  ) {
    errors.push(
      error(
        "invalid-descriptor",
        "descriptor.displayName",
        "Provider display name must not be empty."
      )
    );
  }

  if (
    descriptor.kind !== "local" &&
    descriptor.kind !== "cloud"
  ) {
    errors.push(
      error(
        "invalid-descriptor",
        "descriptor.kind",
        "Provider kind must be local or cloud."
      )
    );
  }

  return result(errors);
}

export function validateAtlasAIRequest(
  request: unknown
): AtlasProviderValidationResult {
  const errors: AtlasProviderValidationError[] = [];

  if (!isRecord(request)) {
    return result([
      error(
        "invalid-request",
        "request",
        "Provider request must be an object."
      ),
    ]);
  }

  if (!hasExactKeys(request, REQUEST_KEYS)) {
    errors.push(
      error(
        "authority-widening",
        "request",
        "Request contains missing or unsupported authority-bearing fields."
      )
    );
  }

  if (request.version !== ATLAS_AI_REQUEST_VERSION) {
    errors.push(
      error(
        "invalid-request",
        "request.version",
        "Unsupported request contract version."
      )
    );
  }

  if (
    typeof request.requestId !== "string" ||
    request.requestId.trim().length === 0
  ) {
    errors.push(
      error(
        "invalid-request",
        "request.requestId",
        "Request ID must not be empty."
      )
    );
  }

  if (
    typeof request.purpose !== "string" ||
    !REQUEST_PURPOSES.has(request.purpose)
  ) {
    errors.push(
      error(
        "invalid-request",
        "request.purpose",
        "Unsupported reasoning purpose."
      )
    );
  }

  if (
    typeof request.prompt !== "string" ||
    request.prompt.trim().length === 0
  ) {
    errors.push(
      error(
        "invalid-request",
        "request.prompt",
        "Prompt must not be empty."
      )
    );
  }

  if (!Array.isArray(request.conversation)) {
    errors.push(
      error(
        "invalid-request",
        "request.conversation",
        "Conversation context must be an array."
      )
    );
  } else {
    if (
      request.conversation.length >
      ATLAS_CONVERSATION_MAX_TURNS
    ) {
      errors.push(
        error(
          "invalid-request",
          "request.conversation",
          `Conversation context cannot exceed ${ATLAS_CONVERSATION_MAX_TURNS} turns.`
        )
      );
    }

    request.conversation.forEach((turn, index) => {
      const turnPath =
        `request.conversation[${index}]`;

      if (!isRecord(turn)) {
        errors.push(
          error(
            "invalid-request",
            turnPath,
            "Conversation turn must be an object."
          )
        );
        return;
      }

      if (
        !hasExactKeys(
          turn,
          CONVERSATION_TURN_KEYS
        )
      ) {
        errors.push(
          error(
            "authority-widening",
            turnPath,
            "Conversation turn contains missing or unsupported fields."
          )
        );
      }

      if (
        turn.role !== "user" &&
        turn.role !== "assistant"
      ) {
        errors.push(
          error(
            "invalid-request",
            `${turnPath}.role`,
            "Conversation role must be user or assistant."
          )
        );
      }

      if (
        typeof turn.content !== "string" ||
        turn.content.trim().length === 0
      ) {
        errors.push(
          error(
            "invalid-request",
            `${turnPath}.content`,
            "Conversation content must not be empty."
          )
        );
      }
    });
  }

  if (!isRecord(request.context)) {
    errors.push(
      error(
        "invalid-request",
        "request.context",
        "Reasoning context must be an object."
      )
    );
  } else if (
    !hasExactKeys(request.context, CONTEXT_KEYS)
  ) {
    errors.push(
      error(
        "authority-widening",
        "request.context",
        "Reasoning context contains unsupported fields."
      )
    );
  }

  if (!isRecord(request.constraints)) {
    errors.push(
      error(
        "invalid-request",
        "request.constraints",
        "Request constraints must be an object."
      )
    );
  } else {
    const constraints =
      request.constraints;

    if (
      !hasExactKeys(
        constraints,
        CONSTRAINT_KEYS
      )
    ) {
      errors.push(
        error(
          "authority-widening",
          "request.constraints",
          "Request constraints contain unsupported fields."
        )
      );
    }

    const expectedConstraints = {
      groundedInContextOnly: true,
      requireEvidenceReferences: true,
      allowLifeOSMutation: false,
      allowActions: false,
      allowTools: false,
      allowExternalRetrieval: false,
      allowPrediction: false,
      allowSimulation: false,
    };

    Object.entries(expectedConstraints).forEach(
      ([key, value]) => {
        if (constraints[key] !== value) {
          errors.push(
            error(
              "authority-widening",
              `request.constraints.${key}`,
              `${key} must remain ${String(value)}.`
            )
          );
        }
      }
    );
  }

  return result(errors);
}

export function validateAtlasAICitation(
  citation: unknown,
  context: AtlasReasoningContext,
  index: number
): AtlasProviderValidationResult {
  const errors: AtlasProviderValidationError[] = [];
  const basePath = `response.citations[${index}]`;

  if (!isRecord(citation)) {
    return result([
      error(
        "invalid-citation",
        basePath,
        "Citation must be an object."
      ),
    ]);
  }

  if (!hasExactKeys(citation, CITATION_KEYS)) {
    errors.push(
      error(
        "invalid-citation",
        basePath,
        "Citation contains missing or unsupported fields."
      )
    );
  }

  if (
    typeof citation.source !== "string" ||
    !CITATION_SOURCES.has(citation.source)
  ) {
    errors.push(
      error(
        "invalid-citation",
        `${basePath}.source`,
        "Citation source is not part of the reasoning context."
      )
    );
  }

  if (
    typeof citation.path !== "string" ||
    typeof citation.source !== "string" ||
    !CITATION_SOURCES.has(citation.source) ||
    !resolvesContextPath(
      context,
      citation as unknown as AtlasAICitation
    )
  ) {
    errors.push(
      error(
        "invalid-citation",
        `${basePath}.path`,
        "Citation path does not resolve inside its declared context source."
      )
    );
  }

  if (
    typeof citation.explanation !== "string" ||
    citation.explanation.trim().length === 0
  ) {
    errors.push(
      error(
        "invalid-citation",
        `${basePath}.explanation`,
        "Citation explanation must not be empty."
      )
    );
  }

  return result(errors);
}

export function validateAtlasAIResponse(
  response: unknown,
  request: AtlasAIRequest,
  descriptor: AtlasAIProviderDescriptor
): AtlasProviderValidationResult {
  const errors: AtlasProviderValidationError[] = [];

  if (!isRecord(response)) {
    return result([
      error(
        "invalid-response",
        "response",
        "Provider response must be an object."
      ),
    ]);
  }

  if (!hasExactKeys(response, RESPONSE_KEYS)) {
    errors.push(
      error(
        "authority-widening",
        "response",
        "Response contains missing or unsupported fields."
      )
    );
  }

  if (response.version !== ATLAS_AI_RESPONSE_VERSION) {
    errors.push(
      error(
        "invalid-response",
        "response.version",
        "Unsupported response contract version."
      )
    );
  }

  if (response.requestId !== request.requestId) {
    errors.push(
      error(
        "request-id-mismatch",
        "response.requestId",
        "Response request ID does not match the request."
      )
    );
  }

  if (response.providerId !== descriptor.id) {
    errors.push(
      error(
        "provider-id-mismatch",
        "response.providerId",
        "Response provider ID does not match the descriptor."
      )
    );
  }

  if (
    typeof response.status !== "string" ||
    !RESPONSE_STATUSES.has(response.status)
  ) {
    errors.push(
      error(
        "invalid-response",
        "response.status",
        "Unsupported response status."
      )
    );
  }

  if (
    typeof response.content !== "string" ||
    response.content.trim().length === 0
  ) {
    errors.push(
      error(
        "empty-response",
        "response.content",
        "Provider response content must not be empty."
      )
    );
  }

  if (!Array.isArray(response.citations)) {
    errors.push(
      error(
        "invalid-response",
        "response.citations",
        "Response citations must be an array."
      )
    );
  } else {
    if (
      response.status === "completed" &&
      response.citations.length === 0
    ) {
      errors.push(
        error(
          "invalid-response",
          "response.citations",
          "Completed grounded responses require at least one citation."
        )
      );
    }

    response.citations.forEach(
      (citation, index) => {
        errors.push(
          ...validateAtlasAICitation(
            citation,
            request.context,
            index
          ).errors
        );
      }
    );
  }

  if (
    !Array.isArray(response.limitations) ||
    response.limitations.some(
      (limitation) =>
        typeof limitation !== "string" ||
        limitation.trim().length === 0
    )
  ) {
    errors.push(
      error(
        "invalid-response",
        "response.limitations",
        "Response limitations must be non-empty strings."
      )
    );
  }

  return result(errors);
}
