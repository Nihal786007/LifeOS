import assert from "node:assert/strict";
import test from "node:test";

import { UpdateType } from "@powersync/web";
import type {
  CommonPowerSyncDatabase,
  CrudEntry,
  PowerSyncDatabase,
} from "@powersync/web";
import type { SupabaseClient } from "@supabase/supabase-js";

import {
  authenticatedDatabaseName,
  authenticatedLifeOSPowerSyncSchema,
} from "../../src/data/database/authenticatedLifeOSPowerSync.ts";
import { SupabasePowerSyncConnector } from "../../src/data/cloud/SupabasePowerSyncConnector.ts";
import { AuthenticatedPowerSyncSessionManager } from "../../src/data/cloud/AuthenticatedPowerSyncSessionManager.ts";
import { readPowerSyncEndpoint } from "../../src/data/cloud/createAuthenticatedPowerSync.ts";

const USER_A = "11111111-1111-4111-8111-111111111111";
const USER_B = "22222222-2222-4222-8222-222222222222";
const ROW_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

interface RecordedMutation {
  table: string;
  action: string;
  payload?: unknown;
  options?: unknown;
  filters: unknown[];
}

function fakeSupabase(options?: { userId?: string; token?: string }) {
  const mutations: RecordedMutation[] = [];
  const createBuilder = (table: string, action: string, payload?: unknown, queryOptions?: unknown) => {
    const mutation: RecordedMutation = {
      table,
      action,
      payload,
      options: queryOptions,
      filters: [],
    };
    mutations.push(mutation);
    const builder = {
      eq(column: string, value: unknown) {
        mutation.filters.push(["eq", column, value]);
        return builder;
      },
      in(column: string, value: unknown) {
        mutation.filters.push(["in", column, value]);
        return builder;
      },
      then(resolve: (value: { error: null }) => unknown) {
        return Promise.resolve(resolve({ error: null }));
      },
    };
    return builder;
  };
  const client = {
    auth: {
      getSession: async () => ({
        data: options?.userId === undefined ? { session: null } : {
          session: {
            access_token: options.token ?? "test-jwt",
            expires_at: 2_000_000_000,
            user: { id: options.userId },
          },
        },
        error: null,
      }),
    },
    from(table: string) {
      return {
        upsert: (payload: unknown, queryOptions: unknown) =>
          createBuilder(table, "upsert", payload, queryOptions),
        update: (payload: unknown) => createBuilder(table, "update", payload),
        delete: () => createBuilder(table, "delete"),
      };
    },
  } as unknown as SupabaseClient;
  return { client, mutations };
}

function crud(overrides: Partial<CrudEntry> = {}): CrudEntry {
  return {
    clientId: 1,
    id: ROW_A,
    op: UpdateType.PUT,
    table: "tasks",
    opData: {
      user_id: USER_A,
      entity_id: "1700000000001",
      title: "Controlled task",
    },
    toJSON: () => ({}),
    equals: () => false,
    toComparisonArray: () => [],
    ...overrides,
  };
}

function fakeCrudDatabase(operations: CrudEntry[]) {
  let completed = 0;
  const database = {
    getNextCrudTransaction: async () => ({
      crud: operations,
      transactionId: 1,
      complete: async () => { completed += 1; },
    }),
  } as unknown as CommonPowerSyncDatabase;
  return { database, completed: () => completed };
}

test("authenticated schema contains exactly 11 synced tables and bounded local metadata", () => {
  const json = authenticatedLifeOSPowerSyncSchema.toJSON();
  const synced = json.tables.filter((table) => !table.local_only);
  const local = json.tables.filter((table) => table.local_only);
  assert.equal(synced.length, 11);
  assert.deepEqual(local.map((table) => table.name).sort(), ["account_binding", "adoption_journal", "migration_journal"]);
  for (const table of synced) {
    assert.ok(table.columns.some((column) => column.name === "user_id"));
    assert.ok(table.columns.some((column) => column.name === "entity_id"));
  }
});

test("per-user database names are stable, isolated, and do not expose user IDs", async () => {
  const first = await authenticatedDatabaseName(USER_A);
  const repeated = await authenticatedDatabaseName(USER_A.toUpperCase());
  const second = await authenticatedDatabaseName(USER_B);
  assert.equal(first, repeated);
  assert.notEqual(first, second);
  assert.doesNotMatch(first, /11111111/);
  assert.match(first, /^lifeos-user-[0-9a-f]{32}-v1\.sqlite$/);
});

