-- LifeOS Cloud Schema + RLS V1
-- Storage identity is a client-generated UUID. Existing LifeOS IDs are
-- preserved as entity_id (or execution_id for the execution ledger).
-- This migration intentionally excludes the local-only migration_journal.

begin;

create table public.life_goals (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  entity_id text not null,
  title text not null,
  description text,
  progress double precision not null,
  completed smallint not null check (completed in (0, 1)),
  completed_at text,
  start_date text not null,
  target_date text,
  created_at text not null,
  sort_order bigint not null check (sort_order >= 0),
  extras_json text check (
    extras_json is null or jsonb_typeof(extras_json::jsonb) = 'object'
  ),
  constraint life_goals_user_entity_unique unique (user_id, entity_id),
  constraint life_goals_entity_id_nonempty check (length(btrim(entity_id)) > 0)
);

create table public.monthly_outcomes (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  entity_id text not null,
  title text not null,
  month integer not null,
  year integer not null,
  goal_id text,
  progress double precision not null,
  completed smallint not null check (completed in (0, 1)),
  completed_at text,
  created_at text not null,
  sort_order bigint not null check (sort_order >= 0),
  extras_json text check (
    extras_json is null or jsonb_typeof(extras_json::jsonb) = 'object'
  ),
  constraint monthly_outcomes_user_entity_unique unique (user_id, entity_id),
  constraint monthly_outcomes_entity_id_nonempty check (length(btrim(entity_id)) > 0),
  constraint monthly_outcomes_goal_same_user_fk
    foreign key (user_id, goal_id)
    references public.life_goals(user_id, entity_id)
    on update no action
    on delete no action
    deferrable initially deferred
);

create table public.weekly_focuses (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  entity_id text not null,
  title text not null,
  monthly_target_id text,
  week integer not null check (week between 1 and 5),
  week_start_date text,
  week_end_date text,
  progress double precision not null,
  completed smallint not null check (completed in (0, 1)),
  completed_at text,
  created_at text not null,
  sort_order bigint not null check (sort_order >= 0),
  extras_json text check (
    extras_json is null or jsonb_typeof(extras_json::jsonb) = 'object'
  ),
  constraint weekly_focuses_user_entity_unique unique (user_id, entity_id),
  constraint weekly_focuses_entity_id_nonempty check (length(btrim(entity_id)) > 0),
  constraint weekly_focuses_monthly_same_user_fk
    foreign key (user_id, monthly_target_id)
    references public.monthly_outcomes(user_id, entity_id)
    on update no action
    on delete no action
    deferrable initially deferred
);

create table public.tasks (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  entity_id text not null,
  title text not null,
  description text,
  due_date text,
  priority text not null check (priority in ('low', 'medium', 'high')),
  weekly_target_id text,
  completed smallint not null check (completed in (0, 1)),
  completed_at text,
  created_at text not null,
  sort_order bigint not null check (sort_order >= 0),
  extras_json text check (
    extras_json is null or jsonb_typeof(extras_json::jsonb) = 'object'
  ),
  constraint tasks_user_entity_unique unique (user_id, entity_id),
  constraint tasks_entity_id_nonempty check (length(btrim(entity_id)) > 0),
  constraint tasks_weekly_same_user_fk
    foreign key (user_id, weekly_target_id)
    references public.weekly_focuses(user_id, entity_id)
    on update no action
    on delete no action
    deferrable initially deferred
);

create table public.captures (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  entity_id text not null,
  text text not null,
  created_at text not null,
  sort_order bigint not null check (sort_order >= 0),
  extras_json text check (
    extras_json is null or jsonb_typeof(extras_json::jsonb) = 'object'
  ),
  constraint captures_user_entity_unique unique (user_id, entity_id),
  constraint captures_entity_id_nonempty check (length(btrim(entity_id)) > 0)
);

create table public.habit_definitions (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  entity_id text not null,
  name text not null,
  description text,
  active_days_json text not null check (
    jsonb_typeof(active_days_json::jsonb) = 'array'
  ),
  start_date text not null,
  archived smallint not null check (archived in (0, 1)),
  archived_at text,
  created_at text not null,
  updated_at text not null,
  sort_order bigint not null check (sort_order >= 0),
  extras_json text check (
    extras_json is null or jsonb_typeof(extras_json::jsonb) = 'object'
  ),
  constraint habit_definitions_user_entity_unique unique (user_id, entity_id),
  constraint habit_definitions_entity_id_nonempty check (length(btrim(entity_id)) > 0)
);

create table public.habit_completions (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  entity_id text not null,
  habit_id text not null,
  date text not null,
  completed_at text not null,
  sort_order bigint not null check (sort_order >= 0),
  extras_json text check (
    extras_json is null or jsonb_typeof(extras_json::jsonb) = 'object'
  ),
  constraint habit_completions_user_entity_unique unique (user_id, entity_id),
  constraint habit_completions_user_habit_date_unique
    unique (user_id, habit_id, date),
  constraint habit_completions_entity_id_nonempty check (length(btrim(entity_id)) > 0),
  constraint habit_completions_definition_same_user_fk
    foreign key (user_id, habit_id)
    references public.habit_definitions(user_id, entity_id)
    on update no action
    on delete no action
    deferrable initially deferred
);

