import {
  useMemo,
  useState,
} from "react";

import {
  FaPlus,
  FaSearch,
} from "react-icons/fa";

import {
  sortTasks,
} from "../utils/taskSorter";

import {
  TaskRelationshipEngine,
} from "../engines/TaskRelationshipEngine";

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
    addTask,
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
  // Universal Execution
  // ==========================================

  const {
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
  // Universal Task Creation
  // ==========================================

  function handleAddTask() {
    const trimmedTitle =
      taskTitle.trim();

    if (!trimmedTitle) {
      return;
    }

    addTask({
      title:
        trimmedTitle,

      dueDate:
        dueDate ||
        undefined,

      priority,
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

    return `W${relationship.weeklyTarget.week} · ${relationship.weeklyTarget.title}`;
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
          Search + Quick Add
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
            className="h-10 whitespace-nowrap px-4 py-2"
          >
            <FaPlus />

            Add
          </Button>

        </div>

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