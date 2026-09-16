export const LIFEOS_CLOUD_TABLES = [
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

export type LifeOSCloudTable = (typeof LIFEOS_CLOUD_TABLES)[number];

const LIFEOS_CLOUD_TABLE_SET = new Set<string>(LIFEOS_CLOUD_TABLES);

export const LIFEOS_CLOUD_COLUMNS: Readonly<
  Record<LifeOSCloudTable, readonly string[]>
> = {
  life_goals: [
    "user_id", "entity_id", "title", "description", "progress",
    "completed", "completed_at", "start_date", "target_date", "created_at",
    "sort_order", "extras_json",
  ],
  monthly_outcomes: [
    "user_id", "entity_id", "title", "month", "year", "goal_id",
    "progress", "completed", "completed_at", "created_at", "sort_order",
    "extras_json",
  ],
  weekly_focuses: [
    "user_id", "entity_id", "title", "monthly_target_id", "week",
    "week_start_date", "week_end_date", "progress", "completed",
    "completed_at", "created_at", "sort_order", "extras_json",
  ],
  tasks: [
    "user_id", "entity_id", "title", "description", "due_date", "priority",
    "weekly_target_id", "completed", "completed_at", "created_at",
    "sort_order", "extras_json",
  ],
  captures: [
    "user_id", "entity_id", "text", "created_at", "sort_order",
    "extras_json",
  ],
  habit_definitions: [
    "user_id", "entity_id", "name", "description", "active_days_json",
    "start_date", "archived", "archived_at", "created_at", "updated_at",
    "sort_order", "extras_json",
  ],
  habit_completions: [
    "user_id", "entity_id", "habit_id", "date", "completed_at",
    "sort_order", "extras_json",
  ],
  execution_records: [
    "user_id", "entity_id", "execution_id", "type", "title", "description",
    "created_at", "xp_awarded", "icon", "color", "metadata_json",
    "sort_order", "extras_json",
  ],
  profiles: ["user_id", "entity_id", "profile_json"],
  atlas_memory_items: [
    "user_id", "entity_id", "type", "topic", "content", "source",
    "created_at", "updated_at", "status", "supersedes_memory_id",
    "sort_order",
  ],
  notification_ui_state: ["user_id", "entity_id", "state_json"],
};

export const LIFEOS_CLOUD_PUT_ORDER: readonly LifeOSCloudTable[] = [
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
];

export const LIFEOS_CLOUD_DELETE_ORDER: readonly LifeOSCloudTable[] = [
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

export function isLifeOSCloudTable(value: string): value is LifeOSCloudTable {
  return LIFEOS_CLOUD_TABLE_SET.has(value);
}
