// ==========================================
// LifeOS Planning Transition Engine
// Version: 1.0
// ==========================================

import type {
  ExecutionRecord,
  ExecutionType,
} from "../shared/execution";

import type {
  PlanningState,
} from "./PlanningKernel";

// ==========================================
// Transition Engine
// ==========================================

export class PlanningTransitionEngine {
  /**
   * Detects automatic planning completion-state
   * changes caused by progress recalculation.
   *
   * Tasks are intentionally excluded here because
   * task execution events are already produced by
   * ExecutionService.
   *
   * Delete events are also excluded because they are
   * explicitly produced by ExecutionService.
   */
  static detectTransitions(
    previousState: PlanningState,
    nextState: PlanningState,
    existingRecords: ExecutionRecord[] = []
  ): ExecutionRecord[] {
    const records: ExecutionRecord[] = [];

    // ==========================================
    // Weekly Targets
    // ==========================================

    for (const nextTarget of nextState.weeklyTargets) {
      const previousTarget =
        previousState.weeklyTargets.find(
          (target) =>
            target.id === nextTarget.id
        );

      if (!previousTarget) {
        continue;
      }

      if (
        !previousTarget.completed &&
        nextTarget.completed
      ) {
        this.addRecord(
          records,
          existingRecords,
          "weekly_completed",
          nextTarget.id,
          nextTarget.title
        );
      }

      if (
        previousTarget.completed &&
        !nextTarget.completed
      ) {
        this.addRecord(
          records,
          existingRecords,
          "weekly_uncompleted",
          nextTarget.id,
          nextTarget.title
        );
      }
    }

    // ==========================================
    // Monthly Targets
    // ==========================================

    for (const nextTarget of nextState.monthlyTargets) {
      const previousTarget =
        previousState.monthlyTargets.find(
          (target) =>
            target.id === nextTarget.id
        );

      if (!previousTarget) {
        continue;
      }

      if (
        !previousTarget.completed &&
        nextTarget.completed
      ) {
        this.addRecord(
          records,
          existingRecords,
          "monthly_completed",
          nextTarget.id,
          nextTarget.title
        );
      }

      if (
        previousTarget.completed &&
        !nextTarget.completed
      ) {
        this.addRecord(
          records,
          existingRecords,
          "monthly_uncompleted",
          nextTarget.id,
          nextTarget.title
        );
      }
    }

    // ==========================================
    // Life Goals
    // ==========================================

    for (const nextGoal of nextState.lifeGoals) {
      const previousGoal =
        previousState.lifeGoals.find(
          (goal) =>
            goal.id === nextGoal.id
        );

      if (!previousGoal) {
        continue;
      }

      if (
        !previousGoal.completed &&
        nextGoal.completed
      ) {
        this.addRecord(
          records,
          existingRecords,
          "life_goal_completed",
          nextGoal.id,
          nextGoal.title
        );
      }

      if (
        previousGoal.completed &&
        !nextGoal.completed
      ) {
        this.addRecord(
          records,
          existingRecords,
          "life_goal_uncompleted",
          nextGoal.id,
          nextGoal.title
        );
      }
    }

    return records;
  }

  // ==========================================
  // Record Creation
  // ==========================================

  private static addRecord(
    records: ExecutionRecord[],
    existingRecords: ExecutionRecord[],
    type: ExecutionType,
    entityId: number,
    title: string
  ): void {
    const alreadyExists = [
      ...existingRecords,
      ...records,
    ].some(
      (record) =>
        record.type === type &&
        record.entityId === entityId
    );

    if (alreadyExists) {
      return;
    }

    records.push({
      id:
        Date.now() +
        existingRecords.length +
        records.length,

      type,
      entityId,
      title,

      createdAt:
        new Date().toISOString(),

      xpAwarded: 0,
    });
  }
}