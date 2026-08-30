// ==========================================
// LifeOS Analytics Insight Engine
// Version: 1.0
// ==========================================
//
// Deterministic interpretation layer for
// trustworthy AnalyticsEngine outputs.
//
// Responsibilities:
// - Convert analytics facts into concise insights
// - Prioritize meaningful changes
// - Surface execution risks
// - Surface strong execution patterns
// - Explain effort and XP direction
// - Never invent facts
//
// IMPORTANT:
// - Pure computation only
// - No React
// - No localStorage
// - No context ownership
// - No AI-generated prose
// - AnalyticsEngine remains source of truth
// ==========================================

import type {
  AnalyticsComparisonMetric,
  EffortDistributionAnalytics,
  PersonalBestsAnalytics,
  PeriodComparisonAnalytics,
  PriorityExecutionAnalytics,
  XPBreakdownAnalytics,
} from "./AnalyticsEngine";

// ==========================================
// Public Types
// ==========================================

export type AnalyticsInsightTone =
  | "positive"
  | "warning"
  | "focus"
  | "info"
  | "record";

export type AnalyticsInsightSource =
  | "comparison"
  | "priority"
  | "effort"
  | "xp"
  | "personal_best";

export interface AnalyticsInsight {
  id: string;

  tone: AnalyticsInsightTone;

  source: AnalyticsInsightSource;

  title: string;

  message: string;

  score: number;
}

export interface AnalyticsInsightInput {
  comparison:
    PeriodComparisonAnalytics;

  priority:
    PriorityExecutionAnalytics;

  effort:
    EffortDistributionAnalytics;

  xp:
    XPBreakdownAnalytics;

  personalBests:
    PersonalBestsAnalytics;
}

export interface AnalyticsInsightResult {
  insights: AnalyticsInsight[];

  primaryInsight?: AnalyticsInsight;

  positiveCount: number;

  warningCount: number;
}

// ==========================================
// Helpers
// ==========================================

function getMetric(
  comparison: PeriodComparisonAnalytics,
  key:
    AnalyticsComparisonMetric["key"]
): AnalyticsComparisonMetric | undefined {
  return comparison.metrics.find(
    (metric) =>
      metric.key === key
  );
}

function formatSignedNumber(
  value: number
): string {
  if (value > 0) {
    return `+${value}`;
  }

  return String(value);
}

function formatPlural(
  value: number,
  singular: string,
  plural: string
): string {
  return value === 1
    ? singular
    : plural;
}

function getPriorityPoint(
  analytics: PriorityExecutionAnalytics,
  priority:
    "high" |
    "medium" |
    "low"
) {
  return analytics.priorities.find(
    (point) =>
      point.priority ===
      priority
  );
}

function getEffortPoint(
  analytics: EffortDistributionAnalytics,
  scope:
    "goal" |
    "personal" |
    "weekly" |
    "standalone" |
    "unresolved"
) {
  return analytics.distribution.find(
    (point) =>
      point.scope ===
      scope
  );
}

function addInsight(
  insights: AnalyticsInsight[],
  insight: AnalyticsInsight
): void {
  const alreadyExists =
    insights.some(
      (item) =>
        item.id ===
        insight.id
    );

  if (!alreadyExists) {
    insights.push(
      insight
    );
  }
}

// ==========================================
// Comparison Insights
// ==========================================

