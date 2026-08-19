// ==========================================
// LifeOS Achievement Engine
// Version: 2.0
// ==========================================

import {
  ACHIEVEMENTS_BY_ID,
} from "../shared/achievements";

import type {
  Achievement,
} from "../shared/achievements";

import type {
  ExecutionRecord,
} from "../shared/execution";

export class AchievementEngine {
  static getUnlockedAchievements(
    executionHistory: ExecutionRecord[],
    _totalXP: number,
    level: number
  ): Achievement[] {
    const unlocked: Achievement[] = [];

    const completedTasks =
      executionHistory.filter(
        (record) =>
          record.type === "task_completed"
      ).length;

    const completedWeeklyTargets =
      executionHistory.filter(
        (record) =>
          record.type ===
          "weekly_completed"
      ).length;

    const completedMonthlyTargets =
      executionHistory.filter(
        (record) =>
          record.type ===
          "monthly_completed"
      ).length;

    const completedLifeGoals =
      executionHistory.filter(
        (record) =>
          record.type ===
          "life_goal_completed"
      ).length;

    if (completedTasks >= 1) {
      unlocked.push(
        ACHIEVEMENTS_BY_ID["first-task"]
      );
    }

    if (completedTasks >= 10) {
      unlocked.push(
        ACHIEVEMENTS_BY_ID["ten-tasks"]
      );
    }

    if (completedWeeklyTargets >= 1) {
      unlocked.push(
        ACHIEVEMENTS_BY_ID["first-weekly"]
      );
    }

    if (completedMonthlyTargets >= 1) {
      unlocked.push(
        ACHIEVEMENTS_BY_ID["first-monthly"]
      );
    }

    if (completedLifeGoals >= 1) {
      unlocked.push(
        ACHIEVEMENTS_BY_ID["first-life-goal"]
      );
    }

    if (level >= 5) {
      unlocked.push(
        ACHIEVEMENTS_BY_ID["level-5"]
      );
    }

    if (level >= 10) {
      unlocked.push(
        ACHIEVEMENTS_BY_ID["level-10"]
      );
    }

    return unlocked;
  }
}