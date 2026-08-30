// ==========================================
// LifeOS Monthly Habit Calendar
// Version: 1.1
// ==========================================
//
// Monthly history view for Habits 2.0.
//
// Responsibilities:
// - Real calendar month navigation
// - Select one active habit
// - Display scheduled / completed / missed days
// - Display quiet rest days
// - Prevent future completion
// - Allow historical completion/uncompletion
// - Display monthly consistency analytics
//
// Canonical state and mutations remain in:
// HabitContext
// HabitExecutionContext
// HabitEngine
// ==========================================

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  FaCircleCheck,
  FaFire,
} from "react-icons/fa6";

import Card from "../ui/Card";
import Button from "../ui/Button";

import {
  useHabits,
} from "../../context/HabitContext";

import {
  useHabitExecution,
} from "../../context/HabitExecutionContext";

import {
  HabitEngine,
} from "../../engines/HabitEngine";

// ==========================================
// Date Helpers
// ==========================================

function formatLocalDate(
  date: Date
): string {
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

function getMonthStart(
  date: Date
): Date {
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    1
  );
}

function getMonthEnd(
  date: Date
): Date {
  return new Date(
    date.getFullYear(),
    date.getMonth() + 1,
    0
  );
}

function addMonths(
  date: Date,
  amount: number
): Date {
  return new Date(
    date.getFullYear(),
    date.getMonth() +
      amount,
    1
  );
}

function getCalendarStart(
  monthStart: Date
): Date {
  const result =
    new Date(
      monthStart
    );

  const day =
    result.getDay();

  const difference =
    day === 0
      ? -6
      : 1 - day;

  result.setDate(
    result.getDate() +
      difference
  );

  return result;
}

function addDays(
  date: Date,
  amount: number
): Date {
  const next =
    new Date(
      date
    );

  next.setDate(
    next.getDate() +
      amount
  );

  return next;
}

// ==========================================
// Constants
// ==========================================

const WEEKDAY_HEADERS = [
  "Mon",
  "Tue",
  "Wed",
  "Thu",
  "Fri",
  "Sat",
  "Sun",
];

// ==========================================
// Component
// ==========================================

