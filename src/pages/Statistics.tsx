import {
  useEffect,
  useMemo,
  useState,
} from "react";

import DailyReview from "../components/statistics/DailyReview";
import WeeklyReview from "../components/statistics/WeeklyReview";
import AtlasReport from "../components/statistics/AtlasReport";

import StatisticsPieChart from "../components/StatisticsPieChart";

import AnalyticsPeriodSwitcher from "../components/analytics/AnalyticsPeriodSwitcher";
import AnalyticsSummaryGrid from "../components/analytics/AnalyticsSummaryGrid";
import AnalyticsTrendChart from "../components/analytics/AnalyticsTrendChart";
import AnalyticsBarChart from "../components/analytics/AnalyticsBarChart";
import AnalyticsHeatmap from "../components/analytics/AnalyticsHeatmap";
import AnalyticsEffortDistribution from "../components/analytics/AnalyticsEffortDistribution";
import AnalyticsPriorityExecution from "../components/analytics/AnalyticsPriorityExecution";
import AnalyticsXPBreakdown from "../components/analytics/AnalyticsXPBreakdown";
import AnalyticsPersonalBests from "../components/analytics/AnalyticsPersonalBests";
import AnalyticsPeriodComparison from "../components/analytics/AnalyticsPeriodComparison";

import type {
  AnalyticsPeriod,
} from "../components/analytics/AnalyticsPeriodSwitcher";

import {
  useTasks,
} from "../context/TaskContext";

import {
  useLifeGoals,
} from "../context/LifeGoalsContext";

import {
  useMonthlyPlanning,
} from "../context/MonthlyPlanningContext";

import {
  useWeeklyPlanning,
} from "../context/WeeklyPlanningContext";

import {
  ExecutionHistoryService,
} from "../services/ExecutionHistoryService";

import {
  AnalyticsEngine,
} from "../engines/AnalyticsEngine";

import {
  AnalyticsInsightEngine,
} from "../engines/AnalyticsInsightEngine";

import type {
  ExecutionRecord,
} from "../shared/execution";

import Card from "../components/ui/Card";
import PageHero from "../components/ui/PageHero";

// ==========================================
// Types
// ==========================================

type TrendMetric =
  | "tasks"
  | "xp";

type BarMetric =
  | "tasks"
  | "completion"
  | "xp";

// ==========================================
// Helpers
// ==========================================

function formatMonthDay(
  value: string
): string {
  const [
    year,
    month,
    day,
  ] = value
    .split("-")
    .map(Number);

  const date =
    new Date(
      year,
      month - 1,
      day
    );

  return date.toLocaleDateString(
    undefined,
    {
      month:
        "short",

      day:
        "numeric",
    }
  );
}

// ==========================================
// Page
// ==========================================

