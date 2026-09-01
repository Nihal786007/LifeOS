// ==========================================
// LifeOS ATLAS Local Reasoning Dev Probe
// ==========================================
//
// No rendered UI. In development, the explicit
// ?atlas-ollama-probe=1 query flag runs exactly
// one local grounded request from the live
// canonical snapshot and exposes its structured
// result in the browser console and a read-only
// diagnostic window property.
// ==========================================

import {
  useEffect,
  useRef,
} from "react";

import {
  useAtlasCanonicalState,
} from "../state/useAtlasCanonicalState";

import {
  runAtlasLocalReasoningProbe,
} from "./runAtlasLocalReasoningProbe.ts";

import type {
  AtlasLocalReasoningProbeResult,
} from "./runAtlasLocalReasoningProbe";

declare global {
  interface Window {
    __ATLAS_LOCAL_REASONING_RESULT__?:
      Readonly<AtlasLocalReasoningProbeResult>;
  }
}

function isProbeRequested(): boolean {
  return (
    new URLSearchParams(
      window.location.search
    ).get("atlas-ollama-probe") === "1"
  );
}

export function AtlasLocalReasoningProbe() {
  const state = useAtlasCanonicalState();
  const started = useRef(false);

  useEffect(() => {
    if (
      !import.meta.env.DEV ||
      !isProbeRequested() ||
      started.current
    ) {
      return;
    }

    started.current = true;

    void runAtlasLocalReasoningProbe(state)
      .then((result) => {
        const diagnostic = Object.freeze(
          structuredClone(result)
        );

        window.__ATLAS_LOCAL_REASONING_RESULT__ =
          diagnostic;

        console.info(
          "[ATLAS Local Reasoning Probe]",
          JSON.stringify(diagnostic)
        );
      })
      .catch((failure: unknown) => {
        console.error(
          "[ATLAS Local Reasoning Probe] Unexpected harness failure",
          failure
        );
      });
  }, [state]);

  return null;
}
