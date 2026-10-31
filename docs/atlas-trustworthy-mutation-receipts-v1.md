# ATLAS Trustworthy Mutation Receipts V1

Starting commit: `4a6e7a167978ce68c31bb6151cab1407ec594803`, the CI-verified outcome/recovery branch. Its security/lifecycle ancestry is unmerged. No backend, schema, OAuth, RLS or live service change belongs to this checkpoint.

## Audit: guarantees before modification

| Trusted port | Canonical path and evidence actually available before this checkpoint |
| --- | --- |
| `createTask` | PlanningExecutionContext calls PlanningMutationEngine.createTask and discards its structured result. Invalid titles return silently. applyState calls PlanningState and Task providers; their replacement methods return void before async repository writes settle. Normal adapter return proves invocation/acknowledgement only, not acceptance or persistence. |
| `completeTask` | ExecutionCoordinator → ExecutionService → ExecutionKernel derives state/history/XP; PlanningExecutionContext applies state through void providers. ATLAS revalidates references before dispatch, but the port supplies no completion/persistence receipt. |
| `updateTask` / task scheduling | PlanningMutationEngine returns `updated`, status and task; the provider invokes applyState before returning. `updated` is an engine-level result, not proof of provider acceptance or local/cloud durability. |
| `createHabit` / `updateHabit` | HabitMutationEngine may return the unchanged state and the context returns silently. replaceHabitState applies optimistic state and launches async repository replacement. Void adapter acknowledgement only. |
| `createCapture` | AppContext trims text (empty input returns), initializes the existing repository, applies optimistic state and awaits insert. Authenticated insert is a local PowerSync SQLite transaction. This is more evidence than invocation on the nonempty path, but the void port supplies no canonical ID or typed receipt; do not infer remote persistence or upgrade this operation here. |
| Goal/personal Weekly Focus creation | Structured engine `created` result plus existing provider application. Calendar-backed creation has its established placement checks. No new persistence receipt; existing structured result is not a cloud acknowledgement. |
| Mock connector operations | Calendar read/create, messaging prepare/send and finance reads remain local simulations. Registry-owned dispatch classification and matching response IDs establish their existing adapter assurance only. No real external operation or new receipt is added. |

ExecutionService is a deterministic transformation, not a durability authority. ExecutionKernel's domain events and ATLAS's separate zero-XP audit are not a transaction with repository persistence. ExecutionHistoryService confirms its own local repository append, separately from task persistence.

Authenticated TaskRepository.replace resolves after a queued PowerSync SQLite write transaction, including semantic Task round-trip verification. Its readCurrent reads the local ledger after queued writes. waitForPersistence additionally waits for upload settlement, but no per-attempt server receipt is returned. TaskProvider currently observes replace asynchronously and discards its resolution as a mutation return value. None of these observations justifies inventing remote confirmation.

## Selected vertical slice and evidence

Only `task.create` gains a typed receipt. TaskProvider.replaceTasks now returns a boolean after its existing canonical in-memory task ref/state has accepted the snapshot. A retired provider rejects before applying Task state. Its asynchronous persistence path is unchanged. PlanningExecutionContext.createTask preserves engine rejection and returns `{status: "accepted", taskId}` only when the existing Task provider accepts the engine-produced state; otherwise it returns `{status: "rejected"}`. Other callers may continue ignoring the return value.

This means **canonical in-memory acceptance**, not a committed React render, confirmed local persistence, cloud persistence, or durable completion. It can be issued while local persistence is pending or cloud transport is disconnected. A later write failure does not retroactively prove non-application, and the receipt is never automatically upgraded when a promise later settles. No second writer/repository or direct database path is introduced.

The other mutation ports deliberately retain their existing assurance. They should be migrated one at a time only when their canonical boundaries expose trustworthy evidence.

## Receipt and execution boundaries

`TaskCreationAcceptance` is a domain-only return contract without ATLAS coupling. The trusted adapter wraps it in a versioned `AtlasTaskCreationReceipt`, containing only action ID, action type, owner, attempt ID, decision, assurance and (for acceptance) canonical entity ID. The executor supplies a frozen safe attempt identity after permission, approval-fingerprint, reference and account validation. The existing lifecycle and composite adapter forward it unchanged.

The executor strictly checks receipt fields and exact account/action/attempt binding. Only `task.create` may use this contract. Unknown versions, extra fields, invalid IDs, mixed envelopes, stale attempts and invented persistence levels fail closed as unknown after dispatch. Rejection means the trusted canonical port reports no Task acceptance; no success audit is appended. Acceptance produces operation `succeeded` with confirmation `canonical-accepted`, independently of audit confirmation.

Legacy void-returning task ports retain `adapter-acknowledged`, never canonical or persistence assurance. The production task port returns the typed domain result. Missing account/attempt binding cannot certify a typed result. Legacy unscoped executor APIs remain only compatibility paths, not the authenticated UI path.

Approval fingerprints remain private validation inputs. Neither domain receipts, invocation identities nor outcome DTOs contain payload JSON, titles, arbitrary exception text or fingerprints. Receipt values cannot grant permission, bypass approval, mutate records, select an account, register a reconciler or authorize replay.

## UI and recovery

The existing proposal card renders `Task accepted` (or `Task accepted · audit unconfirmed`) and explicitly says local persistence and cloud synchronization are not confirmed. A separate confirmed audit means only the local audit repository confirmed its record. Audit failure never erases canonical acceptance or justifies repeating the task mutation.

All existing unknown-outcome and duplicate guards remain. Exceptions after invocation remain unknown, including synchronous port exceptions. The account-scoped lifecycle prevents old proposals from gaining authority under a new identity, and the captured audit writer cannot retarget to the new account. A started same-account action may finish after unmount; cancellation is not undo.

No durable action journal, real reconciler, automatic retry, cross-device exactly-once claim, atomic Task+audit transaction or new cloud confirmation level is implemented.

## Verification scope

Added 19 deterministic receipt cases and three real mounted vertical-slice cases: **930 + 22 = 952** expected tests, zero skipped. Mounted tests use the actual useAtlasActions, TaskProvider, PlanningExecutionProvider, mutation engines and proposal card; only repositories, identities and unrelated-domain hooks are synthetic. Controlled promises prove canonical acceptance before local persistence, exactly one task replacement/audit after repeated approval, truthful rendering, disconnected synthetic transport, owner transition fencing and canonical rejection/retired-provider behavior. Existing mounted lifecycle/recovery tests continue covering cancellation, unmount, permission denial and audit failure.

The new CI baseline changes only test labels and exact count assertions; permissions, existing triggers, zero-skipped enforcement and security gates are unchanged. This new branch is not added to the push allowlist. No hosted verification is claimed for this uncommitted checkpoint.

## Next boundary

Stronger local persistence receipts would require an explicit, account/generation-bound asynchronous canonical mutation API that verifies the exact Task values after the existing write. Remote persistence needs an authoritative per-attempt server contract; upload queue emptiness alone is insufficient. Those are separate reviewed checkpoints, not implied by this V1 acceptance receipt.

Stop before staging, committing, pushing, merging or deployment. Preserve all three original worktrees and the original five HTTPS/recovery edits.
