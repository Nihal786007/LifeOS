// ==========================================
// LifeOS ATLAS Reasoning Context Builder
// ==========================================
//
// Assembles existing deterministic ATLAS outputs
// without recomputing or enriching their content.
// ==========================================

import {
  ATLAS_REASONING_CONTEXT_VERSION,
} from "./types.ts";

import type {
  AtlasReasoningContext,
  AtlasReasoningContextInput,
  AtlasReasoningLimitation,
} from "./types";

function clone<T>(value: T): T {
  return structuredClone(value);
}

function getIntegrityLimitations(
  input: AtlasReasoningContextInput
): AtlasReasoningLimitation[] {
  const expectedSnapshot =
    input.intelligenceReport.snapshotCapturedAt;

  const snapshotEntries = [
    [
      "dailyBrief",
      input.dailyBrief.snapshotCapturedAt,
    ],
    [
      "recommendationReport",
      input.recommendationReport.snapshotCapturedAt,
    ],
    [
      "patternReport",
      input.patternReport.snapshotCapturedAt,
    ],
  ] as const;

  const mismatchedSnapshots = snapshotEntries
    .filter(
      ([, value]) => value !== expectedSnapshot
    )
    .map(([name]) => name);

  const expectedVersion =
    input.intelligenceReport.version;

  const versionEntries = [
    [
      "dailyBrief",
      input.dailyBrief.sourceReportVersion,
    ],
    [
      "recommendationReport",
      input.recommendationReport.sourceReportVersion,
    ],
    [
      "patternReport",
      input.patternReport.sourceReportVersion,
    ],
  ] as const;

  const mismatchedVersions = versionEntries
    .filter(
      ([, value]) => value !== expectedVersion
    )
    .map(([name]) => name);

  const limitations: AtlasReasoningLimitation[] = [];

  if (mismatchedSnapshots.length > 0) {
    limitations.push({
      id: "source-snapshot-mismatch",
      origin: "reasoning-context",
      evidenceSource: "source-metadata",
      reason:
        `These sources do not match the intelligence snapshot: ${mismatchedSnapshots.join(
          ", "
        )}.`,
    });
  }

  if (mismatchedVersions.length > 0) {
    limitations.push({
      id: "source-version-mismatch",
      origin: "reasoning-context",
      evidenceSource: "source-metadata",
      reason:
        `These sources were not derived from intelligence report version ${expectedVersion}: ${mismatchedVersions.join(
          ", "
        )}.`,
    });
  }

  return limitations;
}

export function buildAtlasReasoningContext(
  input: AtlasReasoningContextInput
): AtlasReasoningContext {
  const patternLimitations =
    input.patternReport.limitations.map(
      (limitation): AtlasReasoningLimitation => ({
        id: limitation.id,
        origin: "pattern-intelligence",
        evidenceSource: limitation.source,
        reason: limitation.reason,
      })
    );

  return {
    version: ATLAS_REASONING_CONTEXT_VERSION,
    snapshotCapturedAt:
      input.intelligenceReport.snapshotCapturedAt,
    sourceVersions: {
      intelligenceReport:
        input.intelligenceReport.version,
      dailyBrief: input.dailyBrief.version,
      recommendationReport:
        input.recommendationReport.version,
      patternReport:
        input.patternReport.version,
    },
    profile: {
      name: input.profile.name,
      occupation: input.profile.occupation,
      timezone: input.profile.timezone,
      atlasPersonality:
        input.profile.atlasPersonality,
    },
    factualState: clone(
      input.intelligenceReport.understanding
    ),
    priorities: clone(
      input.intelligenceReport.priorities
    ),
    risks: clone(
      input.intelligenceReport.risk
    ),
    dailyBrief: clone(input.dailyBrief),
    recommendations: clone(
      input.recommendationReport.recommendations
    ),
    historyCoverage: clone(
      input.patternReport.coverage
    ),
    historicalPatterns: clone(
      input.patternReport.patterns
    ),
    limitations: clone([
      ...patternLimitations,
      ...getIntegrityLimitations(input),
    ]),
  };
}
