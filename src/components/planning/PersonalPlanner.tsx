// ==========================================
// LifeOS Personal Planner
// Version: 1.1
// ==========================================

import {
  useMemo,
  useState,
} from "react";

import {
  getCalendarWeeksForMonth,
} from "../../calendar/goalWeeks";

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

import UniversalTaskRow from "../tasks/UniversalTaskRow";

import type {
  GoalCalendarWeek,
} from "../../calendar/goalWeeks";

import type {
  MonthlyTarget,
  WeeklyTarget,
} from "../../shared/types";

// ==========================================
// Constants
// ==========================================

const MONTHS = [
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

// ==========================================
// Date Helpers
// ==========================================

function pad2(
  value: number
) {
  return String(
    value
  ).padStart(
    2,
    "0"
  );
}

function toLocalDateString(
  date: Date
) {
  return `${date.getFullYear()}-${pad2(
    date.getMonth() + 1
  )}-${pad2(
    date.getDate()
  )}`;
}

function parseLocalDate(
  value: string
) {
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
    date.getFullYear() !==
      year ||
    date.getMonth() !==
      month - 1 ||
    date.getDate() !==
      day
  ) {
    return undefined;
  }

  return date;
}

function isDateInsideWeek(
  dateValue: string,
  weekStartDate: string,
  weekEndDate: string
) {
  const date =
    parseLocalDate(
      dateValue
    );

  const start =
    parseLocalDate(
      weekStartDate
    );

  const end =
    parseLocalDate(
      weekEndDate
    );

  if (
    !date ||
    !start ||
    !end
  ) {
    return false;
  }

  return (
    date.getTime() >=
      start.getTime() &&
    date.getTime() <=
      end.getTime()
  );
}

function getSmartTaskDate(
  week: GoalCalendarWeek
) {
  const today =
    toLocalDateString(
      new Date()
    );

  if (
    isDateInsideWeek(
      today,
      week.weekStartDate,
      week.weekEndDate
    )
  ) {
    return today;
  }

  return week.weekStartDate;
}

function getMonthLabel(
  month: number,
  year: number
) {
  return `${MONTHS[month - 1]} ${year}`;
}

function getWeekOwnerLabel(
  weekStartDate: string
) {
  const start =
    parseLocalDate(
      weekStartDate
    );

  if (!start) {
    return "";
  }

  return getMonthLabel(
    start.getMonth() + 1,
    start.getFullYear()
  );
}

function formatWeekDate(
  date: Date,
  includeYear: boolean
) {
  return date.toLocaleDateString(
    undefined,
    {
      month:
        "short",

      day:
        "numeric",

      ...(includeYear
        ? {
            year:
              "numeric",
          }
        : {}),
    }
  );
}

function getWeekDisplayLabel(
  week: GoalCalendarWeek
) {
  const start =
    parseLocalDate(
      week.weekStartDate
    );

  const end =
    parseLocalDate(
      week.weekEndDate
    );

  if (
    !start ||
    !end
  ) {
    return week.displayLabel;
  }

  const crossesYear =
    start.getFullYear() !==
    end.getFullYear();

  if (
    crossesYear
  ) {
    return `${formatWeekDate(
      start,
      true
    )} – ${formatWeekDate(
      end,
      true
    )}`;
  }

  return `${formatWeekDate(
    start,
    false
  )} – ${formatWeekDate(
    end,
    false
  )}, ${start.getFullYear()}`;
}

function getEmptyWeekGuidance(
  week: GoalCalendarWeek
) {
  if (
    week.isCurrentWeek
  ) {
    return "Choose the one thing that deserves your attention this week.";
  }

  return "Give this week one clear direction before adding tasks.";
}

// ==========================================
// Component
// ==========================================

