# Calendar maintenance and legacy-worker safety

## Status

Local implementation and isolated verification only. No production deployment,
SQL, history repair, maintenance or Google operation is authorized by this runbook.
The permanent RPC boundary supersedes temporary-barrier designs that restored
raw credential grants. See [the RPC review](google-calendar-rpc-security-boundary.md).

## Maintenance artifact

`supabase/functions/google-calendar/maintenance.ts` is dependency-free. POST with
a bearer returns 503, `calendar_maintenance`, `operationStarted=false` and
`automaticRetry=false`, warning that earlier work may still be settling. It reads
no body, starts no database/Google/auth-refresh work and logs no inputs.
OPTIONS is inert 204; absent/malformed bearer is 401; other methods are 405.
Bearer presence is not JWT validation: the gateway must verify JWTs.

`maintenance-entry.ts` serves only that handler. The inactive
`supabase/calendar-maintenance.config.toml` explicitly sets `verify_jwt=true`.
Normal config is unchanged. Future authorized use requires a sealed isolated
deployment workspace selecting the reviewed maintenance profile and its import
graph. Deploy only the existing Calendar function, never all functions.

| Operation | Newly routed maintenance request | Earlier worker |
|---|---|---|
| Status/read/refresh | 503, no dependency access | May already hold a token |
| OAuth begin/callback | 503, no state or code exchange | Prior exchange may have reached Google |
| Disconnect | 503, no retirement/revocation | Dispatched revocation may have unknown outcome |
| Prepare/create/retry | 503, no claim, approval, event or audit | Already approved dispatched event still needs truthful finalization |
| Outcome finalization | No new finalization HTTP route | Retain existing receipt/audit and disconnect outcome finalizers |

A quiet log, closed tab, banner, successful deployment or worker timeout alone is
not proof of atomic routing/drain. An external request already dispatched cannot
be recalled. Do not automatically retry unknown outcomes.

## Permanent boundary and residual work

The transactional migration permanently revokes raw connection/PKCE/lifecycle
table access from PUBLIC, browser roles and service_role. BYPASSRLS does not bypass
ACL denial. Only the seven reviewed backend RPCs reopen, with owner/generation/
expiry checks, empty search paths and per-user locks. No caller-controlled SQL
identifiers or global default privilege changes are introduced.

Edge derives RPC ownership from verified authentication. Exact-approved creation,
receipt retry and zero-XP finalization keep their existing authority. No canonical
domain changes or new scopes are needed. Any worker starting after raw denial
cannot read/persist credentials through legacy SQL; finite pre-boundary tokens and
dispatched work still require bounded observation and authorized reconciliation.

Initial maintenance uses a bounded owner transaction with conflicting token/PKCE
table locks, raw denial and new approval INSERT/claim EXECUTE pause. Lock timeout
aborts rather than passing an active transaction. Retain event finalizer EXECUTE,
journal SELECT/UPDATE and execution INSERT for already-dispatched truthful results.

After the migration, pause these six new-work/read RPC EXECUTEs before deploying
compatible normal code: begin, store, retire, connection read, PKCE read and
conditional revoked cleanup. Retain disconnect outcome finalization. Raw rights
never return. Mixed-version requests fail closed; only requests routed to the
maintenance handler promise its exact 503 response shape.

## Migration reconciliation

Prior authorized metadata inspection observed prerequisite effects without matching
ledger entries. This is historical evidence, not a current production assertion.

| Version | Recorded state | Separately approved action |
|---|---|---|
| 20261005000000 | Permissions effects present, ledger absent; PKCE UPDATE deliberately absent | Reverify every effect before supported repair; no blind replay |
| 20261005010000 | Authorization/approval structures and functions present, ledger absent | Compare complete bodies, constraints, grants and signatures before repair |
| 20261017000000 | Lifecycle/generation/seven new RPC effects absent | Apply once only after all gates; never mark applied first |

Existence is not equivalence. No catalog identifies who applied unrecorded SQL.
The prerequisite scripts had no historical data backfill; their callable functions
can mutate audits, so do not invoke them for metadata inspection. Reconcile only
exact verified versions with separate approval, inspect dry-run and abort on
unexpected pending migrations. Never reset a database or blindly replay CREATE/
ALTER scripts because a ledger entry is missing.

## Conditional rollout sequence

A = metadata/static checks; B = isolated synthetic functional checks;
C = live operations with potential credential/provider effects. A never proves C.