test("fetchCredentials uses only the matching current Supabase session", async () => {
  const { client } = fakeSupabase({ userId: USER_A, token: "fresh-token" });
  const connector = new SupabasePowerSyncConnector({
    endpoint: "https://example.powersync.journeyapps.com/",
    userId: USER_A,
    supabase: client,
  });
  const credentials = await connector.fetchCredentials();
  assert.equal(credentials?.endpoint, "https://example.powersync.journeyapps.com");
  assert.equal(credentials?.token, "fresh-token");

  const mismatch = new SupabasePowerSyncConnector({
    endpoint: "https://example.powersync.journeyapps.com",
    userId: USER_B,
    supabase: client,
  });
  await assert.rejects(() => mismatch.fetchCredentials(), /does not match/);
  const signedOut = new SupabasePowerSyncConnector({
    endpoint: "https://example.powersync.journeyapps.com",
    userId: USER_A,
    supabase: fakeSupabase().client,
  });
  assert.equal(await signedOut.fetchCredentials(), null);
});

test("uploads only approved owned cloud rows and completes after success", async () => {
  const { client, mutations } = fakeSupabase({ userId: USER_A });
  const connector = new SupabasePowerSyncConnector({
    endpoint: "https://example.powersync.journeyapps.com",
    userId: USER_A,
    supabase: client,
  });
  const { database, completed } = fakeCrudDatabase([
    crud(),
    crud({ op: UpdateType.PATCH, opData: { title: "Updated" } }),
    crud({ op: UpdateType.DELETE, opData: undefined }),
  ]);
  await connector.uploadData(database);
  assert.equal(completed(), 1);
  assert.deepEqual(mutations.map((mutation) => mutation.action), [
    "upsert", "update", "delete",
  ]);
  assert.deepEqual(mutations[1]?.filters, [
    ["eq", "id", ROW_A],
    ["eq", "user_id", USER_A],
  ]);
  assert.deepEqual(mutations[2]?.filters, [
    ["in", "id", [ROW_A]],
    ["eq", "user_id", USER_A],
  ]);
});

test("rejects unknown tables, cross-user ownership, identity patches, and non-UUID rows", async () => {
  const { client } = fakeSupabase({ userId: USER_A });
  const connector = new SupabasePowerSyncConnector({
    endpoint: "https://example.powersync.journeyapps.com",
    userId: USER_A,
    supabase: client,
  });
  const attempts = [
    crud({ table: "migration_journal" }),
    crud({ opData: { user_id: USER_B, entity_id: "1" } }),
    crud({ op: UpdateType.PATCH, opData: { entity_id: "2" } }),
    crud({ id: "1700000000001" }),
    crud({ opData: {
      user_id: USER_A,
      entity_id: "1700000000001",
      title: "Task",
      unapproved_cloud_field: true,
    } }),
  ];
  for (const operation of attempts) {
    const { database, completed } = fakeCrudDatabase([operation]);
    await assert.rejects(() => connector.uploadData(database));
    assert.equal(completed(), 0);
  }
});

test("Execution History keeps independent UUID rows and rejects patches", async () => {
  const { client, mutations } = fakeSupabase({ userId: USER_A });
  const connector = new SupabasePowerSyncConnector({
    endpoint: "https://example.powersync.journeyapps.com",
    userId: USER_A,
    supabase: client,
  });
  const secondId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
  const base = {
    user_id: USER_A,
    entity_id: "1700000000001",
    execution_id: "1700000000999",
    type: "task_completed",
  };
  const { database } = fakeCrudDatabase([
    crud({ table: "execution_records", opData: base }),
    crud({ id: secondId, table: "execution_records", opData: base }),
  ]);
  await connector.uploadData(database);
  const rows = mutations[0]?.payload as Record<string, unknown>[];
  assert.deepEqual(rows.map((row) => row.id), [ROW_A, secondId]);
  assert.deepEqual(mutations[0]?.options, {
    onConflict: "id",
    ignoreDuplicates: true,
  });

  const patched = fakeCrudDatabase([
    crud({ table: "execution_records", op: UpdateType.PATCH, opData: { title: "No" } }),
  ]);
  await assert.rejects(
    () => connector.uploadData(patched.database),
    /append-only/
  );
});

