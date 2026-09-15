import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const migrationPath = new URL(
  "../../supabase/migrations/20260915000000_lifeos_cloud_schema_rls.sql",
  import.meta.url
);
const sql = readFileSync(migrationPath, "utf8");

const USER_TABLES = [
  "captures",
  "tasks",
  "life_goals",
  "monthly_outcomes",
  "weekly_focuses",
  "habit_definitions",
  "habit_completions",
  "execution_records",
  "profiles",
  "atlas_memory_items",
  "notification_ui_state",
] as const;

function tableDefinition(table: string): string {
  const match = sql.match(new RegExp(
    `create table public\\.${table} \\(([\\s\\S]*?)\\n\\);`
  ));
  assert.ok(match, `missing table ${table}`);
  return match[1]!;
}

test("migration creates exactly the canonical cloud domains", () => {
  for (const table of USER_TABLES) tableDefinition(table);
  assert.doesNotMatch(sql, /create table public\.migration_journal/i);
  assert.doesNotMatch(sql, /streak|completion_percentage|atlas_reasoning/i);
});

test("every cloud row has UUID storage identity and authenticated ownership", () => {
  for (const table of USER_TABLES) {
    const definition = tableDefinition(table);
    assert.match(definition, /id uuid primary key/);
    assert.match(
      definition,
      /user_id uuid not null references auth\.users\(id\) on delete cascade/
    );
  }
  assert.doesNotMatch(sql, /default\s+gen_random_uuid/i);
});

test("canonical entity IDs are preserved without rewriting numeric values", () => {
  for (const table of USER_TABLES.filter(
    (name) => name !== "execution_records"
  )) {
    assert.match(tableDefinition(table), /entity_id text not null/);
  }
  const execution = tableDefinition("execution_records");
  assert.match(execution, /execution_id text not null/);
  assert.match(execution, /entity_id text not null/);
});

test("execution rows remain independent and append-only in spirit", () => {
  const execution = tableDefinition("execution_records");
  assert.doesNotMatch(execution, /unique\s*\([^)]*execution_id/i);
  assert.match(sql, /execution_id is deliberately not unique/i);
  assert.match(sql, /table_name = 'execution_records'/);
  assert.match(sql, /grant select, insert, delete/);
  assert.match(sql, /table_name <> 'execution_records'/);
});

test("habit completion and planning relationships are same-user safe", () => {
  assert.match(
    tableDefinition("habit_completions"),
    /unique \(user_id, habit_id, date\)/
  );
  assert.match(
    tableDefinition("habit_completions"),
    /foreign key \(user_id, habit_id\)[\s\S]*references public\.habit_definitions\(user_id, entity_id\)/
  );
  assert.match(
    tableDefinition("monthly_outcomes"),
    /foreign key \(user_id, goal_id\)[\s\S]*references public\.life_goals\(user_id, entity_id\)/
  );
  assert.match(
    tableDefinition("weekly_focuses"),
    /foreign key \(user_id, monthly_target_id\)[\s\S]*references public\.monthly_outcomes\(user_id, entity_id\)/
  );
  assert.match(
    tableDefinition("tasks"),
    /foreign key \(user_id, weekly_target_id\)[\s\S]*references public\.weekly_focuses\(user_id, entity_id\)/
  );
});

test("profile and notification state remain one row per user", () => {
  assert.match(tableDefinition("profiles"), /unique \(user_id\)/);
  assert.match(tableDefinition("profiles"), /entity_id = 'current'/);
  assert.match(tableDefinition("notification_ui_state"), /unique \(user_id\)/);
  assert.match(tableDefinition("notification_ui_state"), /entity_id = 'current'/);
});

test("ATLAS Memory remains explicit non-citable context with same-user chains", () => {
  const memory = tableDefinition("atlas_memory_items");
  assert.match(memory, /source = 'explicit_user_statement'/);
  assert.match(
    memory,
    /foreign key \(user_id, supersedes_memory_id\)[\s\S]*references public\.atlas_memory_items\(user_id, entity_id\)/
  );
  assert.match(sql, /Explicit user-confirmed non-citable ATLAS context/);
  assert.doesNotMatch(memory, /conversation|assistant|citation/);
});

test("RLS is forced and ownership policies use only authenticated auth.uid", () => {
  for (const table of USER_TABLES) {
    assert.match(sql, new RegExp(`'${table}'`));
  }
  assert.match(sql, /enable row level security/);
  assert.match(sql, /force row level security/);
  assert.match(sql, /revoke all on table public\.%I from anon, authenticated/);
  assert.match(sql, /for select to authenticated using \(\(select auth\.uid\(\)\) is not null and \(select auth\.uid\(\)\) = user_id\)/);
  assert.match(sql, /for insert to authenticated with check \(\(select auth\.uid\(\)\) is not null and \(select auth\.uid\(\)\) = user_id\)/);
  assert.match(sql, /for update to authenticated using .* with check .*user_id/);
  assert.match(sql, /for delete to authenticated using \(\(select auth\.uid\(\)\) is not null and \(select auth\.uid\(\)\) = user_id\)/);
  assert.doesNotMatch(sql, /to anon\b|using\s*\(\s*true\s*\)/i);
  assert.doesNotMatch(sql, /service_role/i);
});

test("migration has no runtime connection or data upload behavior", () => {
  assert.doesNotMatch(sql, /connect\s*\(/i);
  assert.doesNotMatch(sql, /insert\s+into\s+public\./i);
  assert.match(sql, /^begin;/m);
  assert.match(sql, /^commit;/m);
});
