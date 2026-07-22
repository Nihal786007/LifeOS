// ==========================================
// LifeOS ATLAS Recommendation Engine
// Version: 2.0
// ==========================================

import type {
  ProductivityAnalysis,
  Recommendation,
} from "../types";

export class RecommendationEngine {
  generate(
    analysis: ProductivityAnalysis
  ): Recommendation[] {

    const recommendations: Recommendation[] = [];

    // Focus Score
    if (analysis.focusScore < 50) {
      recommendations.push({
        title: "Improve Your Focus",
        description:
          "Complete an important mission before starting something new.",

        missionTitle: "Highest Priority Mission",

        priority: "high",

        reason: "Your current Focus Score is low.",
      });
    }

    // Overdue Tasks
    if (analysis.overdueTasks > 0) {
      recommendations.push({
        title: "Clear Overdue Missions",
        description:
          "Finish overdue work before taking on new missions.",

        missionTitle: "Overdue Mission",

        priority: "high",

        reason: `${analysis.overdueTasks} overdue mission(s) detected.`,
      });
    }

    // Due Today
    if (analysis.dueTodayTasks > 0) {
      recommendations.push({
        title: "Finish Today's Missions",
        description:
          "Complete tasks that are due today.",

        missionTitle: "Today's Mission",

        priority: "medium",

        reason: `${analysis.dueTodayTasks} mission(s) are due today.`,
      });
    }

    // Everything looks good
    if (recommendations.length === 0) {
      recommendations.push({
        title: "Great Progress",
        description:
          "You're managing your missions well. Keep the momentum going.",

        missionTitle: "Continue Current Work",

        priority: "low",

        reason: "No urgent missions detected.",
      });
    }

    return recommendations;
  }
}