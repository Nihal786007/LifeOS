// ==========================================
// LifeOS Habit Engine
// Version: 1.0
// ==========================================
//
// Canonical pure computation engine for
// Habits 2.0.
//
// Responsibilities:
// - Resolve habit schedules
// - Resolve completion state by local date
// - Add/remove supplied completion records
// - Derive scheduled dates
// - Derive current streak
// - Derive longest streak
// - Derive completion statistics
//
// IMPORTANT:
// - Pure computation only
// - No React
// - No localStorage
// - No Date.now()
// - No execution history ownership
// - No XP ownership
// - Streaks are derived from completion history
// - Inactive weekdays do not break streaks
// ==========================================

import type {
  HabitCompletion,
  HabitDefinition,
  HabitState,
  HabitWeekday,
} from "../shared/habits";

// ==========================================
// Public Analytics Types
// ==========================================

export interface HabitStreakAnalytics {
  currentStreak: number;

  longestStreak: number;
}

export interface HabitPeriodAnalytics {
  periodStartDate: string;

  periodEndDate: string;

  scheduledDays: number;

  completedDays: number;

  missedDays: number;

  completionRate: number;
}

// ==========================================
// Internal Constants
// ==========================================

const WEEKDAY_BY_INDEX: Record<
  number,
  HabitWeekday
> = {
  0: "sunday",
  1: "monday",
  2: "tuesday",
  3: "wednesday",
  4: "thursday",
  5: "friday",
  6: "saturday",
};

// ==========================================
// Date Helpers
// ==========================================

function padNumber(
  value: number
): string {
  return String(
    value
  ).padStart(
    2,
    "0"
  );
}

function formatLocalDate(
  date: Date
): string {
  return [
    date.getFullYear(),

    padNumber(
      date.getMonth() + 1
    ),

    padNumber(
      date.getDate()
    ),
  ].join("-");
}

function parseLocalDate(
  value: string
): Date | undefined {
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
    date.getFullYear() !==
      year ||
    date.getMonth() !==
      month - 1 ||
    date.getDate() !==
      day
  ) {
    return undefined;
  }

  date.setHours(
    0,
    0,
    0,
    0
  );

  return date;
}

function normalizeLocalDate(
  date: Date
): Date {
  const normalized =
    new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate()
    );

  normalized.setHours(
    0,
    0,
    0,
    0
  );

  return normalized;
}

function addDays(
  date: Date,
  amount: number
): Date {
  const result =
    new Date(
      date
    );

  result.setDate(
    result.getDate() +
      amount
  );

  return normalizeLocalDate(
    result
  );
}

function resolveDate(
  value: Date | string
): Date | undefined {
  if (
    typeof value ===
    "string"
  ) {
    return parseLocalDate(
      value
    );
  }

  if (
    Number.isNaN(
      value.getTime()
    )
  ) {
    return undefined;
  }

  return normalizeLocalDate(
    value
  );
}

function getWeekday(
  date: Date
): HabitWeekday {
  return WEEKDAY_BY_INDEX[
    date.getDay()
  ];
}

function getCompletionRate(
  completed: number,
  scheduled: number
): number {
  if (
    scheduled <= 0
  ) {
    return 0;
  }

  return Math.round(
    (
      completed /
      scheduled
    ) * 100
  );
}

// ==========================================
// Habit Engine
// ==========================================

export class HabitEngine {
  // ========================================
  // Habit Lookup
  // ========================================

  static getHabit(
    state: HabitState,
    habitId: number
  ): HabitDefinition | undefined {
    return state.habits.find(
      (habit) =>
        habit.id ===
        habitId
    );
  }

  // ========================================
  // Schedule
  // ========================================

  static isScheduledForDate(
    habit: HabitDefinition,
    date:
      | Date
      | string
  ): boolean {
    const resolvedDate =
      resolveDate(
        date
      );

    const startDate =
      parseLocalDate(
        habit.startDate
      );

    if (
      !resolvedDate ||
      !startDate
    ) {
      return false;
    }

    if (
      resolvedDate.getTime() <
      startDate.getTime()
    ) {
      return false;
    }

    if (
      habit.archived &&
      habit.archivedAt
    ) {
      const archivedDate =
        normalizeLocalDate(
          new Date(
            habit.archivedAt
          )
        );

      if (
        !Number.isNaN(
          archivedDate.getTime()
        ) &&
        resolvedDate.getTime() >
          archivedDate.getTime()
      ) {
        return false;
      }
    }

    return habit.activeDays.includes(
      getWeekday(
        resolvedDate
      )
    );
  }

