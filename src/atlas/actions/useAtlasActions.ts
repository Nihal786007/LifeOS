import { useCallback, useMemo, useState } from "react";
import { useApp } from "../../context/AppContext";
import { useHabitExecution } from "../../context/HabitExecutionContext";
import { useHabits } from "../../context/HabitContext";
import { useMonthlyPlanning } from "../../context/MonthlyPlanningContext";
import { usePlanningExecution } from "../../context/PlanningExecutionContext";
import { useTasks } from "../../context/TaskContext";
import { useWeeklyPlanning } from "../../context/WeeklyPlanningContext";
import { ExecutionHistoryService } from "../../services/ExecutionHistoryService";
import { AtlasActionExecutor } from "./actionExecutor.ts";
import {
  createAtlasActionAuditWriter,
  createLifeOSActionAdapter,
} from "./lifeOSActionAdapter.ts";
import { createAtlasActionProposal } from "./proposal.ts";
import type {
  AtlasActionApproval,
  AtlasActionExecutionResult,
  AtlasActionProposal,
  AtlasActionProposalDraft,
} from "./types.ts";

export type AtlasActionControllerStatus = "idle" | "pending" | "executing" | "result";

function createAuditId(): number {
  return Date.now();
}

function auditNow(): string {
  return new Date().toISOString();
}

export function useAtlasActions() {
  const planning = usePlanningExecution();
  const habitExecution = useHabitExecution();
  const { addCapture } = useApp();
  const { tasks } = useTasks();
  const { habits } = useHabits();
  const { monthlyPlans } = useMonthlyPlanning();
  const { weeklyTargets } = useWeeklyPlanning();
  const [proposal, setProposal] = useState<AtlasActionProposal | null>(null);
  const [result, setResult] = useState<AtlasActionExecutionResult | null>(null);
  const [status, setStatus] = useState<AtlasActionControllerStatus>("idle");

  const executor = useMemo(() => new AtlasActionExecutor(
    createLifeOSActionAdapter({
      createTask: planning.createTask,
      updateTask: planning.updateTask,
      completeTask: planning.completeTask,
      createHabit: habitExecution.createHabit,
      updateHabit: habitExecution.updateHabit,
      createCapture: addCapture,
      createGoalWeeklyFocus: ({ title, monthlyTargetId, weekStartDate, weekEndDate }) =>
        planning.createGoalWeeklyFocus(title, monthlyTargetId, weekStartDate, weekEndDate),
      createPersonalWeeklyFocus: ({ title, monthlyTargetId, weekStartDate, weekEndDate }) =>
        planning.createPersonalWeeklyFocus(title, monthlyTargetId, weekStartDate, weekEndDate),
    }),
    createAtlasActionAuditWriter({
      append: (records) => { ExecutionHistoryService.append(records); },
      createId: createAuditId,
      now: auditNow,
    })
  ), [addCapture, habitExecution, planning]);

  const prepare = useCallback((draft: AtlasActionProposalDraft) => {
    const next = createAtlasActionProposal(draft, {
      id: `atlas-action:${crypto.randomUUID()}`,
      createdAt: new Date().toISOString(),
    });
    setProposal(next);
    setResult(null);
    setStatus("pending");
    return next;
  }, []);

  const cancel = useCallback(() => {
    if (!proposal || status !== "pending") return;
    setResult({ status: "rejected", actionId: proposal.id, reason: "Cancelled by the user." });
    setProposal(null);
    setStatus("result");
  }, [proposal, status]);

  const approve = useCallback(async () => {
    if (!proposal || status !== "pending") return;
    setStatus("executing");
    const approval: AtlasActionApproval = {
      version: "1.0.0",
      actionId: proposal.id,
      decision: "approved",
      source: "user",
      decidedAt: new Date().toISOString(),
    };
    const execution = await executor.executeApprovedAction({
      proposal,
      approval,
      snapshot: {
        taskIds: tasks.map((task) => task.id),
        completedTaskIds: tasks.filter((task) => task.completed).map((task) => task.id),
        habitIds: habits.map((habit) => habit.id),
        monthlyOutcomeIds: monthlyPlans.map((item) => item.id),
        weeklyFocusIds: weeklyTargets.map((item) => item.id),
      },
    });
    setResult(execution);
    setProposal(null);
    setStatus("result");
  }, [executor, habits, monthlyPlans, proposal, status, tasks, weeklyTargets]);

  const clearResult = useCallback(() => {
    setResult(null);
    setStatus("idle");
  }, []);

  return { status, proposal, result, prepare, approve, cancel, clearResult };
}
