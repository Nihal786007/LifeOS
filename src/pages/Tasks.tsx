import {
  useMemo,
  useState,
} from "react";

import {
  FaBullseye,
  FaPlus,
  FaSearch,
  FaUser,
} from "react-icons/fa";

import {
  sortTasks,
} from "../utils/taskSorter";

import {
  TaskRelationshipEngine,
} from "../engines/TaskRelationshipEngine";

import {
  TaskWeekPlacementEngine,
} from "../engines/TaskWeekPlacementEngine";

import {
  useTasks,
} from "../context/TaskContext";

import {
  useLifeGoals,
} from "../context/LifeGoalsContext";

import {
  useMonthlyPlanning,
} from "../context/MonthlyPlanningContext";

import {
  useWeeklyPlanning,
} from "../context/WeeklyPlanningContext";

import {
  usePlanningExecution,
} from "../context/PlanningExecutionContext";

import UniversalTaskTable from "../components/tasks/UniversalTaskTable";

import Button from "../components/ui/Button";
import Input from "../components/ui/Input";

import type {
  TaskPlacementScope,
} from "../engines/TaskWeekPlacementEngine";

// ==========================================
// Types
// ==========================================

type Priority =
  | "low"
  | "medium"
  | "high";

type TaskFilter =
  | "all"
  | "today"
  | "overdue"
  | "upcoming"
  | "completed";

// ==========================================
// Date
// ==========================================

function getLocalDateString() {
  const now =
    new Date();

  const year =
    now.getFullYear();

  const month =
    String(
      now.getMonth() + 1
    ).padStart(
      2,
      "0"
    );

  const day =
    String(
      now.getDate()
    ).padStart(
      2,
      "0"
    );

  return `${year}-${month}-${day}`;
}

