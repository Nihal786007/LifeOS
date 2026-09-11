import {
  createContext,
  useContext,
  useEffect,
  useRef,
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

import type {
  TaskPersistencePhase,
} from "../data/tasks/asyncTaskRepository";

// ==========================================
// Types
// ==========================================

interface TaskContextType {
  tasks: Task[];

  taskPersistence: {
    phase: TaskPersistencePhase;
    error: string | null;
  };

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
  ] = useState<Task[]>([]);

  const [
    taskPersistence,
    setTaskPersistence,
  ] = useState<{
    phase: TaskPersistencePhase;
    error: string | null;
  }>({
    phase: "uninitialized",
    error: null,
  });

  const [
    hydrated,
    setHydrated,
  ] = useState(false);

  const tasksRef = useRef<Task[]>([]);
  const mountedRef = useRef(false);
  const replacementVersionRef = useRef(0);
  const expectedWatchTasksRef = useRef<Task[] | null>(null);
  const watchBlockedAfterFailureRef = useRef(false);

  // ==========================================
  // Persistence
  // ==========================================

  useEffect(() => {
    let active = true;
    let unsubscribe: () => void = () => undefined;
    mountedRef.current = true;

    void taskRepository.initialize((phase) => {
      if (!active) return;
      setTaskPersistence({ phase, error: null });
    }).then((nextTasks) => {
      if (!active) return;

      tasksRef.current = nextTasks;
      setTasks(nextTasks);
      setHydrated(true);
      setTaskPersistence({ phase: "hydrated", error: null });

      unsubscribe = taskRepository.subscribe((event) => {
        if (!active) return;

        if (event.type === "error") {
          setTaskPersistence({ phase: "error", error: event.error.message });
          console.error("Task persistence watch failed", event.error);
          return;
        }

        if (watchBlockedAfterFailureRef.current) return;

        const expected = expectedWatchTasksRef.current;
        if (expected) {
          if (JSON.stringify(event.tasks) !== JSON.stringify(expected)) return;
          expectedWatchTasksRef.current = null;
        }

        tasksRef.current = event.tasks;
        setTasks(event.tasks);
        setTaskPersistence({ phase: "hydrated", error: null });
      });
    }).catch((error: unknown) => {
      if (!active) return;
      const message = error instanceof Error ? error.message : String(error);
      setTaskPersistence({ phase: "error", error: message });
      console.error("Task persistence initialization failed", error);
    });

    return () => {
      active = false;
      mountedRef.current = false;
      unsubscribe();
    };
  }, [
    taskRepository,
  ]);

  // ==========================================
  // Orchestration Synchronization
  // ==========================================

  function replaceTasks(
    nextTasks: Task[]
  ) {
    if (!hydrated) {
      const error = new Error("Task mutations require hydrated persistence");
      setTaskPersistence({ phase: "error", error: error.message });
      console.error(error);
      return;
    }

    const version = replacementVersionRef.current + 1;
    replacementVersionRef.current = version;
    expectedWatchTasksRef.current = nextTasks;
    watchBlockedAfterFailureRef.current = false;
    tasksRef.current = nextTasks;
    setTasks(nextTasks);

    void taskRepository.replace(nextTasks).then(() => {
      if (!mountedRef.current || version !== replacementVersionRef.current) {
        return;
      }
      setTaskPersistence({ phase: "hydrated", error: null });
    }).catch((error: unknown) => {
      if (!mountedRef.current) return;
      if (version === replacementVersionRef.current) {
        expectedWatchTasksRef.current = null;
        watchBlockedAfterFailureRef.current = true;
      }
      const message = error instanceof Error ? error.message : String(error);
      setTaskPersistence({ phase: "error", error: message });
      console.error("Task persistence replacement failed", error);
    });
  }

  // ==========================================
  // Provider
  // ==========================================

  if (!hydrated) {
    return (
      <div
        className="flex min-h-dvh items-center justify-center bg-slate-950 px-6 text-center text-sm text-slate-400"
        role={taskPersistence.phase === "error" ? "alert" : "status"}
      >
        {taskPersistence.phase === "error"
          ? `Tasks could not be loaded. ${taskPersistence.error ?? "Reload LifeOS to try again."}`
          : "Loading your tasks…"}
      </div>
    );
  }

  return (
    <TaskContext.Provider
      value={{
        tasks,
        taskPersistence,
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
