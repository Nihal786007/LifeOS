# Capture reliability remediation — unresolved data loss

The original Capture with canonical ID `1791469625102` and cloud UUID
`f1e8a4d6-d1bd-48cc-86c1-018fa1f6fdca` remains missing. On October 16,
2026 at 10:29:48 IST, an API Gateway DELETE request explicitly targeted that
UUID with the approved disposable Account A ownership filter. HTTP 204 does
not establish affected-row count. The initiating human/application action
has not been established; no wrong-ID UI defect has been proven.

Subsequent authenticated read-only checks, including two reloads, found the
original and all three approved test Captures absent locally, in Supabase,
and in repository/canonical state. The legacy `lifeos-captures` array contains
no matching original. No complete authoritative recovery copy is currently
known. A separate pre-auth browser database was not initialized for recovery
because doing so could write/migrate data. No reconstruction or restoration
has been performed. This loss remains unresolved, not repaired by the changes
below. Private Capture text is intentionally excluded from this document.

The bounded reliability changes are independent protections:

- Existing insertion ordering repair uses non-negative cloud sort keys while
  preserving canonical IDs, UUIDs, content, timestamps, extras and relative order.
- Exact-target deletion confirmation shows text and canonical ID, requires
  approval of the unchanged selected record in the same hydrated account/service
  scope, and consumes approval before invoking the existing deletion path.
- Changed/missing records, ambiguous IDs, account transitions and duplicate
  confirmation callbacks fail closed. A retry requires a new review.

These changes do not add soft deletion, recovery, durable deletion auditing,
database migrations, or server-side compare-and-delete. Confirmation validates
the latest committed client state immediately before invoking the trusted path;
it cannot guarantee a cross-device atomic content check against a concurrent
remote edit. Live writes require separate, exact-fixture authorization.

## Separately authorized runtime verification

Exactly one disposable Capture (`1792227966302`, cloud UUID
`a2d5d5bc-7f15-4643-859a-9e71faa13872`) was created through Quick Capture.
Its exact ID/text confirmation, Cancel, Escape, focus restoration, Light/Dark/
System appearance and 390/768/1366px layouts were verified. A native Tab boundary
escape was observed and fixed with a dialog-scoped Tab/Shift+Tab cycle; actual
keyboard verification passed across all nine theme/width combinations. No global
keyboard handler or new dependency was introduced.

After separate permanent-deletion approval, authenticated identity, ownership,
UUID, canonical ID, content and sync status were revalidated. Only that fixture
was deleted through the normal exact-target confirmation UI. Fresh account-scoped
local/cloud reads and two reloads verified zero Captures, Tasks and History, zero
XP, zero pending uploads, no foreign-owner local rows, unchanged unrelated-domain
counts, and preserved Goal `1791423395953` matching its earlier fingerprint.
Temporary read-only verification instrumentation was removed before commit.

This controlled cleanup does not recover the previously lost original Capture,
and does not identify the original deletion's human or application initiator.