  static getScheduledDates(
    habit: HabitDefinition,
    start:
      | Date
      | string,
    end:
      | Date
      | string
  ): string[] {
    const startDate =
      resolveDate(
        start
      );

    const endDate =
      resolveDate(
        end
      );

    if (
      !startDate ||
      !endDate ||
      startDate.getTime() >
        endDate.getTime()
    ) {
      return [];
    }

    const dates: string[] =
      [];

    let cursor =
      startDate;

    while (
      cursor.getTime() <=
      endDate.getTime()
    ) {
      if (
        this.isScheduledForDate(
          habit,
          cursor
        )
      ) {
        dates.push(
          formatLocalDate(
            cursor
          )
        );
      }

      cursor =
        addDays(
          cursor,
          1
        );
    }

    return dates;
  }

  // ========================================
  // Completion Lookup
  // ========================================

  static getCompletionForDate(
    state: HabitState,
    habitId: number,
    date:
      | Date
      | string
  ): HabitCompletion | undefined {
    const resolvedDate =
      resolveDate(
        date
      );

    if (!resolvedDate) {
      return undefined;
    }

    const dateKey =
      formatLocalDate(
        resolvedDate
      );

    return state.completions.find(
      (completion) =>
        completion.habitId ===
          habitId &&
        completion.date ===
          dateKey
    );
  }

  static isCompletedOnDate(
    state: HabitState,
    habitId: number,
    date:
      | Date
      | string
  ): boolean {
    return (
      this.getCompletionForDate(
        state,
        habitId,
        date
      ) !==
      undefined
    );
  }

  // ========================================
  // Completion Mutation
  // ========================================

  static addCompletion(
    state: HabitState,
    completion:
      HabitCompletion
  ): HabitState {
    const habit =
      this.getHabit(
        state,
        completion.habitId
      );

    const completionDate =
      parseLocalDate(
        completion.date
      );

    if (
      !habit ||
      !completionDate
    ) {
      return state;
    }

    if (
      !this.isScheduledForDate(
        habit,
        completionDate
      )
    ) {
      return state;
    }

    const existing =
      this.getCompletionForDate(
        state,
        completion.habitId,
        completion.date
      );

    if (existing) {
      return state;
    }

    return {
      habits:
        state.habits,

      completions: [
        ...state.completions,
        completion,
      ],
    };
  }

  static removeCompletion(
    state: HabitState,
    habitId: number,
    date:
      | Date
      | string
  ): HabitState {
    const resolvedDate =
      resolveDate(
        date
      );

    if (!resolvedDate) {
      return state;
    }

    const dateKey =
      formatLocalDate(
        resolvedDate
      );

    const nextCompletions =
      state.completions.filter(
        (completion) =>
          !(
            completion.habitId ===
              habitId &&
            completion.date ===
              dateKey
          )
      );

    if (
      nextCompletions.length ===
      state.completions.length
    ) {
      return state;
    }

    return {
      habits:
        state.habits,

      completions:
        nextCompletions,
    };
  }

  // ========================================
  // Current Streak
  // ========================================

