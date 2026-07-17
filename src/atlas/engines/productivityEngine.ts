// ==========================================
// LifeOS ATLAS Productivity Engine
// Version: 1.0
// ==========================================

import type { AtlasTask, ProductivityAnalysis } from "../types";

export class ProductivityEngine {
  analyze(tasks: AtlasTask[]): ProductivityAnalysis {
    const totalTasks = tasks.length;

    const completedTasks = tasks.filter(
      (task) => task.completed
    ).length;

    const completionRate =
      totalTasks === 0
        ? 0
        : Math.round((completedTasks / totalTasks) * 100);

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
      completionRate,
      productivityLevel,
    };
  }

  isImproving(current: number, previous: number): boolean {
    return current > previous;
  }

  isAtRisk(completionRate: number): boolean {
    return completionRate < 40;
  }
}