export default function Statistics() {
  // ========================================
  // Canonical Planning State
  // ========================================

  const {
    tasks,
  } = useTasks();

  const {
    lifeGoals,
  } = useLifeGoals();

  const {
    monthlyPlans,
  } = useMonthlyPlanning();

  const {
    weeklyTargets,
  } = useWeeklyPlanning();

  // ========================================
  // Stable Reference Date
  // ========================================

  const referenceDate =
    useMemo(
      () =>
        new Date(),
      []
    );

  // ========================================
  // UI State
  // ========================================

  const [
    period,
    setPeriod,
  ] =
    useState<AnalyticsPeriod>(
      "week"
    );

  const [
    trendMetric,
    setTrendMetric,
  ] =
    useState<TrendMetric>(
      "tasks"
    );

  const [
    barMetric,
    setBarMetric,
  ] =
    useState<BarMetric>(
      "tasks"
    );

  // ========================================
  // Execution History
  // ========================================

  const [
    executionRecords,
    setExecutionRecords,
  ] =
    useState<ExecutionRecord[]>(
      () =>
        ExecutionHistoryService.getAll()
    );

  useEffect(() => {
    function refreshHistory() {
      setExecutionRecords(
        ExecutionHistoryService.getAll()
      );
    }

    refreshHistory();

    const unsubscribe =
      ExecutionHistoryService.subscribe(
        refreshHistory
      );

    return unsubscribe;
  }, []);

  // ========================================
  // Analytics State
  // ========================================

  const analyticsState =
    useMemo(
      () => ({
        tasks,

        executionRecords,
      }),
      [
        tasks,
        executionRecords,
      ]
    );

  const relationshipAnalyticsState =
    useMemo(
      () => ({
        tasks,

        executionRecords,

        lifeGoals,

        monthlyTargets:
          monthlyPlans,

        weeklyTargets,
      }),
      [
        tasks,
        executionRecords,
        lifeGoals,
        monthlyPlans,
        weeklyTargets,
      ]
    );

  // ========================================
  // Canonical Analytics
  // ========================================

  const analytics =
    useMemo(
      () =>
        AnalyticsEngine.analyze(
          analyticsState,
          referenceDate
        ),
      [
        analyticsState,
        referenceDate,
      ]
    );

  const {
    overall,
    today,
    week,
    month,
    year,
  } = analytics;

  // ========================================
  // Selected Period
  // ========================================

  const selectedAnalytics =
    useMemo(() => {
      switch (period) {
        case "today":
          return {
            label:
              "Today",

            completionRate:
              today.completionRate,

            completedTasks:
              today.completedTasks,

            completedDueTasks:
              today.completedDueTasks,

            pendingTasks:
              today.pendingTasks,

            xpEarned:
              today.xpEarned,

            activeDays:
              undefined,

            totalDays:
              undefined,
          };

        case "month":
          return {
            label:
              month.monthLabel,

            completionRate:
              month.completionRate,

            completedTasks:
              month.completedTasks,

            completedDueTasks:
              month.completedDueTasks,

            pendingTasks:
              month.pendingTasks,

            xpEarned:
              month.xpEarned,

            activeDays:
              month.activeDays,

            totalDays:
              month.totalDays,
          };

        case "year":
          return {
            label:
              String(
                year.year
              ),

            completionRate:
              year.completionRate,

            completedTasks:
              year.completedTasks,

            completedDueTasks:
              year.completedDueTasks,

            pendingTasks:
              year.pendingTasks,

            xpEarned:
              year.xpEarned,

            activeDays:
              year.activeDays,

            totalDays:
              year.totalDays,
          };

        case "week":
        default:
          return {
            label:
              `${week.weekStartDate} → ${week.weekEndDate}`,

            completionRate:
              week.completionRate,

            completedTasks:
              week.completedTasks,

            completedDueTasks:
              week.completedDueTasks,

            pendingTasks:
              week.pendingTasks,

            xpEarned:
              week.xpEarned,

            activeDays:
              undefined,

            totalDays:
              undefined,
          };
      }
    }, [
      period,
      today,
      week,
      month,
      year,
    ]);

  // ========================================
  // Selected Trend
  // ========================================

  const trendData =
    useMemo(() => {
      switch (period) {
        case "today":
          return [
            {
              label:
                "Today",

              completedTasks:
                today.completedTasks,

              xpEarned:
                today.xpEarned,
            },
          ];

        case "month":
          return month.trend.map(
            (point) => ({
              label:
                formatMonthDay(
                  point.date
                ),

              completedTasks:
                point.completedTasks,

              xpEarned:
                point.xpEarned,
            })
          );

        case "year":
          return year.months.map(
            (point) => ({
              label:
                point.label,

              completedTasks:
                point.completedTasks,

              xpEarned:
                point.xpEarned,
            })
          );

        case "week":
        default:
          return week.trend.map(
            (point) => ({
              label:
                point.label,

              completedTasks:
                point.completedTasks,

              xpEarned:
                point.xpEarned,
            })
          );
      }
    }, [
      period,
      today,
      week,
      month,
      year,
    ]);

  // ========================================
  // Bar Comparison Data
  // ========================================

  const barData =
    useMemo(() => {
      if (
        period ===
        "month"
      ) {
        return month.weeks.map(
          (point) => ({
            label:
              point.label,

            completedTasks:
              point.completedTasks,

            completionRate:
              point.completionRate,

            xpEarned:
              point.xpEarned,
          })
        );
      }

      if (
        period ===
        "year"
      ) {
        return year.months.map(
          (point) => ({
            label:
              point.label,

            completedTasks:
              point.completedTasks,

            completionRate:
              point.completionRate,

            xpEarned:
              point.xpEarned,
          })
        );
      }

      return [];
    }, [
      period,
      month,
      year,
    ]);

  // ========================================
  // Month Heatmap
  // ========================================

  const monthHeatmapData =
    useMemo(
      () =>
        month.trend.map(
          (point) => ({
            date:
              point.date,

            completedTasks:
              point.completedTasks,

            xpEarned:
              point.xpEarned,
          })
        ),
      [
        month,
      ]
    );

  // ========================================
  // Year Heatmap
  // ========================================

  const yearHeatmapData =
    useMemo(() => {
      const points = [];

      for (
        let monthIndex = 0;
        monthIndex < 12;
        monthIndex += 1
      ) {
        const monthAnalytics =
          AnalyticsEngine.getMonth(
            analyticsState,
            new Date(
              year.year,
              monthIndex,
              1
            )
          );

        points.push(
          ...monthAnalytics.trend.map(
            (point) => ({
              date:
                point.date,

              completedTasks:
                point.completedTasks,

              xpEarned:
                point.xpEarned,
            })
          )
        );
      }

      return points;
    }, [
      analyticsState,
      year.year,
    ]);

  const heatmapData =
    period ===
    "year"
      ? yearHeatmapData
      : monthHeatmapData;

  // ========================================
  // Effort Distribution
  // ========================================

  const effortAnalytics =
    useMemo(() => {
      switch (period) {
        case "today":
          return AnalyticsEngine.getDayEffort(
            relationshipAnalyticsState,
            referenceDate
          );

        case "month":
          return AnalyticsEngine.getMonthEffort(
            relationshipAnalyticsState,
            referenceDate
          );

        case "year":
          return AnalyticsEngine.getYearEffort(
            relationshipAnalyticsState,
            referenceDate
          );

        case "week":
        default:
          return AnalyticsEngine.getWeekEffort(
            relationshipAnalyticsState,
            referenceDate
          );
      }
    }, [
      period,
      relationshipAnalyticsState,
      referenceDate,
    ]);

  // ========================================
  // Priority Execution
  // ========================================

  const priorityAnalytics =
    useMemo(() => {
      switch (period) {
        case "today":
          return AnalyticsEngine.getDayPriorityExecution(
            analyticsState,
            referenceDate
          );

        case "month":
          return AnalyticsEngine.getMonthPriorityExecution(
            analyticsState,
            referenceDate
          );

        case "year":
          return AnalyticsEngine.getYearPriorityExecution(
            analyticsState,
            referenceDate
          );

        case "week":
        default:
          return AnalyticsEngine.getWeekPriorityExecution(
            analyticsState,
            referenceDate
          );
      }
    }, [
      period,
      analyticsState,
      referenceDate,
    ]);

  // ========================================
  // XP Breakdown
  // ========================================

  const xpBreakdown =
    useMemo(() => {
      switch (period) {
        case "today":
          return AnalyticsEngine.getDayXPBreakdown(
            analyticsState,
            referenceDate
          );

        case "month":
          return AnalyticsEngine.getMonthXPBreakdown(
            analyticsState,
            referenceDate
          );

        case "year":
          return AnalyticsEngine.getYearXPBreakdown(
            analyticsState,
            referenceDate
          );

        case "week":
        default:
          return AnalyticsEngine.getWeekXPBreakdown(
            analyticsState,
            referenceDate
          );
      }
    }, [
      period,
      analyticsState,
      referenceDate,
    ]);

  // ========================================
  // Previous-Period Comparison
  // ========================================

  const periodComparison =
    useMemo(() => {
      switch (period) {
        case "today":
          return AnalyticsEngine.getDayComparison(
            analyticsState,
            referenceDate
          );

        case "month":
          return AnalyticsEngine.getMonthComparison(
            analyticsState,
            referenceDate
          );

        case "year":
          return AnalyticsEngine.getYearComparison(
            analyticsState,
            referenceDate
          );

        case "week":
        default:
          return AnalyticsEngine.getWeekComparison(
            analyticsState,
            referenceDate
          );
      }
    }, [
      period,
      analyticsState,
      referenceDate,
    ]);

  // ========================================
  // Personal Bests
  // ========================================

  const personalBests =
    useMemo(
      () =>
        AnalyticsEngine.getPersonalBests(
          analyticsState,
          referenceDate
        ),
      [
        analyticsState,
        referenceDate,
      ]
    );

  // ========================================
  // ATLAS Intelligence
  // ========================================

  const atlasIntelligence =
    useMemo(
      () =>
        AnalyticsInsightEngine.analyze({
          comparison:
            periodComparison,

          priority:
            priorityAnalytics,

          effort:
            effortAnalytics,

          xp:
            xpBreakdown,

          personalBests,
        }),
      [
        periodComparison,
        priorityAnalytics,
        effortAnalytics,
        xpBreakdown,
        personalBests,
      ]
    );

  // ========================================
  // Period Description
  // ========================================

  const periodDescription =
    useMemo(() => {
      switch (period) {
        case "today":
          return "Your execution activity for today.";

        case "month":
          return `Your performance across ${month.monthLabel}.`;

        case "year":
          return `Your execution journey across ${year.year}.`;

        case "week":
        default:
          return `Your performance from ${week.weekStartDate} to ${week.weekEndDate}.`;
      }
    }, [
      period,
      week,
      month,
      year,
    ]);

  // ========================================
  // Bar Labels
  // ========================================

  const barSectionTitle =
    period === "month"
      ? "Weekly Comparison"
      : "Monthly Comparison";

  const barSectionDescription =
    period === "month"
      ? "Compare your real calendar-week performance across this month."
      : "Compare your execution across every month of the year.";

  // ========================================
  // Heatmap Labels
  // ========================================

  const heatmapTitle =
    period === "month"
      ? "Monthly Consistency"
      : "Yearly Consistency";

  const heatmapDescription =
    period === "month"
      ? `See how consistently you showed up throughout ${month.monthLabel}.`
      : `See your execution consistency across every day of ${year.year}.`;

  // ========================================
  // UI
  // ========================================

  return (
    <div className="space-y-12">

      {/* ======================================
          Hero
      ====================================== */}

      <PageHero
        badge="Execution Intelligence"
        title="Analytics"
        description="See where your effort is going, measure your consistency, and turn real execution history into meaningful progress."
      >
        <Card className="border-cyan-500/20 bg-cyan-500/5">

          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">
            Lifetime Completion
          </p>

          <h2 className="mt-3 text-5xl font-black text-white">
            {
              overall.completionRate
            }%
          </h2>

          <p className="mt-3 text-sm text-slate-400">
            {
              overall.completedTasks
            }{" "}
            of{" "}
            {
              overall.totalTasks
            }{" "}
            tasks completed
          </p>

          <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-slate-800">

            <div
              className="h-full rounded-full bg-cyan-400 transition-all duration-700"
              style={{
                width:
                  `${overall.completionRate}%`,
              }}
            />

          </div>

          <div className="mt-5 border-t border-cyan-500/10 pt-4">

            <p className="text-xs text-slate-500">
              Lifetime XP
            </p>

            <p className="mt-1 text-xl font-black text-amber-300">
              +{
                overall.xpEarned
              }
            </p>

          </div>

        </Card>
      </PageHero>

      {/* ======================================
          Overview
      ====================================== */}

      <section className="space-y-6">

        <div className="flex flex-col gap-4 border-b border-slate-800/70 pb-5 lg:flex-row lg:items-end lg:justify-between">

          <div>

            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-cyan-400/70">
              Overview
            </p>

            <h2 className="mt-2 text-2xl font-bold text-white">
              {
                selectedAnalytics.label
              }
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              {
                periodDescription
              }
            </p>

          </div>

          <AnalyticsPeriodSwitcher
            value={
              period
            }
            onChange={
              setPeriod
            }
          />

        </div>

        <AnalyticsSummaryGrid
          period={
            period
          }
          completionRate={
            selectedAnalytics.completionRate
          }
          completedTasks={
            selectedAnalytics.completedTasks
          }
          xpEarned={
            selectedAnalytics.xpEarned
          }
          pendingTasks={
            selectedAnalytics.pendingTasks
          }
          activeDays={
            selectedAnalytics.activeDays
          }
          totalDays={
            selectedAnalytics.totalDays
          }
        />

        {/* ====================================
            Primary Signal
        ==================================== */}

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.7fr)_minmax(320px,0.72fr)]">

          <Card>

            <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

              <div>

                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-cyan-400/70">
                  Momentum
                </p>

                <h2 className="mt-2 text-2xl font-bold text-white">
                  Execution Trend
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  How your execution moved through this period.
                </p>

              </div>

              <div className="inline-flex rounded-lg border border-slate-800 bg-slate-950 p-1">

                <button
                  type="button"
                  onClick={() =>
                    setTrendMetric(
                      "tasks"
                    )
                  }
                  className={`
                    rounded-md
                    px-4
                    py-2
                    text-xs
                    font-semibold
                    transition

                    ${
                      trendMetric ===
                      "tasks"
                        ? "bg-cyan-500/15 text-cyan-300"
                        : "text-slate-500 hover:text-slate-300"
                    }
                  `}
                >
                  Tasks
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setTrendMetric(
                      "xp"
                    )
                  }
                  className={`
                    rounded-md
                    px-4
                    py-2
                    text-xs
                    font-semibold
                    transition

                    ${
                      trendMetric ===
                      "xp"
                        ? "bg-yellow-500/15 text-yellow-300"
                        : "text-slate-500 hover:text-slate-300"
                    }
                  `}
                >
                  XP
                </button>

              </div>

            </div>

            <AnalyticsTrendChart
              data={
                trendData
              }
              metric={
                trendMetric
              }
            />

          </Card>

          <Card>

            <div className="mb-1">

              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-400/70">
                Planned Work
              </p>

              <h2 className="mt-2 text-xl font-bold text-white">
                Completion
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Planned work completed versus remaining.
              </p>

            </div>

            <StatisticsPieChart
              completedTasks={
                selectedAnalytics.completedDueTasks
              }
              pendingTasks={
                selectedAnalytics.pendingTasks
              }
            />

            <div className="grid grid-cols-2 gap-3">

              <div className="rounded-lg border border-emerald-500/10 bg-emerald-500/5 p-3">

                <p className="text-[11px] text-slate-500">
                  Completed
                </p>

                <p className="mt-1 text-lg font-bold text-emerald-400">
                  {
                    selectedAnalytics.completedDueTasks
                  }
                </p>

              </div>

              <div className="rounded-lg border border-amber-500/10 bg-amber-500/5 p-3">

                <p className="text-[11px] text-slate-500">
                  Remaining
                </p>

                <p className="mt-1 text-lg font-bold text-amber-400">
                  {
                    selectedAnalytics.pendingTasks
                  }
                </p>

              </div>

            </div>

          </Card>

        </div>

        {/* ====================================
            Momentum Shift
        ==================================== */}

        <Card className="border-slate-800/80 bg-slate-950/20">

          <div className="mb-5">

            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-cyan-400/60">
              Momentum Shift
            </p>

            <h2 className="mt-2 text-xl font-bold text-white">
              Previous Period
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              What improved, declined, or stayed unchanged.
            </p>

          </div>

          <AnalyticsPeriodComparison
            analytics={
              periodComparison
            }
          />

        </Card>

      </section>

      {/* ======================================
          Execution Quality
      ====================================== */}

      <section className="space-y-6">

        <div className="border-b border-slate-800/70 pb-4">

          <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-purple-400/70">
            Execution Quality
          </p>

          <h2 className="mt-2 text-2xl font-bold text-white">
            Why your results look this way
          </h2>

          <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">
            Go beyond output volume and inspect priority, alignment, and the rewards created by your execution.
          </p>

        </div>

        <div className="grid gap-6 xl:grid-cols-2">

          <Card className="border-slate-800/80">

            <div className="mb-5">

              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-rose-400/70">
                Importance
              </p>

              <h3 className="mt-2 text-xl font-bold text-white">
                Priority Execution
              </h3>

              <p className="mt-1 text-sm text-slate-500">
                Did the work that mattered most actually get done?
              </p>

            </div>

            <AnalyticsPriorityExecution
              analytics={
                priorityAnalytics
              }
            />

          </Card>

          <Card className="border-slate-800/80">

            <div className="mb-5">

              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-purple-400/70">
                Alignment
              </p>

              <h3 className="mt-2 text-xl font-bold text-white">
                Where Your Effort Went
              </h3>

              <p className="mt-1 text-sm text-slate-500">
                How completed work was distributed across your planning system.
              </p>

            </div>

            <AnalyticsEffortDistribution
              analytics={
                effortAnalytics
              }
            />

          </Card>

        </div>

        <Card className="border-amber-400/10 bg-amber-400/[0.025]">

          <div className="mb-5">

            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-amber-400/70">
              Reward Intelligence
            </p>

            <h3 className="mt-2 text-xl font-bold text-white">
              XP Breakdown
            </h3>

            <p className="mt-1 text-sm text-slate-500">
              Every XP point traced back to real execution history.
            </p>

          </div>

          <AnalyticsXPBreakdown
            analytics={
              xpBreakdown
            }
          />

        </Card>

      </section>

      {/* ======================================
          Long-Range Patterns
      ====================================== */}

      {(
        period === "month" ||
        period === "year"
      ) && (
        <section className="space-y-6">

          <div className="border-b border-slate-800/70 pb-4">

            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-cyan-400/70">
              Long-Range Patterns
            </p>

            <h2 className="mt-2 text-2xl font-bold text-white">
              Performance over time
            </h2>

            <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">
              Step back from individual tasks and inspect the larger pattern of execution and consistency.
            </p>

          </div>

          <Card className="border-slate-800/80">

            <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">

              <div>

                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-purple-400/70">
                  Comparison
                </p>

                <h3 className="mt-2 text-xl font-bold text-white">
                  {
                    barSectionTitle
                  }
                </h3>

                <p className="mt-1 text-sm text-slate-500">
                  {
                    barSectionDescription
                  }
                </p>

              </div>

              <div className="inline-flex flex-wrap rounded-lg border border-slate-800 bg-slate-950 p-1">

                <button
                  type="button"
                  onClick={() =>
                    setBarMetric(
                      "tasks"
                    )
                  }
                  className={`
                    rounded-md
                    px-4
                    py-2
                    text-xs
                    font-semibold
                    transition

                    ${
                      barMetric ===
                      "tasks"
                        ? "bg-cyan-500/15 text-cyan-300"
                        : "text-slate-500 hover:text-slate-300"
                    }
                  `}
                >
                  Tasks
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setBarMetric(
                      "completion"
                    )
                  }
                  className={`
                    rounded-md
                    px-4
                    py-2
                    text-xs
                    font-semibold
                    transition

                    ${
                      barMetric ===
                      "completion"
                        ? "bg-emerald-500/15 text-emerald-300"
                        : "text-slate-500 hover:text-slate-300"
                    }
                  `}
                >
                  Completion
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setBarMetric(
                      "xp"
                    )
                  }
                  className={`
                    rounded-md
                    px-4
                    py-2
                    text-xs
                    font-semibold
                    transition

                    ${
                      barMetric ===
                      "xp"
                        ? "bg-yellow-500/15 text-yellow-300"
                        : "text-slate-500 hover:text-slate-300"
                    }
                  `}
                >
                  XP
                </button>

              </div>

            </div>

            <AnalyticsBarChart
              data={
                barData
              }
              metric={
                barMetric
              }
            />

          </Card>

          <Card className="border-slate-800/80">

            <div className="mb-5">

              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-cyan-400/70">
                Consistency
              </p>

              <h3 className="mt-2 text-xl font-bold text-white">
                {
                  heatmapTitle
                }
              </h3>

              <p className="mt-1 text-sm text-slate-500">
                {
                  heatmapDescription
                }
              </p>

            </div>

            <AnalyticsHeatmap
              data={
                heatmapData
              }
              mode={
                period
              }
            />

          </Card>

        </section>
      )}

      {/* ======================================
          Records & Reflection
      ====================================== */}

      <section className="space-y-6">

        <div className="border-b border-slate-800/70 pb-4">

          <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-orange-400/70">
            Records & Reflection
          </p>

          <h2 className="mt-2 text-2xl font-bold text-white">
            Your execution history
          </h2>

          <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">
            Records are secondary to today’s work, but they reveal what your best execution has looked like.
          </p>

        </div>

        <Card className="border-slate-800/80 bg-slate-950/20">

          <div className="mb-5">

            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-orange-400/70">
              Personal Records
            </p>

            <h3 className="mt-2 text-xl font-bold text-white">
              Personal Bests
            </h3>

            <p className="mt-1 text-sm text-slate-500">
              Your strongest execution records discovered from historical activity.
            </p>

          </div>

          <AnalyticsPersonalBests
            analytics={
              personalBests
            }
          />

        </Card>

        {period ===
          "today" && (
          <DailyReview
            completedTasks={
              today.completedTasks
            }
            pendingTasks={
              today.pendingTasks
            }
            xpEarned={
              today.xpEarned
            }
          />
        )}

        {period ===
          "week" && (
          <WeeklyReview
            completedTasks={
              week.completedTasks
            }
            completionRate={
              week.completionRate
            }
            xpEarned={
              week.xpEarned
            }
          />
        )}

      </section>

      {/* ======================================
          ATLAS Intelligence
      ====================================== */}

      <section className="space-y-5">

        <div className="border-b border-cyan-500/10 pb-4">

          <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-cyan-400/70">
            Interpretation
          </p>

          <h2 className="mt-2 text-2xl font-bold text-white">
            ATLAS
          </h2>

          <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">
            The final layer: interpretation of the signals above, grounded only in your actual execution data.
          </p>

        </div>

        <AtlasReport
          analytics={
            atlasIntelligence
          }
        />

      </section>

    </div>
  );
}