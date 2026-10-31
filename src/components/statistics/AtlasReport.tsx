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
          "text-lifeos-success",
        border:
          "border-lifeos-success/15",
        background:
          "bg-lifeos-success/5",
        title:
          "text-lifeos-success",
      };

    case "warning":
      return {
        icon:
          "text-lifeos-danger",
        border:
          "border-lifeos-danger/15",
        background:
          "bg-lifeos-danger/5",
        title:
          "text-lifeos-danger",
      };

    case "focus":
      return {
        icon:
          "text-lifeos-warning",
        border:
          "border-lifeos-warning/15",
        background:
          "bg-lifeos-warning/5",
        title:
          "text-lifeos-warning",
      };

    case "record":
      return {
        icon:
          "text-lifeos-warning",
        border:
          "border-lifeos-warning/15",
        background:
          "bg-lifeos-warning/5",
        title:
          "text-lifeos-warning",
      };

    case "info":
    default:
      return {
        icon:
          "text-lifeos-accent",
        border:
          "border-lifeos-accent/15",
        background:
          "bg-lifeos-accent/5",
        title:
          "text-lifeos-accent",
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
    <Card className="border-lifeos-accent/20 bg-lifeos-accent/5">

      {/* ======================================
          Header
      ====================================== */}

      <div className="flex flex-wrap items-start justify-between gap-5">

        <div className="flex items-start gap-4">

          <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-lifeos-accent/20 bg-lifeos-accent/10 text-lifeos-accent">
            <FaBrain />
          </div>

          <div>

            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-lifeos-accent">
              Analytics Insight
            </p>

            <h2 className="mt-1 text-2xl font-bold text-lifeos-text">
              Execution Analysis
            </h2>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-lifeos-text-secondary">
              Evidence-based interpretation of your execution patterns, priorities, effort, XP, and momentum.
            </p>

          </div>

        </div>

        <div className="rounded-xl border border-lifeos-accent/15 bg-lifeos-app/50 px-4 py-3">

          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-lifeos-muted">
            Current Status
          </p>

          <p className="mt-1 text-sm font-bold text-lifeos-accent">
            {status}
          </p>

        </div>

      </div>

      {/* ======================================
          Primary Insight
      ====================================== */}

      {primary && (
        <div className="mt-7 rounded-2xl border border-lifeos-accent/20 bg-lifeos-accent/5 p-5">

          <div className="flex items-start gap-4">

            <div className="flex h-9 w-9 flex-none items-center justify-center rounded-xl border border-lifeos-accent/15 bg-lifeos-accent/10 text-sm text-lifeos-accent">
              <FaBrain />
            </div>

            <div>

              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-lifeos-accent">
                Primary Signal
              </p>

              <h3 className="mt-2 text-lg font-bold text-lifeos-text">
                {primary.title}
              </h3>

              <p className="mt-2 leading-6 text-lifeos-text-secondary">
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

        <div className="rounded-xl border border-lifeos-border bg-lifeos-app/45 p-4">

          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-lifeos-muted">
            Signals
          </p>

          <p className="mt-2 text-2xl font-bold text-lifeos-text">
            {analytics.insights.length}
          </p>

        </div>

        <div className="rounded-xl border border-lifeos-success/10 bg-lifeos-success/5 p-4">

          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-lifeos-success">
            Strengths
          </p>

          <p className="mt-2 text-2xl font-bold text-lifeos-success">
            {analytics.positiveCount}
          </p>

        </div>

        <div className="rounded-xl border border-lifeos-warning/10 bg-lifeos-warning/5 p-4">

          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-lifeos-warning">
            Focus Areas
          </p>

          <p className="mt-2 text-2xl font-bold text-lifeos-warning">
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
                        bg-lifeos-app/60
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

                      <p className="mt-1 text-sm leading-6 text-lifeos-text-secondary">
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
        <div className="mt-6 rounded-xl border border-dashed border-lifeos-border bg-lifeos-app/40 px-5 py-8 text-center">

          <p className="text-sm font-semibold text-lifeos-text-secondary">
            More activity is needed to build a signal
          </p>

          <p className="mt-2 text-xs leading-5 text-lifeos-muted">
            More execution history is needed before meaningful patterns can be identified.
          </p>

        </div>
      )}

    </Card>
  );
}
