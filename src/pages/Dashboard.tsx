// ==========================================
// LifeOS Dashboard
// Version: 2.1
// ==========================================
//
// Dashboard now uses:
// - AppContext only for Profile
// - TaskContext for Universal Tasks
// - HabitContext + HabitEngine for Habits 2.0
//
// Legacy AppContext habit ownership is no
// longer consumed by the Dashboard.
// ==========================================

import {
  useMemo,
} from "react";

import HeroSection from "../components/dashboard/HeroSection";
import PerformanceOverview from "../components/dashboard/PerformanceOverview";
import AtlasCommandCenter from "../components/dashboard/AtlasCommandCenter";
import AtlasPulse from "../components/dashboard/AtlasPulse";

import RecentCaptures from "../components/capture/RecentCaptures";

import {
  AtlasEngine,
} from "../atlas/atlasEngine";

import type {
  AtlasHabit,
} from "../atlas/types";

import {
  useApp,
} from "../context/AppContext";

import {
  useTasks,
} from "../context/TaskContext";

import {
  useHabits,
} from "../context/HabitContext";

import {
  HabitEngine,
} from "../engines/HabitEngine";

export default function Dashboard() {
  // ========================================
  // Profile
  // ========================================

  const {
    profile,
  } =
    useApp();

  // ========================================
  // Universal Tasks
  // ========================================

  const {
    tasks,
  } =
    useTasks();

  // ========================================
  // Habits 2.0
  // ========================================

  const {
    habitState,
    habits,
  } =
    useHabits();

  const referenceDate =
    useMemo(
      () =>
        new Date(),
      []
    );

  const atlasHabits =
    useMemo<
      AtlasHabit[]
    >(
      () =>
        habits
          .filter(
            (habit) =>
              !habit.archived
          )
          .map(
            (habit) => ({
              id:
                habit.id,

              name:
                habit.name,

              streak:
                HabitEngine.getCurrentStreak(
                  habitState,
                  habit.id,
                  referenceDate
                ),
            })
          ),
      [
        habits,
        habitState,
        referenceDate,
      ]
    );

  // ========================================
  // ATLAS
  // ========================================
  //
  // ATLAS receives:
  // - canonical Universal Tasks
  // - derived Habits 2.0 intelligence
  //
  // It no longer receives legacy Habit state
  // from AppContext.
  // ========================================

  const atlas =
    new AtlasEngine(
      tasks,
      atlasHabits
    );

  const atlasData =
    atlas.run();

  return (
    <div className="space-y-8">
      {/* Hero */}

      <HeroSection
        name={
          profile.name
        }
        atlas={
          atlasData
        }
      />

      {/* Performance Overview */}

      <PerformanceOverview
        atlas={
          atlasData
        }
      />

      {/* Dashboard Content */}

      <div className="grid gap-8 xl:grid-cols-3">
        <div className="space-y-8 xl:col-span-2">
          <AtlasCommandCenter
            atlas={
              atlasData
            }
          />

          <RecentCaptures />
        </div>

        <AtlasPulse
          atlas={
            atlasData
          }
        />
      </div>
    </div>
  );
}