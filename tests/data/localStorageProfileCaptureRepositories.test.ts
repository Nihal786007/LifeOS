import assert from "node:assert/strict";
import test from "node:test";

import {
  LocalStorageCaptureRepository,
  LocalStorageProfileRepository,
} from "../../src/data/profileCapture/localStorageProfileCaptureRepositories.ts";

import type {
  ProfileCaptureStorage,
  ProfileCaptureStorageEventTarget,
} from "../../src/data/profileCapture/localStorageProfileCaptureRepositories.ts";

import type {
  Capture,
  UserProfile,
} from "../../src/shared/types.ts";

const PROFILE_KEY = "lifeos-profile";
const CAPTURE_KEY = "lifeos-captures";

class FakeStorage implements ProfileCaptureStorage {
  readonly values = new Map<string, string>();
  readonly reads: string[] = [];
  readonly writes: Array<{ key: string; value: string }> = [];

  getItem(key: string): string | null {
    this.reads.push(key);
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.writes.push({ key, value });
    this.values.set(key, value);
  }
}

class FakeStorageEvents implements ProfileCaptureStorageEventTarget {
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

const profile: UserProfile = {
  name: "Nihal",
  occupation: "Builder",
  timezone: "Asia/Kolkata",
  theme: "dark",
  atlasPersonality: "Professional",
  level: 7,
  xp: 925,
};

const captures: Capture[] = [
  {
    id: 200,
    text: "Second thought",
    createdAt: "2026-09-09T10:30:00.000Z",
  },
  {
    id: 100,
    text: "First thought",
    createdAt: "2026-09-09T09:30:00.000Z",
  },
];

test("profile missing storage returns null without writing", () => {
  const storage = new FakeStorage();
  const repository = new LocalStorageProfileRepository(storage);

  assert.equal(repository.load(), null);
  assert.deepEqual(storage.reads, [PROFILE_KEY]);
  assert.deepEqual(storage.writes, []);
});

test("profile valid load preserves canonical, legacy, and unknown fields", () => {
  const storage = new FakeStorage();
  const stored = {
    ...profile,
    optionalPreference: "concise",
  };
  storage.values.set(PROFILE_KEY, JSON.stringify(stored));

  const loaded = new LocalStorageProfileRepository(storage).load();

  assert.deepEqual(loaded, stored);
  assert.equal(loaded?.level, 7);
  assert.equal(loaded?.xp, 925);
  assert.equal(
    (loaded as UserProfile & { optionalPreference: string }).optionalPreference,
    "concise"
  );
  assert.deepEqual(storage.writes, []);
});

test("profile preserves an object-shaped legacy profile without reconstruction", () => {
  const storage = new FakeStorage();
  const legacyProfile = {
    name: "Existing user",
    occupation: "Builder",
    timezone: "Asia/Kolkata",
    atlasPersonality: "Professional",
  };
  storage.values.set(PROFILE_KEY, JSON.stringify(legacyProfile));

  assert.deepEqual(
    new LocalStorageProfileRepository(storage).load(),
    legacyProfile
  );
  assert.deepEqual(storage.writes, []);
});

test("profile save and load round-trip uses only the active key", () => {
  const storage = new FakeStorage();
  storage.values.set("lifeos-user-profile", JSON.stringify({ name: "Legacy" }));
  storage.values.set("lifeos-profile-stats", JSON.stringify({ xp: 9999 }));
  const repository = new LocalStorageProfileRepository(storage);

  repository.save(profile);

  assert.deepEqual(repository.load(), profile);
  assert.deepEqual(storage.writes, [
    { key: PROFILE_KEY, value: JSON.stringify(profile) },
  ]);
  assert.ok(storage.reads.every((key) => key === PROFILE_KEY));
});

test("profile malformed and invalid top-level payloads return null without rewriting", () => {
  for (const value of ["{broken", "[]", '"profile"', "null"]) {
    const storage = new FakeStorage();
    storage.values.set(PROFILE_KEY, value);

    assert.equal(new LocalStorageProfileRepository(storage).load(), null);
    assert.equal(storage.values.get(PROFILE_KEY), value);
    assert.deepEqual(storage.writes, []);
  }
});

test("profile subscription reacts only to the active key and unsubscribes", () => {
  const storage = new FakeStorage();
  const events = new FakeStorageEvents();
  const repository = new LocalStorageProfileRepository(storage, events);
  let calls = 0;
  const unsubscribe = repository.subscribe(() => calls += 1);

  events.emit("lifeos-user-profile");
  events.emit("lifeos-profile-stats");
  events.emit(CAPTURE_KEY);
  assert.equal(calls, 0);
  events.emit(PROFILE_KEY);
  assert.equal(calls, 1);
  unsubscribe();
  events.emit(PROFILE_KEY);
  assert.equal(calls, 1);
});

test("capture missing storage returns an empty collection without writing", () => {
  const storage = new FakeStorage();
  const repository = new LocalStorageCaptureRepository(storage);

  assert.deepEqual(repository.load(), []);
  assert.deepEqual(storage.reads, [CAPTURE_KEY]);
  assert.deepEqual(storage.writes, []);
  assert.deepEqual(repository.inspect(), {
    status: "missing",
    captures: [],
  });
});

test("capture valid load preserves IDs, text, timestamps, order, and unknown fields", () => {
  const storage = new FakeStorage();
  const stored = [
    { ...captures[0], category: "idea" },
    { ...captures[1], source: "quick-capture" },
  ];
  storage.values.set(CAPTURE_KEY, JSON.stringify(stored));

  const loaded = new LocalStorageCaptureRepository(storage).load();

  assert.deepEqual(loaded, stored);
  assert.deepEqual(loaded.map((capture) => capture.id), [200, 100]);
  assert.deepEqual(storage.writes, []);
  assert.deepEqual(new LocalStorageCaptureRepository(storage).inspect(), {
    status: "valid",
    captures: stored,
  });
});

test("capture save and load round-trip uses only the active key", () => {
  const storage = new FakeStorage();
  const repository = new LocalStorageCaptureRepository(storage);

  repository.save(captures);

  assert.deepEqual(repository.load(), captures);
  assert.deepEqual(storage.writes, [
    { key: CAPTURE_KEY, value: JSON.stringify(captures) },
  ]);
  assert.ok(storage.reads.every((key) => key === CAPTURE_KEY));
});

test("capture malformed and invalid payloads fall back without rewriting", () => {
  const invalidValues = [
    "{broken",
    "{}",
    '"captures"',
    '[{"id":"not-numeric","text":"Bad","createdAt":"today"}]',
  ];

  for (const value of invalidValues) {
    const storage = new FakeStorage();
    storage.values.set(CAPTURE_KEY, value);

    assert.deepEqual(new LocalStorageCaptureRepository(storage).load(), []);
    assert.deepEqual(new LocalStorageCaptureRepository(storage).inspect(), {
      status: "invalid",
      captures: [],
    });
    assert.equal(storage.values.get(CAPTURE_KEY), value);
    assert.deepEqual(storage.writes, []);
  }
});

test("capture subscription reacts only to the active key and unsubscribes", () => {
  const storage = new FakeStorage();
  const events = new FakeStorageEvents();
  const repository = new LocalStorageCaptureRepository(storage, events);
  let calls = 0;
  const unsubscribe = repository.subscribe(() => calls += 1);

  events.emit(PROFILE_KEY);
  events.emit("unrelated");
  assert.equal(calls, 0);
  events.emit(CAPTURE_KEY);
  assert.equal(calls, 1);
  unsubscribe();
  events.emit(CAPTURE_KEY);
  assert.equal(calls, 1);
});
