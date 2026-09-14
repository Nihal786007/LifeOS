import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import test from "node:test";
import type { QueryResult, Transaction } from "@powersync/web";
import type { UserProfile } from "../../src/shared/types.ts";
import type { ProfileSourceSnapshot } from "../../src/data/profileCapture/localStorageProfileCaptureRepositories.ts";

registerHooks({ resolve(specifier, context, nextResolve) {
  if (specifier.startsWith(".") && !/\.[a-z]+$/i.test(specifier)) return nextResolve(`${specifier}.ts`, context);
  return nextResolve(specifier, context);
} });

const { PROFILE_MIGRATION_ID, migrateLocalStorageProfile } = await import("../../src/data/profile/migrateLocalStorageProfile.ts");
const { PowerSyncProfileRepository } = await import("../../src/data/profile/powerSyncProfileRepository.ts");

interface Row { id: string; profile_json: string }
interface Marker { id: string; source_key: string; record_count: number; completed_at: string }
interface State { profiles: Row[]; journal: Marker[] }

class Queue<T> implements AsyncIterable<T> {
  values: T[] = []; waiters: Array<(value: IteratorResult<T>) => void> = []; closed = false;
  push(value: T) { const waiter = this.waiters.shift(); if (waiter) waiter({ done: false, value }); else this.values.push(value); }
  close() { this.closed = true; this.waiters.splice(0).forEach((waiter) => waiter({ done: true, value: undefined })); }
  [Symbol.asyncIterator](): AsyncIterator<T> { return { next: async () => {
    const value = this.values.shift(); if (value !== undefined) return { done: false, value };
    if (this.closed) return { done: true, value: undefined };
    return new Promise((resolve) => this.waiters.push(resolve));
  } }; }
}

class FakeDatabase {
  state: State; operations: string[] = []; initCalls = 0; failInsert = false;
  watchers = new Set<Queue<QueryResult>>();
  constructor(state: State = { profiles: [], journal: [] }) { this.state = state; }
  async init() { this.initCalls += 1; }
  async getAll<T>(sql: string): Promise<T[]> { return this.getAllFrom<T>(this.state, sql); }
  async getOptional<T>(sql: string, parameters: unknown[] = []): Promise<T | null> { return this.getOptionalFrom<T>(this.state, sql, parameters); }
  async writeTransaction<T>(callback: (transaction: Transaction) => Promise<T>): Promise<T> {
    const draft = structuredClone(this.state);
    const transaction = {
      getAll: <R>(sql: string) => this.getAllFrom<R>(draft, sql),
      getOptional: <R>(sql: string, parameters?: unknown[]) => this.getOptionalFrom<R>(draft, sql, parameters),
      execute: async (sql: string, parameters?: unknown[]) => { this.executeAgainst(draft, sql, parameters ?? []); return { rows: { _array: [] } } as QueryResult; },
    } as unknown as Transaction;
    const result = await callback(transaction); this.state.profiles = draft.profiles; this.state.journal = draft.journal; this.emit(); return result;
  }
  watch(_sql: string, _parameters: unknown[], options: { signal: AbortSignal }): AsyncIterable<QueryResult> {
    const queue = new Queue<QueryResult>(); this.watchers.add(queue); queue.push(this.result());
    options.signal.addEventListener("abort", () => { this.watchers.delete(queue); queue.close(); }, { once: true }); return queue;
  }
  private async getAllFrom<T>(state: State, sql: string): Promise<T[]> { return (sql.includes("FROM profiles") ? [...state.profiles].sort((a, b) => a.id.localeCompare(b.id)) : []) as T[]; }
  private async getOptionalFrom<T>(state: State, sql: string, parameters: unknown[] = []): Promise<T | null> {
    if (sql.includes("migration_journal")) return (state.journal.find((row) => row.id === parameters[0]) ?? null) as T | null;
    return null;
  }
  private executeAgainst(state: State, sql: string, parameters: unknown[]) {
    if (sql.startsWith("DELETE FROM profiles")) { state.profiles = state.profiles.filter((row) => row.id !== parameters[0]); return; }
    if (sql.startsWith("INSERT INTO profiles")) {
      if (this.failInsert) throw new Error("injected profile failure");
      state.profiles.push({ id: String(parameters[0]), profile_json: String(parameters[1]) }); this.operations.push("profile"); return;
    }
    if (sql.startsWith("INSERT INTO migration_journal")) {
      state.journal.push({ id: String(parameters[0]), source_key: String(parameters[1]), record_count: Number(parameters[2]), completed_at: String(parameters[3]) }); this.operations.push("marker");
    }
  }
  private result(): QueryResult { const array = [...this.state.profiles]; return { rows: { _array: array }, array } as unknown as QueryResult; }
  private emit() { const result = this.result(); this.watchers.forEach((watcher) => watcher.push(result)); }
}

