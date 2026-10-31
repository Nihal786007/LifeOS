# Production backup readiness and approval preparation

## Decision and current evidence

**NOT READY — PRODUCTION RECOVERY PREPARATION INCOMPLETE.**
No production user rows, backups, credentials or recovery secrets were copied by
this checkpoint. No grants/roles, deployment, maintenance, migration history or
Google operation changed. Public source publication does not approve those acts.

A dedicated empty local destination exists outside Git with protected NTFS ACLs
for the approved operator and SYSTEM. Synthetic inherited-permission/read-write
checks passed and the test file was removed. Detected sync-root separation passed;
unknown/custom/inactive sync agents remain unverified. Device encryption inspection
required privileges not available; no administrator elevation occurred.

No USB/off-computer medium, real recovery-key custody, restricted production
reader or production artifact is established. Operator identity, exact private
paths, project URLs and detailed local reports are intentionally excluded from
public Git. Record them privately before any executable operation.

## Selective protective scope

The migration intentionally leaves the eleven canonical domains and approval
journal unchanged. A protective backup is a loss contingency, not permission to
mutate these tables or proof of complete Supabase disaster recovery.

| Exact table | Dependencies and reconciliation rule |
|---|---|
| public.life_goals | Owner; preserve current priorities and deletions |
| public.monthly_outcomes | Goal/owner; reconcile parent before child |
| public.weekly_focuses | Month/owner; do not resurrect removed planning |
| public.tasks | Week/owner; preserve newer edits, completion and deletions |
| public.captures | Owner; no guessed recovery or automatic reversal of deletion |
| public.habit_definitions | Owner; preserve schedule/retirement |
| public.habit_completions | Habit/owner; no completion or XP replay |
| public.execution_records | Exact IDs/receipt links/XP; preserve newer finalization |
| public.profiles | Owner; do not overwrite newer settings |
| public.atlas_memory_items | Owner/supersession; sensitive private text |
| public.notification_ui_state | Owner; preserve newer preferences/dismissals |
| public.google_calendar_event_approvals | Owner/authorization/audit linkage; exact original receipt and approval, never replay |

All-owner rows require explicit project-wide personal-data approval. A narrower
account snapshot is not equivalent; agree uncovered risks explicitly. Include
separately reviewed non-secret schema/constraints/indexes/RLS/ACLs, function
definitions, migration version IDs and source/dependency inventory. Review
definitions for sensitive literals, never log arbitrary SQL or table contents.

Exclude all connection/PKCE rows, token ciphertexts, application/recovery keys,
Auth rows, Storage, logs, cluster-wide role dumps and unlisted data. Auth UUID
references can support synthetic quarantine placeholders, not recovery of real
Auth identities. Lifecycle coverage after installation needs separate approval;
current generations, revocation and retirement truth always override older copies.

The historical missing-Capture incident remains unresolved. Confirmed deletion
does not establish the human initiator, and no authoritative complete recovery copy
was found. Do not recreate it from guesses; record-level recovery needs independent
evidence and authorization. No real incident ID is needed in this public plan.

## Reader capability and approval-gated design

The authenticated Dashboard/CLI management session is not a pg_dump login.
Previously inspected operator metadata showed a powerful non-superuser BYPASSRLS
owner; no suitable restricted reader matched the conservative screen. This is
not an exhaustive proof no alternative export architecture can exist.
No password, key, token row or credential RPC was inspected for this plan.

Proposed principal: a short-lived dedicated NOINHERIT, NOSUPERUSER, NOCREATEDB,
NOCREATEROLE, NOREPLICATION login, one source connection, no object ownership or
role memberships, CONNECT on the verified database, required schema USAGE and
SELECT on precisely the twelve tables. Version metadata requires separate exact
column-scoped approval. No default/future grants, pg_read_all_data, table DML/DDL,
credential-table rights or privileged connector RPC execution.

Forced RLS needs a legitimate complete all-owner strategy. SELECT alone is not
enough, and --enable-row-security must not conceal an incomplete export.
PostgreSQL 17 requires superuser authority to create a BYPASSRLS role; CREATEROLE
does not confer that capability. It cannot be assumed available to the observed
non-superuser Dashboard role. First obtain platform-supported provisioning
confirmation; otherwise separately review backup-role-specific SELECT policies.
Do not disable RLS or substitute broad operator/service access.

Effective privileges must include PUBLIC defaults, all role membership paths,
column grants and accessible SECURITY DEFINER functions. NOINHERIT does not remove
PUBLIC privileges. Database TEMP may still be inherited; read-only role defaults
are overrideable precautions, not an authorization boundary. Do not claim blanket
zero write capability or change global PUBLIC grants to make a template pass.

Only after authority and separate production provisioning approval: start a
fixed-name NOLOGIN/password-unset role with exactly the reviewed scope. Operator
securely provisions a new SCRAM credential and an exact approved UTC expiry window
of at most one hour; never chat, argv, saved SQL literals or source. Password
expiry does not terminate existing sessions. Afterward, separately authorized
teardown sets NOLOGIN, unsets password, terminates only exact-role sessions if
needed, revokes exact grants/BYPASSRLS through an authorized actor and drops only
the dependency-free role. No broad DROP OWNED or data deletion.

## Encryption and independent custody

Installed-tool synthetic rehearsal used OpenSSL 3.5.7 CMS AuthEnvelopedData,
AES-256-GCM, RSA-3072 OAEP/SHA-256, binary DER and encrypted PKCS#8 private keys.
The earlier custom Node envelope is historical synthetic evidence, not the
production format. Custom archive format alone is not encryption.

