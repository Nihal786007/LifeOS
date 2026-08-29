// ==========================================
// LifeOS Monthly Planning Context
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
  MonthlyTarget,
} from "../shared/types";

// ==========================================
// Context Type
// ==========================================

interface MonthlyPlanningContextType {
  monthlyPlans: MonthlyTarget[];

  /**
   * Applies a complete Monthly Planning state
   * produced by the LifeOS planning/execution architecture.
   *
   * Monthly Outcome creation, editing, completion,
   * uncompletion, and deletion must flow through
   * PlanningExecutionContext.
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
  ] = useState<
    MonthlyTarget[]
  >(() => {
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
  }, [
    monthlyPlans,
  ]);

  // ==========================================
  // State Application
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