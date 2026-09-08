// ==========================================
// LifeOS Notifications Final V1
// ==========================================
//
// Pure deterministic derivation over trusted
// canonical and existing ATLAS outputs. This
// engine owns no persistence and performs no
// reads, writes, polling, or mutations.
// ==========================================

import { HabitEngine } from "../engines/HabitEngine.ts";

import type { AtlasIntelligenceReport } from "../atlas/coordinator/types";
import type { AtlasProactiveInsightReport } from "../atlas/proactive/types";
import type { AtlasCanonicalState } from "../atlas/state/types";

export const NOTIFICATION_MAX_VISIBLE = 12 as const;

export type NotificationCategory =
  | "tasks"
  | "habits"
  | "planning"
  | "xp"
  | "atlas";

export type NotificationSeverity = "info" | "attention" | "important";

export interface NotificationPreferences {
  tasks: boolean;
  habits: boolean;
  planning: boolean;
  xp: boolean;
  atlas: boolean;
}

export const DEFAULT_NOTIFICATION_PREFERENCES:
  Readonly<NotificationPreferences> = Object.freeze({
    tasks: true,
    habits: true,
    planning: true,
    xp: true,
    atlas: true,
  });

export interface LifeOSNotification {
  id: string;
  category: NotificationCategory;
  severity: NotificationSeverity;
  title: string;
  message: string;
  createdAt: string;
  sourceEntityId?: string;
  evidenceKeys: readonly string[];
}

export interface NotificationEngineInput {
  state: AtlasCanonicalState;
  intelligence: AtlasIntelligenceReport;
  proactive: AtlasProactiveInsightReport;
  localDate: string;
  preferences?: NotificationPreferences;
}

const PLANNING_RISK_RULES = new Set([
  "overdue-goal",
  "broken-planning-link",
  "planning-alignment-gap",
  "completed-parent-conflict",
]);

function notificationTimestamp(localDate: string): string {
  return `${localDate}T00:00:00`;
}