Synthetic DPAPI CurrentUser custody recovered across processes on one computer.
It does not survive profile/computer loss by itself. A separate local portability
simulation passed five checks with redirected profile paths and simulated
independent RAM custody, no DPAPI dependency and wrong-passphrase rejection.
That is neither physical second-device proof nor evidence the original Windows
principal lost access. No real key or external custody transfer was performed.

Require encrypted private-key recovery material on an explicitly approved
off-computer medium, passphrase in separately approved independent custody and
only public certificate at exporter. Do not keep key bundle, passphrase and
backup in one failure domain. Lost keys can mean loss; compromise exposes retained
artifacts. Rotation does not protect previously stolen ciphertext.
A decryptor can emit bytes before final integrity failure: release bounded
plaintext only after successful exit and trusted digest verification.

## Future export specification — NOT executable authorization

1. Verify exact project/schema/ledger/role, reviewed dependency graph, TLS route,
   destination ACL/no-reparse/no-sync/volume checks, recipient and independent custody.
2. Confirm direct or session-pool connection supports the custom login and
   session-bound snapshot. Obtain exact endpoint/CA privately, never guess;
   require sslmode=verify-full. Do not use transaction pooling without proving
   compatibility. No real secret may appear in argv, logs or Git.
3. Use a compatible pg_dump major and one serial process for a consistent
   snapshot. Bound connection/lock/statement/total deadlines and size. Proposed
   initial ceilings are 5-second connect/lock, 120-second statement,
   180-second total and 256 MiB; actual production size/load is unmeasured.
   No parallel export with the one-connection role.
4. Allowlist precisely the twelve relations above, no arbitrary table/CLI overrides:

   ```text
   pg_dump --format=custom --data-only --strict-names --no-blobs
     --lock-wait-timeout=5s --no-owner --no-acl --no-publications --no-subscriptions
     --table=public.life_goals --table=public.monthly_outcomes
     --table=public.weekly_focuses --table=public.tasks --table=public.captures
     --table=public.habit_definitions --table=public.habit_completions
     --table=public.execution_records --table=public.profiles
     --table=public.atlas_memory_items --table=public.notification_ui_state
     --table=public.google_calendar_event_approvals
   ```

   This is an argument specification, not an executable shell recipe.
   No plaintext file output, broader schema/data dump or large objects.
   Separately captured metadata does not automatically share this snapshot;
   bind an exported snapshot if needed or abort on inconsistent metadata.
   Snapshot RPO excludes later commits/finalizers.
5. Stream output into a separately reviewed CMS pipeline before filesystem
   persistence, with backpressure, memory/size bounds and coupled error handling.
   Require OAEP/SHA-256 and AES-256-GCM, public recipient only. Publish atomically
   only after both producer/encryptor succeed and durable ciphertext write;
   failed/partial ciphertext cleanup needs approved exact-output scope.
   No raw stderr or content logging. No production runner is certified yet.
6. Protect inventory containing snapshot UTC/schema/source/dependency versions,
   approved counts, authenticated artifact digests and recipient fingerprint.
   Never a private key/passphrase/token dump. A digest next to an untrusted
   archive alone is not an independent authenticity source.
7. With separate copy/restore approval, authenticate/decrypt in bounded memory
   and restore into a distinct isolated quarantine with no Google/Edge workers,
   correct schema and reviewed synthetic Auth placeholders. Verify constraints,
   RLS/ACLs/RPCs, ownership, counts, exact approvals, unique audits and XP.
   Never restore wholesale over live state or replay Google actions.
8. Reconcile newer activity, deliberate deletions and retirement truth before
   any separately approved exact-record recovery. If evidence is absent, stop.
9. Proposed retention is seven days after successful rollout, extension only
   by incident approval. Key retirement respects legal/retention rules. No
   cloud upload is implied; SSD deletion is not guaranteed physical erasure.

## Actual synthetic evidence and limits

The private loopback PostgreSQL 17.11 runner applied exact prerequisite/migration
SQL and passed 53 integrated security/concurrency cases, eleven archive/restore
cases and five CMS/custody cases: 69/69. A fresh publication run confirmed 69/69.
An earlier missing companion import caused one run to stop; its failure was
retained, not hidden or assertions weakened.

The independent exporter exited; a new process recovered synthetic key custody,
rejected corrupted/wrong-key input, restored into another empty database and
verified snapshots, all seven RPCs, forced RLS and one unchanged zero-XP audit.
Exact generated synthetic archives/key files were removed; servers stopped and
ports closed. Private reports/runner paths are not published. The three local
helpers require the private harness and machine-bound guards; they are explicitly
excluded, unchanged, rather than advertised as standalone tools.

Not demonstrated: production restricted login, exact twelve-table all-owner
export, production streaming/load bounds, physical cross-device recovery, actual
volume encryption or live restoration. Public Calendar mock tests do not replace
those checks. No production artifact exists.

## Exact next authorization requirements

Resolve encryption status, global sync exclusions, named USB/offline medium and
independent passphrase custody, synthetic physical second-device proof and
platform-supported restricted-reader strategy. Then separately approve exact
role/grants/login/expiry/teardown. A later export approval must name verified
source, twelve-table all-owner privacy scope, reader, TLS endpoint, destination,
recipient/custody, retention and snapshot risks. Any placeholder or unverified
choice keeps the request inactive.

Maintenance, migration-history repair, schema/function deployment, reopen, Google
disconnect, production export and restore are all separate gates. Source
publication can be approved without falsely calling production recovery ready.

## References

- https://docs.openssl.org/3.5/man1/openssl-cms/
- https://learn.microsoft.com/en-us/dotnet/api/system.security.cryptography.dataprotectionscope
- https://www.postgresql.org/docs/17/app-pgdump.html
- https://www.postgresql.org/docs/17/role-attributes.html
- https://supabase.com/docs/guides/database/connecting-to-postgres
- https://supabase.com/docs/guides/platform/backups
