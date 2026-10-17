import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";
import test from "node:test";
import type { PowerSyncDatabase } from "@powersync/web";
import type { Capture } from "../../src/shared/types.ts";

registerHooks({ resolve(specifier, context, nextResolve) {
  return nextResolve(specifier.startsWith(".") && !/\.[a-z]+$/i.test(specifier) ? `${specifier}.ts` : specifier, context);
} });
const { createAuthenticatedDataServices } = await import("../../src/data/account/authenticatedDataServices.ts");
const A = "11111111-1111-4111-8111-111111111111";
const B = "22222222-2222-4222-8222-222222222222";
type Row = { id: string; user_id: string; entity_id: string; text: string; created_at: string; sort_order: number; extras_json: string | null };
const thought = (id: number, createdAt = "2026-10-15T12:00:00.000Z"): Capture => ({ id, text: `synthetic thought ${id}`, createdAt });

test("the upload mirror enforces the version-controlled Capture cloud constraint", () => {
  const schema = readFileSync(new URL("../../supabase/migrations/20260915000000_lifeos_cloud_schema_rls.sql", import.meta.url), "utf8");
  const captures = schema.split("create table public.captures (")[1]?.split("\n);")[0];
  assert.ok(captures);
  assert.match(captures, /sort_order bigint not null check \(sort_order >= 0\)/);
});

// Real isolated SQLite, deliberately allowing the local values that PowerSync allows.
// The separate upload mirror enforces the cloud constraint, not the local schema.
function fixture(owner = A) {
  const sqlite = new DatabaseSync(":memory:");
  sqlite.exec("CREATE TABLE captures(id TEXT PRIMARY KEY,user_id TEXT,entity_id TEXT UNIQUE,text TEXT,created_at TEXT,sort_order INTEGER,extras_json TEXT)");
  let serial = 0;
  let tail = Promise.resolve();
  const cloud = new Map<string, Row>();
  const all = async <T>(sql: string, args: (string | number | null)[] = []) => sqlite.prepare(sql).all(...args) as T[];
  const getOptional = async <T>(sql: string) => (await all<T>(sql))[0] ?? null;
  const execute = async (sql: string, args: (string | number | null)[] = []) => { sqlite.prepare(sql).run(...args); };
  const adapter = {
    init: async () => undefined,
    getAll: all,
    getOptional,
    execute,
    writeTransaction<T>(run: (tx: { getAll: typeof all; getOptional: typeof getOptional; execute: typeof execute }) => Promise<T>) {
      const result = tail.then(async () => {
        sqlite.exec("BEGIN");
        try { const value = await run(adapter); sqlite.exec("COMMIT"); return value; }
        catch (error) { sqlite.exec("ROLLBACK"); throw error; }
      });
      tail = result.then(() => undefined, () => undefined);
      return result;
    },
  };
  const repository = () => createAuthenticatedDataServices(adapter as unknown as PowerSyncDatabase, owner, () => `row-${owner}-${++serial}`).captureRepository;
  const rows = () => sqlite.prepare("SELECT * FROM captures ORDER BY sort_order,entity_id DESC").all() as Row[];
  const upload = () => {
    const current = rows();
    for (const row of current) {
      assert.equal(row.user_id, owner);
      assert.ok(Number.isSafeInteger(row.sort_order) && row.sort_order >= 0, "cloud captures.sort_order >= 0");
    }
    // Model UUID upsert/replay and exact deletions; production connector is tested separately.
    cloud.clear();
    for (const row of current) cloud.set(row.id, structuredClone(row));
  };
  return { repository, rows, cloud, upload, close: () => sqlite.close(), execute };
}

test("first and sequential captures satisfy the cloud non-negative ordering constraint", async () => {
  const f = fixture();
  try {
    const repo = f.repository();
    assert.deepEqual(await repo.initialize(), []);
    await repo.insert(thought(1)); f.upload();
    await repo.insert(thought(2)); f.upload();
    await repo.insert(thought(3)); f.upload();
    assert.deepEqual((await f.repository().initialize()).map(c => c.id), [3, 2, 1]);
    assert.equal(f.cloud.size, 3);
  } finally { f.close(); }
});

