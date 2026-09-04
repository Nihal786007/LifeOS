// ==========================================
// LifeOS ATLAS React Interaction Controller
// ==========================================
//
// Reads the canonical snapshot and owns request
// lifecycle only. It does not know which provider
// implementation is behind the orchestrator.
// ==========================================

import {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
} from "react";

import type {
  AtlasAIOrchestrator,
} from "../orchestration/AtlasAIOrchestrator";

import {
  useAtlasCanonicalState,
} from "../state/useAtlasCanonicalState";

import {
  useAtlasMemory,
} from "../memory/useAtlasMemory";

import {
  atlasInteractionReducer,
  getAtlasInteractionError,
  INITIAL_ATLAS_INTERACTION_STATE,
  isSuccessfulOrchestration,
} from "./interactionState.ts";

export function useAtlasInteraction(
  orchestrator: AtlasAIOrchestrator
) {
  const canonicalState =
    useAtlasCanonicalState();
  const memory = useAtlasMemory();

  const deterministic = useMemo(
    () =>
      orchestrator.buildDeterministicPackage(
        canonicalState
      ),
    [orchestrator, canonicalState]
  );

  const [state, dispatch] = useReducer(
    atlasInteractionReducer,
    INITIAL_ATLAS_INTERACTION_STATE
  );

  const sequence = useRef(0);
  const activeRequestId =
    useRef<string | undefined>(undefined);
  const previousSnapshot = useRef(
    canonicalState.capturedAt
  );

  useEffect(() => {
    if (
      previousSnapshot.current ===
      canonicalState.capturedAt
    ) {
      return;
    }

    previousSnapshot.current =
      canonicalState.capturedAt;
    activeRequestId.current = undefined;
    dispatch({ type: "source-changed" });
  }, [canonicalState.capturedAt]);

  const ask = useCallback(
    async (question: string) => {
      const prompt = question.trim();

      if (prompt.length === 0) {
        return;
      }

      sequence.current += 1;

      const requestId = [
        "atlas-ui",
        canonicalState.capturedAt,
        sequence.current,
      ].join(":");

      activeRequestId.current = requestId;
      dispatch({
        type: "request-started",
        requestId,
      });

      const result = await orchestrator.reason({
        state: canonicalState,
        requestId,
        purpose: "grounded-answer",
        prompt,
        memory: memory.activeMemories,
        conversation: state.conversation,
      });

      if (
        activeRequestId.current !== requestId
      ) {
        return;
      }

      activeRequestId.current = undefined;

      if (isSuccessfulOrchestration(result)) {
        const assistantContent =
          result.provider.content;

        if (!assistantContent) {
          return;
        }

        dispatch({
          type: "request-succeeded",
          requestId,
          result,
          userContent: prompt,
          assistantContent,
        });
        return;
      }

      dispatch({
        type: "request-failed",
        requestId,
        result,
        error: getAtlasInteractionError(result),
      });
    },
    [
      canonicalState,
      memory.activeMemories,
      orchestrator,
      state.conversation,
    ]
  );

  const cancel = useCallback(() => {
    const requestId =
      activeRequestId.current;

    if (!requestId) {
      return;
    }

    activeRequestId.current = undefined;
    dispatch({
      type: "request-cancelled",
      requestId,
    });
  }, []);

  return {
    state,
    deterministic,
    memory,
    ask,
    cancel,
  };
}
