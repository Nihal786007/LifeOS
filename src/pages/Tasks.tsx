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
    addCalendarWeeklyTarget,
  } =
    useWeeklyPlanning();

  // ==========================================
  // Universal Execution
  // ==========================================

  const {
    createTask,
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

    addCalendarWeeklyTarget(
      trimmedFocus,
      monthlyTarget.id,
      weekStartDate,
      weekEndDate
    );

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

    if (
      weeklyTarget.weekStartDate &&
      weeklyTarget.weekEndDate
    ) {
      return `${weeklyTarget.weekStartDate} → ${weeklyTarget.weekEndDate} · ${weeklyTarget.title}`;
    }

    return `W${weeklyTarget.week} · ${weeklyTarget.title}`;
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
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-400">
            Universal Execution
          </p>

          <h1 className="mt-1 text-3xl font-bold text-white">
            Tasks
          </h1>

          <p className="mt-1 text-sm text-slate-400">
            One task. One state. Every view.
          </p>
        </div>

        <div className="flex items-center gap-5 text-sm">

          <div>
            <span className="font-semibold text-white">
              {tasks.length}
            </span>

            <span className="ml-1 text-slate-500">
              total
            </span>
          </div>

          <div>
            <span className="font-semibold text-green-400">
              {
                completedTasks.length
              }
            </span>

            <span className="ml-1 text-slate-500">
              done
            </span>
          </div>

          <div>
            <span className="font-semibold text-cyan-400">
              {
                todayTasks.length
              }
            </span>

            <span className="ml-1 text-slate-500">
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
                      ? "border-cyan-500/40 bg-cyan-500/10 text-cyan-300"
                      : "border-slate-800 bg-slate-900 text-slate-400 hover:border-slate-700 hover:text-slate-200"
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
                        ? "text-cyan-400"
                        : "text-slate-600"
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

      <div className="rounded-xl border border-slate-800 bg-slate-900 p-3">

        <div className="grid gap-3 xl:grid-cols-[minmax(220px,1fr)_minmax(260px,1.4fr)_130px_150px_auto]">

          {/* Search */}

          <div className="relative">

            <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-600" />

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

          {/* Task Input */}

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
            className="h-10 rounded-xl border border-slate-700 bg-slate-950 px-3 text-sm text-slate-200 outline-none transition focus:border-cyan-500"
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

          {/* Due Date */}

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
                  ? "border-cyan-500/40 bg-cyan-500/10 text-cyan-300"
                  : "border-slate-800 bg-slate-950 text-slate-500 hover:text-slate-300"
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
                  ? "border-cyan-500/40 bg-cyan-500/10 text-cyan-300"
                  : "border-slate-800 bg-slate-950 text-slate-500 hover:text-slate-300"
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
                  ? "border-cyan-500/40 bg-cyan-500/10 text-cyan-300"
                  : "border-slate-800 bg-slate-950 text-slate-500 hover:text-slate-300"
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
                border-slate-800
                bg-slate-950
                px-3
                text-xs
                text-slate-300
                outline-none
                transition
                focus:border-cyan-500/50
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
                  placementResult.status ===
                  "matched"
                    ? "text-emerald-400"
                    : "text-amber-400"
                }
              `}
            >
              LifeOS Placement
            </p>

            <p className="mt-1 text-xs text-slate-300">
              {
                placementResult.message
              }
            </p>

            {/* ==================================
                Matched Placement Details
            ================================== */}

            {placementResult.status ===
              "matched" && (
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-slate-500">

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

            {/* ==================================
                Missing Weekly Focus
            ================================== */}

            {placementResult.status ===
              "weekly_focus_missing" && (
              <div
                className="
                  mt-3
                  rounded-lg
                  border
                  border-amber-500/15
                  bg-slate-950/35
                  p-3
                "
              >
                <p
                  className="
                    text-[10px]
                    font-semibold
                    uppercase
                    tracking-wider
                    text-amber-400
                  "
                >
                  Plan This Week
                </p>

                {placementResult.weekLabel && (
                  <p
                    className="
                      mt-1
                      text-[10px]
                      text-slate-500
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
                      text-[10px]
                      text-slate-600
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
                      border-slate-800
                      bg-slate-950
                      px-3
                      text-xs
                      text-slate-200
                      outline-none
                      transition
                      placeholder:text-slate-700
                      focus:border-amber-500/40
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
                      bg-amber-400
                      px-3
                      text-xs
                      font-semibold
                      text-slate-950
                      transition
                      hover:bg-amber-300
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