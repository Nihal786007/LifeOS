# Google Calendar permanent RPC boundary

Local-only Security Remediation 03 integration. Starting HEAD:
`eadbcd9f0719e2ebc2dc89895d9b8e5a158db248`. No deployment, production SQL,
maintenance activation, migration-history repair, Google request or Git commit.

## Complete access inventory

All callers below are in the normal server `index.ts`; shared `handler.ts`
authenticates with `database.auth.getUser(token)` before dispatch. Its exact-key
command parser rejects browser-supplied owner fields. The service-role client is
server-only, with session persistence and automatic refresh disabled. RPC owner
arguments come exclusively from the verified identity; service-role callers are
trusted backend principals, not independently authenticated database end users.

| Flow / indirect caller | Database access after integration | Authority / required privilege |
|---|---|---|
| OAuth begin | begin_google_calendar_oauth | EXECUTE; encrypted verifier, owner, hash, exact redirect, expiry; per-user lock |
| Callback validation | read_google_calendar_oauth_state | EXECUTE; exact owner/hash, unexpired current generation; encrypted verifier only |
| Callback completion / reconnect | saveConnection → store_google_calendar_connection | EXECUTE; consumes matching state once and creates fresh authorization atomically |
| Status | validTokens → connectionRow → read_google_calendar_connection | EXECUTE; active matching generation and encrypted fields only |
| Disconnected status | disconnectedStatus → read_google_calendar_connection | EXECUTE; same minimal snapshot, phase/revocation only used in browser response |
| Calendar reads | validTokens, then assertCurrentConnection → connectionRow | Same read EXECUTE before use and after asynchronous Google response |
| Refresh | validTokens → Google mock/live transport → saveConnection | store EXECUTE; UPDATE only exact active authorization; cannot insert |
| Account-label update | status → saveConnection | Same store EXECUTE and generation guard; no alternate write path |
| Google authorization failure | status/read catch → removeConnection → forget_revoked_google_calendar_connection | EXECUTE; exact owner/authorization, per-user lock; advance generation, unknown revocation |
| Disconnect claim | disconnectGoogleCalendar → retire_google_calendar_connection | EXECUTE; lock, remove credentials/pending states before external revocation; return encrypted fields once |
| Disconnect outcome / retries | disconnectGoogleCalendar → finish_google_calendar_disconnect | EXECUTE; exact operation generation and disconnecting phase; no resurrection |
| Prepare approved event | validTokens/read calendars/assertWritableCalendar; INSERT approvals; assertCurrentConnection | Credential RPCs plus existing approval INSERT; exact fingerprint and authorization bound to owner |
| Create / idempotency claim | validTokens; claim_google_calendar_creation | Credential read/store EXECUTE plus existing claim EXECUTE; exact owner/approval/hash/authorization |
| Receipt read / retry | executeCalendarCreation.read → SELECT approvals | Existing SELECT, filtered by verified user and approval ID; no token fields |
| External write dispatch | executeCalendarCreation.insert → connectionRow; insertApprovedGoogleEvent → assertCurrentConnection | Current-generation read EXECUTE before dispatch; existing explicit exact approval required |
| Receipt/audit finalization | executeCalendarCreation.finish → finish_google_calendar_creation | Existing finalizer EXECUTE plus journal SELECT/UPDATE and execution INSERT; preserve truthful confirmed receipt/zero XP |
| Browser/provider/ATLAS | No credential tables or RPC access | Existing client invokes authenticated Edge only; no direct DB token access, new scope or action authority |
| Maintenance entrypoint | No database/auth-refresh/Google access | JWT gateway remains enabled; inert 503 before parsing commands, no automatic retry |

`googleApi.ts` handles only bounded Google transport. `vault.ts` encrypts/decrypts
in server memory. `disconnect.ts` orchestrates retirement and outcome recording.
`createEvent.ts` orchestrates exact approval/receipt semantics. None adds another
credential database path. Journal INSERT/SELECT and the pre-existing claim and
finalizer are deliberately NOT replaced or made SECURITY DEFINER here.

