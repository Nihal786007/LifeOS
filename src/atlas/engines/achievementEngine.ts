// ==========================================
// LifeOS ATLAS Achievement Engine
// Version: 1.0
// ==========================================

import type { Achievement } from "../types";

export class AchievementEngine {
  unlock(completedTasks: number): Achievement[] {
    const achievements: Achievement[] = [];

    if (completedTasks >= 1) {
      achievements.push({
        id: "first-task",
        title: "First Step",
        description: "Complete your first task.",
        unlocked: true,
      });
    }

    if (completedTasks >= 10) {
      achievements.push({
        id: "task-master",
        title: "Task Master",
        description: "Complete 10 tasks.",
        unlocked: true,
      });
    }

    if (completedTasks >= 25) {
      achievements.push({
        id: "productivity-pro",
        title: "Productivity Pro",
        description: "Complete 25 tasks.",
        unlocked: true,
      });
    }

    return achievements;
  }
}