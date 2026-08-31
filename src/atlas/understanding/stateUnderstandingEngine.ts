// ==========================================
// LifeOS ATLAS State Understanding Engine
// ==========================================
//
// Converts canonical state into deterministic,
// auditable facts. Higher-order engines consume
// this output to make priority and risk decisions.
// ==========================================

import type {
  AtlasCanonicalState,
} from "../state/types";

import type {
  AtlasStateUnderstanding,
} from "./types";

function getDateKey(value: string | Date): string {
  const date =
    typeof value === "string"
      ? new Date(value)
      : value;

  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

function getDueDateKey(dueDate: string): string {
  const dateOnlyMatch =
    /^(\d{4})-(\d{2})-(\d{2})$/.exec(
      dueDate
    );

  if (dateOnlyMatch) {
    return dueDate;
  }

  return getDateKey(dueDate);
}

export class StateUnderstandingEngine {
  understand(
    state: AtlasCanonicalState
  ): AtlasStateUnderstanding {
    const today = getDateKey(
      state.capturedAt
    );

    const activeTasks = state.tasks.filter(
      (task) => !task.completed
    );

    const completedTasks = state.tasks.filter(
      (task) => task.completed
    );

    const lifeGoalIds = new Set(
      state.lifeGoals.map((goal) => goal.id)
    );

    const monthlyTargetIds = new Set(
      state.monthlyTargets.map((target) => target.id)
    );

    const weeklyTargetIds = new Set(
      state.weeklyTargets.map((target) => target.id)
    );

    return {
      date: today,

      tasks: {
        total: state.tasks.length,
        active: activeTasks.length,
        completed: completedTasks.length,
        completedToday: completedTasks.filter(
          (task) =>
            task.completedAt &&
            getDateKey(task.completedAt) === today
        ).length,
        overdue: activeTasks.filter(
          (task) =>
            task.dueDate &&
            getDueDateKey(task.dueDate) < today
        ).length,
        dueToday: activeTasks.filter(
          (task) =>
            task.dueDate &&
            getDueDateKey(task.dueDate) === today
        ).length,
        undated: activeTasks.filter(
          (task) => !task.dueDate
        ).length,
        highPriorityActive: activeTasks.filter(
          (task) => task.priority === "high"
        ).length,
      },

      planning: {
        activeGoals: state.lifeGoals.filter(
          (goal) => !goal.completed
        ).length,
        completedGoals: state.lifeGoals.filter(
          (goal) => goal.completed
        ).length,
        overdueGoals: state.lifeGoals.filter(
          (goal) =>
            !goal.completed &&
            goal.targetDate &&
            getDueDateKey(goal.targetDate) < today
        ).length,
        activeMonthlyTargets:
          state.monthlyTargets.filter(
            (target) => !target.completed
          ).length,
        activeWeeklyTargets:
          state.weeklyTargets.filter(
            (target) => !target.completed
          ).length,
        unlinkedMonthlyTargets:
          state.monthlyTargets.filter(
            (target) =>
              target.goalId !== undefined &&
              !lifeGoalIds.has(target.goalId)
          ).length,
        unlinkedWeeklyTargets:
          state.weeklyTargets.filter(
            (target) =>
              target.monthlyTargetId !== undefined &&
              !monthlyTargetIds.has(
                target.monthlyTargetId
              )
          ).length,
        unlinkedTasks: state.tasks.filter(
          (task) =>
            task.weeklyTargetId !== undefined &&
            !weeklyTargetIds.has(
              task.weeklyTargetId
            )
        ).length,
      },

      habits: {
        total: state.habits.length,
        completedToday: state.habits.filter(
          (habit) => habit.completedToday
        ).length,
        activeStreaks: state.habits.filter(
          (habit) => habit.streak > 0
        ).length,
      },

      execution: {
        totalEvents: state.executionHistory.length,
        eventsToday: state.executionHistory.filter(
          (event) =>
            getDateKey(event.createdAt) === today
        ).length,
        totalXP: state.executionHistory.reduce(
          (total, event) =>
            total +
            (Number.isFinite(event.xpAwarded) &&
            event.xpAwarded > 0
              ? event.xpAwarded
              : 0),
          0
        ),
        xpToday: state.executionHistory
          .filter(
            (event) =>
              getDateKey(event.createdAt) === today
          )
          .reduce(
            (total, event) =>
              total +
              (Number.isFinite(event.xpAwarded) &&
              event.xpAwarded > 0
                ? event.xpAwarded
                : 0),
            0
          ),
      },
    };
  }
}
