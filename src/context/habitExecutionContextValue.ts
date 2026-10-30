import { createContext, useContext } from "react";
import type { CreateHabitInput, UpdateHabitInput } from "../shared/habits";

export interface HabitExecutionContextValue {
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

export const HabitExecutionContext =
  createContext<
    HabitExecutionContextValue | null
  >(null);

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