function source(snapshot: ProfileSourceSnapshot) { return { calls: 0, inspect() { this.calls += 1; return snapshot; } }; }
const profile = { name: "Nihal", occupation: "Builder", timezone: "Asia/Kolkata", theme: "dark", atlasPersonality: "Professional", level: 1, xp: 999, compatible: { mode: "legacy" } } as UserProfile;
const asDatabase = (database: FakeDatabase) => database as unknown as import("@powersync/web").PowerSyncDatabase;

test("missing source migrates an empty profile without writes to source", async () => {
  const db = new FakeDatabase(); const result = await migrateLocalStorageProfile(db, source({ status: "missing", profile: null }));
  assert.deepEqual(result, { status: "complete", imported: 0 }); assert.equal(db.state.profiles.length, 0); assert.equal(db.state.journal[0]?.id, PROFILE_MIGRATION_ID);
});

test("valid profile preserves every active, legacy, and unknown field exactly", async () => {
  const db = new FakeDatabase(); const input = structuredClone(profile);
  await migrateLocalStorageProfile(db, source({ status: "valid", profile: input }));
  const repository = new PowerSyncProfileRepository(asDatabase(db), source({ status: "missing", profile: null }));
  assert.deepEqual(await repository.initialize(), input); assert.deepEqual(input, profile); assert.deepEqual(db.operations, ["profile", "marker"]);
});

test("invalid source and unjournaled target fail without partial writes", async () => {
  const invalidDb = new FakeDatabase();
  assert.deepEqual(await migrateLocalStorageProfile(invalidDb, source({ status: "invalid", profile: null })), { status: "invalid-source", imported: 0 });
  assert.deepEqual(invalidDb.state, { profiles: [], journal: [] });
  const occupied = new FakeDatabase({ profiles: [{ id: "current", profile_json: JSON.stringify(profile) }], journal: [] });
  await assert.rejects(migrateLocalStorageProfile(occupied, source({ status: "valid", profile })), /unjournaled non-empty/);
});

test("migration is idempotent, marker-last, and source remains inspect-only", async () => {
  const db = new FakeDatabase(); const migrationSource = source({ status: "valid", profile });
  await migrateLocalStorageProfile(db, migrationSource); const again = await migrateLocalStorageProfile(db, migrationSource);
  assert.deepEqual(again, { status: "already-complete", imported: 0 }); assert.equal(migrationSource.calls, 1); assert.equal(db.operations.at(-1), "marker");
});

test("transaction failure rolls back profile and marker", async () => {
  const db = new FakeDatabase(); db.failInsert = true;
  await assert.rejects(migrateLocalStorageProfile(db, source({ status: "valid", profile })), /injected profile failure/);
  assert.deepEqual(db.state, { profiles: [], journal: [] });
});

test("initialize is memoized and reopen returns durable profile", async () => {
  const state: State = { profiles: [], journal: [] }; const migrationSource = source({ status: "valid", profile });
  const firstDb = new FakeDatabase(state); const first = new PowerSyncProfileRepository(asDatabase(firstDb), migrationSource);
  assert.deepEqual(await Promise.all([first.initialize(), first.initialize()]), [profile, profile]);
  const reopened = new PowerSyncProfileRepository(asDatabase(new FakeDatabase(state)), migrationSource);
  assert.deepEqual(await reopened.initialize(), profile); assert.equal(migrationSource.calls, 1); assert.equal(firstDb.initCalls, 1);
});

test("replace round-trips timezone and personality and watch publishes complete state", async () => {
  const db = new FakeDatabase(); const repository = new PowerSyncProfileRepository(asDatabase(db), source({ status: "valid", profile }));
  await repository.initialize(); const events: Array<UserProfile | null> = []; const unsubscribe = repository.subscribe((event) => { if (event.type === "profile") events.push(event.profile); });
  await new Promise((resolve) => setTimeout(resolve, 0));
  const changed = { ...profile, timezone: "Europe/London", atlasPersonality: "Friendly" as const, xp: 0 };
  assert.deepEqual(await repository.replace(changed), changed); await new Promise((resolve) => setTimeout(resolve, 0));
  assert.deepEqual(events.at(-1), changed); unsubscribe();
});

test("profile storage never creates a second XP authority", async () => {
  const db = new FakeDatabase(); const repository = new PowerSyncProfileRepository(asDatabase(db), source({ status: "valid", profile }));
  const loaded = await repository.initialize(); assert.equal(loaded?.xp, 999);
  assert.equal(db.state.profiles.length, 1); assert.equal(db.state.journal[0]?.record_count, 1);
});
