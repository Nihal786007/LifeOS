// ==========================================
// LifeOS Habit Context
// Version: 1.0
// ==========================================
//
// Canonical state + persistence boundary for
// Habits 2.0.
//
// Responsibilities:
// - Own HabitDefinition state
// - Own HabitCompletion history
// - Persist canonical habit state
// - Restore persisted habit state
// - Expose full-state replacement
//
// IMPORTANT:
// - No habit business logic
// - No streak calculations
// - No completion execution logic
// - No XP logic
// - No ATLAS logic
// - No Analytics logic
//
// Habit mutations must flow through the
// dedicated habit execution/mutation layer.
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

import type {
  HabitCompletion,
  HabitDefinition,
  HabitState,
} from "../shared/habits";

// ==========================================
// Storage
// ==========================================

const HABIT_STATE_STORAGE_KEY =
  "lifeos-habit-state-v2";

// ==========================================
// Context Contract
// ==========================================

interface HabitContextValue {
  habitState: HabitState;

  habits:
    HabitDefinition[];

  completions:
    HabitCompletion[];

  replaceHabitState: (
    nextState: HabitState
  ) => void;
}

// ==========================================
// Context
// ==========================================

const HabitContext =
  createContext<
    HabitContextValue | null
  >(null);

// ==========================================
// Validation Helpers
// ==========================================

function isRecord(
  value: unknown
): value is Record<
  string,
  unknown
> {
  return (
    typeof value ===
      "object" &&
    value !==
      null &&
    !Array.isArray(
      value
    )
  );
}

function isValidHabitState(
  value: unknown
): value is HabitState {
  if (
    !isRecord(
      value
    )
  ) {
    return false;
  }

  return (
    Array.isArray(
      value.habits
    ) &&
    Array.isArray(
      value.completions
    )
  );
}

// ==========================================
// Persistence Helpers
// ==========================================

function loadHabitState():
  HabitState {
  const emptyState:
    HabitState = {
      habits: [],
      completions: [],
    };

  const saved =
    localStorage.getItem(
      HABIT_STATE_STORAGE_KEY
    );

  if (!saved) {
    return emptyState;
  }

  try {
    const parsed:
      unknown =
        JSON.parse(
          saved
        );

    if (
      !isValidHabitState(
        parsed
      )
    ) {
      return emptyState;
    }

    return {
      habits:
        parsed.habits,

      completions:
        parsed.completions,
    };
  } catch {
    return emptyState;
  }
}

// ==========================================
// Provider
// ==========================================

export function HabitProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [
    habitState,
    setHabitState,
  ] =
    useState<HabitState>(
      loadHabitState
    );

  useEffect(() => {
    localStorage.setItem(
      HABIT_STATE_STORAGE_KEY,
      JSON.stringify(
        habitState
      )
    );
  }, [habitState]);

  function replaceHabitState(
    nextState: HabitState
  ) {
    setHabitState(
      nextState
    );
  }

  return (
    <HabitContext.Provider
      value={{
        habitState,

        habits:
          habitState.habits,

        completions:
          habitState.completions,

        replaceHabitState,
      }}
    >
      {children}
    </HabitContext.Provider>
  );
}

// ==========================================
// Hook
// ==========================================

export function useHabits() {
  const context =
    useContext(
      HabitContext
    );

  if (!context) {
    throw new Error(
      "useHabits must be used inside HabitProvider"
    );
  }

  return context;
}