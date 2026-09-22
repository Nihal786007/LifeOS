import assert from "node:assert/strict";
import test from "node:test";

import type { Task } from "../../src/shared/types.ts";
import type { ExecutionRecord } from "../../src/shared/execution.ts";

import {
  resetLocalTaskActivity,
} from "../../src/data/reset/resetLocalTaskActivity.ts";

interface DurableState {
  tasks: Task[];
  executionRecords: ExecutionRecord[];
  migrationJournal: string[];
  unrelated: {
    profile: string;
    planning: string[];
    habits: string[];
    captures: string[];
    atlasMemory: string[];
    notifications: string[];
  };
  staleLocalStorage: {
    tasks: Task[];
    executionRecords: ExecutionRecord[];
  };
}

const task: Task = {
  id: 1700000000001,
  title: "Reset boundary task",
  priority: "medium",
  completed: true,
  createdAt: "2026-09-14T08:00:00.000Z",
};

const executionRecord: ExecutionRecord = {
  id: 1700000000002,
  type: "task_completed",
  entityId: task.id,
  title: task.title,
  description: "Completed task",
  createdAt: "2026-09-14T08:30:00.000Z",
  xpAwarded: 25,
  icon: "check",
  color: "green",
};

function createState(): DurableState {
  return {
    tasks: [structuredClone(task)],
    executionRecords: [structuredClone(executionRecord)],
    migrationJournal: [
      "local-storage-tasks-v1",
      "local-storage-execution-history-v1",
      "local-storage-profile-v1",
    ],
    unrelated: {
      profile: "Nihal",
      planning: ["goal-1"],
      habits: ["habit-1"],
      captures: ["capture-1"],
      atlasMemory: ["memory-1"],
      notifications: ["read-1"],
    },
    staleLocalStorage: {
      tasks: [structuredClone(task)],
      executionRecords: [structuredClone(executionRecord)],
    },
  };
}

function repositories(state: DurableState, failDomain?: "tasks" | "execution") {
  return {
    taskRepository: {
      async initialize() {
        return structuredClone(state.tasks);
      },
      async readCurrent() {
        return structuredClone(state.tasks);
      },
      async waitForPersistence() {},
      async replace(tasks: Task[]) {
        if (failDomain === "tasks" && tasks.length === 0) {
          throw new Error("task clear failed");
        }
        state.tasks = structuredClone(tasks);
      },
    },
    executionHistoryRepository: {
      async initialize() {
        return structuredClone(state.executionRecords);
      },
      async readCurrent() {
        return structuredClone(state.executionRecords);
      },
      async waitForPersistence() {},
      async replace(records: ExecutionRecord[]) {
        state.executionRecords = structuredClone(records);
        return structuredClone(records);
      },
      async clear() {
        if (failDomain === "execution") {
          throw new Error("execution clear failed");
        }
        state.executionRecords = [];
      },
    },
  };
}

function totalXP(records: readonly ExecutionRecord[]): number {
  return records.reduce(
    (total, record) => total + Math.max(0, Number(record.xpAwarded) || 0),
    0
  );
}

test("reset clears only canonical Tasks and Execution History", async () => {
  const state = createState();
  const unrelatedBefore = structuredClone(state.unrelated);
  const result = await resetLocalTaskActivity(repositories(state));

  assert.deepEqual(result, {
    clearedTaskCount: 1,
    clearedExecutionRecordCount: 1,
  });
  assert.deepEqual(state.tasks, []);
  assert.deepEqual(state.executionRecords, []);
  assert.deepEqual(state.unrelated, unrelatedBefore);
});

test("migration journals and rollback LocalStorage snapshots remain untouched", async () => {
  const state = createState();
  const journalBefore = structuredClone(state.migrationJournal);
  const rollbackBefore = structuredClone(state.staleLocalStorage);

  await resetLocalTaskActivity(repositories(state));

  assert.deepEqual(state.migrationJournal, journalBefore);
  assert.deepEqual(state.staleLocalStorage, rollbackBefore);
});

test("reopen keeps canonical data empty instead of restoring stale rollback snapshots", async () => {
  const state = createState();
  await resetLocalTaskActivity(repositories(state));

  const reopened = repositories(state);
  assert.deepEqual(await reopened.taskRepository.initialize(), []);
  assert.deepEqual(
    await reopened.executionHistoryRepository.initialize(),
    []
  );
  assert.equal(state.staleLocalStorage.tasks.length, 1);
  assert.equal(state.staleLocalStorage.executionRecords.length, 1);
});

test("clearing the execution ledger returns derived XP to zero", async () => {
  const state = createState();
  assert.equal(totalXP(state.executionRecords), 25);

  await resetLocalTaskActivity(repositories(state));

  assert.equal(totalXP(state.executionRecords), 0);
});

test("reset is idempotent", async () => {
  const state = createState();
  const resetRepositories = repositories(state);
  await resetLocalTaskActivity(resetRepositories);
  const second = await resetLocalTaskActivity(resetRepositories);

  assert.deepEqual(second, {
    clearedTaskCount: 0,
    clearedExecutionRecordCount: 0,
  });
  assert.deepEqual(state.tasks, []);
  assert.deepEqual(state.executionRecords, []);
});

test("reset reads newer canonical records instead of the cached empty initialization", async () => {
  const state = createState();
  state.tasks = [];
  state.executionRecords = [];
  const scoped = repositories(state);
  assert.deepEqual(await scoped.taskRepository.initialize(), []);
  assert.deepEqual(await scoped.executionHistoryRepository.initialize(), []);
  state.tasks.push(structuredClone(task));
  state.executionRecords.push(structuredClone(executionRecord));
  const result = await resetLocalTaskActivity({
    taskRepository: { ...scoped.taskRepository, initialize: async () => [] },
    executionHistoryRepository: { ...scoped.executionHistoryRepository, initialize: async () => [] },
  });
  assert.deepEqual(result, { clearedTaskCount: 1, clearedExecutionRecordCount: 1 });
  assert.deepEqual(state.tasks, []);
  assert.deepEqual(state.executionRecords, []);
  assert.equal(totalXP(state.executionRecords), 0);
});

test("account-scoped reset does not affect another account or unrelated domains", async () => {
  const accountA = createState();
  const accountB = createState();
  accountB.executionRecords.push({ ...executionRecord, title: "Second event with the same canonical ID" });
  const originalB = structuredClone(accountB);
  const unrelatedA = structuredClone(accountA.unrelated);
  await resetLocalTaskActivity(repositories(accountA));
  assert.deepEqual(accountB, originalB);
  assert.deepEqual(accountA.unrelated, unrelatedA);
  assert.equal(accountB.executionRecords.length, 2);
});

test("a one-domain failure restores both original canonical snapshots", async () => {
  for (const failure of ["tasks", "execution"] as const) {
    const state = createState();
    const before = structuredClone(state);

    await assert.rejects(
      resetLocalTaskActivity(repositories(state, failure)),
      new RegExp(`${failure === "tasks" ? "task" : "execution"} clear failed`)
    );
    assert.deepEqual(state, before);
  }
});
