-- Server-only lifecycle fence; does not touch Google events or approval/audit journals.
-- Apply before deploying the dependent Edge Function. No browser privileges.
begin;

-- Fail rather than install privileged functions under an unexpected owner or
-- alongside an unreviewed overload. No role creation or global ACL changes.
do $$
begin
  if current_user <> 'postgres' or not exists (
    select 1 from pg_catalog.pg_roles where rolname=current_user and rolbypassrls
  ) then raise exception 'calendar_rpc_owner_prerequisite'; end if;
  if exists (
    select 1 from pg_catalog.pg_roles r where r.rolname in ('anon','authenticated','service_role')
      and (r.rolsuper or pg_catalog.pg_has_role(r.oid,'postgres','MEMBER')
        or pg_catalog.has_schema_privilege(r.oid,'public','CREATE'))
  ) then raise exception 'calendar_rpc_caller_prerequisite'; end if;
  if exists (
    select 1 from pg_catalog.pg_proc p where p.pronamespace='public'::regnamespace
      and p.proname in ('begin_google_calendar_oauth','store_google_calendar_connection',
        'retire_google_calendar_connection','finish_google_calendar_disconnect',
        'read_google_calendar_connection','read_google_calendar_oauth_state',
        'forget_revoked_google_calendar_connection')
  ) then raise exception 'calendar_rpc_signature_conflict'; end if;
  if exists (
    select 1 from pg_catalog.pg_class c where c.oid in (
      'public.google_calendar_connections'::regclass,'public.google_calendar_oauth_states'::regclass)
      and pg_catalog.pg_get_userbyid(c.relowner)<>'postgres'
  ) then raise exception 'calendar_table_owner_prerequisite'; end if;
end $$;

create table public.google_calendar_connection_lifecycle (
  user_id uuid primary key references auth.users(id) on delete cascade,
  generation uuid not null default gen_random_uuid(),
  phase text not null check (phase in ('active','disconnecting','disconnected')),
  revocation text not null default 'not_attempted' check (revocation in ('confirmed','rejected','unknown','not_attempted')),
  started_at timestamptz not null default now()
);
alter table public.google_calendar_connection_lifecycle enable row level security;
alter table public.google_calendar_connection_lifecycle force row level security;
revoke all on public.google_calendar_connection_lifecycle from public, anon, authenticated, service_role;
insert into public.google_calendar_connection_lifecycle(user_id,generation,phase)
  select user_id,authorization_id,'active' from public.google_calendar_connections;
alter table public.google_calendar_oauth_states add column generation uuid;
-- Existing pending consent is intentionally invalidated, not existing connections.
-- A null generation cannot pass the new completion guard; users can restart consent.

create function public.begin_google_calendar_oauth(p_user_id uuid,p_hash text,p_verifier text,p_redirect text,p_expires timestamptz)
returns void language plpgsql security definer set search_path='' as $$
declare r public.google_calendar_connection_lifecycle;
begin
  perform pg_advisory_xact_lock(hashtextextended(p_user_id::text,17003));
  insert into public.google_calendar_connection_lifecycle(user_id,phase) values(p_user_id,'disconnected') on conflict do nothing;
  select * into r from public.google_calendar_connection_lifecycle where user_id=p_user_id for update;
  if r.phase='disconnecting' then raise exception 'disconnect_in_progress'; end if;
  delete from public.google_calendar_oauth_states where user_id=p_user_id;
  insert into public.google_calendar_oauth_states(state_hash,user_id,verifier_ciphertext,redirect_uri,expires_at,generation)
    values(p_hash,p_user_id,p_verifier,p_redirect,p_expires,r.generation);
end $$;

create function public.store_google_calendar_connection(p_user_id uuid,p_access text,p_refresh text,p_expires timestamptz,p_label text,p_scopes text[],p_authorization_id uuid,p_state_hash text)
returns boolean language plpgsql security definer set search_path='' as $$
declare r public.google_calendar_connection_lifecycle; s public.google_calendar_oauth_states; next_id uuid;
begin
  perform pg_advisory_xact_lock(hashtextextended(p_user_id::text,17003));
  select * into r from public.google_calendar_connection_lifecycle where user_id=p_user_id for update;
  if not found or r.phase='disconnecting' then return false; end if;
  if p_state_hash is not null then
    select * into s from public.google_calendar_oauth_states where state_hash=p_state_hash and user_id=p_user_id;
    if not found or s.generation is distinct from r.generation or s.expires_at<=now() then return false; end if;
    next_id:=gen_random_uuid();
    delete from public.google_calendar_oauth_states where user_id=p_user_id;
    insert into public.google_calendar_connections(user_id,authorization_id,access_token_ciphertext,refresh_token_ciphertext,token_expires_at,account_label,granted_scopes)
      values(p_user_id,next_id,p_access,p_refresh,p_expires,p_label,p_scopes)
      on conflict(user_id) do update set authorization_id=excluded.authorization_id,access_token_ciphertext=excluded.access_token_ciphertext,
        refresh_token_ciphertext=excluded.refresh_token_ciphertext,token_expires_at=excluded.token_expires_at,account_label=excluded.account_label,granted_scopes=excluded.granted_scopes,updated_at=now();
    update public.google_calendar_connection_lifecycle set generation=next_id,phase='active',revocation='not_attempted',started_at=now() where user_id=p_user_id;
    return true;
  end if;
  -- Refresh/label updates may update only the exact still-active authorization.
  if r.phase<>'active' or r.generation is distinct from p_authorization_id then return false; end if;
  update public.google_calendar_connections set access_token_ciphertext=p_access,refresh_token_ciphertext=p_refresh,
    token_expires_at=p_expires,account_label=p_label,granted_scopes=p_scopes,updated_at=now()
    where user_id=p_user_id and authorization_id=p_authorization_id;
  return found;
