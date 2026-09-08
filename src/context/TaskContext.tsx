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
  useDataServices,
} from "../data/DataServicesContext";

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
  const {
    taskRepository,
  } = useDataServices();

  const [
    tasks,
    setTasks,
  ] = useState<Task[]>(() =>
    taskRepository.load()
  );

  // ==========================================
  // Persistence
  // ==========================================

  useEffect(() => {
    return taskRepository.subscribe(() => {
      setTasks(taskRepository.load());
    });
  }, [
    taskRepository,
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
    taskRepository.save(
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

// eslint-disable-next-line react-refresh/only-export-components
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
