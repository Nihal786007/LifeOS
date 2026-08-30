import {
  FaBolt,
  FaBrain,
  FaBullseye,
  FaChartLine,
  FaExclamationTriangle,
  FaFire,
} from "react-icons/fa";

import Card from "../ui/Card";

import type {
  AnalyticsInsight,
  AnalyticsInsightResult,
  AnalyticsInsightTone,
} from "../../engines/AnalyticsInsightEngine";

// ==========================================
// Types
// ==========================================

interface AtlasReportProps {
  analytics:
    AnalyticsInsightResult;
}

// ==========================================
// Helpers
// ==========================================

function getToneIcon(
  insight: AnalyticsInsight
) {
  switch (insight.tone) {
    case "positive":
      return <FaChartLine />;

    case "warning":
      return <FaExclamationTriangle />;

    case "focus":
      return <FaBullseye />;

    case "record":
      return <FaFire />;

    case "info":
    default:
      return <FaBolt />;
  }
}

function getToneStyles(
  tone: AnalyticsInsightTone
): {
  icon: string;
  border: string;
  background: string;
  title: string;
} {
  switch (tone) {
    case "positive":
      return {
        icon:
          "text-emerald-300",
        border:
          "border-emerald-400/15",
        background:
          "bg-emerald-400/5",
        title:
          "text-emerald-200",
      };

    case "warning":
      return {
        icon:
          "text-rose-300",
        border:
          "border-rose-400/15",
        background:
          "bg-rose-400/5",
        title:
          "text-rose-200",
      };

    case "focus":
      return {
        icon:
          "text-amber-300",
        border:
          "border-amber-400/15",
        background:
          "bg-amber-400/5",
        title:
          "text-amber-200",
      };

    case "record":
      return {
        icon:
          "text-orange-300",
        border:
          "border-orange-400/15",
        background:
          "bg-orange-400/5",
        title:
          "text-orange-200",
      };

    case "info":
    default:
      return {
        icon:
          "text-cyan-300",
        border:
          "border-cyan-400/15",
        background:
          "bg-cyan-400/5",
        title:
          "text-cyan-200",
      };
  }
}

function getStatusLabel(
  analytics: AnalyticsInsightResult
): string {
  if (
    analytics.warningCount >
    analytics.positiveCount
  ) {
    return "Needs Focus";
  }

  if (
    analytics.positiveCount >
    analytics.warningCount
  ) {
    return "Momentum Strong";
  }

  if (
    analytics.insights.length ===
    0
  ) {
    return "Building Signal";
  }

  return "Balanced";
}

// ==========================================
// Component
// ==========================================

export default function AtlasReport({
  analytics,
}: AtlasReportProps) {
  const status =
    getStatusLabel(
      analytics
    );

  const primary =
    analytics.primaryInsight;

  return (
    <Card className="border-cyan-500/20 bg-cyan-500/5">

      {/* ======================================
          Header
      ====================================== */}

      <div className="flex flex-wrap items-start justify-between gap-5">

        <div className="flex items-start gap-4">

          <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-cyan-400/20 bg-cyan-400/10 text-cyan-300">
            <FaBrain />
          </div>

          <div>

            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-cyan-400/70">
              ATLAS Intelligence
            </p>

            <h2 className="mt-1 text-2xl font-black text-white">
              Execution Analysis
            </h2>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
              Evidence-based interpretation of your execution patterns, priorities, effort, XP, and momentum.
            </p>

          </div>

        </div>

        <div className="rounded-xl border border-cyan-400/15 bg-slate-950/50 px-4 py-3">

          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-600">
            ATLAS Status
          </p>

          <p className="mt-1 text-sm font-bold text-cyan-200">
            {status}
          </p>

        </div>

      </div>

      {/* ======================================
          Primary Insight
      ====================================== */}

      {primary && (
        <div className="mt-7 rounded-2xl border border-cyan-400/20 bg-cyan-400/5 p-5">

          <div className="flex items-start gap-4">

            <div className="flex h-9 w-9 flex-none items-center justify-center rounded-xl border border-cyan-400/15 bg-cyan-400/10 text-sm text-cyan-300">
              <FaBrain />
            </div>

            <div>

              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-cyan-400/70">
                Primary Signal
              </p>

              <h3 className="mt-2 text-lg font-bold text-white">
                {primary.title}
              </h3>

              <p className="mt-2 leading-6 text-slate-300">
                {primary.message}
              </p>

            </div>

          </div>

        </div>
      )}

      {/* ======================================
          Signal Summary
      ====================================== */}

      <div className="mt-6 grid gap-4 sm:grid-cols-3">

        <div className="rounded-xl border border-slate-800 bg-slate-950/45 p-4">

          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-600">
            Signals
          </p>

          <p className="mt-2 text-2xl font-black text-white">
            {analytics.insights.length}
          </p>

        </div>

        <div className="rounded-xl border border-emerald-400/10 bg-emerald-400/5 p-4">

          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-400/60">
            Strengths
          </p>

          <p className="mt-2 text-2xl font-black text-emerald-300">
            {analytics.positiveCount}
          </p>

        </div>

        <div className="rounded-xl border border-amber-400/10 bg-amber-400/5 p-4">

          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-amber-400/60">
            Focus Areas
          </p>

          <p className="mt-2 text-2xl font-black text-amber-300">
            {analytics.warningCount}
          </p>

        </div>

      </div>

      {/* ======================================
          Insight List
      ====================================== */}

      {analytics.insights.length >
      0 ? (
        <div className="mt-6 space-y-3">

          {analytics.insights.map(
            (insight) => {
              const styles =
                getToneStyles(
                  insight.tone
                );

              return (
                <div
                  key={
                    insight.id
                  }
                  className={`
                    rounded-xl
                    border
                    p-4

                    ${styles.border}
                    ${styles.background}
                  `}
                >

                  <div className="flex items-start gap-3">

                    <div
                      className={`
                        mt-0.5
                        flex
                        h-8
                        w-8
                        flex-none
                        items-center
                        justify-center
                        rounded-lg
                        border
                        border-white/5
                        bg-slate-950/60
                        text-xs

                        ${styles.icon}
                      `}
                    >
                      {
                        getToneIcon(
                          insight
                        )
                      }
                    </div>

                    <div className="min-w-0">

                      <h3
                        className={`
                          text-sm
                          font-bold

                          ${styles.title}
                        `}
                      >
                        {
                          insight.title
                        }
                      </h3>

                      <p className="mt-1 text-sm leading-6 text-slate-400">
                        {
                          insight.message
                        }
                      </p>

                    </div>

                  </div>

                </div>
              );
            }
          )}

        </div>
      ) : (
        <div className="mt-6 rounded-xl border border-dashed border-slate-800 bg-slate-950/40 px-5 py-8 text-center">

          <p className="text-sm font-semibold text-slate-300">
            ATLAS is still building signal
          </p>

          <p className="mt-2 text-xs leading-5 text-slate-500">
            More execution history is needed before meaningful patterns can be identified.
          </p>

        </div>
      )}

    </Card>
  );
}