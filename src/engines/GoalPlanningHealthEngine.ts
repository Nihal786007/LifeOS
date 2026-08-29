// ==========================================
// LifeOS Goal Planning Health Engine
// Version: 1.0
// ==========================================

import {
  getCalendarWeeksForMonth,
} from "../calendar/goalWeeks";

import {
  PlanningIntegrityEngine,
} from "./PlanningIntegrityEngine";

import type {
  LifeGoal,
  MonthlyTarget,
  Task,
  WeeklyTarget,
} from "../shared/types";

// ==========================================
// State
// ==========================================

export interface GoalPlanningHealthState {
  lifeGoals: LifeGoal[];

  monthlyTargets: MonthlyTarget[];

  weeklyTargets: WeeklyTarget[];

  tasks: Task[];
}

// ==========================================
// Week Health
// ==========================================

export interface GoalPlanningWeekHealth {
  weekStartDate: string;

  weekEndDate: string;

  displayLabel: string;

  isCurrentWeek: boolean;

  monthlyTarget?: MonthlyTarget;

  weeklyTarget?: WeeklyTarget;

  planned: boolean;

  taskCount: number;

  completedTaskCount: number;

  incompleteTaskCount: number;

  overdueTaskCount: number;
}

// ==========================================
// Workload
// ==========================================

export interface GoalWorkloadInsight {
  concentrated: boolean;

  busiestWeek?: GoalPlanningWeekHealth;

  averageTasksPerPlannedWeek: number;

  message?: string;
}

// ==========================================
// Report
// ==========================================

export interface GoalPlanningHealthReport {
  goal: LifeGoal;

  timelineStart: string;

  timelineEnd?: string;

  totalActiveWeeks: number;

  plannedWeeks: number;

  missingWeeks: number;

  planningCoveragePercent: number;

  totalTasks: number;

  completedTasks: number;

  incompleteTasks: number;

  overdueTasks: number;

  currentWeek?: GoalPlanningWeekHealth;

  currentWeekPlanned: boolean;

  weeks: GoalPlanningWeekHealth[];

  missingWeekRanges: GoalPlanningWeekHealth[];

  workload: GoalWorkloadInsight;

  integrityErrorCount: number;

  integrityWarningCount: number;

  structurallyHealthy: boolean;

  summary: string;
}

// ==========================================
// Date Helpers
// ==========================================

function pad2(
  value: number
) {
  return String(
    value
  ).padStart(
    2,
    "0"
  );
}

function toLocalDateString(
  date: Date
) {
  return `${date.getFullYear()}-${pad2(
    date.getMonth() + 1
  )}-${pad2(
    date.getDate()
  )}`;
}

function parseLocalDate(
  value?: string
) {
  if (!value) {
    return undefined;
  }

  const match =
    /^(\d{4})-(\d{2})-(\d{2})$/.exec(
      value
    );

  if (!match) {
    return undefined;
  }

  const year =
    Number(
      match[1]
    );

  const month =
    Number(
      match[2]
    );

  const day =
    Number(
      match[3]
    );

  const date =
    new Date(
      year,
      month - 1,
      day
    );

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return undefined;
  }

  if (
    date.getFullYear() !==
      year ||
    date.getMonth() !==
      month - 1 ||
    date.getDate() !==
      day
  ) {
    return undefined;
  }

  return date;
}



// ==========================================
// Timeline Months
// ==========================================

function getGoalTimelineMonths(
  goal: LifeGoal
) {
  const start =
    parseLocalDate(
      goal.startDate
    );

  if (!start) {
    return [];
  }

  const target =
    parseLocalDate(
      goal.targetDate
    );

  const end =
    target ??
    start;

  const months: {
    month: number;
    year: number;
  }[] = [];

  let cursor =
    new Date(
      start.getFullYear(),
      start.getMonth(),
      1
    );

  const lastMonth =
    new Date(
      end.getFullYear(),
      end.getMonth(),
      1
    );

  while (
    cursor.getTime() <=
    lastMonth.getTime()
  ) {
    months.push({
      month:
        cursor.getMonth() + 1,

      year:
        cursor.getFullYear(),
    });

    cursor =
      new Date(
        cursor.getFullYear(),
        cursor.getMonth() + 1,
        1
      );
  }

  return months;
}

// ==========================================
// Goal Relationships
// ==========================================

function getGoalMonthlyTargets(
  state: GoalPlanningHealthState,
  goalId: number
) {
  return state.monthlyTargets.filter(
    (target) =>
      target.goalId ===
      goalId
  );
}