function parseLocalDate(
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

function formatWeekRange(
  weekStartDate?: string,
  weekEndDate?: string
) {
  const start =
    parseLocalDate(
      weekStartDate
    );

  const end =
    parseLocalDate(
      weekEndDate
    );

  if (
    !start ||
    !end
  ) {
    return undefined;
  }

  const sameYear =
    start.getFullYear() ===
    end.getFullYear();

  const sameMonth =
    sameYear &&
    start.getMonth() ===
      end.getMonth();

  if (sameMonth) {
    const monthLabel =
      start.toLocaleDateString(
        undefined,
        {
          month:
            "short",
        }
      );

    return `${monthLabel} ${start.getDate()}–${end.getDate()}`;
  }

  if (sameYear) {
    const startLabel =
      start.toLocaleDateString(
        undefined,
        {
          month:
            "short",
          day:
            "numeric",
        }
      );

    const endLabel =
      end.toLocaleDateString(
        undefined,
        {
          month:
            "short",
          day:
            "numeric",
        }
      );

    return `${startLabel}–${endLabel}`;
  }

  const startLabel =
    start.toLocaleDateString(
      undefined,
      {
        month:
          "short",
        day:
          "numeric",
        year:
          "numeric",
      }
    );

  const endLabel =
    end.toLocaleDateString(
      undefined,
      {
        month:
          "short",
        day:
          "numeric",
        year:
          "numeric",
      }
    );

  return `${startLabel}–${endLabel}`;
}

// ==========================================
// Page
// ==========================================

export default function Tasks() {
  const [
    taskTitle,
    setTaskTitle,
  ] = useState("");

  const [
    search,
    setSearch,
  ] = useState("");

  const [
    priority,
    setPriority,
  ] =
    useState<Priority>(
      "medium"
    );

  const [
    dueDate,
    setDueDate,
  ] = useState(
    getLocalDateString()
  );

  const [
    planScope,
    setPlanScope,
  ] =
    useState<TaskPlacementScope>(
      "standalone"
    );

  const [
    selectedGoalId,
    setSelectedGoalId,
  ] = useState<
    number | undefined
  >(undefined);

  const [
    missingWeekFocus,
    setMissingWeekFocus,
  ] = useState("");

  const [
    activeFilter,
    setActiveFilter,
  ] =
    useState<TaskFilter>(
      "all"
    );

  // ==========================================
  // Universal Task State
  // ==========================================

  const {
    tasks,
  } = useTasks();

  const {
    lifeGoals,
  } = useLifeGoals();

  const {
    monthlyPlans,
  } =
    useMonthlyPlanning();

  const {
    weeklyTargets,
  } =
    useWeeklyPlanning();

  // ==========================================
  // Universal Planning + Execution
  // ==========================================

  const {
    createTask,

    createGoalWeeklyFocus,

    completeTask,
    uncompleteTask,
    deleteTask,
  } =
    usePlanningExecution();

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
  // Placement State
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

  const placementResult =
    useMemo(
      () =>
        TaskWeekPlacementEngine.resolve(
          placementState,
          {
            scope:
              planScope,

            dueDate:
              dueDate ||
              undefined,

            goalId:
              selectedGoalId,
          }
        ),
      [
        placementState,
        planScope,
        dueDate,
        selectedGoalId,
      ]
    );

  // ==========================================
  // Date
  // ==========================================

  const today =
    getLocalDateString();

  // ==========================================
  // Real Task Groups
  // ==========================================

  const completedTasks =
    tasks.filter(
      (task) =>
        task.completed
    );

  const todayTasks =
    tasks.filter(
      (task) =>
        !task.completed &&
        task.dueDate ===
          today
    );

  const overdueTasks =
    tasks.filter(
      (task) =>
        !task.completed &&
        Boolean(
          task.dueDate
        ) &&
        task.dueDate! <
          today
    );

  const upcomingTasks =
    tasks.filter(
      (task) =>
        !task.completed &&
        Boolean(
          task.dueDate
        ) &&
        task.dueDate! >
          today
    );

  // ==========================================
  // Search + Filter
  // ==========================================

  const visibleTasks =
    useMemo(() => {
      const normalizedSearch =
        search
          .trim()
          .toLowerCase();

      const searched =
        tasks.filter(
          (task) =>
            task.title
              .toLowerCase()
              .includes(
                normalizedSearch
              ) ||
            (
              task.description ??
              ""
            )
              .toLowerCase()
              .includes(
                normalizedSearch
              )
        );

      const filtered =
        searched.filter(
          (task) => {
            switch (
              activeFilter
            ) {
              case "today":
                return (
                  !task.completed &&
                  task.dueDate ===
                    today
                );

              case "overdue":
                return (
                  !task.completed &&
                  Boolean(
                    task.dueDate
                  ) &&
                  task.dueDate! <
                    today
                );

              case "upcoming":
                return (
                  !task.completed &&
                  Boolean(
                    task.dueDate
                  ) &&
                  task.dueDate! >
                    today
                );

              case "completed":
                return (
                  task.completed
                );

              default:
                return true;
            }
          }
        );

      return sortTasks(
        filtered
      );
    }, [
      tasks,
      search,
      activeFilter,
      today,
    ]);

  // ==========================================
  // Creation Permission
  // ==========================================

  const canCreateTask =
    planScope ===
      "standalone" ||
    placementResult.status ===
      "matched";

  // ==========================================
  // Missing Weekly Focus Creation
  // ==========================================

  function handleCreateMissingWeeklyFocus() {
    if (
      placementResult.status !==
      "weekly_focus_missing"
    ) {
      return;
    }

    const trimmedFocus =
      missingWeekFocus.trim();

    if (!trimmedFocus) {
      return;
    }

    const monthlyTarget =
      placementResult.monthlyTarget;

    const weekStartDate =
      placementResult.weekStartDate;

    const weekEndDate =
      placementResult.weekEndDate;

    if (
      !monthlyTarget ||
      !weekStartDate ||
      !weekEndDate
    ) {
      return;
    }

    const result =
      createGoalWeeklyFocus(
        trimmedFocus,
        monthlyTarget.id,
        weekStartDate,
        weekEndDate
      );

    if (
      !result.created
    ) {
      return;
    }

    setMissingWeekFocus("");
  }

  // ==========================================
  // Universal Task Creation
  // ==========================================

  function handleAddTask() {
    const trimmedTitle =
      taskTitle.trim();

    if (!trimmedTitle) {
      return;
    }

    if (
      planScope !==
        "standalone" &&
      placementResult.status !==
        "matched"
    ) {
      return;
    }

    createTask({
      title:
        trimmedTitle,

      dueDate:
        dueDate ||
        undefined,

      priority,

      weeklyTargetId:
        placementResult.status ===
        "matched"
          ? placementResult
              .weeklyTarget?.id
          : undefined,
    });

    setTaskTitle("");
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
  // Relationship Presentation
  // ==========================================

  function getPlanType(
    task: typeof tasks[number]
  ):
    | "personal"
    | "goal"
    | "none" {
    const relationship =
      TaskRelationshipEngine
        .resolve(
          relationshipState,
          task.id
        );

    if (
      relationship?.scope ===
      "goal"
    ) {
      return "goal";
    }

    if (
      relationship?.scope ===
      "personal"
    ) {
      return "personal";
    }

    return "none";
  }

  function getWeeklyTargetTitle(
    task: typeof tasks[number]
  ) {
    const relationship =
      TaskRelationshipEngine
        .resolve(
          relationshipState,
          task.id
        );

    if (
      !relationship
        ?.weeklyTarget
    ) {
      return undefined;
    }

    const weeklyTarget =
      relationship.weeklyTarget;

    const weekRange =
      formatWeekRange(
        weeklyTarget.weekStartDate,
        weeklyTarget.weekEndDate
      );

    if (weekRange) {
      return `${weekRange} · ${weeklyTarget.title}`;
    }

    return weeklyTarget.title;
  }

  // ==========================================
  // Filters
  // ==========================================

  const filters: {
    id: TaskFilter;
    label: string;
    count: number;
  }[] = [
    {
      id: "all",
      label: "All",
      count:
        tasks.length,
    },
    {
      id: "today",
      label: "Today",
      count:
        todayTasks.length,
    },
    {
      id: "overdue",
      label: "Overdue",
      count:
        overdueTasks.length,
    },
    {
      id: "upcoming",
      label: "Upcoming",
      count:
        upcomingTasks.length,
    },
    {
      id: "completed",
      label: "Done",
      count:
        completedTasks.length,
    },
  ];

  // ==========================================
  // UI
  // ==========================================

  return (
    <div className="space-y-5">

      {/* ======================================
          Compact Header
      ====================================== */}

      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">

        <div>
          <p className="lifeos-page-eyebrow">
            Universal Execution
          </p>

          <h1 className="lifeos-page-title">
            Tasks
          </h1>

          <p className="lifeos-page-description !mt-1">
            One task. One state. Every view.
          </p>
        </div>

        <div className="flex items-center gap-5 text-sm">

          <div>
            <span className="font-semibold text-lifeos-text">
              {tasks.length}
            </span>

            <span className="ml-1 text-lifeos-muted">
              total
            </span>
          </div>

          <div>
            <span className="font-semibold text-lifeos-success">
              {
                completedTasks.length
              }
            </span>

            <span className="ml-1 text-lifeos-muted">
              done
            </span>
          </div>

          <div>
            <span className="font-semibold text-lifeos-accent">
              {
                todayTasks.length
              }
            </span>

            <span className="ml-1 text-lifeos-muted">
              today
            </span>
          </div>

        </div>

      </div>

      {/* ======================================
          Filter Strip
      ====================================== */}

      <div className="flex gap-2 overflow-x-auto pb-1">

        {filters.map(
          (filter) => {
            const active =
              activeFilter ===
              filter.id;

            return (
              <button
                key={
                  filter.id
                }
                type="button"
                onClick={() =>
                  setActiveFilter(
                    filter.id
                  )
                }
                className={`
                  shrink-0
                  rounded-lg
                  border
                  px-3
                  py-1.5
                  text-sm
                  font-medium
                  transition

                  ${
                    active
                      ? "border-lifeos-accent/40 bg-lifeos-accent/10 text-lifeos-accent"
                      : "border-lifeos-border bg-lifeos-surface text-lifeos-text-secondary hover:border-lifeos-border hover:text-lifeos-text"
                  }
                `}
              >
                {
                  filter.label
                }

                <span
                  className={`
                    ml-2
                    text-xs

                    ${
                      active
                        ? "text-lifeos-accent"
                        : "text-lifeos-muted"
                    }
                  `}
                >
                  {
                    filter.count
                  }
                </span>
              </button>
            );
          }
        )}

      </div>

      {/* ======================================
          Search + Smart Quick Add
      ====================================== */}

      <div className="rounded-xl border border-lifeos-border bg-lifeos-surface p-3">

        <div className="grid gap-3 xl:grid-cols-[minmax(220px,1fr)_minmax(260px,1.4fr)_130px_150px_auto]">

          {/* Search */}

          <div className="relative">

            <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-lifeos-muted" />

            <Input
              value={
                search
              }
              onChange={(
                event
              ) =>
                setSearch(
                  event.target
                    .value
                )
              }
              placeholder="Search tasks..."
              className="h-10 py-2 pl-9 text-sm"
            />

          </div>

          {/* Task */}

          <Input
            value={
              taskTitle
            }
            onChange={(
              event
            ) =>
              setTaskTitle(
                event.target
                  .value
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

                handleAddTask();
              }
            }}
            placeholder="Add a task..."
            className="h-10 py-2 text-sm"
          />

          {/* Priority */}

          <select
            value={
              priority
            }
            onChange={(
              event
            ) =>
              setPriority(
                event.target
                  .value as Priority
              )
            }
            className="h-10 rounded-xl border border-lifeos-border bg-lifeos-app px-3 text-sm text-lifeos-text outline-none transition focus:border-lifeos-accent"
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

          {/* Due */}

          <Input
            type="date"
            value={
              dueDate
            }
            onChange={(
              event
            ) =>
              setDueDate(
                event.target
                  .value
              )
            }
            className="h-10 py-2 text-sm"
          />

          {/* Add */}

          <Button
            onClick={
              handleAddTask
            }
            disabled={
              !canCreateTask
            }
            className="h-10 whitespace-nowrap px-4 py-2"
          >
            <FaPlus />

            Add
          </Button>

        </div>

        {/* ==================================
            Plan Selection
        ================================== */}

        <div className="mt-3 flex flex-wrap items-center gap-2">

          <button
            type="button"
            onClick={() => {
              setPlanScope(
                "standalone"
              );

              setSelectedGoalId(
                undefined
              );

              setMissingWeekFocus("");
            }}
            className={`
              rounded-lg
              border
              px-3
              py-1.5
              text-xs
              font-medium
              transition

              ${
                planScope ===
                "standalone"
                  ? "border-lifeos-accent/40 bg-lifeos-accent/10 text-lifeos-accent"
                  : "border-lifeos-border bg-lifeos-app text-lifeos-muted hover:text-lifeos-text-secondary"
              }
            `}
          >
            Standalone
          </button>

          <button
            type="button"
            onClick={() => {
              setPlanScope(
                "personal"
              );

              setSelectedGoalId(
                undefined
              );

              setMissingWeekFocus("");
            }}
            className={`
              inline-flex
              items-center
              gap-1.5
              rounded-lg
              border
              px-3
              py-1.5
              text-xs
              font-medium
              transition

              ${
                planScope ===
                "personal"
                  ? "border-lifeos-accent/40 bg-lifeos-accent/10 text-lifeos-accent"
                  : "border-lifeos-border bg-lifeos-app text-lifeos-muted hover:text-lifeos-text-secondary"
              }
            `}
          >
            <FaUser />

            Personal
          </button>

          <button
            type="button"
            onClick={() => {
              setPlanScope(
                "goal"
              );

              setMissingWeekFocus("");
            }}
            className={`
              inline-flex
              items-center
              gap-1.5
              rounded-lg
              border
              px-3
              py-1.5
              text-xs
              font-medium
              transition

              ${
                planScope ===
                "goal"
                  ? "border-lifeos-accent/40 bg-lifeos-accent/10 text-lifeos-accent"
                  : "border-lifeos-border bg-lifeos-app text-lifeos-muted hover:text-lifeos-text-secondary"
              }
            `}
          >
            <FaBullseye />

            Life Goal
          </button>

          {planScope ===
            "goal" && (
            <select
              value={
                selectedGoalId ??
                ""
              }
              onChange={(
                event
              ) => {
                setSelectedGoalId(
                  event.target
                    .value
                    ? Number(
                        event.target
                          .value
                      )
                    : undefined
                );

                setMissingWeekFocus("");
              }}
              className="
                h-8
                min-w-52
                rounded-lg
                border
                border-lifeos-border
                bg-lifeos-app
                px-3
                text-xs
                text-lifeos-text-secondary
                outline-none
                transition
                focus:border-lifeos-accent/50
              "
            >
              <option value="">
                Choose Life Goal
              </option>

              {lifeGoals.map(
                (goal) => (
                  <option
                    key={
                      goal.id
                    }
                    value={
                      goal.id
                    }
                  >
                    {
                      goal.title
                    }
                  </option>
                )
              )}
            </select>
          )}

        </div>

        {/* ==================================
            Smart Placement Preview
        ================================== */}

        {planScope !==
          "standalone" && (
          <div
            className={`
              mt-3
              rounded-lg
              border
              px-3
              py-2.5

              ${
                placementResult.status ===
                "matched"
                  ? "border-lifeos-success/20 bg-lifeos-success/5"
                  : "border-lifeos-warning/20 bg-lifeos-warning/5"
              }
            `}
          >
            <p
              className={`
                text-[11px]
                font-semibold
                uppercase
                tracking-wider

                ${
                  placementResult.status ===
                  "matched"
                    ? "text-lifeos-success"
                    : "text-lifeos-warning"
                }
              `}
            >
              LifeOS Placement
            </p>

            <p className="mt-1 text-xs text-lifeos-text-secondary">
              {
                placementResult.message
              }
            </p>

            {placementResult.status ===
              "matched" && (
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-lifeos-muted">

                {placementResult.goal && (
                  <span>
                    🎯{" "}
                    {
                      placementResult.goal
                        .title
                    }
                  </span>
                )}

                {placementResult.monthlyTarget && (
                  <span>
                    {
                      placementResult
                        .monthlyTarget
                        .title
                    }
                  </span>
                )}

                {placementResult.weekLabel && (
                  <span>
                    {
                      placementResult.weekLabel
                    }
                  </span>
                )}

                {placementResult.weeklyTarget && (
                  <span>
                    {
                      placementResult
                        .weeklyTarget
                        .title
                    }
                  </span>
                )}

              </div>
            )}

            {placementResult.status ===
              "weekly_focus_missing" && (
              <div
                className="
                  mt-3
                  rounded-lg
                  border
                  border-lifeos-warning/15
                  bg-lifeos-app/35
                  p-3
                "
              >
                <p
                  className="
                    text-[11px]
                    font-semibold
                    uppercase
                    tracking-wider
                    text-lifeos-warning
                  "
                >
                  Plan This Week
                </p>

                {placementResult.weekLabel && (
                  <p
                    className="
                      mt-1
                      text-[11px]
                      text-lifeos-muted
                    "
                  >
                    {
                      placementResult.weekLabel
                    }
                  </p>
                )}

                {placementResult.monthlyTarget && (
                  <p
                    className="
                      mt-1
                      text-[11px]
                      text-lifeos-muted
                    "
                  >
                    Monthly outcome:{" "}
                    {
                      placementResult
                        .monthlyTarget
                        .title
                    }
                  </p>
                )}

                <div
                  className="
                    mt-3
                    flex
                    flex-col
                    gap-2
                    sm:flex-row
                  "
                >
                  <input
                    value={
                      missingWeekFocus
                    }
                    onChange={(
                      event
                    ) =>
                      setMissingWeekFocus(
                        event.target
                          .value
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

                        handleCreateMissingWeeklyFocus();
                      }

                      if (
                        event.key ===
                        "Escape"
                      ) {
                        event.preventDefault();

                        setMissingWeekFocus("");
                      }
                    }}
                    placeholder="What should this week accomplish?"
                    className="
                      h-9
                      min-w-0
                      flex-1
                      rounded-lg
                      border
                      border-lifeos-border
                      bg-lifeos-app
                      px-3
                      text-xs
                      text-lifeos-text
                      outline-none
                      transition
                      placeholder:text-lifeos-muted
                      focus:border-lifeos-warning/40
                    "
                  />

                  <button
                    type="button"
                    onClick={
                      handleCreateMissingWeeklyFocus
                    }
                    className="
                      h-9
                      shrink-0
                      rounded-lg
                      bg-lifeos-warning
                      px-3
                      text-xs
                      font-semibold
                      text-lifeos-accent-foreground
                      transition
                      hover:bg-lifeos-warning
                    "
                  >
                    Create Weekly Focus
                  </button>

                </div>

              </div>
            )}

          </div>
        )}

      </div>

      {/* ======================================
          Universal Task Table
      ====================================== */}

      <UniversalTaskTable
        tasks={
          visibleTasks
        }
        getPlanIcon={
          getPlanType
        }
        getWeeklyTargetTitle={
          getWeeklyTargetTitle
        }
        onToggle={
          handleToggleTask
        }
        onDelete={
          handleDeleteTask
        }
        emptyMessage={
          search
            ? "No tasks match your search."
            : activeFilter ===
                "all"
              ? "No tasks yet. Add your first task above."
              : `No ${activeFilter} tasks.`
        }
      />

    </div>
  );
}