export default function MonthlyHabitCalendar() {
  const {
    habitState,
    habits,
  } =
    useHabits();

  const {
    toggleHabit,
  } =
    useHabitExecution();

  const activeHabits =
    useMemo(
      () =>
        habits.filter(
          (habit) =>
            !habit.archived
        ),
      [
        habits,
      ]
    );

  const [
    selectedHabitId,
    setSelectedHabitId,
  ] =
    useState<
      number | null
    >(
      null
    );

  const [
    selectedMonth,
    setSelectedMonth,
  ] =
    useState<Date>(
      () =>
        getMonthStart(
          new Date()
        )
    );

  // ========================================
  // Keep Selected Habit Valid
  // ========================================

  useEffect(() => {
    if (
      activeHabits.length ===
      0
    ) {
      setSelectedHabitId(
        null
      );

      return;
    }

    const stillExists =
      activeHabits.some(
        (habit) =>
          habit.id ===
          selectedHabitId
      );

    if (
      !stillExists
    ) {
      setSelectedHabitId(
        activeHabits[0].id
      );
    }
  }, [
    activeHabits,
    selectedHabitId,
  ]);

  const selectedHabit =
    useMemo(
      () =>
        activeHabits.find(
          (habit) =>
            habit.id ===
            selectedHabitId
        ) ??
        null,
      [
        activeHabits,
        selectedHabitId,
      ]
    );

  // ========================================
  // Calendar Dates
  // ========================================

  const todayDate =
    useMemo(
      () =>
        new Date(),
      []
    );

  const today =
    formatLocalDate(
      todayDate
    );

  const monthStart =
    getMonthStart(
      selectedMonth
    );

  const monthEnd =
    getMonthEnd(
      selectedMonth
    );

  const monthStartDate =
    formatLocalDate(
      monthStart
    );

  const monthEndDate =
    formatLocalDate(
      monthEnd
    );

  const calendarStart =
    getCalendarStart(
      monthStart
    );

  const calendarDates =
    useMemo(
      () =>
        Array.from(
          {
            length:
              42,
          },
          (
            _,
            index
          ) =>
            addDays(
              calendarStart,
              index
            )
        ),
      [
        calendarStart,
      ]
    );

  // ========================================
  // Month Analytics
  // ========================================

  const monthAnalytics =
    useMemo(
      () => {
        if (
          !selectedHabit
        ) {
          return null;
        }

        return HabitEngine.getPeriodAnalytics(
          habitState,
          selectedHabit.id,
          monthStartDate,
          monthEndDate
        );
      },
      [
        habitState,
        selectedHabit,
        monthStartDate,
        monthEndDate,
      ]
    );

  const streakAnalytics =
    useMemo(
      () => {
        if (
          !selectedHabit
        ) {
          return null;
        }

        return HabitEngine.getStreakAnalytics(
          habitState,
          selectedHabit.id,
          todayDate
        );
      },
      [
        habitState,
        selectedHabit,
        todayDate,
      ]
    );

  // ========================================
  // Navigation
  // ========================================

  function goPreviousMonth() {
    setSelectedMonth(
      (
        current
      ) =>
        addMonths(
          current,
          -1
        )
    );
  }

  function goNextMonth() {
    setSelectedMonth(
      (
        current
      ) =>
        addMonths(
          current,
          1
        )
    );
  }

  function goCurrentMonth() {
    setSelectedMonth(
      getMonthStart(
        new Date()
      )
    );
  }

  const currentMonthStart =
    formatLocalDate(
      getMonthStart(
        todayDate
      )
    );

  const isCurrentMonth =
    monthStartDate ===
    currentMonthStart;

  // ========================================
  // Empty State
  // ========================================

  if (
    activeHabits.length ===
    0
  ) {
    return (
      <Card className="p-10 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-400">
          Monthly History
        </p>

        <h2 className="mt-3 text-2xl font-bold text-white">
          No Active Habits
        </h2>

        <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-slate-400">
          Create a habit first. Its monthly history will appear here automatically.
        </p>
      </Card>
    );
  }

  if (
    !selectedHabit
  ) {
    return null;
  }

  // ========================================
  // Render
  // ========================================

  return (
    <section className="space-y-5">
      {/* ====================================
          SECTION HEADER
      ==================================== */}

      <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-400">
            Monthly History
          </p>

          <h2 className="mt-2 text-3xl font-bold text-white">
            {
              selectedMonth.toLocaleDateString(
                "en-US",
                {
                  month:
                    "long",
                  year:
                    "numeric",
                }
              )
            }
          </h2>

          <p className="mt-2 text-sm text-slate-400">
            See consistency across the entire month without changing the simplicity of the weekly tracker.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            variant="secondary"
            onClick={
              goPreviousMonth
            }
          >
            ← Previous
          </Button>

          <Button
            variant="secondary"
            onClick={
              goCurrentMonth
            }
            disabled={
              isCurrentMonth
            }
          >
            This Month
          </Button>

          <Button
            variant="secondary"
            onClick={
              goNextMonth
            }
          >
            Next →
          </Button>
        </div>
      </div>

      {/* ====================================
          HABIT SELECTOR
      ==================================== */}

      <Card className="p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
          Habit
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
          {activeHabits.map(
            (
              habit
            ) => {
              const selected =
                habit.id ===
                selectedHabit.id;

              return (
                <button
                  key={
                    habit.id
                  }
                  type="button"
                  onClick={() =>
                    setSelectedHabitId(
                      habit.id
                    )
                  }
                  className={[
                    "rounded-xl border px-4 py-2 text-sm font-semibold transition",
                    selected
                      ? "border-cyan-400/60 bg-cyan-400/10 text-cyan-300"
                      : "border-slate-700 bg-slate-900 text-slate-400 hover:border-slate-600 hover:text-white",
                  ].join(
                    " "
                  )}
                >
                  {
                    habit.name
                  }
                </button>
              );
            }
          )}
        </div>
      </Card>

      {/* ====================================
          MONTH SUMMARY
      ==================================== */}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card className="p-5">
          <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
            Consistency
          </p>

          <p className="mt-3 text-3xl font-black text-cyan-400">
            {
              monthAnalytics?.completionRate ??
              0
            }
            %
          </p>
        </Card>

        <Card className="p-5">
          <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
            Completed
          </p>

          <div className="mt-3 flex items-center gap-2 text-3xl font-black text-emerald-400">
            <FaCircleCheck className="text-xl" />

            <span>
              {
                monthAnalytics?.completedDays ??
                0
              }
            </span>
          </div>
        </Card>

        <Card className="p-5">
          <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
            Scheduled
          </p>

          <p className="mt-3 text-3xl font-black text-white">
            {
              monthAnalytics?.scheduledDays ??
              0
            }
          </p>
        </Card>

        <Card className="p-5">
          <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
            Current Streak
          </p>

          <div className="mt-3 flex items-center gap-2 text-3xl font-black text-orange-400">
            <FaFire className="text-xl" />

            <span>
              {
                streakAnalytics?.currentStreak ??
                0
              }
            </span>
          </div>

          <p className="mt-1 text-xs text-slate-600">
            Best{" "}
            {
              streakAnalytics?.longestStreak ??
              0
            }
          </p>
        </Card>
      </div>

      {/* ====================================
          CALENDAR
      ==================================== */}

      <Card className="overflow-hidden p-0">
        {/* Weekday Header */}

        <div className="grid grid-cols-7 border-b border-slate-800 bg-slate-950/60">
          {WEEKDAY_HEADERS.map(
            (
              day
            ) => (
              <div
                key={
                  day
                }
                className="border-r border-slate-800 px-2 py-3 text-center last:border-r-0"
              >
                <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                  {
                    day
                  }
                </span>
              </div>
            )
          )}
        </div>

        {/* Calendar Grid */}

        <div className="grid grid-cols-7">
          {calendarDates.map(
            (
              date
            ) => {
              const dateString =
                formatLocalDate(
                  date
                );

              const insideMonth =
                date.getMonth() ===
                  selectedMonth.getMonth() &&
                date.getFullYear() ===
                  selectedMonth.getFullYear();

              const scheduled =
                HabitEngine.isScheduledForDate(
                  selectedHabit,
                  dateString
                );

              const completed =
                HabitEngine.isCompletedOnDate(
                  habitState,
                  selectedHabit.id,
                  dateString
                );

              const isToday =
                dateString ===
                today;

              const isFuture =
                dateString >
                today;

              const missed =
                insideMonth &&
                scheduled &&
                !completed &&
                !isFuture;

              const canToggle =
                insideMonth &&
                scheduled &&
                !isFuture;

              return (
                <div
                  key={
                    dateString
                  }
                  className={[
                    "relative min-h-[96px] border-b border-r border-slate-800 p-2.5 transition",
                    !insideMonth
                      ? "bg-slate-950/50 opacity-30"
                      : "",
                    isToday
                      ? "bg-cyan-500/[0.05]"
                      : "",
                  ].join(
                    " "
                  )}
                >
                  {/* Day Number */}

                  <div className="flex items-center justify-between">
                    <span
                      className={[
                        "text-sm font-bold",
                        isToday
                          ? "text-cyan-300"
                          : insideMonth
                            ? "text-slate-300"
                            : "text-slate-700",
                      ].join(
                        " "
                      )}
                    >
                      {
                        date.getDate()
                      }
                    </span>

                    {isToday && (
                      <span className="rounded-full bg-cyan-500/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.12em] text-cyan-300">
                        Today
                      </span>
                    )}
                  </div>

                  {/* Day State */}

                  {insideMonth && (
                    <div className="mt-3.5 flex justify-center">
                      {!scheduled ? (
                        <div
                          title="Rest day"
                          className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-800 bg-slate-950/70 text-slate-700"
                        >
                          —
                        </div>
                      ) : (
                        <button
                          type="button"
                          disabled={
                            !canToggle
                          }
                          onClick={() => {
                            if (
                              !canToggle
                            ) {
                              return;
                            }

                            toggleHabit(
                              selectedHabit.id,
                              dateString
                            );
                          }}
                          title={
                            isFuture
                              ? "Future scheduled day"
                              : completed
                                ? "Mark incomplete"
                                : "Mark complete"
                          }
                          className={[
                            "flex h-9 w-9 items-center justify-center rounded-xl border text-sm font-bold transition",
                            completed
                              ? "border-emerald-400/60 bg-emerald-400/15 text-emerald-300"
                              : isFuture
                                ? "cursor-not-allowed border-slate-800 bg-slate-900/40 text-slate-700"
                                : missed
                                  ? "border-rose-500/30 bg-rose-500/[0.06] text-rose-400 hover:border-cyan-500/40 hover:bg-cyan-500/10 hover:text-cyan-300"
                                  : "border-cyan-500/40 bg-cyan-500/[0.06] text-cyan-300 hover:bg-cyan-500/15",
                          ].join(
                            " "
                          )}
                        >
                          {completed
                            ? "✓"
                            : ""}
                        </button>
                      )}
                    </div>
                  )}

                  {/* Small Status */}

                  {insideMonth &&
                    scheduled && (
                    <p
                      className={[
                        "mt-2 text-center text-[10px] font-medium uppercase tracking-[0.12em]",
                        completed
                          ? "text-emerald-500"
                          : isFuture
                            ? "text-slate-700"
                            : missed
                              ? "text-rose-500"
                              : "text-cyan-500",
                      ].join(
                        " "
                      )}
                    >
                      {completed
                        ? "Done"
                        : isFuture
                          ? "Scheduled"
                          : missed
                            ? "Missed"
                            : "Today"}
                    </p>
                  )}
                </div>
              );
            }
          )}
        </div>

        {/* Legend */}

        <div className="flex flex-wrap items-center gap-x-6 gap-y-3 border-t border-slate-800 bg-slate-950/50 px-5 py-4 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded border border-emerald-400/60 bg-emerald-400/15" />
            Completed
          </div>

          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded border border-rose-500/30 bg-rose-500/[0.06]" />
            Missed
          </div>

          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded border border-slate-800 bg-slate-900/40" />
            Future
          </div>

          <div className="flex items-center gap-2">
            <span className="text-slate-700">
              —
            </span>
            Rest day
          </div>
        </div>
      </Card>
    </section>
  );
}