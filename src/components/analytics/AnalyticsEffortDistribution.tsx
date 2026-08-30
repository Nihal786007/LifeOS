import {
  FaBullseye,
  FaCalendarWeek,
  FaCircle,
  FaUser,
} from "react-icons/fa";

import type {
  EffortDistributionAnalytics,
  EffortDistributionPoint,
} from "../../engines/AnalyticsEngine";

// ==========================================
// Types
// ==========================================

interface AnalyticsEffortDistributionProps {
  analytics:
    EffortDistributionAnalytics;
}

// ==========================================
// Helpers
// ==========================================

function getScopeIcon(
  point: EffortDistributionPoint
) {
  switch (point.scope) {
    case "goal":
      return <FaBullseye />;

    case "personal":
      return <FaUser />;

    case "weekly":
      return <FaCalendarWeek />;

    case "standalone":
    case "unresolved":
    default:
      return <FaCircle />;
  }
}

function getScopeColor(
  point: EffortDistributionPoint
): string {
  switch (point.scope) {
    case "goal":
      return "bg-cyan-400";

    case "personal":
      return "bg-purple-400";

    case "weekly":
      return "bg-emerald-400";

    case "standalone":
      return "bg-slate-400";

    case "unresolved":
    default:
      return "bg-rose-400";
  }
}

function getScopeTextColor(
  point: EffortDistributionPoint
): string {
  switch (point.scope) {
    case "goal":
      return "text-cyan-300";

    case "personal":
      return "text-purple-300";

    case "weekly":
      return "text-emerald-300";

    case "standalone":
      return "text-slate-300";

    case "unresolved":
    default:
      return "text-rose-300";
  }
}

// ==========================================
// Component
// ==========================================

export default function AnalyticsEffortDistribution({
  analytics,
}: AnalyticsEffortDistributionProps) {
  const visibleDistribution =
    analytics.distribution.filter(
      (point) =>
        point.scope !== "unresolved"
    );

  return (
    <div className="space-y-6">

      {/* ======================================
          Header Summary
      ====================================== */}

      <div className="flex flex-wrap items-end gap-8">

        <div>

          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
            Completed Execution
          </p>

          <p className="mt-1 text-3xl font-black text-white">
            {
              analytics.totalCompletedTasks
            }
          </p>

        </div>

        <div>

          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
            Classified
          </p>

          <p className="mt-1 text-xl font-bold text-slate-300">
            {
              analytics.classifiedTasks
            }
          </p>

        </div>

        {analytics.unresolvedTasks >
          0 && (
          <div>

            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-rose-400">
              Unresolved
            </p>

            <p className="mt-1 text-xl font-bold text-rose-300">
              {
                analytics.unresolvedTasks
              }
            </p>

          </div>
        )}

      </div>

      {/* ======================================
          Distribution Bars
      ====================================== */}

      <div className="space-y-5">

        {visibleDistribution.map(
          (point) => (
            <div
              key={
                point.scope
              }
              className="space-y-2"
            >

              <div className="flex items-center justify-between gap-4">

                <div className="flex min-w-0 items-center gap-3">

                  <div
                    className={`
                      flex
                      h-8
                      w-8
                      flex-none
                      items-center
                      justify-center
                      rounded-lg
                      border
                      border-slate-800
                      bg-slate-950
                      text-xs

                      ${getScopeTextColor(
                        point
                      )}
                    `}
                  >
                    {
                      getScopeIcon(
                        point
                      )
                    }
                  </div>

                  <div className="min-w-0">

                    <p className="truncate text-sm font-semibold text-white">
                      {
                        point.label
                      }
                    </p>

                    <p className="text-xs text-slate-500">
                      {
                        point.completedTasks
                      }{" "}
                      completed
                    </p>

                  </div>

                </div>

                <p
                  className={`
                    flex-none
                    text-lg
                    font-black

                    ${getScopeTextColor(
                      point
                    )}
                  `}
                >
                  {
                    point.percentage
                  }%
                </p>

              </div>

              <div className="h-2 overflow-hidden rounded-full bg-slate-900">

                <div
                  className={`
                    h-full
                    rounded-full
                    transition-all
                    duration-700

                    ${getScopeColor(
                      point
                    )}
                  `}
                  style={{
                    width:
                      `${point.percentage}%`,
                  }}
                />

              </div>

            </div>
          )
        )}

      </div>

      {/* ======================================
          Empty State
      ====================================== */}

      {analytics.totalCompletedTasks ===
        0 && (
        <div className="rounded-xl border border-dashed border-slate-800 bg-slate-950/40 px-5 py-8 text-center">

          <p className="text-sm font-semibold text-slate-300">
            No completed execution yet
          </p>

          <p className="mt-2 text-xs leading-5 text-slate-500">
            Complete tasks in this period to see where your effort is going.
          </p>

        </div>
      )}

      {/* ======================================
          Integrity Note
      ====================================== */}

      {analytics.unresolvedTasks >
        0 && (
        <div className="rounded-lg border border-rose-500/15 bg-rose-500/5 px-4 py-3">

          <p className="text-xs leading-5 text-rose-300">
            {
              analytics.unresolvedTasks
            }{" "}
            historical completed task
            {
              analytics.unresolvedTasks ===
              1
                ? ""
                : "s"
            }{" "}
            could not be matched to current task data.
          </p>

        </div>
      )}

    </div>
  );
}