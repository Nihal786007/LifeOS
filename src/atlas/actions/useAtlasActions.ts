import { useCallback, useLayoutEffect, useMemo, useState } from "react";
import { useAuth } from "../../auth/AuthContext";
import { useAccountData } from "../../data/account/AccountDataContext";
import { AtlasActionLifecycle } from "./actionLifecycle.ts";
import type { AtlasActionRequestTicket } from "./actionLifecycle.ts";
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
import { getAtlasActionReferenceProblem } from "./actionExecutor.ts";
import {
  createAtlasActionAuditWriter,
  createLifeOSActionAdapter,
} from "./lifeOSActionAdapter.ts";
import { createAtlasActionProposal, createAtlasProposalFingerprint } from "./proposal.ts";
import {
  resolveAtlasActionRequestWithProvider,
} from "./candidate.ts";
import type { AtlasActionCandidateProvider } from "./candidate.ts";
import { OllamaAtlasActionCandidateProvider } from "../providers/ollama/ollamaAtlasActionCandidateProvider.ts";
import { AtlasConnectorRegistry } from "../connectors/registry.ts";
import { MockCalendarConnector, MockConnectorCandidateRouter, MockFinanceReadConnector, MockMessagingConnector } from "../connectors/mockConnectors.ts";
import { createCompositeAtlasActionAdapter, createConnectorActionAdapter } from "../connectors/connectorActionAdapter.ts";
import type {
  AtlasActionApproval,
  AtlasActionExecutionResult,
  AtlasActionProposal,
  AtlasActionProposalDraft,
} from "./types.ts";

export type AtlasActionControllerStatus = "idle" | "preparing" | "pending" | "executing" | "result";

const DEFAULT_CANDIDATE_PROVIDER =
  new MockConnectorCandidateRouter(new OllamaAtlasActionCandidateProvider());

function createAuditId(): number {
  return Date.now();
}

function auditNow(): string {
  return new Date().toISOString();
}

