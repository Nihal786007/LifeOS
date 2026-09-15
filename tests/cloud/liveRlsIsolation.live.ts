import assert from "node:assert/strict";
import test from "node:test";

import {
  createClient,
} from "@supabase/supabase-js";
import type {
  SupabaseClient,
} from "@supabase/supabase-js";

const TABLES = [
  "life_goals",
  "monthly_outcomes",
  "weekly_focuses",
  "tasks",
  "captures",
  "habit_definitions",
  "habit_completions",
  "execution_records",
  "profiles",
  "atlas_memory_items",
  "notification_ui_state",
] as const;

type TableName = (typeof TABLES)[number];
type TestUser = "a" | "b";
type Row = Record<string, unknown> & { id: string; user_id: string };

const CLEANUP_ORDER: readonly TableName[] = [
  "tasks",
  "habit_completions",
  "atlas_memory_items",
  "weekly_focuses",
  "monthly_outcomes",
  "life_goals",
  "habit_definitions",
  "captures",
  "execution_records",
  "profiles",
  "notification_ui_state",
];

function requiredEnvironment(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing required environment: ${name}`);
  return value;
}

function createTestClient(url: string, publishableKey: string): SupabaseClient {
  return createClient(url, publishableKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

function createRows(userId: string, user: TestUser, runId: string): Record<TableName, Row[]> {
  const entity = (label: string) => `rls-${runId}-${user}-${label}`;
  const timestamp = "2026-09-15T00:00:00.000Z";
  const date = "2026-09-15";
  const lifeGoalId = entity("goal");
  const monthlyId = entity("month");
  const weeklyId = entity("week");
  const habitId = entity("habit");
  const executionId = entity("execution");

  return {
    life_goals: [{
      id: crypto.randomUUID(), user_id: userId, entity_id: lifeGoalId,
      title: "RLS life goal", description: null, progress: 0,
      completed: 0, completed_at: null, start_date: date,
      target_date: null, created_at: timestamp, sort_order: 0,
      extras_json: null,
    }],
    monthly_outcomes: [{
      id: crypto.randomUUID(), user_id: userId, entity_id: monthlyId,
      title: "RLS monthly outcome", month: 9, year: 2026,
      goal_id: lifeGoalId, progress: 0, completed: 0,
      completed_at: null, created_at: timestamp, sort_order: 0,
      extras_json: null,
    }],
    weekly_focuses: [{
      id: crypto.randomUUID(), user_id: userId, entity_id: weeklyId,
      title: "RLS weekly focus", monthly_target_id: monthlyId, week: 3,
      week_start_date: date, week_end_date: "2026-09-21", progress: 0,
      completed: 0, completed_at: null, created_at: timestamp,
      sort_order: 0, extras_json: null,
    }],
    tasks: [{
      id: crypto.randomUUID(), user_id: userId, entity_id: entity("task"),
      title: "RLS task", description: null, due_date: date, priority: "medium",
      weekly_target_id: weeklyId, completed: 0, completed_at: null,
      created_at: timestamp, sort_order: 0, extras_json: null,
    }],
    captures: [{
      id: crypto.randomUUID(), user_id: userId, entity_id: entity("capture"),
      text: "RLS capture", created_at: timestamp, sort_order: 0,
      extras_json: null,
    }],
    habit_definitions: [{
      id: crypto.randomUUID(), user_id: userId, entity_id: habitId,
      name: "RLS habit", description: null,
      active_days_json: JSON.stringify(["monday"]), start_date: date,
      archived: 0, archived_at: null, created_at: timestamp,
      updated_at: timestamp, sort_order: 0, extras_json: null,
    }],
    habit_completions: [{
      id: crypto.randomUUID(), user_id: userId, entity_id: entity("completion"),
      habit_id: habitId, date, completed_at: timestamp, sort_order: 0,
      extras_json: null,
    }],
    execution_records: [
      {
        id: crypto.randomUUID(), user_id: userId,
        execution_id: executionId, entity_id: entity("task"),
        type: "task_completed", title: "RLS execution",
        description: null, created_at: timestamp, xp_awarded: 25,
        icon: null, color: null, metadata_json: null, sort_order: 0,
        extras_json: null,
      },
      {
        id: crypto.randomUUID(), user_id: userId,
        execution_id: executionId, entity_id: entity("task"),
        type: "task_uncompleted", title: "RLS duplicate canonical ID",
        description: null, created_at: timestamp, xp_awarded: 0,
        icon: null, color: null, metadata_json: null, sort_order: 1,
        extras_json: null,
      },
    ],
    profiles: [{
      id: crypto.randomUUID(), user_id: userId, entity_id: "current",
      profile_json: JSON.stringify({
        name: "RLS user", occupation: "", timezone: "Asia/Kolkata",
        theme: "dark", atlasPersonality: "Professional", level: 1, xp: 0,
      }),
    }],
    atlas_memory_items: [{
      id: crypto.randomUUID(), user_id: userId, entity_id: entity("memory"),
      type: "preference", topic: "RLS test", content: "Disposable test context",
      source: "explicit_user_statement", created_at: timestamp,
      updated_at: timestamp, status: "active",
      supersedes_memory_id: null, sort_order: 0,
    }],
    notification_ui_state: [{
      id: crypto.randomUUID(), user_id: userId, entity_id: "current",
      state_json: JSON.stringify({
        version: "1.0.0", readIds: [], dismissedIds: [],
        preferences: {
          tasks: true, habits: true, planning: true, xp: true, atlas: true,
        },
      }),
    }],
  };
}

function updateFor(table: TableName): Record<string, unknown> {
  switch (table) {
    case "captures": return { text: "RLS capture updated" };
    case "tasks": return { title: "RLS task updated" };
    case "life_goals": return { title: "RLS life goal updated" };
    case "monthly_outcomes": return { title: "RLS monthly updated" };
    case "weekly_focuses": return { title: "RLS weekly updated" };
    case "habit_definitions": return { name: "RLS habit updated" };
    case "habit_completions":
      return { completed_at: "2026-09-15T00:01:00.000Z" };
    case "profiles":
      return { profile_json: JSON.stringify({ marker: "rls-updated" }) };
    case "atlas_memory_items":
      return { content: "Disposable test context updated" };
    case "notification_ui_state":
      return { state_json: JSON.stringify({ marker: "rls-updated" }) };
    case "execution_records":
      return { title: "must not update" };
  }
}

async function assertEmptyUser(
  client: SupabaseClient,
  table: TableName
): Promise<void> {
  const { count, error } = await client
    .from(table)
    .select("id", { count: "exact", head: true });
  assert.equal(error, null, `${table}: preflight select failed`);
  assert.equal(count, 0, `${table}: controlled test user is not empty`);
}

async function insertRows(
  client: SupabaseClient,
  table: TableName,
  rows: Row[]
): Promise<void> {
  const { data, error } = await client
    .from(table)
    .insert(rows)
    .select("id");
  assert.equal(error, null, `${table}: owner insert failed: ${error?.message}`);
  assert.equal(data?.length, rows.length, `${table}: owner insert count`);
}

async function assertCrossUserInsertBlocked(
  attacker: SupabaseClient,
  table: TableName,
  victimRow: Row
): Promise<string> {
  const attempted = {
    ...structuredClone(victimRow),
    id: crypto.randomUUID(),
    entity_id: table === "execution_records"
      ? victimRow.entity_id
      : `${String(victimRow.entity_id)}-cross-insert`,
  };
  const { error } = await attacker.from(table).insert(attempted);
  assert.ok(error, `${table}: cross-user insert unexpectedly succeeded`);
  assert.equal(
    error.code,
    "42501",
    `${table}: cross-user insert did not fail through RLS`
  );
  return attempted.id;
}

async function cleanup(
  client: SupabaseClient,
  rows: Record<TableName, Row[]>,
  additionalIds: ReadonlyMap<TableName, readonly string[]>
): Promise<void> {
  for (const table of CLEANUP_ORDER) {
    const ids = [
      ...rows[table].map((row) => row.id),
      ...(additionalIds.get(table) ?? []),
    ];
    const { error } = await client.from(table).delete().in("id", ids);
    if (error) throw new Error(`${table}: cleanup failed: ${error.message}`);
    const { data, error: verifyError } = await client
      .from(table)
      .select("id")
      .in("id", ids);
    if (verifyError || (data?.length ?? 0) !== 0) {
      throw new Error(`${table}: cleanup verification failed`);
    }
  }
}

test("live authenticated users are isolated across all LifeOS cloud tables", async () => {
  const url = requiredEnvironment("VITE_SUPABASE_URL");
  const publishableKey = requiredEnvironment("VITE_SUPABASE_PUBLISHABLE_KEY");
  const clientA = createTestClient(url, publishableKey);
  const clientB = createTestClient(url, publishableKey);
  const cleanupA = new Map<TableName, readonly string[]>();
  const cleanupB = new Map<TableName, readonly string[]>();
  let rowsA: Record<TableName, Row[]> | null = null;
  let rowsB: Record<TableName, Row[]> | null = null;

  try {
    const [authA, authB] = await Promise.all([
      clientA.auth.signInWithPassword({
        email: requiredEnvironment("LIFEOS_RLS_USER_A_EMAIL"),
        password: requiredEnvironment("LIFEOS_RLS_USER_A_PASSWORD"),
      }),
      clientB.auth.signInWithPassword({
        email: requiredEnvironment("LIFEOS_RLS_USER_B_EMAIL"),
        password: requiredEnvironment("LIFEOS_RLS_USER_B_PASSWORD"),
      }),
    ]);

    assert.equal(authA.error, null, "User A authentication failed");
    assert.equal(authB.error, null, "User B authentication failed");
    const userAId = authA.data.user?.id;
    const userBId = authB.data.user?.id;
    assert.ok(userAId && userBId, "Both authenticated identities are required");
    assert.notEqual(userAId, userBId, "Controlled users must be distinct");

    for (const table of TABLES) {
      await assertEmptyUser(clientA, table);
      await assertEmptyUser(clientB, table);
    }

    const runId = crypto.randomUUID();
    rowsA = createRows(userAId, "a", runId);
    rowsB = createRows(userBId, "b", runId);

    for (const table of TABLES) {
      await insertRows(clientA, table, rowsA[table]);
      await insertRows(clientB, table, rowsB[table]);
    }

    for (const table of TABLES) {
      const idsA = rowsA[table].map((row) => row.id);
      const idsB = rowsB[table].map((row) => row.id);

      const ownA = await clientA.from(table).select("id").in("id", idsA);
      const ownB = await clientB.from(table).select("id").in("id", idsB);
      assert.equal(ownA.error, null, `${table}: User A own select failed`);
      assert.equal(ownB.error, null, `${table}: User B own select failed`);
      assert.equal(ownA.data?.length, idsA.length, `${table}: User A own rows`);
      assert.equal(ownB.data?.length, idsB.length, `${table}: User B own rows`);

      const crossSelectA = await clientA.from(table).select("id").in("id", idsB);
      const crossSelectB = await clientB.from(table).select("id").in("id", idsA);
      assert.equal(crossSelectA.error, null, `${table}: cross-select A errored`);
      assert.equal(crossSelectB.error, null, `${table}: cross-select B errored`);
      assert.equal(crossSelectA.data?.length, 0, `${table}: A read B rows`);
      assert.equal(crossSelectB.data?.length, 0, `${table}: B read A rows`);

      const attemptedId = await assertCrossUserInsertBlocked(
        clientA,
        table,
        rowsB[table][0]!
      );
      cleanupB.set(table, [attemptedId]);

      const crossUpdate = await clientA
        .from(table)
        .update(updateFor(table))
        .eq("id", idsB[0]!)
        .select("id");
      if (table === "execution_records") {
        assert.ok(crossUpdate.error, "execution_records: UPDATE grant exists");
        assert.equal(crossUpdate.error.code, "42501");
      } else {
        assert.equal(crossUpdate.error, null, `${table}: cross-update errored`);
        assert.equal(crossUpdate.data?.length, 0, `${table}: A updated B row`);
      }

      const crossDelete = await clientA
        .from(table)
        .delete()
        .eq("id", idsB[0]!)
        .select("id");
      assert.equal(crossDelete.error, null, `${table}: cross-delete errored`);
      assert.equal(crossDelete.data?.length, 0, `${table}: A deleted B row`);

      const victimStillExists = await clientB
        .from(table)
        .select("id")
        .eq("id", idsB[0]!);
      assert.equal(victimStillExists.error, null);
      assert.equal(victimStillExists.data?.length, 1, `${table}: B row changed`);

      if (table !== "execution_records") {
        const ownUpdate = await clientA
          .from(table)
          .update(updateFor(table))
          .eq("id", idsA[0]!)
          .select("id");
        assert.equal(ownUpdate.error, null, `${table}: owner update failed`);
        assert.equal(ownUpdate.data?.length, 1, `${table}: owner update count`);
      }
    }

    console.log(JSON.stringify({
      tables: TABLES.length,
      ownSelectInsertDelete: "passed",
      ownUpdate: "passed for 10 mutable tables",
      executionUpdate: "blocked",
      crossUserSelectInsertUpdateDelete: "blocked",
      duplicateExecutionCanonicalIds: "preserved",
    }));
  } finally {
    const cleanupErrors: string[] = [];
    if (rowsA) {
      try {
        await cleanup(clientA, rowsA, cleanupA);
      } catch (error: unknown) {
        cleanupErrors.push(error instanceof Error ? error.message : String(error));
      }
    }
    if (rowsB) {
      try {
        await cleanup(clientB, rowsB, cleanupB);
      } catch (error: unknown) {
        cleanupErrors.push(error instanceof Error ? error.message : String(error));
      }
    }
    await Promise.all([
      clientA.auth.signOut({ scope: "local" }),
      clientB.auth.signOut({ scope: "local" }),
    ]);
    assert.deepEqual(cleanupErrors, [], "Disposable RLS cleanup failed");
  }
});
