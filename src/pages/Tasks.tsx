import { useState } from "react";

import {
  FaPlus,
  FaSearch,
} from "react-icons/fa";

import { sortTasks } from "../utils/taskSorter";

import { useTasks } from "../context/TaskContext";
import { usePlanningExecution } from "../context/PlanningExecutionContext";

import TaskSection from "../components/tasks/TaskSection";
import EmptyState from "../components/tasks/EmptyState";

import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import PageHero from "../components/ui/PageHero";

type Priority =
  | "low"
  | "medium"
  | "high";

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
    new Date()
      .toISOString()
      .split("T")[0]
  );

  // ==========================================
  // Universal Task State
  // ==========================================

  const {
    tasks,
    addTask,
  } = useTasks();

  // ==========================================
  // Execution Actions
  // ==========================================

  const {
    completeTask,
    uncompleteTask,
    deleteTask,
  } =
    usePlanningExecution();

  // ==========================================
  // Derived Statistics
  // ==========================================

  const completedTasks =
    tasks.filter(
      (task) =>
        task.completed
    ).length;

  // ==========================================
  // Search
  // ==========================================

  const filteredTasks =
    tasks.filter((item) =>
      (item.title ?? "")
        .toLowerCase()
        .includes(
          search.toLowerCase()
        )
    );

  // ==========================================
  // Date
  // ==========================================

  const today =
    new Date()
      .toISOString()
      .split("T")[0];

  // ==========================================
  // Task Sections
  // ==========================================

  const overdueTasks =
    sortTasks(
      filteredTasks.filter(
        (task) =>
          !task.completed &&
          Boolean(
            task.dueDate
          ) &&
          task.dueDate! <
            today
      )
    );

  const todayTasks =
    sortTasks(
      filteredTasks.filter(
        (task) =>
          !task.completed &&
          task.dueDate ===
            today
      )
    );

  const upcomingTasks =
    sortTasks(
      filteredTasks.filter(
        (task) =>
          !task.completed &&
          Boolean(
            task.dueDate
          ) &&
          task.dueDate! >
            today
      )
    );

  const completedTaskList =
    sortTasks(
      filteredTasks.filter(
        (task) =>
          task.completed
      )
    );

  // ==========================================
  // Task Creation
  // ==========================================

  function handleAddTask() {
    const trimmedTitle =
      taskTitle.trim();

    if (!trimmedTitle) {
      return;
    }

    addTask(
      trimmedTitle,
      dueDate,
      priority
    );

    setTaskTitle("");
  }

  // ==========================================
  // Task Execution
  // ==========================================

  function handleToggleTask(
    id: number
  ) {
    const selectedTask =
      tasks.find(
        (task) =>
          task.id === id
      );

    if (!selectedTask) {
      return;
    }

    if (
      selectedTask.completed
    ) {
      uncompleteTask(id);
      return;
    }

    completeTask(id);
  }

  function handleDeleteTask(
    id: number
  ) {
    deleteTask(id);
  }

  return (
    <div className="space-y-10">

      <PageHero
        badge="Mission Planner"
        title="Tasks"
        description="Organize your missions, stay focused, and execute every objective with precision."
      >
        <Card className="border-cyan-500/20 bg-cyan-500/5">

          <p className="text-sm uppercase tracking-widest text-cyan-300">
            Today's Progress
          </p>

          <h2 className="mt-3 text-5xl font-black">
            {completedTasks}/
            {tasks.length}
          </h2>

          <p className="mt-3 text-slate-400">
            Missions Completed
          </p>

        </Card>
      </PageHero>

      {/* Search */}

      <div className="relative">

        <FaSearch className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500" />

        <Input
          value={search}
          onChange={(event) =>
            setSearch(
              event.target.value
            )
          }
          placeholder="Search missions..."
          className="py-5 pl-14 pr-6 text-lg"
        />

      </div>

      {/* Create Task */}

      <Card className="space-y-6">

        <h2 className="text-xl font-bold text-white">
          Create New Mission
        </h2>

        <Input
          value={taskTitle}
          onChange={(event) =>
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
              handleAddTask();
            }
          }}
          placeholder="Mission title..."
          className="px-6 py-5 text-lg"
        />

        <div className="grid gap-4 md:grid-cols-2">

          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-300">
              Priority
            </label>

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
              className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-white"
            >
              <option value="low">
                🟢 Low
              </option>

              <option value="medium">
                🟡 Medium
              </option>

              <option value="high">
                🔴 High
              </option>
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-300">
              Due Date
            </label>

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
            />
          </div>

        </div>

        <Button
          onClick={
            handleAddTask
          }
          className="w-full py-4"
        >
          <FaPlus />
          Create Mission
        </Button>

      </Card>

      {/* Task Sections */}

      <div className="space-y-10">

        {filteredTasks.length ===
        0 ? (
          <EmptyState />
        ) : (
          <>
            <TaskSection
              title="🔴 Overdue"
              tasks={
                overdueTasks
              }
              toggleTask={
                handleToggleTask
              }
              deleteTask={
                handleDeleteTask
              }
            />

            <TaskSection
              title="🟢 Today"
              tasks={
                todayTasks
              }
              toggleTask={
                handleToggleTask
              }
              deleteTask={
                handleDeleteTask
              }
            />

            <TaskSection
              title="🟡 Upcoming"
              tasks={
                upcomingTasks
              }
              toggleTask={
                handleToggleTask
              }
              deleteTask={
                handleDeleteTask
              }
            />

            <TaskSection
              title="⚪ Completed"
              tasks={
                completedTaskList
              }
              toggleTask={
                handleToggleTask
              }
              deleteTask={
                handleDeleteTask
              }
            />
          </>
        )}

      </div>

    </div>
  );
}