## Seven privileged functions and independent review

All seven are created in one transaction by the required `postgres` BYPASSRLS
owner; the migration refuses another executing owner, unexpected credential-table
owners, conflicting names/overloads or caller ownership/CREATE capability. No
role is created, granted BYPASSRLS or made a member of postgres by this migration.
Existing postgres privileges are powerful; a dedicated narrower owner would need
a separate reviewed production-role design, not invented prerequisites here.

Every function has SECURITY DEFINER and `search_path=''`. All table/type
references are explicitly `public` qualified. Built-ins resolve through implicit
`pg_catalog` ahead of other schemas; there is no dynamic SQL, identifier input,
temporary relation reference or caller-controlled search path. Encrypted results
are internal server data, not browser responses. Errors use fixed categories;
Edge error handlers discard database details.

| RPC signature (public schema) | Why elevated context is necessary | Guard / minimal result |
|---|---|---|
| begin_google_calendar_oauth(uuid,text,text,text,timestamptz) | Raw PKCE INSERT/DELETE and lifecycle access denied to service | Per-user advisory lock; reject disconnecting; replace same-owner pending state; void |
| store_google_calendar_connection(uuid,text,text,timestamptz,text,text[],uuid,text) | Atomic credential/state/lifecycle write | Matching owner/hash/generation/expiry; one-time consume; new callback UUID; refresh UPDATE-only exact authorization; boolean |
| retire_google_calendar_connection(uuid) | Atomic retirement and lifecycle transition | Same lock; credential removal before external revocation; duplicate/abandoned paths cannot re-release token; minimal operation JSON, encrypted credentials only on first retirement |
| finish_google_calendar_disconnect(uuid,uuid,text) | Record bounded outcome without raw lifecycle UPDATE | Same lock; expected operation/phase; only confirmed/rejected/unknown; boolean |
| read_google_calendar_connection(uuid) | Server needs encrypted token/status but cannot SELECT raw table | Exact owner, active phase and generation join; selected connection fields and phase/revocation only; null connection on inconsistency |
| read_google_calendar_oauth_state(uuid,text) | Server needs encrypted PKCE verifier without raw SELECT | Exact owner/hash, unexpired current generation, not disconnecting; three selected fields or null; no consumption |
| forget_revoked_google_calendar_connection(uuid,uuid) | Retire an externally rejected authorization without raw DELETE | Same lock; exact current owner/generation; stale requests return false; delete pending state and advance generation; unknown (not confirmed) revocation |

Five mutators use the existing per-user transaction advisory lock namespace
17003. Two STABLE reads return a consistent statement snapshot; a previously
running reader may already hold a token. Database fencing does not recall tokens
already read or external requests already dispatched. Existing generation checks
reject late persistence, callbacks and stale outcomes, not claim remote cancellation.

### Exact permission changes

- REVOKE ALL on each of the seven exact function signatures FROM
  PUBLIC, anon, authenticated, service_role, then GRANT only EXECUTE TO service_role.
- REVOKE ALL on `public.google_calendar_connections`,
  `public.google_calendar_oauth_states`, `public.google_calendar_connection_lifecycle`
  FROM PUBLIC, anon, authenticated, service_role. This includes production default
  TRUNCATE/REFERENCES/TRIGGER/MAINTAIN extras. No later raw grant is allowed.
- Force RLS on the new lifecycle table; keep existing connection/PKCE RLS.
- End-of-transaction assertions check effective table AND column privileges,
  including inherited access, and effective function EXECUTE for all three roles.
  Drift aborts/rolls back rather than broadly revoking another role or defaults.
- Existing approval/claim/finalizer/history privileges and all unrelated objects
  remain unchanged. No RLS policy, global defaults or security journal mutation.