test("rapid offline inserts survive reopen, upload and replay without loss or duplicate identities", async () => {
  const f = fixture();
  try {
    const repo = f.repository();
    const captures = Array.from({ length: 20 }, (_, i) => thought(i + 1));
    await Promise.all(captures.map(capture => repo.insert(capture)));
    assert.equal(f.cloud.size, 0);
    const reloaded = await f.repository().initialize();
    assert.deepEqual(reloaded, [...captures].reverse());
    f.upload(); const once = [...f.cloud.values()]; f.upload();
    assert.deepEqual([...f.cloud.values()], once);
    assert.equal(f.cloud.size, 20);
    assert.deepEqual(await f.repository().initialize(), reloaded);
  } finally { f.close(); }
});

test("legacy ordering, canonical fields and unknown extras survive prepend and exact deletion", async () => {
  const f = fixture();
  try {
    await f.execute("INSERT INTO captures VALUES(?,?,?,?,?,?,?)", ["legacy", A, "7", "unchanged synthetic text", "2020-01-01T00:00:00Z", 0, '{"extra":{"keep":true}}']);
    const before = await f.repository().initialize();
    const repo = f.repository(); await repo.insert(thought(8)); f.upload();
    assert.deepEqual((await f.repository().initialize())[1], before[0]);
    await repo.delete(8); f.upload();
    assert.deepEqual(await f.repository().initialize(), before);
    assert.deepEqual([...f.cloud.values()].map(row => row.id), ["legacy"]);
  } finally { f.close(); }
});

test("timestamp ties preserve deterministic repository insertion order across reloads", async () => {
  const f = fixture();
  try {
    const repo = f.repository(); await repo.insert(thought(9)); await repo.insert(thought(10));
    const once = await f.repository().initialize();
    assert.deepEqual(once.map(c => c.id), [10, 9]);
    assert.deepEqual(await f.repository().initialize(), once);
  } finally { f.close(); }
});

test("per-user database bindings do not expose or modify another account's captures", async () => {
  const a = fixture(A), b = fixture(B);
  try {
    await a.repository().insert(thought(1)); a.upload();
    assert.deepEqual(await b.repository().initialize(), []);
    await b.repository().insert(thought(2)); b.upload();
    assert.deepEqual((await a.repository().initialize()).map(c => c.id), [1]);
    assert.deepEqual((await b.repository().initialize()).map(c => c.id), [2]);
    assert.ok([...a.cloud.values()].every(row => row.user_id === A));
    assert.ok([...b.cloud.values()].every(row => row.user_id === B));
  } finally { a.close(); b.close(); }
});

test("a failed duplicate insert rolls back ordinal changes and preserves every stored field", async () => {
  const f = fixture();
  try {
    const repo = f.repository(); await repo.insert(thought(1)); await repo.insert(thought(2));
    const before = f.rows();
    await assert.rejects(repo.insert(thought(1)), /UNIQUE constraint/);
    assert.deepEqual(f.rows(), before);
    f.upload(); assert.equal(f.cloud.size, 2);
  } finally { f.close(); }
});

test("legacy negative local ordinals are reindexed without changing relative order or contents", async () => {
  const f = fixture();
  try {
    await f.execute("INSERT INTO captures VALUES(?,?,?,?,?,?,?)", ["old-1", A, "1", "first", "2020-01-01", -2, null]);
    await f.execute("INSERT INTO captures VALUES(?,?,?,?,?,?,?)", ["old-2", A, "2", "second", "2020-01-02", -1, null]);
    const before = await f.repository().initialize();
    await f.repository().insert(thought(3));
    assert.deepEqual((await f.repository().initialize()).slice(1), before);
    f.upload(); assert.deepEqual(f.rows().map(row => row.sort_order), [0, 1, 2]);
  } finally { f.close(); }
});

test("adoption's reverse-insert sequence preserves the exact source array, independent of timestamps", async () => {
  const f = fixture();
  try {
    const source = [thought(7, "2020-01-01"), thought(8, "2026-10-15"), thought(9, "2024-04-03")];
    const repo = f.repository();
    for (const capture of [...source].reverse()) await repo.insert(capture);
    f.upload();
    assert.deepEqual(await f.repository().initialize(), source);
  } finally { f.close(); }
});
