// ==========================================
// LifeOS ATLAS Trend Engine
// Version: 1.0
// ==========================================

import type { MemorySnapshot } from "./memoryEngine";

export class TrendEngine {
  averageCompletion(
    history: MemorySnapshot[]
  ): number {

    if (history.length === 0) {
      return 0;
    }

    const total = history.reduce(
      (sum, day) => sum + day.completionRate,
      0
    );

    return Math.round(total / history.length);
  }

  latestTrend(
    history: MemorySnapshot[]
  ): "Improving" | "Declining" | "Stable" {

    if (history.length < 2) {
      return "Stable";
    }

    const latest =
      history[history.length - 1].completionRate;

    const previous =
      history[history.length - 2].completionRate;

    if (latest > previous) return "Improving";

    if (latest < previous) return "Declining";

    return "Stable";
  }
}