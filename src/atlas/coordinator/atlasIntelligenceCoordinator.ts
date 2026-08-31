// ==========================================
// LifeOS ATLAS Intelligence Coordinator
// ==========================================
//
// Pure composition boundary for deterministic
// ATLAS intelligence. The coordinator receives
// one canonical snapshot and delegates all logic
// to the existing specialized engines.
//
// It does not read contexts, storage, services,
// clocks, or mutation APIs.
// ==========================================

import {
  PriorityEngine,
} from "../priority/priorityEngine.ts";

import {
  RiskDriftEngine,
} from "../risk/riskDriftEngine.ts";

import type {
  AtlasCanonicalState,
} from "../state/types";

import {
  StateUnderstandingEngine,
} from "../understanding/stateUnderstandingEngine.ts";

import {
  ATLAS_INTELLIGENCE_REPORT_VERSION,
} from "./types.ts";

import type {
  AtlasIntelligenceReport,
} from "./types";

export class AtlasIntelligenceCoordinator {
  private readonly understandingEngine =
    new StateUnderstandingEngine();

  private readonly priorityEngine =
    new PriorityEngine();

  private readonly riskDriftEngine =
    new RiskDriftEngine();

  createReport(
    state: AtlasCanonicalState
  ): AtlasIntelligenceReport {
    return {
      version:
        ATLAS_INTELLIGENCE_REPORT_VERSION,

      snapshotCapturedAt:
        state.capturedAt,

      understanding:
        this.understandingEngine.understand(
          state
        ),

      priorities:
        this.priorityEngine.rank(
          state
        ),

      risk:
        this.riskDriftEngine.assess(
          state
        ),
    };
  }
}
