// ==========================================
// LifeOS ATLAS Intelligence Report
// ==========================================

import type {
  AtlasPriorityResult,
} from "../priority/types";

import type {
  AtlasRiskAssessment,
} from "../risk/types";

import type {
  AtlasStateUnderstanding,
} from "../understanding/types";

export const ATLAS_INTELLIGENCE_REPORT_VERSION =
  "1.0.0" as const;

export interface AtlasIntelligenceReport {
  version:
    typeof ATLAS_INTELLIGENCE_REPORT_VERSION;

  snapshotCapturedAt: string;

  understanding:
    AtlasStateUnderstanding;

  priorities:
    AtlasPriorityResult;

  risk:
    AtlasRiskAssessment;
}
