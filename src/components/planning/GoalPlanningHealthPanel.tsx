import {
  useMemo,
  useState,
} from "react";

import {
  FaChevronDown,
  FaChevronRight,
  FaCircleCheck,
  FaTriangleExclamation,
} from "react-icons/fa6";

import {
  GoalPlanningHealthEngine,
} from "../../engines/GoalPlanningHealthEngine";

import {
  useLifeGoals,
} from "../../context/LifeGoalsContext";

import {
  useMonthlyPlanning,
} from "../../context/MonthlyPlanningContext";

import {
  useWeeklyPlanning,
} from "../../context/WeeklyPlanningContext";

import {
  useTasks,
} from "../../context/TaskContext";

// ==========================================
// Types
// ==========================================

interface GoalPlanningHealthPanelProps {
  goalId: number;
}

// ==========================================
// Component
// ==========================================

export default function GoalPlanningHealthPanel({
  goalId,
}: GoalPlanningHealthPanelProps) {
  const {
    lifeGoals,
  } = useLifeGoals();

  const {
    monthlyPlans,
  } = useMonthlyPlanning();

  const {
    weeklyTargets,
  } = useWeeklyPlanning();

  const {
    tasks,
  } = useTasks();

  const [
    expanded,
    setExpanded,
  ] = useState(false);

  // ==========================================
  // Health Report
  // ==========================================

  const report =
    useMemo(
      () =>
        GoalPlanningHealthEngine.analyze(
          {
            lifeGoals,

            monthlyTargets:
              monthlyPlans,

            weeklyTargets,

            tasks,
          },
          goalId
        ),
      [
        lifeGoals,
        monthlyPlans,
        weeklyTargets,
        tasks,
        goalId,
      ]
    );

  if (!report) {
    return null;
  }

  // ==========================================
  // Derived Health State
  // ==========================================

  const hasIntegrityIssues =
    report.integrityErrorCount > 0 ||
    report.integrityWarningCount > 0;

  const hasPlanningGaps =
    report.missingWeeks > 0;

  const hasOverdueTasks =
    report.overdueTasks > 0;

  const needsAttention =
    hasIntegrityIssues ||
    hasPlanningGaps ||
    hasOverdueTasks ||
    report.workload.concentrated;

  const currentWeekLabel =
    !report.currentWeek
      ? "Outside timeline"
      : report.currentWeekPlanned
        ? "Current week planned"
        : "Current week not planned";

  const currentWeekClass =
    !report.currentWeek
      ? "text-slate-500"
      : report.currentWeekPlanned
        ? "text-emerald-400"
        : "text-amber-400";

  const coverageClass =
    report.planningCoveragePercent ===
    100
      ? "text-emerald-400"
      : report.planningCoveragePercent >=
          60
        ? "text-amber-400"
        : "text-red-400";

  // ==========================================
  // UI
  // ==========================================

  return (
    <div
      className="
        overflow-hidden
        rounded-xl
        border
        border-slate-800
        bg-slate-950/30
      "
    >
      {/* ======================================
          Compact Header
      ====================================== */}

      <button
        type="button"
        onClick={() =>
          setExpanded(
            (current) =>
              !current
          )
        }
        className="
          flex
          w-full
          items-center
          gap-3
          px-4
          py-4
          text-left
          transition
          hover:bg-slate-800/25
        "
      >
        <div
          className={`
            flex
            h-9
            w-9
            shrink-0
            items-center
            justify-center
            rounded-lg
            border
            ${
              needsAttention
                ? "border-amber-500/20 bg-amber-500/5 text-amber-400"
                : "border-emerald-500/20 bg-emerald-500/5 text-emerald-400"
            }
          `}
        >
          {needsAttention ? (
            <FaTriangleExclamation />
          ) : (
            <FaCircleCheck />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div
            className="
              flex
              flex-wrap
              items-center
              gap-x-3
              gap-y-1
            "
          >
            <span
              className="
                text-[10px]
                font-bold
                uppercase
                tracking-wider
                text-cyan-400
              "
            >
              Planning Health
            </span>

            <span
              className={`
                text-[10px]
                font-semibold
                ${
                  needsAttention
                    ? "text-amber-400"
                    : "text-emerald-400"
                }
              `}
            >
              {needsAttention
                ? "Needs attention"
                : "Healthy"}
            </span>
          </div>

          <div
            className="
              mt-1.5
              flex
              flex-wrap
              items-center
              gap-x-2
              gap-y-1
              text-[11px]
            "
          >
            <span
              className={
                coverageClass
              }
            >
              {
                report.planningCoveragePercent
              }
              % coverage
            </span>

            <span className="text-slate-700">
              ·
            </span>

            <span
              className={
                currentWeekClass
              }
            >
              {currentWeekLabel}
            </span>

            <span className="text-slate-700">
              ·
            </span>

            <span
              className={
                hasOverdueTasks
                  ? "text-red-400"
                  : "text-slate-500"
              }
            >
              {
                report.overdueTasks
              }{" "}
              overdue
            </span>

            <span className="text-slate-700">
              ·
            </span>

            <span
              className={
                hasIntegrityIssues
                  ? "text-amber-400"
                  : "text-slate-500"
              }
            >
              {hasIntegrityIssues
                ? `${report.integrityErrorCount} errors · ${report.integrityWarningCount} warnings`
                : "Structure clean"}
            </span>
          </div>

          {hasPlanningGaps && (
            <p
              className="
                mt-1
                text-[10px]
                font-medium
                text-amber-300
              "
            >
              {
                report.missingWeeks
              }{" "}
              {report.missingWeeks ===
              1
                ? "week needs planning"
                : "weeks need planning"}
            </p>
          )}
        </div>

        <span
          className="
            shrink-0
            text-xs
            text-slate-600
          "
        >
          {expanded ? (
            <FaChevronDown />
          ) : (
            <FaChevronRight />
          )}
        </span>
      </button>

      {/* ======================================
          Expanded Details
      ====================================== */}

      {expanded && (
        <div
          className="
            space-y-5
            border-t
            border-slate-800
            bg-slate-950/20
            p-4
          "
        >
          {/* ====================================
              Summary
          ==================================== */}

          <div>
            <p
              className="
                text-[10px]
                font-bold
                uppercase
                tracking-wider
                text-slate-500
              "
            >
              Summary
            </p>

            <p
              className="
                mt-2
                text-xs
                leading-5
                text-slate-400
              "
            >
              {report.summary}
            </p>
          </div>

          {/* ====================================
              Missing Weekly Focuses
          ==================================== */}

          <div
            className="
              border-t
              border-slate-800
              pt-4
            "
          >
            <div
              className="
                flex
                items-center
                justify-between
                gap-3
              "
            >
              <p
                className="
                  text-[10px]
                  font-bold
                  uppercase
                  tracking-wider
                  text-slate-500
                "
              >
                Weekly Planning
              </p>

              <span
                className={`
                  text-[10px]
                  font-semibold
                  ${
                    hasPlanningGaps
                      ? "text-amber-400"
                      : "text-emerald-400"
                  }
                `}
              >
                {
                  report.plannedWeeks
                }
                /
                {
                  report.totalActiveWeeks
                }{" "}
                planned
              </span>
            </div>

            {report.missingWeeks ===
            0 ? (
              <p
                className="
                  mt-2
                  text-xs
                  text-emerald-400
                "
              >
                Every active calendar week has a Weekly Focus.
              </p>
            ) : (
              <>
                <p
                  className="
                    mt-2
                    text-[11px]
                    leading-5
                    text-slate-500
                  "
                >
                  These real calendar weeks still need a Weekly Focus:
                </p>

                <div
                  className="
                    mt-2
                    flex
                    flex-wrap
                    gap-2
                  "
                >
                  {report.missingWeekRanges.map(
                    (week) => (
                      <span
                        key={`${week.weekStartDate}:${week.weekEndDate}`}
                        className="
                          rounded-md
                          border
                          border-amber-500/20
                          bg-amber-500/5
                          px-2
                          py-1
                          text-[10px]
                          font-medium
                          text-amber-300
                        "
                      >
                        {
                          week.displayLabel
                        }
                      </span>
                    )
                  )}
                </div>
              </>
            )}
          </div>

          {/* ====================================
              Task Execution
          ==================================== */}

          <div
            className="
              border-t
              border-slate-800
              pt-4
            "
          >
            <p
              className="
                text-[10px]
                font-bold
                uppercase
                tracking-wider
                text-slate-500
              "
            >
              Task Execution
            </p>

            <div
              className="
                mt-2
                flex
                flex-wrap
                gap-x-4
                gap-y-2
                text-[11px]
              "
            >
              <span className="text-slate-400">
                <span
                  className="
                    font-semibold
                    text-emerald-400
                  "
                >
                  {
                    report.completedTasks
                  }
                </span>{" "}
                completed
              </span>

              <span className="text-slate-400">
                <span
                  className="
                    font-semibold
                    text-slate-300
                  "
                >
                  {
                    report.incompleteTasks
                  }
                </span>{" "}
                incomplete
              </span>

              <span
                className={
                  hasOverdueTasks
                    ? "text-red-400"
                    : "text-slate-500"
                }
              >
                <span className="font-semibold">
                  {
                    report.overdueTasks
                  }
                </span>{" "}
                overdue
              </span>
            </div>
          </div>

          {/* ====================================
              Workload
          ==================================== */}

          <div
            className="
              border-t
              border-slate-800
              pt-4
            "
          >
            <p
              className="
                text-[10px]
                font-bold
                uppercase
                tracking-wider
                text-slate-500
              "
            >
              Workload
            </p>

            <p
              className="
                mt-2
                text-xs
                text-slate-400
              "
            >
              Average{" "}
              <span
                className="
                  font-semibold
                  text-slate-300
                "
              >
                {
                  report.workload
                    .averageTasksPerPlannedWeek
                }
              </span>{" "}
              tasks per planned week.
            </p>

            {report.workload
              .busiestWeek && (
              <p
                className="
                  mt-1
                  text-[11px]
                  text-slate-500
                "
              >
                Busiest week:{" "}
                {
                  report.workload
                    .busiestWeek
                    .displayLabel
                }
                {" · "}
                {
                  report.workload
                    .busiestWeek
                    .taskCount
                }{" "}
                tasks
              </p>
            )}

            {report.workload
              .concentrated &&
              report.workload
                .message && (
                <div
                  className="
                    mt-3
                    rounded-lg
                    border
                    border-amber-500/20
                    bg-amber-500/5
                    px-3
                    py-2
                  "
                >
                  <p
                    className="
                      text-[11px]
                      leading-5
                      text-amber-300
                    "
                  >
                    {
                      report.workload
                        .message
                    }
                  </p>
                </div>
              )}
          </div>

          {/* ====================================
              Structural Integrity
          ==================================== */}

          {hasIntegrityIssues && (
            <div
              className="
                border-t
                border-slate-800
                pt-4
              "
            >
              <p
                className="
                  text-[10px]
                  font-bold
                  uppercase
                  tracking-wider
                  text-slate-500
                "
              >
                Structural Integrity
              </p>

              <p
                className="
                  mt-2
                  text-xs
                  leading-5
                  text-amber-300
                "
              >
                {
                  report.integrityErrorCount
                }{" "}
                errors and{" "}
                {
                  report.integrityWarningCount
                }{" "}
                warnings were detected.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}