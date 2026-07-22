// ==========================================
// LifeOS ATLAS Mission Engine
// Version: 2.0
// ==========================================

import type { AtlasTask, SmartMission } from "../types";

export class MissionEngine {
  generate(tasks: AtlasTask[]): SmartMission[] {
    return tasks
      .filter((task) => !task.completed)
      .slice(0, 5)
      .map((task) => ({
        title: task.title,

        priority: task.priority,

        estimatedMinutes: 30,

        completed: task.completed,

        xp: task.xp,

        dueDate: task.dueDate,

        // Temporary scoring logic.
        // We'll replace this with the real Mission Score algorithm later.
        score: task.xp,

        reason: "Highest priority unfinished mission",
      }));
  }
}