export default function PersonalPlanner() {
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
    createMonthlyOutcome,
    updateMonthlyOutcomeTitle,

    createPersonalWeeklyFocus,
    updateWeeklyFocusTitle,

    createTask,

    completeTask,
    uncompleteTask,
    deleteTask,

    completeWeeklyTarget,
    uncompleteWeeklyTarget,
    deleteWeeklyTarget,

    completeMonthlyTarget,
    uncompleteMonthlyTarget,
    deleteMonthlyTarget,
  } = usePlanningExecution();

  const today =
    new Date();

  const [
    selectedMonth,
    setSelectedMonth,
  ] = useState(
    today.getMonth() + 1
  );

  const [
    selectedYear,
    setSelectedYear,
  ] = useState(
    today.getFullYear()
  );

  const [
    monthCreateMode,
    setMonthCreateMode,
  ] = useState(false);

  const [
    monthTitle,
    setMonthTitle,
  ] = useState("");

  const [
    monthError,
    setMonthError,
  ] = useState<string | null>(
    null
  );

  const [
    editingMonth,
    setEditingMonth,
  ] = useState(false);

  const [
    editingMonthTitle,
    setEditingMonthTitle,
  ] = useState("");

  const [
    creatingWeekStart,
    setCreatingWeekStart,
  ] = useState<string | null>(
    null
  );

  const [
    weekTitle,
    setWeekTitle,
  ] = useState("");

  const [
    weekError,
    setWeekError,
  ] = useState<string | null>(
    null
  );

  const [
    editingWeekId,
    setEditingWeekId,
  ] = useState<number | null>(
    null
  );

  const [
    editingWeekTitle,
    setEditingWeekTitle,
  ] = useState("");

  const [
    addingTaskWeekId,
    setAddingTaskWeekId,
  ] = useState<number | null>(
    null
  );

  const [
    taskTitle,
    setTaskTitle,
  ] = useState("");

  // ==========================================
  // Personal Planning Data
  // ==========================================

  const personalMonthlyPlans =
    useMemo(
      () =>
        monthlyPlans.filter(
          (plan) =>
            plan.goalId ===
            undefined
        ),
      [
        monthlyPlans,
      ]
    );

  const selectedMonthlyPlan =
    personalMonthlyPlans.find(
      (plan) =>
        plan.month ===
          selectedMonth &&
        plan.year ===
          selectedYear
    );

  const calendarWeeks =
    useMemo(
      () =>
        getCalendarWeeksForMonth(
          selectedMonth,
          selectedYear
        ),
      [
        selectedMonth,
        selectedYear,
      ]
    );

  // ==========================================
  // Navigation
  // ==========================================

  function resetInteractionState() {
    setMonthCreateMode(
      false
    );

    setMonthTitle("");

    setMonthError(
      null
    );

    setEditingMonth(
      false
    );

    setEditingMonthTitle("");

    setCreatingWeekStart(
      null
    );

    setWeekTitle("");

    setWeekError(
      null
    );

    setEditingWeekId(
      null
    );

    setEditingWeekTitle("");

    setAddingTaskWeekId(
      null
    );

    setTaskTitle("");
  }

  function previousMonth() {
    resetInteractionState();

    if (
      selectedMonth ===
      1
    ) {
      setSelectedMonth(
        12
      );

      setSelectedYear(
        (year) =>
          year - 1
      );

      return;
    }

    setSelectedMonth(
      (month) =>
        month - 1
    );
  }

  function nextMonth() {
    resetInteractionState();

    if (
      selectedMonth ===
      12
    ) {
      setSelectedMonth(
        1
      );

      setSelectedYear(
        (year) =>
          year + 1
      );

      return;
    }

    setSelectedMonth(
      (month) =>
        month + 1
    );
  }

  function goToCurrentMonth() {
    resetInteractionState();

    const now =
      new Date();

    setSelectedMonth(
      now.getMonth() + 1
    );

    setSelectedYear(
      now.getFullYear()
    );
  }

  // ==========================================
  // Personal Month
  // ==========================================

  function startMonthCreation() {
    setMonthError(
      null
    );

    setMonthTitle("");

    setMonthCreateMode(
      true
    );
  }

  function cancelMonthCreation() {
    setMonthCreateMode(
      false
    );

    setMonthTitle("");

    setMonthError(
      null
    );
  }

  function submitMonthCreation() {
    const trimmedTitle =
      monthTitle.trim();

    if (!trimmedTitle) {
      setMonthError(
        "Monthly Outcome cannot be empty."
      );

      return;
    }

    const result =
      createMonthlyOutcome(
        trimmedTitle,
        selectedMonth,
        selectedYear
      );

    if (
      !result.created
    ) {
      setMonthError(
        result.message
      );

      return;
    }

    cancelMonthCreation();
  }

  function startMonthEdit(
    plan: MonthlyTarget
  ) {
    setMonthError(
      null
    );

    setEditingMonthTitle(
      plan.title
    );

    setEditingMonth(
      true
    );
  }

  function cancelMonthEdit() {
    setEditingMonth(
      false
    );

    setEditingMonthTitle("");
  }

  function submitMonthEdit(
    plan: MonthlyTarget
  ) {
    const result =
      updateMonthlyOutcomeTitle(
        plan.id,
        editingMonthTitle
      );

    if (
      !result.updated
    ) {
      setMonthError(
        result.message
      );

      return;
    }

    setMonthError(
      null
    );

    cancelMonthEdit();
  }

  function handleDeleteMonth(
    plan: MonthlyTarget
  ) {
    const confirmed =
      window.confirm(
        `Delete "${plan.title}" and its linked planning structure?`
      );

    if (!confirmed) {
      return;
    }

    deleteMonthlyTarget(
      plan.id
    );
  }

  // ==========================================
  // Weekly Focus Helpers
  // ==========================================

  function getPersonalWeeklyTarget(
    week: GoalCalendarWeek
  ) {
    return weeklyTargets.find(
      (target) => {
        if (
          target.weekStartDate !==
            week.weekStartDate ||
          target.weekEndDate !==
            week.weekEndDate
        ) {
          return false;
        }

        if (
          target.monthlyTargetId ===
          undefined
        ) {
          return false;
        }

        const parentMonth =
          personalMonthlyPlans.find(
            (plan) =>
              plan.id ===
              target.monthlyTargetId
          );

        return (
          parentMonth !==
          undefined
        );
      }
    );
  }

  function isSelectedMonthWeekOwner(
    week: GoalCalendarWeek
  ) {
    const start =
      parseLocalDate(
        week.weekStartDate
      );

    if (!start) {
      return false;
    }

    return (
      start.getMonth() + 1 ===
        selectedMonth &&
      start.getFullYear() ===
        selectedYear
    );
  }

  function startWeekCreation(
    week: GoalCalendarWeek
  ) {
    setWeekError(
      null
    );

    setWeekTitle("");

    setCreatingWeekStart(
      week.weekStartDate
    );
  }

  function cancelWeekCreation() {
    setCreatingWeekStart(
      null
    );

    setWeekTitle("");

    setWeekError(
      null
    );
  }

  function submitWeekCreation(
    week: GoalCalendarWeek
  ) {
    if (
      !selectedMonthlyPlan
    ) {
      setWeekError(
        "Create this Personal Monthly Outcome first."
      );

      return;
    }

    const result =
      createPersonalWeeklyFocus(
        weekTitle,
        selectedMonthlyPlan.id,
        week.weekStartDate,
        week.weekEndDate
      );

    if (
      !result.created
    ) {
      setWeekError(
        result.message
      );

      return;
    }

    cancelWeekCreation();
  }

  function startWeekEdit(
    target: WeeklyTarget
  ) {
    setWeekError(
      null
    );

    setEditingWeekId(
      target.id
    );

    setEditingWeekTitle(
      target.title
    );
  }

  function cancelWeekEdit() {
    setEditingWeekId(
      null
    );

    setEditingWeekTitle("");
  }

  function submitWeekEdit(
    target: WeeklyTarget
  ) {
    const result =
      updateWeeklyFocusTitle(
        target.id,
        editingWeekTitle
      );

    if (
      !result.updated
    ) {
      setWeekError(
        result.message
      );

      return;
    }

    setWeekError(
      null
    );

    cancelWeekEdit();
  }

  function handleDeleteWeek(
    target: WeeklyTarget
  ) {
    const confirmed =
      window.confirm(
        `Delete Weekly Focus "${target.title}" and its linked tasks?`
      );

    if (!confirmed) {
      return;
    }

    deleteWeeklyTarget(
      target.id
    );
  }

  // ==========================================
  // Tasks
  // ==========================================

  function getTasksForWeeklyTarget(
    weeklyTargetId: number
  ) {
    return tasks
      .filter(
        (task) =>
          task.weeklyTargetId ===
          weeklyTargetId
      )
      .sort(
        (first, second) => {
          if (
            first.completed !==
            second.completed
          ) {
            return (
              Number(
                first.completed
              ) -
              Number(
                second.completed
              )
            );
          }

          if (
            first.dueDate &&
            second.dueDate
          ) {
            return first.dueDate.localeCompare(
              second.dueDate
            );
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
  }

  function startTaskCreation(
    weeklyTargetId: number
  ) {
    setAddingTaskWeekId(
      weeklyTargetId
    );

    setTaskTitle("");
  }

  function cancelTaskCreation() {
    setAddingTaskWeekId(
      null
    );

    setTaskTitle("");
  }

  function submitTaskCreation(
    target: WeeklyTarget,
    week: GoalCalendarWeek
  ) {
    const trimmedTitle =
      taskTitle.trim();

    if (!trimmedTitle) {
      return;
    }

    createTask({
      title:
        trimmedTitle,

      dueDate:
        getSmartTaskDate(
          week
        ),

      priority:
        "medium",

      weeklyTargetId:
        target.id,
    });

    cancelTaskCreation();
  }

  function toggleTask(
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

  // ==========================================
  // Current Month Context
  // ==========================================

  const currentMonth =
    today.getMonth() + 1;

  const currentYear =
    today.getFullYear();

  const isCurrentMonth =
    selectedMonth ===
      currentMonth &&
    selectedYear ===
      currentYear;

  // ==========================================
  // Render
  // ==========================================

  return (
    <div className="space-y-4">

      {/* ======================================
          Calendar Navigation
      ====================================== */}

      <div
        className="
          rounded-xl
          border
          border-slate-800
          bg-slate-950/40
          p-3
        "
      >
        <div className="flex items-center justify-between gap-3">

          <button
            type="button"
            onClick={
              previousMonth
            }
            className="
              flex
              h-9
              w-9
              items-center
              justify-center
              rounded-lg
              border
              border-slate-800
              text-lg
              text-slate-400
              transition
              hover:border-cyan-500/30
              hover:bg-cyan-500/5
              hover:text-cyan-300
            "
            aria-label="Previous month"
          >
            ‹
          </button>

          <div className="min-w-0 text-center">

            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-600">
              Personal workspace
            </p>

            <div className="mt-0.5 flex items-center justify-center gap-2">

              <h3 className="text-lg font-bold text-white">
                {
                  getMonthLabel(
                    selectedMonth,
                    selectedYear
                  )
                }
              </h3>

              {isCurrentMonth && (
                <span
                  className="
                    rounded-md
                    border
                    border-cyan-500/20
                    bg-cyan-500/10
                    px-1.5
                    py-0.5
                    text-[10px]
                    font-semibold
                    text-cyan-300
                  "
                >
                  Current
                </span>
              )}

            </div>

          </div>

          <button
            type="button"
            onClick={
              nextMonth
            }
            className="
              flex
              h-9
              w-9
              items-center
              justify-center
              rounded-lg
              border
              border-slate-800
              text-lg
              text-slate-400
              transition
              hover:border-cyan-500/30
              hover:bg-cyan-500/5
              hover:text-cyan-300
            "
            aria-label="Next month"
          >
            ›
          </button>

        </div>

        {!isCurrentMonth && (
          <div className="mt-2 text-center">

            <button
              type="button"
              onClick={
                goToCurrentMonth
              }
              className="
                text-xs
                font-medium
                text-cyan-400
                transition
                hover:text-cyan-300
              "
            >
              Back to {
                getMonthLabel(
                  currentMonth,
                  currentYear
                )
              }
            </button>

          </div>
        )}
      </div>

      {/* ======================================
          No Personal Month Yet
      ====================================== */}

      {!selectedMonthlyPlan && (
        <div
          className="
            rounded-xl
            border
            border-slate-800
            bg-slate-950/30
            p-4
          "
        >
          {!monthCreateMode ? (
            <div className="py-5 text-center">

              <div className="text-2xl">
                ✦
              </div>

              <p className="mt-2 text-sm font-semibold text-slate-200">
                What should {
                  getMonthLabel(
                    selectedMonth,
                    selectedYear
                  )
                } move forward?
              </p>

              <p className="mx-auto mt-1 max-w-sm text-xs leading-5 text-slate-500">
                One clear outcome keeps the month focused without
                turning your Personal Planner into another task list.
              </p>

              <button
                type="button"
                onClick={
                  startMonthCreation
                }
                className="
                  mt-4
                  rounded-lg
                  bg-cyan-500
                  px-3.5
                  py-2
                  text-sm
                  font-semibold
                  text-slate-950
                  transition
                  hover:bg-cyan-400
                "
              >
                + Plan {
                  MONTHS[
                    selectedMonth - 1
                  ]
                }
              </button>

            </div>
          ) : (
            <div>

              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-400">
                Monthly Outcome · {
                  getMonthLabel(
                    selectedMonth,
                    selectedYear
                  )
                }
              </p>

              <input
                autoFocus
                value={
                  monthTitle
                }
                onChange={(
                  event
                ) => {
                  setMonthTitle(
                    event.target.value
                  );

                  setMonthError(
                    null
                  );
                }}
                onKeyDown={(
                  event
                ) => {
                  if (
                    event.key ===
                    "Enter"
                  ) {
                    event.preventDefault();

                    submitMonthCreation();
                  }

                  if (
                    event.key ===
                    "Escape"
                  ) {
                    cancelMonthCreation();
                  }
                }}
                placeholder="e.g. Build a consistent SAT + TOEFL routine"
                className="
                  mt-2
                  w-full
                  rounded-lg
                  border
                  border-slate-700
                  bg-slate-950
                  px-3
                  py-2.5
                  text-sm
                  text-white
                  outline-none
                  transition
                  placeholder:text-slate-600
                  focus:border-cyan-500/60
                "
              />

              {monthError && (
                <p className="mt-2 text-xs text-red-400">
                  {monthError}
                </p>
              )}

              <div className="mt-3 flex items-center gap-2">

                <button
                  type="button"
                  onClick={
                    submitMonthCreation
                  }
                  className="
                    rounded-lg
                    bg-cyan-500
                    px-3
                    py-1.5
                    text-xs
                    font-semibold
                    text-slate-950
                    transition
                    hover:bg-cyan-400
                  "
                >
                  Save
                </button>

                <button
                  type="button"
                  onClick={
                    cancelMonthCreation
                  }
                  className="
                    rounded-lg
                    border
                    border-slate-800
                    px-3
                    py-1.5
                    text-xs
                    font-medium
                    text-slate-400
                    transition
                    hover:bg-slate-800
                    hover:text-white
                  "
                >
                  Cancel
                </button>

                <span className="ml-auto text-[10px] text-slate-600">
                  Enter to save · Esc to cancel
                </span>

              </div>

            </div>
          )}
        </div>
      )}

      {/* ======================================
          Personal Month Workspace
      ====================================== */}

      {selectedMonthlyPlan && (
        <>
          <div
            className={`
              rounded-xl
              border
              p-4
              transition

              ${
                selectedMonthlyPlan.completed
                  ? "border-emerald-500/15 bg-emerald-500/[0.025]"
                  : "border-cyan-500/15 bg-cyan-500/[0.03]"
              }
            `}
          >
            <div className="flex items-start justify-between gap-4">

              <div className="min-w-0 flex-1">

                <div className="flex flex-wrap items-center gap-2">

                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-cyan-400">
                    Monthly Outcome
                  </p>

                  <span className="text-[10px] text-slate-600">
                    {
                      getMonthLabel(
                        selectedMonth,
                        selectedYear
                      )
                    }
                  </span>

                  {selectedMonthlyPlan.completed && (
                    <span
                      className="
                        rounded-md
                        border
                        border-emerald-500/20
                        bg-emerald-500/10
                        px-1.5
                        py-0.5
                        text-[10px]
                        font-semibold
                        text-emerald-300
                      "
                    >
                      Completed
                    </span>
                  )}

                </div>

                {editingMonth ? (
                  <input
                    autoFocus
                    value={
                      editingMonthTitle
                    }
                    onChange={(
                      event
                    ) =>
                      setEditingMonthTitle(
                        event.target.value
                      )
                    }
                    onKeyDown={(
                      event
                    ) => {
                      if (
                        event.key ===
                        "Enter"
                      ) {
                        event.preventDefault();

                        submitMonthEdit(
                          selectedMonthlyPlan
                        );
                      }

                      if (
                        event.key ===
                        "Escape"
                      ) {
                        cancelMonthEdit();
                      }
                    }}
                    className="
                      mt-1.5
                      w-full
                      rounded-lg
                      border
                      border-slate-700
                      bg-slate-950
                      px-3
                      py-2
                      text-sm
                      font-semibold
                      text-white
                      outline-none
                      focus:border-cyan-500/60
                    "
                  />
                ) : (
                  <h3
                    className={`
                      mt-1.5
                      text-base
                      font-bold

                      ${
                        selectedMonthlyPlan.completed
                          ? "text-slate-400"
                          : "text-white"
                      }
                    `}
                  >
                    {
                      selectedMonthlyPlan.title
                    }
                  </h3>
                )}

                <div className="mt-3 flex items-center gap-3">

                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-800">
                    <div
                      className={`
                        h-full
                        rounded-full
                        transition-all

                        ${
                          selectedMonthlyPlan.completed
                            ? "bg-emerald-400"
                            : "bg-cyan-400"
                        }
                      `}
                      style={{
                        width:
                          `${Math.max(
                            0,
                            Math.min(
                              100,
                              selectedMonthlyPlan.progress
                            )
                          )}%`,
                      }}
                    />
                  </div>

                  <span
                    className={`
                      shrink-0
                      text-xs
                      font-semibold

                      ${
                        selectedMonthlyPlan.completed
                          ? "text-emerald-300"
                          : "text-cyan-300"
                      }
                    `}
                  >
                    {
                      Math.round(
                        selectedMonthlyPlan.progress
                      )
                    }%
                  </span>

                </div>

              </div>

              {!editingMonth && (
                <div className="flex shrink-0 items-center gap-1">

                  <button
                    type="button"
                    onClick={() =>
                      startMonthEdit(
                        selectedMonthlyPlan
                      )
                    }
                    className="
                      rounded-md
                      px-2
                      py-1
                      text-[11px]
                      text-slate-600
                      transition
                      hover:bg-slate-800
                      hover:text-slate-300
                    "
                  >
                    Edit
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (
                        selectedMonthlyPlan.completed
                      ) {
                        uncompleteMonthlyTarget(
                          selectedMonthlyPlan.id
                        );
                      } else {
                        completeMonthlyTarget(
                          selectedMonthlyPlan.id
                        );
                      }
                    }}
                    className="
                      rounded-md
                      px-2
                      py-1
                      text-[11px]
                      text-slate-600
                      transition
                      hover:bg-slate-800
                      hover:text-slate-300
                    "
                  >
                    {
                      selectedMonthlyPlan.completed
                        ? "Reopen"
                        : "Complete"
                    }
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      handleDeleteMonth(
                        selectedMonthlyPlan
                      )
                    }
                    className="
                      rounded-md
                      px-2
                      py-1
                      text-[11px]
                      text-slate-700
                      transition
                      hover:bg-red-500/10
                      hover:text-red-400
                    "
                  >
                    Delete
                  </button>

                </div>
              )}

            </div>

            {editingMonth && (
              <div className="mt-2 flex items-center gap-2">

                <button
                  type="button"
                  onClick={() =>
                    submitMonthEdit(
                      selectedMonthlyPlan
                    )
                  }
                  className="text-xs font-medium text-cyan-400 hover:text-cyan-300"
                >
                  Save
                </button>

                <button
                  type="button"
                  onClick={
                    cancelMonthEdit
                  }
                  className="text-xs text-slate-500 hover:text-slate-300"
                >
                  Cancel
                </button>

                <span className="ml-auto text-[10px] text-slate-600">
                  Enter · Esc
                </span>

              </div>
            )}

            {monthError && (
              <p className="mt-2 text-xs text-red-400">
                {monthError}
              </p>
            )}
          </div>

          {/* ==================================
              Real Calendar Weeks
          ================================== */}

          <div className="space-y-3">

            {calendarWeeks.map(
              (week) => {
                const weeklyTarget =
                  getPersonalWeeklyTarget(
                    week
                  );

                const selectedMonthOwnsWeek =
                  isSelectedMonthWeekOwner(
                    week
                  );

                const crossMonth =
                  week.startsInPreviousMonth ||
                  week.endsInNextMonth;

                const weeklyTasks =
                  weeklyTarget
                    ? getTasksForWeeklyTarget(
                        weeklyTarget.id
                      )
                    : [];

                const completedTasks =
                  weeklyTasks.filter(
                    (task) =>
                      task.completed
                  ).length;

                const creatingThisWeek =
                  creatingWeekStart ===
                  week.weekStartDate;

                const editingThisWeek =
                  weeklyTarget &&
                  editingWeekId ===
                    weeklyTarget.id;

                const addingTaskHere =
                  weeklyTarget &&
                  addingTaskWeekId ===
                    weeklyTarget.id;

                const completedWeek =
                  weeklyTarget?.completed ??
                  false;

                return (
                  <div
                    key={
                      week.weekStartDate
                    }
                    className={`
                      overflow-hidden
                      rounded-xl
                      border
                      transition

                      ${
                        week.isCurrentWeek
                          ? "border-cyan-500/40 bg-cyan-500/[0.025] shadow-[0_0_0_1px_rgba(34,211,238,0.04)]"
                          : completedWeek
                            ? "border-emerald-500/10 bg-emerald-500/[0.015]"
                            : "border-slate-800 bg-slate-950/25"
                      }
                    `}
                  >
                    {/* ========================
                        Week Header
                    ======================== */}

                    <div className="p-3.5">

                      <div className="flex items-start justify-between gap-3">

                        <div className="min-w-0">

                          <div className="flex flex-wrap items-center gap-2">

                            <p
                              className={`
                                text-sm
                                font-semibold

                                ${
                                  completedWeek
                                    ? "text-slate-500"
                                    : "text-slate-200"
                                }
                              `}
                            >
                              {
                                getWeekDisplayLabel(
                                  week
                                )
                              }
                            </p>

                            {week.isCurrentWeek && (
                              <span
                                className="
                                  rounded-md
                                  border
                                  border-cyan-500/20
                                  bg-cyan-500/10
                                  px-1.5
                                  py-0.5
                                  text-[10px]
                                  font-semibold
                                  text-cyan-300
                                "
                              >
                                This week
                              </span>
                            )}

                            {completedWeek && (
                              <span
                                className="
                                  rounded-md
                                  border
                                  border-emerald-500/20
                                  bg-emerald-500/10
                                  px-1.5
                                  py-0.5
                                  text-[10px]
                                  font-semibold
                                  text-emerald-300
                                "
                              >
                                Done
                              </span>
                            )}

                            {crossMonth && (
                              <span
                                className="
                                  rounded-md
                                  border
                                  border-slate-700
                                  bg-slate-800/50
                                  px-1.5
                                  py-0.5
                                  text-[10px]
                                  text-slate-400
                                "
                              >
                                Cross-month
                              </span>
                            )}

                          </div>

                          {week.isCurrentWeek && (
                            <p className="mt-1 text-[10px] font-medium text-cyan-400/70">
                              Today belongs to this planning week.
                            </p>
                          )}

                          {crossMonth && (
                            <p className="mt-1 text-[10px] text-slate-600">
                              Managed from {
                                getWeekOwnerLabel(
                                  week.weekStartDate
                                )
                              } because the week starts there.
                            </p>
                          )}

                        </div>

                        {weeklyTarget && (
                          <div className="flex shrink-0 items-center gap-0.5">

                            <button
                              type="button"
                              onClick={() =>
                                startWeekEdit(
                                  weeklyTarget
                                )
                              }
                              className="
                                rounded-md
                                px-2
                                py-1
                                text-[10px]
                                text-slate-600
                                transition
                                hover:bg-slate-800
                                hover:text-slate-300
                              "
                            >
                              Edit
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                if (
                                  weeklyTarget.completed
                                ) {
                                  uncompleteWeeklyTarget(
                                    weeklyTarget.id
                                  );
                                } else {
                                  completeWeeklyTarget(
                                    weeklyTarget.id
                                  );
                                }
                              }}
                              className="
                                rounded-md
                                px-2
                                py-1
                                text-[10px]
                                text-slate-600
                                transition
                                hover:bg-slate-800
                                hover:text-slate-300
                              "
                            >
                              {
                                weeklyTarget.completed
                                  ? "Reopen"
                                  : "Complete"
                              }
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                handleDeleteWeek(
                                  weeklyTarget
                                )
                              }
                              className="
                                rounded-md
                                px-2
                                py-1
                                text-[10px]
                                text-slate-700
                                transition
                                hover:bg-red-500/10
                                hover:text-red-400
                              "
                            >
                              Delete
                            </button>

                          </div>
                        )}

                      </div>

                      {/* ======================
                          Weekly Focus
                      ====================== */}

                      {weeklyTarget ? (
                        <div className="mt-3">

                          <div className="flex items-center justify-between gap-3">

                            <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-600">
                              Weekly Focus
                            </p>

                            {weeklyTasks.length > 0 && (
                              <span className="text-[10px] text-slate-600">
                                {completedTasks} of {weeklyTasks.length} done
                              </span>
                            )}

                          </div>

                          {editingThisWeek ? (
                            <input
                              autoFocus
                              value={
                                editingWeekTitle
                              }
                              onChange={(
                                event
                              ) =>
                                setEditingWeekTitle(
                                  event.target.value
                                )
                              }
                              onKeyDown={(
                                event
                              ) => {
                                if (
                                  event.key ===
                                  "Enter"
                                ) {
                                  event.preventDefault();

                                  submitWeekEdit(
                                    weeklyTarget
                                  );
                                }

                                if (
                                  event.key ===
                                  "Escape"
                                ) {
                                  cancelWeekEdit();
                                }
                              }}
                              className="
                                mt-1.5
                                w-full
                                rounded-lg
                                border
                                border-slate-700
                                bg-slate-950
                                px-3
                                py-2
                                text-sm
                                text-white
                                outline-none
                                focus:border-cyan-500/60
                              "
                            />
                          ) : (
                            <p
                              className={`
                                mt-1.5
                                text-sm
                                font-medium

                                ${
                                  completedWeek
                                    ? "text-slate-500"
                                    : "text-white"
                                }
                              `}
                            >
                              {
                                weeklyTarget.title
                              }
                            </p>
                          )}

                          {editingThisWeek && (
                            <div className="mt-2 flex items-center gap-2">

                              <button
                                type="button"
                                onClick={() =>
                                  submitWeekEdit(
                                    weeklyTarget
                                  )
                                }
                                className="text-xs font-medium text-cyan-400 hover:text-cyan-300"
                              >
                                Save
                              </button>

                              <button
                                type="button"
                                onClick={
                                  cancelWeekEdit
                                }
                                className="text-xs text-slate-500 hover:text-slate-300"
                              >
                                Cancel
                              </button>

                              <span className="ml-auto text-[10px] text-slate-600">
                                Enter · Esc
                              </span>

                            </div>
                          )}

                          <div className="mt-2.5 flex items-center gap-3">

                            <div className="h-1 flex-1 overflow-hidden rounded-full bg-slate-800">
                              <div
                                className={`
                                  h-full
                                  rounded-full
                                  transition-all

                                  ${
                                    completedWeek
                                      ? "bg-emerald-400"
                                      : "bg-cyan-400"
                                  }
                                `}
                                style={{
                                  width:
                                    `${Math.max(
                                      0,
                                      Math.min(
                                        100,
                                        weeklyTarget.progress
                                      )
                                    )}%`,
                                }}
                              />
                            </div>

                            <span className="text-[10px] font-medium text-slate-500">
                              {
                                Math.round(
                                  weeklyTarget.progress
                                )
                              }%
                            </span>

                          </div>

                        </div>
                      ) : creatingThisWeek ? (
                        <div className="mt-3">

                          <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-cyan-400">
                            Weekly Focus
                          </p>

                          <input
                            autoFocus
                            value={
                              weekTitle
                            }
                            onChange={(
                              event
                            ) => {
                              setWeekTitle(
                                event.target.value
                              );

                              setWeekError(
                                null
                              );
                            }}
                            onKeyDown={(
                              event
                            ) => {
                              if (
                                event.key ===
                                "Enter"
                              ) {
                                event.preventDefault();

                                submitWeekCreation(
                                  week
                                );
                              }

                              if (
                                event.key ===
                                "Escape"
                              ) {
                                cancelWeekCreation();
                              }
                            }}
                            placeholder="What deserves your focus this week?"
                            className="
                              mt-1.5
                              w-full
                              rounded-lg
                              border
                              border-slate-700
                              bg-slate-950
                              px-3
                              py-2
                              text-sm
                              text-white
                              outline-none
                              placeholder:text-slate-600
                              focus:border-cyan-500/60
                            "
                          />

                          {weekError && (
                            <p className="mt-2 text-xs text-red-400">
                              {weekError}
                            </p>
                          )}

                          <div className="mt-2 flex items-center gap-2">

                            <button
                              type="button"
                              onClick={() =>
                                submitWeekCreation(
                                  week
                                )
                              }
                              className="text-xs font-semibold text-cyan-400 hover:text-cyan-300"
                            >
                              Save
                            </button>

                            <button
                              type="button"
                              onClick={
                                cancelWeekCreation
                              }
                              className="text-xs text-slate-500 hover:text-slate-300"
                            >
                              Cancel
                            </button>

                            <span className="ml-auto text-[10px] text-slate-600">
                              Enter · Esc
                            </span>

                          </div>

                        </div>
                      ) : (
                        <div className="mt-3">

                          {selectedMonthOwnsWeek ? (
                            <div>

                              <p className="text-xs leading-5 text-slate-600">
                                {
                                  getEmptyWeekGuidance(
                                    week
                                  )
                                }
                              </p>

                              <button
                                type="button"
                                onClick={() =>
                                  startWeekCreation(
                                    week
                                  )
                                }
                                className="
                                  mt-1.5
                                  text-xs
                                  font-medium
                                  text-slate-500
                                  transition
                                  hover:text-cyan-300
                                "
                              >
                                + Set Weekly Focus
                              </button>

                            </div>
                          ) : (
                            <p className="text-xs leading-5 text-slate-600">
                              This week is managed from {
                                getWeekOwnerLabel(
                                  week.weekStartDate
                                )
                              }. Any Personal Weekly Focus created there
                              will appear here automatically.
                            </p>
                          )}

                        </div>
                      )}

                    </div>

                    {/* ========================
                        Tasks
                    ======================== */}

                    {weeklyTarget && (
                      <div
                        className={`
                          border-t
                          border-slate-800

                          ${
                            completedWeek
                              ? "bg-slate-950/20"
                              : "bg-slate-950/35"
                          }
                        `}
                      >
                        {weeklyTasks.length > 0 ? (
                          <div>
                            {weeklyTasks.map(
                              (task) => (
                                <UniversalTaskRow
                                  key={
                                    task.id
                                  }
                                  task={
                                    task
                                  }
                                  planType="personal"
                                  weeklyTargetTitle={
                                    weeklyTarget.title
                                  }
                                  variant="compact"
                                  onToggle={
                                    toggleTask
                                  }
                                  onDelete={
                                    deleteTask
                                  }
                                />
                              )
                            )}
                          </div>
                        ) : !addingTaskHere ? (
                          <div className="px-3 pt-2.5">

                            <p className="text-[10px] text-slate-600">
                              No tasks yet. Turn this focus into one
                              concrete next action.
                            </p>

                          </div>
                        ) : null}

                        {addingTaskHere ? (
                          <div className="p-3">

                            <div className="flex gap-2">

                              <input
                                autoFocus
                                value={
                                  taskTitle
                                }
                                onChange={(
                                  event
                                ) =>
                                  setTaskTitle(
                                    event.target.value
                                  )
                                }
                                onKeyDown={(
                                  event
                                ) => {
                                  if (
                                    event.key ===
                                    "Enter"
                                  ) {
                                    event.preventDefault();

                                    submitTaskCreation(
                                      weeklyTarget,
                                      week
                                    );
                                  }

                                  if (
                                    event.key ===
                                    "Escape"
                                  ) {
                                    cancelTaskCreation();
                                  }
                                }}
                                placeholder="Add the next concrete action..."
                                className="
                                  min-w-0
                                  flex-1
                                  rounded-lg
                                  border
                                  border-slate-700
                                  bg-slate-950
                                  px-3
                                  py-2
                                  text-sm
                                  text-white
                                  outline-none
                                  placeholder:text-slate-600
                                  focus:border-cyan-500/60
                                "
                              />

                              <button
                                type="button"
                                onClick={() =>
                                  submitTaskCreation(
                                    weeklyTarget,
                                    week
                                  )
                                }
                                className="
                                  rounded-lg
                                  bg-cyan-500
                                  px-3
                                  text-xs
                                  font-semibold
                                  text-slate-950
                                  transition
                                  hover:bg-cyan-400
                                "
                              >
                                Add
                              </button>

                              <button
                                type="button"
                                onClick={
                                  cancelTaskCreation
                                }
                                className="
                                  rounded-lg
                                  border
                                  border-slate-800
                                  px-2.5
                                  text-xs
                                  text-slate-500
                                  hover:bg-slate-800
                                  hover:text-white
                                "
                              >
                                Cancel
                              </button>

                            </div>

                            <div className="mt-1.5 flex items-center justify-between gap-3">

                              <p className="text-[10px] text-slate-600">
                                Smart due date
                              </p>

                              <p className="text-[10px] font-medium text-slate-500">
                                {
                                  getSmartTaskDate(
                                    week
                                  )
                                }
                              </p>

                            </div>

                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() =>
                              startTaskCreation(
                                weeklyTarget.id
                              )
                            }
                            className="
                              w-full
                              px-3
                              py-2.5
                              text-left
                              text-xs
                              font-medium
                              text-slate-600
                              transition
                              hover:bg-slate-800/30
                              hover:text-cyan-300
                            "
                          >
                            + Add Task
                          </button>
                        )}

                      </div>
                    )}

                  </div>
                );
              }
            )}

          </div>
        </>
      )}

    </div>
  );
}