function localDateKey(value: string): string | undefined {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;

  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

function taskLabel(count: number): string {
  return count === 1 ? "task" : "tasks";
}

function severityForRisk(
  severity: "critical" | "high" | "moderate"
): NotificationSeverity {
  return severity === "moderate" ? "attention" : "important";
}

function evidenceKey(source: string, path: string): string {
  return `${source}:${path}`;
}

function taskIdFromFocusSignal(id: string): number | undefined {
  const match = /^proactive:focus:task-(\d+)$/.exec(id);
  if (!match) return undefined;

  const taskId = Number(match[1]);
  return Number.isFinite(taskId) ? taskId : undefined;
}

export class NotificationEngine {
  create(input: NotificationEngineInput): readonly LifeOSNotification[] {
    const preferences =
      input.preferences ?? DEFAULT_NOTIFICATION_PREFERENCES;
    const notifications: LifeOSNotification[] = [];
    const seenIds = new Set<string>();
    const representedRiskRules = new Set<string>();
    const representedTaskIds = new Set<number>();
    const representedEvidence = new Set<string>();
    const currentTimestamp = notificationTimestamp(input.localDate);

    const add = (notification: LifeOSNotification) => {
      if (!preferences[notification.category]) return false;
      if (seenIds.has(notification.id)) return false;

      seenIds.add(notification.id);
      notification.evidenceKeys.forEach((key) => representedEvidence.add(key));
      notifications.push(notification);
      return true;
    };

    const activeTasks = input.state.tasks.filter((task) => !task.completed);
    const overdueTasks = activeTasks
      .filter((task) => {
        const dueDate = task.dueDate
          ? localDateKey(task.dueDate)
          : undefined;
        return dueDate !== undefined && dueDate < input.localDate;
      })
      .sort((left, right) => left.id - right.id);

    const dueTodayTasks = activeTasks
      .filter(
        (task) =>
          task.dueDate !== undefined &&
          localDateKey(task.dueDate) === input.localDate
      )
      .sort((left, right) => left.id - right.id);

    if (overdueTasks.length > 0) {
      const added = add({
        id: `task:overdue:${input.localDate}`,
        category: "tasks",
        severity: "important",
        title: `${overdueTasks.length} overdue ${taskLabel(overdueTasks.length)}`,
        message: "Incomplete tasks are past their due date.",
        createdAt: currentTimestamp,
        evidenceKeys: overdueTasks.map((task) => `task:${task.id}`),
      });
      if (added) {
        overdueTasks.forEach((task) => representedTaskIds.add(task.id));
      }
    }

    if (dueTodayTasks.length > 0) {
      const added = add({
        id: `task:due-today:${input.localDate}`,
        category: "tasks",
        severity: "attention",
        title: `${dueTodayTasks.length} ${taskLabel(dueTodayTasks.length)} due today`,
        message: "These tasks are incomplete and due before today ends.",
        createdAt: currentTimestamp,
        evidenceKeys: dueTodayTasks.map((task) => `task:${task.id}`),
      });
      if (added) {
        dueTodayTasks.forEach((task) => representedTaskIds.add(task.id));
      }
    }

    for (const finding of input.intelligence.risk.findings) {
      if (!PLANNING_RISK_RULES.has(finding.ruleId)) continue;

      const added = add({
        id: `planning:${finding.ruleId}:${input.localDate}`,
        category: "planning",
        severity: severityForRisk(finding.severity),
        title: finding.title,
        message:
          finding.reasons[0] ??
          "A deterministic planning risk currently needs attention.",
        createdAt: currentTimestamp,
        sourceEntityId: finding.ruleId,
        evidenceKeys: [`risk:${finding.ruleId}`],
      });
      if (added) representedRiskRules.add(finding.ruleId);
    }

    const habitState = {
      habits: [...input.state.habitDefinitions],
      completions: [...input.state.habitCompletions],
    };
    const scheduledHabits = input.state.habitDefinitions.filter((habit) =>
      HabitEngine.isScheduledForDate(habit, input.localDate)
    );
    const completedScheduledHabits = scheduledHabits.filter((habit) =>
      HabitEngine.isCompletedOnDate(habitState, habit.id, input.localDate)
    );
    const remainingHabits = scheduledHabits.length - completedScheduledHabits.length;

    if (remainingHabits > 0) {
      add({
        id: `habit:incomplete:${input.localDate}`,
        category: "habits",
        severity: "attention",
        title: `${remainingHabits} of ${scheduledHabits.length} scheduled habits remain`,
        message: "Today’s scheduled habit completions are not yet finished.",
        createdAt: currentTimestamp,
        evidenceKeys: scheduledHabits.map((habit) => `habit:${habit.id}`),
      });
    }

    for (const insight of input.proactive.insights) {
      if (insight.severity !== "important") continue;

      const riskRule = insight.id.startsWith("proactive:risk:")
        ? insight.id.slice("proactive:risk:".length)
        : undefined;
      if (riskRule && representedRiskRules.has(riskRule)) continue;

      const focusedTaskId = taskIdFromFocusSignal(insight.id);
      if (focusedTaskId !== undefined && representedTaskIds.has(focusedTaskId)) {
        continue;
      }

      const insightEvidence = insight.evidence.map((item) =>
        evidenceKey(item.source, item.path)
      );
      if (insightEvidence.some((key) => representedEvidence.has(key))) continue;

      add({
        id: `atlas:${insight.id}:${input.localDate}`,
        category: "atlas",
        severity: "important",
        title: insight.title,
        message: insight.summary,
        createdAt: currentTimestamp,
        sourceEntityId: insight.id,
        evidenceKeys: insightEvidence,
      });
    }

    const xpRecords = input.state.executionHistory
      .filter(
        (record) =>
          Number.isFinite(record.xpAwarded) &&
          record.xpAwarded > 0 &&
          localDateKey(record.createdAt) === input.localDate
      )
      .sort((left, right) => {
        const timeOrder = right.createdAt.localeCompare(left.createdAt);
        return timeOrder !== 0 ? timeOrder : right.id - left.id;
      });

    for (const record of xpRecords) {
      add({
        id: `xp:${record.id}`,
        category: "xp",
        severity: "info",
        title: `+${record.xpAwarded} XP earned`,
        message: record.title,
        createdAt: record.createdAt,
        sourceEntityId: String(record.id),
        evidenceKeys: [`execution:${record.id}`],
      });
    }

    return structuredClone(notifications.slice(0, NOTIFICATION_MAX_VISIBLE));
  }
}
