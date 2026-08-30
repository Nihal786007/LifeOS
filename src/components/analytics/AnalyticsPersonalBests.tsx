import {
  FaBolt,
  FaCalendarAlt,
  FaFire,
  FaTrophy,
} from "react-icons/fa";

import type {
  PersonalBestsAnalytics,
} from "../../engines/AnalyticsEngine";

// ==========================================
// Types
// ==========================================

interface AnalyticsPersonalBestsProps {
  analytics:
    PersonalBestsAnalytics;
}

// ==========================================
// Date Helpers
// ==========================================

function parseLocalDate(
  value?: string
): Date | undefined {
  if (!value) {
    return undefined;
  }

  const match =
    /^(\d{4})-(\d{2})-(\d{2})$/.exec(
      value
    );

  if (!match) {
    return undefined;
  }

  const year =
    Number(
      match[1]
    );

  const month =
    Number(
      match[2]
    );

  const day =
    Number(
      match[3]
    );

  const date =
    new Date(
      year,
      month - 1,
      day
    );

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return undefined;
  }

  return date;
}

function formatShortDate(
  value?: string
): string {
  const date =
    parseLocalDate(
      value
    );

  if (!date) {
    return "—";
  }

  return date.toLocaleDateString(
    undefined,
    {
      month: "short",
      day: "numeric",
    }
  );
}

function formatDateRange(
  startDate?: string,
  endDate?: string
): string {
  if (
    !startDate ||
    !endDate
  ) {
    return "—";
  }

  const start =
    parseLocalDate(
      startDate
    );

  const end =
    parseLocalDate(
      endDate
    );

  if (
    !start ||
    !end
  ) {
    return "—";
  }

  const sameDate =
    startDate ===
    endDate;

  if (sameDate) {
    return formatShortDate(
      startDate
    );
  }

  const sameMonth =
    start.getFullYear() ===
      end.getFullYear() &&
    start.getMonth() ===
      end.getMonth();

  if (sameMonth) {
    const month =
      start.toLocaleDateString(
        undefined,
        {
          month: "short",
        }
      );

    return `${month} ${start.getDate()}–${end.getDate()}`;
  }

  return `${formatShortDate(
    startDate
  )}–${formatShortDate(
    endDate
  )}`;
}

// ==========================================
// Component
// ==========================================

