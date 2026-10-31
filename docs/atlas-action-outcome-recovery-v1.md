# ATLAS Action Outcome & Recovery V1

Base: `4db367871872a473d3076225993ecedc4722d540` (unmerged lifecycle/security ancestry).
Scope: in-memory outcome reporting, truthful UI, confirmed local auditing, and an explicit read-only reconciliation contract. No queue, backend schema, live connector, automatic retry, or durable exactly-once guarantee.

## Observed execution boundary

`useAtlasActions.interpret` -> provider-neutral candidate request -> deterministic agreement + strict draft parser -> live committed entity/reference validation -> canonical proposal -> explicit human approval/fingerprint -> lifecycle scope/latch -> executor permission/fingerprint/reference/account checks -> trusted adapter -> History service -> UI.

Before this checkpoint, one executor catch block converted an adapter exception OR a later audit exception into `failed`. A connector exception was caught by the registry, normalized to `failed`, then translated into `executed:false`. Both paths could incorrectly imply that no write occurred. The audit helper also returned IDs immediately after an optimistic append, without awaiting persistence.

The existing fingerprint is canonical payload JSON, not a cryptographic digest. It remains private inside approval validation. It is deliberately excluded from outcome metadata, logs and reconciliation requests. Action identity and execution-attempt UUID bind the outcome instead.

## Outcome contract

`AtlasActionOutcome` version 1.0.0 carries safe action/type identity, bound owner (null for legacy unscoped test callers), random attempt UUID and timestamps. Production invocation always uses the authenticated lifecycle scope.

The shared DTO lives in `actionOutcomeTypes.ts`, with type-only imports. Native Deno verification demonstrated that exposing the runtime outcome helper from shared `types.ts` would pull frontend candidate/parser modules into the Edge Function type graph. The type-only split fixes that boundary without changing either Edge Function entrypoint.

Operation states:

- `not-started`: categorized permission, approval, reference, account, cancellation, duplicate or preflight rejection. No adapter was dispatched for that submission.
- `in-flight`: adapter invocation has begun. Cleanup cannot undo it.
- `succeeded`: the trusted adapter acknowledged execution. This is **not** a claim of cloud persistence, exactly-once delivery or independent confirmation of an external effect.
- `failed`: the trusted adapter explicitly reports non-application. No audit is claimed.
- `unknown`: invocation threw, returned malformed output, or reported uncertainty. The operation may have been accepted. Never automatically repeat it.

Audit states are independent: `not-required` for non-success outcomes; `pending`, `confirmed`, `unconfirmed`, or `not-configured` for acknowledged outcomes. A successful operation is never downgraded because auditing failed. A legacy ID-array receipt is unconfirmed; only an explicit repository-confirmed receipt qualifies as confirmed.

The historical result envelope (`executed`/`rejected`/`failed`) remains consumable, with `unknown` added. Existing manually constructed result fixtures may omit outcome metadata; all executor/lifecycle/cancellation production paths attach it. UI uses the versioned outcome when present. Operation `succeeded` is worded **acknowledged**, never silently upgraded to durable completion. Unknown and audit-attention states use warning presentation. Mock connectors remain explicitly simulation-only.

## Adapter evidence audit

| Existing category | Evidence and limitation |
| --- | --- |
| Task create/complete and Habit create/update ports | Legacy void-returning ports. Normal return is only an adapter acknowledgement; it is not a new verified-persistence receipt. The Task creation port can return silently on engine rejection. This pre-existing evidence limitation is not hidden by the new UI. A stronger domain receipt is follow-up work, not fabricated here. |
| Task update/schedule, Weekly Focus creation | Existing `updated`/`created` booleans report adapter-level application or explicit non-application; they still do not certify cloud synchronization. |
| Capture creation | Existing promise is awaited. A rejection is unknown after invocation, not proof that no write occurred. |
| Mock calendar/messaging/finance | Acknowledgements describe local simulations/reads only, never real external delivery. |
| Registry-backed connector exception | Generic `failed` or `unavailable` cannot prove non-application after invocation. The registry now stamps its own dispatch boundary (overriding connector-supplied claims). Only its pre-dispatch connection/registration/policy refusal proves non-application. Reply identity mismatches remain unknown. |
| Real Google Calendar V1/V2 | Separate context/server exact-approval path, not newly wired into this executor. No new outcome/idempotency claim, OAuth call, deployment or permission change is made for it. |

## Local audit confirmation and account races

The hook awaits `ExecutionHistoryService.appendConfirmedForRepository` through the existing audit writer. The service checks exact repository ownership before dispatch and a repository generation after awaiting. A generation prevents stale A confirmations/rollbacks from altering B when per-repository mutation counters happen to collide. No RLS or PowerSync lifecycle changes are involved.

