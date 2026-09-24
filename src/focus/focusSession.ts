import type { Task } from "../shared/types";

export const FOCUS_SESSION_VERSION = 1 as const;
export const FOCUS_SESSION_STORAGE_PREFIX = "lifeos-focus-active-session-v1";

export type FocusSessionStatus = "running" | "paused";

export interface FocusActiveSession {
  version: typeof FOCUS_SESSION_VERSION;
  sessionId: string;
  taskId: number;
  accountScope: string;
  startedAt: string;
  pausedAt?: string;
  accumulatedPausedMs: number;
  status: FocusSessionStatus;
}

export type FocusSessionReadResult =
  | { status: "missing" }
  | { status: "invalid" }
  | { status: "active"; session: FocusActiveSession };

export type FocusSessionStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

function timestamp(value: string): number | null {
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isAccountScope(value: string): boolean {
  return /^[a-z0-9_-]{8,128}$/i.test(value);
}

export function focusSessionStorageKey(accountScope: string): string {
  if (!isAccountScope(accountScope)) throw new Error("Focus session account scope is invalid");
  return `${FOCUS_SESSION_STORAGE_PREFIX}:${accountScope}`;
}

export function isFocusActiveSession(value: unknown): value is FocusActiveSession {
  if (!isRecord(value)) return false;
  const keys = Object.keys(value).sort();
  const expected = [
    "accountScope",
    "accumulatedPausedMs",
    "sessionId",
    "startedAt",
    "status",
    "taskId",
    "version",
    ...(value.status === "paused" ? ["pausedAt"] : []),
  ].sort();
  if (keys.length !== expected.length || keys.some((key, index) => key !== expected[index])) return false;
  if (value.version !== FOCUS_SESSION_VERSION) return false;
  if (typeof value.sessionId !== "string" || value.sessionId.length < 8 || value.sessionId.length > 128) return false;
  if (!Number.isSafeInteger(value.taskId) || Number(value.taskId) < 0) return false;
  if (typeof value.accountScope !== "string" || !isAccountScope(value.accountScope)) return false;
  if (typeof value.startedAt !== "string" || timestamp(value.startedAt) === null) return false;
  if (!Number.isSafeInteger(value.accumulatedPausedMs) || Number(value.accumulatedPausedMs) < 0) return false;
  if (value.status !== "running" && value.status !== "paused") return false;
  if (value.status === "running") return value.pausedAt === undefined;
  return typeof value.pausedAt === "string" && timestamp(value.pausedAt) !== null && timestamp(value.pausedAt)! >= timestamp(value.startedAt)!;
}

export function createFocusSession(
  taskId: number,
  accountScope: string,
  startedAt: string,
  sessionId: string
): FocusActiveSession {
  const session: FocusActiveSession = {
    version: FOCUS_SESSION_VERSION,
    sessionId,
    taskId,
    accountScope,
    startedAt,
    accumulatedPausedMs: 0,
    status: "running",
  };
  if (!isFocusActiveSession(session)) throw new Error("Cannot create an invalid focus session");
  return session;
}

export function getFocusElapsedMs(session: FocusActiveSession, now: string | number): number {
  const started = timestamp(session.startedAt);
  const current = typeof now === "number" ? now : timestamp(now);
  const paused = session.status === "paused" ? timestamp(session.pausedAt ?? "") : current;
  if (started === null || current === null || paused === null) return 0;
  return Math.max(0, paused - started - session.accumulatedPausedMs);
}

export function pauseFocusSession(session: FocusActiveSession, pausedAt: string): FocusActiveSession {
  if (session.status === "paused") return session;
  const paused = timestamp(pausedAt);
  const started = timestamp(session.startedAt);
  if (paused === null || started === null || paused < started) throw new Error("Focus pause timestamp is invalid");
  return { ...session, status: "paused", pausedAt };
}

export function resumeFocusSession(session: FocusActiveSession, resumedAt: string): FocusActiveSession {
  if (session.status === "running") return session;
  const paused = timestamp(session.pausedAt ?? "");
  const resumed = timestamp(resumedAt);
  if (paused === null || resumed === null || resumed < paused) throw new Error("Focus resume timestamp is invalid");
  return {
    version: session.version,
    sessionId: session.sessionId,
    taskId: session.taskId,
    accountScope: session.accountScope,
    startedAt: session.startedAt,
    status: "running",
    accumulatedPausedMs: session.accumulatedPausedMs + (resumed - paused),
  };
}

export function readFocusSession(storage: FocusSessionStorage, accountScope: string): FocusSessionReadResult {
  const key = focusSessionStorageKey(accountScope);
  let raw: string | null;
  try {
    raw = storage.getItem(key);
  } catch {
    return { status: "invalid" };
  }
  if (raw === null) return { status: "missing" };
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isFocusActiveSession(parsed) || parsed.accountScope !== accountScope) {
      storage.removeItem(key);
      return { status: "invalid" };
    }
    return { status: "active", session: structuredClone(parsed) };
  } catch {
    try { storage.removeItem(key); } catch { /* fail closed in memory */ }
    return { status: "invalid" };
  }
}

export function restoreFocusSessionForTasks(
  storage: FocusSessionStorage,
  accountScope: string,
  tasks: readonly Task[]
): FocusSessionReadResult {
  const result = readFocusSession(storage, accountScope);
  if (result.status !== "active") return result;
  const task = tasks.find((candidate) => candidate.id === result.session.taskId);
  if (!task || task.completed) {
    clearFocusSession(storage, accountScope);
    return { status: "invalid" };
  }
  return result;
}

export function writeFocusSession(storage: FocusSessionStorage, session: FocusActiveSession): void {
  if (!isFocusActiveSession(session)) throw new Error("Cannot persist an invalid focus session");
  storage.setItem(focusSessionStorageKey(session.accountScope), JSON.stringify(session));
}

export function clearFocusSession(storage: FocusSessionStorage, accountScope: string): void {
  storage.removeItem(focusSessionStorageKey(accountScope));
}