create table public.execution_records (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  execution_id text not null,
  entity_id text not null,
  type text not null check (type in (
    'task_completed', 'task_uncompleted', 'task_deleted',
    'weekly_completed', 'weekly_uncompleted', 'weekly_deleted',
    'monthly_completed', 'monthly_uncompleted', 'monthly_deleted',
    'life_goal_completed', 'life_goal_uncompleted', 'life_goal_deleted',
    'habit_completed', 'habit_uncompleted', 'xp_earned',
    'achievement_unlocked', 'system'
  )),
  title text not null,
  description text,
  created_at text not null,
  xp_awarded double precision not null,
  icon text,
  color text,
  metadata_json text check (
    metadata_json is null or jsonb_typeof(metadata_json::jsonb) = 'object'
  ),
  sort_order bigint not null,
  extras_json text check (
    extras_json is null or jsonb_typeof(extras_json::jsonb) = 'object'
  ),
  constraint execution_records_execution_id_nonempty
    check (length(btrim(execution_id)) > 0),
  constraint execution_records_entity_id_nonempty
    check (length(btrim(entity_id)) > 0)
);

-- execution_id is deliberately not unique: each ledger row is independently
-- identified by id so duplicate canonical execution IDs are never collapsed.
create index execution_records_user_execution_idx
  on public.execution_records(user_id, execution_id);

create table public.profiles (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  entity_id text not null check (entity_id = 'current'),
  profile_json text not null check (
    jsonb_typeof(profile_json::jsonb) = 'object'
  ),
  constraint profiles_one_row_per_user unique (user_id),
  constraint profiles_user_entity_unique unique (user_id, entity_id)
);

create table public.atlas_memory_items (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  entity_id text not null,
  type text not null check (
    type in ('preference', 'decision', 'constraint', 'important_context')
  ),
  topic text not null,
  content text not null,
  source text not null check (source = 'explicit_user_statement'),
  created_at text not null,
  updated_at text not null,
  status text not null check (status in ('active', 'superseded')),
  supersedes_memory_id text,
  sort_order bigint not null check (sort_order >= 0),
  constraint atlas_memory_user_entity_unique unique (user_id, entity_id),
  constraint atlas_memory_entity_id_nonempty check (length(btrim(entity_id)) > 0),
  constraint atlas_memory_no_self_supersede
    check (supersedes_memory_id is null or supersedes_memory_id <> entity_id),
  constraint atlas_memory_supersedes_same_user_fk
    foreign key (user_id, supersedes_memory_id)
    references public.atlas_memory_items(user_id, entity_id)
    on update no action
    on delete no action
    deferrable initially deferred
);

comment on table public.atlas_memory_items is
  'Explicit user-confirmed non-citable ATLAS context. This table is not factual reasoning authority.';

create table public.notification_ui_state (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  entity_id text not null check (entity_id = 'current'),
  state_json text not null check (
    jsonb_typeof(state_json::jsonb) = 'object'
  ),
  constraint notification_ui_state_one_row_per_user unique (user_id),
  constraint notification_ui_state_user_entity_unique unique (user_id, entity_id)
);

comment on table public.notification_ui_state is
  'Read IDs, dismissed IDs, and category preferences only. Notification facts remain derived.';

comment on table public.execution_records is
  'Canonical append-only execution ledger. XP is derived from these independent rows.';

create index life_goals_user_idx on public.life_goals(user_id);
create index monthly_outcomes_user_idx on public.monthly_outcomes(user_id);
create index weekly_focuses_user_idx on public.weekly_focuses(user_id);
create index tasks_user_idx on public.tasks(user_id);
create index captures_user_idx on public.captures(user_id);
create index habit_definitions_user_idx on public.habit_definitions(user_id);
create index habit_completions_user_idx on public.habit_completions(user_id);
create index execution_records_user_idx on public.execution_records(user_id);
create index atlas_memory_items_user_idx on public.atlas_memory_items(user_id);

do $lifeos_rls$
declare
  table_name text;
  user_tables constant text[] := array[
    'captures',
    'tasks',
    'life_goals',
    'monthly_outcomes',
    'weekly_focuses',
    'habit_definitions',
    'habit_completions',
    'execution_records',
    'profiles',
    'atlas_memory_items',
    'notification_ui_state'
  ];
begin
  foreach table_name in array user_tables loop
    execute format('alter table public.%I enable row level security', table_name);
    execute format('alter table public.%I force row level security', table_name);
    execute format('revoke all on table public.%I from anon, authenticated', table_name);

    if table_name = 'execution_records' then
      execute format(
        'grant select, insert, delete on table public.%I to authenticated',
        table_name
      );
    else
      execute format(
        'grant select, insert, update, delete on table public.%I to authenticated',
        table_name
      );
    end if;

    execute format(
      'create policy %I on public.%I for select to authenticated using ((select auth.uid()) is not null and (select auth.uid()) = user_id)',
      table_name || '_select_own',
      table_name
    );
    execute format(
      'create policy %I on public.%I for insert to authenticated with check ((select auth.uid()) is not null and (select auth.uid()) = user_id)',
      table_name || '_insert_own',
      table_name
    );
    execute format(
      'create policy %I on public.%I for delete to authenticated using ((select auth.uid()) is not null and (select auth.uid()) = user_id)',
      table_name || '_delete_own',
      table_name
    );

    if table_name <> 'execution_records' then
      execute format(
        'create policy %I on public.%I for update to authenticated using ((select auth.uid()) is not null and (select auth.uid()) = user_id) with check ((select auth.uid()) is not null and (select auth.uid()) = user_id)',
        table_name || '_update_own',
        table_name
      );
    end if;
  end loop;
end
$lifeos_rls$;

commit;
