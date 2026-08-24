import {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";

import type { ReactNode } from "react";

import { ExecutionCoordinator } from "../engines/ExecutionCoordinator";
import { STORAGE_KEYS } from "../constants/storage";
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

  /**
   * Applies the complete task state returned by
   * the LifeOS execution architecture.
   *
   * This is intended for orchestration-level
   * synchronization only.
   */
  replaceTasks: (
    tasks: Task[]
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
          STORAGE_KEYS.TASKS
        );

      if (!saved) {
        return [];
      }

      try {
        return JSON.parse(
          saved
        ) as Task[];
      } catch {
        return [];
      }
    });

  useEffect(() => {
    localStorage.setItem(
      STORAGE_KEYS.TASKS,
      JSON.stringify(tasks)
    );
  }, [tasks]);

  function addTask(
    title: string,
    dueDate?: string,
    priority: "low" | "medium" | "high" = "medium",
    weeklyTargetId?: number
  ) {
    const trimmedTitle =
      title.trim();

    if (!trimmedTitle) {
      return;
    }

    setTasks((previous) => [
      ...previous,
      {
        id: Date.now(),

        title: trimmedTitle,
        description: undefined,

        dueDate,
        priority,
        weeklyTargetId,

        completed: false,
        completedAt: undefined,

        createdAt:
          new Date().toISOString(),
      },
    ]);
  }

  function toggleTask(
    id: number
  ) {
    setTasks((previous) =>
      previous.map((task) =>
        task.id === id
          ? {
              ...task,

              completed:
                !task.completed,

              completedAt:
                !task.completed
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
    setTasks((previous) => {
      const result =
        ExecutionCoordinator.completeTask(
          {
            lifeGoals: [],
            monthlyTargets: [],
            weeklyTargets: [],
            tasks: previous,
          },
          id
        );

      return result.tasks;
    });
  }

  function uncompleteTask(
    id: number
  ) {
    setTasks((previous) => {
      const result =
        ExecutionCoordinator.uncompleteTask(
          {
            lifeGoals: [],
            monthlyTargets: [],
            weeklyTargets: [],
            tasks: previous,
          },
          id
        );

      return result.tasks;
    });
  }

  function completeTasksByWeeklyTarget(
    weeklyTargetId: number
  ) {
    setTasks((previous) =>
      previous.map((task) =>
        task.weeklyTargetId ===
        weeklyTargetId
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
    setTasks((previous) =>
      previous.map((task) =>
        task.weeklyTargetId ===
        weeklyTargetId
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
    setTasks((previous) => {
      const result =
        ExecutionCoordinator.deleteTask(
          {
            lifeGoals: [],
            monthlyTargets: [],
            weeklyTargets: [],
            tasks: previous,
          },
          id
        );

      return result.tasks;
    });
  }

  function deleteTasksByWeeklyTarget(
    weeklyTargetId: number
  ) {
    setTasks((previous) =>
      previous.filter(
        (task) =>
          task.weeklyTargetId !==
          weeklyTargetId
      )
    );
  }

  function replaceTasks(
    nextTasks: Task[]
  ) {
    setTasks(
      nextTasks
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

        replaceTasks,
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