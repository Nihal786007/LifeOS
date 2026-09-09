import assert from "node:assert/strict";
import {
  registerHooks,
} from "node:module";
import test from "node:test";

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith(".") && !/\.[a-z]+$/i.test(specifier)) {
      return nextResolve(`${specifier}.ts`, context);
    }
    return nextResolve(specifier, context);
  },
});

const {
  LocalStorageExecutionHistoryRepository,
} = await import(
  "../../src/data/execution/localStorageExecutionHistoryRepository.ts"
);
const {
  ExecutionHistoryService,
} = await import(
  "../../src/services/ExecutionHistoryService.ts"
);

import type {
  ExecutionHistoryEventTarget,
  ExecutionHistoryStorage,
} from "../../src/data/execution/localStorageExecutionHistoryRepository.ts";
import type {
  ExecutionRecord,
} from "../../src/shared/execution.ts";

const EXECUTION_HISTORY_KEY = "lifeos-execution-history";

const existingRecord = {
  id: 101,
  type: "task_completed",
  entityId: 11,
  title: "Ship persistence boundary",
  description: "Preserve every canonical field",
  createdAt: "2026-09-08T08:00:00.000Z",
  xpAwarded: 25,
  icon: "check",
  color: "cyan",
  metadata: {
    weeklyTargetId: 21,
  },
  importedBy: "existing-history",
} as ExecutionRecord & { importedBy: string };

const secondRecord: ExecutionRecord = {
  id: 102,
  type: "habit_completed",
  entityId: 12,
  title: "Read",
  createdAt: "2026-09-08T09:00:00.000Z",
  xpAwarded: 0,
  metadata: {
    habitDate: "2026-09-08",
  },
};

const appendedRecord: ExecutionRecord = {
  id: 201,
  type: "weekly_completed",
  entityId: 31,
  title: "Persistence migration",
  createdAt: "2026-09-09T08:00:00.000Z",
  xpAwarded: 50,
};

class MemoryStorage implements ExecutionHistoryStorage {
  readonly values = new Map<string, string>();
  readonly reads: string[] = [];
  readonly writes: string[] = [];
  readonly removals: string[] = [];

  getItem(key: string): string | null {
    this.reads.push(key);
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.writes.push(key);
    this.values.set(key, value);
  }

  removeItem(key: string): void {
    this.removals.push(key);
    this.values.delete(key);
  }
}

class MemoryEvents implements ExecutionHistoryEventTarget {
  private readonly listeners = new Map<string, Set<EventListener>>();

  addEventListener(type: string, listener: EventListener): void {
    const listeners = this.listeners.get(type) ?? new Set<EventListener>();
    listeners.add(listener);
    this.listeners.set(type, listeners);
  }

  removeEventListener(type: string, listener: EventListener): void {
    this.listeners.get(type)?.delete(listener);
  }

  dispatchEvent(event: Event): boolean {
    for (const listener of this.listeners.get(event.type) ?? []) {
      listener(event);
    }
    return true;
  }

  dispatchUnrelated(): void {
    this.dispatchEvent(new Event("storage"));
  }
}

test("missing storage loads empty without writing", () => {
  const storage = new MemoryStorage();
  const repository = new LocalStorageExecutionHistoryRepository(storage);

  assert.deepEqual(repository.load(), []);
  assert.deepEqual(storage.writes, []);
  assert.deepEqual(storage.removals, []);
});

test("valid history and every canonical or unknown field load unchanged", () => {
  const storage = new MemoryStorage();
  const history = [existingRecord, secondRecord];
  storage.values.set(EXECUTION_HISTORY_KEY, JSON.stringify(history));
  const loaded = new LocalStorageExecutionHistoryRepository(storage).load();

  assert.deepEqual(loaded, history);
  assert.equal(loaded[0]?.id, 101);
  assert.equal(loaded[0]?.type, "task_completed");
  assert.equal(loaded[0]?.entityId, 11);
  assert.equal(loaded[0]?.createdAt, "2026-09-08T08:00:00.000Z");
  assert.equal(loaded[0]?.xpAwarded, 25);
  assert.deepEqual(loaded[0]?.metadata, { weeklyTargetId: 21 });
  assert.equal(
    (loaded[0] as ExecutionRecord & { importedBy?: string }).importedBy,
    "existing-history"
  );
  assert.deepEqual(storage.writes, []);
});

test("save and load preserve the exact history array", () => {
  const storage = new MemoryStorage();
  const repository = new LocalStorageExecutionHistoryRepository(storage);
  const history = [existingRecord, secondRecord];

  repository.save(history);

  assert.deepEqual(repository.load(), history);
  assert.deepEqual(JSON.parse(storage.values.get(EXECUTION_HISTORY_KEY) ?? "null"), history);
});

test("append one record prepends it and preserves existing history", () => {
  const storage = new MemoryStorage();
  storage.values.set(EXECUTION_HISTORY_KEY, JSON.stringify([existingRecord]));
  const repository = new LocalStorageExecutionHistoryRepository(storage);

  assert.deepEqual(repository.append([appendedRecord]), [appendedRecord, existingRecord]);
  assert.deepEqual(repository.load(), [appendedRecord, existingRecord]);
  assert.equal(storage.writes.length, 1);
});

