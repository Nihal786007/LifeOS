// ==========================================
// LifeOS Monthly Planning Context
// Version: 3.0
// ==========================================

import {
  createContext,
  useContext,
} from "react";

import type {
  ReactNode,
} from "react";

import {
  usePlanningState,
} from "./PlanningStateContext";

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
  const {
    planningState,
    replacePlanningState,
  } = usePlanningState();

  const monthlyPlans = planningState.monthlyOutcomes;

  // ==========================================
  // State Application
  // ==========================================

  function replaceMonthlyPlans(
    nextMonthlyPlans: MonthlyTarget[]
  ) {
    replacePlanningState({
      ...planningState,
      monthlyOutcomes: nextMonthlyPlans,
    });
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

// eslint-disable-next-line react-refresh/only-export-components
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
