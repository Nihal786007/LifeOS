-- Google Calendar Connector V1: server-only OAuth credentials and short-lived PKCE state.
-- No Google event data is persisted and neither table is part of PowerSync.
begin;

create table public.google_calendar_connections (
  user_id uuid primary key references auth.users(id) on delete cascade,
  access_token_ciphertext text not null,
  refresh_token_ciphertext text,
  token_expires_at timestamptz not null,
  account_label text not null,
  granted_scopes text[] not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.google_calendar_oauth_states (
  state_hash text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  verifier_ciphertext text not null,
  redirect_uri text not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index google_calendar_oauth_states_user_idx on public.google_calendar_oauth_states(user_id);
alter table public.google_calendar_connections enable row level security;
alter table public.google_calendar_connections force row level security;
alter table public.google_calendar_oauth_states enable row level security;
alter table public.google_calendar_oauth_states force row level security;
revoke all on table public.google_calendar_connections from anon, authenticated;
revoke all on table public.google_calendar_oauth_states from anon, authenticated;

comment on table public.google_calendar_connections is
  'Encrypted server-only Google OAuth credentials. Never exposed through client RLS or PowerSync.';
comment on table public.google_calendar_oauth_states is
  'Short-lived single-use PKCE state for Google Calendar authorization.';

commit;
