// ==========================================
// LifeOS Life Goals Context
// Version: 2.1
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

  addGoal: (
    title: string,
    description?: string,
    targetDate?: string
  ) => void;

  updateGoal: (
    goal: LifeGoal
  ) => void;

  /**
   * Applies a complete Life Goal state produced by
   * the LifeOS execution architecture.
   *
   * Completion, uncompletion, and deletion must
   * flow through PlanningExecutionContext.
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
  // Goal Creation
  // ==========================================

  function addGoal(
    title: string,
    description = "",
    targetDate?: string
  ) {
    const trimmedTitle =
      title.trim();

    if (!trimmedTitle) {
      return;
    }

    const now =
      new Date().toISOString();

    const goal: LifeGoal = {
      id: Date.now(),

      title:
        trimmedTitle,

      description,

      progress:
        0,

      completed:
        false,

      completedAt:
        undefined,

      startDate:
        now,

      targetDate,

      createdAt:
        now,
    };

    setLifeGoals(
      (previous) => [
        ...previous,
        goal,
      ]
    );
  }

  // ==========================================
  // Goal Update
  // ==========================================

  function updateGoal(
    goal: LifeGoal
  ) {
    setLifeGoals(
      (previous) =>
        previous.map(
          (item) =>
            item.id ===
            goal.id
              ? goal
              : item
        )
    );
  }

  // ==========================================
  // Execution State Application
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
        addGoal,
        updateGoal,
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