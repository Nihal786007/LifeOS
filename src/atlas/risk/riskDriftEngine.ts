// ==========================================
// LifeOS ATLAS Risk and Drift Engine
// ==========================================
//
// Detects explicit threshold breaches and state
// contradictions. It does not predict, mutate, or
// hide judgment behind a composite numeric score.
// ==========================================

import type {
  AtlasCanonicalState,
} from "../state/types";

import type {
  AtlasOverallRisk,
  AtlasRiskAssessment,
  AtlasRiskFinding,
  AtlasRiskSeverity,
} from "./types";

const MILLISECONDS_PER_DAY =
  24 * 60 * 60 * 1000;

const SEVERITY_WEIGHT: Record<
  AtlasRiskSeverity,
  number
> = {
  critical: 3,
  high: 2,
  moderate: 1,
};

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

function getOverallRisk(
  findings: readonly AtlasRiskFinding[]
): AtlasOverallRisk {
  if (findings.length === 0) {
    return "none";
  }

  return findings.reduce<AtlasRiskSeverity>(
    (highest, finding) =>
      SEVERITY_WEIGHT[finding.severity] >
      SEVERITY_WEIGHT[highest]
        ? finding.severity
        : highest,
    "moderate"
  );
}

export class RiskDriftEngine {
  assess(
    state: AtlasCanonicalState
  ): AtlasRiskAssessment {
    const today = toDateKey(
      state.capturedAt
    );

    if (!today) {
      return {
        evaluatedAt: state.capturedAt,
        overallRisk: "none",
        findings: [],
      };
    }

    const findings: AtlasRiskFinding[] = [];

    const activeTasks = state.tasks.filter(
      (task) => !task.completed
    );

    const overdueTasks = activeTasks.filter(
      (task) => {
        if (!task.dueDate) {
          return false;
        }

        const daysUntilDue =
          getDaysFromToday(task.dueDate, today);

        return (
          daysUntilDue !== undefined &&
          daysUntilDue < 0
        );
      }
    );

    if (overdueTasks.length > 0) {
      const severity: AtlasRiskSeverity =
        overdueTasks.length >= 5
          ? "critical"
          : overdueTasks.length >= 3
          ? "high"
          : "moderate";

      const threshold =
        severity === "critical"
          ? 5
          : severity === "high"
          ? 3
          : 1;

      findings.push({
        ruleId: "overdue-task-backlog",
        category: "deadline",
        severity,
        title: "Overdue task backlog",
        reasons: [
          `${overdueTasks.length} active task(s) are past their due date.`,
        ],
        evidence: [
          {
            metric: "overdueActiveTasks",
            value: overdueTasks.length,
            threshold,
          },
        ],
      });
    }

    const overdueGoals = state.lifeGoals.filter(
      (goal) => {
        if (goal.completed || !goal.targetDate) {
          return false;
        }

        const daysUntilDue =
          getDaysFromToday(
            goal.targetDate,
            today
          );

        return (
          daysUntilDue !== undefined &&
          daysUntilDue < 0
        );
      }
    );

    if (overdueGoals.length > 0) {
      findings.push({
        ruleId: "overdue-goal",
        category: "deadline",
        severity: "high",
        title: "Goal deadline drift",
        reasons: [
          `${overdueGoals.length} active life goal(s) are beyond their target date.`,
        ],
        evidence: [
          {
            metric: "overdueActiveGoals",
            value: overdueGoals.length,
            threshold: 1,
          },
        ],
      });
    }

    if (activeTasks.length >= 10) {
      const severity: AtlasRiskSeverity =
        activeTasks.length >= 20
          ? "high"
          : "moderate";

      findings.push({
        ruleId: "active-task-overload",
        category: "capacity",
        severity,
        title: "Active task overload",
        reasons: [
          `${activeTasks.length} tasks are active at the same time.`,
        ],
        evidence: [
          {
            metric: "activeTasks",
            value: activeTasks.length,
            threshold:
              severity === "high" ? 20 : 10,
          },
        ],
      });
    }

    const highPriorityTasks = activeTasks.filter(
      (task) => task.priority === "high"
    );

    if (highPriorityTasks.length >= 3) {
      const severity: AtlasRiskSeverity =
        highPriorityTasks.length >= 5
          ? "high"
          : "moderate";

      findings.push({
        ruleId: "high-priority-overload",
        category: "capacity",
        severity,
        title: "High-priority overload",
        reasons: [
          `${highPriorityTasks.length} active tasks are all marked high priority.`,
        ],
        evidence: [
          {
            metric: "activeHighPriorityTasks",
            value: highPriorityTasks.length,
            threshold:
              severity === "high" ? 5 : 3,
          },
        ],
      });
    }

    const activeTaskAges = activeTasks
      .map((task) =>
        getDaysFromToday(task.createdAt, today)
      )
      .filter(
        (days): days is number =>
          days !== undefined
      )
      .map((days) => Math.max(0, -days));

    const oldestActiveTaskAge =
      activeTaskAges.length === 0
        ? 0
        : Math.max(...activeTaskAges);

    const recentCompletionIds = new Set<number>();

    state.tasks.forEach((task) => {
      if (!task.completedAt) {
        return;
      }

      const days = getDaysFromToday(
        task.completedAt,
        today
      );

      if (
        days !== undefined &&
        days >= -6 &&
        days <= 0
      ) {
        recentCompletionIds.add(task.id);
      }
    });

    state.executionHistory.forEach((event) => {
      if (event.type !== "task_completed") {
        return;
      }

      const days = getDaysFromToday(
        event.createdAt,
        today
      );

      if (
        days !== undefined &&
        days >= -6 &&
        days <= 0
      ) {
        recentCompletionIds.add(event.entityId);
      }
    });

    if (
      activeTasks.length >= 3 &&
      oldestActiveTaskAge >= 7 &&
      recentCompletionIds.size === 0
    ) {
      findings.push({
        ruleId: "execution-stall",
        category: "execution-drift",
        severity: "high",
        title: "Execution has stalled",
        reasons: [
          `No task completion is recorded in the last 7 days while ${activeTasks.length} tasks remain active.`,
          `The oldest active task has been open for ${oldestActiveTaskAge} day(s).`,
        ],
        evidence: [
          {
            metric: "activeTasks",
            value: activeTasks.length,
            threshold: 3,
          },
          {
            metric: "oldestActiveTaskAgeDays",
            value: oldestActiveTaskAge,
            threshold: 7,
          },
          {
            metric: "taskCompletionsLast7Days",
            value: 0,
            threshold: 1,
          },
        ],
      });
    }

    const staleTasks = activeTasks.filter(
      (task) => {
        const days = getDaysFromToday(
          task.createdAt,
          today
        );

        return (
          days !== undefined &&
          days <= -30
        );
      }
    );

    if (staleTasks.length > 0) {
      const severity: AtlasRiskSeverity =
        staleTasks.length >= 3
          ? "high"
          : "moderate";

      findings.push({
        ruleId: "stale-task-backlog",
        category: "execution-drift",
        severity,
        title: "Stale task backlog",
        reasons: [
          `${staleTasks.length} active task(s) have remained open for at least 30 days.`,
        ],
        evidence: [
          {
            metric: "activeTasksAtLeast30DaysOld",
            value: staleTasks.length,
            threshold:
              severity === "high" ? 3 : 1,
          },
        ],
      });
    }

    const lifeGoalIds = new Set(
      state.lifeGoals.map((goal) => goal.id)
    );

    const monthlyTargetIds = new Set(
      state.monthlyTargets.map((target) => target.id)
    );

    const weeklyTargetIds = new Set(
      state.weeklyTargets.map((target) => target.id)
    );

    const brokenMonthlyLinks =
      state.monthlyTargets.filter(
        (target) =>
          target.goalId !== undefined &&
          !lifeGoalIds.has(target.goalId)
      ).length;

    const brokenWeeklyLinks =
      state.weeklyTargets.filter(
        (target) =>
          target.monthlyTargetId !== undefined &&
          !monthlyTargetIds.has(
            target.monthlyTargetId
          )
      ).length;

    const brokenTaskLinks = state.tasks.filter(
      (task) =>
        task.weeklyTargetId !== undefined &&
        !weeklyTargetIds.has(task.weeklyTargetId)
    ).length;

    const brokenLinkCount =
      brokenMonthlyLinks +
      brokenWeeklyLinks +
      brokenTaskLinks;

    if (brokenLinkCount > 0) {
      findings.push({
        ruleId: "broken-planning-link",
        category: "data-integrity",
        severity: "high",
        title: "Broken planning links",
        reasons: [
          `${brokenLinkCount} planning relationship(s) point to missing parent records.`,
        ],
        evidence: [
          {
            metric: "brokenTaskToWeeklyLinks",
            value: brokenTaskLinks,
            threshold: 1,
          },
          {
            metric: "brokenWeeklyToMonthlyLinks",
            value: brokenWeeklyLinks,
            threshold: 1,
          },
          {
            metric: "brokenMonthlyToGoalLinks",
            value: brokenMonthlyLinks,
            threshold: 1,
          },
        ],
      });
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

    const alignedActiveTasks = activeTasks.filter(
      (task) => {
        const weeklyTarget =
          task.weeklyTargetId === undefined
            ? undefined
            : weeklyTargets.get(
                task.weeklyTargetId
              );

        const monthlyTarget =
          weeklyTarget?.monthlyTargetId === undefined
            ? undefined
            : monthlyTargets.get(
                weeklyTarget.monthlyTargetId
              );

        const lifeGoal =
          monthlyTarget?.goalId === undefined
            ? undefined
            : lifeGoals.get(monthlyTarget.goalId);

        return Boolean(
          weeklyTarget &&
          !weeklyTarget.completed &&
          monthlyTarget &&
          !monthlyTarget.completed &&
          lifeGoal &&
          !lifeGoal.completed
        );
      }
    );

    const activeGoals = state.lifeGoals.filter(
      (goal) => !goal.completed
    );

    if (
      activeGoals.length > 0 &&
      activeTasks.length >= 3 &&
      alignedActiveTasks.length === 0
    ) {
      findings.push({
        ruleId: "planning-alignment-gap",
        category: "planning-drift",
        severity: "moderate",
        title: "Tasks are disconnected from goals",
        reasons: [
          `${activeTasks.length} tasks are active, but none has a complete active path through weekly and monthly targets to a life goal.`,
        ],
        evidence: [
          {
            metric: "activeTasks",
            value: activeTasks.length,
            threshold: 3,
          },
          {
            metric: "fullyAlignedActiveTasks",
            value: 0,
            threshold: 1,
          },
        ],
      });
    }

    const activeTasksUnderCompletedWeekly =
      activeTasks.filter((task) => {
        const weeklyTarget =
          task.weeklyTargetId === undefined
            ? undefined
            : weeklyTargets.get(
                task.weeklyTargetId
              );

        return weeklyTarget?.completed === true;
      }).length;

    const activeWeeklyUnderCompletedMonthly =
      state.weeklyTargets.filter((target) => {
        if (
          target.completed ||
          target.monthlyTargetId === undefined
        ) {
          return false;
        }

        return (
          monthlyTargets.get(
            target.monthlyTargetId
          )?.completed === true
        );
      }).length;

    const activeMonthlyUnderCompletedGoal =
      state.monthlyTargets.filter((target) => {
        if (
          target.completed ||
          target.goalId === undefined
        ) {
          return false;
        }

        return (
          lifeGoals.get(target.goalId)?.completed ===
          true
        );
      }).length;

    const completedParentConflicts =
      activeTasksUnderCompletedWeekly +
      activeWeeklyUnderCompletedMonthly +
      activeMonthlyUnderCompletedGoal;

    if (completedParentConflicts > 0) {
      findings.push({
        ruleId: "completed-parent-conflict",
        category: "data-integrity",
        severity: "high",
        title: "Active work under completed plans",
        reasons: [
          `${completedParentConflicts} active planning item(s) have a completed immediate parent.`,
        ],
        evidence: [
          {
            metric: "activeTasksUnderCompletedWeeklyTargets",
            value: activeTasksUnderCompletedWeekly,
            threshold: 1,
          },
          {
            metric: "activeWeeklyTargetsUnderCompletedMonthlyTargets",
            value: activeWeeklyUnderCompletedMonthly,
            threshold: 1,
          },
          {
            metric: "activeMonthlyTargetsUnderCompletedGoals",
            value: activeMonthlyUnderCompletedGoal,
            threshold: 1,
          },
        ],
      });
    }

    findings.sort((left, right) => {
      const severityDifference =
        SEVERITY_WEIGHT[right.severity] -
        SEVERITY_WEIGHT[left.severity];

      if (severityDifference !== 0) {
        return severityDifference;
      }

      return left.ruleId.localeCompare(
        right.ruleId
      );
    });

    return {
      evaluatedAt: state.capturedAt,
      overallRisk: getOverallRisk(findings),
      findings,
    };
  }
}
