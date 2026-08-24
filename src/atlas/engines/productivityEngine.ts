// ==========================================
// LifeOS ATLAS Productivity Engine
// Version: 2.2
// ==========================================

import type {
  AtlasTask,
  ProductivityAnalysis,
} from "../types";

export class ProductivityEngine {
  analyze(
    tasks: AtlasTask[]
  ): ProductivityAnalysis {
    const totalTasks =
      tasks.length;

    const completedTasks =
      tasks.filter(
        (task) =>
          task.completed
      ).length;

    const pendingTasks =
      totalTasks -
      completedTasks;

    // ==========================================
    // Temporary Task Timing Metrics
    // ==========================================
    //
    // These remain placeholders until ATLAS
    // receives trustworthy time-aware analytics.
    // ==========================================

    const overdueTasks = 0;

    const dueTodayTasks = 0;

    const upcomingTasks = 0;

    // ==========================================
    // Completion Rate
    // ==========================================

    const completionRate =
      totalTasks === 0
        ? 0
        : Math.round(
            (
              completedTasks /
              totalTasks
            ) * 100
          );

    // ==========================================
    // Temporary Focus Score
    // ==========================================

    const focusScore =
      completionRate;

    let productivityLevel:
      | "Low"
      | "Average"
      | "High";

    if (
      completionRate >= 80
    ) {
      productivityLevel =
        "High";
    } else if (
      completionRate >= 50
    ) {
      productivityLevel =
        "Average";
    } else {
      productivityLevel =
        "Low";
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
    };
  }

  isImproving(
    current: number,
    previous: number
  ): boolean {
    return (
      current >
      previous
    );
  }

  isAtRisk(
    completionRate: number
  ): boolean {
    return (
      completionRate <
      40
    );
  }
}