import assert from "node:assert/strict";
import test from "node:test";

import {
  clearFocusSession,
  createFocusSession,
  getFocusElapsedMs,
  pauseFocusSession,
  readFocusSession,
  restoreFocusSessionForTasks,
  resumeFocusSession,
  writeFocusSession,
  type FocusSessionStorage,
} from "../../src/focus/focusSession.ts";
import {
  buildFocusCompletionRecord,
  captureFocusThought,
  completeFocusedTask,
  FOCUS_COMPLETION_EVENT,
  recordFocusCompletion,
} from "../../src/focus/focusAudit.ts";
import { TaskRelationshipEngine } from "../../src/engines/TaskRelationshipEngine.ts";
import { ExecutionHistoryService } from "../../src/services/ExecutionHistoryService.ts";
import type { ExecutionHistoryRepository } from "../../src/data/execution/executionHistoryRepository.ts";
import type { ExecutionRecord } from "../../src/shared/execution.ts";
import type { Task } from "../../src/shared/types.ts";

class MemoryStorage implements FocusSessionStorage {
  readonly values = new Map<string, string>();
  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, value: string) { this.values.set(key, value); }
  removeItem(key: string) { this.values.delete(key); }
}

const task: Task = {
  id: 42,
  title: "Ship Focus Mode",
  priority: "high",
  completed: false,
  createdAt: "2026-09-23T08:00:00.000Z",
};

function session() {
  return createFocusSession(42, "account_scope_123456", "2026-09-23T10:00:00.000Z", "focus-session-123");
}

test("elapsed time is derived from timestamps rather than timer ticks", () => {
  assert.equal(getFocusElapsedMs(session(), "2026-09-23T10:37:12.000Z"), 2_232_000);
});

test("pause freezes elapsed time and resume excludes the paused interval", () => {
  const storage = new MemoryStorage();
  const paused = pauseFocusSession(session(), "2026-09-23T10:10:00.000Z");
  assert.equal(getFocusElapsedMs(paused, "2026-09-23T12:00:00.000Z"), 600_000);
  const resumed = resumeFocusSession(paused, "2026-09-23T10:25:00.000Z");
  assert.equal(getFocusElapsedMs(resumed, "2026-09-23T10:40:00.000Z"), 1_500_000);
  assert.equal(Object.hasOwn(resumed, "pausedAt"), false);
  writeFocusSession(storage, resumed);
  assert.equal(readFocusSession(storage, resumed.accountScope).status, "active");
});

test("active sessions survive reload with their exact timestamps", () => {
  const storage = new MemoryStorage();
  const active = pauseFocusSession(session(), "2026-09-23T10:05:00.000Z");
  writeFocusSession(storage, active);
  assert.deepEqual(readFocusSession(storage, active.accountScope), { status: "active", session: active });
});

test("running sessions restore without losing elapsed-time authority", () => {
  const storage = new MemoryStorage();
  writeFocusSession(storage, session());
  const restored = restoreFocusSessionForTasks(storage, session().accountScope, [task]);
  assert.equal(restored.status, "active");
  assert.equal(restored.status === "active" ? getFocusElapsedMs(restored.session, "2026-09-23T11:00:00.000Z") : 0, 3_600_000);
});

test("invalid stored sessions fail closed and are removed", () => {
  const storage = new MemoryStorage();
  storage.setItem("lifeos-focus-active-session-v1:account_scope_123456", "{bad");
  assert.deepEqual(readFocusSession(storage, "account_scope_123456"), { status: "invalid" });
  assert.equal(storage.values.size, 0);
});

test("missing or completed focused tasks invalidate restored sessions", () => {
  const storage = new MemoryStorage();
  writeFocusSession(storage, session());
  assert.equal(restoreFocusSessionForTasks(storage, session().accountScope, []).status, "invalid");
  writeFocusSession(storage, session());
  assert.equal(restoreFocusSessionForTasks(storage, session().accountScope, [{ ...task, completed: true }]).status, "invalid");
});

test("account-scoped storage never restores another account session", () => {
  const storage = new MemoryStorage();
  writeFocusSession(storage, session());
  assert.equal(readFocusSession(storage, "different_account_scope").status, "missing");
  clearFocusSession(storage, "different_account_scope");
  assert.equal(readFocusSession(storage, session().accountScope).status, "active");
});

test("sign-out and account switching do not erase or expose another scoped session", () => {
  const storage = new MemoryStorage();
  writeFocusSession(storage, session());
  assert.equal(readFocusSession(storage, "signed_out_scope_123").status, "missing");
  assert.equal(readFocusSession(storage, "second_account_scope").status, "missing");
  assert.equal(readFocusSession(storage, session().accountScope).status, "active");
});

