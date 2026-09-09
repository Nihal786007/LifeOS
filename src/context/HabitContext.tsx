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

import {
  useDataServices,
} from "../data/DataServicesContext";

import type {
  HabitCompletion,
  HabitDefinition,
  HabitState,
} from "../shared/habits";

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
// Provider
// ==========================================

export function HabitProvider({
  children,
}: {
  children: ReactNode;
}) {
  const {
    habitRepository,
  } = useDataServices();

  const [
    habitState,
    setHabitState,
  ] =
    useState<HabitState>(
      () => habitRepository.load()
    );

  useEffect(() => {
    return habitRepository.subscribe(() => {
      setHabitState(
        habitRepository.load()
      );
    });
  }, [habitRepository]);

  function replaceHabitState(
    nextState: HabitState
  ) {
    setHabitState(
      nextState
    );
    habitRepository.save(
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

// eslint-disable-next-line react-refresh/only-export-components
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
