-- Explicit Data API privileges for the server-only Calendar credential boundary.
-- RLS and the denial of browser-role access remain unchanged.
begin;

grant select, insert, update, delete on table public.google_calendar_connections to service_role;
grant select, insert, delete on table public.google_calendar_oauth_states to service_role;

commit;
