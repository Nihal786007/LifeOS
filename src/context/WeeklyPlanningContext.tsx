// ==========================================
// LifeOS Weekly Planning Context
// Version: 4.0
// ==========================================

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

// ==========================================
// Types
// ==========================================

type LegacyWeekNumber =
  | 1
  | 2
  | 3
  | 4
  | 5;

interface WeeklyPlanningContextType {
  weeklyTargets: WeeklyTarget[];

  /**
   * Internal real-calendar-week persistence
   * primitive.
   *
   * Goal Weekly Focus creation must first pass
   * through PlanningExecutionContext and the
   * planning mutation/ownership architecture.
   */
  addCalendarWeeklyTarget: (
    title: string,
    monthlyTargetId: number | undefined,
    weekStartDate: string,
    weekEndDate: string
  ) => void;

  /**
   * Applies complete Weekly Planning state
   * produced by the LifeOS planning/execution
   * architecture.
   *
   * Weekly Focus editing, completion,
   * uncompletion, and deletion must flow
   * through PlanningExecutionContext.
   */
  replaceWeeklyTargets: (
    weeklyTargets: WeeklyTarget[]
  ) => void;
}

// ==========================================
// Context
// ==========================================

const WeeklyPlanningContext =
  createContext<
    WeeklyPlanningContextType | null
  >(null);

// ==========================================
// Helpers
// ==========================================

function parseLocalDate(
  value: string
) {
  const match =
    /^(\d{4})-(\d{2})-(\d{2})$/.exec(
      value
    );

  if (!match) {
    return undefined;
  }

  const year =
    Number(
      match[1]
    );

  const month =
    Number(
      match[2]
    );

  const day =
    Number(
      match[3]
    );

  const date =
    new Date(
      year,
      month - 1,
      day
    );

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return undefined;
  }

  if (
    date.getFullYear() !==
      year ||
    date.getMonth() !==
      month - 1 ||
    date.getDate() !==
      day
  ) {
    return undefined;
  }

  return date;
}

function deriveLegacyWeekNumber(
  weekStartDate: string
): LegacyWeekNumber {
  const start =
    parseLocalDate(
      weekStartDate
    );

  if (!start) {
    return 1;
  }

  const dayOfMonth =
    start.getDate();

  const calculated =
    Math.floor(
      (dayOfMonth - 1) / 7
    ) + 1;

  return Math.min(
    5,
    Math.max(
      1,
      calculated
    )
  ) as LegacyWeekNumber;
}

function normalizeDateRange(
  weekStartDate: string,
  weekEndDate: string
) {
  const start =
    parseLocalDate(
      weekStartDate
    );

  const end =
    parseLocalDate(
      weekEndDate
    );

  if (
    !start ||
    !end
  ) {
    return undefined;
  }

  if (
    end.getTime() <
    start.getTime()
  ) {
    return undefined;
  }

  return {
    weekStartDate,
    weekEndDate,
  };
}

// ==========================================
// Provider
// ==========================================

export function WeeklyPlanningProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [
    weeklyTargets,
    setWeeklyTargets,
  ] = useState<
    WeeklyTarget[]
  >(() => {
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
  }, [
    weeklyTargets,
  ]);

  // ==========================================
  // Real Calendar Weekly Target Creation
  // ==========================================

  function addCalendarWeeklyTarget(
    title: string,
    monthlyTargetId:
      | number
      | undefined,
    weekStartDate: string,
    weekEndDate: string
  ) {
    const trimmedTitle =
      title.trim();

    if (!trimmedTitle) {
      return;
    }

    const normalizedRange =
      normalizeDateRange(
        weekStartDate,
        weekEndDate
      );

    if (!normalizedRange) {
      return;
    }

    const duplicate =
      weeklyTargets.some(
        (target) =>
          target.monthlyTargetId ===
            monthlyTargetId &&
          target.weekStartDate ===
            normalizedRange.weekStartDate &&
          target.weekEndDate ===
            normalizedRange.weekEndDate
      );

    if (duplicate) {
      return;
    }

    const target:
      WeeklyTarget = {
        id:
          Date.now(),

        title:
          trimmedTitle,

        monthlyTargetId,

        // Temporary compatibility field.
        week:
          deriveLegacyWeekNumber(
            normalizedRange.weekStartDate
          ),

        weekStartDate:
          normalizedRange.weekStartDate,

        weekEndDate:
          normalizedRange.weekEndDate,

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
  // State Application
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

        addCalendarWeeklyTarget,

        replaceWeeklyTargets,
      }}
    >
      {children}
    </WeeklyPlanningContext.Provider>
  );
}

// ==========================================
// Hook
// ==========================================

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