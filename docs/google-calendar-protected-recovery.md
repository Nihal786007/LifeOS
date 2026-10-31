# Calendar protected recovery readiness

## Decision

**Production recovery is not ready.** This is a plan plus retained synthetic
evidence, not authorization to export, restore, provision credentials, change
grants, deploy or contact Google. A source-code checkpoint, transaction rollback
or fresh OAuth consent cannot recover lost canonical rows or approval receipts.

The latest isolated verification passed 53 SQL/concurrency checks plus eleven
historical archive/restore and five standard CMS/custody checks: 69/69. Detailed
reports, local identities, storage paths and machine-bound helpers are private
and excluded from public Git. No complete recovery harness is shipped; these
counts are operator evidence, not a fresh-clone reproduction claim.

## Recovery inventory

| Category | Release effect | Recovery constraint |
|---|---|---|
| Connections | Permanent raw ACL denial; authorization-generation backfill | Ciphertexts/owners/labels sensitive; never restore retired or uncertain grants; use fresh consent |
| PKCE state | Adds generation; invalidates old null-generation consent | Do not copy/replay verifier or pending codes; start new state |
| Lifecycle | New generation/phase/outcome metadata | Current retirement truth overrides older active snapshots |
| Approval journal | No migration mutation; finalizers retained | Preserve exact original payload/receipt/identity; quarantine before any reconciliation |
| Execution History | No migration mutation; finalizer may append | Preserve IDs and zero-XP connector audits; no event or XP replay |
| Migration ledger | Future exact reconciliation separately gated | Save reviewed version identifiers; SQL text can contain sensitive literals |
| SQL/schema/security | Seven definers, empty paths, forced RLS, raw denial | Rebuild from reviewed source/catalog; never restore unsafe grants/writers |
| Edge source/config | Separate normal/maintenance artifacts | Seal complete imports, dependencies and explicit JWT configuration |
| Environment | No release value changes | Inventory names only; operator re-provisions separately; never include actual values in backup |
| Other canonical domains | No intended mutation | Personal data; source/schema recovery cannot recover their rows |

Environment references include SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
GOOGLE_CALENDAR_CLIENT_ID, GOOGLE_CALENDAR_CLIENT_SECRET,
GOOGLE_CALENDAR_TOKEN_ENCRYPTION_KEY and GOOGLE_CALENDAR_REDIRECT_URIS.
Names are not a request to inspect, copy or publish values.

## Protective snapshot scope — separate approval required

Proposed selective all-owner recovery scope is exactly:

- public.life_goals
- public.monthly_outcomes
- public.weekly_focuses
- public.tasks
- public.captures
- public.habit_definitions
- public.habit_completions
- public.execution_records
- public.profiles
- public.atlas_memory_items
- public.notification_ui_state
- public.google_calendar_event_approvals

All contain sensitive account/personal metadata. All-owner export needs explicit
project-wide approval; silently substituting one user's RLS view is incomplete.
A narrower scope requires explicit uncovered-risk acceptance.

Exclude connection/PKCE/token rows and ciphertext, encryption/recovery secrets,
all Auth rows, Storage objects, logs, unlisted tables and cluster role dumps.
This is not a complete Supabase/account disaster-recovery image. A quarantine may
use synthetic Auth placeholders matching approved owner UUID dependencies, never
copied Auth credentials. Actual identity reconciliation requires a separate plan.

Capture reviewed non-secret schema, constraints, indexes, RLS, ACLs, function
definitions, version IDs and source/dependency manifests separately. Review
definitions for embedded literals. A later lifecycle snapshot requires its own
approval and may never supersede current retirement truth.

An earlier missing-Capture incident remains unresolved: deletion was established,
but the human/application initiator and a trustworthy complete recovery source
were not established. No guessed reconstruction or automatic restoration is
permitted. Real incident identifiers remain private.

## Storage, reader and independent custody

Use a separately approved destination outside Git, temporary work areas, cloud
sync and network/public folders. Resolve and reject reparse-point redirection.
Require protected Windows NTFS inheritance limited to the approved operator and
SYSTEM; POSIX mode bits alone do not establish Windows protection. Verify volume
encryption. ACLs do not protect against compromised operator/SYSTEM/administrator.

An empty protected local destination was established and synthetic ACL/file checks
passed. It is outside the detected configured sync root, but custom/unknown agents
were not ruled out. Device encryption could not be verified without additional
privileges; none were obtained. Do not treat these limitations as waived.

No suitable restricted production reader is established. Require CONNECT,
necessary schema USAGE and SELECT only on the twelve tables, plus a reviewed
complete forced-RLS strategy. Do not substitute broad Dashboard/service access,
pg_read_all_data or --enable-row-security to conceal missing owners. PostgreSQL
BYPASSRLS provisioning requires authority not established for the observed
non-superuser operator. Scoped policy alternatives require separate RLS review.
[Backup preflight](google-calendar-production-backup-preflight.md) records gates.

