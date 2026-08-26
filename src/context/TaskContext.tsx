import {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";

import type {
  ReactNode,
} from "react";

import {
  STORAGE_KEYS,
} from "../constants/storage";

import type {
  CreateTaskInput,
  Task,
} from "../shared/types";

interface TaskContextType {
  tasks: Task[];

  addTask: (
    input: CreateTaskInput
  ) => void;

  /**
   * Applies task state produced by the
   * LifeOS execution/planning architecture.
   *
   * Execution mutations themselves must go
   * through PlanningExecutionContext.
   */
  replaceTasks: (
    tasks: Task[]
  ) => void;
}

const TaskContext =
  createContext<
    TaskContextType | null
  >(null);

export function TaskProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [
    tasks,
    setTasks,
  ] = useState<Task[]>(() => {
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

  // ==========================================
  // Persistence
  // ==========================================

  useEffect(() => {
    localStorage.setItem(
      STORAGE_KEYS.TASKS,
      JSON.stringify(tasks)
    );
  }, [tasks]);

  // ==========================================
  // Universal Task Creation
  // ==========================================

  function addTask(
    input: CreateTaskInput
  ) {
    const trimmedTitle =
      input.title.trim();

    if (!trimmedTitle) {
      return;
    }

    const task: Task = {
      id: Date.now(),

      title:
        trimmedTitle,

      description:
        input.description?.trim() ||
        undefined,

      dueDate:
        input.dueDate,

      priority:
        input.priority ??
        "medium",

      weeklyTargetId:
        input.weeklyTargetId,

      completed:
        false,

      completedAt:
        undefined,

      createdAt:
        new Date().toISOString(),
    };

    setTasks(
      (previous) => [
        ...previous,
        task,
      ]
    );
  }

  // ==========================================
  // Orchestration Synchronization
  // ==========================================

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
        replaceTasks,
      }}
    >
      {children}
    </TaskContext.Provider>
  );
}

export function useTasks() {
  const context =
    useContext(
      TaskContext
    );

  if (!context) {
    throw new Error(
      "useTasks must be used inside TaskProvider"
    );
  }

  return context;
}