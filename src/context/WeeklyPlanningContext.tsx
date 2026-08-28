// ==========================================
// LifeOS Weekly Planning Context
// Version: 2.3
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
   * Legacy creation path.
   *
   * Kept temporarily so older LifeOS UI remains
   * compatible during the real-calendar-week migration.
   */
  addWeeklyTarget: (
    title: string,
    monthlyTargetId: number | undefined,
    week: LegacyWeekNumber
  ) => void;

  /**
   * Planning V2 creation path.
   *
   * Creates a Weekly Target using real calendar dates.
   * The legacy week number is derived only for temporary
   * backward compatibility with older UI.
   */
  addCalendarWeeklyTarget: (
    title: string,
    monthlyTargetId: number | undefined,
    weekStartDate: string,
    weekEndDate: string
  ) => void;

  /**
   * Renames an existing weekly focus.
   *
   * This does not alter completion, progress,
   * relationships, dates, or execution history.
   */
  updateWeeklyTargetTitle: (
    id: number,
    title: string
  ) => void;

  /**
   * Applies complete weekly-target state produced
   * by the LifeOS execution architecture.
   *
   * Completion, uncompletion, and deletion must
   * flow through PlanningExecutionContext.
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
    Number(match[1]);

  const month =
    Number(match[2]);

  const day =
    Number(match[3]);

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
  // Legacy Weekly Target Creation
  // ==========================================

  function addWeeklyTarget(
    title: string,
    monthlyTargetId: number | undefined,
    week: LegacyWeekNumber
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
  // Real Calendar Weekly Target Creation
  // ==========================================

  function addCalendarWeeklyTarget(
    title: string,
    monthlyTargetId: number | undefined,
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

    const target: WeeklyTarget = {
      id: Date.now(),

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
  // Weekly Focus Editing
  // ==========================================

  function updateWeeklyTargetTitle(
    id: number,
    title: string
  ) {
    const trimmedTitle =
      title.trim();

    if (!trimmedTitle) {
      return;
    }

    setWeeklyTargets(
      (previous) =>
        previous.map(
          (target) =>
            target.id === id
              ? {
                  ...target,
                  title:
                    trimmedTitle,
                }
              : target
        )
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
        addCalendarWeeklyTarget,
        updateWeeklyTargetTitle,
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