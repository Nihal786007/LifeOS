// ==========================================
// LifeOS ATLAS Memory + Pattern Engine
// ==========================================
//
// Deterministic pattern extraction from retained
// canonical history. It reports measurements and
// comparisons only; it does not infer causes.
// ==========================================

import {
  HabitEngine,
} from "../../engines/HabitEngine.ts";

import type {
  ExecutionType,
} from "../../shared/execution";

import type {
  HabitState,
} from "../../shared/habits";

import {
  ATLAS_PATTERN_REPORT_VERSION,
} from "./types.ts";

import type {
  AtlasHistoryCoverage,
  AtlasPatternComparison,
  AtlasPatternFinding,
  AtlasPatternInput,
  AtlasPatternIntelligenceReport,
  AtlasPatternLimitation,
  AtlasPatternPeriod,
} from "./types";

const PLANNING_REVISION_TYPES =
  new Set<ExecutionType>([
    "weekly_uncompleted",
    "weekly_deleted",
    "monthly_uncompleted",
    "monthly_deleted",
    "life_goal_uncompleted",
    "life_goal_deleted",
  ]);

interface HabitPeriodSummary {
  scheduledDays: number;
  completedDays: number;
  completionRate: number;
  completionIds: number[];
  habitIds: number[];
}

interface PeriodPair {
  observed: AtlasPatternPeriod;
  baseline: AtlasPatternPeriod;
}

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

function addDays(
  dateKey: string,
  amount: number
): string {
  const date = new Date(
    `${dateKey}T00:00:00.000Z`
  );

  date.setUTCDate(
    date.getUTCDate() + amount
  );

  return date.toISOString().slice(0, 10);
}

function isWithin(
  dateKey: string | undefined,
  period: AtlasPatternPeriod
): boolean {
  return Boolean(
    dateKey &&
    dateKey >= period.startDate &&
    dateKey <= period.endDate
  );
}

function createPeriodPair(
  today: string,
  length: number,
  label: string
): PeriodPair {
  const observed: AtlasPatternPeriod = {
    label: `Current ${label}`,
    startDate: addDays(today, -(length - 1)),
    endDate: today,
  };

  const baselineEnd = addDays(
    observed.startDate,
    -1
  );

  return {
    observed,
    baseline: {
      label: `Previous ${label}`,
      startDate: addDays(
        baselineEnd,
        -(length - 1)
      ),
      endDate: baselineEnd,
    },
  };
}

function calculateRate(
  completed: number,
  scheduled: number
): number {
  if (scheduled === 0) {
    return 0;
  }

  return Math.round(
    (completed / scheduled) * 100
  );
}

function getDateBounds(
  values: readonly (string | undefined)[]
): {
  firstRecordedDate?: string;
  lastRecordedDate?: string;
} {
  const dates = values
    .map((value) =>
      value ? toDateKey(value) : undefined
    )
    .filter(
      (value): value is string =>
        value !== undefined
    )
    .sort();

  if (dates.length === 0) {
    return {};
  }

  return {
    firstRecordedDate: dates[0],
    lastRecordedDate: dates[dates.length - 1],
  };
}

function getCoverage(
  input: AtlasPatternInput
): AtlasHistoryCoverage[] {
  const executionBounds = getDateBounds(
    input.state.executionHistory.map(
      (record) => record.createdAt
    )
  );

  const habitBounds = getDateBounds(
    input.state.habitCompletions.map(
      (completion) => completion.date
    )
  );

  const taskBounds = getDateBounds(
    input.state.tasks.flatMap((task) => [
      task.createdAt,
      task.completedAt,
    ])
  );

  return [
    {
      source: "execution-history",
      recordCount:
        input.state.executionHistory.length,
      ...executionBounds,
    },
    {
      source: "habit-completion-history",
      recordCount:
        input.state.habitCompletions.length,
      ...habitBounds,
    },
    {
      source: "task-records",
      recordCount: input.state.tasks.length,
      ...taskBounds,
    },
  ];
}

function hasCoverageFrom(
  coverage: readonly AtlasHistoryCoverage[],
  source: AtlasHistoryCoverage["source"],
  requiredStartDate: string
): boolean {
  const item = coverage.find(
    (entry) => entry.source === source
  );

  return Boolean(
    item?.firstRecordedDate &&
    item.firstRecordedDate <= requiredStartDate
  );
}

