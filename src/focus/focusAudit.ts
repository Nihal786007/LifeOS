import type { ExecutionRecord } from "../shared/execution";
import type { FocusActiveSession } from "./focusSession";
import { getFocusElapsedMs } from "./focusSession.ts";

export const FOCUS_COMPLETION_EVENT = "focus_session_completed" as const;

export interface FocusAuditDependencies {
  getAll(): ExecutionRecord[];
  appendConfirmed(records: ExecutionRecord[]): Promise<ExecutionRecord[]>;
  createExecutionId(): number;
}

export interface FocusCompletionSummary {
  executionRecord: ExecutionRecord;
  durationMs: number;
  alreadyRecorded: boolean;
}

const inFlight = new Map<string, Promise<FocusCompletionSummary>>();

function sessionIdOf(record: ExecutionRecord): string | undefined {
  return record.type === "system" && record.metadata?.eventKind === FOCUS_COMPLETION_EVENT
    ? String(record.metadata.focusSessionId ?? "") || undefined
    : undefined;
}

export function isFocusCompletionRecord(record: ExecutionRecord): boolean {
  return sessionIdOf(record) !== undefined && record.xpAwarded === 0;
}

export function buildFocusCompletionRecord(
  session: FocusActiveSession,
  endedAt: string,
  executionId: number
): ExecutionRecord {
  const ended = Date.parse(endedAt);
  if (!Number.isFinite(ended)) throw new Error("Focus end timestamp is invalid");
  const durationMs = getFocusElapsedMs(session, ended);
  if (durationMs <= 0) throw new Error("A focus session must contain focused time before it can end");
  return {
    id: executionId,
    type: "system",
    entityId: session.taskId,
    title: "Focus session completed",
    description: "Completed a timed Focus Mode session.",
    createdAt: endedAt,
    xpAwarded: 0,
    icon: "focus",
    color: "cyan",
    metadata: {
      eventKind: FOCUS_COMPLETION_EVENT,
      focusSessionId: session.sessionId,
      taskId: session.taskId,
      durationMs,
      startedAt: session.startedAt,
      endedAt,
      source: "focus_mode",
    },
  };
}

export function recordFocusCompletion(
  session: FocusActiveSession,
  endedAt: string,
  dependencies: FocusAuditDependencies
): Promise<FocusCompletionSummary> {
  const existing = dependencies.getAll().find((record) => sessionIdOf(record) === session.sessionId);
  if (existing) {
    return Promise.resolve({
      executionRecord: existing,
      durationMs: Number(existing.metadata?.durationMs) || 0,
      alreadyRecorded: true,
    });
  }
  const pending = inFlight.get(session.sessionId);
  if (pending) return pending;

  const operation = (async () => {
    const record = buildFocusCompletionRecord(session, endedAt, dependencies.createExecutionId());
    const persisted = await dependencies.appendConfirmed([record]);
    const confirmed = persisted.find((candidate) => sessionIdOf(candidate) === session.sessionId);
    if (!confirmed) throw new Error("Focus completion was not confirmed by Execution History");
    return {
      executionRecord: confirmed,
      durationMs: Number(confirmed.metadata?.durationMs) || 0,
      alreadyRecorded: false,
    };
  })().finally(() => inFlight.delete(session.sessionId));

  inFlight.set(session.sessionId, operation);
  return operation;
}

export async function captureFocusThought(
  text: string,
  addCapture: (text: string) => Promise<void>
): Promise<boolean> {
  const normalized = text.trim();
  if (!normalized) return false;
  await addCapture(normalized);
  return true;
}

export function completeFocusedTask(taskId: number, completeTask: (taskId: number) => void): void {
  completeTask(taskId);
}
