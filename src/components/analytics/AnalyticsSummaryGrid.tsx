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
          border-cyan-500/20
          bg-cyan-500/5
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
                tracking-[0.2em]
                text-cyan-400
              "
            >
              Completion
            </p>

            <h3 className="mt-3 text-3xl font-black text-white">
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
              border-cyan-500/20
              bg-cyan-500/10
              text-cyan-400
            "
          >
            <FaCheckCircle />
          </div>

        </div>

        <p className="mt-3 text-xs text-slate-500">
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
          border-emerald-500/20
          bg-emerald-500/5
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
                tracking-[0.2em]
                text-emerald-400
              "
            >
              Completed
            </p>

            <h3 className="mt-3 text-3xl font-black text-white">
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
              border-emerald-500/20
              bg-emerald-500/10
              text-emerald-400
            "
          >
            <FaCheckCircle />
          </div>

        </div>

        <p className="mt-3 text-xs text-slate-500">
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
          border-yellow-500/20
          bg-yellow-500/5
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
                tracking-[0.2em]
                text-yellow-400
              "
            >
              XP Earned
            </p>

            <h3 className="mt-3 text-3xl font-black text-white">
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
              border-yellow-500/20
              bg-yellow-500/10
              text-yellow-400
            "
          >
            <FaStar />
          </div>

        </div>

        <p className="mt-3 text-xs text-slate-500">
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
          border-purple-500/20
          bg-purple-500/5
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
                tracking-[0.2em]
                text-purple-400
              "
            >
              {fourthMetricLabel}
            </p>

            <h3 className="mt-3 text-3xl font-black text-white">
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
              border-purple-500/20
              bg-purple-500/10
              text-purple-400
            "
          >
            {showActiveDays ? (
              <FaFire />
            ) : (
              <FaClock />
            )}
          </div>

        </div>

        <p className="mt-3 text-xs text-slate-500">
          {showActiveDays
            ? "Days with real execution activity"
            : "Planned tasks still remaining"}
        </p>
      </div>

    </div>
  );
}