Use verified TLS and one consistent snapshot, authenticated encryption before
persistent storage, bounded sizes/timeouts and coupled producer/consumer failures.
A custom PostgreSQL archive is not encryption. Authenticate all bounded decrypted
bytes and a trusted inventory digest before allowing restoration output.
Do not send raw stderr, SQL values or private content to logs.

The selected synthetic format is OpenSSL CMS AuthEnvelopedData AES-256-GCM with
RSA-3072 OAEP/SHA-256. The earlier custom Node envelope is historical synthetic
testing only, not the proposed production format. Per-artifact symmetric key
material is generated by the reviewed encryption implementation, not hand-rolled
production cryptography. Keep private keys/passphrases out of argv, Git, logs and
the backup directory. Exporter needs only an approved public certificate.

Encrypted private-key recovery copy and passphrase must survive in separately
approved off-computer custody, not the same backup disk/failure domain. Same-user
DPAPI is insufficient after profile/computer loss. Local portability simulation
does not prove physical second-device recovery. No real key, external custody
device or production artifact exists in the retained evidence.

Proposed retention: seven days after verified rollout; incident extension only
with approval. No automatic cloud upload. Expiry cleanup and key retirement require
approved exact scope. SSD deletion does not establish physical erasure; use the
chosen system's encryption/key-retirement controls.

## Synthetic recovery evidence

The private SQL runner used exact repository prerequisites and lifecycle migration
on loopback PostgreSQL 17.11, synthetic roles/users/ciphertexts, one invented
approval and one zero-XP audit, no Google-capable worker or production config.

Eleven recovery checks proved: encrypted-before-disk custom archive; bounded
authenticated in-memory decryption; rejection of tampered/wrong-key/truncated/
missing artifacts before restore; synthetic source loss only; atomic restoration
into a separate empty database; restored constraints/forced RLS; all seven RPC
definitions/owners/ACLs; raw/browser denial; unchanged approval and zero-XP truth;
quarantine retirement blocking stale refresh; removal of exact test archive/key
artifacts. Historical custom-envelope checks are not the production exporter.

Five CMS/custody checks added restricted synthetic storage, a separately exiting
exporter, new-process key recovery, corruption/wrong-key rejection and restoration,
then verification of RPC/RLS/audit integrity and exact fixture removal.
All 69 passed in the latest local run; servers stopped and loopback ports closed.
Buffers were cleared best-effort, not forensic memory erasure.

Not certified: real reader/export completeness for all twelve tables, durable
independent custody, physical second-device recovery, volume encryption, hosted
Auth/PostgREST/role topology, logical replication, PowerSync reattachment, real
Google behavior or restoration to service. Synthetic credential restoration only
tested quarantine; the production proposal excludes real credential/PKCE rows.

## Failure response

Every production action below requires separate scoped approval.

| Failure | Containment and preferred recovery |
|---|---|
| Migration fails before commit | Roll back; keep maintenance; inspect actual objects/ledger before retry |
| Schema committed, function fails | Keep permanent denial and maintenance; forward-fix compatible code |
| Missing RPC or privilege drift | Stop/re-pause; review exact signature/owner/ACL; no broad grants |
| Reopen denied | Correct only reviewed RPC/claim/approval rights; never raw token access |
| Old worker or uncertain Google result | Preserve finalizers/evidence; separately reconcile finite earlier work; no automatic retry |
| Retired authorization or expired consent | Never restore tokens/state; fresh explicit OAuth consent |
| Backup corrupt/missing/key lost | Stop before target mutation; another verified source or explicit loss decision, never guesses |
| User/journal baseline mismatch | Preserve evidence; quarantine verified source and reconcile exact records, never overwrite live state |
| Rollback would restore unsafe grants | Reject rollback; retain pause and forward-fix |

## Approval and release gates

An executable export approval must name verified project/source, exact tables,
reader, TLS route, destination, recipient/custodian, retention, snapshot limits
and independent recovery evidence. No placeholders may be treated as executable
approval. Provisioning, data copy, quarantine restore, production reconciliation,
migration history, maintenance, SQL/function deployment, reopen and live Google
proof are separate gates.

USB unavailable; device encryption/global sync exclusion/real independent custody
unverified; reader absent; production recovery artifact absent. These block
production rollout, not truthful publication of source and limitations.

## References

- https://www.postgresql.org/docs/17/app-pgdump.html
- https://www.postgresql.org/docs/17/app-pgrestore.html
- https://www.postgresql.org/docs/17/role-attributes.html
- https://supabase.com/docs/guides/platform/backups
