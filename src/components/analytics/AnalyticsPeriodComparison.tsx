import {
  FaArrowDown,
  FaArrowRight,
  FaArrowUp,
  FaMinus,
} from "react-icons/fa";

import type {
  AnalyticsComparisonMetric,
  PeriodComparisonAnalytics,
} from "../../engines/AnalyticsEngine";

// ==========================================
// Types
// ==========================================

interface AnalyticsPeriodComparisonProps {
  analytics:
    PeriodComparisonAnalytics;
}

// ==========================================
// Helpers
// ==========================================

function getDirectionIcon(
  metric: AnalyticsComparisonMetric
) {
  switch (metric.direction) {
    case "up":
      return <FaArrowUp />;

    case "down":
      return <FaArrowDown />;

    case "same":
    default:
      return <FaMinus />;
  }
}

function getDirectionTextColor(
  metric: AnalyticsComparisonMetric
): string {
  switch (metric.direction) {
    case "up":
      return "text-lifeos-success";

    case "down":
      return "text-lifeos-danger";

    case "same":
    default:
      return "text-lifeos-text-secondary";
  }
}

function getDirectionBackground(
  metric: AnalyticsComparisonMetric
): string {
  switch (metric.direction) {
    case "up":
      return "border-lifeos-success/15 bg-lifeos-success/5";

    case "down":
      return "border-lifeos-danger/15 bg-lifeos-danger/5";

    case "same":
    default:
      return "border-lifeos-border bg-lifeos-surface/50";
  }
}

function formatValue(
  metric: AnalyticsComparisonMetric,
  value: number
): string {
  switch (metric.unit) {
    case "percent":
      return `${value}%`;

    case "xp":
      return `+${value}`;

    case "number":
    default:
      return String(
        value
      );
  }
}

function formatDelta(
  metric: AnalyticsComparisonMetric
): string {
  if (
    metric.delta === 0
  ) {
    return "No change";
  }

  const sign =
    metric.delta >
    0
      ? "+"
      : "";

  switch (metric.unit) {
    case "percent":
      return `${sign}${metric.delta} pts`;

    case "xp":
      return `${sign}${metric.delta} XP`;

    case "number":
    default:
      return `${sign}${metric.delta}`;
  }
}

// ==========================================
// Component
// ==========================================

export default function AnalyticsPeriodComparison({
  analytics,
}: AnalyticsPeriodComparisonProps) {
  return (
    <div className="space-y-6">

      {/* ======================================
          Period Header
      ====================================== */}

      <div className="flex flex-wrap items-center gap-3">

        <div className="rounded-xl border border-lifeos-border bg-lifeos-app/50 px-4 py-3">

          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-lifeos-muted">
            Previous
          </p>

          <p className="mt-1 text-sm font-semibold text-lifeos-text-secondary">
            {
              analytics.previousLabel
            }
          </p>

        </div>

        <div className="flex h-8 w-8 items-center justify-center rounded-full border border-lifeos-border bg-lifeos-app text-xs text-lifeos-muted">
          <FaArrowRight />
        </div>

        <div className="rounded-xl border border-lifeos-accent/15 bg-lifeos-accent/5 px-4 py-3">

          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-lifeos-accent">
            Current
          </p>

          <p className="mt-1 text-sm font-semibold text-lifeos-accent">
            {
              analytics.currentLabel
            }
          </p>

        </div>

      </div>

      {/* ======================================
          Metrics
      ====================================== */}

      <div className="grid gap-4 sm:grid-cols-2">

        {analytics.metrics.map(
          (metric) => (
            <div
              key={
                metric.key
              }
              className="rounded-2xl border border-lifeos-border bg-lifeos-app/45 p-5"
            >

              <div className="flex items-start justify-between gap-4">

                <div>

                  <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-lifeos-muted">
                    {
                      metric.label
                    }
                  </p>

                  <div className="mt-4 flex items-center gap-3">

                    <span className="text-sm font-semibold text-lifeos-muted">
                      {
                        formatValue(
                          metric,
                          metric.previousValue
                        )
                      }
                    </span>

                    <FaArrowRight className="text-[11px] text-lifeos-muted" />

                    <span className="text-xl font-bold text-lifeos-text">
                      {
                        formatValue(
                          metric,
                          metric.currentValue
                        )
                      }
                    </span>

                  </div>

                </div>

                <div
                  className={`
                    flex
                    h-9
                    w-9
                    flex-none
                    items-center
                    justify-center
                    rounded-xl
                    border
                    text-xs

                    ${getDirectionBackground(
                      metric
                    )}

                    ${getDirectionTextColor(
                      metric
                    )}
                  `}
                >
                  {
                    getDirectionIcon(
                      metric
                    )
                  }
                </div>

              </div>

              <div className="mt-5 border-t border-lifeos-border pt-4">

                <p
                  className={`
                    text-sm
                    font-bold

                    ${getDirectionTextColor(
                      metric
                    )}
                  `}
                >
                  {
                    formatDelta(
                      metric
                    )
                  }
                </p>

                <p className="mt-1 text-xs text-lifeos-muted">
                  compared with the previous period
                </p>

              </div>

            </div>
          )
        )}

      </div>

    </div>
  );
}