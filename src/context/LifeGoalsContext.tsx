import {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";

import type { ReactNode } from "react";

import type { LifeGoal } from "../shared/types";

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

  deleteGoal: (
    id: number
  ) => void;
}

const LifeGoalsContext =
  createContext<LifeGoalsContextType | null>(
    null
  );

export function LifeGoalsProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [lifeGoals, setLifeGoals] =
    useState<LifeGoal[]>(() => {
      const saved =
        localStorage.getItem(
          "lifeos-life-goals"
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
      "lifeos-life-goals",
      JSON.stringify(lifeGoals)
    );
  }, [lifeGoals]);

  function addGoal(
    title: string,
    description = "",
    targetDate?: string
  ) {
    if (!title.trim()) return;

    setLifeGoals((prev) => [
      ...prev,
      {
        id: Date.now(),

        title: title.trim(),

        description,

        progress: 0,

        completed: false,

        targetDate,

        createdAt:
          new Date().toISOString(),
      },
    ]);
  }

  function updateGoal(
    goal: LifeGoal
  ) {
    setLifeGoals((prev) =>
      prev.map((item) =>
        item.id === goal.id
          ? goal
          : item
      )
    );
  }

  function deleteGoal(
    id: number
  ) {
    setLifeGoals((prev) =>
      prev.filter(
        (goal) =>
          goal.id !== id
      )
    );
  }

  return (
    <LifeGoalsContext.Provider
      value={{
        lifeGoals,
        addGoal,
        updateGoal,
        deleteGoal,
      }}
    >
      {children}
    </LifeGoalsContext.Provider>
  );
}

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