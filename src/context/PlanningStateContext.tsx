import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

import type { ReactNode } from "react";

import {
  useDataServices,
} from "../data/DataServicesContext";
import type {
  PlanningPersistencePhase,
  PlanningRepositoryState,
} from "../data/planning/asyncPlanningRepository";

interface PlanningStateContextValue {
  planningState: PlanningRepositoryState;
  planningPersistence: {
    phase: PlanningPersistencePhase;
    error: string | null;
  };
  replacePlanningState(state: PlanningRepositoryState): void;
}

const EMPTY_PLANNING_STATE: PlanningRepositoryState = {
  lifeGoals: [],
  monthlyOutcomes: [],
  weeklyFocuses: [],
};

const PlanningStateContext =
  createContext<PlanningStateContextValue | null>(null);

export function PlanningStateProvider({
  children,
}: {
  children: ReactNode;
}) {
  const { planningRepository } = useDataServices();
  const [planningState, setPlanningState] =
    useState<PlanningRepositoryState>(EMPTY_PLANNING_STATE);
  const [planningPersistence, setPlanningPersistence] = useState<{
    phase: PlanningPersistencePhase;
    error: string | null;
  }>({
    phase: "uninitialized",
    error: null,
  });
  const [hydrated, setHydrated] = useState(false);
  const mountedRef = useRef(false);
  const replacementVersionRef = useRef(0);
  const expectedWatchStateRef = useRef<PlanningRepositoryState | null>(null);
  const watchBlockedAfterFailureRef = useRef(false);

  useEffect(() => {
    let active = true;
    let unsubscribe: () => void = () => undefined;
    mountedRef.current = true;

    void planningRepository.initialize((phase) => {
      if (!active) return;
      setPlanningPersistence({ phase, error: null });
    }).then((nextState) => {
      if (!active) return;
      setPlanningState(nextState);
      setHydrated(true);
      setPlanningPersistence({ phase: "hydrated", error: null });

      unsubscribe = planningRepository.subscribe((event) => {
        if (!active) return;
        if (event.type === "error") {
          setPlanningPersistence({
            phase: "error",
            error: event.error.message,
          });
          console.error("Planning persistence watch failed", event.error);
          return;
        }
        if (watchBlockedAfterFailureRef.current) return;

        const expected = expectedWatchStateRef.current;
        if (expected) {
          if (JSON.stringify(event.state) !== JSON.stringify(expected)) return;
          expectedWatchStateRef.current = null;
        }
        setPlanningState(event.state);
        setPlanningPersistence({ phase: "hydrated", error: null });
      });
    }).catch((error: unknown) => {
      if (!active) return;
      const message = error instanceof Error ? error.message : String(error);
      setPlanningPersistence({ phase: "error", error: message });
      console.error("Planning persistence initialization failed", error);
    });

    return () => {
      active = false;
      mountedRef.current = false;
      unsubscribe();
    };
  }, [planningRepository]);

  function replacePlanningState(nextState: PlanningRepositoryState) {
    if (!hydrated) {
      const error = new Error("Planning mutations require hydrated persistence");
      setPlanningPersistence({ phase: "error", error: error.message });
      console.error(error);
      return;
    }

    const version = replacementVersionRef.current + 1;
    replacementVersionRef.current = version;
    expectedWatchStateRef.current = nextState;
    watchBlockedAfterFailureRef.current = false;
    setPlanningState(nextState);

    void planningRepository.replace(nextState).then(() => {
      if (!mountedRef.current || version !== replacementVersionRef.current) {
        return;
      }
      setPlanningPersistence({ phase: "hydrated", error: null });
    }).catch((error: unknown) => {
      if (!mountedRef.current) return;
      if (version === replacementVersionRef.current) {
        expectedWatchStateRef.current = null;
        watchBlockedAfterFailureRef.current = true;
      }
      const message = error instanceof Error ? error.message : String(error);
      setPlanningPersistence({ phase: "error", error: message });
      console.error("Planning persistence replacement failed", error);
    });
  }

  if (!hydrated) {
    return (
      <div
        className="flex min-h-dvh items-center justify-center bg-slate-950 px-6 text-center text-sm text-slate-400"
        role={planningPersistence.phase === "error" ? "alert" : "status"}
      >
        {planningPersistence.phase === "error"
          ? `Planning could not be loaded. ${planningPersistence.error ?? "Reload LifeOS to try again."}`
          : "Loading your planning system…"}
      </div>
    );
  }

  return (
    <PlanningStateContext.Provider
      value={{
        planningState,
        planningPersistence,
        replacePlanningState,
      }}
    >
      {children}
    </PlanningStateContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function usePlanningState() {
  const context = useContext(PlanningStateContext);
  if (!context) {
    throw new Error("usePlanningState must be used inside PlanningStateProvider");
  }
  return context;
}
