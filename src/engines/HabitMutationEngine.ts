// ==========================================
// LifeOS Habit Mutation Engine
// Version: 1.0
// ==========================================
//
// Canonical pure mutation engine for
// Habits 2.0 definitions.
//
// Responsibilities:
// - Create habits
// - Update habits
// - Archive habits
// - Restore archived habits
// - Delete habits and their history
// - Normalize and validate active weekdays
//
// IMPORTANT:
// - Pure computation only
// - No React
// - No localStorage
// - No Date.now()
// - No XP
// - No execution history
// - IDs and timestamps are supplied by caller
// ==========================================

import type {
  CreateHabitInput,
  HabitDefinition,
  HabitState,
  HabitWeekday,
  UpdateHabitInput,
} from "../shared/habits";

// ==========================================
// Public Mutation Results
// ==========================================

export interface CreateHabitMutation {
  id: number;

  createdAt: string;

  input: CreateHabitInput;
}

export interface UpdateHabitMutation {
  habitId: number;

  updatedAt: string;

  input: UpdateHabitInput;
}

export interface ArchiveHabitMutation {
  habitId: number;

  archivedAt: string;
}

export interface RestoreHabitMutation {
  habitId: number;

  updatedAt: string;
}

// ==========================================
// Constants
// ==========================================

const HABIT_WEEKDAYS: HabitWeekday[] = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
];

// ==========================================
// Internal Helpers
// ==========================================

function isHabitWeekday(
  value: unknown
): value is HabitWeekday {
  return HABIT_WEEKDAYS.includes(
    value as HabitWeekday
  );
}

function normalizeActiveDays(
  activeDays: HabitWeekday[]
): HabitWeekday[] {
  const uniqueDays =
    new Set<HabitWeekday>();

  activeDays.forEach(
    (day) => {
      if (
        isHabitWeekday(
          day
        )
      ) {
        uniqueDays.add(
          day
        );
      }
    }
  );

  return HABIT_WEEKDAYS.filter(
    (day) =>
      uniqueDays.has(
        day
      )
  );
}

function normalizeName(
  value: string
): string {
  return value.trim();
}

function normalizeDescription(
  value:
    | string
    | null
    | undefined
): string | undefined {
  if (
    value ===
      undefined ||
    value ===
      null
  ) {
    return undefined;
  }

  const trimmed =
    value.trim();

  return trimmed ||
    undefined;
}

function isValidLocalDate(
  value: string
): boolean {
  const match =
    /^(\d{4})-(\d{2})-(\d{2})$/.exec(
      value
    );

  if (!match) {
    return false;
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

  return (
    date.getFullYear() ===
      year &&
    date.getMonth() ===
      month - 1 &&
    date.getDate() ===
      day
  );
}

function getDefaultStartDate(
  createdAt: string
): string {
  const date =
    new Date(
      createdAt
    );

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "";
  }

  const year =
    date.getFullYear();

  const month =
    String(
      date.getMonth() + 1
    ).padStart(
      2,
      "0"
    );

  const day =
    String(
      date.getDate()
    ).padStart(
      2,
      "0"
    );

  return `${year}-${month}-${day}`;
}

// ==========================================
// Habit Mutation Engine
// ==========================================

export class HabitMutationEngine {
  // ========================================
  // Create
  // ========================================

  static createHabit(
    state: HabitState,
    mutation:
      CreateHabitMutation
  ): HabitState {
    const name =
      normalizeName(
        mutation.input.name
      );

    if (!name) {
      return state;
    }

    if (
      state.habits.some(
        (habit) =>
          habit.id ===
          mutation.id
      )
    ) {
      return state;
    }

    const activeDays =
      normalizeActiveDays(
        mutation.input.activeDays
      );

    if (
      activeDays.length ===
      0
    ) {
      return state;
    }

    const startDate =
      mutation.input.startDate ??
      getDefaultStartDate(
        mutation.createdAt
      );

    if (
      !isValidLocalDate(
        startDate
      )
    ) {
      return state;
    }

    const habit:
      HabitDefinition = {
        id:
          mutation.id,

        name,

        description:
          normalizeDescription(
            mutation.input.description
          ),

        activeDays,

        startDate,

        archived:
          false,

        createdAt:
          mutation.createdAt,

        updatedAt:
          mutation.createdAt,
      };

    return {
      habits: [
        ...state.habits,
        habit,
      ],

      completions:
        state.completions,
    };
  }

