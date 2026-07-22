// ==========================================
// LifeOS ATLAS Productivity Engine
// Version: 2.0
// ==========================================

import type { AtlasTask, ProductivityAnalysis } from "../types";

export class ProductivityEngine {
  analyze(tasks: AtlasTask[]): ProductivityAnalysis {
    const totalTasks = tasks.length;

    const completedTasks = tasks.filter(
      (task) => task.completed
    ).length;

    const pendingTasks = totalTasks - completedTasks;

    // Temporary values (we'll make these smart in the next step)
    const overdueTasks = 0;
    const dueTodayTasks = 0;
    const upcomingTasks = 0;

    const completionRate =
      totalTasks === 0
        ? 0
        : Math.round((completedTasks / totalTasks) * 100);

    const potentialXP = tasks
      .filter((task) => !task.completed)
      .reduce((sum, task) => sum + task.xp, 0);

    // Temporary Focus Score
    const focusScore = completionRate;

    let productivityLevel: "Low" | "Average" | "High";

    if (completionRate >= 80) {
      productivityLevel = "High";
    } else if (completionRate >= 50) {
      productivityLevel = "Average";
    } else {
      productivityLevel = "Low";
    }

    return {
      completedTasks,
      totalTasks,
      pendingTasks,

      completionRate,
      productivityLevel,
      focusScore,

      overdueTasks,
      dueTodayTasks,
      upcomingTasks,

      potentialXP,
    };
  }

  isImproving(current: number, previous: number): boolean {
    return current > previous;
  }

  isAtRisk(completionRate: number): boolean {
    return completionRate < 40;
  }
}