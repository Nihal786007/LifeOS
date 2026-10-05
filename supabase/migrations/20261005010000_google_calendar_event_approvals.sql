-- Server-only exact approvals. Not part of PowerSync or browser CRUD.
alter table public.google_calendar_connections add column authorization_id uuid not null default gen_random_uuid();
create table public.google_calendar_event_approvals (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  authorization_id uuid not null,
  payload_hash text not null check (payload_hash ~ '^[0-9a-f]{64}$'),
  calendar_id text not null,
  event_id text not null,
  audit_row_id uuid not null unique,
  execution_id text not null,
  expires_at timestamptz not null,
  state text not null default 'prepared' check (state in ('prepared','executing','completed')),
  lease_until timestamptz,
  event_receipt jsonb,
  unique(user_id,event_id)
);
alter table public.google_calendar_event_approvals enable row level security;
alter table public.google_calendar_event_approvals force row level security;
revoke all on public.google_calendar_event_approvals from public, anon, authenticated;
grant select,insert,update on public.google_calendar_event_approvals to service_role;
-- Only the trusted server finalizer writes the audit; no execution updates/deletes.
grant select,insert on public.execution_records to service_role;

create function public.claim_google_calendar_creation(p_user_id uuid, p_id uuid, p_hash text, p_authorization_id uuid)
returns text language plpgsql security invoker set search_path = '' as $$
declare r public.google_calendar_event_approvals;
begin
  select * into r from public.google_calendar_event_approvals where id=p_id and user_id=p_user_id for update;
  if not found or r.payload_hash<>p_hash or r.authorization_id<>p_authorization_id then raise exception 'approval_invalid'; end if;
  if r.state='completed' then return 'completed'; end if;
  if r.state='prepared' and r.expires_at<now() then raise exception 'approval_expired'; end if;
  if r.state='executing' and r.lease_until>now() then return 'pending'; end if;
  update public.google_calendar_event_approvals set state='executing',lease_until=now()+interval '60 seconds' where id=p_id and user_id=p_user_id;
  return 'claimed';
end $$;

-- Receipt and canonical zero-XP audit commit together; retries cannot replay XP/audit.
create function public.finish_google_calendar_creation(p_user_id uuid,p_id uuid,p_event jsonb)
returns uuid language plpgsql security invoker set search_path = '' as $$
declare r public.google_calendar_event_approvals; next_order bigint;
begin
  select * into r from public.google_calendar_event_approvals where id=p_id and user_id=p_user_id for update;
  if not found then raise exception 'approval_invalid'; end if;
  if r.state='completed' then return r.audit_row_id; end if;
  if r.state<>'executing' or (p_event->>'externalId') is distinct from r.event_id or (p_event->>'calendarId') is distinct from r.calendar_id then raise exception 'receipt_invalid'; end if;
  perform pg_advisory_xact_lock(hashtextextended(p_user_id::text,0));
  select coalesce(min(sort_order),0)-1 into next_order from public.execution_records where user_id=p_user_id;
  insert into public.execution_records(id,user_id,execution_id,entity_id,type,title,description,created_at,xp_awarded,metadata_json,sort_order)
  values(r.audit_row_id,p_user_id,r.execution_id,r.execution_id,'system','Google Calendar event created','calendar.events.create',to_char(now() at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),0,
    jsonb_build_object('source','connector_ui','connectorId','google-calendar','capability','calendar.events.create','externalEventId',r.event_id,'calendarId',r.calendar_id,'approvalId',r.id,'approvalRequired',true,'resultStatus','executed')::text,next_order);
  update public.google_calendar_event_approvals set state='completed',event_receipt=p_event,lease_until=null where id=p_id and user_id=p_user_id;
  return r.audit_row_id;
end $$;
revoke all on function public.claim_google_calendar_creation(uuid,uuid,text,uuid) from public,anon,authenticated;
revoke all on function public.finish_google_calendar_creation(uuid,uuid,jsonb) from public,anon,authenticated;
grant execute on function public.claim_google_calendar_creation(uuid,uuid,text,uuid) to service_role;
grant execute on function public.finish_google_calendar_creation(uuid,uuid,jsonb) to service_role;
