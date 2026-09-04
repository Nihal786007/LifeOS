import assert from "node:assert/strict";
import test from "node:test";

import {
  AtlasMemoryStore,
  AtlasMemoryValidationError,
} from "../../src/atlas/memory/atlasMemoryStore.ts";
import {
  ATLAS_MEMORY_MAX_CONTENT_LENGTH,
  ATLAS_MEMORY_MAX_ITEMS,
  ATLAS_MEMORY_MAX_TOPIC_LENGTH,
  ATLAS_MEMORY_STORAGE_KEY,
} from "../../src/atlas/memory/types.ts";
import type {
  AtlasMemoryStorage,
} from "../../src/atlas/memory/types.ts";

class MemoryStorage implements AtlasMemoryStorage {
  readonly values = new Map<string, string>();

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }

  removeItem(key: string): void {
    this.values.delete(key);
  }
}

function createStore(storage = new MemoryStorage()) {
  let id = 0;
  return {
    storage,
    store: new AtlasMemoryStore(storage, {
      now: () => "2026-09-04T12:00:00.000Z",
      createId: () => `memory-${++id}`,
    }),
  };
}

test("creates explicit memory and reloads it through a new store lifecycle", () => {
  const { storage, store } = createStore();
  const saved = store.saveMemory({
    type: "preference",
    topic: "SAT study time",
    content: "I prefer studying SAT in the morning.",
  });
  const reloaded = new AtlasMemoryStore(storage).load();

  assert.equal(saved.length, 1);
  assert.deepEqual(reloaded, saved);
  assert.equal(reloaded[0]?.source, "explicit_user_statement");
  assert.equal(reloaded[0]?.status, "active");
});

test("deletes one memory and clears all persisted memory", () => {
  const { storage, store } = createStore();
  const first = store.saveMemory({
    type: "preference",
    topic: "Study time",
    content: "Morning.",
  })[0]!;
  store.saveMemory({
    type: "constraint",
    topic: "Teaching",
    content: "I need three hours daily to teach my brothers.",
  });

  assert.equal(store.deleteMemory(first.id).length, 1);
  assert.equal(store.load().some((item) => item.id === first.id), false);
  assert.deepEqual(store.clearAll(), []);
  assert.equal(storage.getItem(ATLAS_MEMORY_STORAGE_KEY), null);
});

test("same normalized type and topic supersedes deterministically with provenance", () => {
  const { store } = createStore();
  const first = store.saveMemory({
    type: "preference",
    topic: " SAT   Study Time ",
    content: "I prefer studying SAT in the morning.",
  })[0]!;
  const items = store.saveMemory({
    type: "preference",
    topic: "sat study time",
    content: "I prefer studying SAT at night.",
  });
  const oldItem = items.find((item) => item.id === first.id);
  const active = items.find((item) => item.status === "active");

  assert.equal(oldItem?.status, "superseded");
  assert.equal(active?.content, "I prefer studying SAT at night.");
  assert.equal(active?.supersedesMemoryId, first.id);
  assert.equal(items.length, 2);
});

test("different topics and different types remain independently active", () => {
  const { store } = createStore();
  store.saveMemory({
    type: "preference",
    topic: "SAT study time",
    content: "Morning.",
  });
  store.saveMemory({
    type: "preference",
    topic: "Exercise time",
    content: "Evening.",
  });
  const items = store.saveMemory({
    type: "constraint",
    topic: "SAT study time",
    content: "School ends at 4 PM.",
  });

  assert.equal(items.filter((item) => item.status === "active").length, 3);
});

test("enforces item, topic, content, and supported-type bounds", () => {
  const { store } = createStore();

  assert.throws(
    () => store.saveMemory({
      type: "preference",
      topic: "x".repeat(ATLAS_MEMORY_MAX_TOPIC_LENGTH + 1),
      content: "Valid content",
    }),
    AtlasMemoryValidationError
  );
  assert.throws(
    () => store.saveMemory({
      type: "preference",
      topic: "Valid topic",
      content: "x".repeat(ATLAS_MEMORY_MAX_CONTENT_LENGTH + 1),
    }),
    AtlasMemoryValidationError
  );
  assert.throws(
    () => store.saveMemory({
      type: "profile" as never,
      topic: "Invalid",
      content: "Invalid type",
    }),
    AtlasMemoryValidationError
  );

  for (let index = 0; index < ATLAS_MEMORY_MAX_ITEMS; index += 1) {
    store.saveMemory({
      type: "important_context",
      topic: `Topic ${index}`,
      content: `Context ${index}`,
    });
  }
  assert.throws(
    () => store.saveMemory({
      type: "important_context",
      topic: "Overflow",
      content: "Overflow",
    }),
    AtlasMemoryValidationError
  );
});

test("rejects malformed persistence, invalid timestamps, and duplicate active conflicts as empty", () => {
  const malformedCases = [
    "not-json",
    JSON.stringify({ version: "1.0.0", items: "not-an-array" }),
    JSON.stringify({
      version: "1.0.0",
      items: [{
        id: "bad-time",
        type: "preference",
        topic: "Study",
        content: "Morning",
        source: "explicit_user_statement",
        createdAt: "yesterday",
        updatedAt: "yesterday",
        status: "active",
      }],
    }),
  ];

  for (const raw of malformedCases) {
    const storage = new MemoryStorage();
    storage.setItem(ATLAS_MEMORY_STORAGE_KEY, raw);
    assert.deepEqual(new AtlasMemoryStore(storage).load(), []);
  }
});

test("conversation and assistant text have no automatic persistence path", () => {
  const { storage, store } = createStore();
  const conversation = [
    { role: "user", content: "Remember this ordinary question." },
    { role: "assistant", content: "Generated preference." },
  ];

  assert.equal(conversation.length, 2);
  assert.deepEqual(store.load(), []);
  assert.equal(storage.getItem(ATLAS_MEMORY_STORAGE_KEY), null);
});
