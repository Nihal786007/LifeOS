import {
  useMemo,
  useState,
} from "react";

import {
  FaChevronDown,
  FaChevronRight,
  FaFlagCheckered,
  FaPlus,
  FaTrash,
} from "react-icons/fa6";

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

import {
  usePlanningExecution,
} from "../../context/PlanningExecutionContext";

import {
  TaskRelationshipEngine,
} from "../../engines/TaskRelationshipEngine";

import GoalModal from "./GoalModal";
import MonthlyTargetModal from "./MonthlyTargetModal";
import SmartGoalTimeline from "./SmartGoalTimeline";
import GoalMonthPlanner from "./GoalMonthPlanner";

import type {
  LifeGoal,
} from "../../shared/types";

// ==========================================
// Types
// ==========================================

interface SelectedGoalMonth {
  goalId: number;
  month: number;
  year: number;
}

// ==========================================
// Helpers
// ==========================================

function parseDate(
  value?: string
) {
  if (!value) {
    return undefined;
  }

  const dateOnly =
    /^(\d{4})-(\d{2})-(\d{2})$/.exec(
      value
    );

  if (dateOnly) {
    return new Date(
      Number(
        dateOnly[1]
      ),
      Number(
        dateOnly[2]
      ) - 1,
      Number(
        dateOnly[3]
      )
    );
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return undefined;
  }

  return date;
}

function formatDate(
  value?: string
) {
  const date =
    parseDate(value);

  if (!date) {
    return undefined;
  }

  return date.toLocaleDateString(
    undefined,
    {
      month: "short",
      day: "numeric",
      year: "numeric",
    }
  );
}

function clampProgress(
  progress: number
) {
  return Math.min(
    100,
    Math.max(
      0,
      Math.round(progress)
    )
  );
}

// ==========================================
// Component
// ==========================================