function createThresholdComparison(
  observedValue: number,
  baselineValue: number,
  unit: string,
  interpretation: string
): AtlasPatternComparison {
  return {
    kind: "threshold",
    baselineLabel: "Pattern threshold",
    observedValue,
    baselineValue,
    difference: observedValue - baselineValue,
    unit,
    interpretation,
  };
}

function createPeriodComparison(
  observedValue: number,
  baselineValue: number,
  unit: string,
  interpretation: string
): AtlasPatternComparison {
  return {
    kind: "previous-period",
    baselineLabel: "Previous equal-length period",
    observedValue,
    baselineValue,
    difference: observedValue - baselineValue,
    unit,
    interpretation,
  };
}

function findRecurringOverduePattern(
  input: AtlasPatternInput,
  today: string
): AtlasPatternFinding | undefined {
  const period: AtlasPatternPeriod = {
    label: "Rolling 30 days",
    startDate: addDays(today, -29),
    endDate: today,
  };

  const evaluated = input.state.tasks.filter(
    (task) => {
      if (!task.dueDate) {
        return false;
      }

      const outcomeDate = task.completed
        ? task.completedAt
        : task.dueDate;

      return isWithin(
        outcomeDate
          ? toDateKey(outcomeDate)
          : undefined,
        period
      );
    }
  );

  const lateTasks = evaluated.filter((task) => {
    const dueDate = task.dueDate
      ? toDateKey(task.dueDate)
      : undefined;

    if (!dueDate) {
      return false;
    }

    if (!task.completed) {
      return dueDate < today;
    }

    const completedDate = task.completedAt
      ? toDateKey(task.completedAt)
      : undefined;

    return Boolean(
      completedDate && completedDate > dueDate
    );
  });

  const lateRate = calculateRate(
    lateTasks.length,
    evaluated.length
  );

  if (
    evaluated.length < 4 ||
    lateTasks.length < 3 ||
    lateRate < 50
  ) {
    return undefined;
  }

  return {
    id: "recurring-overdue-behavior:30-day",
    kind: "recurring-overdue-behavior",
    direction: "recurring",
    title: "Overdue outcomes are recurring",
    summary:
      `${lateTasks.length} of ${evaluated.length} due-task outcomes were late or remain overdue in the observed window.`,
    timeWindow: {
      observed: period,
    },
    measurements: [
      {
        name: "evaluatedDueTaskOutcomes",
        value: evaluated.length,
        unit: "tasks",
      },
      {
        name: "lateOrOverdueOutcomes",
        value: lateTasks.length,
        unit: "tasks",
      },
      {
        name: "lateOutcomeRate",
        value: lateRate,
        unit: "percent",
      },
    ],
    comparison: createThresholdComparison(
      lateRate,
      50,
      "percent",
      "The observed late-outcome rate meets or exceeds the 50% recurrence threshold."
    ),
    evidence: [
      {
        source: "task-records",
        reference:
          "state.tasks with dueDate and observed completion or due outcome",
        recordIds: evaluated.map((task) => task.id),
        description:
          "Task due dates and completion timestamps were compared as calendar dates.",
      },
    ],
  };
}

function getTaskCompletionRecords(
  input: AtlasPatternInput,
  period: AtlasPatternPeriod
) {
  return input.state.executionHistory.filter(
    (record) =>
      record.type === "task_completed" &&
      isWithin(
        toDateKey(record.createdAt),
        period
      )
  );
}

