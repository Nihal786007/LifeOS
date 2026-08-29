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
  Task,
} from "../shared/types";

// ==========================================
// Types
// ==========================================

interface TaskContextType {
  tasks: Task[];

  /**
   * Applies task state produced by the
   * LifeOS execution/planning architecture.
   *
   * Task creation, updates, completion,
   * deletion, and other mutations must go
   * through PlanningExecutionContext.
   */
  replaceTasks: (
    tasks: Task[]
  ) => void;
}

// ==========================================
// Context
// ==========================================

const TaskContext =
  createContext<
    TaskContextType | null
  >(null);

// ==========================================
// Provider
// ==========================================

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
      JSON.stringify(
        tasks
      )
    );
  }, [
    tasks,
  ]);

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

  // ==========================================
  // Provider
  // ==========================================

  return (
    <TaskContext.Provider
      value={{
        tasks,
        replaceTasks,
      }}
    >
      {children}
    </TaskContext.Provider>
  );
}

// ==========================================
// Hook
// ==========================================

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