export default function LifeGoalPlanner() {
  const {
    lifeGoals,
    addGoal,
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

  const {
    deleteLifeGoal,
  } = usePlanningExecution();

  // ==========================================
  // Modal State
  // ==========================================

  const [
    goalModalOpen,
    setGoalModalOpen,
  ] = useState(false);

  const [
    selectedGoalMonth,
    setSelectedGoalMonth,
  ] = useState<
    SelectedGoalMonth | undefined
  >(undefined);

  // ==========================================
  // Expansion State
  // ==========================================

  const [
    expandedGoals,
    setExpandedGoals,
  ] = useState<
    Set<number>
  >(
    () =>
      new Set<number>()
  );

  // ==========================================
  // Relationship State
  // ==========================================

  const relationshipState =
    useMemo(
      () => ({
        lifeGoals,

        monthlyTargets:
          monthlyPlans,

        weeklyTargets,

        tasks,
      }),
      [
        lifeGoals,
        monthlyPlans,
        weeklyTargets,
        tasks,
      ]
    );

  // ==========================================
  // Goal Ordering
  // ==========================================

  const orderedGoals =
    useMemo(() => {
      return [
        ...lifeGoals,
      ].sort(
        (
          first,
          second
        ) => {
          if (
            first.completed !==
            second.completed
          ) {
            return first.completed
              ? 1
              : -1;
          }

          return (
            new Date(
              first.createdAt
            ).getTime() -
            new Date(
              second.createdAt
            ).getTime()
          );
        }
      );
    }, [lifeGoals]);

  // ==========================================
  // Goal Months
  // ==========================================

  function getGoalMonths(
    goalId: number
  ) {
    return monthlyPlans
      .filter(
        (plan) =>
          plan.goalId ===
          goalId
      )
      .sort(
        (
          first,
          second
        ) => {
          if (
            first.year !==
            second.year
          ) {
            return (
              first.year -
              second.year
            );
          }

          return (
            first.month -
            second.month
          );
        }
      );
  }

  // ==========================================
  // Goal Creation
  // ==========================================

  function handleCreateGoal(
    title: string,
    description: string,
    targetDate?: string
  ) {
    addGoal(
      title,
      description,
      targetDate
    );
  }

  // ==========================================
  // Smart Month Planning
  // ==========================================

  function handlePlanMonth(
    goalId: number,
    month: number,
    year: number
  ) {
    const alreadyExists =
      monthlyPlans.some(
        (plan) =>
          plan.goalId ===
            goalId &&
          plan.month ===
            month &&
          plan.year ===
            year
      );

    if (alreadyExists) {
      return;
    }

    setSelectedGoalMonth({
      goalId,
      month,
      year,
    });
  }

  function closeMonthModal() {
    setSelectedGoalMonth(
      undefined
    );
  }

  // ==========================================
  // Goal Expansion
  // ==========================================

  function toggleGoal(
    goalId: number
  ) {
    setExpandedGoals(
      (previous) => {
        const next =
          new Set(
            previous
          );

        if (
          next.has(goalId)
        ) {
          next.delete(
            goalId
          );
        } else {
          next.add(
            goalId
          );
        }

        return next;
      }
    );
  }

  // ==========================================
  // Goal Delete
  // ==========================================

  function handleGoalDelete(
    goal: LifeGoal
  ) {
    const confirmed =
      window.confirm(
        `Delete "${goal.title}" and its linked planning structure?`
      );

    if (!confirmed) {
      return;
    }

    deleteLifeGoal(
      goal.id
    );
  }

  // ==========================================
  // Planner
  // ==========================================

  return (
    <>
      <div className="space-y-3">

        {/* ======================================
            Planner Actions
        ====================================== */}

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
              text-xs
              font-medium
              text-slate-500
            "
          >
            {orderedGoals.length === 0
              ? "Start designing your long-term direction."
              : `${orderedGoals.length} ${
                  orderedGoals.length === 1
                    ? "life goal"
                    : "life goals"
                }`}
          </p>

          <button
            type="button"
            onClick={() =>
              setGoalModalOpen(
                true
              )
            }
            className="
              inline-flex
              shrink-0
              items-center
              gap-2
              rounded-lg
              border
              border-cyan-500/25
              bg-cyan-500/10
              px-3
              py-2
              text-xs
              font-semibold
              text-cyan-300
              transition
              hover:border-cyan-400/40
              hover:bg-cyan-500/15
              hover:text-cyan-200
            "
          >
            <FaPlus />

            New Goal
          </button>
        </div>

        {/* ======================================
            Empty State
        ====================================== */}

        {orderedGoals.length === 0 ? (
          <div
            className="
              rounded-xl
              border
              border-dashed
              border-slate-800
              bg-slate-950/40
              px-6
              py-12
              text-center
            "
          >
            <div
              className="
                mx-auto
                flex
                h-10
                w-10
                items-center
                justify-center
                rounded-xl
                border
                border-cyan-500/20
                bg-cyan-500/10
                text-cyan-400
              "
            >
              <FaFlagCheckered />
            </div>

            <p
              className="
                mt-4
                text-sm
                font-semibold
                text-slate-300
              "
            >
              No Life Goals yet
            </p>

            <p
              className="
                mx-auto
                mt-1
                max-w-md
                text-xs
                leading-5
                text-slate-600
              "
            >
              Create a long-term outcome and LifeOS
              will organize it into months, real
              calendar weeks, and Universal Tasks.
            </p>

            <button
              type="button"
              onClick={() =>
                setGoalModalOpen(
                  true
                )
              }
              className="
                mt-5
                inline-flex
                items-center
                gap-2
                rounded-lg
                bg-cyan-500
                px-4
                py-2.5
                text-xs
                font-bold
                text-slate-950
                transition
                hover:bg-cyan-400
              "
            >
              <FaPlus />

              Create Life Goal
            </button>
          </div>
        ) : (
          <div className="space-y-2">

            {orderedGoals.map(
              (goal) => {
                const goalMonths =
                  getGoalMonths(
                    goal.id
                  );

                const goalTasks =
                  TaskRelationshipEngine
                    .getTasksForLifeGoal(
                      relationshipState,
                      goal.id
                    );

                const completedTasks =
                  goalTasks.filter(
                    (task) =>
                      task.completed
                  ).length;

                const goalExpanded =
                  expandedGoals.has(
                    goal.id
                  );

                const progress =
                  clampProgress(
                    goal.progress
                  );

                const targetDate =
                  formatDate(
                    goal.targetDate
                  );

                const startDate =
                  formatDate(
                    goal.startDate
                  );

                return (
                  <article
                    key={
                      goal.id
                    }
                    className="
                      overflow-hidden
                      rounded-xl
                      border
                      border-slate-800
                      bg-slate-950/35
                    "
                  >

                    {/* =========================
                        Compact Goal Row
                    ========================= */}

                    <div
                      className="
                        flex
                        min-h-14
                        items-center
                        gap-3
                        px-3
                        py-2
                      "
                    >
                      <button
                        type="button"
                        onClick={() =>
                          toggleGoal(
                            goal.id
                          )
                        }
                        className="
                          flex
                          h-8
                          w-8
                          shrink-0
                          items-center
                          justify-center
                          rounded-md
                          text-slate-500
                          transition
                          hover:bg-slate-800
                          hover:text-white
                        "
                        aria-label={
                          goalExpanded
                            ? "Close goal profile"
                            : "Open goal profile"
                        }
                      >
                        {goalExpanded ? (
                          <FaChevronDown />
                        ) : (
                          <FaChevronRight />
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          toggleGoal(
                            goal.id
                          )
                        }
                        className="
                          min-w-0
                          flex-1
                          text-left
                        "
                      >
                        <div
                          className="
                            flex
                            flex-wrap
                            items-center
                            gap-x-3
                            gap-y-1
                          "
                        >
                          <h3
                            className={`
                              truncate
                              text-sm
                              font-semibold
                              ${
                                goal.completed
                                  ? "text-slate-500 line-through"
                                  : "text-white"
                              }
                            `}
                          >
                            {goal.title}
                          </h3>

                          {targetDate && (
                            <span
                              className="
                                hidden
                                text-[11px]
                                text-slate-600
                                md:inline
                              "
                            >
                              Target {targetDate}
                            </span>
                          )}
                        </div>

                        <div
                          className="
                            mt-1.5
                            flex
                            items-center
                            gap-2
                          "
                        >
                          <div
                            className="
                              h-1
                              max-w-40
                              flex-1
                              overflow-hidden
                              rounded-full
                              bg-slate-800
                            "
                          >
                            <div
                              className="
                                h-full
                                rounded-full
                                bg-cyan-400
                                transition-all
                                duration-300
                              "
                              style={{
                                width:
                                  `${progress}%`,
                              }}
                            />
                          </div>

                          <span
                            className="
                              text-[11px]
                              font-medium
                              text-slate-400
                            "
                          >
                            {progress}%
                          </span>

                          <span
                            className="
                              hidden
                              text-[11px]
                              text-slate-600
                              sm:inline
                            "
                          >
                            {completedTasks}/
                            {goalTasks.length}
                            {" "}
                            tasks
                          </span>
                        </div>
                      </button>

                      <div
                        className="
                          hidden
                          items-center
                          gap-2
                          lg:flex
                        "
                      >
                        <span
                          className="
                            rounded-md
                            border
                            border-slate-800
                            bg-slate-900
                            px-2
                            py-1
                            text-[10px]
                            text-slate-500
                          "
                        >
                          {goalMonths.length}
                          {" "}
                          planned
                        </span>

                        <span
                          className={`
                            rounded-md
                            border
                            px-2
                            py-1
                            text-[10px]
                            ${
                              goal.completed
                                ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-400"
                                : "border-cyan-500/20 bg-cyan-500/10 text-cyan-300"
                            }
                          `}
                        >
                          {goal.completed
                            ? "Completed"
                            : "Active"}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          handleGoalDelete(
                            goal
                          )
                        }
                        className="
                          flex
                          h-8
                          w-8
                          shrink-0
                          items-center
                          justify-center
                          rounded-md
                          text-slate-600
                          transition
                          hover:bg-red-500/10
                          hover:text-red-400
                        "
                        aria-label="Delete goal"
                      >
                        <FaTrash />
                      </button>
                    </div>

                    {/* =========================
                        Goal Profile
                    ========================= */}

                    {goalExpanded && (
                      <div
                        className="
                          space-y-4
                          border-t
                          border-slate-800
                          bg-slate-950/20
                          px-3
                          py-4
                          sm:px-4
                        "
                      >

                        {/* =====================
                            Profile Overview
                        ===================== */}

                        <div
                          className="
                            rounded-xl
                            border
                            border-slate-800
                            bg-slate-900/45
                            p-4
                          "
                        >
                          <div
                            className="
                              flex
                              flex-col
                              gap-3
                              lg:flex-row
                              lg:items-start
                              lg:justify-between
                            "
                          >
                            <div className="min-w-0">

                              <p
                                className="
                                  text-[10px]
                                  font-bold
                                  uppercase
                                  tracking-[0.2em]
                                  text-cyan-400
                                "
                              >
                                Goal Profile
                              </p>

                              <h4
                                className="
                                  mt-1
                                  text-lg
                                  font-bold
                                  text-white
                                "
                              >
                                {goal.title}
                              </h4>

                              {goal.description ? (
                                <p
                                  className="
                                    mt-2
                                    max-w-2xl
                                    text-xs
                                    leading-5
                                    text-slate-400
                                  "
                                >
                                  {goal.description}
                                </p>
                              ) : (
                                <p
                                  className="
                                    mt-2
                                    text-xs
                                    text-slate-600
                                  "
                                >
                                  No description added yet.
                                </p>
                              )}

                            </div>

                            <div
                              className="
                                grid
                                shrink-0
                                grid-cols-2
                                gap-x-6
                                gap-y-2
                                text-xs
                              "
                            >
                              <div>
                                <p className="text-[10px] uppercase tracking-wider text-slate-600">
                                  Start
                                </p>

                                <p className="mt-1 font-medium text-slate-300">
                                  {startDate ??
                                    "Unknown"}
                                </p>
                              </div>

                              <div>
                                <p className="text-[10px] uppercase tracking-wider text-slate-600">
                                  Target
                                </p>

                                <p className="mt-1 font-medium text-slate-300">
                                  {targetDate ??
                                    "Not set"}
                                </p>
                              </div>

                              <div>
                                <p className="text-[10px] uppercase tracking-wider text-slate-600">
                                  Tasks
                                </p>

                                <p className="mt-1 font-medium text-slate-300">
                                  {completedTasks}
                                  {" / "}
                                  {goalTasks.length}
                                </p>
                              </div>

                              <div>
                                <p className="text-[10px] uppercase tracking-wider text-slate-600">
                                  Progress
                                </p>

                                <p className="mt-1 font-medium text-cyan-300">
                                  {progress}%
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* =====================
                            Smart Goal Timeline
                        ===================== */}

                        <SmartGoalTimeline
                          goal={
                            goal
                          }
                          monthlyPlans={
                            monthlyPlans
                          }
                          onPlanMonth={(
                            month,
                            year
                          ) =>
                            handlePlanMonth(
                              goal.id,
                              month,
                              year
                            )
                          }
                        />

                        {/* =====================
                            Planned Structure
                        ===================== */}

                        <div>
                          <div
                            className="
                              mb-2
                              flex
                              items-center
                              justify-between
                              gap-3
                            "
                          >
                            <div>
                              <p
                                className="
                                  text-xs
                                  font-semibold
                                  text-slate-300
                                "
                              >
                                Planned Structure
                              </p>

                              <p
                                className="
                                  mt-0.5
                                  text-[10px]
                                  text-slate-600
                                "
                              >
                                Open a month to plan real
                                Monday–Sunday calendar weeks.
                              </p>
                            </div>

                            <span
                              className="
                                rounded-md
                                border
                                border-slate-800
                                bg-slate-900/60
                                px-2
                                py-1
                                text-[10px]
                                text-slate-500
                              "
                            >
                              {goalMonths.length}
                              {" "}
                              {goalMonths.length ===
                              1
                                ? "month"
                                : "months"}
                            </span>
                          </div>

                          {goalMonths.length ===
                          0 ? (
                            <div
                              className="
                                rounded-lg
                                border
                                border-dashed
                                border-slate-800
                                bg-slate-950/30
                                px-4
                                py-5
                                text-center
                              "
                            >
                              <p
                                className="
                                  text-xs
                                  font-medium
                                  text-slate-400
                                "
                              >
                                No months planned yet
                              </p>

                              <p
                                className="
                                  mt-1
                                  text-[10px]
                                  text-slate-600
                                "
                              >
                                Choose Plan Month from the
                                smart timeline above.
                              </p>
                            </div>
                          ) : (
                            <div className="space-y-2">

                              {goalMonths.map(
                                (
                                  month
                                ) => (
                                  <GoalMonthPlanner
  key={month.id}
  month={month}
  weeklyTargets={weeklyTargets}
  goalStartDate={goal.startDate}
  goalTargetDate={goal.targetDate}
/>
                                )
                              )}

                            </div>
                          )}
                        </div>

                      </div>
                    )}

                  </article>
                );
              }
            )}

          </div>
        )}

      </div>

      {/* ======================================
          Goal Creation Modal
      ====================================== */}

      <GoalModal
        open={
          goalModalOpen
        }
        onClose={() =>
          setGoalModalOpen(
            false
          )
        }
        onCreate={
          handleCreateGoal
        }
      />

      {/* ======================================
          Smart Monthly Planning Modal
      ====================================== */}

      {selectedGoalMonth && (
        <MonthlyTargetModal
          open={
            true
          }
          onClose={
            closeMonthModal
          }
          month={
            selectedGoalMonth.month
          }
          year={
            selectedGoalMonth.year
          }
          lockedGoalId={
            selectedGoalMonth.goalId
          }
        />
      )}
    </>
  );
}