function findExecutionTrendPattern(
  input: AtlasPatternInput,
  periods: PeriodPair,
  coverage: readonly AtlasHistoryCoverage[]
): AtlasPatternFinding | undefined {
  if (
    !hasCoverageFrom(
      coverage,
      "execution-history",
      periods.baseline.startDate
    )
  ) {
    return undefined;
  }

  const observed = getTaskCompletionRecords(
    input,
    periods.observed
  );

  const baseline = getTaskCompletionRecords(
    input,
    periods.baseline
  );

  if (observed.length + baseline.length < 4) {
    return undefined;
  }

  const difference =
    observed.length - baseline.length;

  const direction =
    difference >= 2
      ? "improving"
      : difference <= -2
      ? "declining"
      : observed.length >= 2 &&
        baseline.length >= 2
      ? "stable"
      : undefined;

  if (!direction) {
    return undefined;
  }

  return {
    id: "execution-consistency-trend:7-day",
    kind: "execution-consistency-trend",
    direction,
    title: `Task execution is ${direction}`,
    summary:
      `${observed.length} task-completion event(s) were recorded in the current seven-day period versus ${baseline.length} previously.`,
    timeWindow: periods,
    measurements: [
      {
        name: "currentTaskCompletions",
        value: observed.length,
        unit: "events",
      },
      {
        name: "previousTaskCompletions",
        value: baseline.length,
        unit: "events",
      },
    ],
    comparison: createPeriodComparison(
      observed.length,
      baseline.length,
      "events",
      `The current period contains ${Math.abs(
        difference
      )} ${difference >= 0 ? "more" : "fewer"} task-completion event(s).`
    ),
    evidence: [
      {
        source: "execution-history",
        reference:
          'state.executionHistory[type="task_completed"]',
        recordIds: [
          ...baseline.map((record) => record.id),
          ...observed.map((record) => record.id),
        ],
        description:
          "Canonical task-completion events in two equal seven-day periods.",
      },
    ],
  };
}

function summarizeHabitPeriod(
  input: AtlasPatternInput,
  period: AtlasPatternPeriod
): HabitPeriodSummary {
  const habitState: HabitState = {
    habits: [...input.state.habitDefinitions],
    completions: [...input.state.habitCompletions],
  };

  const analytics =
    input.state.habitDefinitions.map((habit) =>
      HabitEngine.getPeriodAnalytics(
        habitState,
        habit.id,
        period.startDate,
        period.endDate
      )
    );

  const scheduledDays = analytics.reduce(
    (total, item) =>
      total + item.scheduledDays,
    0
  );

  const completedDays = analytics.reduce(
    (total, item) =>
      total + item.completedDays,
    0
  );

  const completionIds =
    input.state.habitCompletions
      .filter((completion) =>
        isWithin(completion.date, period)
      )
      .map((completion) => completion.id);

  return {
    scheduledDays,
    completedDays,
    completionRate: calculateRate(
      completedDays,
      scheduledDays
    ),
    completionIds,
    habitIds:
      input.state.habitDefinitions.map(
        (habit) => habit.id
      ),
  };
}

function findHabitTrendPattern(
  input: AtlasPatternInput,
  periods: PeriodPair
): {
  finding?: AtlasPatternFinding;
  observed: HabitPeriodSummary;
  baseline: HabitPeriodSummary;
} {
  const observed = summarizeHabitPeriod(
    input,
    periods.observed
  );

  const baseline = summarizeHabitPeriod(
    input,
    periods.baseline
  );

  if (
    observed.scheduledDays < 3 ||
    baseline.scheduledDays < 3
  ) {
    return { observed, baseline };
  }

  const difference =
    observed.completionRate -
    baseline.completionRate;

  const direction =
    difference >= 15
      ? "improving"
      : difference <= -15
      ? "declining"
      : observed.completionRate >= 70 &&
        baseline.completionRate >= 70
      ? "stable"
      : undefined;

  if (!direction) {
    return { observed, baseline };
  }

  return {
    observed,
    baseline,
    finding: {
      id: "habit-consistency-trend:7-day",
      kind: "habit-consistency-trend",
      direction,
      title: `Habit consistency is ${direction}`,
      summary:
        `Scheduled habit completion was ${observed.completionRate}% in the current seven-day period versus ${baseline.completionRate}% previously.`,
      timeWindow: periods,
      measurements: [
        {
          name: "currentScheduledHabitDays",
          value: observed.scheduledDays,
          unit: "scheduled-days",
        },
        {
          name: "currentCompletedHabitDays",
          value: observed.completedDays,
          unit: "completed-days",
        },
        {
          name: "currentHabitCompletionRate",
          value: observed.completionRate,
          unit: "percent",
        },
        {
          name: "previousHabitCompletionRate",
          value: baseline.completionRate,
          unit: "percent",
        },
      ],
      comparison: createPeriodComparison(
        observed.completionRate,
        baseline.completionRate,
        "percent",
        `Habit completion changed by ${difference} percentage point(s).`
      ),
      evidence: [
        {
          source: "habit-definitions",
          reference:
            "state.habitDefinitions schedules evaluated by HabitEngine",
          recordIds: observed.habitIds,
          description:
            "Canonical habit schedules determine the expected days in each period.",
        },
        {
          source: "habit-completion-history",
          reference:
            "state.habitCompletions within both seven-day periods",
          recordIds: [
            ...baseline.completionIds,
            ...observed.completionIds,
          ],
          description:
            "Canonical completion records determine completed scheduled days.",
        },
      ],
    },
  };
}