end $$;

create function public.retire_google_calendar_connection(p_user_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare r public.google_calendar_connection_lifecycle; c public.google_calendar_connections; operation_id uuid;
begin
  perform pg_advisory_xact_lock(hashtextextended(p_user_id::text,17003));
  insert into public.google_calendar_connection_lifecycle(user_id,phase) values(p_user_id,'disconnected') on conflict do nothing;
  select * into r from public.google_calendar_connection_lifecycle where user_id=p_user_id for update;
  if r.phase='disconnecting' then
    -- A crashed worker cannot retain usable credentials. A later explicit retry
    -- can settle an abandoned attempt as UNKNOWN, never re-send its token.
    if r.started_at < now()-interval '60 seconds' then
      update public.google_calendar_connection_lifecycle set phase='disconnected',revocation='unknown' where user_id=p_user_id;
      return jsonb_build_object('operationId',r.generation,'kind','settled','revocation','unknown');
    end if;
    return jsonb_build_object('operationId',r.generation,'kind','in_progress','revocation','unknown');
  end if;
  select * into c from public.google_calendar_connections where user_id=p_user_id for update;
  if not found then
    delete from public.google_calendar_oauth_states where user_id=p_user_id;
    operation_id:=gen_random_uuid();
    update public.google_calendar_connection_lifecycle set generation=operation_id,phase='disconnected' where user_id=p_user_id;
    return jsonb_build_object('operationId',operation_id,'kind','no_connection','revocation',r.revocation);
  end if;
  operation_id:=gen_random_uuid();
  delete from public.google_calendar_connections where user_id=p_user_id and authorization_id=c.authorization_id;
  delete from public.google_calendar_oauth_states where user_id=p_user_id;
  update public.google_calendar_connection_lifecycle set generation=operation_id,phase='disconnecting',revocation='unknown',started_at=now() where user_id=p_user_id;
  -- Encrypted values returned only to the service-role caller, never to a browser.
  return jsonb_build_object('operationId',operation_id,'kind','retired','revocation','unknown',
    'accessCiphertext',c.access_token_ciphertext,'refreshCiphertext',c.refresh_token_ciphertext);
end $$;

create function public.finish_google_calendar_disconnect(p_user_id uuid,p_operation_id uuid,p_revocation text)
returns boolean language plpgsql security definer set search_path='' as $$
begin
  if p_revocation not in ('confirmed','rejected','unknown') then raise exception 'invalid_outcome'; end if;
  perform pg_advisory_xact_lock(hashtextextended(p_user_id::text,17003));
  update public.google_calendar_connection_lifecycle set phase='disconnected',revocation=p_revocation
    where user_id=p_user_id and generation=p_operation_id and phase='disconnecting';
  return found;
end $$;

-- Server-only encrypted read. Inconsistent/retired generations never yield tokens.
create function public.read_google_calendar_connection(p_user_id uuid)
returns jsonb language sql stable security definer set search_path='' as $$
  select jsonb_build_object(
    'connection',(select jsonb_build_object(
      'authorization_id',c.authorization_id,'access_token_ciphertext',c.access_token_ciphertext,
      'refresh_token_ciphertext',c.refresh_token_ciphertext,'token_expires_at',c.token_expires_at,
      'account_label',c.account_label,'granted_scopes',c.granted_scopes)
      from public.google_calendar_connections c join public.google_calendar_connection_lifecycle l
        on l.user_id=c.user_id and l.generation=c.authorization_id and l.phase='active'
      where c.user_id=p_user_id),
    'lifecycle',(select jsonb_build_object('phase',l.phase,'revocation',l.revocation)
      from public.google_calendar_connection_lifecycle l where l.user_id=p_user_id));
$$;

-- Read only; final consumption is serialized with connection creation in store.
create function public.read_google_calendar_oauth_state(p_user_id uuid,p_state_hash text)
returns jsonb language sql stable security definer set search_path='' as $$
  select jsonb_build_object('verifier_ciphertext',s.verifier_ciphertext,
    'redirect_uri',s.redirect_uri,'expires_at',s.expires_at)
    from public.google_calendar_oauth_states s join public.google_calendar_connection_lifecycle l
      on l.user_id=s.user_id and l.generation=s.generation and l.phase<>'disconnecting'
    where s.user_id=p_user_id and s.state_hash=p_state_hash and s.expires_at>now();
$$;

-- Google rejection is not proof of global revocation. Retire only this still-
-- current authorization; a stale request cannot erase a newly reconnected one.
create function public.forget_revoked_google_calendar_connection(p_user_id uuid,p_authorization_id uuid)
returns boolean language plpgsql security definer set search_path='' as $$
declare r public.google_calendar_connection_lifecycle;
begin
  perform pg_advisory_xact_lock(hashtextextended(p_user_id::text,17003));
  select * into r from public.google_calendar_connection_lifecycle where user_id=p_user_id for update;
  if not found or r.phase<>'active' or r.generation is distinct from p_authorization_id then return false; end if;
  delete from public.google_calendar_connections where user_id=p_user_id and authorization_id=p_authorization_id;
  if not found then return false; end if;
  delete from public.google_calendar_oauth_states where user_id=p_user_id;
  update public.google_calendar_connection_lifecycle
    set generation=gen_random_uuid(),phase='disconnected',revocation='unknown',started_at=now()
    where user_id=p_user_id;
  return true;
end $$;

revoke all on function public.begin_google_calendar_oauth(uuid,text,text,text,timestamptz) from public,anon,authenticated,service_role;
revoke all on function public.store_google_calendar_connection(uuid,text,text,timestamptz,text,text[],uuid,text) from public,anon,authenticated,service_role;
revoke all on function public.retire_google_calendar_connection(uuid) from public,anon,authenticated,service_role;
revoke all on function public.finish_google_calendar_disconnect(uuid,uuid,text) from public,anon,authenticated,service_role;
revoke all on function public.read_google_calendar_connection(uuid) from public,anon,authenticated,service_role;
revoke all on function public.read_google_calendar_oauth_state(uuid,text) from public,anon,authenticated,service_role;
revoke all on function public.forget_revoked_google_calendar_connection(uuid,uuid) from public,anon,authenticated,service_role;
grant execute on function public.begin_google_calendar_oauth(uuid,text,text,text,timestamptz) to service_role;
grant execute on function public.store_google_calendar_connection(uuid,text,text,timestamptz,text,text[],uuid,text) to service_role;
grant execute on function public.retire_google_calendar_connection(uuid) to service_role;
grant execute on function public.finish_google_calendar_disconnect(uuid,uuid,text) to service_role;
grant execute on function public.read_google_calendar_connection(uuid) to service_role;
grant execute on function public.read_google_calendar_oauth_state(uuid,text) to service_role;
grant execute on function public.forget_revoked_google_calendar_connection(uuid,uuid) to service_role;

-- PERMANENT: reopening maintenance must NEVER restore these raw privileges.
revoke all on public.google_calendar_connections,public.google_calendar_oauth_states,
  public.google_calendar_connection_lifecycle from public,anon,authenticated,service_role;
-- Fail on inherited or column-level access instead of silently claiming safety.
do $$
begin
  if exists (
    select 1 from pg_catalog.pg_roles r cross join pg_catalog.pg_class c
    where r.rolname in ('anon','authenticated','service_role') and c.oid in (
      'public.google_calendar_connections'::regclass,'public.google_calendar_oauth_states'::regclass,
      'public.google_calendar_connection_lifecycle'::regclass)
      and (pg_catalog.has_table_privilege(r.oid,c.oid,'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER,MAINTAIN')
        or pg_catalog.has_any_column_privilege(r.oid,c.oid,'SELECT,INSERT,UPDATE,REFERENCES'))
  ) then raise exception 'calendar_raw_access_remains'; end if;
  if exists (
    select 1 from pg_catalog.pg_proc p cross join pg_catalog.pg_roles r
    where p.pronamespace='public'::regnamespace and p.proname in (
      'begin_google_calendar_oauth','store_google_calendar_connection',
      'retire_google_calendar_connection','finish_google_calendar_disconnect',
      'read_google_calendar_connection','read_google_calendar_oauth_state',
      'forget_revoked_google_calendar_connection') and r.rolname in ('anon','authenticated','service_role')
      and (pg_catalog.pg_get_userbyid(p.proowner)<>'postgres' or not p.prosecdef
        or p.proconfig is distinct from array['search_path=""']
        or pg_catalog.has_function_privilege(r.oid,p.oid,'EXECUTE')<>(r.rolname='service_role'))
  ) then raise exception 'calendar_rpc_access_prerequisite'; end if;
end $$;
commit;
