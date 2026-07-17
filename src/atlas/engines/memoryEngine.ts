// ==========================================
// LifeOS ATLAS Memory Engine
// Version: 1.0
// ==========================================

import type { AtlasTask, AtlasHabit } from "../types";

export interface MemorySnapshot {
  date: string;
  completedTasks: number;
  totalTasks: number;
  completionRate: number;
  habitStreaks: number;
}

export class MemoryEngine {
  /**
   * Create a daily snapshot of the user's progress.
   */
  createSnapshot(
    tasks: AtlasTask[],
    habits: AtlasHabit[]
  ): MemorySnapshot {
    const totalTasks = tasks.length;

    const completedTasks = tasks.filter(
      (task) => task.completed
    ).length;

    const completionRate =
      totalTasks === 0
        ? 0
        : Math.round((completedTasks / totalTasks) * 100);

    const habitStreaks = habits.reduce(
      (total, habit) => total + habit.streak,
      0
    );

    return {
      date: new Date().toISOString(),
      completedTasks,
      totalTasks,
      completionRate,
      habitStreaks,
    };
  }

  /**
   * Save today's snapshot.
   */
  saveSnapshot(snapshot: MemorySnapshot): void {
    const history = this.getHistory();

    history.push(snapshot);

    localStorage.setItem(
      "atlas-memory",
      JSON.stringify(history)
    );
  }

  /**
   * Load all saved snapshots.
   */
  getHistory(): MemorySnapshot[] {
    const data = localStorage.getItem("atlas-memory");

    if (!data) {
      return [];
    }

    try {
      return JSON.parse(data);
    } catch {
      return [];
    }
  }

  /**
   * Get the most recent snapshot.
   */
  getLatestSnapshot(): MemorySnapshot | null {
    const history = this.getHistory();

    if (history.length === 0) {
      return null;
    }

    return history[history.length - 1];
  }

  /**
   * Clear all stored memory.
   */
  clearMemory(): void {
    localStorage.removeItem("atlas-memory");
  }
}