The service role's BYPASSRLS does not bypass table/function ACL denial. A browser
cannot invoke these functions even by inventing a victim UUID. Conversely, a
compromised service credential is a trusted-backend compromise: these RPCs do not
pretend to enforce browser JWT identity inside a service-role database session.

## Verification and fidelity

Real isolated PostgreSQL 17.11 uses loopback only, SCRAM, synthetic users,
synthetic ciphertext, and exact repository prerequisite/migration SQL executed
as a nonsuperuser BYPASSRLS postgres owner. Production was observed as 17.6.
Production-style default extra grants and service-role ownership/inheritance are
modeled. No production export or credential is used.

Independent psql backends use observed `pg_locks` barriers, bounded statement/lock
timeouts and actual final row checks. Legacy direct SELECT/INSERT/UPSERT/UPDATE/
DELETE, PKCE operations and lifecycle writes must fail with SQLSTATE 42501 both
during pause and after reopening. Stale valid RPC operations return false;
rollback failures use 22012, conflicting maintenance locks use 55P03, missing
prerequisites use 42703, and deliberate security preflight/repeat rejection uses
P0001. Checks cover callback replay/expiry/wrong owner, concurrent callbacks,
refresh/retire ordering, duplicate disconnect, reconnect/finalize and cleanup
races, stale generation reads, rollback, and unchanged retained journal/history.
Extra databases test overload/owner, inherited/column grants, inherited EXECUTE
and upgrade-under-pause cases. PostgreSQL removes explicit column grants with
REVOKE ALL; the column-only test verifies zero effective rights and an actual
42501 SELECT denial. Any remaining inherited access causes atomic rejection.
Evidence is retained outside the repo;
test servers are stopped and ports checked afterward.

`tests/connectors/googleCalendarRpc.test.ts` executes the actual Edge `index.ts`
with mocked Supabase and Google transport. Protected raw `.from()` calls fail the
test. It covers authenticated owner derivation, rejected owner injection/JWT,
status/read, encrypted PKCE, replay, conditional refresh/label changes, stale
refresh, conditional revoked cleanup, disconnect/reconnect, exact-approved create
and single-dispatch receipt retry. Responses are checked against synthetic secret
markers. Existing Calendar and maintenance regressions remain enabled.

Not modeled: live Supabase Auth/PostgREST/Edge gateway, complete administrative
role topology, platform routing, PowerSync, Google token validity/revocation or
actual consent. The Edge mock and SQL harness are complementary tests, not a live
HTTP-to-PostgREST integration proof. No real provider request was made.

## Deployment ordering and failure policy

Follow `google-calendar-maintenance-rollout.md` only after separate authorization.
Restore read-only metadata access; reverify actual project/schema/owners/grants/
defaults/signatures and migration history. Reconcile only independently verified
historical effects with separate approval; inspect dry-run, never replay blind SQL.

1. Approved maintenance entrypoint rejects new routed work. Establish bounded
   table-lock/raw-denial/new-approval/claim barrier transactionally. Abort on locks.
2. Identify pre-boundary work; preserve finalization. An unknown Google outcome
   remains unknown. No quiet-log or worker-lifetime assumption replaces the fence.
3. Under pause, apply the actual migration once. It atomically backfills existing
   authorization generations, invalidates old pending states, installs RPCs and
   removes raw authority. Any missing prerequisite/privilege drift rolls it back.
4. Keep maintenance deployed; verify metadata and pause the six new-work/read
   RPC EXECUTEs before deploying compatible normal code. Retain disconnect outcome
   and event finalizers. Old handlers cannot use new RPCs and raw access never
   reopens. Mixed-routing normal requests fail closed while RPCs are paused;
   only requests routed to the maintenance handler promise its exact 503 shape.
5. Verify compatible artifact, then reopen only the seven RPC EXECUTEs and
   existing new-approval INSERT/claim EXECUTE. NEVER restore raw token/state grants.
6. Separate authorized synthetic/live checks follow; no automatic disconnect.

