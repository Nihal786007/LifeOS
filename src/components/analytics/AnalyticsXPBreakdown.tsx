import {
  FaBolt,
  FaBullseye,
  FaCalendarAlt,
  FaCheckCircle,
  FaFlag,
} from "react-icons/fa";

import type {
  XPBreakdownAnalytics,
  XPBreakdownPoint,
} from "../../engines/AnalyticsEngine";

// ==========================================
// Types
// ==========================================

interface AnalyticsXPBreakdownProps {
  analytics:
    XPBreakdownAnalytics;
}

// ==========================================
// Helpers
// ==========================================

function getCategoryIcon(
  point: XPBreakdownPoint
) {
  switch (point.category) {
    case "task":
      return <FaCheckCircle />;

    case "weekly":
      return <FaFlag />;

    case "monthly":
      return <FaCalendarAlt />;

    case "life_goal":
      return <FaBullseye />;

    case "other":
    default:
      return <FaBolt />;
  }
}

function getCategoryColor(
  point: XPBreakdownPoint
): string {
  switch (point.category) {
    case "task":
      return "bg-lifeos-accent";

    case "weekly":
      return "bg-lifeos-success";

    case "monthly":
      return "bg-lifeos-chart-secondary";

    case "life_goal":
      return "bg-lifeos-warning";

    case "other":
    default:
      return "bg-lifeos-muted";
  }
}

function getCategoryTextColor(
  point: XPBreakdownPoint
): string {
  switch (point.category) {
    case "task":
      return "text-lifeos-accent";

    case "weekly":
      return "text-lifeos-success";

    case "monthly":
      return "text-lifeos-chart-secondary";

    case "life_goal":
      return "text-lifeos-warning";

    case "other":
    default:
      return "text-lifeos-text-secondary";
  }
}

// ==========================================
// Component
// ==========================================

export default function AnalyticsXPBreakdown({
  analytics,
}: AnalyticsXPBreakdownProps) {
  const visibleBreakdown =
    analytics.breakdown.filter(
      (point) =>
        point.xpEarned > 0 ||
        point.eventCount > 0
    );

  const hasActivity =
    analytics.totalXP > 0 ||
    analytics.rewardedEvents > 0;

  return (
    <div className="space-y-5">

      {/* ======================================
          Compact Summary
      ====================================== */}

      <div className="grid gap-3 sm:grid-cols-3">

        <div className="rounded-xl border border-lifeos-warning/10 bg-lifeos-warning/5 px-4 py-3">

          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-lifeos-warning">
            XP Earned
          </p>

          <p className="mt-1 text-2xl font-bold text-lifeos-warning">
            +{analytics.totalXP}
          </p>

        </div>

        <div className="rounded-xl border border-lifeos-border bg-lifeos-app/45 px-4 py-3">

          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-lifeos-muted">
            Rewarded Events
          </p>

          <p className="mt-1 text-xl font-bold text-lifeos-text">
            {
              analytics.rewardedEvents
            }
          </p>

        </div>

        <div className="rounded-xl border border-lifeos-border bg-lifeos-app/45 px-4 py-3">

          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-lifeos-muted">
            Protected Repeats
          </p>

          <p className="mt-1 text-xl font-bold text-lifeos-text-secondary">
            {
              analytics.zeroXPCompletionEvents
            }
          </p>

        </div>

      </div>

      {/* ======================================
          Categories
      ====================================== */}

      {hasActivity && (
        <div className="grid gap-x-8 gap-y-4 xl:grid-cols-2">

          {visibleBreakdown.map(
            (point) => (
              <div
                key={
                  point.category
                }
                className="space-y-2"
              >

                <div className="flex items-center justify-between gap-4">

                  <div className="flex min-w-0 items-center gap-3">

                    <div
                      className={`
                        flex
                        h-7
                        w-7
                        flex-none
                        items-center
                        justify-center
                        rounded-lg
                        border
                        border-lifeos-border
                        bg-lifeos-app
                        text-[11px]

                        ${getCategoryTextColor(
                          point
                        )}
                      `}
                    >
                      {
                        getCategoryIcon(
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

                      <p className="mt-0.5 text-[11px] text-lifeos-muted">
                        {
                          point.rewardedEvents
                        }{" "}
                        rewarded
                        {point.zeroXPEvents >
                          0 && (
                          <>
                            {" "}
                            ·{" "}
                            {
                              point.zeroXPEvents
                            }{" "}
                            protected
                          </>
                        )}
                      </p>

                    </div>

                  </div>

                  <div className="flex-none text-right">

                    <p
                      className={`
                        text-base
                        font-bold

                        ${getCategoryTextColor(
                          point
                        )}
                      `}
                    >
                      +{
                        point.xpEarned
                      }
                    </p>

                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-lifeos-muted">
                      {
                        point.percentage
                      }%
                    </p>

                  </div>

                </div>

                <div className="h-1.5 overflow-hidden rounded-full bg-lifeos-surface">

                  <div
                    className={`
                      h-full
                      rounded-full
                      transition-all
                      duration-700

                      ${getCategoryColor(
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
      )}

      {/* ======================================
          Empty State
      ====================================== */}

      {!hasActivity && (
        <div className="rounded-xl border border-dashed border-lifeos-border bg-lifeos-app/40 px-5 py-6 text-center">

          <p className="text-sm font-semibold text-lifeos-text-secondary">
            No XP earned in this period
          </p>

          <p className="mt-1 text-xs text-lifeos-muted">
            Complete tasks and planning outcomes to build XP history.
          </p>

        </div>
      )}

      {/* ======================================
          Anti-Farming Note
      ====================================== */}

      {analytics.zeroXPCompletionEvents >
        0 && (
        <div className="rounded-lg border border-lifeos-accent/15 bg-lifeos-accent/5 px-4 py-2.5">

          <p className="text-xs leading-5 text-lifeos-accent">
            {
              analytics.zeroXPCompletionEvents
            }{" "}
            repeated completion
            {
              analytics.zeroXPCompletionEvents ===
              1
                ? ""
                : "s"
            }{" "}
            earned no additional XP because anti-farming protection was active.
          </p>

        </div>
      )}

    </div>
  );
}