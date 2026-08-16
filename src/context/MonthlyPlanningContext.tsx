import {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";

import type { ReactNode } from "react";

import { ExecutionService } from "../services/ExecutionService";

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

  toggleMonthlyPlan: (
    id: number
  ) => void;

  completeMonthlyPlan: (
    id: number
  ) => void;

  uncompleteMonthlyPlan: (
    id: number
  ) => void;

  updateMonthlyProgress: (
    id: number,
    progress: number
  ) => void;

  completeMonthlyPlansByLifeGoal: (
    goalId: number
  ) => void;

  uncompleteMonthlyPlansByLifeGoal: (
    goalId: number
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
        "lifeos-monthly-plans"
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
      "lifeos-monthly-plans",
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

  function toggleMonthlyPlan(
    id: number
  ) {
    setMonthlyPlans((prev) =>
      prev.map((plan) =>
        plan.id === id
          ? {
              ...plan,
              completed:
                !plan.completed,
              completedAt:
                !plan.completed
                  ? new Date().toISOString()
                  : undefined,
            }
          : plan
      )
    );
  }

  function updateMonthlyProgress(
    id: number,
    progress: number
  ) {
    setMonthlyPlans((prev) =>
      prev.map((plan) => {
        if (plan.id !== id) {
          return plan;
        }

        const completed =
          progress >= 100;

        return {
          ...plan,
          progress,
          completed,
          completedAt: completed
            ? new Date().toISOString()
            : undefined,
        };
      })
    );
  }
    function completeMonthlyPlan(
    id: number
  ) {
    setMonthlyPlans((prev) => {
      const result =
        ExecutionService.completeMonthlyTarget(
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

  function uncompleteMonthlyPlan(
    id: number
  ) {
    setMonthlyPlans((prev) => {
      const result =
        ExecutionService.uncompleteMonthlyTarget(
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

  function completeMonthlyPlansByLifeGoal(
    goalId: number
  ) {
    setMonthlyPlans((prev) =>
      prev.map((plan) =>
        plan.goalId === goalId
          ? {
              ...plan,
              progress: 100,
              completed: true,
              completedAt:
                new Date().toISOString(),
            }
          : plan
      )
    );
  }

  function uncompleteMonthlyPlansByLifeGoal(
    goalId: number
  ) {
    setMonthlyPlans((prev) =>
      prev.map((plan) =>
        plan.goalId === goalId
          ? {
              ...plan,
              progress: 0,
              completed: false,
              completedAt: undefined,
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
        toggleMonthlyPlan,
        completeMonthlyPlan,
        uncompleteMonthlyPlan,
        updateMonthlyProgress,
        completeMonthlyPlansByLifeGoal,
        uncompleteMonthlyPlansByLifeGoal,
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