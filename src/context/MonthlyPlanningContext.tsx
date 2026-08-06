import {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";

import type { ReactNode } from "react";
import type { MonthlyPlan } from "../shared/types";

interface MonthlyPlanningContextType {
  monthlyPlans: MonthlyPlan[];

  addMonthlyPlan: (
    title: string,
    month: number,
    year: number,
    goalId?: number
  ) => void;

  toggleMonthlyPlan: (
    id: number
  ) => void;

  deleteMonthlyPlan: (
    id: number
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
    useState<MonthlyPlan[]>(() => {
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
    if (!title.trim()) {
      alert("Please enter a target title.");
      return;
    }

    const exists = monthlyPlans.some(
      (plan) =>
        plan.month === month &&
        plan.year === year &&
        plan.title.trim().toLowerCase() ===
          title.trim().toLowerCase()
    );

    if (exists) {
      alert(
        "A Monthly Target with this title already exists."
      );
      return;
    }

    setMonthlyPlans((prev) => [
      ...prev,
      {
        id: Date.now(),

        title: title.trim(),

        month,

        year,

        goalId,

        completed: false,

        completedAt: undefined,

        createdAt: new Date().toISOString(),
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
              completed: !plan.completed,
              completedAt: !plan.completed
                ? new Date().toISOString()
                : undefined,
            }
          : plan
      )
    );
  }

  function deleteMonthlyPlan(
    id: number
  ) {
    setMonthlyPlans((prev) =>
      prev.filter(
        (plan) => plan.id !== id
      )
    );
  }

  return (
    <MonthlyPlanningContext.Provider
      value={{
        monthlyPlans,
        addMonthlyPlan,
        toggleMonthlyPlan,
        deleteMonthlyPlan,
      }}
    >
      {children}
    </MonthlyPlanningContext.Provider>
  );
}

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