  // ========================================
  // Update
  // ========================================

  static updateHabit(
    state: HabitState,
    mutation:
      UpdateHabitMutation
  ): HabitState {
    const habit =
      state.habits.find(
        (item) =>
          item.id ===
          mutation.habitId
      );

    if (!habit) {
      return state;
    }

    let nextName =
      habit.name;

    if (
      mutation.input.name !==
      undefined
    ) {
      const normalizedName =
        normalizeName(
          mutation.input.name
        );

      if (!normalizedName) {
        return state;
      }

      nextName =
        normalizedName;
    }

    let nextDescription =
      habit.description;

    if (
      mutation.input.description !==
      undefined
    ) {
      nextDescription =
        normalizeDescription(
          mutation.input.description
        );
    }

    let nextActiveDays =
      habit.activeDays;

    if (
      mutation.input.activeDays !==
      undefined
    ) {
      const normalizedDays =
        normalizeActiveDays(
          mutation.input.activeDays
        );

      if (
        normalizedDays.length ===
        0
      ) {
        return state;
      }

      nextActiveDays =
        normalizedDays;
    }

    let nextStartDate =
      habit.startDate;

    if (
      mutation.input.startDate !==
      undefined
    ) {
      if (
        !isValidLocalDate(
          mutation.input.startDate
        )
      ) {
        return state;
      }

      nextStartDate =
        mutation.input.startDate;
    }

    return {
      habits:
        state.habits.map(
          (item) =>
            item.id ===
            mutation.habitId
              ? {
                  ...item,

                  name:
                    nextName,

                  description:
                    nextDescription,

                  activeDays:
                    nextActiveDays,

                  startDate:
                    nextStartDate,

                  updatedAt:
                    mutation.updatedAt,
                }
              : item
        ),

      completions:
        state.completions,
    };
  }

  // ========================================
  // Archive
  // ========================================

  static archiveHabit(
    state: HabitState,
    mutation:
      ArchiveHabitMutation
  ): HabitState {
    const habit =
      state.habits.find(
        (item) =>
          item.id ===
          mutation.habitId
      );

    if (
      !habit ||
      habit.archived
    ) {
      return state;
    }

    return {
      habits:
        state.habits.map(
          (item) =>
            item.id ===
            mutation.habitId
              ? {
                  ...item,

                  archived:
                    true,

                  archivedAt:
                    mutation.archivedAt,

                  updatedAt:
                    mutation.archivedAt,
                }
              : item
        ),

      completions:
        state.completions,
    };
  }

  // ========================================
  // Restore
  // ========================================

  static restoreHabit(
    state: HabitState,
    mutation:
      RestoreHabitMutation
  ): HabitState {
    const habit =
      state.habits.find(
        (item) =>
          item.id ===
          mutation.habitId
      );

    if (
      !habit ||
      !habit.archived
    ) {
      return state;
    }

    return {
      habits:
        state.habits.map(
          (item) =>
            item.id ===
            mutation.habitId
              ? {
                  ...item,

                  archived:
                    false,

                  archivedAt:
                    undefined,

                  updatedAt:
                    mutation.updatedAt,
                }
              : item
        ),

      completions:
        state.completions,
    };
  }

  // ========================================
  // Delete
  // ========================================

  static deleteHabit(
    state: HabitState,
    habitId: number
  ): HabitState {
    const exists =
      state.habits.some(
        (habit) =>
          habit.id ===
          habitId
      );

    if (!exists) {
      return state;
    }

    return {
      habits:
        state.habits.filter(
          (habit) =>
            habit.id !==
            habitId
        ),

      completions:
        state.completions.filter(
          (completion) =>
            completion.habitId !==
            habitId
        ),
    };
  }
}