function addComparisonInsights(
  insights: AnalyticsInsight[],
  comparison: PeriodComparisonAnalytics
): void {
  const completionRate =
    getMetric(
      comparison,
      "completion_rate"
    );

  const completedTasks =
    getMetric(
      comparison,
      "completed_tasks"
    );

  const xpEarned =
    getMetric(
      comparison,
      "xp_earned"
    );

  const activeDays =
    getMetric(
      comparison,
      "active_days"
    );

  if (
    completionRate &&
    completionRate.delta >= 10
  ) {
    addInsight(
      insights,
      {
        id:
          "completion-rate-improved",

        tone:
          "positive",

        source:
          "comparison",

        title:
          "Execution improved",

        message:
          `Completion rate improved by ${completionRate.delta} points compared with ${comparison.previousLabel}.`,

        score:
          100 +
          completionRate.delta,
      }
    );
  }

  if (
    completionRate &&
    completionRate.delta <= -10
  ) {
    addInsight(
      insights,
      {
        id:
          "completion-rate-declined",

        tone:
          "warning",

        source:
          "comparison",

        title:
          "Execution slowed",

        message:
          `Completion rate declined by ${Math.abs(
            completionRate.delta
          )} points compared with ${comparison.previousLabel}.`,

        score:
          120 +
          Math.abs(
            completionRate.delta
          ),
      }
    );
  }

  if (
    completedTasks &&
    completedTasks.delta >= 3
  ) {
    addInsight(
      insights,
      {
        id:
          "completed-tasks-increased",

        tone:
          "positive",

        source:
          "comparison",

        title:
          "More work shipped",

        message:
          `You completed ${completedTasks.delta} more ${formatPlural(
            completedTasks.delta,
            "task",
            "tasks"
          )} than in ${comparison.previousLabel}.`,

        score:
          75 +
          completedTasks.delta,
      }
    );
  }

  if (
    completedTasks &&
    completedTasks.delta <= -3
  ) {
    addInsight(
      insights,
      {
        id:
          "completed-tasks-decreased",

        tone:
          "focus",

        source:
          "comparison",

        title:
          "Execution volume dropped",

        message:
          `You completed ${Math.abs(
            completedTasks.delta
          )} fewer ${formatPlural(
            Math.abs(
              completedTasks.delta
            ),
            "task",
            "tasks"
          )} than in ${comparison.previousLabel}.`,

        score:
          80 +
          Math.abs(
            completedTasks.delta
          ),
      }
    );
  }

  if (
    activeDays &&
    activeDays.delta >= 2
  ) {
    addInsight(
      insights,
      {
        id:
          "active-days-increased",

        tone:
          "positive",

        source:
          "comparison",

        title:
          "Consistency strengthened",

        message:
          `You were active on ${activeDays.delta} more ${formatPlural(
            activeDays.delta,
            "day",
            "days"
          )} than in ${comparison.previousLabel}.`,

        score:
          70 +
          activeDays.delta,
      }
    );
  }

  if (
    activeDays &&
    activeDays.delta <= -2
  ) {
    addInsight(
      insights,
      {
        id:
          "active-days-decreased",

        tone:
          "focus",

        source:
          "comparison",

        title:
          "Consistency weakened",

        message:
          `You were active on ${Math.abs(
            activeDays.delta
          )} fewer ${formatPlural(
            Math.abs(
              activeDays.delta
            ),
            "day",
            "days"
          )} than in ${comparison.previousLabel}.`,

        score:
          78 +
          Math.abs(
            activeDays.delta
          ),
      }
    );
  }

  if (
    xpEarned &&
    xpEarned.delta >= 250
  ) {
    addInsight(
      insights,
      {
        id:
          "xp-increased",

        tone:
          "info",

        source:
          "comparison",

        title:
          "XP momentum increased",

        message:
          `You earned ${formatSignedNumber(
            xpEarned.delta
          )} more XP than in ${comparison.previousLabel}.`,

        score:
          55,
      }
    );
  }
}

// ==========================================
// Priority Insights
// ==========================================

