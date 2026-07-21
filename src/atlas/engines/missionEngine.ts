// ==========================================
// LifeOS ATLAS Mission Engine
// Version: 1.0
// ==========================================

import type { AtlasTask, SmartMission } from "../types";

export class MissionEngine {
  generate(tasks: AtlasTask[]): SmartMission[] {
    return tasks
      .filter((task) => !task.completed)
      .slice(0, 5)
      .map((task, index) => ({
        title: task.title,
        priority: index + 1,
        estimatedMinutes: 30,
        completed: false,
      }));
  }
}