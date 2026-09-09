import assert from "node:assert/strict";
import test from "node:test";

import {
  DEFAULT_NOTIFICATION_PREFERENCES,
} from "../../src/notifications/notificationEngine.ts";

import {
  LocalStorageNotificationStateRepository,
  NOTIFICATION_STATE_VERSION,
  NOTIFICATION_STORAGE_KEY,
} from "../../src/data/notifications/localStorageNotificationStateRepository.ts";

import type {
  NotificationStateStorage,
  NotificationStateStorageEventTarget,
} from "../../src/data/notifications/localStorageNotificationStateRepository.ts";

import type {
  NotificationPersistedState,
} from "../../src/data/notifications/notificationStateRepository.ts";

class FakeStorage implements NotificationStateStorage {
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

class FakeStorageEvents implements NotificationStateStorageEventTarget {
  private readonly listeners = new Set<EventListener>();

  addEventListener(type: "storage", listener: EventListener): void {
    if (type === "storage") this.listeners.add(listener);
  }

  removeEventListener(type: "storage", listener: EventListener): void {
    if (type === "storage") this.listeners.delete(listener);
  }

  emit(key: string | null): void {
    const event = { key } as StorageEvent;
    this.listeners.forEach((listener) => listener(event));
  }
}

const persistedState: NotificationPersistedState = {
  readIds: ["task:due-today:2026-09-09", "xp:41"],
  dismissedIds: ["habit:incomplete:2026-09-09"],
  preferences: {
    tasks: true,
    habits: false,
    planning: true,
    xp: false,
    atlas: true,
  },
};

function envelope(state: NotificationPersistedState = persistedState) {
  return {
    version: NOTIFICATION_STATE_VERSION,
    readIds: state.readIds,
    dismissedIds: state.dismissedIds,
    preferences: state.preferences,
  };
}

test("missing notification state loads defaults without writing", () => {
  const storage = new FakeStorage();
  const loaded = new LocalStorageNotificationStateRepository(storage).load();

  assert.deepEqual(loaded, {
    readIds: [],
    dismissedIds: [],
    preferences: DEFAULT_NOTIFICATION_PREFERENCES,
  });
  assert.deepEqual(storage.reads, [NOTIFICATION_STORAGE_KEY]);
  assert.deepEqual(storage.writes, []);
});

test("valid notification state loads unchanged", () => {
  const storage = new FakeStorage();
  storage.values.set(NOTIFICATION_STORAGE_KEY, JSON.stringify(envelope()));

  const loaded = new LocalStorageNotificationStateRepository(storage).load();

  assert.deepEqual(loaded, persistedState);
  assert.deepEqual(storage.writes, []);
});

test("save and load round-trip the exact versioned state", () => {
  const storage = new FakeStorage();
  const repository = new LocalStorageNotificationStateRepository(storage);

  repository.save(persistedState);

  assert.deepEqual(repository.load(), persistedState);
  assert.deepEqual(
    JSON.parse(storage.values.get(NOTIFICATION_STORAGE_KEY)!),
    envelope()
  );
});

test("malformed JSON falls back without rewriting", () => {
  const storage = new FakeStorage();
  storage.values.set(NOTIFICATION_STORAGE_KEY, "{broken");

  const loaded = new LocalStorageNotificationStateRepository(storage).load();

  assert.deepEqual(loaded.readIds, []);
  assert.deepEqual(loaded.preferences, DEFAULT_NOTIFICATION_PREFERENCES);
  assert.equal(storage.values.get(NOTIFICATION_STORAGE_KEY), "{broken");
  assert.deepEqual(storage.writes, []);
});

test("invalid top-level payloads fall back safely", () => {
  for (const value of [null, [], "state", 42]) {
    const storage = new FakeStorage();
    storage.values.set(NOTIFICATION_STORAGE_KEY, JSON.stringify(value));

    assert.deepEqual(
      new LocalStorageNotificationStateRepository(storage).load(),
      {
        readIds: [],
        dismissedIds: [],
        preferences: DEFAULT_NOTIFICATION_PREFERENCES,
      }
    );
    assert.deepEqual(storage.writes, []);
  }
});

test("wrong versions and invalid required fields fall back safely", () => {
  const values = [
    { ...envelope(), version: "2.0" },
    { ...envelope(), readIds: [1] },
    { ...envelope(), dismissedIds: "dismissed" },
    { ...envelope(), preferences: { tasks: true } },
  ];

  for (const value of values) {
    const storage = new FakeStorage();
    storage.values.set(NOTIFICATION_STORAGE_KEY, JSON.stringify(value));
    const loaded = new LocalStorageNotificationStateRepository(storage).load();

    assert.deepEqual(loaded.readIds, []);
    assert.deepEqual(loaded.dismissedIds, []);
    assert.deepEqual(loaded.preferences, DEFAULT_NOTIFICATION_PREFERENCES);
    assert.deepEqual(storage.writes, []);
  }
});

test("repository uses only the exact active notification key", () => {
  const storage = new FakeStorage();
  const repository = new LocalStorageNotificationStateRepository(storage);

  repository.load();
  repository.save(persistedState);

  assert.deepEqual(storage.reads, [NOTIFICATION_STORAGE_KEY]);
  assert.deepEqual(storage.writes.map(({ key }) => key), [NOTIFICATION_STORAGE_KEY]);
});

test("read notification IDs are preserved exactly", () => {
  const storage = new FakeStorage();
  const state = { ...persistedState, readIds: ["read-3", "read-1", "read-3"] };
  storage.values.set(NOTIFICATION_STORAGE_KEY, JSON.stringify(envelope(state)));

  assert.deepEqual(
    new LocalStorageNotificationStateRepository(storage).load().readIds,
    state.readIds
  );
});

test("dismissed notification IDs are preserved exactly", () => {
  const storage = new FakeStorage();
  const state = { ...persistedState, dismissedIds: ["dismiss-2", "dismiss-1"] };
  storage.values.set(NOTIFICATION_STORAGE_KEY, JSON.stringify(envelope(state)));

  assert.deepEqual(
    new LocalStorageNotificationStateRepository(storage).load().dismissedIds,
    state.dismissedIds
  );
});

test("all five category preferences are preserved", () => {
  const storage = new FakeStorage();
  storage.values.set(NOTIFICATION_STORAGE_KEY, JSON.stringify(envelope()));

  assert.deepEqual(
    new LocalStorageNotificationStateRepository(storage).load().preferences,
    persistedState.preferences
  );
});

test("clear removes only the active notification key", () => {
  const storage = new FakeStorage();
  storage.values.set(NOTIFICATION_STORAGE_KEY, JSON.stringify(envelope()));
  storage.values.set("unrelated", "preserved");

  new LocalStorageNotificationStateRepository(storage).clear();

  assert.equal(storage.values.has(NOTIFICATION_STORAGE_KEY), false);
  assert.equal(storage.values.get("unrelated"), "preserved");
  assert.deepEqual(storage.removals, [NOTIFICATION_STORAGE_KEY]);
});

test("subscription reacts only to the active key and unsubscribes", () => {
  const storage = new FakeStorage();
  const events = new FakeStorageEvents();
  const repository = new LocalStorageNotificationStateRepository(storage, events);
  let calls = 0;
  const unsubscribe = repository.subscribe(() => calls += 1);

  events.emit("unrelated");
  events.emit(null);
  assert.equal(calls, 0);
  events.emit(NOTIFICATION_STORAGE_KEY);
  assert.equal(calls, 1);
  unsubscribe();
  events.emit(NOTIFICATION_STORAGE_KEY);
  assert.equal(calls, 1);
});

test("save serializes UI state only and drops notification facts", () => {
  const storage = new FakeStorage();
  const repository = new LocalStorageNotificationStateRepository(storage);
  const contaminated = {
    ...persistedState,
    title: "Derived title",
    message: "Derived message",
    severity: "important",
    createdAt: "2026-09-09T00:00:00.000Z",
    evidenceKeys: ["task:1"],
    sourceEntityId: "1",
  };

  repository.save(contaminated);

  const raw = storage.values.get(NOTIFICATION_STORAGE_KEY) ?? "";
  assert.doesNotMatch(
    raw,
    /title|message|severity|createdAt|evidenceKeys|sourceEntityId/
  );
  assert.deepEqual(JSON.parse(raw), envelope());
});
