import assert from "node:assert/strict";
import test from "node:test";

import {
  LocalStorageAtlasMemoryRepository,
} from "../../src/data/atlasMemory/localStorageAtlasMemoryRepository.ts";

import type {
  AtlasMemoryStorageEventTarget,
} from "../../src/data/atlasMemory/localStorageAtlasMemoryRepository.ts";

import {
  ATLAS_MEMORY_STORAGE_KEY,
  ATLAS_MEMORY_VERSION,
} from "../../src/atlas/memory/types.ts";

import type {
  AtlasMemoryItem,
  AtlasMemoryStorage,
} from "../../src/atlas/memory/types.ts";

class FakeStorage implements AtlasMemoryStorage {
  readonly values = new Map<string, string>();
  readonly reads: string[] = [];
  readonly writes: Array<{ key: string; value: string }> = [];
  readonly removals: string[] = [];

  getItem(key: string): string | null {
    this.reads.push(key);
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.writes.push({ key, value });
    this.values.set(key, value);
  }

  removeItem(key: string): void {
    this.removals.push(key);
    this.values.delete(key);
  }
}

class FakeStorageEvents implements AtlasMemoryStorageEventTarget {
  private readonly listeners = new Set<EventListener>();

  addEventListener(type: "storage", listener: EventListener): void {
    if (type === "storage") this.listeners.add(listener);
  }

  removeEventListener(type: "storage", listener: EventListener): void {
    if (type === "storage") this.listeners.delete(listener);
  }

  emit(key: string): void {
    const event = { key } as StorageEvent;
    this.listeners.forEach((listener) => listener(event));
  }
}

const superseded: AtlasMemoryItem = {
  id: "memory-1",
  type: "preference",
  topic: "Study time",
  content: "Morning.",
  source: "explicit_user_statement",
  createdAt: "2026-09-01T08:00:00.000Z",
  updatedAt: "2026-09-02T08:00:00.000Z",
  status: "superseded",
};

const active: AtlasMemoryItem = {
  id: "memory-2",
  type: "preference",
  topic: "Study time",
  content: "Evening.",
  source: "explicit_user_statement",
  createdAt: "2026-09-02T08:00:00.000Z",
  updatedAt: "2026-09-02T08:00:00.000Z",
  status: "active",
  supersedesMemoryId: "memory-1",
};

function envelope(items: readonly AtlasMemoryItem[] = [superseded, active]) {
  return {
    version: ATLAS_MEMORY_VERSION,
    items,
  };
}

test("missing memory storage loads empty without writing", () => {
  const storage = new FakeStorage();
  const repository = new LocalStorageAtlasMemoryRepository(storage);

  assert.deepEqual(repository.load(), []);
  assert.deepEqual(storage.reads, [ATLAS_MEMORY_STORAGE_KEY]);
  assert.deepEqual(storage.writes, []);
});

test("valid envelope loads every field and ordering unchanged", () => {
  const storage = new FakeStorage();
  storage.values.set(ATLAS_MEMORY_STORAGE_KEY, JSON.stringify(envelope()));

  const loaded = new LocalStorageAtlasMemoryRepository(storage).load();

  assert.deepEqual(loaded, [superseded, active]);
  assert.deepEqual(loaded.map((item) => item.id), ["memory-1", "memory-2"]);
  assert.equal(loaded[1]?.supersedesMemoryId, "memory-1");
  assert.deepEqual(storage.writes, []);
});

test("save and load round-trip the exact versioned envelope", () => {
  const storage = new FakeStorage();
  const repository = new LocalStorageAtlasMemoryRepository(storage);

  repository.save([superseded, active]);

  assert.deepEqual(repository.load(), [superseded, active]);
  assert.deepEqual(JSON.parse(storage.values.get(ATLAS_MEMORY_STORAGE_KEY)!), envelope());
  assert.ok(storage.reads.every((key) => key === ATLAS_MEMORY_STORAGE_KEY));
  assert.ok(storage.writes.every(({ key }) => key === ATLAS_MEMORY_STORAGE_KEY));
});