function getPlanningRevisionRecords(
  input: AtlasPatternInput,
  period: AtlasPatternPeriod
) {
  return input.state.executionHistory.filter(
    (record) =>
      PLANNING_REVISION_TYPES.has(record.type) &&
      isWithin(
        toDateKey(record.createdAt),
        period
      )
  );
}

function findPlanningRevisionPattern(
  input: AtlasPatternInput,
  periods: PeriodPair,
  coverage: readonly AtlasHistoryCoverage[]
): AtlasPatternFinding | undefined {
  if (
    !hasCoverageFrom(
      coverage,
      "execution-history",
      periods.baseline.startDate
    )
  ) {
    return undefined;
  }

  const observed = getPlanningRevisionRecords(
    input,
    periods.observed
  );

  const baseline = getPlanningRevisionRecords(
    input,
    periods.baseline
  );

  if (
    observed.length < 3 ||
    observed.length <= baseline.length
  ) {
    return undefined;
  }

  return {
    id: "repeated-planning-revisions:30-day",
    kind: "repeated-planning-revisions",
    direction: "recurring",
    title: "Planning revisions are recurring",
    summary:
      `${observed.length} planning uncompletion or deletion event(s) occurred in the current 30-day period versus ${baseline.length} previously.`,
    timeWindow: periods,
    measurements: [
      {
        name: "currentPlanningRevisionEvents",
        value: observed.length,
        unit: "events",
      },
      {
        name: "previousPlanningRevisionEvents",
        value: baseline.length,
        unit: "events",
      },
    ],
    comparison: createPeriodComparison(
      observed.length,
      baseline.length,
      "events",
      "The current period contains at least three planning revisions and exceeds the previous period."
    ),
    evidence: [
      {
        source: "execution-history",
        reference:
          "state.executionHistory planning uncompletion/deletion events",
        recordIds: [
          ...baseline.map((record) => record.id),
          ...observed.map((record) => record.id),
        ],
        description:
          "Only canonical weekly, monthly, and life-goal uncompletion or deletion events are counted.",
      },
    ],
  };
}

function findSustainedMomentumPattern(
  input: AtlasPatternInput,
  periods: PeriodPair,
  observedTaskCompletions: number,
  baselineTaskCompletions: number,
  observedHabits: HabitPeriodSummary,
  baselineHabits: HabitPeriodSummary
): AtlasPatternFinding | undefined {
  if (
    observedTaskCompletions < 3 ||
    baselineTaskCompletions < 3 ||
    observedHabits.scheduledDays < 3 ||
    baselineHabits.scheduledDays < 3 ||
    observedHabits.completionRate < 80 ||
    baselineHabits.completionRate < 80
  ) {
    return undefined;
  }

  const taskRecords = [
    ...getTaskCompletionRecords(
      input,
      periods.baseline
    ),
    ...getTaskCompletionRecords(
      input,
      periods.observed
    ),
  ];

  return {
    id: "sustained-positive-momentum:7-day",
    kind: "sustained-positive-momentum",
    direction: "sustained",
    title: "Positive execution momentum is sustained",
    summary:
      "Task completions remained at three or more and scheduled habit completion remained at or above 80% across both seven-day periods.",
    timeWindow: periods,
    measurements: [
      {
        name: "currentTaskCompletions",
        value: observedTaskCompletions,
        unit: "events",
      },
      {
        name: "previousTaskCompletions",
        value: baselineTaskCompletions,
        unit: "events",
      },
      {
        name: "currentHabitCompletionRate",
        value: observedHabits.completionRate,
        unit: "percent",
      },
      {
        name: "previousHabitCompletionRate",
        value: baselineHabits.completionRate,
        unit: "percent",
      },
    ],
    comparison: createThresholdComparison(
      2,
      2,
      "domains",
      "Both task execution and habit consistency met their sustained-momentum thresholds in both periods."
    ),
    evidence: [
      {
        source: "execution-history",
        reference:
          'state.executionHistory[type="task_completed"] across both periods',
        recordIds: taskRecords.map(
          (record) => record.id
        ),
        description:
          "Task-completion volume is supported by canonical execution events.",
      },
      {
        source: "habit-completion-history",
        reference:
          "state.habitCompletions across both periods",
        recordIds: [
          ...baselineHabits.completionIds,
          ...observedHabits.completionIds,
        ],
        description:
          "Habit consistency is supported by scheduled-day analytics and canonical completion records.",
      },
    ],
  };
}

