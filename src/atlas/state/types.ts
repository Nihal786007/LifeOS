// ==========================================
// LifeOS ATLAS Canonical State
// ==========================================
//
// This contract is ATLAS's read-only view of
// the trusted LifeOS domain systems. Intelligence
// engines may derive insight from this state, but
// must never mutate it.
// ==========================================

import type {
  Capture,
  Habit,
  LifeGoal,
  MonthlyTarget,
  Task,
  UserProfile,
  WeeklyTarget,
} from "../../shared/types";

import type {
  ExecutionRecord,
} from "../../shared/execution";

export interface AtlasStateInput {
  tasks: Task[];
  habits: Habit[];
  lifeGoals: LifeGoal[];
  monthlyTargets: MonthlyTarget[];
  weeklyTargets: WeeklyTarget[];
  executionHistory: ExecutionRecord[];
  captures: Capture[];
  profile: UserProfile;
}

export interface AtlasCanonicalState {
  capturedAt: string;
  tasks: readonly Task[];
  habits: readonly Habit[];
  lifeGoals: readonly LifeGoal[];
  monthlyTargets: readonly MonthlyTarget[];
  weeklyTargets: readonly WeeklyTarget[];
  executionHistory: readonly ExecutionRecord[];
  captures: readonly Capture[];
  profile: UserProfile;
}