On migration failure inspect rollback/history; do not blindly rerun. On rollout
failure retain permanent denial and maintenance, forward-fix. Never roll back to
legacy credential grants, restore retired tokens or delete approval evidence.
Raw repeat migration is intentionally rejected, not silently idempotent. No
global deployment drain guarantee or atomic schema/function rollout is assumed.

## Final local evidence

Final integrated run: **53/53 PostgreSQL tests**, including independent-session
approval claims and real claim/finalizer idempotency under the permanent fence.
Private reports fingerprint the exact repository migration used. PostgreSQL 17.11
was loopback-only; teardown reports stopped=true and port closed. Independent
inspection found no remaining test server processes or listeners.

The PostgreSQL runner and its three machine-bound recovery helpers are retained
locally and deliberately excluded from public Git. They depend on a private
synthetic setup, not production secrets, but are not a complete fresh-clone test
environment. Do not advertise these results as publicly reproducible commands.
Public Edge mock tests and SQL source assertions remain available; neither is
a substitute for independent database execution or live hosted verification.

Final Calendar/security: **129/129**. Full deterministic suite: **840/840**,
zero skipped. Test-project typecheck, production build and focused lint pass.
The production build retains the existing large-chunk warning. Native Deno
verification was subsequently completed on October 19 (see below); it is not a
deployed hosted-runtime certification. The actual entrypoint also runs in mock
transport tests. The initial 18-file evidence predates the shared-type correction.
Credential-pattern
scans found zero matches in checkpoint sources and the client bundle; the bundle
also contains none of the scanned server-secret, ciphertext or temporary
diagnostic/maintenance markers. There is no temporary application diagnostic.
Nothing is staged; the original HEAD remains unchanged.

Historical 35/35 temporary-barrier and 45/45 prototype reports remain preserved;
their deliberately vulnerable raw-grant restoration control is not asserted as a
passing security property of the new migration. The integrated migration must
reject old workers after reopening, independently of Edge routing timing.

## Native correction and refreshed evidence — October 19, 2026

Only the two existing type imports in `src/atlas/actions/types.ts` now specify
`../../shared/types.ts` and `../../shared/habits.ts`. App, Node and test configs
already allow importing TypeScript extensions. They remain `import type`, so the
change introduces no emitted runtime dependency, import cycle or server import
into the browser. No checking option, runtime behavior or package was changed.

Official npm Deno 2.9.6 / TypeScript 6.0.3 checks both actual normal and maintenance
entrypoints with `--no-config --no-lock --node-modules-dir=none`: both pass.
The pure maintenance handler passes 10/10 native Request/Response cases with
`--deny-net --deny-env`, without a listener. Deno resolved the existing floating
Supabase SDK major to 2.118.0; a future sealed deployment must record its complete
dependency graph. No equivalence to the hosted runtime is inferred.

Fresh actual-migration PostgreSQL 17.11 evidence: 53/53 independent-session,
permission and rollback cases in retained private synthetic reports. The loopback
port closed and server stopped. The latest October 20 publication verification
also passed 69/69 including historical archive and standard CMS recovery checks,
Calendar 129/129 and deterministic 840/840. Test typecheck, production build and
focused lint pass. SQL source is unchanged. Recovery proof remains synthetic;
no physical second-device or production export/recovery is certified.

The previously inspected hosted PostgreSQL 17.6 catalog remains a compatibility
baseline, not a claim the new seven RPCs are installed. Earlier metadata-only
checks verified a JWT-enabled deployed function; no function was invoked.
Detailed project/version/health/backup-plan observations remain private and must
be reverified before rollout. No production recovery artifact exists; reader,
storage encryption and independent key-custody gates remain unresolved.

The corrected runbook separates A metadata during pause, B isolated functional
tests, and C explicitly authorized live tests after reopening. Paused RPCs are
not invoked for a functional pass. No production write, export, migration,
deployment, Google operation, staging or commit occurred.
