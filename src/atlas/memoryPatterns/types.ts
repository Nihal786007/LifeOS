// ==========================================
// LifeOS ATLAS Memory + Pattern Types
// ==========================================

import type {
  AtlasIntelligenceReport,
} from "../coordinator/types";

import type {
  AtlasCanonicalState,
} from "../state/types";

export const ATLAS_PATTERN_REPORT_VERSION =
  "1.0.0" as const;

export interface AtlasPatternInput {
  state: AtlasCanonicalState;
  report: AtlasIntelligenceReport;
}

export type AtlasPatternKind =
  | "recurring-overdue-behavior"
  | "execution-consistency-trend"
  | "habit-consistency-trend"
  | "repeated-planning-revisions"
  | "sustained-positive-momentum";

export type AtlasPatternDirection =
  | "improving"
  | "declining"
  | "stable"
  | "recurring"
  | "sustained";

export interface AtlasPatternPeriod {
  label: string;
  startDate: string;
  endDate: string;
}

export interface AtlasPatternTimeWindow {
  observed: AtlasPatternPeriod;
  baseline?: AtlasPatternPeriod;
}

export type AtlasPatternComparisonKind =
  | "previous-period"
  | "threshold";

export interface AtlasPatternComparison {
  kind: AtlasPatternComparisonKind;
  baselineLabel: string;
  observedValue: number;
  baselineValue: number;
  difference: number;
  unit: string;
  interpretation: string;
}

export interface AtlasPatternMeasurement {
  name: string;
  value: number;
  unit: string;
}

export type AtlasPatternEvidenceSource =
  | "execution-history"
  | "habit-completion-history"
  | "habit-definitions"
  | "task-records"
  | "current-intelligence-report";

export interface AtlasPatternEvidence {
  source: AtlasPatternEvidenceSource;
  reference: string;
  recordIds: readonly number[];
  description: string;
}

export interface AtlasPatternFinding {
  id: string;
  kind: AtlasPatternKind;
  direction: AtlasPatternDirection;
  title: string;
  summary: string;
  timeWindow: AtlasPatternTimeWindow;
  measurements: readonly AtlasPatternMeasurement[];
  comparison: AtlasPatternComparison;
  evidence: readonly AtlasPatternEvidence[];
}

export type AtlasHistorySource =
  | "execution-history"
  | "habit-completion-history"
  | "task-records";

export interface AtlasHistoryCoverage {
  source: AtlasHistorySource;
  recordCount: number;
  firstRecordedDate?: string;
  lastRecordedDate?: string;
}

export type AtlasPatternLimitationId =
  | "snapshot-mismatch"
  | "recurring-risk-history-unavailable"
  | "planning-alignment-history-unavailable";

export interface AtlasPatternLimitation {
  id: AtlasPatternLimitationId;
  source: AtlasPatternEvidenceSource;
  reason: string;
}

export interface AtlasPatternIntelligenceReport {
  version:
    typeof ATLAS_PATTERN_REPORT_VERSION;
  sourceReportVersion: string;
  snapshotCapturedAt: string;
  coverage: readonly AtlasHistoryCoverage[];
  patterns: readonly AtlasPatternFinding[];
  limitations: readonly AtlasPatternLimitation[];
}
