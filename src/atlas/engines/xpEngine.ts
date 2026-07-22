// ==========================================
// LifeOS ATLAS XP Engine
// Version: 2.0
// ==========================================

import type { XPData } from "../types";

export class XPEngine {
  calculate(completedTasks: number): XPData {
    const xp = completedTasks * 20;

    const level = Math.floor(xp / 100) + 1;

    const nextLevelXP = level * 100;

    // Temporary streak logic
    const streak = completedTasks > 0 ? 1 : 0;

    return {
      xp,

      todayXP: xp,

      weeklyXP: xp,

      level,

      nextLevelXP,

      streak,

      longestStreak: streak,
    };
  }
}