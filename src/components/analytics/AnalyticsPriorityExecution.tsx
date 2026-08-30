import {
  FaArrowDown,
  FaEquals,
  FaArrowUp,
} from "react-icons/fa";

import type {
  PriorityExecutionAnalytics,
  PriorityExecutionPoint,
} from "../../engines/AnalyticsEngine";

// ==========================================
// Types
// ==========================================

interface AnalyticsPriorityExecutionProps {
  analytics:
    PriorityExecutionAnalytics;
}

// ==========================================
// Helpers
// ==========================================

function getPriorityIcon(
  point: PriorityExecutionPoint
) {
  switch (point.priority) {
    case "high":
      return <FaArrowUp />;

    case "medium":
      return <FaEquals />;

    case "low":
    default:
      return <FaArrowDown />;
  }
}

function getPriorityColor(
  point: PriorityExecutionPoint
): string {
  switch (point.priority) {
    case "high":
      return "bg-rose-400";

    case "medium":
      return "bg-amber-400";

    case "low":
    default:
      return "bg-slate-400";
  }
}

function getPriorityTextColor(
  point: PriorityExecutionPoint
): string {
  switch (point.priority) {
    case "high":
      return "text-rose-300";

    case "medium":
      return "text-amber-300";

    case "low":
    default:
      return "text-slate-300";
  }
}

// ==========================================
// Component
// ==========================================

export default function AnalyticsPriorityExecution({
  analytics,
}: AnalyticsPriorityExecutionProps) {
  return (
    <div className="space-y-6">

      {/* ======================================
          Summary
      ====================================== */}

      <div className="flex flex-wrap items-end gap-8">

        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
            Planned
          </p>

          <p className="mt-1 text-3xl font-black text-white">
            {
              analytics.totalTasks
            }
          </p>
        </div>

        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
            Completed
          </p>

          <p className="mt-1 text-xl font-bold text-emerald-300">
            {
              analytics.completedTasks
            }
          </p>
        </div>

        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
            Priority Completion
          </p>

          <p className="mt-1 text-xl font-bold text-cyan-300">
            {
              analytics.completionRate
            }%
          </p>
        </div>

      </div>

      {/* ======================================
          Priority Rows
      ====================================== */}

      <div className="space-y-5">

        {analytics.priorities.map(
          (point) => (
            <div
              key={
                point.priority
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

                      ${getPriorityTextColor(
                        point
                      )}
                    `}
                  >
                    {
                      getPriorityIcon(
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
                      of{" "}
                      {
                        point.totalTasks
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

                    ${getPriorityTextColor(
                      point
                    )}
                  `}
                >
                  {
                    point.completionRate
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

                    ${getPriorityColor(
                      point
                    )}
                  `}
                  style={{
                    width:
                      `${point.completionRate}%`,
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

      {analytics.totalTasks ===
        0 && (
        <div className="rounded-xl border border-dashed border-slate-800 bg-slate-950/40 px-5 py-8 text-center">

          <p className="text-sm font-semibold text-slate-300">
            No prioritized work in this period
          </p>

          <p className="mt-2 text-xs leading-5 text-slate-500">
            Add due dates and priorities to tasks to measure whether the most important work gets executed.
          </p>

        </div>
      )}

    </div>
  );
}