test("account switching hides the old session and cleans watches before disconnect", async () => {
  const events: string[] = [];
  const databases = new Map<string, PowerSyncDatabase>();
  const createDatabase = async (userId: string) => {
    const database = {
      init: async () => { events.push(`${userId}:init`); },
      connect: async () => { events.push(`${userId}:connect`); },
      waitForFirstSync: async () => { events.push(`${userId}:synced`); },
      disconnect: async () => { events.push(`${userId}:disconnect`); },
      close: async () => { events.push(`${userId}:close`); },
    } as unknown as PowerSyncDatabase;
    databases.set(userId, database);
    return database;
  };
  const manager = new AuthenticatedPowerSyncSessionManager({
    createDatabase,
    createConnector: () => ({
      fetchCredentials: async () => null,
      uploadData: async () => undefined,
    }),
  });

  assert.equal(manager.current(), null);
  const first = await manager.activate(USER_A);
  first.registerCleanup(() => { events.push(`${USER_A}:watch-cleanup`); });
  assert.equal(manager.current()?.userId, USER_A);
  const pendingSecond = manager.activate(USER_B);
  assert.equal(manager.current()?.userId, USER_A);
  const second = await pendingSecond;
  assert.equal(second.userId, USER_B);
  assert.deepEqual(events, [
    `${USER_A}:init`, `${USER_A}:connect`, `${USER_A}:synced`,
    `${USER_A}:watch-cleanup`, `${USER_A}:disconnect`, `${USER_A}:close`,
    `${USER_B}:init`, `${USER_B}:connect`, `${USER_B}:synced`,
  ]);
  await manager.deactivate();
  assert.equal(manager.current(), null);
  assert.equal(databases.size, 2);
});

test("repeated same-user activation owns one database, connector, and hydration path", async () => {
  const events: string[] = [];
  let databaseCount = 0;
  let connectorCount = 0;
  const manager = new AuthenticatedPowerSyncSessionManager({
    createDatabase: async () => {
      databaseCount += 1;
      return {
        init: async () => { events.push("init"); },
        connect: async () => { events.push("connect"); },
        waitForFirstSync: async () => { events.push("synced"); },
        disconnect: async () => { events.push("disconnect"); },
        close: async () => { events.push("close"); },
      } as unknown as PowerSyncDatabase;
    },
    createConnector: () => {
      connectorCount += 1;
      return {
        fetchCredentials: async () => null,
        uploadData: async () => undefined,
      };
    },
  });

  const [first, concurrent] = await Promise.all([
    manager.activate(USER_A),
    manager.activate(USER_A),
  ]);
  const repeated = await manager.activate(USER_A);

  assert.equal(first, concurrent);
  assert.equal(first, repeated);
  assert.equal(databaseCount, 1);
  assert.equal(connectorCount, 1);
  assert.deepEqual(events, ["init", "connect", "synced"]);

  await manager.deactivate();
  const reopened = await manager.activate(USER_A);
  assert.notEqual(reopened, first);
  assert.equal(databaseCount, 2);
  assert.equal(connectorCount, 2);
  assert.deepEqual(events, [
    "init", "connect", "synced", "disconnect", "close",
    "init", "connect", "synced",
  ]);
  await manager.deactivate();
});

test("development remount disposes pending hydration before reopening the same user", async () => {
  const events: string[] = [];
  let releaseFirstSync!: () => void;
  const firstSync = new Promise<void>((resolve) => { releaseFirstSync = resolve; });
  let created = 0;
  let openDatabases = 0;
  let maximumOpenDatabases = 0;
  const manager = new AuthenticatedPowerSyncSessionManager({
    createDatabase: async () => {
      const instance = ++created;
      return {
        init: async () => {
          openDatabases += 1;
          maximumOpenDatabases = Math.max(maximumOpenDatabases, openDatabases);
          events.push(`${instance}:init`);
        },
        connect: async () => { events.push(`${instance}:connect`); },
        waitForFirstSync: async () => {
          events.push(`${instance}:sync-start`);
          if (instance === 1) await firstSync;
          events.push(`${instance}:synced`);
        },
        disconnect: async () => { events.push(`${instance}:disconnect`); },
        close: async () => {
          openDatabases -= 1;
          events.push(`${instance}:close`);
        },
      } as unknown as PowerSyncDatabase;
    },
    createConnector: () => ({
      fetchCredentials: async () => null,
      uploadData: async () => undefined,
    }),
  });

  const staleHydration = manager.activate(USER_A);
  const dispose = manager.deactivate();
  const currentHydration = manager.activate(USER_A);
  releaseFirstSync();

  await staleHydration;
  await dispose;
  const current = await currentHydration;
  assert.equal(current.userId, USER_A);
  assert.equal(manager.current(), current);
  assert.equal(maximumOpenDatabases, 1);
  assert.deepEqual(events, [
    "1:init", "1:connect", "1:sync-start", "1:synced",
    "1:disconnect", "1:close",
    "2:init", "2:connect", "2:sync-start", "2:synced",
  ]);
  await manager.deactivate();
  assert.equal(openDatabases, 0);
});

test("PowerSync endpoint configuration is explicit and bounded", () => {
  assert.equal(
    readPowerSyncEndpoint({ VITE_POWERSYNC_URL: " https://sync.example " }),
    "https://sync.example"
  );
  assert.throws(() => readPowerSyncEndpoint({}), /unavailable/);
});
