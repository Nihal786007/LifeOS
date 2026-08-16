import {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";

import type { ReactNode } from "react";

import { ExecutionService } from "../services/ExecutionService";

import type { Task } from "../shared/types";

interface TaskContextType {
  tasks: Task[];

  addTask: (
    title: string,
    dueDate?: string,
    priority?: "low" | "medium" | "high",
    weeklyTargetId?: number
  ) => void;

  toggleTask: (
    id: number
  ) => void;

  completeTask: (
    id: number
  ) => void;

  uncompleteTask: (
    id: number
  ) => void;

  completeTasksByWeeklyTarget: (
    weeklyTargetId: number
  ) => void;

  uncompleteTasksByWeeklyTarget: (
    weeklyTargetId: number
  ) => void;

  deleteTask: (
    id: number
  ) => void;

  deleteTasksByWeeklyTarget: (
    weeklyTargetId: number
  ) => void;
}

const TaskContext =
  createContext<TaskContextType | null>(
    null
  );

export function TaskProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [tasks, setTasks] =
    useState<Task[]>(() => {
      const saved =
        localStorage.getItem(
          "lifeos-tasks"
        );

      if (!saved) return [];

      try {
        return JSON.parse(saved);
      } catch {
        return [];
      }
    });

  useEffect(() => {
    localStorage.setItem(
      "lifeos-tasks",
      JSON.stringify(tasks)
    );
  }, [tasks]);

  function addTask(
    title: string,
    dueDate?: string,
    priority: "low" | "medium" | "high" = "medium",
    weeklyTargetId?: number
  ) {
    if (!title.trim()) return;

    setTasks((prev) => [
      ...prev,
      {
        id: Date.now(),
        title: title.trim(),
        description: undefined,
        dueDate,
        priority,
        weeklyTargetId,
        completed: false,
        completedAt: undefined,
        xp: 10,
        createdAt:
          new Date().toISOString(),
      },
    ]);
  }

  function toggleTask(
    id: number
  ) {
    setTasks((prev) =>
      prev.map((task) =>
        task.id === id
          ? {
              ...task,
              completed: !task.completed,
              completedAt: !task.completed
                ? new Date().toISOString()
                : undefined,
            }
          : task
      )
    );
  }
    function completeTask(
    id: number
  ) {
    setTasks((prev) => {
      const result =
        ExecutionService.completeTask(
          {
            lifeGoals: [],
            monthlyTargets: [],
            weeklyTargets: [],
            tasks: prev,
          },
          id
        );

      return result.tasks;
    });
  }

  function uncompleteTask(
    id: number
  ) {
    setTasks((prev) => {
      const result =
        ExecutionService.uncompleteTask(
          {
            lifeGoals: [],
            monthlyTargets: [],
            weeklyTargets: [],
            tasks: prev,
          },
          id
        );

      return result.tasks;
    });
  }

  function completeTasksByWeeklyTarget(
    weeklyTargetId: number
  ) {
    setTasks((prev) =>
      prev.map((task) =>
        task.weeklyTargetId === weeklyTargetId
          ? {
              ...task,
              completed: true,
              completedAt:
                new Date().toISOString(),
            }
          : task
      )
    );
  }

  function uncompleteTasksByWeeklyTarget(
    weeklyTargetId: number
  ) {
    setTasks((prev) =>
      prev.map((task) =>
        task.weeklyTargetId === weeklyTargetId
          ? {
              ...task,
              completed: false,
              completedAt: undefined,
            }
          : task
      )
    );
  }

  function deleteTask(
    id: number
  ) {
    setTasks((prev) => {
      const result =
        ExecutionService.deleteTask(
          {
            lifeGoals: [],
            monthlyTargets: [],
            weeklyTargets: [],
            tasks: prev,
          },
          id
        );

      return result.tasks;
    });
  }

  function deleteTasksByWeeklyTarget(
    weeklyTargetId: number
  ) {
    setTasks((prev) =>
      prev.filter(
        (task) =>
          task.weeklyTargetId !==
          weeklyTargetId
      )
    );
  }

  return (
    <TaskContext.Provider
      value={{
        tasks,
        addTask,
        toggleTask,
        completeTask,
        uncompleteTask,
        completeTasksByWeeklyTarget,
        uncompleteTasksByWeeklyTarget,
        deleteTask,
        deleteTasksByWeeklyTarget,
      }}
    >
      {children}
    </TaskContext.Provider>
  );
  }

export function useTasks() {
  const context =
    useContext(TaskContext);

  if (!context) {
    throw new Error(
      "useTasks must be used inside TaskProvider"
    );
  }

  return context;
}