// ==========================================
// LifeOS Monthly Planning Context
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
  MonthlyTarget,
} from "../shared/types";

// ==========================================
// Context Type
// ==========================================

interface MonthlyPlanningContextType {
  monthlyPlans: MonthlyTarget[];

  addMonthlyPlan: (
    title: string,
    month: number,
    year: number,
    goalId?: number
  ) => void;

  /**
   * Applies complete Monthly Planning state
   * produced by the LifeOS execution architecture.
   *
   * Completion, uncompletion, and deletion must
   * flow through PlanningExecutionContext.
   */
  replaceMonthlyPlans: (
    monthlyPlans: MonthlyTarget[]
  ) => void;
}

// ==========================================
// Context
// ==========================================

const MonthlyPlanningContext =
  createContext<
    MonthlyPlanningContextType | null
  >(null);

// ==========================================
// Provider
// ==========================================

export function MonthlyPlanningProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [
    monthlyPlans,
    setMonthlyPlans,
  ] = useState<MonthlyTarget[]>(() => {
    const saved =
      localStorage.getItem(
        STORAGE_KEYS.MONTHLY_TARGETS
      );

    if (!saved) {
      return [];
    }

    try {
      return JSON.parse(
        saved
      ) as MonthlyTarget[];
    } catch {
      return [];
    }
  });

  // ==========================================
  // Persistence
  // ==========================================

  useEffect(() => {
    localStorage.setItem(
      STORAGE_KEYS.MONTHLY_TARGETS,
      JSON.stringify(
        monthlyPlans
      )
    );
  }, [monthlyPlans]);

  // ==========================================
  // Monthly Plan Creation
  // ==========================================

  function addMonthlyPlan(
    title: string,
    month: number,
    year: number,
    goalId?: number
  ) {
    const trimmedTitle =
      title.trim();

    if (!trimmedTitle) {
      return;
    }

    const plan: MonthlyTarget = {
      id: Date.now(),

      title:
        trimmedTitle,

      month,

      year,

      goalId,

      progress:
        0,

      completed:
        false,

      completedAt:
        undefined,

      createdAt:
        new Date().toISOString(),
    };

    setMonthlyPlans(
      (previous) => [
        ...previous,
        plan,
      ]
    );
  }

  // ==========================================
  // Execution State Application
  // ==========================================

  function replaceMonthlyPlans(
    nextMonthlyPlans: MonthlyTarget[]
  ) {
    setMonthlyPlans(
      nextMonthlyPlans
    );
  }

  // ==========================================
  // Provider
  // ==========================================

  return (
    <MonthlyPlanningContext.Provider
      value={{
        monthlyPlans,
        addMonthlyPlan,
        replaceMonthlyPlans,
      }}
    >
      {children}
    </MonthlyPlanningContext.Provider>
  );
}

// ==========================================
// Hook
// ==========================================

export function useMonthlyPlanning() {
  const context =
    useContext(
      MonthlyPlanningContext
    );

  if (!context) {
    throw new Error(
      "useMonthlyPlanning must be used inside MonthlyPlanningProvider"
    );
  }

  return context;
}