function addPriorityInsights(
  insights: AnalyticsInsight[],
  analytics: PriorityExecutionAnalytics
): void {
  const high =
    getPriorityPoint(
      analytics,
      "high"
    );

  const medium =
    getPriorityPoint(
      analytics,
      "medium"
    );

  if (
    high &&
    high.totalTasks > 0 &&
    high.completionRate >= 80
  ) {
    addInsight(
      insights,
      {
        id:
          "high-priority-strong",

        tone:
          "positive",

        source:
          "priority",

        title:
          "High-priority execution is strong",

        message:
          `${high.completionRate}% of high-priority work in this period is complete.`,

        score:
          95,
      }
    );
  }

  if (
    high &&
    high.totalTasks >= 2 &&
    high.completionRate < 50
  ) {
    addInsight(
      insights,
      {
        id:
          "high-priority-low",

        tone:
          "warning",

        source:
          "priority",

        title:
          "Important work needs attention",

        message:
          `Only ${high.completionRate}% of high-priority work in this period is complete.`,

        score:
          125,
      }
    );
  }

  if (
    high &&
    medium &&
    high.totalTasks > 0 &&
    medium.totalTasks > 0
  ) {
    const gap =
      medium.completionRate -
      high.completionRate;

    if (gap >= 20) {
      addInsight(
        insights,
        {
          id:
            "priority-misalignment",

          tone:
            "focus",

          source:
            "priority",

          title:
            "Priority execution is misaligned",

          message:
            `High-priority completion trails medium-priority work by ${gap} points.`,

          score:
            115 +
            gap,
        }
      );
    }
  }
}

// ==========================================
// Effort Insights
// ==========================================

function addEffortInsights(
  insights: AnalyticsInsight[],
  analytics: EffortDistributionAnalytics
): void {
  if (
    analytics.totalCompletedTasks <=
    0
  ) {
    return;
  }

  const goal =
    getEffortPoint(
      analytics,
      "goal"
    );

  const personal =
    getEffortPoint(
      analytics,
      "personal"
    );

  const standalone =
    getEffortPoint(
      analytics,
      "standalone"
    );

  if (
    goal &&
    goal.percentage >= 60
  ) {
    addInsight(
      insights,
      {
        id:
          "goal-effort-dominant",

        tone:
          "positive",

        source:
          "effort",

        title:
          "Effort is strongly goal-aligned",

        message:
          `${goal.percentage}% of completed work supported Life Goals.`,

        score:
          90 +
          Math.round(
            goal.percentage / 10
          ),
      }
    );
  }

  if (
    personal &&
    personal.percentage >= 60
  ) {
    addInsight(
      insights,
      {
        id:
          "personal-effort-dominant",

        tone:
          "info",

        source:
          "effort",

        title:
          "Personal work dominated execution",

        message:
          `${personal.percentage}% of completed work was directed to Personal Planning.`,

        score:
          65,
      }
    );
  }

  if (
    standalone &&
    standalone.percentage >=
      50 &&
    analytics.totalCompletedTasks >=
      4
  ) {
    addInsight(
      insights,
      {
        id:
          "standalone-effort-high",

        tone:
          "focus",

        source:
          "effort",

        title:
          "Much of your work is unaligned",

        message:
          `${standalone.percentage}% of completed work was standalone rather than connected to a planning hierarchy.`,

        score:
          88,
      }
    );
  }

  if (
    analytics.unresolvedTasks > 0
  ) {
    addInsight(
      insights,
      {
        id:
          "unresolved-relationships",

        tone:
          "warning",

        source:
          "effort",

        title:
          "Planning relationships need review",

        message:
          `${analytics.unresolvedTasks} completed ${formatPlural(
            analytics.unresolvedTasks,
            "task has",
            "tasks have"
          )} an unresolved planning relationship.`,

        score:
          130,
      }
    );
  }
}

// ==========================================
// XP Insights
// ==========================================

