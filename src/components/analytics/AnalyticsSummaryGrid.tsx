import {
  FaCheckCircle,
  FaClock,
  FaFire,
  FaStar,
} from "react-icons/fa";

import type {
  AnalyticsPeriod,
} from "./AnalyticsPeriodSwitcher";

// ==========================================
// Types
// ==========================================

interface AnalyticsSummaryGridProps {
  period: AnalyticsPeriod;

  completionRate: number;

  completedTasks: number;

  xpEarned: number;

  pendingTasks: number;

  activeDays?: number;

  totalDays?: number;
}

// ==========================================
// Component
// ==========================================

export default function AnalyticsSummaryGrid({
  period,

  completionRate,

  completedTasks,

  xpEarned,

  pendingTasks,

  activeDays,

  totalDays,
}: AnalyticsSummaryGridProps) {
  const showActiveDays =
    period === "month" ||
    period === "year";

  const fourthMetricLabel =
    showActiveDays
      ? "Active Days"
      : "Pending";

  const fourthMetricValue =
    showActiveDays &&
    activeDays !== undefined &&
    totalDays !== undefined
      ? `${activeDays}/${totalDays}`
      : pendingTasks;

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">

      {/* ======================================
          Completion
      ====================================== */}

      <div
        className="
          rounded-xl
          border
          border-lifeos-accent/20
          bg-lifeos-accent/5
          p-5
        "
      >
        <div className="flex items-start justify-between gap-4">

          <div>
            <p
              className="
                text-[11px]
                font-semibold
                uppercase
                tracking-[0.12em]
                text-lifeos-accent
              "
            >
              Completion
            </p>

            <h3 className="mt-3 text-3xl font-bold text-lifeos-text">
              {completionRate}%
            </h3>
          </div>

          <div
            className="
              flex
              h-10
              w-10
              items-center
              justify-center
              rounded-lg
              border
              border-lifeos-accent/20
              bg-lifeos-accent/10
              text-lifeos-accent
            "
          >
            <FaCheckCircle />
          </div>

        </div>

        <p className="mt-3 text-xs text-lifeos-muted">
          Planned work completed
        </p>
      </div>

      {/* ======================================
          Completed
      ====================================== */}

      <div
        className="
          rounded-xl
          border
          border-lifeos-success/20
          bg-lifeos-success/5
          p-5
        "
      >
        <div className="flex items-start justify-between gap-4">

          <div>
            <p
              className="
                text-[11px]
                font-semibold
                uppercase
                tracking-[0.12em]
                text-lifeos-success
              "
            >
              Completed
            </p>

            <h3 className="mt-3 text-3xl font-bold text-lifeos-text">
              {completedTasks}
            </h3>
          </div>

          <div
            className="
              flex
              h-10
              w-10
              items-center
              justify-center
              rounded-lg
              border
              border-lifeos-success/20
              bg-lifeos-success/10
              text-lifeos-success
            "
          >
            <FaCheckCircle />
          </div>

        </div>

        <p className="mt-3 text-xs text-lifeos-muted">
          Tasks executed in this period
        </p>
      </div>

      {/* ======================================
          XP
      ====================================== */}

      <div
        className="
          rounded-xl
          border
          border-lifeos-warning/20
          bg-lifeos-warning/5
          p-5
        "
      >
        <div className="flex items-start justify-between gap-4">

          <div>
            <p
              className="
                text-[11px]
                font-semibold
                uppercase
                tracking-[0.12em]
                text-lifeos-warning
              "
            >
              XP Earned
            </p>

            <h3 className="mt-3 text-3xl font-bold text-lifeos-text">
              +{xpEarned}
            </h3>
          </div>

          <div
            className="
              flex
              h-10
              w-10
              items-center
              justify-center
              rounded-lg
              border
              border-lifeos-warning/20
              bg-lifeos-warning/10
              text-lifeos-warning
            "
          >
            <FaStar />
          </div>

        </div>

        <p className="mt-3 text-xs text-lifeos-muted">
          Experience gained
        </p>
      </div>

      {/* ======================================
          Pending / Active Days
      ====================================== */}

      <div
        className="
          rounded-xl
          border
          border-lifeos-chart-secondary/20
          bg-lifeos-chart-secondary/5
          p-5
        "
      >
        <div className="flex items-start justify-between gap-4">

          <div>
            <p
              className="
                text-[11px]
                font-semibold
                uppercase
                tracking-[0.12em]
                text-lifeos-chart-secondary
              "
            >
              {fourthMetricLabel}
            </p>

            <h3 className="mt-3 text-3xl font-bold text-lifeos-text">
              {fourthMetricValue}
            </h3>
          </div>

          <div
            className="
              flex
              h-10
              w-10
              items-center
              justify-center
              rounded-lg
              border
              border-lifeos-chart-secondary/20
              bg-lifeos-chart-secondary/10
              text-lifeos-chart-secondary
            "
          >
            {showActiveDays ? (
              <FaFire />
            ) : (
              <FaClock />
            )}
          </div>

        </div>

        <p className="mt-3 text-xs text-lifeos-muted">
          {showActiveDays
            ? "Days with real execution activity"
            : "Planned tasks still remaining"}
        </p>
      </div>

    </div>
  );
}