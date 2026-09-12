// ==========================================
// LifeOS Habit Context
// Version: 1.0
// ==========================================
//
// Canonical state + persistence boundary for
// Habits 2.0.
//
// Responsibilities:
// - Own HabitDefinition state
// - Own HabitCompletion history
// - Persist canonical habit state
// - Restore persisted habit state
// - Expose full-state replacement
//
// IMPORTANT:
// - No habit business logic
// - No streak calculations
// - No completion execution logic
// - No XP logic
// - No ATLAS logic
// - No Analytics logic
//
// Habit mutations must flow through the
// dedicated habit execution/mutation layer.
// ==========================================

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

import type {
  HabitPersistencePhase,
} from "../data/habits/asyncHabitRepository";

import type {
  ReactNode,
} from "react";

import {
  useDataServices,
} from "../data/DataServicesContext";

import type {
  HabitCompletion,
  HabitDefinition,
  HabitState,
} from "../shared/habits";

// ==========================================
// Context Contract
// ==========================================

interface HabitContextValue {
  habitState: HabitState;

  habits:
    HabitDefinition[];

  completions:
    HabitCompletion[];

  habitPersistence: {
    phase: HabitPersistencePhase;
    error: string | null;
  };

  replaceHabitState: (
    nextState: HabitState
  ) => void;
}

// ==========================================
// Context
// ==========================================

const HabitContext =
  createContext<
    HabitContextValue | null
  >(null);

// ==========================================
// Provider
// ==========================================

export function HabitProvider({
  children,
}: {
  children: ReactNode;
}) {
  const {
    habitRepository,
  } = useDataServices();

  const [habitState, setHabitState] = useState<HabitState>({
    habits: [],
    completions: [],
  });
  const [habitPersistence, setHabitPersistence] = useState<{
    phase: HabitPersistencePhase;
    error: string | null;
  }>({
    phase: "uninitialized",
    error: null,
  });
  const [hydrated, setHydrated] = useState(false);
  const mountedRef = useRef(false);
  const replacementVersionRef = useRef(0);
  const expectedWatchStateRef = useRef<HabitState | null>(null);
  const watchBlockedAfterFailureRef = useRef(false);

  useEffect(() => {
    let active = true;
    let unsubscribe: () => void = () => undefined;
    mountedRef.current = true;

    void habitRepository.initialize((phase) => {
      if (!active) return;
      setHabitPersistence({ phase, error: null });
    }).then((nextState) => {
      if (!active) return;
      setHabitState(nextState);
      setHydrated(true);
      setHabitPersistence({ phase: "hydrated", error: null });

      unsubscribe = habitRepository.subscribe((event) => {
        if (!active) return;
        if (event.type === "error") {
          setHabitPersistence({ phase: "error", error: event.error.message });
          console.error("Habit persistence watch failed", event.error);
          return;
        }
        if (watchBlockedAfterFailureRef.current) return;

        const expected = expectedWatchStateRef.current;
        if (expected) {
          if (JSON.stringify(event.state) !== JSON.stringify(expected)) return;
          expectedWatchStateRef.current = null;
        }
        setHabitState(event.state);
        setHabitPersistence({ phase: "hydrated", error: null });
      });
    }).catch((error: unknown) => {
      if (!active) return;
      const message = error instanceof Error ? error.message : String(error);
      setHabitPersistence({ phase: "error", error: message });
      console.error("Habit persistence initialization failed", error);
    });

    return () => {
      active = false;
      mountedRef.current = false;
      unsubscribe();
    };
  }, [habitRepository]);

  function replaceHabitState(
    nextState: HabitState
  ) {
    if (!hydrated) {
      const error = new Error("Habit mutations require hydrated persistence");
      setHabitPersistence({ phase: "error", error: error.message });
      console.error(error);
      return;
    }

    const version = replacementVersionRef.current + 1;
    replacementVersionRef.current = version;
    expectedWatchStateRef.current = nextState;
    watchBlockedAfterFailureRef.current = false;
    setHabitState(nextState);

    void habitRepository.replace(nextState).then(() => {
      if (!mountedRef.current || version !== replacementVersionRef.current) return;
      setHabitPersistence({ phase: "hydrated", error: null });
    }).catch((error: unknown) => {
      if (!mountedRef.current) return;
      if (version === replacementVersionRef.current) {
        expectedWatchStateRef.current = null;
        watchBlockedAfterFailureRef.current = true;
      }
      const message = error instanceof Error ? error.message : String(error);
      setHabitPersistence({ phase: "error", error: message });
      console.error("Habit persistence replacement failed", error);
    });
  }

  if (!hydrated) {
    return (
      <div
        className="flex min-h-dvh items-center justify-center bg-slate-950 px-6 text-center text-sm text-slate-400"
        role={habitPersistence.phase === "error" ? "alert" : "status"}
      >
        {habitPersistence.phase === "error"
          ? `Habits could not be loaded. ${habitPersistence.error ?? "Reload LifeOS to try again."}`
          : "Loading your habits…"}
      </div>
    );
  }

  return (
    <HabitContext.Provider
      value={{
        habitState,

        habits:
          habitState.habits,

        completions:
          habitState.completions,

        habitPersistence,

        replaceHabitState,
      }}
    >
      {children}
    </HabitContext.Provider>
  );
}

// ==========================================
// Hook
// ==========================================

// eslint-disable-next-line react-refresh/only-export-components
export function useHabits() {
  const context =
    useContext(
      HabitContext
    );

  if (!context) {
    throw new Error(
      "useHabits must be used inside HabitProvider"
    );
  }

  return context;
}
