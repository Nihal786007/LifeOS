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
  useMonthlyPlanning,
} from "../../context/MonthlyPlanningContext";

import {
  useWeeklyPlanning,
} from "../../context/WeeklyPlanningContext";

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
// Helpers
// ==========================================

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
    updateMonthlyPlanTitle,
  } = useMonthlyPlanning();

  const {
    addCalendarWeeklyTarget,
    updateWeeklyTargetTitle,
  } = useWeeklyPlanning();

  const {
    tasks,
  } = useTasks();

  const {
    lifeGoals,
  } = useLifeGoals();

  const {
    createTask,
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
  // Week Task Expansion
  // ==========================================

  const [
    expandedWeeklyTargetId,
    setExpandedWeeklyTargetId,
  ] = useState<
    number | undefined
  >(undefined);

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
    return (
      monthWeeklyTargets.find(
        (target) =>
          target.weekStartDate ===
            weekStartDate &&
          target.weekEndDate ===
            weekEndDate
      )
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
  // Placement State
  // ==========================================

  const placementState =
    useMemo(
      () => ({
        lifeGoals,

        monthlyTargets: [
          month,
        ],

        weeklyTargets,
      }),
      [
        lifeGoals,
        month,
        weeklyTargets,
      ]
    );

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

    updateMonthlyPlanTitle(
      month.id,
      trimmed
    );

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

    setEditingWeeklyTargetId(
      undefined
    );
  }

  function cancelPlanningWeek() {
    setSelectedWeek(
      undefined
    );

    setWeeklyFocus("");
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

    addCalendarWeeklyTarget(
      trimmed,
      month.id,
      selectedWeek.weekStartDate,
      selectedWeek.weekEndDate
    );

    setSelectedWeek(
      undefined
    );

    setWeeklyFocus("");
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

    updateWeeklyTargetTitle(
      editingWeeklyTargetId,
      trimmed
    );

    setEditingWeeklyTargetId(
      undefined
    );

    setWeeklyTitleDraft("");
  }

  // ==========================================
  // Weekly Task Expansion
  // ==========================================

  function toggleWeeklyTasks(
    weeklyTargetId: number
  ) {
    setExpandedWeeklyTargetId(
      (current) =>
        current ===
        weeklyTargetId
          ? undefined
          : weeklyTargetId
    );
  }

  // ==========================================
  // Universal Task Creation
  // ==========================================

  function startAddingTask(
    weeklyTargetId: number
  ) {
    setExpandedWeeklyTargetId(
      weeklyTargetId
    );

    setAddingTaskForWeekId(
      weeklyTargetId
    );

    setTaskTitle("");

    setTaskPriority(
      "medium"
    );

    setTaskDueDate("");
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

    setExpandedWeeklyTargetId(
      resolvedWeeklyTargetId
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
            {monthWeeklyTargets.length}
            /
            {calendarWeeks.length}
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
          Real Calendar Weeks
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

                const isPlanningThisWeek =
                  selectedWeek?.weekStartDate ===
                    week.weekStartDate &&
                  selectedWeek?.weekEndDate ===
                    week.weekEndDate;

                const isEditingThisWeek =
                  target !== undefined &&
                  editingWeeklyTargetId ===
                    target.id;

                const isTasksExpanded =
                  target !== undefined &&
                  expandedWeeklyTargetId ===
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
                        Week Header
                    ====================================== */}

                    <div className="p-3">
                      <div
                        className="
                          flex
                          items-center
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

                            {target && (
                              <span
                                className="
                                  text-[9px]
                                  text-slate-600
                                "
                              >
                                {weeklyTasks.length}
                                {" "}
                                {weeklyTasks.length ===
                                1
                                  ? "task"
                                  : "tasks"}
                              </span>
                            )}
                          </div>

                          {target ? (
                            <div
                              className="
                                mt-1
                                flex
                                items-center
                                gap-2
                              "
                            >
                              <button
                                type="button"
                                onClick={() =>
                                  toggleWeeklyTasks(
                                    target.id
                                  )
                                }
                                className="
                                  flex
                                  min-w-0
                                  flex-1
                                  items-center
                                  gap-2
                                  text-left
                                "
                              >
                                <span
                                  className="
                                    text-[9px]
                                    text-slate-600
                                  "
                                >
                                  {isTasksExpanded ? (
                                    <FaChevronDown />
                                  ) : (
                                    <FaChevronRight />
                                  )}
                                </span>

                                <span
                                  className="
                                    truncate
                                    text-[11px]
                                    font-medium
                                    text-slate-400
                                    transition
                                    hover:text-slate-200
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
                              </button>

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
                                    shrink-0
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
                          ) : (
                            <p
                              className="
                                mt-1
                                text-[11px]
                                text-slate-600
                              "
                            >
                              No weekly focus planned.
                            </p>
                          )}
                        </div>

                        {!target &&
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
                              rounded-lg
                              border
                              border-cyan-500/20
                              bg-slate-950/40
                              p-3
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
                              Edit Weekly Focus
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
                          </div>
                        )}

                      {/* ======================================
                          Weekly Focus Creation
                      ====================================== */}

                      {isPlanningThisWeek && (
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
                          <p
                            className="
                              text-[10px]
                              font-semibold
                              uppercase
                              tracking-wider
                              text-cyan-400
                            "
                          >
                            Weekly Focus
                          </p>

                          <p
                            className="
                              mt-1
                              text-[10px]
                              text-slate-600
                            "
                          >
                            {selectedWeek.displayLabel}
                          </p>

                          <input
                            value={
                              weeklyFocus
                            }
                            onChange={(
                              event
                            ) =>
                              setWeeklyFocus(
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
                        Universal Tasks
                    ====================================== */}

                    {target &&
                      isTasksExpanded && (
                        <div
                          className="
                            border-t
                            border-slate-800
                            bg-slate-950/30
                            p-3
                          "
                        >
                          <div
                            className="
                              mb-3
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
                                Universal Tasks
                              </p>

                              <p
                                className="
                                  mt-0.5
                                  text-[10px]
                                  text-slate-600
                                "
                              >
                                Tasks linked to this weekly focus.
                              </p>
                            </div>

                            {!isAddingTask && (
                              <button
                                type="button"
                                onClick={() =>
                                  startAddingTask(
                                    target.id
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
                              Add Task Form
                          ================================== */}

                          {isAddingTask && (
                            <div
                              className="
                                mb-3
                                rounded-lg
                                border
                                border-cyan-500/20
                                bg-slate-950/50
                                p-3
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
                                New Universal Task
                              </p>

                              <div
                                className="
                                  mt-3
                                  grid
                                  gap-2
                                  lg:grid-cols-[minmax(220px,1fr)_120px_150px]
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
                                  Smart Placement Preview
                              ================================== */}

                              {taskDueDate &&
                                taskPlacementResult && (
                                  <div
                                    className={`
                                      mt-3
                                      rounded-lg
                                      border
                                      px-3
                                      py-2

                                      ${
                                        taskPlacementResult.status ===
                                        "matched"
                                          ? "border-emerald-500/20 bg-emerald-500/5"
                                          : "border-amber-500/20 bg-amber-500/5"
                                      }
                                    `}
                                  >
                                    <p
                                      className={`
                                        text-[10px]
                                        font-semibold
                                        uppercase
                                        tracking-wider

                                        ${
                                          taskPlacementResult.status ===
                                          "matched"
                                            ? "text-emerald-400"
                                            : "text-amber-400"
                                        }
                                      `}
                                    >
                                      Smart Placement
                                    </p>

                                    <p className="mt-1 text-[11px] text-slate-400">
                                      {
                                        taskPlacementResult.message
                                      }
                                    </p>

                                    {taskPlacementResult.status ===
                                      "matched" &&
                                      taskPlacementResult.weeklyTarget && (
                                        <p className="mt-1 text-[10px] text-slate-600">
                                          Weekly focus:{" "}
                                          {
                                            taskPlacementResult
                                              .weeklyTarget
                                              .title
                                          }
                                        </p>
                                      )}
                                  </div>
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
                              Shared Compact Universal Tasks
                          ================================== */}

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
                            emptyMessage="No tasks in this weekly focus yet."
                          />
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