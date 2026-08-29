import {
  useMemo,
  useState,
} from "react";

import {
  FaCheck,
  FaChevronDown,
  FaChevronRight,
  FaPen,
  FaPlus,
  FaXmark,
} from "react-icons/fa6";

import {
  getCalendarWeeksForMonth,
} from "../../calendar/goalWeeks";

import {
  TaskWeekPlacementEngine,
} from "../../engines/TaskWeekPlacementEngine";

import {
  GoalWeekOwnershipEngine,
} from "../../engines/GoalWeekOwnershipEngine";

import {
  useMonthlyPlanning,
} from "../../context/MonthlyPlanningContext";

import {
  useTasks,
} from "../../context/TaskContext";

import {
  useLifeGoals,
} from "../../context/LifeGoalsContext";

import {
  usePlanningExecution,
} from "../../context/PlanningExecutionContext";

import UniversalTaskTable from "../tasks/UniversalTaskTable";

import type {
  MonthlyTarget,
  TaskPriority,
  WeeklyTarget,
} from "../../shared/types";

// ==========================================
// Types
// ==========================================

interface GoalMonthPlannerProps {
  month: MonthlyTarget;

  weeklyTargets: WeeklyTarget[];

  goalStartDate?: string;

  goalTargetDate?: string;
}

interface SelectedCalendarWeek {
  weekStartDate: string;

  weekEndDate: string;

  displayLabel: string;
}

// ==========================================
// Date Helpers
// ==========================================

function getTodayDateOnly() {
  const today =
    new Date();

  const year =
    today.getFullYear();

  const month =
    String(
      today.getMonth() + 1
    ).padStart(
      2,
      "0"
    );

  const day =
    String(
      today.getDate()
    ).padStart(
      2,
      "0"
    );

  return `${year}-${month}-${day}`;
}

function parseDateOnly(
  value?: string
) {
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

function formatDateLabel(
  value?: string
) {
  const date =
    parseDateOnly(
      value
    );

  if (!date) {
    return value ?? "";
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
      Math.round(
        progress
      )
    )
  );
}

function formatMonthLabel(
  month: number,
  year: number
) {
  return new Date(
    year,
    month - 1,
    1
  ).toLocaleDateString(
    undefined,
    {
      month: "long",
      year: "numeric",
    }
  );
}

function getOwnerLabel(
  ownerMonth?: number,
  ownerYear?: number
) {
  if (
    ownerMonth === undefined ||
    ownerYear === undefined
  ) {
    return undefined;
  }

  return formatMonthLabel(
    ownerMonth,
    ownerYear
  );
}

// ==========================================
// Smart Task Date
// ==========================================

function getSmartTaskDueDate(
  weekStartDate?: string,
  weekEndDate?: string,
  goalStartDate?: string,
  goalTargetDate?: string
) {
  if (
    !weekStartDate ||
    !weekEndDate
  ) {
    return getTodayDateOnly();
  }

  const today =
    getTodayDateOnly();

  let activeStart =
    weekStartDate;

  let activeEnd =
    weekEndDate;

  if (
    goalStartDate &&
    goalStartDate >
      activeStart &&
    goalStartDate <=
      activeEnd
  ) {
    activeStart =
      goalStartDate;
  }

  if (
    goalTargetDate &&
    goalTargetDate <
      activeEnd &&
    goalTargetDate >=
      activeStart
  ) {
    activeEnd =
      goalTargetDate;
  }

  if (
    today >=
      activeStart &&
    today <=
      activeEnd
  ) {
    return today;
  }

  return activeStart;
}

// ==========================================
// Component
// ==========================================

