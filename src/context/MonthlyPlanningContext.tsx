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
}

const MonthlyPlanningContext =
  createContext<MonthlyPlanningContextType | null>(
    null
  );

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

      if (!saved) return [];

      try {
        return JSON.parse(saved);
      } catch {
        return [];
      }
    });

  useEffect(() => {
    localStorage.setItem(
      STORAGE_KEYS.MONTHLY_TARGETS,
      JSON.stringify(monthlyPlans)
    );
  }, [monthlyPlans]);

  function addMonthlyPlan(
    title: string,
    month: number,
    year: number,
    goalId?: number
  ) {
    if (!title.trim()) return;

    setMonthlyPlans((prev) => [
      ...prev,
      {
        id: Date.now(),
        title: title.trim(),
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

  function updateMonthlyProgress(
    id: number,
    progress: number
  ) {
    setMonthlyPlans((prev) =>
      prev.map((plan) =>
        plan.id === id
          ? {
              ...plan,
              progress,
            }
          : plan
      )
    );
  }

  function deleteMonthlyPlan(
    id: number
  ) {
    setMonthlyPlans((prev) => {
      const result =
        ExecutionService.deleteMonthlyTarget(
          {
            lifeGoals: [],
            monthlyTargets: prev,
            weeklyTargets: [],
            tasks: [],
          },
          id
        );

      return result.monthlyTargets;
    });
  }

  function deleteMonthlyPlansByLifeGoal(
    goalId: number
  ) {
    setMonthlyPlans((prev) =>
      prev.filter(
        (plan) =>
          plan.goalId !== goalId
      )
    );
  }

  return (
    <MonthlyPlanningContext.Provider
      value={{
        monthlyPlans,
        addMonthlyPlan,
        updateMonthlyProgress,
        deleteMonthlyPlan,
        deleteMonthlyPlansByLifeGoal,
      }}
    >
      {children}
    </MonthlyPlanningContext.Provider>
  );
}

export function useMonthlyPlanning() {
  const context = useContext(
    MonthlyPlanningContext
  );

  if (!context) {
    throw new Error(
      "useMonthlyPlanning must be used inside MonthlyPlanningProvider"
    );
  }

  return context;
}