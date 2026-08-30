// ==========================================
// LifeOS Habits Page
// Version: 2.2
// ==========================================
//
// Habits 2.0
//
// Views:
// - Weekly Tracker
// - Monthly History
//
// Responsibilities:
// - Habit creation
// - Today summary
// - Weekly spreadsheet execution
// - Monthly consistency history
// - Archive / restore
//
// IMPORTANT:
// - HabitContext owns canonical state
// - HabitExecutionContext owns mutations
// - HabitEngine owns derived logic
// - No stored streak values
// - No stored completedToday values
// ==========================================

import {
  useMemo,
  useState,
} from "react";

import {
  FaBoxArchive,
  FaBullseye,
  FaCalendarDays,
  FaCircleCheck,
  FaFire,
  FaPlus,
  FaRotateLeft,
  FaTableCellsLarge,
} from "react-icons/fa6";

import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import PageHero from "../components/ui/PageHero";
import StatCard from "../components/ui/StatCard";

import MonthlyHabitCalendar from "../components/habits/MonthlyHabitCalendar";

import {
  useHabits,
} from "../context/HabitContext";

import {
  useHabitExecution,
} from "../context/HabitExecutionContext";

import {
  HabitEngine,
} from "../engines/HabitEngine";

import type {
  HabitDefinition,
  HabitWeekday,
} from "../shared/habits";

// ==========================================
// Types
// ==========================================

type HabitView =
  | "weekly"
  | "monthly";

// ==========================================
// Constants
// ==========================================

const WEEKDAYS: {
  value: HabitWeekday;
  shortLabel: string;
  fullLabel: string;
}[] = [
  {
    value: "monday",
    shortLabel: "Mon",
    fullLabel: "Monday",
  },
  {
    value: "tuesday",
    shortLabel: "Tue",
    fullLabel: "Tuesday",
  },
  {
    value: "wednesday",
    shortLabel: "Wed",
    fullLabel: "Wednesday",
  },
  {
    value: "thursday",
    shortLabel: "Thu",
    fullLabel: "Thursday",
  },
  {
    value: "friday",
    shortLabel: "Fri",
    fullLabel: "Friday",
  },
  {
    value: "saturday",
    shortLabel: "Sat",
    fullLabel: "Saturday",
  },
  {
    value: "sunday",
    shortLabel: "Sun",
    fullLabel: "Sunday",
  },
];

const EVERY_DAY: HabitWeekday[] =
  WEEKDAYS.map(
    (day) =>
      day.value
  );

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

function cloneDate(
  date: Date
): Date {
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate()
  );
}

function addDays(
  date: Date,
  amount: number
): Date {
  const next =
    cloneDate(
      date
    );

  next.setDate(
    next.getDate() +
      amount
  );

  return next;
}

