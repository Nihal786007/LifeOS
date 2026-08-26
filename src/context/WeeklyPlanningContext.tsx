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
  WeeklyTarget,
} from "../shared/types";

interface WeeklyPlanningContextType {
  weeklyTargets: WeeklyTarget[];

  addWeeklyTarget: (
    title: string,
    monthlyTargetId: number | undefined,
    week: 1 | 2 | 3 | 4 | 5
  ) => void;

  /**
   * Applies complete weekly-target state
   * produced by the LifeOS execution architecture.
   *
   * Completion, uncompletion, and deletion must
   * flow through PlanningExecutionContext.
   */
  replaceWeeklyTargets: (
    weeklyTargets: WeeklyTarget[]
  ) => void;
}

const WeeklyPlanningContext =
  createContext<
    WeeklyPlanningContextType | null
  >(null);

export function WeeklyPlanningProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [
    weeklyTargets,
    setWeeklyTargets,
  ] = useState<WeeklyTarget[]>(() => {
    const saved =
      localStorage.getItem(
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

  // ==========================================
  // Persistence
  // ==========================================

  useEffect(() => {
    localStorage.setItem(
      STORAGE_KEYS.WEEKLY_TARGETS,
      JSON.stringify(
        weeklyTargets
      )
    );
  }, [weeklyTargets]);

  // ==========================================
  // Weekly Target Creation
  // ==========================================

  function addWeeklyTarget(
    title: string,
    monthlyTargetId: number | undefined,
    week: 1 | 2 | 3 | 4 | 5
  ) {
    const trimmedTitle =
      title.trim();

    if (!trimmedTitle) {
      return;
    }

    const target: WeeklyTarget = {
      id: Date.now(),

      title:
        trimmedTitle,

      monthlyTargetId,

      week,

      progress:
        0,

      completed:
        false,

      completedAt:
        undefined,

      createdAt:
        new Date().toISOString(),
    };

    setWeeklyTargets(
      (previous) => [
        ...previous,
        target,
      ]
    );
  }

  // ==========================================
  // Execution State Application
  // ==========================================

  function replaceWeeklyTargets(
    nextWeeklyTargets: WeeklyTarget[]
  ) {
    setWeeklyTargets(
      nextWeeklyTargets
    );
  }

  // ==========================================
  // Provider
  // ==========================================

  return (
    <WeeklyPlanningContext.Provider
      value={{
        weeklyTargets,
        addWeeklyTarget,
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