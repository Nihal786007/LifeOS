import { useCallback, useMemo, useState } from "react";
import { useApp } from "../../context/AppContext";
import { useHabitExecution } from "../../context/HabitExecutionContext";
import { useHabits } from "../../context/HabitContext";
import { useMonthlyPlanning } from "../../context/MonthlyPlanningContext";
import { usePlanningExecution } from "../../context/PlanningExecutionContext";
import { useTasks } from "../../context/TaskContext";
import { useWeeklyPlanning } from "../../context/WeeklyPlanningContext";
import { ExecutionHistoryService } from "../../services/ExecutionHistoryService";
import {
  continueAtlasActionClarification,
} from "./actionIntent.ts";
import type { AtlasActionClarification } from "./actionIntent.ts";
import { AtlasActionExecutor, getAtlasActionReferenceProblem } from "./actionExecutor.ts";
import {
  createAtlasActionAuditWriter,
  createLifeOSActionAdapter,
} from "./lifeOSActionAdapter.ts";
import { createAtlasActionProposal } from "./proposal.ts";
import {
  DeterministicMockAtlasActionCandidateProvider,
  resolveAtlasActionRequestWithProvider,
} from "./candidate.ts";
import type { AtlasActionCandidateProvider } from "./candidate.ts";
import type {
  AtlasActionApproval,
  AtlasActionExecutionResult,
  AtlasActionProposal,
  AtlasActionProposalDraft,
} from "./types.ts";

export type AtlasActionControllerStatus = "idle" | "preparing" | "pending" | "executing" | "result";

const DEFAULT_CANDIDATE_PROVIDER =
  new DeterministicMockAtlasActionCandidateProvider();

function createAuditId(): number {
  return Date.now();
}

function auditNow(): string {
  return new Date().toISOString();
}

export function useAtlasActions(
  candidateProvider: AtlasActionCandidateProvider = DEFAULT_CANDIDATE_PROVIDER
) {
  const planning = usePlanningExecution();
  const habitExecution = useHabitExecution();
  const { addCapture } = useApp();
  const { tasks } = useTasks();
  const { habits } = useHabits();
  const { monthlyPlans } = useMonthlyPlanning();
  const { weeklyTargets } = useWeeklyPlanning();
  const [proposal, setProposal] = useState<AtlasActionProposal | null>(null);
  const [result, setResult] = useState<AtlasActionExecutionResult | null>(null);
  const [clarification, setClarification] = useState<AtlasActionClarification | null>(null);
  const [intentFeedback, setIntentFeedback] = useState<string | null>(null);
  const [status, setStatus] = useState<AtlasActionControllerStatus>("idle");

  const intentSnapshot = useMemo(() => ({
    tasks: tasks.map(({ id, title, completed }) => ({ id, title, completed })),
    habits: habits.map(({ id, name, archived }) => ({ id, name, archived })),
    monthlyOutcomes: monthlyPlans.map(({ id, title }) => ({ id, title })),
    weeklyFocuses: weeklyTargets.map(({ id, title }) => ({ id, title })),
  }), [habits, monthlyPlans, tasks, weeklyTargets]);

  const entitySnapshot = useMemo(() => ({
    taskIds: tasks.map((task) => task.id),
    completedTaskIds: tasks.filter((task) => task.completed).map((task) => task.id),
    habitIds: habits.map((habit) => habit.id),
    monthlyOutcomeIds: monthlyPlans.map((item) => item.id),
    weeklyFocusIds: weeklyTargets.map((item) => item.id),
  }), [habits, monthlyPlans, tasks, weeklyTargets]);

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
    const referenceProblem = getAtlasActionReferenceProblem(next, entitySnapshot);
    if (referenceProblem) throw new Error(referenceProblem);
    setProposal(next);
    setResult(null);
    setClarification(null);
    setIntentFeedback(null);
    setStatus("pending");
    return next;
  }, [entitySnapshot]);

  const interpret = useCallback(async (input: string): Promise<boolean> => {
    setStatus("preparing");
    const outcome = clarification
      ? continueAtlasActionClarification(clarification, input, { snapshot: intentSnapshot, now: new Date() })
      : (await resolveAtlasActionRequestWithProvider(input, {
          snapshot: intentSnapshot,
          now: new Date(),
          provider: candidateProvider,
        })).outcome;
    if (outcome.status === "conversation") {
      if (clarification) setClarification(null);
      setStatus("idle");
      return false;
    }
    setResult(null);
    setProposal(null);
    if (outcome.status === "proposal") {
      try {
        prepare(outcome.draft);
      } catch {
        setIntentFeedback("ATLAS rejected a stale or invalid action reference. No action was prepared.");
        setStatus("idle");
      }
      return true;
    }
    if (outcome.status === "clarification") {
      setClarification(outcome.clarification);
      setIntentFeedback(null);
      setStatus("idle");
      return true;
    }
    setClarification(null);
    setIntentFeedback(outcome.message);
    setStatus("idle");
    return true;
  }, [candidateProvider, clarification, intentSnapshot, prepare]);

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
      snapshot: entitySnapshot,
    });
    setResult(execution);
    setProposal(null);
    setStatus("result");
  }, [entitySnapshot, executor, proposal, status]);

  const clearResult = useCallback(() => {
    setResult(null);
    setIntentFeedback(null);
    setClarification(null);
    setStatus("idle");
  }, []);

  const dismissIntent = useCallback(() => {
    setClarification(null);
    setIntentFeedback(null);
  }, []);

  return {
    status, proposal, result, clarification, intentFeedback,
    prepare, interpret, approve, cancel, clearResult, dismissIntent,
  };
}