function getLimitations(
  input: AtlasPatternInput,
  snapshotsMatch: boolean
): AtlasPatternLimitation[] {
  const limitations: AtlasPatternLimitation[] = [];

  if (!snapshotsMatch) {
    limitations.push({
      id: "snapshot-mismatch",
      source: "current-intelligence-report",
      reason:
        "The canonical snapshot timestamp does not match the intelligence report timestamp, so no combined pattern analysis was produced.",
    });
  }

  limitations.push({
    id: "recurring-risk-history-unavailable",
    source: "current-intelligence-report",
    reason:
      `Only the current intelligence report is available (${input.report.risk.findings.length} current risk finding(s)); historical risk reports are not retained, so recurring risk categories cannot be established.`,
  });

  limitations.push({
    id: "planning-alignment-history-unavailable",
    source: "current-intelligence-report",
    reason:
      "Only current planning relationships are available; historical planning snapshots are not retained, so repeated planning-alignment gaps cannot be established.",
  });

  return limitations;
}

export class MemoryPatternEngine {
  analyze(
    input: AtlasPatternInput
  ): AtlasPatternIntelligenceReport {
    const coverage = getCoverage(input);

    const snapshotsMatch =
      input.state.capturedAt ===
      input.report.snapshotCapturedAt;

    const limitations = getLimitations(
      input,
      snapshotsMatch
    );

    if (!snapshotsMatch) {
      return {
        version: ATLAS_PATTERN_REPORT_VERSION,
        sourceReportVersion: input.report.version,
        snapshotCapturedAt:
          input.state.capturedAt,
        coverage,
        patterns: [],
        limitations,
      };
    }

    const today = toDateKey(
      input.state.capturedAt
    );

    if (!today) {
      return {
        version: ATLAS_PATTERN_REPORT_VERSION,
        sourceReportVersion: input.report.version,
        snapshotCapturedAt:
          input.state.capturedAt,
        coverage,
        patterns: [],
        limitations,
      };
    }

    const sevenDayPeriods = createPeriodPair(
      today,
      7,
      "7 days"
    );

    const thirtyDayPeriods = createPeriodPair(
      today,
      30,
      "30 days"
    );

    const executionObserved =
      getTaskCompletionRecords(
        input,
        sevenDayPeriods.observed
      );

    const executionBaseline =
      getTaskCompletionRecords(
        input,
        sevenDayPeriods.baseline
      );

    const habitTrend = findHabitTrendPattern(
      input,
      sevenDayPeriods
    );

    const candidates: (
      | AtlasPatternFinding
      | undefined
    )[] = [
      findRecurringOverduePattern(
        input,
        today
      ),
      findExecutionTrendPattern(
        input,
        sevenDayPeriods,
        coverage
      ),
      habitTrend.finding,
      findPlanningRevisionPattern(
        input,
        thirtyDayPeriods,
        coverage
      ),
      findSustainedMomentumPattern(
        input,
        sevenDayPeriods,
        executionObserved.length,
        executionBaseline.length,
        habitTrend.observed,
        habitTrend.baseline
      ),
    ];

    return {
      version: ATLAS_PATTERN_REPORT_VERSION,
      sourceReportVersion: input.report.version,
      snapshotCapturedAt:
        input.state.capturedAt,
      coverage,
      patterns: candidates.filter(
        (
          finding
        ): finding is AtlasPatternFinding =>
          finding !== undefined
      ),
      limitations,
    };
  }
}