test("focus completion is a zero-XP system audit with bounded metadata", () => {
  const record = buildFocusCompletionRecord(session(), "2026-09-23T10:30:00.000Z", 1001);
  assert.equal(record.type, "system");
  assert.equal(record.xpAwarded, 0);
  assert.equal(record.entityId, task.id);
  assert.deepEqual(record.metadata, {
    eventKind: FOCUS_COMPLETION_EVENT,
    focusSessionId: session().sessionId,
    taskId: task.id,
    durationMs: 1_800_000,
    startedAt: session().startedAt,
    endedAt: "2026-09-23T10:30:00.000Z",
    source: "focus_mode",
  });
});

test("duplicate concurrent end requests append exactly one audit", async () => {
  let records: ExecutionRecord[] = [];
  let appendCalls = 0;
  const dependencies = {
    getAll: () => structuredClone(records),
    createExecutionId: () => 1002,
    appendConfirmed: async (added: ExecutionRecord[]) => {
      appendCalls += 1;
      await Promise.resolve();
      records = [...added, ...records];
      return structuredClone(records);
    },
  };
  const [first, second] = await Promise.all([
    recordFocusCompletion(session(), "2026-09-23T10:20:00.000Z", dependencies),
    recordFocusCompletion(session(), "2026-09-23T10:20:00.000Z", dependencies),
  ]);
  assert.equal(appendCalls, 1);
  assert.equal(records.length, 1);
  assert.equal(first.executionRecord.id, second.executionRecord.id);
  const retry = await recordFocusCompletion(session(), "2026-09-23T10:21:00.000Z", dependencies);
  assert.equal(retry.alreadyRecorded, true);
  assert.equal(appendCalls, 1);
});

test("ending focus does not complete or otherwise mutate the Task", async () => {
  const before = structuredClone(task);
  const records: ExecutionRecord[] = [];
  await recordFocusCompletion(session(), "2026-09-23T10:15:00.000Z", {
    getAll: () => records,
    createExecutionId: () => 1003,
    appendConfirmed: async (added) => { records.unshift(...added); return records; },
  });
  assert.deepEqual(task, before);
  assert.equal(task.completed, false);
});

test("explicit completion delegates only to the trusted Task completion boundary", () => {
  const calls: number[] = [];
  completeFocusedTask(task.id, (taskId) => calls.push(taskId));
  assert.deepEqual(calls, [task.id]);
});

test("Quick Capture delegates trimmed text to the existing capture boundary", async () => {
  const captures: string[] = [];
  assert.equal(await captureFocusThought("  follow up tomorrow  ", async (text) => { captures.push(text); }), true);
  assert.equal(await captureFocusThought("   ", async (text) => { captures.push(text); }), false);
  assert.deepEqual(captures, ["follow up tomorrow"]);
});

test("planning relationship display is derived without mutating canonical inputs", () => {
  const weekly = { id: 7, title: "Focus week", week: 4 as const, progress: 0, completed: false, createdAt: "2026-09-01T00:00:00.000Z" };
  const state = { tasks: [{ ...task, weeklyTargetId: 7 }], weeklyTargets: [weekly], monthlyTargets: [], lifeGoals: [] };
  const before = structuredClone(state);
  assert.equal(TaskRelationshipEngine.resolve(state, task.id)?.weeklyTarget?.title, "Focus week");
  assert.deepEqual(state, before);
});

test("confirmed audit persistence accepts semantically equal records with reordered fields", async () => {
  let records: ExecutionRecord[] = [];
  const repository: ExecutionHistoryRepository = {
    load: () => structuredClone(records),
    save: (next) => { records = structuredClone(next); },
    append: (added) => {
      records = [...added, ...records].map((record) => ({
        id: record.id,
        type: record.type,
        entityId: record.entityId,
        title: record.title,
        createdAt: record.createdAt,
        xpAwarded: record.xpAwarded,
        ...(record.description === undefined ? {} : { description: record.description }),
        ...(record.icon === undefined ? {} : { icon: record.icon }),
        ...(record.color === undefined ? {} : { color: record.color }),
        ...(record.metadata === undefined ? {} : { metadata: structuredClone(record.metadata) }),
      }));
      return structuredClone(records);
    },
    remove: (id) => { records = records.filter((record) => record.id !== id); return structuredClone(records); },
    clear: () => { records = []; },
    subscribe: () => () => undefined,
  };
  ExecutionHistoryService.configureRepository(repository);
  const record = buildFocusCompletionRecord(session(), "2026-09-23T10:30:00.000Z", 1004);
  const confirmed = await ExecutionHistoryService.appendConfirmed([record]);
  assert.equal(confirmed.length, 1);
  assert.deepEqual(confirmed[0], record);
  ExecutionHistoryService.releaseRepository(repository);
});
