import {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";

import type { ReactNode } from "react";
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

  deleteTask: (
    id: number
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
    if (!title.trim()) {
      alert("Please enter a task.");
      return;
    }

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

  function deleteTask(
    id: number
  ) {
    setTasks((prev) =>
      prev.filter(
        (task) =>
          task.id !== id
      )
    );
  }

  return (
    <TaskContext.Provider
      value={{
        tasks,
        addTask,
        toggleTask,
        deleteTask,
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