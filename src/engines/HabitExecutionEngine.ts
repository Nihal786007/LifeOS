// ==========================================
// LifeOS Habit Execution Engine
// Version: 1.0
// ==========================================
//
// Canonical execution engine for Habits 2.0.
//
// Responsibilities:
// - Complete a habit on an exact local date
// - Uncomplete a habit on an exact local date
// - Produce canonical execution records
//
// IMPORTANT:
// - Pure computation only
// - No React
// - No localStorage
// - No Date.now()
// - No XP awarding
// - No execution-history persistence
//
// IDs and timestamps are supplied by the
// orchestration layer so this engine remains
// deterministic and testable.
// ==========================================

import type {
  ExecutionRecord,
} from "../shared/execution";

import type {
  HabitState,
} from "../shared/habits";

import {
  HabitEngine,
} from "./HabitEngine";

// ==========================================
// Public Types
// ==========================================

export interface HabitExecutionResult {
  habitState: HabitState;

  executionRecords:
    ExecutionRecord[];
}

export interface CompleteHabitExecution {
  habitId: number;

  // Local calendar identity:
  // YYYY-MM-DD
  date: string;

  // Canonical HabitCompletion ID.
  completionId: number;

  // Canonical ExecutionRecord ID.
  executionRecordId: number;

  // Precise timestamp representing when the
  // completion action occurred.
  completedAt: string;
}

export interface UncompleteHabitExecution {
  habitId: number;

  // Local calendar identity:
  // YYYY-MM-DD
  date: string;

  // Canonical ExecutionRecord ID.
  executionRecordId: number;

  // Precise timestamp representing when the
  // uncompletion action occurred.
  createdAt: string;
}

// ==========================================
// Internal Helpers
// ==========================================

function createExecutionRecord(
  id: number,
  type:
    | "habit_completed"
    | "habit_uncompleted",
  entityId: number,
  title: string,
  createdAt: string,
  metadata:
    Record<string, unknown>
): ExecutionRecord {
  return {
    id,

    type,

    entityId,

    title,

    createdAt,

    xpAwarded: 0,

    metadata,
  };
}

// ==========================================
// Habit Execution Engine
// ==========================================

export class HabitExecutionEngine {
  // ========================================
  // Complete
  // ========================================

  static completeHabit(
    state: HabitState,
    execution:
      CompleteHabitExecution
  ): HabitExecutionResult {
    const habit =
      HabitEngine.getHabit(
        state,
        execution.habitId
      );

    if (!habit) {
      return {
        habitState:
          state,

        executionRecords:
          [],
      };
    }

    const nextState =
      HabitEngine.addCompletion(
        state,
        {
          id:
            execution.completionId,

          habitId:
            execution.habitId,

          date:
            execution.date,

          completedAt:
            execution.completedAt,
        }
      );

    // HabitEngine returns the exact same state
    // object when the completion is invalid,
    // unscheduled, or already exists.
    if (
      nextState ===
      state
    ) {
      return {
        habitState:
          state,

        executionRecords:
          [],
      };
    }

    return {
      habitState:
        nextState,

      executionRecords: [
        createExecutionRecord(
          execution.executionRecordId,

          "habit_completed",

          habit.id,

          habit.name,

          execution.completedAt,

          {
            habitDate:
              execution.date,

            habitCompletionId:
              execution.completionId,
          }
        ),
      ],
    };
  }

  // ========================================
  // Uncomplete
  // ========================================

  static uncompleteHabit(
    state: HabitState,
    execution:
      UncompleteHabitExecution
  ): HabitExecutionResult {
    const habit =
      HabitEngine.getHabit(
        state,
        execution.habitId
      );

    if (!habit) {
      return {
        habitState:
          state,

        executionRecords:
          [],
      };
    }

    const existingCompletion =
      HabitEngine.getCompletionForDate(
        state,
        execution.habitId,
        execution.date
      );

    if (!existingCompletion) {
      return {
        habitState:
          state,

        executionRecords:
          [],
      };
    }

    const nextState =
      HabitEngine.removeCompletion(
        state,
        execution.habitId,
        execution.date
      );

    if (
      nextState ===
      state
    ) {
      return {
        habitState:
          state,

        executionRecords:
          [],
      };
    }

    return {
      habitState:
        nextState,

      executionRecords: [
        createExecutionRecord(
          execution.executionRecordId,

          "habit_uncompleted",

          habit.id,

          habit.name,

          execution.createdAt,

          {
            habitDate:
              execution.date,

            removedHabitCompletionId:
              existingCompletion.id,
          }
        ),
      ],
    };
  }

  // ========================================
  // Toggle
  // ========================================

  static isCompleted(
    state: HabitState,
    habitId: number,
    date: string
  ): boolean {
    return HabitEngine.isCompletedOnDate(
      state,
      habitId,
      date
    );
  }
}