function getMonday(
  date: Date
): Date {
  const result =
    cloneDate(
      date
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

function formatWeekRange(
  start: Date,
  end: Date
): string {
  const sameYear =
    start.getFullYear() ===
    end.getFullYear();

  const sameMonth =
    sameYear &&
    start.getMonth() ===
      end.getMonth();

  if (
    sameMonth
  ) {
    return `${start.toLocaleDateString(
      "en-US",
      {
        month:
          "long",
        day:
          "numeric",
      }
    )} – ${end.getDate()}, ${end.getFullYear()}`;
  }

  if (
    sameYear
  ) {
    return `${start.toLocaleDateString(
      "en-US",
      {
        month:
          "short",
        day:
          "numeric",
      }
    )} – ${end.toLocaleDateString(
      "en-US",
      {
        month:
          "short",
        day:
          "numeric",
        year:
          "numeric",
      }
    )}`;
  }

  return `${start.toLocaleDateString(
    "en-US",
    {
      month:
        "short",
      day:
        "numeric",
      year:
        "numeric",
    }
  )} – ${end.toLocaleDateString(
    "en-US",
    {
      month:
        "short",
      day:
        "numeric",
      year:
        "numeric",
    }
  )}`;
}

// ==========================================
// Weekly Progress
// ==========================================

function getHabitWeekProgress(
  habitState:
    Parameters<
      typeof HabitEngine.isCompletedOnDate
    >[0],
  habit:
    HabitDefinition,
  dates:
    Date[]
) {
  let scheduledDays =
    0;

  let completedDays =
    0;

  for (
    const date of
    dates
  ) {
    const localDate =
      formatLocalDate(
        date
      );

    if (
      !HabitEngine.isScheduledForDate(
        habit,
        localDate
      )
    ) {
      continue;
    }

    scheduledDays +=
      1;

    if (
      HabitEngine.isCompletedOnDate(
        habitState,
        habit.id,
        localDate
      )
    ) {
      completedDays +=
        1;
    }
  }

  const completionRate =
    scheduledDays ===
    0
      ? 0
      : Math.round(
          (
            completedDays /
            scheduledDays
          ) *
            100
        );

  return {
    scheduledDays,
    completedDays,
    completionRate,
  };
}

// ==========================================
// Page
// ==========================================

export default function Habits() {
  const {
    habitState,
    habits,
  } =
    useHabits();

  const {
    createHabit,
    toggleHabit,
    archiveHabit,
    restoreHabit,
  } =
    useHabitExecution();

  // ========================================
  // Main View
  // ========================================

  const [
    activeView,
    setActiveView,
  ] =
    useState<HabitView>(
      "weekly"
    );

  // ========================================
  // Current Date
  // ========================================

  const referenceDate =
    useMemo(
      () =>
        new Date(),
      []
    );

  const today =
    useMemo(
      () =>
        formatLocalDate(
          referenceDate
        ),
      [
        referenceDate,
      ]
    );

  // ========================================
  // Week Navigation
  // ========================================

  const [
    selectedWeekStart,
    setSelectedWeekStart,
  ] =
    useState<Date>(
      () =>
        getMonday(
          new Date()
        )
    );

  const weekDates =
    useMemo(
      () =>
        Array.from(
          {
            length:
              7,
          },
          (
            _,
            index
          ) =>
            addDays(
              selectedWeekStart,
              index
            )
        ),
      [
        selectedWeekStart,
      ]
    );

  const selectedWeekEnd =
    weekDates[6];

  const selectedWeekStartDate =
    formatLocalDate(
      selectedWeekStart
    );

  const selectedWeekEndDate =
    formatLocalDate(
      selectedWeekEnd
    );

  const currentWeekStart =
    getMonday(
      referenceDate
    );

  const isCurrentWeek =
    formatLocalDate(
      currentWeekStart
    ) ===
    selectedWeekStartDate;

  function goPreviousWeek() {
    setSelectedWeekStart(
      (
        current
      ) =>
        addDays(
          current,
          -7
        )
    );
  }

  function goNextWeek() {
    setSelectedWeekStart(
      (
        current
      ) =>
        addDays(
          current,
          7
        )
    );
  }

  function goCurrentWeek() {
    setSelectedWeekStart(
      getMonday(
        new Date()
      )
    );
  }

  // ========================================
  // Habit Groups
  // ========================================

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

  const archivedHabits =
    useMemo(
      () =>
        habits.filter(
          (habit) =>
            habit.archived
        ),
      [
        habits,
      ]
    );

  // ========================================
  // Today Summary
  // ========================================

  const scheduledToday =
    useMemo(
      () =>
        activeHabits.filter(
          (habit) =>
            HabitEngine.isScheduledForDate(
              habit,
              today
            )
        ),
      [
        activeHabits,
        today,
      ]
    );

  const completedToday =
    useMemo(
      () =>
        scheduledToday.filter(
          (habit) =>
            HabitEngine.isCompletedOnDate(
              habitState,
              habit.id,
              today
            )
        ),
      [
        scheduledToday,
        habitState,
        today,
      ]
    );

  const todayProgress =
    scheduledToday.length ===
    0
      ? 0
      : Math.round(
          (
            completedToday.length /
            scheduledToday.length
          ) *
            100
        );

  // ========================================
  // Week Summary
  // ========================================

  const weeklySummary =
    useMemo(
      () => {
        let scheduledDays =
          0;

        let completedDays =
          0;

        for (
          const habit of
          activeHabits
        ) {
          const progress =
            getHabitWeekProgress(
              habitState,
              habit,
              weekDates
            );

          scheduledDays +=
            progress.scheduledDays;

          completedDays +=
            progress.completedDays;
        }

        const completionRate =
          scheduledDays ===
          0
            ? 0
            : Math.round(
                (
                  completedDays /
                  scheduledDays
                ) *
                  100
              );

        return {
          scheduledDays,
          completedDays,
          completionRate,
        };
      },
      [
        activeHabits,
        habitState,
        weekDates,
      ]
    );

  const bestCurrentStreak =
    useMemo(
      () =>
        activeHabits.reduce(
          (
            best,
            habit
          ) =>
            Math.max(
              best,
              HabitEngine.getCurrentStreak(
                habitState,
                habit.id,
                referenceDate
              )
            ),
          0
        ),
      [
        activeHabits,
        habitState,
        referenceDate,
      ]
    );

  // ========================================
  // Create Habit
  // ========================================

  const [
    newHabitName,
    setNewHabitName,
  ] =
    useState("");

  const [
    selectedDays,
    setSelectedDays,
  ] =
    useState<
      HabitWeekday[]
    >(
      EVERY_DAY
    );

  function handleCreateHabit() {
    const name =
      newHabitName.trim();

    if (
      !name ||
      selectedDays.length ===
        0
    ) {
      return;
    }

    createHabit({
      name,

      activeDays:
        selectedDays,

      startDate:
        today,
    });

    setNewHabitName(
      ""
    );
  }

  function toggleSelectedDay(
    day: HabitWeekday
  ) {
    setSelectedDays(
      (
        current
      ) => {
        if (
          current.includes(
            day
          )
        ) {
          return current.filter(
            (item) =>
              item !==
              day
          );
        }

        return WEEKDAYS
          .map(
            (item) =>
              item.value
          )
          .filter(
            (item) =>
              current.includes(
                item
              ) ||
              item ===
                day
          );
      }
    );
  }

  function selectEveryDay() {
    setSelectedDays(
      EVERY_DAY
    );
  }

  // ========================================
  // Render
  // ========================================

  return (
    <div className="space-y-10">
      {/* ====================================
          HERO
      ==================================== */}

      <PageHero
        badge="Habits 2.0"
        title="Consistency System"
        description="Execute habits week by week and understand your consistency across longer periods."
      >
        <Card className="border-orange-500/20 bg-orange-500/5">
          <p className="text-sm uppercase tracking-[0.2em] text-orange-300">
            Today's Progress
          </p>

          <div className="mt-4 flex items-end gap-3">
            <h2 className="text-5xl font-black text-white">
              {
                todayProgress
              }
              %
            </h2>

            <p className="pb-1 text-sm text-slate-400">
              {
                completedToday.length
              }
              /
              {
                scheduledToday.length
              }{" "}
              scheduled
            </p>
          </div>

          <div className="mt-5 h-2 overflow-hidden rounded-full bg-slate-800">
            <div
              className="h-full rounded-full bg-orange-400 transition-all duration-300"
              style={{
                width:
                  `${todayProgress}%`,
              }}
            />
          </div>
        </Card>
      </PageHero>

      {/* ====================================
          SUMMARY
      ==================================== */}

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={
            <FaBullseye />
          }
          title="Active Habits"
          value={
            activeHabits.length
          }
        />

        <StatCard
          icon={
            <FaCircleCheck />
          }
          title="Completed Today"
          value={
            completedToday.length
          }
          color="text-green-400"
        />

        <StatCard
          icon={
            <FaCircleCheck />
          }
          title="Week Completion"
          value={
            `${weeklySummary.completionRate}%`
          }
          color="text-cyan-400"
        />

        <StatCard
          icon={
            <FaFire />
          }
          title="Best Current Streak"
          value={
            bestCurrentStreak
          }
          color="text-orange-400"
        />
      </div>

      {/* ====================================
          CREATE HABIT
      ==================================== */}

      <Card className="p-6">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-400">
              Habit Setup
            </p>

            <h2 className="mt-2 text-2xl font-bold text-white">
              Add a new habit
            </h2>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
              Choose the weekdays this habit should be scheduled.
              Unscheduled days are rest days and do not break streaks.
            </p>
          </div>

          <button
            type="button"
            onClick={
              selectEveryDay
            }
            className="rounded-xl border border-slate-700 px-4 py-2 text-xs font-semibold text-slate-300 transition hover:border-cyan-500/50 hover:text-white"
          >
            Select Every Day
          </button>
        </div>

        <div className="mt-7 grid gap-6 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-end">
          <div>
            <Input
              value={
                newHabitName
              }
              onChange={(
                event
              ) =>
                setNewHabitName(
                  event.target.value
                )
              }
              placeholder="e.g. Read 30 minutes"
              onKeyDown={(
                event
              ) => {
                if (
                  event.key ===
                  "Enter"
                ) {
                  handleCreateHabit();
                }
              }}
            />

            <div className="mt-4 flex flex-wrap gap-2">
              {WEEKDAYS.map(
                (
                  day
                ) => {
                  const selected =
                    selectedDays.includes(
                      day.value
                    );

                  return (
                    <button
                      key={
                        day.value
                      }
                      type="button"
                      onClick={() =>
                        toggleSelectedDay(
                          day.value
                        )
                      }
                      className={[
                        "min-w-[58px] rounded-xl border px-3 py-2 text-xs font-semibold transition",
                        selected
                          ? "border-cyan-400/60 bg-cyan-400/10 text-cyan-300"
                          : "border-slate-700 bg-slate-900 text-slate-500 hover:border-slate-600 hover:text-slate-300",
                      ].join(
                        " "
                      )}
                    >
                      {
                        day.shortLabel
                      }
                    </button>
                  );
                }
              )}
            </div>

            {selectedDays.length ===
              0 && (
              <p className="mt-3 text-sm text-rose-400">
                Select at least one active day.
              </p>
            )}
          </div>

          <Button
            onClick={
              handleCreateHabit
            }
          >
            <FaPlus />
            Add Habit
          </Button>
        </div>
      </Card>

      {/* ====================================
          VIEW SWITCHER
      ==================================== */}

      <div className="flex justify-center">
        <div className="inline-flex rounded-2xl border border-slate-800 bg-slate-950/70 p-1.5">
          <button
            type="button"
            onClick={() =>
              setActiveView(
                "weekly"
              )
            }
            className={[
              "flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold transition",
              activeView ===
              "weekly"
                ? "bg-cyan-500/10 text-cyan-300 shadow-sm"
                : "text-slate-500 hover:text-slate-300",
            ].join(
              " "
            )}
          >
            <FaTableCellsLarge />

            Weekly Tracker
          </button>

          <button
            type="button"
            onClick={() =>
              setActiveView(
                "monthly"
              )
            }
            className={[
              "flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold transition",
              activeView ===
              "monthly"
                ? "bg-cyan-500/10 text-cyan-300 shadow-sm"
                : "text-slate-500 hover:text-slate-300",
            ].join(
              " "
            )}
          >
            <FaCalendarDays />

            Monthly History
          </button>
        </div>
      </div>

      {/* ====================================
          WEEKLY VIEW
      ==================================== */}

      {activeView ===
        "weekly" && (
        <section className="space-y-5">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-400">
                Weekly Tracker
              </p>

              <h2 className="mt-2 text-3xl font-bold text-white">
                {
                  formatWeekRange(
                    selectedWeekStart,
                    selectedWeekEnd
                  )
                }
              </h2>

              <p className="mt-2 text-sm text-slate-400">
                {
                  weeklySummary.completedDays
                }{" "}
                of{" "}
                {
                  weeklySummary.scheduledDays
                }{" "}
                scheduled habit days completed.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                variant="secondary"
                onClick={
                  goPreviousWeek
                }
              >
                ← Previous
              </Button>

              <Button
                variant="secondary"
                onClick={
                  goCurrentWeek
                }
                disabled={
                  isCurrentWeek
                }
              >
                Today
              </Button>

              <Button
                variant="secondary"
                onClick={
                  goNextWeek
                }
              >
                Next →
              </Button>
            </div>
          </div>

          {activeHabits.length ===
          0 ? (
            <Card className="p-12 text-center">
              <FaBullseye className="mx-auto text-5xl text-cyan-400" />

              <h3 className="mt-6 text-2xl font-bold text-white">
                No Active Habits
              </h3>

              <p className="mx-auto mt-3 max-w-xl text-slate-400">
                Add your first habit above and it will appear here as a weekly tracking row.
              </p>
            </Card>
          ) : (
            <Card className="overflow-hidden p-0">
              <div className="overflow-x-auto">
                <div className="min-w-[1050px]">
                  {/* Header */}

                  <div className="grid grid-cols-[minmax(240px,1.7fr)_repeat(7,minmax(86px,0.7fr))_120px_110px] border-b border-slate-800 bg-slate-950/60">
                    <div className="flex items-center px-5 py-4">
                      <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                        Habit
                      </span>
                    </div>

                    {weekDates.map(
                      (
                        date,
                        index
                      ) => {
                        const dateString =
                          formatLocalDate(
                            date
                          );

                        const isToday =
                          dateString ===
                          today;

                        return (
                          <div
                            key={
                              dateString
                            }
                            className={[
                              "border-l border-slate-800 px-2 py-3 text-center",
                              isToday
                                ? "bg-cyan-500/10"
                                : "",
                            ].join(
                              " "
                            )}
                          >
                            <p
                              className={[
                                "text-[11px] font-semibold uppercase tracking-[0.15em]",
                                isToday
                                  ? "text-cyan-300"
                                  : "text-slate-500",
                              ].join(
                                " "
                              )}
                            >
                              {
                                WEEKDAYS[index]
                                  .shortLabel
                              }
                            </p>

                            <p
                              className={[
                                "mt-1 text-lg font-bold",
                                isToday
                                  ? "text-cyan-300"
                                  : "text-slate-200",
                              ].join(
                                " "
                              )}
                            >
                              {
                                date.getDate()
                              }
                            </p>
                          </div>
                        );
                      }
                    )}

                    <div className="flex items-center justify-center border-l border-slate-800 px-3 py-4">
                      <span className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                        Week
                      </span>
                    </div>

                    <div className="flex items-center justify-center border-l border-slate-800 px-3 py-4">
                      <span className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                        Streak
                      </span>
                    </div>
                  </div>

                  {/* Habit Rows */}

                  {activeHabits.map(
                    (
                      habit
                    ) => {
                      const progress =
                        getHabitWeekProgress(
                          habitState,
                          habit,
                          weekDates
                        );

                      const streaks =
                        HabitEngine.getStreakAnalytics(
                          habitState,
                          habit.id,
                          referenceDate
                        );

                      return (
                        <div
                          key={
                            habit.id
                          }
                          className="grid grid-cols-[minmax(240px,1.7fr)_repeat(7,minmax(86px,0.7fr))_120px_110px] border-b border-slate-800/80 last:border-b-0 transition hover:bg-slate-900/30"
                        >
                          {/* Habit */}

                          <div className="flex min-w-0 items-center justify-between gap-3 px-5 py-4">
                            <div className="min-w-0">
                              <p className="truncate font-semibold text-white">
                                {
                                  habit.name
                                }
                              </p>

                              <div className="mt-2 flex flex-wrap gap-1">
                                {WEEKDAYS.map(
                                  (
                                    day
                                  ) => {
                                    const active =
                                      habit.activeDays.includes(
                                        day.value
                                      );

                                    return (
                                      <span
                                        key={
                                          day.value
                                        }
                                        className={[
                                          "rounded-md px-1.5 py-0.5 text-[9px] font-bold uppercase",
                                          active
                                            ? "bg-cyan-500/10 text-cyan-400"
                                            : "bg-slate-900 text-slate-700",
                                        ].join(
                                          " "
                                        )}
                                      >
                                        {
                                          day.shortLabel.slice(
                                            0,
                                            1
                                          )
                                        }
                                      </span>
                                    );
                                  }
                                )}
                              </div>
                            </div>

                            <button
                              type="button"
                              title="Archive habit"
                              onClick={() =>
                                archiveHabit(
                                  habit.id
                                )
                              }
                              className="shrink-0 rounded-lg p-2 text-slate-600 transition hover:bg-slate-800 hover:text-slate-300"
                            >
                              <FaBoxArchive />
                            </button>
                          </div>

                          {/* Day Cells */}

                          {weekDates.map(
                            (
                              date
                            ) => {
                              const dateString =
                                formatLocalDate(
                                  date
                                );

                              const scheduled =
                                HabitEngine.isScheduledForDate(
                                  habit,
                                  dateString
                                );

                              const completed =
                                HabitEngine.isCompletedOnDate(
                                  habitState,
                                  habit.id,
                                  dateString
                                );

                              const isToday =
                                dateString ===
                                today;

                              const isFuture =
                                dateString >
                                today;

                              const canToggle =
                                scheduled &&
                                !isFuture;

                              return (
                                <div
                                  key={
                                    dateString
                                  }
                                  className={[
                                    "flex items-center justify-center border-l border-slate-800 px-2 py-4",
                                    isToday
                                      ? "bg-cyan-500/[0.04]"
                                      : "",
                                  ].join(
                                    " "
                                  )}
                                >
                                  {!scheduled ? (
                                    <div
                                      title="Rest day"
                                      className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-800 bg-slate-950/60 text-slate-700"
                                    >
                                      —
                                    </div>
                                  ) : (
                                    <button
                                      type="button"
                                      disabled={
                                        !canToggle
                                      }
                                      title={
                                        isFuture
                                          ? "Future scheduled day"
                                          : completed
                                            ? "Mark incomplete"
                                            : "Mark complete"
                                      }
                                      onClick={() => {
                                        if (
                                          !canToggle
                                        ) {
                                          return;
                                        }

                                        toggleHabit(
                                          habit.id,
                                          dateString
                                        );
                                      }}
                                      className={[
                                        "flex h-10 w-10 items-center justify-center rounded-xl border text-sm font-bold transition",
                                        completed
                                          ? "border-emerald-400/60 bg-emerald-400/15 text-emerald-300 shadow-[0_0_18px_rgba(52,211,153,0.08)]"
                                          : isFuture
                                            ? "cursor-not-allowed border-slate-800 bg-slate-900/40 text-slate-700"
                                            : isToday
                                              ? "border-cyan-500/50 bg-cyan-500/10 text-cyan-300 hover:bg-cyan-500/20"
                                              : "border-slate-700 bg-slate-900 text-slate-500 hover:border-cyan-500/40 hover:text-cyan-300",
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
                              );
                            }
                          )}

                          {/* Week */}

                          <div className="flex flex-col items-center justify-center border-l border-slate-800 px-3 py-4">
                            <span
                              className={[
                                "text-lg font-black",
                                progress.completionRate ===
                                100
                                  ? "text-emerald-400"
                                  : progress.completionRate >=
                                      60
                                    ? "text-cyan-400"
                                    : "text-slate-300",
                              ].join(
                                " "
                              )}
                            >
                              {
                                progress.completionRate
                              }
                              %
                            </span>

                            <span className="mt-1 text-[10px] text-slate-600">
                              {
                                progress.completedDays
                              }
                              /
                              {
                                progress.scheduledDays
                              }
                            </span>
                          </div>

                          {/* Streak */}

                          <div className="flex flex-col items-center justify-center border-l border-slate-800 px-3 py-4">
                            <div className="flex items-center gap-1.5 text-orange-300">
                              <FaFire className="text-xs" />

                              <span className="text-lg font-black">
                                {
                                  streaks.currentStreak
                                }
                              </span>
                            </div>

                            <span className="mt-1 text-[10px] text-slate-600">
                              best{" "}
                              {
                                streaks.longestStreak
                              }
                            </span>
                          </div>
                        </div>
                      );
                    }
                  )}
                </div>
              </div>

              {/* Legend */}

              <div className="flex flex-wrap items-center gap-x-6 gap-y-3 border-t border-slate-800 bg-slate-950/40 px-5 py-4 text-xs text-slate-500">
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded border border-emerald-400/60 bg-emerald-400/15" />
                  Completed
                </div>

                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded border border-slate-700 bg-slate-900" />
                  Scheduled
                </div>

                <div className="flex items-center gap-2">
                  <span className="flex h-3 w-3 items-center justify-center text-slate-700">
                    —
                  </span>
                  Rest day
                </div>

                <div className="ml-auto text-slate-600">
                  {
                    selectedWeekStartDate
                  }{" "}
                  →{" "}
                  {
                    selectedWeekEndDate
                  }
                </div>
              </div>
            </Card>
          )}
        </section>
      )}

      {/* ====================================
          MONTHLY VIEW
      ==================================== */}

      {activeView ===
        "monthly" && (
        <MonthlyHabitCalendar />
      )}

      {/* ====================================
          ARCHIVED HABITS
      ==================================== */}

      {archivedHabits.length >
        0 && (
        <section className="space-y-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-600">
              History
            </p>

            <h2 className="mt-2 text-xl font-bold text-slate-300">
              Archived Habits
            </h2>

            <p className="mt-2 text-sm text-slate-500">
              Archived habits keep their completion history and can be restored at any time.
            </p>
          </div>

          <Card className="divide-y divide-slate-800 p-0">
            {archivedHabits.map(
              (
                habit
              ) => {
                const streaks =
                  HabitEngine.getStreakAnalytics(
                    habitState,
                    habit.id,
                    referenceDate
                  );

                return (
                  <div
                    key={
                      habit.id
                    }
                    className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <p className="font-semibold text-slate-300">
                        {
                          habit.name
                        }
                      </p>

                      <p className="mt-1 text-xs text-slate-500">
                        Longest streak:{" "}
                        {
                          streaks.longestStreak
                        }{" "}
                        · History preserved
                      </p>
                    </div>

                    <Button
                      variant="secondary"
                      onClick={() =>
                        restoreHabit(
                          habit.id
                        )
                      }
                    >
                      <FaRotateLeft />
                      Restore
                    </Button>
                  </div>
                );
              }
            )}
          </Card>
        </section>
      )}
    </div>
  );
}