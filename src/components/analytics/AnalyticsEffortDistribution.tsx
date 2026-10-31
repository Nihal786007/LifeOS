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
      return "bg-lifeos-accent";

    case "personal":
      return "bg-lifeos-chart-secondary";

    case "weekly":
      return "bg-lifeos-success";

    case "standalone":
      return "bg-lifeos-muted";

    case "unresolved":
    default:
      return "bg-lifeos-danger";
  }
}

function getScopeTextColor(
  point: EffortDistributionPoint
): string {
  switch (point.scope) {
    case "goal":
      return "text-lifeos-accent";

    case "personal":
      return "text-lifeos-chart-secondary";

    case "weekly":
      return "text-lifeos-success";

    case "standalone":
      return "text-lifeos-text-secondary";

    case "unresolved":
    default:
      return "text-lifeos-danger";
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

          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-lifeos-muted">
            Completed Execution
          </p>

          <p className="mt-1 text-3xl font-bold text-lifeos-text">
            {
              analytics.totalCompletedTasks
            }
          </p>

        </div>

        <div>

          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-lifeos-muted">
            Classified
          </p>

          <p className="mt-1 text-xl font-bold text-lifeos-text-secondary">
            {
              analytics.classifiedTasks
            }
          </p>

        </div>

        {analytics.unresolvedTasks >
          0 && (
          <div>

            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-lifeos-danger">
              Unresolved
            </p>

            <p className="mt-1 text-xl font-bold text-lifeos-danger">
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
                      border-lifeos-border
                      bg-lifeos-app
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

                    <p className="truncate text-sm font-semibold text-lifeos-text">
                      {
                        point.label
                      }
                    </p>

                    <p className="text-xs text-lifeos-muted">
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
                    font-bold

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

              <div className="h-2 overflow-hidden rounded-full bg-lifeos-surface">

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
        <div className="rounded-xl border border-dashed border-lifeos-border bg-lifeos-app/40 px-5 py-8 text-center">

          <p className="text-sm font-semibold text-lifeos-text-secondary">
            No completed execution yet
          </p>

          <p className="mt-2 text-xs leading-5 text-lifeos-muted">
            Complete tasks in this period to see where your effort is going.
          </p>

        </div>
      )}

      {/* ======================================
          Integrity Note
      ====================================== */}

      {analytics.unresolvedTasks >
        0 && (
        <div className="rounded-lg border border-lifeos-danger/15 bg-lifeos-danger/5 px-4 py-3">

          <p className="text-xs leading-5 text-lifeos-danger">
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