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
  WeeklyTarget,
} from "../shared/types";

interface WeeklyPlanningContextType {
  weeklyTargets: WeeklyTarget[];

  addWeeklyTarget: (
    title: string,
    monthlyTargetId: number | undefined,
    week: 1 | 2 | 3 | 4 | 5
  ) => void;

  updateWeeklyProgress: (
    id: number,
    progress: number
  ) => void;

  deleteWeeklyTarget: (
    id: number
  ) => void;

  deleteWeeklyTargetsByMonthlyTarget: (
    monthlyTargetId: number
  ) => void;

  /**
   * Applies the complete weekly-target state
   * returned by the execution architecture.
   *
   * This is intended for orchestration-level
   * state synchronization.
   */
  replaceWeeklyTargets: (
    weeklyTargets: WeeklyTarget[]
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
        STORAGE_KEYS.WEEKLY_TARGETS
      );

      if (!saved) {
        return [];
      }

      try {
        return JSON.parse(
          saved
        ) as WeeklyTarget[];
      } catch {
        return [];
      }
    });

  useEffect(() => {
    localStorage.setItem(
      STORAGE_KEYS.WEEKLY_TARGETS,
      JSON.stringify(weeklyTargets)
    );
  }, [weeklyTargets]);

  function addWeeklyTarget(
    title: string,
    monthlyTargetId: number | undefined,
    week: 1 | 2 | 3 | 4 | 5
  ) {
    const trimmedTitle = title.trim();

    if (!trimmedTitle) {
      return;
    }

    setWeeklyTargets((previous) => [
      ...previous,
      {
        id: Date.now(),

        title: trimmedTitle,

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

  function updateWeeklyProgress(
    id: number,
    progress: number
  ) {
    setWeeklyTargets((previous) =>
      previous.map((target) =>
        target.id === id
          ? {
              ...target,
              progress,
            }
          : target
      )
    );
  }

  function deleteWeeklyTarget(
    id: number
  ) {
    setWeeklyTargets((previous) => {
      const result =
        ExecutionService.deleteWeeklyTarget(
          {
            lifeGoals: [],
            monthlyTargets: [],
            weeklyTargets: previous,
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
    setWeeklyTargets((previous) =>
      previous.filter(
        (target) =>
          target.monthlyTargetId !==
          monthlyTargetId
      )
    );
  }

  function replaceWeeklyTargets(
    nextWeeklyTargets: WeeklyTarget[]
  ) {
    setWeeklyTargets(
      nextWeeklyTargets
    );
  }

  return (
    <WeeklyPlanningContext.Provider
      value={{
        weeklyTargets,
        addWeeklyTarget,
        updateWeeklyProgress,
        deleteWeeklyTarget,
        deleteWeeklyTargetsByMonthlyTarget,
        replaceWeeklyTargets,
      }}
    >
      {children}
    </WeeklyPlanningContext.Provider>
  );
}

export function useWeeklyPlanning() {
  const context =
    useContext(
      WeeklyPlanningContext
    );

  if (!context) {
    throw new Error(
      "useWeeklyPlanning must be used inside WeeklyPlanningProvider"
    );
  }

  return context;
}