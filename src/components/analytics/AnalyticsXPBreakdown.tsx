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
      return "bg-cyan-400";

    case "weekly":
      return "bg-emerald-400";

    case "monthly":
      return "bg-purple-400";

    case "life_goal":
      return "bg-amber-400";

    case "other":
    default:
      return "bg-slate-400";
  }
}

function getCategoryTextColor(
  point: XPBreakdownPoint
): string {
  switch (point.category) {
    case "task":
      return "text-cyan-300";

    case "weekly":
      return "text-emerald-300";

    case "monthly":
      return "text-purple-300";

    case "life_goal":
      return "text-amber-300";

    case "other":
    default:
      return "text-slate-300";
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

        <div className="rounded-xl border border-amber-400/10 bg-amber-400/5 px-4 py-3">

          <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-amber-400/60">
            XP Earned
          </p>

          <p className="mt-1 text-2xl font-black text-amber-300">
            +{analytics.totalXP}
          </p>

        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-950/45 px-4 py-3">

          <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-slate-600">
            Rewarded Events
          </p>

          <p className="mt-1 text-xl font-black text-white">
            {
              analytics.rewardedEvents
            }
          </p>

        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-950/45 px-4 py-3">

          <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-slate-600">
            Protected Repeats
          </p>

          <p className="mt-1 text-xl font-black text-slate-300">
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
                        border-slate-800
                        bg-slate-950
                        text-[10px]

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

                      <p className="truncate text-sm font-semibold text-white">
                        {
                          point.label
                        }
                      </p>

                      <p className="mt-0.5 text-[11px] text-slate-600">
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
                        font-black

                        ${getCategoryTextColor(
                          point
                        )}
                      `}
                    >
                      +{
                        point.xpEarned
                      }
                    </p>

                    <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-slate-600">
                      {
                        point.percentage
                      }%
                    </p>

                  </div>

                </div>

                <div className="h-1.5 overflow-hidden rounded-full bg-slate-900">

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
        <div className="rounded-xl border border-dashed border-slate-800 bg-slate-950/40 px-5 py-6 text-center">

          <p className="text-sm font-semibold text-slate-300">
            No XP earned in this period
          </p>

          <p className="mt-1 text-xs text-slate-500">
            Complete tasks and planning outcomes to build XP history.
          </p>

        </div>
      )}

      {/* ======================================
          Anti-Farming Note
      ====================================== */}

      {analytics.zeroXPCompletionEvents >
        0 && (
        <div className="rounded-lg border border-cyan-500/15 bg-cyan-500/5 px-4 py-2.5">

          <p className="text-xs leading-5 text-cyan-200">
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