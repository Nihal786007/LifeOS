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
      return "text-emerald-300";

    case "down":
      return "text-rose-300";

    case "same":
    default:
      return "text-slate-400";
  }
}

function getDirectionBackground(
  metric: AnalyticsComparisonMetric
): string {
  switch (metric.direction) {
    case "up":
      return "border-emerald-400/15 bg-emerald-400/5";

    case "down":
      return "border-rose-400/15 bg-rose-400/5";

    case "same":
    default:
      return "border-slate-700 bg-slate-900/50";
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

        <div className="rounded-xl border border-slate-800 bg-slate-950/50 px-4 py-3">

          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-600">
            Previous
          </p>

          <p className="mt-1 text-sm font-semibold text-slate-300">
            {
              analytics.previousLabel
            }
          </p>

        </div>

        <div className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-800 bg-slate-950 text-xs text-slate-500">
          <FaArrowRight />
        </div>

        <div className="rounded-xl border border-cyan-400/15 bg-cyan-400/5 px-4 py-3">

          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-cyan-400/70">
            Current
          </p>

          <p className="mt-1 text-sm font-semibold text-cyan-200">
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
              className="rounded-2xl border border-slate-800 bg-slate-950/45 p-5"
            >

              <div className="flex items-start justify-between gap-4">

                <div>

                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                    {
                      metric.label
                    }
                  </p>

                  <div className="mt-4 flex items-center gap-3">

                    <span className="text-sm font-semibold text-slate-500">
                      {
                        formatValue(
                          metric,
                          metric.previousValue
                        )
                      }
                    </span>

                    <FaArrowRight className="text-[10px] text-slate-700" />

                    <span className="text-xl font-black text-white">
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

              <div className="mt-5 border-t border-slate-800 pt-4">

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

                <p className="mt-1 text-xs text-slate-600">
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