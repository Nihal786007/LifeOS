// ==========================================
// LifeOS - ATLAS Type Definitions
// ==========================================
//
// This file contains all ATLAS-specific types.
// Shared application models (Task, Habit, etc.)
// are imported from src/shared/types.ts
//
// ==========================================

import type { Habit, Task } from "../shared/types";

// ==========================================
// Shared Models
// ==========================================

export type AtlasTask = Task;
export type AtlasHabit = Habit;

// ==========================================
// Daily Briefing
// ==========================================

export interface DailyBriefing {
  greeting: string;
  summary: string;
  recommendation: string;
  productivityScore: number;
  focusTime: string;
  missionDifficulty: "Easy" | "Medium" | "Hard";
}

// ==========================================
// Smart Mission
// ==========================================

export interface SmartMission {
  title: string;
  priority: number;
  estimatedMinutes: number;
  completed: boolean;
}

// ==========================================
// Productivity Analysis
// ==========================================

export interface ProductivityAnalysis {
  completedTasks: number;
  totalTasks: number;
  completionRate: number;
  productivityLevel: "Low" | "Average" | "High";
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

export interface XPData {
  xp: number;
  level: number;
  streak: number;
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
}
// ==========================================
// ATLAS Result
// ==========================================

export interface AtlasResult {
  analysis: ProductivityAnalysis;
  briefing: DailyBriefing;
  prediction: ProductivityPrediction;
  recommendations: Recommendation[];
  missions: SmartMission[];
  xp: XPData;
  achievements: Achievement[];
  trend: string;
  averageCompletion: number;
  greeting: string;
  motivation: string;
}