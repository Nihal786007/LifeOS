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
      return "bg-lifeos-danger";

    case "medium":
      return "bg-lifeos-warning";

    case "low":
    default:
      return "bg-lifeos-muted";
  }
}

function getPriorityTextColor(
  point: PriorityExecutionPoint
): string {
  switch (point.priority) {
    case "high":
      return "text-lifeos-danger";

    case "medium":
      return "text-lifeos-warning";

    case "low":
    default:
      return "text-lifeos-text-secondary";
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
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-lifeos-muted">
            Planned
          </p>

          <p className="mt-1 text-3xl font-bold text-lifeos-text">
            {
              analytics.totalTasks
            }
          </p>
        </div>

        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-lifeos-muted">
            Completed
          </p>

          <p className="mt-1 text-xl font-bold text-lifeos-success">
            {
              analytics.completedTasks
            }
          </p>
        </div>

        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-lifeos-muted">
            Priority Completion
          </p>

          <p className="mt-1 text-xl font-bold text-lifeos-accent">
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
                      border-lifeos-border
                      bg-lifeos-app
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

                    <p className="truncate text-sm font-semibold text-lifeos-text">
                      {
                        point.label
                      }
                    </p>

                    <p className="text-xs text-lifeos-muted">
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
                    font-bold

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

              <div className="h-2 overflow-hidden rounded-full bg-lifeos-surface">

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
        <div className="rounded-xl border border-dashed border-lifeos-border bg-lifeos-app/40 px-5 py-8 text-center">

          <p className="text-sm font-semibold text-lifeos-text-secondary">
            No prioritized work in this period
          </p>

          <p className="mt-2 text-xs leading-5 text-lifeos-muted">
            Add due dates and priorities to tasks to measure whether the most important work gets executed.
          </p>

        </div>
      )}

    </div>
  );
}