function getGoalWeeklyTargets(
  state: GoalPlanningHealthState,
  monthlyTargets: MonthlyTarget[]
) {
  const monthlyIds =
    new Set(
      monthlyTargets.map(
        (target) =>
          target.id
      )
    );

  return state.weeklyTargets.filter(
    (target) =>
      target.monthlyTargetId !==
        undefined &&
      monthlyIds.has(
        target.monthlyTargetId
      )
  );
}

function getGoalTasks(
  state: GoalPlanningHealthState,
  weeklyTargets: WeeklyTarget[]
) {
  const weeklyIds =
    new Set(
      weeklyTargets.map(
        (target) =>
          target.id
      )
    );

  return state.tasks.filter(
    (task) =>
      task.weeklyTargetId !==
        undefined &&
      weeklyIds.has(
        task.weeklyTargetId
      )
  );
}

// ==========================================
// Engine
// ==========================================

export class GoalPlanningHealthEngine {
  static analyze(
    state: GoalPlanningHealthState,
    goalId: number,
    todayOverride?: string
  ): GoalPlanningHealthReport | null {
    const goal =
      state.lifeGoals.find(
        (candidate) =>
          candidate.id ===
          goalId
      );

    if (!goal) {
      return null;
    }

    const today =
      todayOverride ??
      toLocalDateString(
        new Date()
      );

    const goalMonths =
      getGoalTimelineMonths(
        goal
      );

    const goalMonthlyTargets =
      getGoalMonthlyTargets(
        state,
        goal.id
      );

    const goalWeeklyTargets =
      getGoalWeeklyTargets(
        state,
        goalMonthlyTargets
      );

    const goalTasks =
      getGoalTasks(
        state,
        goalWeeklyTargets
      );

    // ======================================
    // Build All Active Real Weeks
    // ======================================

    const weekMap =
      new Map<
        string,
        GoalPlanningWeekHealth
      >();

    for (
      const timelineMonth
      of goalMonths
    ) {
      const calendarWeeks =
        getCalendarWeeksForMonth(
          timelineMonth.month,
          timelineMonth.year,
          {
            activeStartDate:
              goal.startDate,

            activeEndDate:
              goal.targetDate,
          }
        );

      for (
        const calendarWeek
        of calendarWeeks
      ) {
        const key =
          `${calendarWeek.weekStartDate}:${calendarWeek.weekEndDate}`;

        if (
          weekMap.has(
            key
          )
        ) {
          continue;
        }

        const weeklyTarget =
          goalWeeklyTargets.find(
            (target) =>
              target.weekStartDate ===
                calendarWeek.weekStartDate &&
              target.weekEndDate ===
                calendarWeek.weekEndDate
          );

        const monthlyTarget =
          weeklyTarget?.monthlyTargetId !==
          undefined
            ? goalMonthlyTargets.find(
                (target) =>
                  target.id ===
                  weeklyTarget.monthlyTargetId
              )
            : undefined;

        const weekTasks =
          weeklyTarget
            ? goalTasks.filter(
                (task) =>
                  task.weeklyTargetId ===
                  weeklyTarget.id
              )
            : [];

        const completedTaskCount =
          weekTasks.filter(
            (task) =>
              task.completed
          ).length;

        const overdueTaskCount =
          weekTasks.filter(
            (task) =>
              !task.completed &&
              Boolean(
                task.dueDate
              ) &&
              task.dueDate! <
                today
          ).length;

        weekMap.set(
          key,
          {
            weekStartDate:
              calendarWeek.weekStartDate,

            weekEndDate:
              calendarWeek.weekEndDate,

            displayLabel:
              calendarWeek.displayLabel,

            isCurrentWeek:
              calendarWeek.isCurrentWeek,

            monthlyTarget,

            weeklyTarget,

            planned:
              Boolean(
                weeklyTarget
              ),

            taskCount:
              weekTasks.length,

            completedTaskCount,

            incompleteTaskCount:
              weekTasks.length -
              completedTaskCount,

            overdueTaskCount,
          }
        );
      }
    }

    const weeks =
      Array.from(
        weekMap.values()
      ).sort(
        (first, second) =>
          first.weekStartDate.localeCompare(
            second.weekStartDate
          )
      );

    // ======================================
    // Coverage
    // ======================================

    const totalActiveWeeks =
      weeks.length;

    const plannedWeeks =
      weeks.filter(
        (week) =>
          week.planned
      ).length;

    const missingWeekRanges =
      weeks.filter(
        (week) =>
          !week.planned
      );

    const missingWeeks =
      missingWeekRanges.length;

    const planningCoveragePercent =
      totalActiveWeeks ===
      0
        ? 0
        : Math.round(
            (
              plannedWeeks /
              totalActiveWeeks
            ) *
              100
          );

    // ======================================
    // Task Metrics
    // ======================================

    const completedTasks =
      goalTasks.filter(
        (task) =>
          task.completed
      ).length;

    const overdueTasks =
      goalTasks.filter(
        (task) =>
          !task.completed &&
          Boolean(
            task.dueDate
          ) &&
          task.dueDate! <
            today
      ).length;

    const totalTasks =
      goalTasks.length;

    const incompleteTasks =
      totalTasks -
      completedTasks;

    // ======================================
    // Current Week
    // ======================================

    const currentWeek =
      weeks.find(
        (week) =>
          week.isCurrentWeek
      );

    const currentWeekPlanned =
      currentWeek?.planned ??
      false;

    // ======================================
    // Workload Distribution
    // ======================================

    const plannedWeekObjects =
      weeks.filter(
        (week) =>
          week.planned
      );

    const averageTasksPerPlannedWeek =
      plannedWeekObjects.length ===
      0
        ? 0
        : Number(
            (
              plannedWeekObjects.reduce(
                (
                  total,
                  week
                ) =>
                  total +
                  week.taskCount,
                0
              ) /
              plannedWeekObjects.length
            ).toFixed(
              1
            )
          );

    const busiestWeek =
      plannedWeekObjects.reduce<
        GoalPlanningWeekHealth | undefined
      >(
        (
          current,
          week
        ) => {
          if (!current) {
            return week;
          }

          return week.taskCount >
            current.taskCount
            ? week
            : current;
        },
        undefined
      );

    let workloadConcentrated =
      false;

    let workloadMessage:
      | string
      | undefined;

    if (
      busiestWeek &&
      goalTasks.length >=
        4 &&
      busiestWeek.taskCount >=
        Math.max(
          4,
          averageTasksPerPlannedWeek *
            2
        )
    ) {
      workloadConcentrated =
        true;

      workloadMessage =
        `${busiestWeek.displayLabel} contains ${busiestWeek.taskCount} tasks, significantly more than the current planned-week average of ${averageTasksPerPlannedWeek}.`;
    }

    // ======================================
    // Structural Integrity
    // ======================================

    const integrityReport =
      PlanningIntegrityEngine.auditGoal(
        state,
        goal.id
      );

    // ======================================
    // Explainable Summary
    // ======================================

    let summary: string;

    if (
      integrityReport.errorCount >
      0
    ) {
      summary =
        `Planning structure has ${integrityReport.errorCount} integrity error${integrityReport.errorCount === 1 ? "" : "s"} that should be fixed.`;
    } else if (
      totalActiveWeeks ===
      0
    ) {
      summary =
        "No active calendar weeks could be derived from this goal timeline.";
    } else if (
      missingWeeks >
      0
    ) {
      summary =
        `${plannedWeeks} of ${totalActiveWeeks} active weeks are planned. ${missingWeeks} week${missingWeeks === 1 ? "" : "s"} still need a Weekly Focus.`;
    } else if (
      overdueTasks >
      0
    ) {
      summary =
        `All active weeks are planned, but ${overdueTasks} incomplete task${overdueTasks === 1 ? " is" : "s are"} overdue.`;
    } else if (
      currentWeek &&
      !currentWeekPlanned
    ) {
      summary =
        `The current week ${currentWeek.displayLabel} does not yet have a Weekly Focus.`;
    } else {
      summary =
        `All ${totalActiveWeeks} active weeks are planned and the goal structure is currently consistent.`;
    }

    return {
      goal,

      timelineStart:
        goal.startDate,

      timelineEnd:
        goal.targetDate,

      totalActiveWeeks,

      plannedWeeks,

      missingWeeks,

      planningCoveragePercent,

      totalTasks,

      completedTasks,

      incompleteTasks,

      overdueTasks,

      currentWeek,

      currentWeekPlanned,

      weeks,

      missingWeekRanges,

      workload: {
        concentrated:
          workloadConcentrated,

        busiestWeek,

        averageTasksPerPlannedWeek,

        message:
          workloadMessage,
      },

      integrityErrorCount:
        integrityReport.errorCount,

      integrityWarningCount:
        integrityReport.warningCount,

      structurallyHealthy:
        integrityReport.healthy,

      summary,
    };
  }
}