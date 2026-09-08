// ==========================================
// LifeOS Life Goals Context
// Version: 3.0
// ==========================================

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
  LifeGoal,
} from "../shared/types";

// ==========================================
// Context Type
// ==========================================

interface LifeGoalsContextType {
  lifeGoals: LifeGoal[];

  /**
   * Applies a complete Life Goal state produced by
   * the LifeOS planning/execution architecture.
   *
   * Goal creation, editing, completion, uncompletion,
   * and deletion must flow through PlanningExecutionContext.
   */
  replaceLifeGoals: (
    lifeGoals: LifeGoal[]
  ) => void;
}

// ==========================================
// Context
// ==========================================

const LifeGoalsContext =
  createContext<
    LifeGoalsContextType | null
  >(null);

// ==========================================
// Provider
// ==========================================

export function LifeGoalsProvider({
  children,
}: {
  children: ReactNode;
}) {
  const {
    lifeGoalRepository,
  } = useDataServices();

  const [
    lifeGoals,
    setLifeGoals,
  ] = useState<LifeGoal[]>(() =>
    lifeGoalRepository.load()
  );

  // ==========================================
  // Persistence
  // ==========================================

  useEffect(() => {
    return lifeGoalRepository.subscribe(() => {
      setLifeGoals(lifeGoalRepository.load());
    });
  }, [lifeGoalRepository]);

  // ==========================================
  // Planning / Execution State Application
  // ==========================================

  function replaceLifeGoals(
    nextLifeGoals: LifeGoal[]
  ) {
    setLifeGoals(
      nextLifeGoals
    );
    lifeGoalRepository.save(
      nextLifeGoals
    );
  }

  // ==========================================
  // Provider
  // ==========================================

  return (
    <LifeGoalsContext.Provider
      value={{
        lifeGoals,
        replaceLifeGoals,
      }}
    >
      {children}
    </LifeGoalsContext.Provider>
  );
}

// ==========================================
// Hook
// ==========================================

// eslint-disable-next-line react-refresh/only-export-components
export function useLifeGoals() {
  const context =
    useContext(
      LifeGoalsContext
    );

  if (!context) {
    throw new Error(
      "useLifeGoals must be used inside LifeGoalsProvider"
    );
  }

  return context;
}