function addXPInsights(
  insights: AnalyticsInsight[],
  analytics: XPBreakdownAnalytics
): void {
  if (
    analytics.totalXP <= 0
  ) {
    return;
  }

  const visible =
    analytics.breakdown.filter(
      (point) =>
        point.xpEarned > 0
    );

  const topSource =
    [...visible].sort(
      (
        left,
        right
      ) =>
        right.xpEarned -
        left.xpEarned
    )[0];

  if (
    topSource &&
    topSource.percentage >= 50
  ) {
    addInsight(
      insights,
      {
        id:
          "xp-dominant-source",

        tone:
          "info",

        source:
          "xp",

        title:
          "One source drove most XP",

        message:
          `${topSource.label} generated ${topSource.percentage}% of XP earned in this period.`,

        score:
          60,
      }
    );
  }

  const strategicXP =
    analytics.breakdown
      .filter(
        (point) =>
          point.category ===
            "monthly" ||
          point.category ===
            "life_goal"
      )
      .reduce(
        (
          total,
          point
        ) =>
          total +
          point.xpEarned,
        0
      );

  const strategicPercentage =
    analytics.totalXP >
    0
      ? Math.round(
          (
            strategicXP /
            analytics.totalXP
          ) * 100
        )
      : 0;

  if (
    strategicPercentage >= 60
  ) {
    addInsight(
      insights,
      {
        id:
          "strategic-xp",

        tone:
          "positive",

        source:
          "xp",

        title:
          "XP came from major outcomes",

        message:
          `${strategicPercentage}% of XP came from Monthly Outcomes and Life Goals.`,

        score:
          85,
      }
    );
  }

  if (
    analytics.zeroXPCompletionEvents >
    0
  ) {
    addInsight(
      insights,
      {
        id:
          "xp-protection-active",

        tone:
          "info",

        source:
          "xp",

        title:
          "XP protection was active",

        message:
          `${analytics.zeroXPCompletionEvents} repeated ${formatPlural(
            analytics.zeroXPCompletionEvents,
            "completion earned",
            "completions earned"
          )} no additional XP.`,

        score:
          45,
      }
    );
  }
}

// ==========================================
// Personal Best Insights
// ==========================================

function addPersonalBestInsights(
  insights: AnalyticsInsight[],
  analytics: PersonalBestsAnalytics
): void {
  const streak =
    analytics.longestExecutionStreak;

  if (
    streak.days >= 3
  ) {
    addInsight(
      insights,
      {
        id:
          "longest-streak",

        tone:
          "record",

        source:
          "personal_best",

        title:
          "Consistency record",

        message:
          `Your longest recorded execution streak is ${streak.days} consecutive days.`,

        score:
          72 +
          Math.min(
            streak.days,
            20
          ),
      }
    );
  }

  if (
    analytics.mostTasksDay &&
    analytics.mostTasksDay.completedTasks >=
      5
  ) {
    addInsight(
      insights,
      {
        id:
          "most-tasks-record",

        tone:
          "record",

        source:
          "personal_best",

        title:
          "Execution record",

        message:
          `Your strongest task day reached ${analytics.mostTasksDay.completedTasks} completed tasks.`,

        score:
          68,
      }
    );
  }
}

// ==========================================
// Engine
// ==========================================

export class AnalyticsInsightEngine {
  static analyze(
    input: AnalyticsInsightInput
  ): AnalyticsInsightResult {
    const insights:
      AnalyticsInsight[] = [];

    addComparisonInsights(
      insights,
      input.comparison
    );

    addPriorityInsights(
      insights,
      input.priority
    );

    addEffortInsights(
      insights,
      input.effort
    );

    addXPInsights(
      insights,
      input.xp
    );

    addPersonalBestInsights(
      insights,
      input.personalBests
    );

    const orderedInsights =
      [...insights]
        .sort(
          (
            left,
            right
          ) =>
            right.score -
            left.score
        )
        .slice(
          0,
          5
        );

    const positiveCount =
      orderedInsights.filter(
        (insight) =>
          insight.tone ===
            "positive" ||
          insight.tone ===
            "record"
      ).length;

    const warningCount =
      orderedInsights.filter(
        (insight) =>
          insight.tone ===
            "warning" ||
          insight.tone ===
            "focus"
      ).length;

    return {
      insights:
        orderedInsights,

      primaryInsight:
        orderedInsights[0],

      positiveCount,

      warningCount,
    };
  }
}