export function useAtlasActions(
  candidateProvider: AtlasActionCandidateProvider = DEFAULT_CANDIDATE_PROVIDER
) {
  const auth = useAuth();
  const account = useAccountData();
  const ownerUserId = auth.phase === "signed-in" && account.phase === "ready" &&
    account.services && account.ownerUserId === auth.identity?.userId
    ? account.ownerUserId : null;
  const lifecycle = useMemo(() => new AtlasActionLifecycle(ownerUserId), [ownerUserId]);
  const [stateScope, setStateScope] = useState(lifecycle);
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
  const currentClarification = stateScope === lifecycle ? clarification : null;
  const mockConnectorRegistry = useMemo(() => new AtlasConnectorRegistry([
    new MockCalendarConnector(), new MockMessagingConnector(), new MockFinanceReadConnector(),
  ]), []);

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

  const adapter = useMemo(() =>
    createCompositeAtlasActionAdapter(createLifeOSActionAdapter({
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
    }), createConnectorActionAdapter(mockConnectorRegistry)),
    [addCapture, habitExecution, mockConnectorRegistry, planning]);
  const auditWriter = useMemo(() => createAtlasActionAuditWriter({
      append: async (records) => {
        const repository = account.services?.executionHistoryRepository;
        if (!repository) throw new Error("Action audit account scope is unavailable.");
        await ExecutionHistoryService.appendConfirmedForRepository(repository, records);
      },
      confirmation: "repository",
      createId: createAuditId,
      now: auditNow,
    }), [account.services]);

  useLayoutEffect(() => {
    lifecycle.updateBindings(ownerUserId ? { ownerUserId, adapter, auditWriter, snapshot: entitySnapshot } : null);
  }, [adapter, auditWriter, entitySnapshot, lifecycle, ownerUserId]);
  useLayoutEffect(() => () => lifecycle.deactivate(), [lifecycle]);

  const prepareCurrent = useCallback((draft: AtlasActionProposalDraft, ticket: AtlasActionRequestTicket) => {
    if (!lifecycle.isCurrent(ticket)) throw new Error("The action request is no longer current.");
    const next = createAtlasActionProposal(draft, {
      id: `atlas-action:${crypto.randomUUID()}`,
      createdAt: new Date().toISOString(),
    });
    const referenceProblem = getAtlasActionReferenceProblem(next, entitySnapshot);
    if (referenceProblem) throw new Error(referenceProblem);
    if (!lifecycle.bindProposal(ticket, next)) throw new Error("The action request is no longer current.");
    setStateScope(lifecycle);
    setProposal(next);
    setResult(null);
    setClarification(null);
    setIntentFeedback(null);
    setStatus("pending");
    return next;
  }, [entitySnapshot, lifecycle]);

  const prepare = useCallback((draft: AtlasActionProposalDraft) => {
    const ticket = lifecycle.beginRequest();
    if (!ticket) throw new Error("The account is unavailable or an action is already executing.");
    return prepareCurrent(draft, ticket);
  }, [lifecycle, prepareCurrent]);

  const interpret = useCallback(async (input: string): Promise<boolean> => {
    const ticket = lifecycle.beginRequest();
    if (!ticket) return true;
    setStateScope(lifecycle);
    setStatus("preparing");
    setProposal(null);
    setResult(null);
    setIntentFeedback(null);
    if (!currentClarification) setClarification(null);
    const outcome = currentClarification
      ? continueAtlasActionClarification(currentClarification, input, { snapshot: intentSnapshot, now: new Date() })
      : (await resolveAtlasActionRequestWithProvider(input, {
          snapshot: intentSnapshot,
          now: new Date(),
          provider: candidateProvider,
        })).outcome;
    // Treat obsolete action requests as handled: do not route them to another provider/UI.
    if (!lifecycle.isCurrent(ticket)) return true;
    if (outcome.status === "conversation") {
      if (currentClarification) setClarification(null);
      setStatus("idle");
      return false;
    }
    setResult(null);
    setProposal(null);
    if (outcome.status === "proposal") {
      try {
        prepareCurrent(outcome.draft, ticket);
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
  }, [candidateProvider, currentClarification, intentSnapshot, lifecycle, prepareCurrent]);

  const cancel = useCallback(() => {
    if (!lifecycle.isActive() || lifecycle.isExecuting()) return; // Cancellation is not an undo operation.
    lifecycle.invalidate();
    if (!proposal || status !== "pending") {
      setStatus("idle");
      return;
    }
    setResult(lifecycle.rejectBeforeStart(proposal, "cancelled", "Cancelled by the user."));
    setProposal(null);
    setStatus("result");
  }, [lifecycle, proposal, status]);

  const approve = useCallback(async () => {
    if (!proposal || status !== "pending" || !lifecycle.canExecute(proposal)) return;
    setStatus("executing");
    const approval: AtlasActionApproval = {
      version: "1.1.0",
      actionId: proposal.id,
      decision: "approved",
      source: "user",
      decidedAt: new Date().toISOString(),
      proposalFingerprint: createAtlasProposalFingerprint(proposal),
    };
    const execution = await lifecycle.execute(proposal, approval);
    // A disposed scope may finish an already-started operation, but cannot publish its result.
    if (!lifecycle.isProposalCurrent(proposal)) return;
    setResult(execution);
    setStatus("result");
  }, [lifecycle, proposal, status]);

  const clearResult = useCallback(() => {
    if (!lifecycle.isActive() || lifecycle.isExecuting()) return;
    lifecycle.invalidate();
    setResult(null);
    setProposal(null);
    setIntentFeedback(null);
    setClarification(null);
    setStatus("idle");
  }, [lifecycle]);

  const dismissIntent = useCallback(() => {
    if (!lifecycle.isActive() || lifecycle.isExecuting()) return;
    lifecycle.invalidate();
    setClarification(null);
    setIntentFeedback(null);
    if (status === "preparing") setStatus("idle");
  }, [lifecycle, status]);

  return {
    outcome: stateScope === lifecycle && proposal ? lifecycle.outcomeFor(proposal.id) : null,
    status: stateScope === lifecycle ? status : "idle" as const,
    proposal: stateScope === lifecycle ? proposal : null,
    result: stateScope === lifecycle ? result : null,
    clarification: stateScope === lifecycle ? clarification : null,
    intentFeedback: stateScope === lifecycle ? intentFeedback : null,
    prepare, interpret, approve, cancel, clearResult, dismissIntent,
  };
}
