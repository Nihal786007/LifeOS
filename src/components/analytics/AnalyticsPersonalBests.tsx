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
      <div className="rounded-xl border border-dashed border-lifeos-border bg-lifeos-app/40 px-5 py-10 text-center">

        <p className="text-sm font-semibold text-lifeos-text-secondary">
          No personal records yet
        </p>

        <p className="mt-2 text-xs leading-5 text-lifeos-muted">
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

      <div className="rounded-2xl border border-lifeos-border bg-lifeos-app/45 p-5">

        <div className="flex items-start justify-between gap-4">

          <div>

            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-lifeos-muted">
              Most Tasks in One Day
            </p>

            <p className="mt-3 text-3xl font-bold text-lifeos-text">
              {
                analytics.mostTasksDay
                  ?.completedTasks ??
                0
              }
            </p>

            <p className="mt-1 text-xs text-lifeos-muted">
              completed tasks
            </p>

          </div>

          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-lifeos-warning/15 bg-lifeos-warning/5 text-lifeos-warning">
            <FaTrophy />
          </div>

        </div>

        <div className="mt-5 border-t border-lifeos-border pt-4">

          <p className="text-sm font-semibold text-lifeos-text-secondary">
            {
              formatShortDate(
                analytics.mostTasksDay
                  ?.date
              )
            }
          </p>

          {analytics.mostTasksDay && (
            <p className="mt-1 text-xs text-lifeos-muted">
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

      <div className="rounded-2xl border border-lifeos-border bg-lifeos-app/45 p-5">

        <div className="flex items-start justify-between gap-4">

          <div>

            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-lifeos-muted">
              Most XP in One Day
            </p>

            <p className="mt-3 text-3xl font-bold text-lifeos-warning">
              +{
                analytics.mostXPDay
                  ?.xpEarned ??
                0
              }
            </p>

            <p className="mt-1 text-xs text-lifeos-muted">
              XP
            </p>

          </div>

          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-lifeos-accent/15 bg-lifeos-accent/5 text-lifeos-accent">
            <FaBolt />
          </div>

        </div>

        <div className="mt-5 border-t border-lifeos-border pt-4">

          <p className="text-sm font-semibold text-lifeos-text-secondary">
            {
              formatShortDate(
                analytics.mostXPDay
                  ?.date
              )
            }
          </p>

          {analytics.mostXPDay && (
            <p className="mt-1 text-xs text-lifeos-muted">
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

      <div className="rounded-2xl border border-lifeos-border bg-lifeos-app/45 p-5">

        <div className="flex items-start justify-between gap-4">

          <div>

            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-lifeos-muted">
              Longest Execution Streak
            </p>

            <p className="mt-3 text-3xl font-bold text-lifeos-warning">
              {
                analytics
                  .longestExecutionStreak
                  .days
              }
            </p>

            <p className="mt-1 text-xs text-lifeos-muted">
              consecutive days
            </p>

          </div>

          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-lifeos-warning/15 bg-lifeos-warning/5 text-lifeos-warning">
            <FaFire />
          </div>

        </div>

        <div className="mt-5 border-t border-lifeos-border pt-4">

          <p className="text-sm font-semibold text-lifeos-text-secondary">
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

          <p className="mt-1 text-xs text-lifeos-muted">
            At least one completed task every day
          </p>

        </div>

      </div>

      {/* ======================================
          Best Month
      ====================================== */}

      <div className="rounded-2xl border border-lifeos-border bg-lifeos-app/45 p-5">

        <div className="flex items-start justify-between gap-4">

          <div>

            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-lifeos-muted">
              Best Month
            </p>

            <p className="mt-3 text-xl font-bold text-lifeos-chart-secondary">
              {
                analytics.bestMonth
                  ?.label ??
                "—"
              }
            </p>

            <p className="mt-1 text-xs text-lifeos-muted">
              strongest execution month
            </p>

          </div>

          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-lifeos-chart-secondary/15 bg-lifeos-chart-secondary/5 text-lifeos-chart-secondary">
            <FaCalendarAlt />
          </div>

        </div>

        <div className="mt-5 grid grid-cols-3 gap-3 border-t border-lifeos-border pt-4">

          <div>

            <p className="text-lg font-bold text-lifeos-text">
              {
                analytics.bestMonth
                  ?.completedTasks ??
                0
              }
            </p>

            <p className="text-[11px] uppercase tracking-[0.14em] text-lifeos-muted">
              Tasks
            </p>

          </div>

          <div>

            <p className="text-lg font-bold text-lifeos-success">
              {
                analytics.bestMonth
                  ?.activeDays ??
                0
              }
            </p>

            <p className="text-[11px] uppercase tracking-[0.14em] text-lifeos-muted">
              Active Days
            </p>

          </div>

          <div>

            <p className="text-lg font-bold text-lifeos-warning">
              +{
                analytics.bestMonth
                  ?.xpEarned ??
                0
              }
            </p>

            <p className="text-[11px] uppercase tracking-[0.14em] text-lifeos-muted">
              XP
            </p>

          </div>

        </div>

      </div>

    </div>
  );
}