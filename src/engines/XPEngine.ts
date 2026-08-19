// ==========================================
// LifeOS XP Engine
// Version: 1.0
// ==========================================

import {
  XP_PER_LEVEL,
  XP_REWARDS,
} from "../shared/xp";

export class XPEngine {
  // ==========================================
  // Rewards
  // ==========================================

  static taskXP(): number {
    return XP_REWARDS.TASK;
  }

  static weeklyTargetXP(): number {
    return XP_REWARDS.WEEKLY_TARGET;
  }

  static monthlyTargetXP(): number {
    return XP_REWARDS.MONTHLY_TARGET;
  }

  static lifeGoalXP(): number {
    return XP_REWARDS.LIFE_GOAL;
  }

  // ==========================================
  // Levels
  // ==========================================

  static getLevel(totalXP: number): number {
    return (
      Math.floor(totalXP / XP_PER_LEVEL) + 1
    );
  }

  static getCurrentLevelXP(
    totalXP: number
  ): number {
    return totalXP % XP_PER_LEVEL;
  }

  static getXPNeededForNextLevel(
    totalXP: number
  ): number {
    return (
      XP_PER_LEVEL -
      this.getCurrentLevelXP(totalXP)
    );
  }

  static getLevelProgress(
    totalXP: number
  ): number {
    return Math.floor(
      (this.getCurrentLevelXP(totalXP) /
        XP_PER_LEVEL) *
        100
    );
  }
}