test("append preserves batch order, existing order, and duplicate IDs", () => {
  const storage = new MemoryStorage();
  const duplicateIdRecord = {
    ...secondRecord,
    id: existingRecord.id,
  };
  storage.values.set(
    EXECUTION_HISTORY_KEY,
    JSON.stringify([existingRecord, secondRecord])
  );
  const repository = new LocalStorageExecutionHistoryRepository(storage);

  const updated = repository.append([appendedRecord, duplicateIdRecord]);

  assert.deepEqual(updated, [
    appendedRecord,
    duplicateIdRecord,
    existingRecord,
    secondRecord,
  ]);
  assert.equal(updated.filter((record) => record.id === 101).length, 2);
  assert.equal(storage.writes.length, 1);
});

test("append of an empty batch performs no write", () => {
  const storage = new MemoryStorage();
  storage.values.set(EXECUTION_HISTORY_KEY, JSON.stringify([existingRecord]));
  const repository = new LocalStorageExecutionHistoryRepository(storage);

  assert.deepEqual(repository.append([]), [existingRecord]);
  assert.deepEqual(storage.writes, []);
});

test("remove uses exact numeric identity and preserves unrelated order", () => {
  const storage = new MemoryStorage();
  const stringId = {
    ...secondRecord,
    id: "101",
  } as unknown as ExecutionRecord;
  storage.values.set(
    EXECUTION_HISTORY_KEY,
    JSON.stringify([secondRecord, existingRecord, stringId, appendedRecord])
  );
  const repository = new LocalStorageExecutionHistoryRepository(storage);

  assert.deepEqual(repository.remove(101), [secondRecord, stringId, appendedRecord]);
  assert.equal(storage.writes.length, 1);
});

test("removing an absent ID preserves history without writing", () => {
  const storage = new MemoryStorage();
  storage.values.set(EXECUTION_HISTORY_KEY, JSON.stringify([existingRecord]));
  const repository = new LocalStorageExecutionHistoryRepository(storage);

  assert.deepEqual(repository.remove(999), [existingRecord]);
  assert.deepEqual(storage.writes, []);
});

test("clear removes only the execution-history key", () => {
  const storage = new MemoryStorage();
  storage.values.set(EXECUTION_HISTORY_KEY, JSON.stringify([existingRecord]));
  storage.values.set("lifeos-user-profile", "preserve-profile");
  const repository = new LocalStorageExecutionHistoryRepository(storage);

  repository.clear();

  assert.equal(storage.values.has(EXECUTION_HISTORY_KEY), false);
  assert.equal(storage.values.get("lifeos-user-profile"), "preserve-profile");
  assert.deepEqual(storage.removals, [EXECUTION_HISTORY_KEY]);
});

test("malformed JSON and non-array payloads safely fall back without writing", () => {
  for (const value of ["{bad-history", JSON.stringify({ records: [] })]) {
    const storage = new MemoryStorage();
    storage.values.set(EXECUTION_HISTORY_KEY, value);
    const repository = new LocalStorageExecutionHistoryRepository(storage);

    assert.deepEqual(repository.load(), []);
    assert.deepEqual(storage.writes, []);
    assert.equal(storage.values.get(EXECUTION_HISTORY_KEY), value);
  }
});

test("repository uses the existing key for every storage operation", () => {
  const storage = new MemoryStorage();
  const repository = new LocalStorageExecutionHistoryRepository(storage);

  repository.load();
  repository.save([existingRecord]);
  repository.remove(existingRecord.id);
  repository.clear();

  assert.deepEqual(new Set(storage.reads), new Set([EXECUTION_HISTORY_KEY]));
  assert.deepEqual(new Set(storage.writes), new Set([EXECUTION_HISTORY_KEY]));
  assert.deepEqual(storage.removals, [EXECUTION_HISTORY_KEY]);
});

test("subscriptions preserve the same-tab custom event and ignore unrelated events", () => {
  const storage = new MemoryStorage();
  const events = new MemoryEvents();
  const repository = new LocalStorageExecutionHistoryRepository(storage, events);
  let calls = 0;
  const unsubscribe = repository.subscribe(() => { calls += 1; });

  events.dispatchUnrelated();
  repository.save([existingRecord]);
  repository.append([secondRecord]);
  repository.remove(secondRecord.id);
  repository.clear();
  assert.equal(calls, 4);

  unsubscribe();
  repository.save([existingRecord]);
  assert.equal(calls, 4);
});

test("service preserves derived XP across reads, append, remove, and clear", () => {
  const storage = new MemoryStorage();
  storage.values.set(EXECUTION_HISTORY_KEY, JSON.stringify([existingRecord]));
  const repository = new LocalStorageExecutionHistoryRepository(storage);
  ExecutionHistoryService.configureRepository(repository);

  assert.equal(ExecutionHistoryService.getTotalXP(), 25);
  assert.equal(ExecutionHistoryService.getTotalXP(), 25);
  assert.deepEqual(storage.writes, []);

  ExecutionHistoryService.append([appendedRecord]);
  assert.equal(ExecutionHistoryService.getTotalXP(), 75);
  assert.equal(ExecutionHistoryService.getAll().length, 2);

  ExecutionHistoryService.remove(appendedRecord.id);
  assert.equal(ExecutionHistoryService.getTotalXP(), 25);

  ExecutionHistoryService.clear();
  assert.equal(ExecutionHistoryService.getTotalXP(), 0);
});
