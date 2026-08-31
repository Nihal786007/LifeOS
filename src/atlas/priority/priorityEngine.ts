// ==========================================
// LifeOS ATLAS Deterministic Priority Engine
// ==========================================
//
// Ranks active tasks using an explicit point
// breakdown. Every point is tied to a named rule
// and human-readable reason.
// ==========================================

import type {
  Task,
} from "../../shared/types";

import type {
  AtlasCanonicalState,
} from "../state/types";

import type {
  AtlasPriorityContribution,
  AtlasPriorityResult,
  AtlasPriorityTier,
  AtlasRankedTask,
} from "./types";

const MILLISECONDS_PER_DAY =
  24 * 60 * 60 * 1000;

function toDateKey(
  value: string
): string | undefined {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return undefined;
  }

  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

function toDayNumber(
  dateKey: string
): number {
  return Math.floor(
    Date.parse(`${dateKey}T00:00:00Z`) /
      MILLISECONDS_PER_DAY
  );
}

function getDaysFromToday(
  value: string,
  today: string
): number | undefined {
  const dateKey = toDateKey(value);

  if (!dateKey) {
    return undefined;
  }

  return (
    toDayNumber(dateKey) -
    toDayNumber(today)
  );
}

function getPriorityTier(
  score: number
): AtlasPriorityTier {
  if (score >= 80) {
    return "critical";
  }

  if (score >= 55) {
    return "high";
  }

  if (score >= 30) {
    return "medium";
  }

  return "low";
}

function getPriorityWeight(
  task: Task
): number {
  if (task.priority === "high") {
    return 3;
  }

  if (task.priority === "medium") {
    return 2;
  }

  return 1;
}

interface ScoredTask {
  task: Task;
  score: number;
  dueDateKey?: string;
  contributions: AtlasPriorityContribution[];
}

export class PriorityEngine {
  rank(
    state: AtlasCanonicalState
  ): AtlasPriorityResult {
    const today = toDateKey(
      state.capturedAt
    );

    if (!today) {
      return {
        evaluatedAt: state.capturedAt,
        rankedTasks: [],
      };
    }

    const weeklyTargets = new Map(
      state.weeklyTargets.map(
        (target) => [target.id, target]
      )
    );

    const monthlyTargets = new Map(
      state.monthlyTargets.map(
        (target) => [target.id, target]
      )
    );

    const lifeGoals = new Map(
      state.lifeGoals.map(
        (goal) => [goal.id, goal]
      )
    );

    const scoredTasks: ScoredTask[] =
      state.tasks
        .filter((task) => !task.completed)
        .map((task) => {
          const contributions:
            AtlasPriorityContribution[] = [];

          if (task.priority === "high") {
            contributions.push({
              ruleId: "task-priority",
              points: 30,
              reason:
                "Marked as high priority.",
            });
          } else if (task.priority === "medium") {
            contributions.push({
              ruleId: "task-priority",
              points: 15,
              reason:
                "Marked as medium priority.",
            });
          }

          const daysUntilDue = task.dueDate
            ? getDaysFromToday(
                task.dueDate,
                today
              )
            : undefined;

          if (
            daysUntilDue !== undefined &&
            daysUntilDue < 0
          ) {
            contributions.push({
              ruleId: "overdue",
              points: 50,
              reason: `Overdue by ${Math.abs(
                daysUntilDue
              )} day(s).`,
            });
          } else if (daysUntilDue === 0) {
            contributions.push({
              ruleId: "due-today",
              points: 40,
              reason: "Due today.",
            });
          } else if (
            daysUntilDue !== undefined &&
            daysUntilDue <= 2
          ) {
            contributions.push({
              ruleId: "due-soon",
              points: 30,
              reason: `Due in ${daysUntilDue} day(s).`,
            });
          } else if (
            daysUntilDue !== undefined &&
            daysUntilDue <= 7
          ) {
            contributions.push({
              ruleId: "due-this-week",
              points: 15,
              reason: `Due in ${daysUntilDue} day(s).`,
            });
          }

          const weeklyTarget =
            task.weeklyTargetId === undefined
              ? undefined
              : weeklyTargets.get(
                  task.weeklyTargetId
                );

          if (weeklyTarget && !weeklyTarget.completed) {
            contributions.push({
              ruleId: "weekly-alignment",
              points: 15,
              reason: `Advances active weekly target: ${weeklyTarget.title}.`,
            });
          }

          const monthlyTarget =
            weeklyTarget?.monthlyTargetId === undefined
              ? undefined
              : monthlyTargets.get(
                  weeklyTarget.monthlyTargetId
                );

          if (
            monthlyTarget &&
            !monthlyTarget.completed
          ) {
            contributions.push({
              ruleId: "monthly-alignment",
              points: 10,
              reason: `Advances active monthly target: ${monthlyTarget.title}.`,
            });
          }

          const lifeGoal =
            monthlyTarget?.goalId === undefined
              ? undefined
              : lifeGoals.get(
                  monthlyTarget.goalId
                );

          if (lifeGoal && !lifeGoal.completed) {
            contributions.push({
              ruleId: "goal-alignment",
              points: 10,
              reason: `Advances active life goal: ${lifeGoal.title}.`,
            });
          }

          const ageInDays = getDaysFromToday(
            task.createdAt,
            today
          );

          if (
            ageInDays !== undefined &&
            ageInDays <= -30
          ) {
            contributions.push({
              ruleId: "stale-task",
              points: 10,
              reason: `Still active after ${Math.abs(
                ageInDays
              )} day(s).`,
            });
          } else if (
            ageInDays !== undefined &&
            ageInDays <= -14
          ) {
            contributions.push({
              ruleId: "stale-task",
              points: 5,
              reason: `Still active after ${Math.abs(
                ageInDays
              )} day(s).`,
            });
          }

          return {
            task,
            dueDateKey: task.dueDate
              ? toDateKey(task.dueDate)
              : undefined,
            score: contributions.reduce(
              (total, contribution) =>
                total + contribution.points,
              0
            ),
            contributions,
          };
        });

    scoredTasks.sort((left, right) => {
      if (left.score !== right.score) {
        return right.score - left.score;
      }

      const leftDue =
        left.dueDateKey ?? "9999-12-31";

      const rightDue =
        right.dueDateKey ?? "9999-12-31";

      if (leftDue !== rightDue) {
        return leftDue.localeCompare(rightDue);
      }

      const priorityDifference =
        getPriorityWeight(right.task) -
        getPriorityWeight(left.task);

      if (priorityDifference !== 0) {
        return priorityDifference;
      }

      if (
        left.task.createdAt !==
        right.task.createdAt
      ) {
        return left.task.createdAt.localeCompare(
          right.task.createdAt
        );
      }

      return left.task.id - right.task.id;
    });

    const rankedTasks: AtlasRankedTask[] =
      scoredTasks.map((item, index) => ({
        taskId: item.task.id,
        title: item.task.title,
        rank: index + 1,
        score: item.score,
        tier: getPriorityTier(item.score),
        reasons: item.contributions.map(
          (contribution) => contribution.reason
        ),
        contributions: item.contributions,
      }));

    return {
      evaluatedAt: state.capturedAt,
      rankedTasks,
    };
  }
}
