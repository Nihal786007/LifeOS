// ==========================================
// LifeOS ATLAS Briefing Engine
// Version: 1.0
// ==========================================

import type {
  DailyBriefing,
  ProductivityAnalysis,
} from "../types";

export class BriefingEngine {
  create(
    analysis: ProductivityAnalysis
  ): DailyBriefing {

    let difficulty: "Easy" | "Medium" | "Hard" = "Medium";

    if (analysis.completionRate >= 80)
      difficulty = "Hard";

    if (analysis.completionRate < 40)
      difficulty = "Easy";

    return {
      greeting: "Welcome Back!",
      summary: `You completed ${analysis.completedTasks} of ${analysis.totalTasks} tasks.`,
      recommendation:
        "Stay focused on your highest priority mission.",
      productivityScore: analysis.completionRate,
      focusTime: "4 PM - 7 PM",
      missionDifficulty: difficulty,
    };
  }
}