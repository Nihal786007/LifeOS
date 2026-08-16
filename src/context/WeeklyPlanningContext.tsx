import {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";

import type { ReactNode } from "react";

import { ExecutionService } from "../services/ExecutionService";

import type {
  WeeklyTarget,
} from "../shared/types";

interface WeeklyPlanningContextType {
  weeklyTargets: WeeklyTarget[];

  addWeeklyTarget: (
    title: string,
    monthlyTargetId: number | undefined,
    week: 1 | 2 | 3 | 4 | 5
  ) => void;

  toggleWeeklyTarget: (
    id: number
  ) => void;

  completeWeeklyTarget: (
    id: number
  ) => void;

  uncompleteWeeklyTarget: (
    id: number
  ) => void;

  updateWeeklyProgress: (
    id: number,
    progress: number
  ) => void;

  completeWeeklyTargetsByMonthlyTarget: (
    monthlyTargetId: number
  ) => void;

  uncompleteWeeklyTargetsByMonthlyTarget: (
    monthlyTargetId: number
  ) => void;

  deleteWeeklyTarget: (
    id: number
  ) => void;

  deleteWeeklyTargetsByMonthlyTarget: (
    monthlyTargetId: number
  ) => void;
}

const WeeklyPlanningContext =
  createContext<WeeklyPlanningContextType | null>(
    null
  );

export function WeeklyPlanningProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [weeklyTargets, setWeeklyTargets] =
    useState<WeeklyTarget[]>(() => {
      const saved = localStorage.getItem(
        "lifeos-weekly-targets"
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
      "lifeos-weekly-targets",
      JSON.stringify(weeklyTargets)
    );
  }, [weeklyTargets]);

  function addWeeklyTarget(
    title: string,
    monthlyTargetId: number | undefined,
    week: 1 | 2 | 3 | 4 | 5
  ) {
    if (!title.trim()) return;

    setWeeklyTargets((prev) => [
      ...prev,
      {
        id: Date.now(),
        title: title.trim(),
        monthlyTargetId,
        week,
        progress: 0,
        completed: false,
        completedAt: undefined,
        createdAt:
          new Date().toISOString(),
      },
    ]);
  }

  function toggleWeeklyTarget(
    id: number
  ) {
    setWeeklyTargets((prev) =>
      prev.map((target) =>
        target.id === id
          ? {
              ...target,
              completed:
                !target.completed,
              completedAt:
                !target.completed
                  ? new Date().toISOString()
                  : undefined,
            }
          : target
      )
    );
  }

  function updateWeeklyProgress(
    id: number,
    progress: number
  ) {
    setWeeklyTargets((prev) =>
      prev.map((target) => {
        if (target.id !== id) {
          return target;
        }

        const completed =
          progress >= 100;

        return {
          ...target,
          progress,
          completed,
          completedAt: completed
            ? new Date().toISOString()
            : undefined,
        };
      })
    );
  }
    function completeWeeklyTarget(
    id: number
  ) {
    setWeeklyTargets((prev) => {
      const result =
        ExecutionService.completeWeeklyTarget(
          {
            lifeGoals: [],
            monthlyTargets: [],
            weeklyTargets: prev,
            tasks: [],
          },
          id
        );

      return result.weeklyTargets;
    });
  }

  function uncompleteWeeklyTarget(
    id: number
  ) {
    setWeeklyTargets((prev) => {
      const result =
        ExecutionService.uncompleteWeeklyTarget(
          {
            lifeGoals: [],
            monthlyTargets: [],
            weeklyTargets: prev,
            tasks: [],
          },
          id
        );

      return result.weeklyTargets;
    });
  }

  function completeWeeklyTargetsByMonthlyTarget(
    monthlyTargetId: number
  ) {
    setWeeklyTargets((prev) =>
      prev.map((target) =>
        target.monthlyTargetId === monthlyTargetId
          ? {
              ...target,
              progress: 100,
              completed: true,
              completedAt:
                new Date().toISOString(),
            }
          : target
      )
    );
  }

  function uncompleteWeeklyTargetsByMonthlyTarget(
    monthlyTargetId: number
  ) {
    setWeeklyTargets((prev) =>
      prev.map((target) =>
        target.monthlyTargetId === monthlyTargetId
          ? {
              ...target,
              progress: 0,
              completed: false,
              completedAt: undefined,
            }
          : target
      )
    );
  }

  function deleteWeeklyTarget(
    id: number
  ) {
    setWeeklyTargets((prev) => {
      const result =
        ExecutionService.deleteWeeklyTarget(
          {
            lifeGoals: [],
            monthlyTargets: [],
            weeklyTargets: prev,
            tasks: [],
          },
          id
        );

      return result.weeklyTargets;
    });
  }

  function deleteWeeklyTargetsByMonthlyTarget(
    monthlyTargetId: number
  ) {
    setWeeklyTargets((prev) =>
      prev.filter(
        (target) =>
          target.monthlyTargetId !==
          monthlyTargetId
      )
    );
  }

  return (
    <WeeklyPlanningContext.Provider
      value={{
        weeklyTargets,
        addWeeklyTarget,
        toggleWeeklyTarget,
        completeWeeklyTarget,
        uncompleteWeeklyTarget,
        updateWeeklyProgress,
        completeWeeklyTargetsByMonthlyTarget,
        uncompleteWeeklyTargetsByMonthlyTarget,
        deleteWeeklyTarget,
        deleteWeeklyTargetsByMonthlyTarget,
      }}
    >
      {children}
    </WeeklyPlanningContext.Provider>
  );
  }

export function useWeeklyPlanning() {
  const context = useContext(
    WeeklyPlanningContext
  );

  if (!context) {
    throw new Error(
      "useWeeklyPlanning must be used inside WeeklyPlanningProvider"
    );
  }

  return context;
}