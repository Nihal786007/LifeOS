import {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";

import type { ReactNode } from "react";
import type { WeeklyTarget } from "../shared/types";

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

  deleteWeeklyTarget: (
    id: number
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
    if (!title.trim()) {
      alert("Please enter a weekly target.");
      return;
    }

    const exists = weeklyTargets.some(
      (target) =>
        target.monthlyTargetId ===
          monthlyTargetId &&
        target.week === week &&
        target.title
          .trim()
          .toLowerCase() ===
          title.trim().toLowerCase()
    );

    if (exists) {
      alert(
        "This weekly target already exists."
      );
      return;
    }

    setWeeklyTargets((prev) => [
      ...prev,
      {
        id: Date.now(),

        title: title.trim(),

        monthlyTargetId,

        week,

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

  function deleteWeeklyTarget(
    id: number
  ) {
    setWeeklyTargets((prev) =>
      prev.filter(
        (target) =>
          target.id !== id
      )
    );
  }

  return (
    <WeeklyPlanningContext.Provider
      value={{
        weeklyTargets,
        addWeeklyTarget,
        toggleWeeklyTarget,
        deleteWeeklyTarget,
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