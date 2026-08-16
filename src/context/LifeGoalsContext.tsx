import { createContext, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";

import { ExecutionService } from "../services/ExecutionService";

import type { LifeGoal } from "../shared/types";

interface LifeGoalsContextType {
  lifeGoals: LifeGoal[];

  addGoal: (
    title: string,
    description?: string,
    targetDate?: string
  ) => void;

  updateGoal: (goal: LifeGoal) => void;

  updateGoalProgress: (
    id: number,
    progress: number
  ) => void;

  toggleLifeGoal: (id: number) => void;

  completeLifeGoal: (id: number) => void;

  uncompleteLifeGoal: (id: number) => void;

  completeLifeGoals: (ids: number[]) => void;

  deleteGoal: (id: number) => void;
}

const LifeGoalsContext =
  createContext<LifeGoalsContextType | null>(null);

export function LifeGoalsProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [lifeGoals, setLifeGoals] = useState<LifeGoal[]>(() => {
    const saved = localStorage.getItem("lifeos-life-goals");

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
        completedAt: undefined,
        startDate: new Date().toISOString(),
        targetDate,
        createdAt: new Date().toISOString(),
      },
    ]);
  }

  function updateGoal(goal: LifeGoal) {
    setLifeGoals((prev) =>
      prev.map((item) =>
        item.id === goal.id ? goal : item
      )
    );
  }

  function updateGoalProgress(
    id: number,
    progress: number
  ) {
    setLifeGoals((prev) =>
      prev.map((goal) => {
        if (goal.id !== id) {
          return goal;
        }

        const completed = progress >= 100;

        return {
          ...goal,
          progress,
          completed,
          completedAt: completed
            ? new Date().toISOString()
            : undefined,
        };
      })
    );
  }
    function toggleLifeGoal(
    id: number
  ) {
    setLifeGoals((prev) =>
      prev.map((goal) =>
        goal.id === id
          ? {
              ...goal,
              completed: !goal.completed,
              completedAt: !goal.completed
                ? new Date().toISOString()
                : undefined,
            }
          : goal
      )
    );
  }

  function completeLifeGoal(
    id: number
  ) {
    setLifeGoals((prev) => {
      const result =
        ExecutionService.completeLifeGoal(
          {
            lifeGoals: prev,
            monthlyTargets: [],
            weeklyTargets: [],
            tasks: [],
          },
          id
        );

      return result.lifeGoals;
    });
  }

  function uncompleteLifeGoal(
    id: number
  ) {
    setLifeGoals((prev) => {
      const result =
        ExecutionService.uncompleteLifeGoal(
          {
            lifeGoals: prev,
            monthlyTargets: [],
            weeklyTargets: [],
            tasks: [],
          },
          id
        );

      return result.lifeGoals;
    });
  }

  function completeLifeGoals(
    ids: number[]
  ) {
    ids.forEach((id) =>
      completeLifeGoal(id)
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
        updateGoalProgress,
        toggleLifeGoal,
        completeLifeGoal,
        uncompleteLifeGoal,
        completeLifeGoals,
        deleteGoal,
      }}
    >
      {children}
    </LifeGoalsContext.Provider>
  );
  }

export function useLifeGoals() {
  const context =
    useContext(LifeGoalsContext);

  if (!context) {
    throw new Error(
      "useLifeGoals must be used inside LifeGoalsProvider"
    );
  }

  return context;
}