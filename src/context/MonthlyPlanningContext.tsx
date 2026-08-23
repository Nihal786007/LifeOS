// ==========================================
// LifeOS Monthly Planning Context
// Version: 2.0
// ==========================================

import {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";

import type { ReactNode } from "react";

import { ExecutionService } from "../services/ExecutionService";
import { STORAGE_KEYS } from "../constants/storage";

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

  updateMonthlyProgress: (
    id: number,
    progress: number
  ) => void;

  deleteMonthlyPlan: (
    id: number
  ) => void;

  deleteMonthlyPlansByLifeGoal: (
    goalId: number
  ) => void;

  /**
   * Applies a complete Monthly Planning state
   * produced by the LifeOS execution architecture.
   *
   * This is intended for orchestration-level updates,
   * not normal component-level mutations.
   */
  replaceMonthlyPlans: (
    monthlyPlans: MonthlyTarget[]
  ) => void;
}

// ==========================================
// Context
// ==========================================

const MonthlyPlanningContext =
  createContext<MonthlyPlanningContextType | null>(
    null
  );

// ==========================================
// Provider
// ==========================================

export function MonthlyPlanningProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [monthlyPlans, setMonthlyPlans] =
    useState<MonthlyTarget[]>(() => {
      const saved = localStorage.getItem(
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
      JSON.stringify(monthlyPlans)
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
    const trimmedTitle = title.trim();

    if (!trimmedTitle) {
      return;
    }

    setMonthlyPlans((previous) => [
      ...previous,
      {
        id: Date.now(),

        title: trimmedTitle,

        month,
        year,
        goalId,

        progress: 0,

        completed: false,
        completedAt: undefined,

        createdAt:
          new Date().toISOString(),
      },
    ]);
  }

  // ==========================================
  // Progress Update
  // ==========================================

  function updateMonthlyProgress(
    id: number,
    progress: number
  ) {
    setMonthlyPlans((previous) =>
      previous.map((plan) =>
        plan.id === id
          ? {
              ...plan,
              progress,
            }
          : plan
      )
    );
  }

  // ==========================================
  // Monthly Plan Delete
  // ==========================================

  function deleteMonthlyPlan(
    id: number
  ) {
    setMonthlyPlans((previous) => {
      const result =
        ExecutionService.deleteMonthlyTarget(
          {
            lifeGoals: [],
            monthlyTargets: previous,
            weeklyTargets: [],
            tasks: [],
          },
          id
        );

      return result.monthlyTargets;
    });
  }

  // ==========================================
  // Delete Plans By Life Goal
  // ==========================================

  function deleteMonthlyPlansByLifeGoal(
    goalId: number
  ) {
    setMonthlyPlans((previous) =>
      previous.filter(
        (plan) =>
          plan.goalId !== goalId
      )
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
        updateMonthlyProgress,
        deleteMonthlyPlan,
        deleteMonthlyPlansByLifeGoal,

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