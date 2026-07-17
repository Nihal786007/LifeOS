// ==========================================
// LifeOS ATLAS Recommendation Engine
// Version: 1.0
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

    if (analysis.completionRate < 40) {
      recommendations.push({
        title: "Focus on One Task",
        description:
          "Complete one important task before starting another.",
      });
    }

    if (analysis.completionRate >= 40) {
      recommendations.push({
        title: "Keep Going",
        description:
          "You're making steady progress today.",
      });
    }

    if (analysis.completionRate >= 80) {
      recommendations.push({
        title: "Excellent Work",
        description:
          "Your productivity is outstanding today.",
      });
    }

    return recommendations;
  }
}