export default function GoalMonthPlanner({
  month,
  weeklyTargets,
  goalStartDate,
  goalTargetDate,
}: GoalMonthPlannerProps) {
  // ==========================================
  // Contexts
  // ==========================================

  const {
    monthlyPlans,
  } = useMonthlyPlanning();

  const {
    tasks,
  } = useTasks();

  const {
    lifeGoals,
  } = useLifeGoals();

  const {
    createTask,

    createGoalWeeklyFocus,

    updateMonthlyOutcomeTitle,
    updateWeeklyFocusTitle,

    completeTask,
    uncompleteTask,
    deleteTask,
  } = usePlanningExecution();

  // ==========================================
  // Month State
  // ==========================================

  const [
    expanded,
    setExpanded,
  ] = useState(false);

  const [
    editingMonth,
    setEditingMonth,
  ] = useState(false);

  const [
    monthTitleDraft,
    setMonthTitleDraft,
  ] = useState(
    month.title
  );

  // ==========================================
  // Week Creation State
  // ==========================================

  const [
    selectedWeek,
    setSelectedWeek,
  ] = useState<
    SelectedCalendarWeek | undefined
  >(undefined);

  const [
    weeklyFocus,
    setWeeklyFocus,
  ] = useState("");

  const [
    weeklyFocusError,
    setWeeklyFocusError,
  ] = useState<
    string | undefined
  >(undefined);

  // ==========================================
  // Week Editing State
  // ==========================================

  const [
    editingWeeklyTargetId,
    setEditingWeeklyTargetId,
  ] = useState<
    number | undefined
  >(undefined);

  const [
    weeklyTitleDraft,
    setWeeklyTitleDraft,
  ] = useState("");

  // ==========================================
  // Task Creation State
  // ==========================================

  const [
    addingTaskForWeekId,
    setAddingTaskForWeekId,
  ] = useState<
    number | undefined
  >(undefined);

  const [
    taskTitle,
    setTaskTitle,
  ] = useState("");

  const [
    taskPriority,
    setTaskPriority,
  ] = useState<TaskPriority>(
    "medium"
  );

  const [
    taskDueDate,
    setTaskDueDate,
  ] = useState("");

  // ==========================================
  // Goal
  // ==========================================

  const currentGoal =
    useMemo(
      () =>
        lifeGoals.find(
          (goal) =>
            goal.id ===
            month.goalId
        ),
      [
        lifeGoals,
        month.goalId,
      ]
    );

  // ==========================================
  // Real Calendar Weeks
  // ==========================================

  const calendarWeeks =
    useMemo(
      () =>
        getCalendarWeeksForMonth(
          month.month,
          month.year,
          {
            activeStartDate:
              goalStartDate,

            activeEndDate:
              goalTargetDate,
          }
        ),
      [
        month.month,
        month.year,
        goalStartDate,
        goalTargetDate,
      ]
    );

  // ==========================================
  // Existing Weekly Targets
  // ==========================================

  const monthWeeklyTargets =
    useMemo(
      () =>
        weeklyTargets.filter(
          (target) =>
            target.monthlyTargetId ===
            month.id
        ),
      [
        weeklyTargets,
        month.id,
      ]
    );

  function getWeeklyTargetForSlot(
    weekStartDate: string,
    weekEndDate: string
  ) {
    return monthWeeklyTargets.find(
      (target) =>
        target.weekStartDate ===
          weekStartDate &&
        target.weekEndDate ===
          weekEndDate
    );
  }

  function getTasksForWeeklyTarget(
    weeklyTargetId: number
  ) {
    return tasks.filter(
      (task) =>
        task.weeklyTargetId ===
        weeklyTargetId
    );
  }

  // ==========================================
  // Planning State
  // ==========================================

  const placementState =
    useMemo(
      () => ({
        lifeGoals,

        monthlyTargets:
          monthlyPlans,

        weeklyTargets,
      }),
      [
        lifeGoals,
        monthlyPlans,
        weeklyTargets,
      ]
    );

  // ==========================================
  // Canonical Week Ownership
  // ==========================================

  const weekOwnership =
    useMemo(
      () =>
        calendarWeeks.map(
          (week) => ({
            week,

            result:
              GoalWeekOwnershipEngine.resolve(
                placementState,
                month.id,
                week.weekStartDate,
                week.weekEndDate
              ),
          })
        ),
      [
        calendarWeeks,
        placementState,
        month.id,
      ]
    );

  const ownedWeeks =
    useMemo(
      () =>
        weekOwnership.filter(
          ({ result }) =>
            result.ownerMonth ===
              month.month &&
            result.ownerYear ===
              month.year
        ),
      [
        weekOwnership,
        month.month,
        month.year,
      ]
    );

  const plannedOwnedWeeks =
    useMemo(
      () =>
        ownedWeeks.filter(
          ({ week }) =>
            Boolean(
              getWeeklyTargetForSlot(
                week.weekStartDate,
                week.weekEndDate
              )
            )
        ).length,
      [
        ownedWeeks,
        monthWeeklyTargets,
      ]
    );

  // ==========================================
  // Smart Task Placement
  // ==========================================

  const taskPlacementResult =
    useMemo(() => {
      if (
        !currentGoal ||
        !taskDueDate
      ) {
        return undefined;
      }

      return TaskWeekPlacementEngine.resolve(
        placementState,
        {
          scope:
            "goal",

          goalId:
            currentGoal.id,

          dueDate:
            taskDueDate,
        }
      );
    }, [
      currentGoal,
      taskDueDate,
      placementState,
    ]);

  // ==========================================
  // Monthly Outcome Editing
  // ==========================================

  function startEditingMonth() {
    setMonthTitleDraft(
      month.title
    );

    setEditingMonth(
      true
    );
  }

  function cancelEditingMonth() {
    setMonthTitleDraft(
      month.title
    );

    setEditingMonth(
      false
    );
  }

  function saveMonthTitle() {
    const trimmed =
      monthTitleDraft.trim();

    if (!trimmed) {
      return;
    }

    const result =
      updateMonthlyOutcomeTitle(
        month.id,
        trimmed
      );

    if (!result.updated) {
      return;
    }

    setEditingMonth(
      false
    );
  }

  // ==========================================
  // Weekly Focus Creation
  // ==========================================

  function startPlanningWeek(
    week: SelectedCalendarWeek
  ) {
    setSelectedWeek(
      week
    );

    setWeeklyFocus("");

    setWeeklyFocusError(
      undefined
    );

    setEditingWeeklyTargetId(
      undefined
    );
  }

  function cancelPlanningWeek() {
    setSelectedWeek(
      undefined
    );

    setWeeklyFocus("");

    setWeeklyFocusError(
      undefined
    );
  }

  function createWeeklyFocus() {
    if (!selectedWeek) {
      return;
    }

    const trimmed =
      weeklyFocus.trim();

    if (!trimmed) {
      return;
    }

    const result =
      createGoalWeeklyFocus(
        trimmed,
        month.id,
        selectedWeek.weekStartDate,
        selectedWeek.weekEndDate
      );

    if (!result.created) {
      setWeeklyFocusError(
        result.message
      );

      return;
    }

    setSelectedWeek(
      undefined
    );

    setWeeklyFocus("");

    setWeeklyFocusError(
      undefined
    );
  }

  // ==========================================
  // Weekly Focus Editing
  // ==========================================

  function startEditingWeeklyTarget(
    target: WeeklyTarget
  ) {
    setEditingWeeklyTargetId(
      target.id
    );

    setWeeklyTitleDraft(
      target.title
    );

    setSelectedWeek(
      undefined
    );

    setWeeklyFocus("");

    setWeeklyFocusError(
      undefined
    );
  }

  function cancelEditingWeeklyTarget() {
    setEditingWeeklyTargetId(
      undefined
    );

    setWeeklyTitleDraft("");
  }

  function saveWeeklyTargetTitle() {
    if (
      editingWeeklyTargetId ===
      undefined
    ) {
      return;
    }

    const trimmed =
      weeklyTitleDraft.trim();

    if (!trimmed) {
      return;
    }

    const result =
      updateWeeklyFocusTitle(
        editingWeeklyTargetId,
        trimmed
      );

    if (!result.updated) {
      return;
    }

    setEditingWeeklyTargetId(
      undefined
    );

    setWeeklyTitleDraft("");
  }

  // ==========================================
  // Universal Task Creation
  // ==========================================

  function startAddingTask(
    target: WeeklyTarget
  ) {
    setAddingTaskForWeekId(
      target.id
    );

    setTaskTitle("");

    setTaskPriority(
      "medium"
    );

    setTaskDueDate(
      getSmartTaskDueDate(
        target.weekStartDate,
        target.weekEndDate,
        goalStartDate,
        goalTargetDate
      )
    );
  }

  function cancelAddingTask() {
    setAddingTaskForWeekId(
      undefined
    );

    setTaskTitle("");

    setTaskPriority(
      "medium"
    );

    setTaskDueDate("");
  }

  function handleCreateTask(
    openedWeeklyTargetId: number
  ) {
    const trimmed =
      taskTitle.trim();

    if (!trimmed) {
      return;
    }

    let resolvedWeeklyTargetId =
      openedWeeklyTargetId;

    if (
      taskDueDate &&
      currentGoal
    ) {
      if (
        !taskPlacementResult ||
        taskPlacementResult.status !==
          "matched" ||
        !taskPlacementResult.weeklyTarget
      ) {
        return;
      }

      resolvedWeeklyTargetId =
        taskPlacementResult
          .weeklyTarget
          .id;
    }

    createTask({
      title:
        trimmed,

      priority:
        taskPriority,

      dueDate:
        taskDueDate ||
        undefined,

      weeklyTargetId:
        resolvedWeeklyTargetId,
    });

    setTaskTitle("");

    setTaskPriority(
      "medium"
    );

    setTaskDueDate("");

    setAddingTaskForWeekId(
      undefined
    );
  }

  // ==========================================
  // Universal Task Execution
  // ==========================================

  function handleToggleTask(
    taskId: number
  ) {
    const selectedTask =
      tasks.find(
        (task) =>
          task.id ===
          taskId
      );

    if (!selectedTask) {
      return;
    }

    if (
      selectedTask.completed
    ) {
      uncompleteTask(
        taskId
      );

      return;
    }

    completeTask(
      taskId
    );
  }

  function handleDeleteTask(
    taskId: number
  ) {
    deleteTask(
      taskId
    );
  }

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
        bg-slate-900/55
      "
    >
      {/* ======================================
          Compact Month Row
      ====================================== */}

      <div
        className="
          flex
          items-center
          gap-2
          px-3
          py-3
          transition
          hover:bg-slate-800/35
        "
      >
        <button
          type="button"
          onClick={() =>
            setExpanded(
              (value) =>
                !value
            )
          }
          className="
            flex
            min-w-0
            flex-1
            items-center
            gap-3
            text-left
          "
        >
          <span
            className="
              flex
              h-7
              w-7
              shrink-0
              items-center
              justify-center
              rounded-md
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
                  font-semibold
                  text-slate-200
                "
              >
                {formatMonthLabel(
                  month.month,
                  month.year
                )}
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
              text-[11px]
              text-slate-600
              sm:inline
            "
          >
            {plannedOwnedWeeks}
            /
            {ownedWeeks.length}
            {" "}
            weeks planned
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
            {clampProgress(
              month.progress
            )}
            %
          </span>
        </button>

        <button
          type="button"
          onClick={
            startEditingMonth
          }
          title="Edit monthly outcome"
          className="
            flex
            h-7
            w-7
            shrink-0
            items-center
            justify-center
            rounded-md
            text-[10px]
            text-slate-600
            transition
            hover:bg-slate-800
            hover:text-cyan-400
          "
        >
          <FaPen />
        </button>
      </div>

      {/* ======================================
          Monthly Outcome Editing
      ====================================== */}

      {editingMonth && (
        <div
          className="
            border-t
            border-slate-800
            bg-slate-950/35
            px-3
            py-3
          "
        >
          <p
            className="
              text-[10px]
              font-semibold
              uppercase
              tracking-wider
              text-cyan-400
            "
          >
            Edit Monthly Outcome
          </p>

          <p
            className="
              mt-1
              text-[10px]
              text-slate-600
            "
          >
            {formatMonthLabel(
              month.month,
              month.year
            )}
          </p>

          <div
            className="
              mt-3
              flex
              items-center
              gap-2
            "
          >
            <input
              value={
                monthTitleDraft
              }
              onChange={(
                event
              ) =>
                setMonthTitleDraft(
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

                  saveMonthTitle();
                }

                if (
                  event.key ===
                  "Escape"
                ) {
                  event.preventDefault();

                  cancelEditingMonth();
                }
              }}
              placeholder="Monthly outcome"
              className="
                min-w-0
                flex-1
                rounded-lg
                border
                border-slate-800
                bg-slate-950
                px-3
                py-2
                text-sm
                text-white
                outline-none
                transition
                placeholder:text-slate-700
                focus:border-cyan-500/50
              "
              autoFocus
            />

            <button
              type="button"
              onClick={
                saveMonthTitle
              }
              title="Save"
              className="
                flex
                h-9
                w-9
                shrink-0
                items-center
                justify-center
                rounded-lg
                bg-cyan-500
                text-xs
                text-slate-950
                transition
                hover:bg-cyan-400
              "
            >
              <FaCheck />
            </button>

            <button
              type="button"
              onClick={
                cancelEditingMonth
              }
              title="Cancel"
              className="
                flex
                h-9
                w-9
                shrink-0
                items-center
                justify-center
                rounded-lg
                border
                border-slate-800
                bg-slate-900
                text-xs
                text-slate-500
                transition
                hover:text-slate-300
              "
            >
              <FaXmark />
            </button>
          </div>
        </div>
      )}

      {/* ======================================
          Month Workspace
      ====================================== */}

      {expanded && (
        <div
          className="
            space-y-2
            border-t
            border-slate-800
            bg-slate-950/25
            p-3
          "
        >
          <div
            className="
              flex
              flex-wrap
              items-center
              justify-between
              gap-2
              px-1
              pb-1
            "
          >
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
                Month Workspace
              </p>

              <p
                className="
                  mt-1
                  text-[10px]
                  text-slate-600
                "
              >
                Real calendar weeks for{" "}
                {formatMonthLabel(
                  month.month,
                  month.year
                )}.
              </p>
            </div>

            <span
              className="
                text-[10px]
                font-medium
                text-slate-500
              "
            >
              {plannedOwnedWeeks}
              /
              {ownedWeeks.length}
              {" "}
              owned weeks planned
            </span>
          </div>

          {calendarWeeks.length ===
          0 ? (
            <div
              className="
                rounded-lg
                border
                border-dashed
                border-slate-800
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
                No active goal weeks in this month
              </p>

              <p
                className="
                  mt-1
                  text-[10px]
                  text-slate-600
                "
              >
                This month falls outside the goal&apos;s active timeline.
              </p>
            </div>
          ) : (
            calendarWeeks.map(
              (week) => {
                const target =
                  getWeeklyTargetForSlot(
                    week.weekStartDate,
                    week.weekEndDate
                  );

                const ownershipEntry =
                  weekOwnership.find(
                    (entry) =>
                      entry.week
                        .weekStartDate ===
                      week.weekStartDate
                  );

                const ownership =
                  ownershipEntry?.result ??
                  GoalWeekOwnershipEngine.resolve(
                    placementState,
                    month.id,
                    week.weekStartDate,
                    week.weekEndDate
                  );

                const currentMonthOwnsWeek =
                  ownership.ownerMonth ===
                    month.month &&
                  ownership.ownerYear ===
                    month.year;

                const ownerLabel =
                  getOwnerLabel(
                    ownership.ownerMonth,
                    ownership.ownerYear
                  );

                const ownerMonthlyTarget =
                  ownership.ownerMonthlyTarget;

                const existingOwnerWeeklyTarget =
                  ownership.existingWeeklyTarget;

                const isPlanningThisWeek =
                  selectedWeek?.weekStartDate ===
                    week.weekStartDate &&
                  selectedWeek?.weekEndDate ===
                    week.weekEndDate;

                const isEditingThisWeek =
                  target !== undefined &&
                  editingWeeklyTargetId ===
                    target.id;

                const isAddingTask =
                  target !== undefined &&
                  addingTaskForWeekId ===
                    target.id;

                const weeklyTasks =
                  target
                    ? getTasksForWeeklyTarget(
                        target.id
                      )
                    : [];

                const completedTaskCount =
                  weeklyTasks.filter(
                    (task) =>
                      task.completed
                  ).length;

                return (
                  <div
                    key={
                      week.weekStartDate
                    }
                    className={`
                      overflow-hidden
                      rounded-lg
                      border
                      ${
                        week.isCurrentWeek
                          ? "border-cyan-500/25 bg-cyan-500/5"
                          : "border-slate-800 bg-slate-900/45"
                      }
                    `}
                  >
                    {/* ======================================
                        Week Context
                    ====================================== */}

                    <div className="p-3">
                      <div
                        className="
                          flex
                          items-start
                          justify-between
                          gap-3
                        "
                      >
                        <div className="min-w-0 flex-1">
                          <div
                            className="
                              flex
                              flex-wrap
                              items-center
                              gap-2
                            "
                          >
                            <span
                              className="
                                text-xs
                                font-semibold
                                text-slate-300
                              "
                            >
                              {week.displayLabel}
                            </span>

                            {week.isCurrentWeek && (
                              <span
                                className="
                                  rounded
                                  bg-cyan-500/10
                                  px-1.5
                                  py-0.5
                                  text-[9px]
                                  font-bold
                                  uppercase
                                  tracking-wide
                                  text-cyan-400
                                "
                              >
                                This week
                              </span>
                            )}

                            {(week.startsInPreviousMonth ||
                              week.endsInNextMonth) && (
                              <span
                                className="
                                  rounded
                                  border
                                  border-slate-800
                                  bg-slate-950/40
                                  px-1.5
                                  py-0.5
                                  text-[9px]
                                  text-slate-600
                                "
                              >
                                Cross-month
                              </span>
                            )}

                            {!currentMonthOwnsWeek &&
                              ownerLabel && (
                                <span
                                  className="
                                    rounded
                                    border
                                    border-violet-500/20
                                    bg-violet-500/5
                                    px-1.5
                                    py-0.5
                                    text-[9px]
                                    font-medium
                                    text-violet-300
                                  "
                                >
                                  Owned by{" "}
                                  {ownerLabel}
                                </span>
                              )}
                          </div>

                          {/* ==================================
                              Planned Weekly Focus
                          ================================== */}

                          {target ? (
                            <div
                              className="
                                mt-2
                                flex
                                flex-wrap
                                items-center
                                gap-x-3
                                gap-y-1
                              "
                            >
                              <span
                                className="
                                  text-[11px]
                                  font-semibold
                                  text-slate-300
                                "
                              >
                                {target.title}
                              </span>

                              <span
                                className="
                                  text-[10px]
                                  text-slate-600
                                "
                              >
                                {clampProgress(
                                  target.progress
                                )}
                                %
                              </span>

                              <span
                                className="
                                  text-[10px]
                                  text-slate-600
                                "
                              >
                                {
                                  completedTaskCount
                                }
                                /
                                {
                                  weeklyTasks.length
                                }{" "}
                                tasks
                              </span>

                              {!isEditingThisWeek && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    startEditingWeeklyTarget(
                                      target
                                    )
                                  }
                                  title="Edit weekly focus"
                                  className="
                                    flex
                                    h-6
                                    w-6
                                    items-center
                                    justify-center
                                    rounded-md
                                    text-[9px]
                                    text-slate-700
                                    transition
                                    hover:bg-slate-800
                                    hover:text-cyan-400
                                  "
                                >
                                  <FaPen />
                                </button>
                              )}
                            </div>
                          ) : !currentMonthOwnsWeek ? (
                            <div className="mt-2">
                              {existingOwnerWeeklyTarget ? (
                                <>
                                  <p
                                    className="
                                      text-[11px]
                                      text-slate-500
                                    "
                                  >
                                    Weekly Focus:{" "}
                                    <span
                                      className="
                                        font-medium
                                        text-slate-400
                                      "
                                    >
                                      {
                                        existingOwnerWeeklyTarget.title
                                      }
                                    </span>
                                  </p>

                                  {ownerMonthlyTarget && (
                                    <p
                                      className="
                                        mt-0.5
                                        text-[10px]
                                        text-slate-600
                                      "
                                    >
                                      Managed from{" "}
                                      {ownerLabel}.
                                    </p>
                                  )}
                                </>
                              ) : ownerMonthlyTarget ? (
                                <p
                                  className="
                                    text-[11px]
                                    text-slate-600
                                  "
                                >
                                  This real week is planned from{" "}
                                  <span
                                    className="
                                      font-medium
                                      text-violet-300
                                    "
                                  >
                                    {ownerLabel}
                                  </span>
                                  .
                                </p>
                              ) : (
                                <p
                                  className="
                                    text-[11px]
                                    text-amber-400/80
                                  "
                                >
                                  {ownerLabel
                                    ? `${ownerLabel} owns this week, but its Monthly Outcome has not been planned yet.`
                                    : ownership.message}
                                </p>
                              )}
                            </div>
                          ) : (
                            <p
                              className="
                                mt-2
                                text-[11px]
                                text-slate-600
                              "
                            >
                              No Weekly Focus planned.
                            </p>
                          )}
                        </div>

                        {!target &&
                          currentMonthOwnsWeek &&
                          !isPlanningThisWeek && (
                            <button
                              type="button"
                              onClick={() =>
                                startPlanningWeek(
                                  {
                                    weekStartDate:
                                      week.weekStartDate,

                                    weekEndDate:
                                      week.weekEndDate,

                                    displayLabel:
                                      week.displayLabel,
                                  }
                                )
                              }
                              className="
                                inline-flex
                                shrink-0
                                items-center
                                gap-1.5
                                rounded-md
                                border
                                border-cyan-500/20
                                bg-cyan-500/5
                                px-2.5
                                py-1.5
                                text-[10px]
                                font-semibold
                                text-cyan-400
                                transition
                                hover:bg-cyan-500/10
                                hover:text-cyan-300
                              "
                            >
                              <FaPlus />

                              Plan Week
                            </button>
                          )}
                      </div>

                      {/* ======================================
                          Weekly Focus Editing
                      ====================================== */}

                      {target &&
                        isEditingThisWeek && (
                          <div
                            className="
                              mt-3
                              flex
                              items-center
                              gap-2
                              rounded-lg
                              border
                              border-cyan-500/15
                              bg-slate-950/35
                              p-2.5
                            "
                          >
                            <input
                              value={
                                weeklyTitleDraft
                              }
                              onChange={(
                                event
                              ) =>
                                setWeeklyTitleDraft(
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

                                  saveWeeklyTargetTitle();
                                }

                                if (
                                  event.key ===
                                  "Escape"
                                ) {
                                  event.preventDefault();

                                  cancelEditingWeeklyTarget();
                                }
                              }}
                              placeholder="Weekly focus"
                              className="
                                min-w-0
                                flex-1
                                rounded-lg
                                border
                                border-slate-800
                                bg-slate-950
                                px-3
                                py-2
                                text-sm
                                text-white
                                outline-none
                                transition
                                placeholder:text-slate-700
                                focus:border-cyan-500/50
                              "
                              autoFocus
                            />

                            <button
                              type="button"
                              onClick={
                                saveWeeklyTargetTitle
                              }
                              title="Save"
                              className="
                                flex
                                h-9
                                w-9
                                shrink-0
                                items-center
                                justify-center
                                rounded-lg
                                bg-cyan-500
                                text-xs
                                text-slate-950
                              "
                            >
                              <FaCheck />
                            </button>

                            <button
                              type="button"
                              onClick={
                                cancelEditingWeeklyTarget
                              }
                              title="Cancel"
                              className="
                                flex
                                h-9
                                w-9
                                shrink-0
                                items-center
                                justify-center
                                rounded-lg
                                border
                                border-slate-800
                                bg-slate-900
                                text-xs
                                text-slate-500
                              "
                            >
                              <FaXmark />
                            </button>
                          </div>
                        )}

                      {/* ======================================
                          Weekly Focus Creation
                      ====================================== */}

                      {isPlanningThisWeek &&
                        currentMonthOwnsWeek && (
                          <div
                            className="
                              mt-3
                              rounded-lg
                              border
                              border-cyan-500/20
                              bg-slate-950/40
                              p-3
                            "
                          >
                            <div>
                              <p
                                className="
                                  text-[10px]
                                  font-semibold
                                  uppercase
                                  tracking-wider
                                  text-cyan-400
                                "
                              >
                                New Weekly Focus
                              </p>

                              <p
                                className="
                                  mt-1
                                  text-[10px]
                                  text-slate-600
                                "
                              >
                                {
                                  selectedWeek?.displayLabel
                                }
                              </p>
                            </div>

                            <input
                              value={
                                weeklyFocus
                              }
                              onChange={(
                                event
                              ) => {
                                setWeeklyFocus(
                                  event.target.value
                                );

                                if (
                                  weeklyFocusError
                                ) {
                                  setWeeklyFocusError(
                                    undefined
                                  );
                                }
                              }}
                              onKeyDown={(
                                event
                              ) => {
                                if (
                                  event.key ===
                                  "Enter"
                                ) {
                                  event.preventDefault();

                                  createWeeklyFocus();
                                }

                                if (
                                  event.key ===
                                  "Escape"
                                ) {
                                  event.preventDefault();

                                  cancelPlanningWeek();
                                }
                              }}
                              placeholder="What should this week accomplish?"
                              className="
                                mt-3
                                w-full
                                rounded-lg
                                border
                                border-slate-800
                                bg-slate-950
                                px-3
                                py-2.5
                                text-sm
                                text-white
                                outline-none
                                transition
                                placeholder:text-slate-700
                                focus:border-cyan-500/50
                              "
                              autoFocus
                            />

                            {weeklyFocusError && (
                              <p
                                className="
                                  mt-2
                                  text-[10px]
                                  text-amber-400
                                "
                              >
                                {weeklyFocusError}
                              </p>
                            )}

                            <div
                              className="
                                mt-3
                                flex
                                justify-end
                                gap-2
                              "
                            >
                              <button
                                type="button"
                                onClick={
                                  cancelPlanningWeek
                                }
                                className="
                                  rounded-md
                                  px-3
                                  py-1.5
                                  text-[10px]
                                  font-medium
                                  text-slate-500
                                  hover:bg-slate-800
                                "
                              >
                                Cancel
                              </button>

                              <button
                                type="button"
                                onClick={
                                  createWeeklyFocus
                                }
                                className="
                                  rounded-md
                                  bg-cyan-500
                                  px-3
                                  py-1.5
                                  text-[10px]
                                  font-bold
                                  text-slate-950
                                  hover:bg-cyan-400
                                "
                              >
                                Create Weekly Focus
                              </button>
                            </div>
                          </div>
                        )}
                    </div>

                    {/* ======================================
                        Tasks — No Extra Accordion
                    ====================================== */}

                    {target && (
                      <div
                        className="
                          border-t
                          border-slate-800
                          bg-slate-950/25
                          p-3
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
                          <div>
                            <p
                              className="
                                text-[10px]
                                font-semibold
                                uppercase
                                tracking-wider
                                text-slate-500
                              "
                            >
                              Tasks
                            </p>

                            <p
                              className="
                                mt-0.5
                                text-[10px]
                                text-slate-600
                              "
                            >
                              {weeklyTasks.length ===
                              0
                                ? "No tasks yet."
                                : `${completedTaskCount}/${weeklyTasks.length} completed`}
                            </p>
                          </div>

                          {!isAddingTask && (
                            <button
                              type="button"
                              onClick={() =>
                                startAddingTask(
                                  target
                                )
                              }
                              className="
                                inline-flex
                                shrink-0
                                items-center
                                gap-1.5
                                rounded-md
                                border
                                border-cyan-500/20
                                bg-cyan-500/5
                                px-2.5
                                py-1.5
                                text-[10px]
                                font-semibold
                                text-cyan-400
                                transition
                                hover:bg-cyan-500/10
                              "
                            >
                              <FaPlus />

                              Add Task
                            </button>
                          )}
                        </div>

                        {/* ==================================
                            Smart Task Form
                        ================================== */}

                        {isAddingTask && (
                          <div
                            className="
                              mt-3
                              rounded-lg
                              border
                              border-cyan-500/15
                              bg-slate-950/45
                              p-3
                            "
                          >
                            <div
                              className="
                                flex
                                flex-wrap
                                items-center
                                justify-between
                                gap-2
                              "
                            >
                              <div>
                                <p
                                  className="
                                    text-[10px]
                                    font-semibold
                                    uppercase
                                    tracking-wider
                                    text-cyan-400
                                  "
                                >
                                  New Task
                                </p>

                                <p
                                  className="
                                    mt-1
                                    text-[10px]
                                    text-slate-600
                                  "
                                >
                                  Context:{" "}
                                  {week.displayLabel}
                                </p>
                              </div>

                              {taskDueDate && (
                                <span
                                  className="
                                    text-[10px]
                                    font-medium
                                    text-slate-500
                                  "
                                >
                                  Due{" "}
                                  {formatDateLabel(
                                    taskDueDate
                                  )}
                                </span>
                              )}
                            </div>

                            <div
                              className="
                                mt-3
                                grid
                                gap-2
                                lg:grid-cols-[minmax(220px,1fr)_120px_170px]
                              "
                            >
                              <input
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

                                    handleCreateTask(
                                      target.id
                                    );
                                  }

                                  if (
                                    event.key ===
                                    "Escape"
                                  ) {
                                    event.preventDefault();

                                    cancelAddingTask();
                                  }
                                }}
                                placeholder="What needs to be done?"
                                className="
                                  h-10
                                  min-w-0
                                  rounded-lg
                                  border
                                  border-slate-800
                                  bg-slate-950
                                  px-3
                                  text-sm
                                  text-white
                                  outline-none
                                  transition
                                  placeholder:text-slate-700
                                  focus:border-cyan-500/50
                                "
                                autoFocus
                              />

                              <select
                                value={
                                  taskPriority
                                }
                                onChange={(
                                  event
                                ) =>
                                  setTaskPriority(
                                    event.target.value as TaskPriority
                                  )
                                }
                                className="
                                  h-10
                                  rounded-lg
                                  border
                                  border-slate-800
                                  bg-slate-950
                                  px-3
                                  text-sm
                                  text-slate-300
                                  outline-none
                                  focus:border-cyan-500/50
                                "
                              >
                                <option value="low">
                                  Low
                                </option>

                                <option value="medium">
                                  Medium
                                </option>

                                <option value="high">
                                  High
                                </option>
                              </select>

                              <input
                                type="date"
                                value={
                                  taskDueDate
                                }
                                onChange={(
                                  event
                                ) =>
                                  setTaskDueDate(
                                    event.target.value
                                  )
                                }
                                className="
                                  h-10
                                  rounded-lg
                                  border
                                  border-slate-800
                                  bg-slate-950
                                  px-3
                                  text-sm
                                  text-slate-300
                                  outline-none
                                  focus:border-cyan-500/50
                                "
                              />
                            </div>

                            {/* ==================================
                                Quiet Smart Placement
                            ================================== */}

                            {taskDueDate &&
                              taskPlacementResult && (
                                <>
                                  {taskPlacementResult.status ===
                                    "matched" &&
                                  taskPlacementResult.weeklyTarget ? (
                                    <p
                                      className="
                                        mt-2
                                        text-[10px]
                                        text-emerald-400/80
                                      "
                                    >
                                      <FaCheck
                                        className="
                                          mr-1
                                          inline
                                          text-[9px]
                                        "
                                      />

                                      LifeOS will place this task in{" "}
                                      <span className="font-semibold">
                                        {
                                          taskPlacementResult
                                            .weeklyTarget
                                            .title
                                        }
                                      </span>
                                      .
                                    </p>
                                  ) : (
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
                                          text-[10px]
                                          font-semibold
                                          text-amber-400
                                        "
                                      >
                                        {
                                          taskPlacementResult.message
                                        }
                                      </p>
                                    </div>
                                  )}
                                </>
                              )}

                            <div
                              className="
                                mt-3
                                flex
                                justify-end
                                gap-2
                              "
                            >
                              <button
                                type="button"
                                onClick={
                                  cancelAddingTask
                                }
                                className="
                                  rounded-md
                                  px-3
                                  py-1.5
                                  text-[10px]
                                  font-medium
                                  text-slate-500
                                  hover:bg-slate-800
                                "
                              >
                                Cancel
                              </button>

                              <button
                                type="button"
                                onClick={() =>
                                  handleCreateTask(
                                    target.id
                                  )
                                }
                                disabled={
                                  Boolean(
                                    taskDueDate &&
                                    taskPlacementResult?.status !==
                                      "matched"
                                  )
                                }
                                className="
                                  rounded-md
                                  bg-cyan-500
                                  px-3
                                  py-1.5
                                  text-[10px]
                                  font-bold
                                  text-slate-950
                                  transition
                                  hover:bg-cyan-400
                                  disabled:cursor-not-allowed
                                  disabled:opacity-40
                                "
                              >
                                Add Task
                              </button>
                            </div>
                          </div>
                        )}

                        {/* ==================================
                            Universal Task List
                        ================================== */}

                        {weeklyTasks.length >
                          0 && (
                          <div className="mt-3">
                            <UniversalTaskTable
                              tasks={
                                weeklyTasks
                              }
                              variant="compact"
                              getPlanIcon={() =>
                                "goal"
                              }
                              getWeeklyTargetTitle={() =>
                                target.title
                              }
                              onToggle={
                                handleToggleTask
                              }
                              onDelete={
                                handleDeleteTask
                              }
                              emptyMessage="No tasks in this Weekly Focus yet."
                            />
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              }
            )
          )}
        </div>
      )}
    </div>
  );
}