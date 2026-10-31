# Google Calendar disconnect correctness

## Status and scope

Security Remediation 03 is implemented and verified locally, not deployed by this
checkpoint. Production migration, maintenance, history repair, Google operations,
data export and restoration each require separate authorization. Source publication
is not deployment or evidence of production recovery readiness.

This release preserves existing OAuth Authorization Code + PKCE, exact redirect
allowlisting, server-side encrypted credentials, account-bound rendering and the
existing Google scopes. It introduces no canonical-model, PowerSync, ATLAS
permission, approval-journal or XP changes.

## Truthful outcomes

Google revocation uses one bounded POST to the documented revoke endpoint with
the token in the form body, not the URL. Redirects are rejected; the deadline is
eight seconds. HTTP 200 is confirmed; other 4xx responses are rejected; transport
errors, timeouts, redirects and other statuses are unknown. Vendor response bodies
are not inspected or returned. A rejection does not prove a specific past grant
state. There is no automatic retry.

Google revocation can affect a combined authorization across scopes/clients in
the API project and can take time to apply. Never promise instant invalidation,
Calendar-only grant removal, or deletion of Google events.

`localAccessRemoved` and `googleRevocation` describe independent facts. Strict
parsing accepts only the reviewed fields and fixed reason categories. Settings
provides truthful feedback and the official
[Google connections recovery page](https://myaccount.google.com/connections).

## Retire first, then revoke

1. Verify the caller using Supabase `auth.getUser(token)`; derive the owner on
   the server. The command parser rejects browser-supplied owner fields.
2. Atomically retire that owner's credential row and pending PKCE state, advance
   the lifecycle generation and claim the revocation attempt. Return encrypted
   credentials only to the trusted backend.
3. Decrypt in request memory and attempt revocation once. Never refresh solely
   to disconnect. Local retirement remains durable when Google or decryption fails.
4. Save the allowlisted outcome only for the same operation generation. If saving
   fails, preserve known local/Google facts but do not claim final saved status.
5. Retirement failure makes no Google call and cannot claim local removal.
   Browser transport failure proves neither remote success nor failure; cached
   events and permissions become unusable pending status/recovery checks.

Duplicate requests cannot release a credential twice. An abandoned attempt retains
no usable database credential. An explicit later request after sixty seconds can
settle it as unknown without another token submission. Reconnect is blocked while
the attempt is active; consent/reconnection is never automatically promised.

## Current permanent RPC boundary

The current migration installs seven server-only SECURITY DEFINER RPCs, with
empty search paths, qualified application relations, reviewed ownership and exact
signatures. It permanently removes raw connection, PKCE and lifecycle privileges
from PUBLIC, anon, authenticated and service_role. Five mutators serialize with
the per-owner transaction advisory lock; two reads use consistent snapshots.

This supersedes earlier four-invoker-RPC and temporary raw-grant proposals.
See [the complete inventory and security review](google-calendar-rpc-security-boundary.md).

- Refresh and label changes update only an exact active authorization; no upsert.
- OAuth completion requires unexpired same-owner/hash/generation state and consumes
  it transactionally once. Pre-migration null-generation consent must restart.
- Retirement removes credentials and pending consent atomically.
- Stale finalizers and revoked-error cleanup cannot remove a newer authorization.
- Read/status and event dispatch recheck authorization after asynchronous work.
- Client epochs discard stale responses; duplicate disconnect clicks are locked.
  Identity-keyed teardown prevents late previous-account updates.
- A request already dispatched externally cannot be recalled or transacted with
  PostgreSQL. Confirmed exact-approved creates retain their truthful idempotent
  receipt and zero-XP audit. Disconnect never deletes approval/history evidence.

The trusted service identity can invoke owner-parameterized RPCs; this boundary
does not contain compromise of that server credential or authenticate end-user
JWTs inside a service-role database session.

## Migration and operational safety

The proposed migration is
`supabase/migrations/20261017000000_google_calendar_disconnect_fence.sql`.
Existing authorization IDs are backfilled without rewriting ciphertext/scopes.
The new lifecycle table is forced-RLS and has no browser policy. Unexpected
owners, signatures, CREATE capabilities, inherited/column rights or browser
EXECUTE cause atomic failure rather than silent privilege expansion.

The migration is one-time, not blindly idempotent: raw repetition fails closed.
Verify actual schema and ledger before an approved application or retry. Do not
blindly replay historical SQL or mark unapplied effects complete.

Follow [the maintenance runbook](google-calendar-maintenance-rollout.md):
establish maintenance and permanent raw denial, account for pre-boundary work,
apply the reviewed migration once, pause compatible new-work/read RPCs, deploy
compatible code, inspect metadata, then reopen only reviewed RPC/approval rights.
Never restore raw token privileges or an unsafe legacy writer. Retain finalizers.
Unknown external outcomes require authorized reconciliation, not automatic replay.

## Verification evidence and limitations

Local verification used PostgreSQL 17.11 and exact repository prerequisite SQL,
synthetic users/ciphertext/receipts, independent sessions and observed advisory-lock
barriers. The original PKCE SELECT FOR UPDATE required an intentionally absent
UPDATE grant; removing only that unnecessary row lock fixed reconnect while the
lifecycle/advisory serialization remained. Early failed runs and the negative
control showing resurrection after raw-grant restoration remain private evidence,
not passing security claims.

Final integrated SQL/concurrency checks passed 53/53. Adding eleven historical
synthetic archive/restore checks and five standard CMS/custody checks produced
69/69. Fresh publication verification on October 20, 2026 also passed 69/69,
Calendar/security 129/129 and the full deterministic suite 840/840.
Native Deno checks passed for both entrypoints and ten inert maintenance cases;
test typecheck, build, focused lint and scans passed. The existing large-bundle
warning remains.

The read-only runtime recovery proof established identity/readiness/PowerSync
ownership, matching local/cloud baselines, zero pending uploads, no foreign-owner
rows and two-reload consistency without canonical mutation. A missing development
server listener, not an established Calendar regression, was resolved by restarting
the existing development server. Light/Dark/System and 390/768/1366-pixel layouts
were checked; temporary diagnostics were removed. Google connection state remained
unverified: no live revocation or disconnect outcome was induced.

Detailed account baselines, real record IDs, machine paths and raw local reports
are intentionally private and excluded from public Git. The isolated PostgreSQL
runner and its three machine-bound recovery helpers are not distributed in this
release; the 69 checks are retained operator evidence, not a fresh-clone command.
Public mock tests do not replace that independent SQL verification or hosted proof.

SQL fixtures do not model live Auth/PostgREST/Edge routing, full Supabase role
topology, PowerSync, Google validity/consent or actual production drift. Previously
observed hosted PostgreSQL 17.6 is a compatibility baseline, not evidence of
deployment. No production recovery artifact exists; rollout remains gated by
[protected recovery readiness](google-calendar-protected-recovery.md).

## Official references

- https://developers.google.com/identity/protocols/oauth2/web-server#tokenrevoke
- https://www.postgresql.org/docs/17/sql-createfunction.html
- https://supabase.com/docs/guides/functions/function-configuration