test("malformed and non-object top-level values fail safely without rewriting", () => {
  for (const raw of ["{broken", "[]", '"memory"', "null"]) {
    const storage = new FakeStorage();
    storage.values.set(ATLAS_MEMORY_STORAGE_KEY, raw);

    assert.deepEqual(new LocalStorageAtlasMemoryRepository(storage).load(), []);
    assert.equal(storage.values.get(ATLAS_MEMORY_STORAGE_KEY), raw);
    assert.deepEqual(storage.writes, []);
  }
});

test("wrong or missing versions and unknown envelope fields are rejected", () => {
  const invalid = [
    { items: [] },
    { version: "2.0.0", items: [] },
    { ...envelope([]), unexpected: true },
  ];

  for (const value of invalid) {
    const storage = new FakeStorage();
    storage.values.set(ATLAS_MEMORY_STORAGE_KEY, JSON.stringify(value));
    assert.deepEqual(new LocalStorageAtlasMemoryRepository(storage).load(), []);
    assert.deepEqual(storage.writes, []);
  }
});

test("unknown item fields and invalid timestamps are rejected", () => {
  const invalidItems = [
    { ...active, unexpected: true },
    { ...active, createdAt: "yesterday" },
    { ...active, updatedAt: "2026-09-02" },
  ];

  for (const item of invalidItems) {
    const storage = new FakeStorage();
    storage.values.set(
      ATLAS_MEMORY_STORAGE_KEY,
      JSON.stringify(envelope([superseded, item as AtlasMemoryItem]))
    );
    assert.deepEqual(new LocalStorageAtlasMemoryRepository(storage).load(), []);
  }
});

test("duplicate IDs and normalized active conflicts are rejected", () => {
  const duplicateId = { ...active, id: superseded.id };
  const activeConflict = {
    ...superseded,
    id: "memory-3",
    topic: "  STUDY   TIME ",
    status: "active" as const,
  };

  for (const items of [[superseded, duplicateId], [active, activeConflict]]) {
    const storage = new FakeStorage();
    storage.values.set(ATLAS_MEMORY_STORAGE_KEY, JSON.stringify(envelope(items)));
    assert.deepEqual(new LocalStorageAtlasMemoryRepository(storage).load(), []);
  }
});

test("invalid supersession references are rejected", () => {
  const storage = new FakeStorage();
  storage.values.set(
    ATLAS_MEMORY_STORAGE_KEY,
    JSON.stringify(envelope([{ ...active, supersedesMemoryId: "missing" }]))
  );

  assert.deepEqual(new LocalStorageAtlasMemoryRepository(storage).load(), []);
});

test("clear removes only the active memory key", () => {
  const storage = new FakeStorage();
  storage.values.set(ATLAS_MEMORY_STORAGE_KEY, JSON.stringify(envelope()));
  storage.values.set("atlas-memory", "legacy-preserved");
  storage.values.set("unrelated", "preserved");

  new LocalStorageAtlasMemoryRepository(storage).clear();

  assert.equal(storage.values.has(ATLAS_MEMORY_STORAGE_KEY), false);
  assert.equal(storage.values.get("atlas-memory"), "legacy-preserved");
  assert.equal(storage.values.get("unrelated"), "preserved");
  assert.deepEqual(storage.removals, [ATLAS_MEMORY_STORAGE_KEY]);
});

test("repository ignores inactive legacy memory keys", () => {
  const storage = new FakeStorage();
  storage.values.set("atlas-memory", JSON.stringify(envelope()));

  assert.deepEqual(new LocalStorageAtlasMemoryRepository(storage).load(), []);
  assert.deepEqual(storage.reads, [ATLAS_MEMORY_STORAGE_KEY]);
});

test("subscription reacts only to the active key and unsubscribes", () => {
  const storage = new FakeStorage();
  const events = new FakeStorageEvents();
  const repository = new LocalStorageAtlasMemoryRepository(storage, events);
  let calls = 0;
  const unsubscribe = repository.subscribe(() => calls += 1);

  events.emit("atlas-memory");
  events.emit("unrelated");
  assert.equal(calls, 0);
  events.emit(ATLAS_MEMORY_STORAGE_KEY);
  assert.equal(calls, 1);
  unsubscribe();
  events.emit(ATLAS_MEMORY_STORAGE_KEY);
  assert.equal(calls, 1);
});
