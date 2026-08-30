// ==========================================
// LifeOS - ATLAS Type Definitions
// Version: 2.3
// ==========================================
//
// ATLAS-specific types.
//
// Shared application models such as Task
// remain imported from shared/types.
//
// Habit intelligence is now represented by
// a dedicated ATLAS read model instead of
// depending on the legacy Habit model.
//
// ==========================================

import type {
  Task,
} from "../shared/types";

// ==========================================
// Shared Models
// ==========================================

export type AtlasTask =
  Task;

// ==========================================
// Habit Read Model
// ==========================================
//
// This is NOT canonical habit state.
//
// Habits 2.0 owns:
// - HabitDefinition
// - HabitCompletion history
//
// HabitEngine derives streak information.
//
// ATLAS receives only the small derived
// representation it currently needs.
// ==========================================

export interface AtlasHabit {
  id: number;

  name: string;

  streak: number;
}

// ==========================================
// Daily Briefing
// ==========================================

export interface DailyBriefing {
  greeting: string;

  summary: string;

  recommendation: string;

  focusScore: number;

  overdueTasks: number;

  dueTodayTasks: number;

  upcomingTasks: number;

  recommendedMission: string;

  motivation: string;
}

// ==========================================
// Smart Mission
// ==========================================

export interface SmartMission {
  title: string;

  priority:
    | "low"
    | "medium"
    | "high";

  estimatedMinutes: number;

  completed: boolean;

  dueDate?: string;

  score: number;

  reason: string;
}

// ==========================================
// Productivity Analysis
// ==========================================

export interface ProductivityAnalysis {
  completedTasks: number;

  totalTasks: number;

  completionRate: number;

  productivityLevel:
    | "Low"
    | "Average"
    | "High";

  overdueTasks: number;

  dueTodayTasks: number;

  upcomingTasks: number;

  pendingTasks: number;

  focusScore: number;
}

// ==========================================
// Productivity Prediction
// ==========================================

export interface ProductivityPrediction {
  successChance: number;

  burnoutRisk: number;

  recommendedBreak: boolean;
}

// ==========================================
// XP System
// ==========================================
//
// Legacy ATLAS XP representation.
//
// This is separate from the new XPContext
// read model and will be migrated during the
// broader ATLAS rebuild.
// ==========================================

export interface XPData {
  xp: number;

  todayXP: number;

  weeklyXP: number;

  level: number;

  nextLevelXP: number;

  streak: number;

  longestStreak: number;
}

// ==========================================
// Achievements
// ==========================================

export interface Achievement {
  id: string;

  title: string;

  description: string;

  unlocked: boolean;
}

// ==========================================
// Recommendations
// ==========================================

export interface Recommendation {
  title: string;

  description: string;

  missionTitle: string;

  priority:
    | "low"
    | "medium"
    | "high";

  reason: string;
}

// ==========================================
// ATLAS Result
// ==========================================

export interface AtlasResult {
  analysis:
    ProductivityAnalysis;

  briefing:
    DailyBriefing;

  prediction:
    ProductivityPrediction;

  recommendations:
    Recommendation[];

  missions:
    SmartMission[];

  xp:
    XPData;

  achievements:
    Achievement[];

  trend:
    string;

  averageCompletion:
    number;

  greeting:
    string;

  motivation:
    string;
}

// ==========================================
// Intent Engine
// ==========================================

export type AtlasDecisionType =
  | "task"
  | "calendar"
  | "habit";

export interface IntentResult {
  type:
    AtlasDecisionType;

  confidence:
    number;

  title:
    string;

  actionId:
    | "create-task"
    | "create-calendar-event"
    | "create-habit";

  actionLabel:
    string;

  reason:
    string;
}

// ==========================================
// Intent Package
// Shared object used by all ATLAS engines
// ==========================================

export interface IntentPackage {
  // Original user input
  originalText:
    string;

  // Intent detected by IntentEngine
  intent:
    | "task"
    | "calendar"
    | "habit"
    | "unknown";

  // Confidence of the detected intent
  confidence:
    number;

  // Parsed information
  title?:
    string;

  dueDate?:
    string;

  time?:
    string;

  priority?:
    | "low"
    | "medium"
    | "high";
}