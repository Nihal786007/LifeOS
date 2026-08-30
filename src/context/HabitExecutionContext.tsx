// ==========================================
// LifeOS Habit Execution Context
// Version: 1.0
// ==========================================
//
// Canonical orchestration layer for
// Habits 2.0.
//
// Responsibilities:
// - Create habits
// - Update habits
// - Archive habits
// - Restore habits
// - Delete habits
// - Complete habits on exact local dates
// - Uncomplete habits on exact local dates
// - Generate IDs and timestamps
// - Replace canonical HabitContext state
// - Persist execution records
//
// IMPORTANT:
// - Does not own habit state
// - Does not calculate streaks
// - Does not own XP
// - Does not own analytics
// - Pure mutation logic stays in engines
// ==========================================

import {
  createContext,
  useContext,
} from "react";

import type {
  ReactNode,
} from "react";

import {
  HabitMutationEngine,
} from "../engines/HabitMutationEngine";

import {
  HabitExecutionEngine,
} from "../engines/HabitExecutionEngine";

import {
  ExecutionHistoryService,
} from "../services/ExecutionHistoryService";

import {
  useHabits,
} from "./HabitContext";

import type {
  CreateHabitInput,
  UpdateHabitInput,
} from "../shared/habits";

// ==========================================
// Context Contract
// ==========================================

interface HabitExecutionContextValue {
  createHabit: (
    input: CreateHabitInput
  ) => void;

  updateHabit: (
    habitId: number,
    input: UpdateHabitInput
  ) => void;

  archiveHabit: (
    habitId: number
  ) => void;

  restoreHabit: (
    habitId: number
  ) => void;

  deleteHabit: (
    habitId: number
  ) => void;

  completeHabit: (
    habitId: number,
    date: string
  ) => void;

  uncompleteHabit: (
    habitId: number,
    date: string
  ) => void;

  toggleHabit: (
    habitId: number,
    date: string
  ) => void;
}

// ==========================================
// Context
// ==========================================

const HabitExecutionContext =
  createContext<
    HabitExecutionContextValue | null
  >(null);

// ==========================================
// Helpers
// ==========================================

function createId(): number {
  return Date.now();
}

function createSecondaryId(
  offset: number
): number {
  return (
    Date.now() +
    offset
  );
}

function now(): string {
  return new Date().toISOString();
}

// ==========================================
// Provider
// ==========================================

export function HabitExecutionProvider({
  children,
}: {
  children: ReactNode;
}) {
  const {
    habitState,
    replaceHabitState,
  } =
    useHabits();

  // ========================================
  // Definition Mutations
  // ========================================

  function createHabit(
    input: CreateHabitInput
  ) {
    const timestamp =
      now();

    const nextState =
      HabitMutationEngine.createHabit(
        habitState,
        {
          id:
            createId(),

          createdAt:
            timestamp,

          input,
        }
      );

    if (
      nextState ===
      habitState
    ) {
      return;
    }

    replaceHabitState(
      nextState
    );
  }

  function updateHabit(
    habitId: number,
    input: UpdateHabitInput
  ) {
    const nextState =
      HabitMutationEngine.updateHabit(
        habitState,
        {
          habitId,

          updatedAt:
            now(),

          input,
        }
      );

    if (
      nextState ===
      habitState
    ) {
      return;
    }

    replaceHabitState(
      nextState
    );
  }

  function archiveHabit(
    habitId: number
  ) {
    const timestamp =
      now();

    const nextState =
      HabitMutationEngine.archiveHabit(
        habitState,
        {
          habitId,

          archivedAt:
            timestamp,
        }
      );

    if (
      nextState ===
      habitState
    ) {
      return;
    }

    replaceHabitState(
      nextState
    );
  }

  function restoreHabit(
    habitId: number
  ) {
    const nextState =
      HabitMutationEngine.restoreHabit(
        habitState,
        {
          habitId,

          updatedAt:
            now(),
        }
      );

    if (
      nextState ===
      habitState
    ) {
      return;
    }

    replaceHabitState(
      nextState
    );
  }

  function deleteHabit(
    habitId: number
  ) {
    const nextState =
      HabitMutationEngine.deleteHabit(
        habitState,
        habitId
      );

    if (
      nextState ===
      habitState
    ) {
      return;
    }

    replaceHabitState(
      nextState
    );
  }

  // ========================================
  // Completion Execution
  // ========================================

  function completeHabit(
    habitId: number,
    date: string
  ) {
    const timestamp =
      now();

    const baseId =
      createId();

    const result =
      HabitExecutionEngine.completeHabit(
        habitState,
        {
          habitId,

          date,

          completionId:
            baseId,

          executionRecordId:
            createSecondaryId(
              1
            ),

          completedAt:
            timestamp,
        }
      );

    if (
      result.executionRecords.length ===
      0
    ) {
      return;
    }

    replaceHabitState(
      result.habitState
    );

    ExecutionHistoryService.append(
      result.executionRecords
    );
  }

  function uncompleteHabit(
    habitId: number,
    date: string
  ) {
    const result =
      HabitExecutionEngine.uncompleteHabit(
        habitState,
        {
          habitId,

          date,

          executionRecordId:
            createId(),

          createdAt:
            now(),
        }
      );

    if (
      result.executionRecords.length ===
      0
    ) {
      return;
    }

    replaceHabitState(
      result.habitState
    );

    ExecutionHistoryService.append(
      result.executionRecords
    );
  }

  function toggleHabit(
    habitId: number,
    date: string
  ) {
    const completed =
      HabitExecutionEngine.isCompleted(
        habitState,
        habitId,
        date
      );

    if (completed) {
      uncompleteHabit(
        habitId,
        date
      );

      return;
    }

    completeHabit(
      habitId,
      date
    );
  }

  return (
    <HabitExecutionContext.Provider
      value={{
        createHabit,

        updateHabit,

        archiveHabit,

        restoreHabit,

        deleteHabit,

        completeHabit,

        uncompleteHabit,

        toggleHabit,
      }}
    >
      {children}
    </HabitExecutionContext.Provider>
  );
}

// ==========================================
// Hook
// ==========================================

export function useHabitExecution() {
  const context =
    useContext(
      HabitExecutionContext
    );

  if (!context) {
    throw new Error(
      "useHabitExecution must be used inside HabitExecutionProvider"
    );
  }

  return context;
}