export default function AnalyticsPersonalBests({
  analytics,
}: AnalyticsPersonalBestsProps) {
  const hasData =
    Boolean(
      analytics.mostTasksDay ||
      analytics.mostXPDay ||
      analytics.bestMonth ||
      analytics.longestExecutionStreak.days >
        0
    );

  if (!hasData) {
    return (
      <div className="rounded-xl border border-dashed border-slate-800 bg-slate-950/40 px-5 py-10 text-center">

        <p className="text-sm font-semibold text-slate-300">
          No personal records yet
        </p>

        <p className="mt-2 text-xs leading-5 text-slate-500">
          Complete tasks consistently and LifeOS will start discovering your strongest execution records.
        </p>

      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">

      {/* ======================================
          Most Tasks Day
      ====================================== */}

      <div className="rounded-2xl border border-slate-800 bg-slate-950/45 p-5">

        <div className="flex items-start justify-between gap-4">

          <div>

            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
              Most Tasks in One Day
            </p>

            <p className="mt-3 text-3xl font-black text-white">
              {
                analytics.mostTasksDay
                  ?.completedTasks ??
                0
              }
            </p>

            <p className="mt-1 text-xs text-slate-500">
              completed tasks
            </p>

          </div>

          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-amber-400/15 bg-amber-400/5 text-amber-300">
            <FaTrophy />
          </div>

        </div>

        <div className="mt-5 border-t border-slate-800 pt-4">

          <p className="text-sm font-semibold text-slate-300">
            {
              formatShortDate(
                analytics.mostTasksDay
                  ?.date
              )
            }
          </p>

          {analytics.mostTasksDay && (
            <p className="mt-1 text-xs text-slate-500">
              +{
                analytics.mostTasksDay
                  .xpEarned
              } XP earned
            </p>
          )}

        </div>

      </div>

      {/* ======================================
          Most XP Day
      ====================================== */}

      <div className="rounded-2xl border border-slate-800 bg-slate-950/45 p-5">

        <div className="flex items-start justify-between gap-4">

          <div>

            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
              Most XP in One Day
            </p>

            <p className="mt-3 text-3xl font-black text-amber-300">
              +{
                analytics.mostXPDay
                  ?.xpEarned ??
                0
              }
            </p>

            <p className="mt-1 text-xs text-slate-500">
              XP
            </p>

          </div>

          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-cyan-400/15 bg-cyan-400/5 text-cyan-300">
            <FaBolt />
          </div>

        </div>

        <div className="mt-5 border-t border-slate-800 pt-4">

          <p className="text-sm font-semibold text-slate-300">
            {
              formatShortDate(
                analytics.mostXPDay
                  ?.date
              )
            }
          </p>

          {analytics.mostXPDay && (
            <p className="mt-1 text-xs text-slate-500">
              {
                analytics.mostXPDay
                  .completedTasks
              }{" "}
              task
              {
                analytics.mostXPDay
                  .completedTasks ===
                1
                  ? ""
                  : "s"
              }{" "}
              completed
            </p>
          )}

        </div>

      </div>

      {/* ======================================
          Longest Execution Streak
      ====================================== */}

      <div className="rounded-2xl border border-slate-800 bg-slate-950/45 p-5">

        <div className="flex items-start justify-between gap-4">

          <div>

            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
              Longest Execution Streak
            </p>

            <p className="mt-3 text-3xl font-black text-orange-300">
              {
                analytics
                  .longestExecutionStreak
                  .days
              }
            </p>

            <p className="mt-1 text-xs text-slate-500">
              consecutive days
            </p>

          </div>

          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-orange-400/15 bg-orange-400/5 text-orange-300">
            <FaFire />
          </div>

        </div>

        <div className="mt-5 border-t border-slate-800 pt-4">

          <p className="text-sm font-semibold text-slate-300">
            {
              formatDateRange(
                analytics
                  .longestExecutionStreak
                  .startDate,
                analytics
                  .longestExecutionStreak
                  .endDate
              )
            }
          </p>

          <p className="mt-1 text-xs text-slate-500">
            At least one completed task every day
          </p>

        </div>

      </div>

      {/* ======================================
          Best Month
      ====================================== */}

      <div className="rounded-2xl border border-slate-800 bg-slate-950/45 p-5">

        <div className="flex items-start justify-between gap-4">

          <div>

            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
              Best Month
            </p>

            <p className="mt-3 text-xl font-black text-purple-300">
              {
                analytics.bestMonth
                  ?.label ??
                "—"
              }
            </p>

            <p className="mt-1 text-xs text-slate-500">
              strongest execution month
            </p>

          </div>

          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-purple-400/15 bg-purple-400/5 text-purple-300">
            <FaCalendarAlt />
          </div>

        </div>

        <div className="mt-5 grid grid-cols-3 gap-3 border-t border-slate-800 pt-4">

          <div>

            <p className="text-lg font-black text-white">
              {
                analytics.bestMonth
                  ?.completedTasks ??
                0
              }
            </p>

            <p className="text-[10px] uppercase tracking-[0.14em] text-slate-600">
              Tasks
            </p>

          </div>

          <div>

            <p className="text-lg font-black text-emerald-300">
              {
                analytics.bestMonth
                  ?.activeDays ??
                0
              }
            </p>

            <p className="text-[10px] uppercase tracking-[0.14em] text-slate-600">
              Active Days
            </p>

          </div>

          <div>

            <p className="text-lg font-black text-amber-300">
              +{
                analytics.bestMonth
                  ?.xpEarned ??
                0
              }
            </p>

            <p className="text-[10px] uppercase tracking-[0.14em] text-slate-600">
              XP
            </p>

          </div>

        </div>

      </div>

    </div>
  );
}