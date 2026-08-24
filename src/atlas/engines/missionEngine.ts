// ==========================================
// LifeOS ATLAS Mission Engine
// Version: 2.3
// ==========================================

import type {
  AtlasTask,
  SmartMission,
} from "../types";

export class MissionEngine {
  generate(
    tasks: AtlasTask[]
  ): SmartMission[] {
    return tasks
      .filter(
        (task) =>
          !task.completed
      )
      .slice(0, 5)
      .map((task) => ({
        title:
          task.title,

        priority:
          task.priority,

        estimatedMinutes:
          30,

        completed:
          task.completed,

        dueDate:
          task.dueDate,

        // Temporary until a real
        // mission-scoring engine exists.
        score:
          0,

        reason:
          "Unfinished mission",
      }));
  }
}