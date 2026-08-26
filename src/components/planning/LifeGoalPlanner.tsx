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

import UniversalTaskTable from "../tasks/UniversalTaskTable";

import GoalModal from "./GoalModal";
import MonthlyTargetModal from "./MonthlyTargetModal";
import SmartGoalTimeline from "./SmartGoalTimeline";

import type {
  LifeGoal,
  MonthlyTarget,
  Task,
  WeeklyTarget,
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

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function getMonthName(
  month: number
) {
  return (
    MONTH_NAMES[
      month - 1
    ] ?? `Month ${month}`
  );
}

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
    completeTask,
    uncompleteTask,
    deleteTask,
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

  const [
    expandedMonths,
    setExpandedMonths,
  ] = useState<
    Set<number>
  >(
    () =>
      new Set<number>()
  );

  const [
    expandedWeeks,
    setExpandedWeeks,
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
  // Relationship Helpers
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

  function getMonthWeeks(
    monthlyTargetId: number
  ) {
    return weeklyTargets
      .filter(
        (target) =>
          target.monthlyTargetId ===
          monthlyTargetId
      )
      .sort(
        (
          first,
          second
        ) =>
          first.week -
          second.week
      );
  }

  function getWeekTasks(
    weeklyTargetId: number
  ) {
    return (
      TaskRelationshipEngine
        .getTasksForWeeklyTarget(
          relationshipState,
          weeklyTargetId
        )
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
  // Expansion Controls
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

  function toggleMonth(
    monthId: number
  ) {
    setExpandedMonths(
      (previous) => {
        const next =
          new Set(
            previous
          );

        if (
          next.has(monthId)
        ) {
          next.delete(
            monthId
          );
        } else {
          next.add(
            monthId
          );
        }

        return next;
      }
    );
  }

  function toggleWeek(
    weekId: number
  ) {
    setExpandedWeeks(
      (previous) => {
        const next =
          new Set(
            previous
          );

        if (
          next.has(weekId)
        ) {
          next.delete(
            weekId
          );
        } else {
          next.add(
            weekId
          );
        }

        return next;
      }
    );
  }

  // ==========================================
  // Task Execution
  // ==========================================

  function handleTaskToggle(
    taskId: number
  ) {
    const task =
      tasks.find(
        (item) =>
          item.id ===
          taskId
      );

    if (!task) {
      return;
    }

    if (
      task.completed
    ) {
      uncompleteTask(
        taskId
      );
    } else {
      completeTask(
        taskId
      );
    }
  }

  function handleTaskDelete(
    taskId: number
  ) {
    deleteTask(
      taskId
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
              will organize it into months, weeks,
              and Universal Tasks.
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
                            Smart Timeline
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
                            Planned Hierarchy
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
                                Monthly targets, weekly targets,
                                and Universal Tasks already
                                connected to this goal.
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
                                  <GoalMonth
                                    key={
                                      month.id
                                    }
                                    month={
                                      month
                                    }
                                    weeks={
                                      getMonthWeeks(
                                        month.id
                                      )
                                    }
                                    expanded={
                                      expandedMonths.has(
                                        month.id
                                      )
                                    }
                                    expandedWeeks={
                                      expandedWeeks
                                    }
                                    onToggleMonth={
                                      toggleMonth
                                    }
                                    onToggleWeek={
                                      toggleWeek
                                    }
                                    getWeekTasks={
                                      getWeekTasks
                                    }
                                    onTaskToggle={
                                      handleTaskToggle
                                    }
                                    onTaskDelete={
                                      handleTaskDelete
                                    }
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

// ==========================================
// Goal Month
// ==========================================

interface GoalMonthProps {
  month: MonthlyTarget;

  weeks: WeeklyTarget[];

  expanded: boolean;

  expandedWeeks:
    Set<number>;

  onToggleMonth: (
    monthId: number
  ) => void;

  onToggleWeek: (
    weekId: number
  ) => void;

  getWeekTasks: (
    weeklyTargetId: number
  ) => Task[];

  onTaskToggle: (
    taskId: number
  ) => void;

  onTaskDelete: (
    taskId: number
  ) => void;
}

function GoalMonth({
  month,
  weeks,
  expanded,
  expandedWeeks,
  onToggleMonth,
  onToggleWeek,
  getWeekTasks,
  onTaskToggle,
  onTaskDelete,
}: GoalMonthProps) {
  const progress =
    clampProgress(
      month.progress
    );

  return (
    <div
      className="
        overflow-hidden
        rounded-lg
        border
        border-slate-800
        bg-slate-900/60
      "
    >
      <button
        type="button"
        onClick={() =>
          onToggleMonth(
            month.id
          )
        }
        className="
          flex
          w-full
          items-center
          gap-3
          px-3
          py-2.5
          text-left
          transition
          hover:bg-slate-800/40
        "
      >
        <span
          className="
            flex
            h-6
            w-6
            items-center
            justify-center
            text-xs
            text-slate-500
          "
        >
          {expanded ? (
            <FaChevronDown />
          ) : (
            <FaChevronRight />
          )}
        </span>

        <div className="min-w-0 flex-1">

          <div
            className="
              flex
              flex-wrap
              items-center
              gap-x-2
              gap-y-1
            "
          >
            <span
              className="
                text-sm
                font-medium
                text-slate-200
              "
            >
              {getMonthName(
                month.month
              )}
              {" "}
              {month.year}
            </span>

            <span
              className="
                truncate
                text-xs
                text-slate-500
              "
            >
              {month.title}
            </span>

          </div>

        </div>

        <span
          className="
            hidden
            text-xs
            text-slate-600
            sm:inline
          "
        >
          {weeks.length}
          {" "}
          {weeks.length === 1
            ? "week"
            : "weeks"}
        </span>

        <span
          className="
            min-w-10
            text-right
            text-xs
            font-medium
            text-slate-400
          "
        >
          {progress}%
        </span>
      </button>

      {expanded && (
        <div
          className="
            space-y-2
            border-t
            border-slate-800
            bg-slate-950/25
            p-2
          "
        >
          {weeks.length === 0 ? (
            <div
              className="
                px-3
                py-4
                text-center
                text-xs
                text-slate-600
              "
            >
              No weekly targets in this month yet.
            </div>
          ) : (
            weeks.map(
              (week) => (
                <GoalWeek
                  key={
                    week.id
                  }
                  week={
                    week
                  }
                  tasks={
                    getWeekTasks(
                      week.id
                    )
                  }
                  expanded={
                    expandedWeeks.has(
                      week.id
                    )
                  }
                  onToggle={
                    onToggleWeek
                  }
                  onTaskToggle={
                    onTaskToggle
                  }
                  onTaskDelete={
                    onTaskDelete
                  }
                />
              )
            )
          )}
        </div>
      )}
    </div>
  );
}

// ==========================================
// Goal Week
// ==========================================

interface GoalWeekProps {
  week: WeeklyTarget;

  tasks: Task[];

  expanded: boolean;

  onToggle: (
    weekId: number
  ) => void;

  onTaskToggle: (
    taskId: number
  ) => void;

  onTaskDelete: (
    taskId: number
  ) => void;
}

function GoalWeek({
  week,
  tasks,
  expanded,
  onToggle,
  onTaskToggle,
  onTaskDelete,
}: GoalWeekProps) {
  const progress =
    clampProgress(
      week.progress
    );

  const completedTasks =
    tasks.filter(
      (task) =>
        task.completed
    ).length;

  return (
    <div
      className="
        overflow-hidden
        rounded-lg
        border
        border-slate-800/80
        bg-slate-950/35
      "
    >
      <button
        type="button"
        onClick={() =>
          onToggle(
            week.id
          )
        }
        className="
          flex
          w-full
          items-center
          gap-3
          px-3
          py-2
          text-left
          transition
          hover:bg-slate-800/30
        "
      >
        <span
          className="
            flex
            h-6
            w-6
            items-center
            justify-center
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

        <span
          className="
            shrink-0
            rounded-md
            border
            border-cyan-500/15
            bg-cyan-500/5
            px-2
            py-0.5
            text-[11px]
            font-medium
            text-cyan-400
          "
        >
          Week {week.week}
        </span>

        <span
          className="
            min-w-0
            flex-1
            truncate
            text-xs
            font-medium
            text-slate-300
          "
        >
          {week.title}
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
          {tasks.length}
          {" "}
          tasks
        </span>

        <span
          className="
            min-w-10
            text-right
            text-[11px]
            font-medium
            text-slate-500
          "
        >
          {progress}%
        </span>
      </button>

      {expanded && (
        <div
          className="
            border-t
            border-slate-800/80
          "
        >
          <UniversalTaskTable
            tasks={
              tasks
            }
            getPlanIcon={() =>
              "goal"
            }
            getWeeklyTargetTitle={() =>
              `W${week.week} · ${week.title}`
            }
            onToggle={
              onTaskToggle
            }
            onDelete={
              onTaskDelete
            }
            emptyMessage="No tasks planned for this week yet."
          />
        </div>
      )}
    </div>
  );
}