| Step | Required evidence/action | Abort and recovery |
|---|---|---|
| 1. Identify | Verify exact project/branch and READ ONLY metadata transaction | Identity, permission or timeout mismatch: stop |
| 2. Compare | Catalog columns, constraints, owners, RLS, effective grants, function bodies/signatures, defaults and history (A) | Any drift: preserve evidence and review |
| 3. Seal | Complete compatible source/import/dependency graph; exact manifest, JWT configs, isolated SQL and mock tests (B) | Missing artifact/test: no rollout |
| 4. Reconcile | Separately approved exact history repair and before/after dry-run | Unexpected migration: stop |
| 5. Recovery gate | Demonstrated storage/custody/reader and approved protected recovery artifact | Missing backup or independent custody: no activation |
| 6. Pause | Separately approved Calendar-only maintenance and atomic scoped database barrier | Handler/lock/ACL failure: no schema change; retain safe pause |
| 7. Reconcile earlier work | Bound pre-denial workers; preserve finalization and separately authorize receipt checks | Unknown external outcome remains unknown; do not replay/delete |
| 8. Recheck | Exact prerequisites/history under pause (A) | Ambiguous partial state: inspect, do not rerun |
| 9. Upgrade | Apply only the reviewed atomic lifecycle/permanent-boundary migration once | Verify rollback/ledger on failure; remain paused, forward-fix |
| 10. Inspect/pause RPCs | Verify backfill/ACLs/owners/search paths and pause six new-work/read RPCs; retain both finalizers | Drift or unverified pause: do not deploy normal handler |
| 11. Deploy compatible | Separately approved normal function with explicit JWT verification under the database pause | Failure: maintenance plus permanent denial, never unsafe legacy rollback |
| 12. Static verification | Compare artifact, signatures, ACLs and six paused EXECUTEs (A) | Do not invoke paused RPCs and claim functional success |
| 13. Reopen | Separately approve only seven reviewed RPC EXECUTEs and existing claim EXECUTE/approval INSERT | Raw grant restoration or unexpected success: re-pause |
| 14. Integrity | Separately scoped canonical/journal/XP aggregate checks | Unexpected changes: stop; no reset or deletion of evidence |
| 15. Canary | Separately authorize controlled status/read/RPC after reopening (C) | Can refresh/contact Google; failure needs authorized re-pause, not blind retry |
| 16. Disconnect | Separate exact disposable-account revocation/recovery approval (C) | No approval: no real disconnect, consent or event operation |

Schema/function rollout is not atomic. Even a STABLE encrypted-field read RPC is
functional access, not metadata inspection. During the pause only already-dispatched
outcome finalization remains available. Backfill aggregates and privilege writes
need their own authorized scope.

## Failure and recovery policy

Migration failure: verify rollback and ledger before retry. Function failure:
keep permanent denial and maintenance; forward-fix compatible code. Do not restore
raw grants, retired credentials, pending consent or older active generations.
Expired/null state requires fresh user consent. Unknown Google results require
separate reconciliation. Preserve exact approvals, receipts, History and XP.

Transaction rollback is not a user-data backup. Reviewed schema can repair
structure but not lost records. No database overwrite, automatic event replay,
global role change, project pause or secret rotation is proposed.

## Local evidence and public reproducibility

Historical isolated checks included a 35-case temporary-barrier run and a 45-case
prototype; the negative control proved that restoring raw grants could resurrect
retired credentials. That unsafe result is not hidden as a security pass.
The integrated migration subsequently passed 53 SQL/concurrency cases, then 69
including synthetic encrypted recovery and CMS custody. Latest local publication
verification also passed 69/69, Calendar 129/129 and deterministic 840/840.

Private reports and machine-bound helpers remain outside the public release.
No complete PostgreSQL/recovery harness is shipped; fresh-clone reproduction of
69 checks is unavailable. Public Calendar mocks/source tests, native Deno checks
and builds remain available. They do not certify hosted routing/Auth/PostgREST,
Google behavior, full administrative topology or production grants.

## Recovery gate

No verified production user-data artifact exists. Previously inspected project
backup/PITR capability did not provide a usable recovery source; plan/account
details belong in private operational evidence and must be freshly verified
before rollout. No billing upgrade, key transfer or backup download is authorized.

[Protected recovery](google-calendar-protected-recovery.md) and
[backup preflight](google-calendar-production-backup-preflight.md) define the exact
twelve-table proposal, exclusions, custody, retention and failure policy.
A logical archive is not encryption. The historical custom envelope is synthetic
only; the selected rehearsal format is standard CMS AES-256-GCM, not a production
export implementation. Same-computer cross-process recovery is not computer-loss
recovery. Preserve newer edits, intentional deletions and retirement truth during
any separately approved quarantine/record-level reconciliation.

## References

- https://supabase.com/docs/guides/functions/function-configuration
- https://supabase.com/docs/guides/functions/limits
- https://supabase.com/docs/reference/cli/supabase-migration-repair
- https://www.postgresql.org/docs/17/sql-createfunction.html
- https://supabase.com/docs/guides/platform/backups
