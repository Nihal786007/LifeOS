// ==========================================
// LifeOS ATLAS Engine
// Version: 5.0
// Central Intelligence Coordinator
// ==========================================

import type {
  AtlasHabit,
  AtlasTask,
  AtlasResult,
} from "./types";

import { AchievementEngine } from "./engines/achievementEngine";
import { BriefingEngine } from "./engines/briefingEngine";
import { MemoryEngine } from "./engines/memoryEngine";
import { MissionEngine } from "./engines/missionEngine";
import { PersonalityEngine } from "./engines/personalityEngine";
import { PredictionEngine } from "./engines/predictionEngine";
import { ProductivityEngine } from "./engines/productivityEngine";
import { RecommendationEngine } from "./engines/recommendationEngine";
import { TrendEngine } from "./engines/trendEngine";
import { XPEngine } from "./engines/xpEngine";

export class AtlasEngine {
  // ==========================
  // Engine Modules
  // ==========================

  private memory = new MemoryEngine();
  private productivity = new ProductivityEngine();
  private recommendation = new RecommendationEngine();
  private prediction = new PredictionEngine();
  private mission = new MissionEngine();
  private briefing = new BriefingEngine();
  private trend = new TrendEngine();
  private xp = new XPEngine();
  private achievement = new AchievementEngine();
  private personality = new PersonalityEngine();

  // ==========================
  // Shared Data
  // ==========================

  private tasks: AtlasTask[];
  private habits: AtlasHabit[];

  constructor(tasks: AtlasTask[], habits: AtlasHabit[]) {
    this.tasks = tasks;
    this.habits = habits;
  }

  // ==========================
  // Main ATLAS Execution
  // ==========================

  public run(): AtlasResult {
    // Productivity Analysis
    const analysis = this.productivity.analyze(this.tasks);

    // Memory Snapshot
    const snapshot = this.memory.createSnapshot(
      this.tasks,
      this.habits
    );

    this.memory.saveSnapshot(snapshot);

    // History
    const history = this.memory.getHistory();

    // Final Report
    return {
      analysis,

      briefing: this.briefing.create(analysis),

      prediction: this.prediction.predict(
        analysis.completionRate
      ),

      recommendations:
        this.recommendation.generate(analysis),

      missions: this.mission.generate(this.tasks),

      xp: this.xp.calculate(
        analysis.completedTasks
      ),

      achievements:
        this.achievement.unlock(
          analysis.completedTasks
        ),

      trend: this.trend.latestTrend(history),

      averageCompletion:
        this.trend.averageCompletion(history),

     greeting: this.personality.greeting(
  analysis.completedTasks,
  analysis.totalTasks,
  analysis.completionRate
),

motivation: this.personality.motivation(),
    };
  }
}