  static getCurrentStreak(
    state: HabitState,
    habitId: number,
    referenceDate:
      Date = new Date()
  ): number {
    const habit =
      this.getHabit(
        state,
        habitId
      );

    if (!habit) {
      return 0;
    }

    const reference =
      normalizeLocalDate(
        referenceDate
      );

    const startDate =
      parseLocalDate(
        habit.startDate
      );

    if (
      !startDate ||
      reference.getTime() <
        startDate.getTime()
    ) {
      return 0;
    }

    let cursor =
      reference;

    // ======================================
    // Today Grace Rule
    // ======================================
    //
    // If today is scheduled but not yet
    // completed, today's unfinished state
    // does not immediately destroy the
    // existing streak.
    //
    // We therefore begin from the previous
    // scheduled day in that case.

    if (
      this.isScheduledForDate(
        habit,
        cursor
      ) &&
      !this.isCompletedOnDate(
        state,
        habitId,
        cursor
      )
    ) {
      cursor =
        addDays(
          cursor,
          -1
        );
    }

    // Skip inactive days.

    while (
      cursor.getTime() >=
      startDate.getTime() &&
      !this.isScheduledForDate(
        habit,
        cursor
      )
    ) {
      cursor =
        addDays(
          cursor,
          -1
        );
    }

    let streak = 0;

    while (
      cursor.getTime() >=
      startDate.getTime()
    ) {
      if (
        !this.isScheduledForDate(
          habit,
          cursor
        )
      ) {
        cursor =
          addDays(
            cursor,
            -1
          );

        continue;
      }

      if (
        !this.isCompletedOnDate(
          state,
          habitId,
          cursor
        )
      ) {
        break;
      }

      streak += 1;

      cursor =
        addDays(
          cursor,
          -1
        );
    }

    return streak;
  }

  // ========================================
  // Longest Streak
  // ========================================

  static getLongestStreak(
    state: HabitState,
    habitId: number,
    endDate:
      Date = new Date()
  ): number {
    const habit =
      this.getHabit(
        state,
        habitId
      );

    if (!habit) {
      return 0;
    }

    const startDate =
      parseLocalDate(
        habit.startDate
      );

    const finalDate =
      normalizeLocalDate(
        endDate
      );

    if (
      !startDate ||
      finalDate.getTime() <
        startDate.getTime()
    ) {
      return 0;
    }

    const scheduledDates =
      this.getScheduledDates(
        habit,
        startDate,
        finalDate
      );

    let currentStreak = 0;

    let longestStreak = 0;

    scheduledDates.forEach(
      (date) => {
        if (
          this.isCompletedOnDate(
            state,
            habitId,
            date
          )
        ) {
          currentStreak +=
            1;

          longestStreak =
            Math.max(
              longestStreak,
              currentStreak
            );

          return;
        }

        currentStreak = 0;
      }
    );

    return longestStreak;
  }

  static getStreakAnalytics(
    state: HabitState,
    habitId: number,
    referenceDate:
      Date = new Date()
  ): HabitStreakAnalytics {
    return {
      currentStreak:
        this.getCurrentStreak(
          state,
          habitId,
          referenceDate
        ),

      longestStreak:
        this.getLongestStreak(
          state,
          habitId,
          referenceDate
        ),
    };
  }

  // ========================================
  // Period Analytics
  // ========================================

  static getPeriodAnalytics(
    state: HabitState,
    habitId: number,
    start:
      | Date
      | string,
    end:
      | Date
      | string
  ): HabitPeriodAnalytics {
    const habit =
      this.getHabit(
        state,
        habitId
      );

    const startDate =
      resolveDate(
        start
      );

    const endDate =
      resolveDate(
        end
      );

    if (
      !habit ||
      !startDate ||
      !endDate ||
      startDate.getTime() >
        endDate.getTime()
    ) {
      return {
        periodStartDate:
          startDate
            ? formatLocalDate(
                startDate
              )
            : "",

        periodEndDate:
          endDate
            ? formatLocalDate(
                endDate
              )
            : "",

        scheduledDays: 0,

        completedDays: 0,

        missedDays: 0,

        completionRate: 0,
      };
    }

    const scheduledDates =
      this.getScheduledDates(
        habit,
        startDate,
        endDate
      );

    const completedDays =
      scheduledDates.filter(
        (date) =>
          this.isCompletedOnDate(
            state,
            habitId,
            date
          )
      ).length;

    return {
      periodStartDate:
        formatLocalDate(
          startDate
        ),

      periodEndDate:
        formatLocalDate(
          endDate
        ),

      scheduledDays:
        scheduledDates.length,

      completedDays,

      missedDays:
        scheduledDates.length -
        completedDays,

      completionRate:
        getCompletionRate(
          completedDays,
          scheduledDates.length
        ),
    };
  }
}