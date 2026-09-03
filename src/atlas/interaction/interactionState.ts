// ==========================================
// LifeOS ATLAS Interaction State Machine
// ==========================================

import type {
  AtlasAIOrchestrationResult,
} from "../orchestration/types";

import {
  ATLAS_CONVERSATION_MAX_TURNS,
} from "../reasoning/atlasAIProvider.ts";

import type {
  AtlasConversationTurn,
} from "../reasoning/atlasAIProvider";

import type {
  AtlasInteractionError,
  AtlasInteractionEvent,
  AtlasInteractionState,
} from "./types";

export const INITIAL_ATLAS_INTERACTION_STATE:
  AtlasInteractionState = {
    status: "idle",
    conversation: [],
  };

function appendSuccessfulExchange(
  conversation: readonly AtlasConversationTurn[],
  userContent: string,
  assistantContent: string
): readonly AtlasConversationTurn[] {
  return [
    ...conversation,
    { role: "user" as const, content: userContent },
    {
      role: "assistant" as const,
      content: assistantContent,
    },
  ].slice(-ATLAS_CONVERSATION_MAX_TURNS);
}

function matchesActiveRequest(
  state: AtlasInteractionState,
  requestId: string
): boolean {
  return (
    state.status === "loading" &&
    state.activeRequestId === requestId
  );
}

export function atlasInteractionReducer(
  state: AtlasInteractionState,
  event: AtlasInteractionEvent
): AtlasInteractionState {
  if (event.type === "request-started") {
    return {
      status: "loading",
      activeRequestId: event.requestId,
      result: state.result,
      conversation: state.conversation,
    };
  }

  if (event.type === "source-changed") {
    return INITIAL_ATLAS_INTERACTION_STATE;
  }

  if (
    event.type === "request-cancelled"
  ) {
    return matchesActiveRequest(
      state,
      event.requestId
    )
      ? {
          status: "idle",
          ...(state.result
            ? { result: state.result }
            : {}),
          conversation: state.conversation,
        }
      : state;
  }

  if (
    event.type === "request-succeeded"
  ) {
    return matchesActiveRequest(
      state,
      event.requestId
    )
      ? {
          status: "success",
          result: event.result,
          conversation: appendSuccessfulExchange(
            state.conversation,
            event.userContent,
            event.assistantContent
          ),
        }
      : state;
  }

  return matchesActiveRequest(
    state,
    event.requestId
  )
    ? {
        status: "error",
        result: state.result,
        error: event.error,
        conversation: state.conversation,
      }
    : state;
}

export function getAtlasInteractionError(
  result: AtlasAIOrchestrationResult
): AtlasInteractionError {
  const status =
    result.provider.invocationStatus;

  if (status === "empty-response") {
    return {
      kind: "empty-response",
      title: "ATLAS returned no answer",
      message:
        "The local model returned an empty response, so ATLAS did not present it as grounded guidance.",
    };
  }

  if (status === "validation-error") {
    return {
      kind: "validation-failure",
      title: "Evidence validation failed",
      message:
        "ATLAS rejected the response because its structure or evidence citations did not pass validation.",
    };
  }

  const combinedMessage =
    result.provider.errors
      .map((error) => error.message)
      .join(" ");

  if (
    /ollama|unavailable|network|timed out/i.test(
      combinedMessage
    )
  ) {
    return {
      kind: "provider-offline",
      title: "Local ATLAS is offline",
      message:
        "Make sure Ollama is running locally and the configured model is available, then try again.",
    };
  }

  return {
    kind: "provider-failure",
    title: "ATLAS could not complete the request",
    message:
      "The reasoning provider failed safely. Your LifeOS state was not changed.",
  };
}

export function isSuccessfulOrchestration(
  result: AtlasAIOrchestrationResult
): boolean {
  return (
    result.provider.invocationStatus ===
    "success"
  );
}

export function getVisibleResult(
  state: AtlasInteractionState
): AtlasAIOrchestrationResult | undefined {
  return state.result;
}
