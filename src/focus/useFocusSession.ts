import { useCallback, useEffect, useMemo, useState } from "react";

import { useAuth } from "../auth/AuthContext";
import { authenticatedUserHash } from "../data/database/authenticatedLifeOSPowerSync";
import { useTasks } from "../context/TaskContext";
import { ExecutionHistoryService } from "../services/ExecutionHistoryService";
import type { Task } from "../shared/types";
import {
  clearFocusSession,
  createFocusSession,
  getFocusElapsedMs,
  pauseFocusSession,
  restoreFocusSessionForTasks,
  resumeFocusSession,
  writeFocusSession,
  type FocusActiveSession,
} from "./focusSession";
import {
  recordFocusCompletion,
  type FocusCompletionSummary,
} from "./focusAudit";

export type FocusControllerPhase = "loading" | "ready" | "error";

export interface FocusSessionController {
  phase: FocusControllerPhase;
  session: FocusActiveSession | null;
  task: Task | null;
  elapsedMs: number;
  error: string | null;
  outcome: FocusCompletionSummary | null;
  start(taskId: number): void;
  pause(): void;
  resume(): void;
  end(): Promise<void>;
  clearOutcome(): void;
}

function nowIso(): string {
  return new Date().toISOString();
}

function executionId(): number {
  const existing = new Set(ExecutionHistoryService.getAll().map((record) => record.id));
  let candidate = Date.now();
  while (existing.has(candidate)) candidate += 1;
  return candidate;
}

export function useFocusSession(): FocusSessionController {
  const { identity } = useAuth();
  const { tasks } = useTasks();
  const [phase, setPhase] = useState<FocusControllerPhase>("loading");
  const [accountScope, setAccountScope] = useState<string | null>(null);
  const [session, setSession] = useState<FocusActiveSession | null>(null);
  const [outcome, setOutcome] = useState<FocusCompletionSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [clock, setClock] = useState(() => Date.now());

  useEffect(() => {
    let active = true;
    // Account changes must hide the previous account's in-memory session before
    // the asynchronous hash and scoped storage lookup complete.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPhase("loading");
    setAccountScope(null);
    setSession(null);
    setOutcome(null);
    setError(null);

    if (!identity) {
      setPhase("error");
      setError("Focus Mode requires an authenticated account.");
      return () => { active = false; };
    }

    void authenticatedUserHash(identity.userId).then((scope) => {
      if (!active) return;
      const restored = restoreFocusSessionForTasks(window.localStorage, scope, tasks);
      setAccountScope(scope);
      setSession(restored.status === "active" ? restored.session : null);
      setPhase("ready");
    }).catch(() => {
      if (!active) return;
      setPhase("error");
      setError("Focus Mode could not initialize its account-scoped session.");
    });

    return () => { active = false; };
    // Tasks are intentionally read once for account/session hydration. Live task
    // validity is handled by the dedicated effect below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [identity?.userId]);

  useEffect(() => {
    if (!session || !accountScope) return;
    const current = tasks.find((candidate) => candidate.id === session.taskId);
    if (current && !current.completed) return;
    clearFocusSession(window.localStorage, accountScope);
    // Canonical Task changes invalidate an active external-storage session.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSession(null);
    setError(current ? "The focused task was completed, so the active session was closed." : "The focused task no longer exists.");
  }, [accountScope, session, tasks]);

  useEffect(() => {
    if (session?.status !== "running") return;
    const timer = window.setInterval(() => setClock(Date.now()), 1_000);
    return () => window.clearInterval(timer);
  }, [session?.status]);

  const task = useMemo(
    () => session ? tasks.find((candidate) => candidate.id === session.taskId) ?? null : null,
    [session, tasks]
  );
  const elapsedMs = session ? getFocusElapsedMs(session, clock) : 0;

  const persist = useCallback((next: FocusActiveSession) => {
    writeFocusSession(window.localStorage, next);
    setSession(next);
    setClock(Date.now());
    setError(null);
  }, []);

  const start = useCallback((taskId: number) => {
    if (phase !== "ready" || !accountScope) return;
    const selected = tasks.find((candidate) => candidate.id === taskId && !candidate.completed);
    if (!selected) {
      setError("Choose an active task before starting Focus Mode.");
      return;
    }
    persist(createFocusSession(taskId, accountScope, nowIso(), crypto.randomUUID()));
    setOutcome(null);
  }, [accountScope, persist, phase, tasks]);

  const pause = useCallback(() => {
    if (session?.status !== "running") return;
    persist(pauseFocusSession(session, nowIso()));
  }, [persist, session]);

  const resume = useCallback(() => {
    if (session?.status !== "paused") return;
    persist(resumeFocusSession(session, nowIso()));
  }, [persist, session]);

  const end = useCallback(async () => {
    if (!session || !accountScope) return;
    setError(null);
    try {
      const summary = await recordFocusCompletion(session, nowIso(), {
        getAll: () => ExecutionHistoryService.getAll(),
        appendConfirmed: (records) => ExecutionHistoryService.appendConfirmed(records),
        createExecutionId: executionId,
      });
      clearFocusSession(window.localStorage, accountScope);
      setSession(null);
      setOutcome(summary);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Focus session could not be recorded.");
    }
  }, [accountScope, session]);

  return {
    phase,
    session,
    task,
    elapsedMs,
    error,
    outcome,
    start,
    pause,
    resume,
    end,
    clearOutcome: () => setOutcome(null),
  };
}
