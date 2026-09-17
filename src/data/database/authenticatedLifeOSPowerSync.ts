import {
  column,
  PowerSyncDatabase,
  Schema,
  Table,
  WASQLiteVFS,
} from "@powersync/web";

const ownedEntityColumns = {
  user_id: column.text,
  entity_id: column.text,
};

export const authenticatedLifeOSPowerSyncSchema = new Schema({
  life_goals: new Table({
    ...ownedEntityColumns,
    title: column.text,
    description: column.text,
    progress: column.real,
    completed: column.integer,
    completed_at: column.text,
    start_date: column.text,
    target_date: column.text,
    created_at: column.text,
    sort_order: column.integer,
    extras_json: column.text,
  }),
  monthly_outcomes: new Table({
    ...ownedEntityColumns,
    title: column.text,
    month: column.integer,
    year: column.integer,
    goal_id: column.text,
    progress: column.real,
    completed: column.integer,
    completed_at: column.text,
    created_at: column.text,
    sort_order: column.integer,
    extras_json: column.text,
  }),
  weekly_focuses: new Table({
    ...ownedEntityColumns,
    title: column.text,
    monthly_target_id: column.text,
    week: column.integer,
    week_start_date: column.text,
    week_end_date: column.text,
    progress: column.real,
    completed: column.integer,
    completed_at: column.text,
    created_at: column.text,
    sort_order: column.integer,
    extras_json: column.text,
  }),
  tasks: new Table({
    ...ownedEntityColumns,
    title: column.text,
    description: column.text,
    due_date: column.text,
    priority: column.text,
    weekly_target_id: column.text,
    completed: column.integer,
    completed_at: column.text,
    created_at: column.text,
    sort_order: column.integer,
    extras_json: column.text,
  }),
  captures: new Table({
    ...ownedEntityColumns,
    text: column.text,
    created_at: column.text,
    sort_order: column.integer,
    extras_json: column.text,
  }),
  habit_definitions: new Table({
    ...ownedEntityColumns,
    name: column.text,
    description: column.text,
    active_days_json: column.text,
    start_date: column.text,
    archived: column.integer,
    archived_at: column.text,
    created_at: column.text,
    updated_at: column.text,
    sort_order: column.integer,
    extras_json: column.text,
  }),
  habit_completions: new Table({
    ...ownedEntityColumns,
    habit_id: column.text,
    date: column.text,
    completed_at: column.text,
    sort_order: column.integer,
    extras_json: column.text,
  }),
  execution_records: new Table({
    ...ownedEntityColumns,
    execution_id: column.text,
    type: column.text,
    title: column.text,
    description: column.text,
    created_at: column.text,
    xp_awarded: column.real,
    icon: column.text,
    color: column.text,
    metadata_json: column.text,
    sort_order: column.integer,
    extras_json: column.text,
  }),
  profiles: new Table({
    ...ownedEntityColumns,
    profile_json: column.text,
  }),
  atlas_memory_items: new Table({
    ...ownedEntityColumns,
    type: column.text,
    topic: column.text,
    content: column.text,
    source: column.text,
    created_at: column.text,
    updated_at: column.text,
    status: column.text,
    supersedes_memory_id: column.text,
    sort_order: column.integer,
  }),
  notification_ui_state: new Table({
    ...ownedEntityColumns,
    state_json: column.text,
  }),
  account_binding: Table.createLocalOnly({
    user_hash: column.text,
    setup_choice: column.text,
    adoption_version: column.integer,
    completed_at: column.text,
  }),
  adoption_journal: Table.createLocalOnly({
    user_hash: column.text,
    adoption_version: column.integer,
    source_hashes_json: column.text,
    completed_domains_json: column.text,
    started_at: column.text,
    updated_at: column.text,
  }),
  migration_journal: Table.createLocalOnly({
    source_key: column.text,
    record_count: column.integer,
    completed_at: column.text,
  }),
});

export type AuthenticatedLifeOSPowerSyncDatabase =
  (typeof authenticatedLifeOSPowerSyncSchema)["types"];

const USER_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function assertAuthenticatedUserId(userId: string): string {
  const normalized = userId.trim().toLowerCase();
  if (!USER_ID_PATTERN.test(normalized)) {
    throw new Error("Authenticated PowerSync requires a Supabase user UUID");
  }
  return normalized;
}

export async function authenticatedDatabaseName(userId: string): Promise<string> {
  return `lifeos-user-${await authenticatedUserHash(userId)}-v1.sqlite`;
}

export async function authenticatedUserHash(userId: string): Promise<string> {
  const normalized = assertAuthenticatedUserId(userId);
  const bytes = new TextEncoder().encode(`lifeos:${normalized}`);
  const digest = await globalThis.crypto.subtle.digest("SHA-256", bytes);
  const hash = Array.from(new Uint8Array(digest), (value) =>
    value.toString(16).padStart(2, "0")
  ).join("");
  return hash.slice(0, 32);
}

export async function createAuthenticatedLifeOSPowerSyncDatabase(
  userId: string
): Promise<PowerSyncDatabase> {
  return new PowerSyncDatabase({
    schema: authenticatedLifeOSPowerSyncSchema,
    database: {
      dbFilename: await authenticatedDatabaseName(userId),
      vfs: WASQLiteVFS.IDBBatchAtomicVFS,
      enableMultiTabs: false,
      useWebWorker: true,
    },
  });
}
