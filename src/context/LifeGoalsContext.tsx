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
  STORAGE_KEYS,
} from "../constants/storage";

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
  const [
    lifeGoals,
    setLifeGoals,
  ] = useState<LifeGoal[]>(() => {
    const saved =
      localStorage.getItem(
        STORAGE_KEYS.LIFE_GOALS
      );

    if (!saved) {
      return [];
    }

    try {
      return JSON.parse(
        saved
      ) as LifeGoal[];
    } catch {
      return [];
    }
  });

  // ==========================================
  // Persistence
  // ==========================================

  useEffect(() => {
    localStorage.setItem(
      STORAGE_KEYS.LIFE_GOALS,
      JSON.stringify(
        lifeGoals
      )
    );
  }, [lifeGoals]);

  // ==========================================
  // Planning / Execution State Application
  // ==========================================

  function replaceLifeGoals(
    nextLifeGoals: LifeGoal[]
  ) {
    setLifeGoals(
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