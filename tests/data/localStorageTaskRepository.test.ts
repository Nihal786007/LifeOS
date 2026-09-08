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
  LocalStorageTaskRepository,
} = await import(
  "../../src/data/tasks/localStorageTaskRepository.ts"
);

import type {
  TaskStorage,
  TaskStorageEventTarget,
} from "../../src/data/tasks/localStorageTaskRepository.ts";
import type {
  Task,
} from "../../src/shared/types.ts";

const TASK_STORAGE_KEY = "lifeos-tasks";

const tasks: Task[] = [
  {
    id: 1700000000001,
    title: "Preserve this task",
    description: "Existing user data",
    dueDate: "2026-09-08",
    priority: "high",
    weeklyTargetId: 42,
    completed: false,
    createdAt: "2026-09-07T08:00:00.000Z",
  },
];

class MemoryStorage implements TaskStorage {
  readonly values = new Map<string, string>();
  readonly reads: string[] = [];
  readonly writes: string[] = [];

  getItem(key: string): string | null {
    this.reads.push(key);
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.writes.push(key);
    this.values.set(key, value);
  }
}

class MemoryStorageEvents implements TaskStorageEventTarget {
  private readonly listeners = new Set<EventListener>();

  addEventListener(_type: "storage", listener: EventListener): void {
    this.listeners.add(listener);
  }

  removeEventListener(_type: "storage", listener: EventListener): void {
    this.listeners.delete(listener);
  }

  dispatch(key: string): void {
    for (const listener of this.listeners) {
      listener({ key } as unknown as Event);
    }
  }
}

test("no stored task collection loads as empty", () => {
  const repository = new LocalStorageTaskRepository(new MemoryStorage());
  assert.deepEqual(repository.load(), []);
});

test("a valid existing task collection loads unchanged", () => {
  const storage = new MemoryStorage();
  storage.values.set(TASK_STORAGE_KEY, JSON.stringify(tasks));

  const loaded = new LocalStorageTaskRepository(storage).load();
  assert.deepEqual(loaded, tasks);
});

test("save then load preserves the canonical collection", () => {
  const storage = new MemoryStorage();
  const repository = new LocalStorageTaskRepository(storage);
  repository.save(tasks);

  assert.deepEqual(repository.load(), tasks);
});

test("malformed JSON fails safely without rewriting storage", () => {
  const storage = new MemoryStorage();
  storage.values.set(TASK_STORAGE_KEY, "{not-json");
  const repository = new LocalStorageTaskRepository(storage);

  assert.deepEqual(repository.load(), []);
  assert.equal(storage.values.get(TASK_STORAGE_KEY), "{not-json");
  assert.deepEqual(storage.writes, []);
});

test("an invalid top-level payload safely falls back", () => {
  const storage = new MemoryStorage();
  storage.values.set(TASK_STORAGE_KEY, JSON.stringify({ tasks }));

  assert.deepEqual(new LocalStorageTaskRepository(storage).load(), []);
});

test("structurally unusable task entries safely fall back", () => {
  const storage = new MemoryStorage();
  storage.values.set(
    TASK_STORAGE_KEY,
    JSON.stringify([{ id: "changed-type", title: "Invalid" }])
  );

  assert.deepEqual(new LocalStorageTaskRepository(storage).load(), []);
});

test("the existing lifeos-tasks key is used for reads and writes", () => {
  const storage = new MemoryStorage();
  const repository = new LocalStorageTaskRepository(storage);
  repository.load();
  repository.save(tasks);

  assert.deepEqual(storage.reads, [TASK_STORAGE_KEY]);
  assert.deepEqual(storage.writes, [TASK_STORAGE_KEY]);
});

test("numeric IDs, ordering, and task data are not changed", () => {
  const second: Task = {
    id: 7,
    title: "Second task",
    priority: "low",
    completed: true,
    completedAt: "2026-09-08T09:00:00.000Z",
    createdAt: "2026-09-01T08:00:00.000Z",
  };
  const storage = new MemoryStorage();
  const repository = new LocalStorageTaskRepository(storage);
  repository.save([...tasks, second]);

  assert.deepEqual(repository.load(), [...tasks, second]);
  assert.equal(repository.load()[0]?.id, 1700000000001);
  assert.equal(repository.load()[1]?.id, 7);
});

test("subscriptions notify only for the canonical task key and unsubscribe", () => {
  const storage = new MemoryStorage();
  const events = new MemoryStorageEvents();
  const repository = new LocalStorageTaskRepository(storage, events);
  let calls = 0;
  const unsubscribe = repository.subscribe(() => {
    calls += 1;
  });

  events.dispatch("unrelated-key");
  events.dispatch(TASK_STORAGE_KEY);
  unsubscribe();
  events.dispatch(TASK_STORAGE_KEY);

  assert.equal(calls, 1);
});
