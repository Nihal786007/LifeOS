// ==========================================
// LifeOS Habits Page
// Version: 2.0
// ==========================================
//
// First live UI for Habits 2.0.
//
// Responsibilities:
// - Read canonical HabitContext state
// - Create scheduled habits
// - Complete/uncomplete today's habits
// - Display derived streaks
// - Archive/restore habits
//
// IMPORTANT:
// - No AppContext habit ownership
// - No stored streak values
// - No stored completedToday values
// - All completion state is date-based
// - Final spreadsheet tracker comes next
// ==========================================

import {
  useMemo,
  useState,
} from "react";

import {
  FaBoxArchive,
  FaBullseye,
  FaCircleCheck,
  FaFire,
  FaPlus,
  FaRotateLeft,
} from "react-icons/fa6";

import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import PageHero from "../components/ui/PageHero";
import StatCard from "../components/ui/StatCard";

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
  HabitWeekday,
} from "../shared/habits";

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
    shortLabel: "M",
    fullLabel: "Monday",
  },
  {
    value: "tuesday",
    shortLabel: "T",
    fullLabel: "Tuesday",
  },
  {
    value: "wednesday",
    shortLabel: "W",
    fullLabel: "Wednesday",
  },
  {
    value: "thursday",
    shortLabel: "T",
    fullLabel: "Thursday",
  },
  {
    value: "friday",
    shortLabel: "F",
    fullLabel: "Friday",
  },
  {
    value: "saturday",
    shortLabel: "S",
    fullLabel: "Saturday",
  },
  {
    value: "sunday",
    shortLabel: "S",
    fullLabel: "Sunday",
  },
];

const EVERY_DAY: HabitWeekday[] =
  WEEKDAYS.map(
    (day) =>
      day.value
  );

// ==========================================
// Local Date Helper
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

  // ========================================
  // Day Selection
  // ========================================

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
      <PageHero
        badge="Habits 2.0"
        title="Build Consistency"
        description="Track the days that matter, build real streaks, and turn repeated action into measurable progress."
      >
        <Card className="border-orange-500/20 bg-orange-500/5">
          <p className="text-sm uppercase tracking-[0.2em] text-orange-300">
            Today's Progress
          </p>

          <div className="mt-4 flex items-end gap-3">
            <h2 className="text-5xl font-black text-white">
              {todayProgress}%
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
            <FaBullseye />
          }
          title="Scheduled Today"
          value={
            scheduledToday.length
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
          <div className="flex-1">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-400">
              New Habit
            </p>

            <h2 className="mt-2 text-2xl font-bold text-white">
              Add something worth repeating
            </h2>

            <p className="mt-2 max-w-2xl text-sm text-slate-400">
              Choose exactly which days this habit belongs to.
              Inactive days will never break its streak.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={
                selectEveryDay
              }
              className="rounded-lg border border-slate-700 px-3 py-2 text-xs font-medium text-slate-300 transition hover:border-cyan-500/50 hover:text-white"
            >
              Every Day
            </button>
          </div>
        </div>

        <div className="mt-7 grid gap-5 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-end">
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
                (day) => {
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
                      title={
                        day.fullLabel
                      }
                      onClick={() =>
                        toggleSelectedDay(
                          day.value
                        )
                      }
                      className={[
                        "flex h-10 w-10 items-center justify-center rounded-xl border text-sm font-semibold transition",
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
          ACTIVE HABITS
      ==================================== */}

      <section className="space-y-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
            Active System
          </p>

          <h2 className="mt-2 text-2xl font-bold text-white">
            Your Habits
          </h2>
        </div>

        {activeHabits.length ===
        0 ? (
          <Card className="p-10 text-center">
            <FaBullseye className="mx-auto text-5xl text-cyan-400" />

            <h3 className="mt-6 text-2xl font-bold">
              No Habits Yet
            </h3>

            <p className="mx-auto mt-3 max-w-xl text-slate-400">
              Create your first Habits 2.0 habit above.
              Its schedule and completion history will be tracked
              by exact calendar date.
            </p>
          </Card>
        ) : (
          <div className="grid gap-4">
            {activeHabits.map(
              (habit) => {
                const scheduled =
                  HabitEngine.isScheduledForDate(
                    habit,
                    today
                  );

                const completed =
                  HabitEngine.isCompletedOnDate(
                    habitState,
                    habit.id,
                    today
                  );

                const streaks =
                  HabitEngine.getStreakAnalytics(
                    habitState,
                    habit.id,
                    referenceDate
                  );

                return (
                  <Card
                    key={
                      habit.id
                    }
                    className="p-6"
                  >
                    <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-3">
                          <h3 className="text-xl font-bold text-white">
                            {
                              habit.name
                            }
                          </h3>

                          {scheduled ? (
                            <span className="rounded-full border border-cyan-500/20 bg-cyan-500/10 px-2.5 py-1 text-xs font-medium text-cyan-300">
                              Scheduled Today
                            </span>
                          ) : (
                            <span className="rounded-full border border-slate-700 bg-slate-800/70 px-2.5 py-1 text-xs font-medium text-slate-400">
                              Rest Day
                            </span>
                          )}
                        </div>

                        {habit.description && (
                          <p className="mt-2 text-sm text-slate-400">
                            {
                              habit.description
                            }
                          </p>
                        )}

                        <div className="mt-4 flex flex-wrap items-center gap-5 text-sm">
                          <div className="flex items-center gap-2 text-orange-300">
                            <FaFire />

                            <span>
                              Current{" "}
                              <strong>
                                {
                                  streaks.currentStreak
                                }
                              </strong>
                            </span>
                          </div>

                          <div className="text-slate-400">
                            Best{" "}
                            <strong className="text-slate-200">
                              {
                                streaks.longestStreak
                              }
                            </strong>
                          </div>

                          <div className="flex gap-1.5">
                            {WEEKDAYS.map(
                              (
                                day
                              ) => (
                                <span
                                  key={
                                    day.value
                                  }
                                  title={
                                    day.fullLabel
                                  }
                                  className={[
                                    "flex h-7 w-7 items-center justify-center rounded-lg text-[11px] font-semibold",
                                    habit.activeDays.includes(
                                      day.value
                                    )
                                      ? "bg-cyan-500/10 text-cyan-300"
                                      : "bg-slate-900 text-slate-600",
                                  ].join(
                                    " "
                                  )}
                                >
                                  {
                                    day.shortLabel
                                  }
                                </span>
                              )
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-3">
                        <Button
                          disabled={
                            !scheduled
                          }
                          variant={
                            completed
                              ? "primary"
                              : "secondary"
                          }
                          onClick={() =>
                            toggleHabit(
                              habit.id,
                              today
                            )
                          }
                        >
                          <FaCircleCheck />

                          {completed
                            ? "Completed"
                            : scheduled
                              ? "Complete Today"
                              : "Not Scheduled"}
                        </Button>

                        <Button
                          variant="secondary"
                          onClick={() =>
                            archiveHabit(
                              habit.id
                            )
                          }
                        >
                          <FaBoxArchive />
                          Archive
                        </Button>
                      </div>
                    </div>
                  </Card>
                );
              }
            )}
          </div>
        )}
      </section>

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
          </div>

          <Card className="divide-y divide-slate-800 p-0">
            {archivedHabits.map(
              (habit) => (
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
                      History preserved
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
              )
            )}
          </Card>
        </section>
      )}
    </div>
  );
}