Same-account route unmount may still complete a started operation and its bound audit. If the repository was retired/switched, the audit fails closed; the original operation remains acknowledged, its audit unconfirmed, and no record is redirected to B. Cloud upload confirmation is not claimed. Audit error after a physical append can mean a record exists despite an unconfirmed acknowledgement; do not replay either the action or audit blindly.

## Recovery policy

- Unknown operations require explicit reconciliation and block retry decisions.
- A missing item is insufficient evidence of failure.
- Explicit non-application or cancellation can permit consideration of a **new proposal and fresh approval**, never replay of the old approval.
- An acknowledged operation with audit trouble requires audit-only attention, not repetition of the mutation.
- Duplicate guards retain every dispatched proposal ID for the coordinator/executor lifetime, including unknown and declined outcomes.
- Each submission gets its own attempt identity. The original executing attempt's identity is stable through in-flight, audit-pending and final states; a rejected duplicate does not replace that stored outcome.

`reconcileAtlasActionOutcome` is a single bounded, read-only request for an exact account/action/attempt receipt. It checks owner and deterministic permission, requires a matching action-specific read-only capability, verifies receipt identifiers/shape, and rechecks owner after awaiting. Exceptions/absence/mismatched evidence remain unresolved. Its answer does not mutate any canonical state, execute a write, append an audit or modify the original outcome. Retry decisions never invoke an adapter.

No real reconciler is registered in V1: current domains/connectors lack the requisite authoritative per-attempt receipt contract. The interface is proven with synthetic readers; production unsupported actions truthfully remain unresolved. A future reader must enforce its own query timeout and obtain trustworthy server/canonical evidence; an LLM must never supply the reader or its result. There is no broad scan or polling fallback.

## Tests and release boundaries

The original 881 tests remain, with expanded assertions where the old envelope conflated failure with uncertainty. Added 45 outcome/recovery cases plus four actual mounted-hook cases = **930 deterministic tests**, including 21 mounted cases and the retained 24 coordinator cases. Tests use synthetic accounts, in-memory repositories, controlled promises and no real credentials or services. UI output checks use actual component rendering.

Regression coverage includes deny-before-dispatch, malformed/uncertain results, opaque exceptions, timeout/lost-ack simulations, attempt stability, no duplicate replay, pending/failed/confirmed audits, repository-generation races, wrong-account and insufficient reconciliation, read failure, deny-by-default retry, payload/privacy exclusion, provider-forged outcome rejection, unmount and dependency/account transitions.

### Final review corrections

The final review reproduced mutable-input retargeting after dispatch: changing the caller's proposal while an adapter was pending changed the eventual result/audit action ID. Completion reporting now uses a private validated proposal snapshot, separate from both caller and adapter objects; the validated approval timestamp is captured before awaiting. A regression also attempts mutation from inside the adapter and verifies that private synthetic payload text cannot enter completion/audit metadata.

Sparse ID arrays could previously pass `every` without checking their holes, falsely confirming an audit receipt. Receipt IDs now require a bounded real array with every position holding a positive safe integer. Adapter record-ID arrays receive the same dense-value validation. These are in-scope correctness fixes, not new journal or mutation authority.

An additional isolated regression reproduced stale History initialization completing after a repository/account transition. The same repository-generation ownership fence now protects hydration progress, completion, failure reporting and subscription callbacks, as well as audit append confirmation/rollback. Stale initialization rejects without overwriting the new account's records or persistence state. No database lifecycle or hydration requirement is bypassed.

The existing optimistic History persistence path also used only a resettable mutation counter. A reproduced counter collision let a late A append replace B's in-memory history after B's confirmed append. Its completion/error handlers now require the captured repository and generation as well as the mutation version. This closes the directly related service-level race without changing optimistic writes or their repository targets.

Existing test cases were expanded without changing the count: the mounted harness renders the real proposal card, checks warning/acknowledgement text, and drives late adapter and audit completions through A → B → A → B. All accounts, ports and repositories remain synthetic. This proves the exercised client-lifecycle boundaries, not production cross-device isolation or durable exactly-once execution.

CI's exact test/pass count is updated to 930 with zero skipped; triggers, permissions and all security steps remain unchanged. This new feature branch is not added to the push trigger. Hosted CI has **not** run for this uncommitted checkpoint. Native Deno entrypoints are unchanged; no Edge Function is started by type checking.

## Remaining limitations / next checkpoint

Outcomes and latches are in memory; refreshing or remounting loses them. Nothing promises cross-device exactly-once execution, durable recovery, an atomic operation+audit transaction, or cancellation of dispatched effects. An adapter promise without its own deadline remains in-flight. Existing optimistic void ports need typed trustworthy mutation receipts before LifeOS can assert stronger operation completion. This is the recommended next bounded checkpoint, along with an explicit audit-repair design; neither is implemented here.

Stop before staging, commit, push, merge or deployment. Both existing worktrees and the original five recovery/HTTPS edits are out of scope and preserved.
