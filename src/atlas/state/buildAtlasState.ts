// ==========================================
// LifeOS ATLAS State Builder
// ==========================================
//
// Produces one immutable-at-the-boundary snapshot
// for ATLAS engines. This prevents each engine
// from reading different UI state at different
// moments during an intelligence run.
// ==========================================

import type {
  AtlasCanonicalState,
  AtlasStateInput,
} from "./types";

export function buildAtlasState(
  input: AtlasStateInput,
  capturedAt = new Date()
): AtlasCanonicalState {
  return {
    capturedAt: capturedAt.toISOString(),
    tasks: [...input.tasks],
    habits: [...input.habits],
    lifeGoals: [...input.lifeGoals],
    monthlyTargets: [...input.monthlyTargets],
    weeklyTargets: [...input.weeklyTargets],
    executionHistory: [...input.executionHistory],
    captures: [...input.captures],
    profile: {
      ...input.profile,
    },
  };
}
