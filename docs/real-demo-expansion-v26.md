# Real application showcase expansion V2.6 — Checkpoint A

Uncommitted local candidate on `feat/real-demo-focus-habits-v26`, based on published release `1e8845f3285567804da97459bd39ccbf1532a478`. The public Cloudflare site and README PR #1 remain unchanged. No backend, deployment, merge or Git publication is part of this checkpoint.

## Existing-module architecture audit

The production application normally mounts these modules behind identity-bound authentication and per-account data services. Their pure engines and presentation components have different dependencies; existence in the source tree does not make a module anonymously usable.

| Module and actual source | State, repository and infrastructure requirements | Genuine interactions; integration verdict |
| --- | --- | --- |
| Habits 2.0: `src/pages/Habits.tsx`, `src/components/habits/MonthlyHabitCalendar.tsx` | `HabitContext` owns definitions/completions via `AsyncHabitRepository`. `HabitExecutionContext` uses `HabitMutationEngine`, `HabitExecutionEngine`, `HabitEngine` and `ExecutionHistoryService`. No transport belongs to the page/engines. | Create scheduled habits, complete/uncomplete exact eligible local dates, weekly/monthly navigation, archive/restore, derived streaks. Reused with the existing providers and a cloning/subscribing memory repository in A. Habit events retain the real zero-XP behavior. |
| Focus Mode: `src/focus/FocusMode.tsx`, `focusSession.ts`, `focusAudit.ts`, `useFocusSession.ts` | The screen accepts a `FocusSessionController`. Production hook requires a real authenticated UUID, account hash and localStorage; importing that runtime would pull database/auth dependencies into the demo. Pure timing/audit functions need only tasks, timestamps and a history port. | Task selection, start, pause/resume, end confirmation, explicit separate Task completion/keep-open, next suggestion. A supplies only an anonymous, memory-only presentation adapter using the real pure functions and repository-bound history service. Production auth/session hook is unchanged. No reload recovery is claimed in the demo. |
| Focus History: `src/focus/FocusHistory.tsx`, `focusInsights.ts`, `focusEvidence.ts` | Explorer is auth-gated and reads `AccountDataContext` sync status; pure insights read canonical zero-XP audit evidence. | Full explorer intentionally not available to anonymous visitors in A. Focus outcome/header use actual newly recorded session evidence. Do not invent an authenticated identity to enable the explorer. |
| Daily/Weekly/Monthly Reviews: `src/pages/Reviews.tsx`, `src/reviews/WeeklyReviewPanel.tsx`, `reviewEngine.ts`, `weeklyReviewIntelligence.ts` | Real Task/Habit/Planning contexts plus subscribed ExecutionHistory. Pure report engines need no cloud. Page also embeds Reality Mirror. | Period/date navigation, factual completion/XP summaries, weekly comparison/evidence. Suitable for B after real visitor-created events exist; missing history must remain an honest empty state. Not routed in A. |
| Reality Mirror: `src/insights/RealityMirror.tsx`, `attentionLedger.ts`, `attentionPreferences.ts` | Current UI requires `useAuth` and account-keyed localStorage preferences. Calculations consume real Focus records and current planning relationships. | Allocation setup, validation, evidence and week balance. B needs an explicit memory-only preference boundary without weakening the production gate. Never fake a session or seed completed Focus durations to make it look populated. |
| Analytics: `src/pages/Statistics.tsx`, `src/components/analytics/*`, `src/engines/AnalyticsEngine.ts`, `AnalyticsInsightEngine.ts` | Task/Goal/Month/Week contexts and subscribed History. Pure derived charts/reports; Recharts presentation. | Period and metric selection, history/XP/priority charts and comparison. Suitable for C using only real demo events. Focus time must not be inferred from task counts or Google events. Not routed in A. |
| Deterministic ATLAS: `src/atlas/orchestration/AtlasAIOrchestrator.ts`, `src/atlas/state/useAtlasCanonicalState.ts`, `src/components/atlas/AtlasInteractionPage.tsx` | Deterministic package reads canonical state with no provider call. Full interaction page also mounts `useAtlasMemory` (repository absent from current demo services), `useAtlasActions` and provider/candidate integrations. | Existing Dashboard priorities/insight remain real deterministic outputs and update with canonical state. Full Ask ATLAS is not safe to route wholesale; C should reuse grounded presentation with explicit read-only boundaries. No hosted AI, Ollama requests, provider fallback calls or action proposals are enabled in A. |
| Calendar: `src/pages/Calendar.tsx`, `src/components/calendar/{CalendarGrid,CalendarHeader,DayPanel,CreateGoogleCalendarEvent}.tsx` | Task dates plus `GoogleCalendarContext`; page embeds exact-approved event-creation UI backed by connector/action infrastructure. | Local Task-date presentation can be considered in D with an explicitly disconnected external boundary. No fake connected calendar, OAuth, external events or writes. Not routed in A. |
| Existing demo infrastructure: `real-app-demo/{DemoApplication,DemoDomainProviders,bindings,repository,fixtures,servicesContext}.*`, `vite.real-app-demo.config.ts` | Actual AppShell/Sidebar, domain providers and engines; cloned memory cells, memory-only appearance, signed-out auth binding, disconnected Calendar binding. Vite rejects real auth/database/account/provider transports and ignores environment files. | Dashboard, Planning and Tasks already interactive in V2.1. A adds Habits and Focus to the same canonical synthetic state. Existing immutable seeds have no completion/focus history. Reload constructs fresh repositories. |

## Integration sequence and visitor experience

1. **A (this candidate): Focus + Habits.** Follow an existing or visitor-created linked Task into the actual Focus screen. Ending time creates one real zero-XP system event; completing the Task remains a separate explicit choice through `PlanningExecutionContext`. Habits form a parallel daily flow with real date validation, history, archive/restore and no added XP policy.
2. **B: Reviews + Reality Mirror.** Use only the events/durations recorded by those interactions. Reuse real Review components and report engines; provide a reviewed ephemeral preference interface for account-bound Reality Mirror and Focus History rather than fabricating authentication. Preserve incomplete-history caveats.
3. **C: Deterministic ATLAS + Analytics.** Reuse real report/presentation components and canonical selectors. Resolve Memory/action/provider coupling before enabling full ATLAS UI. Start read-only, without language-model calls or mutation proposals.
4. **D: Calendar and further experiences.** Start with genuine Task dates. Keep external context clearly disconnected and unavailable; never simulate a live Google connection.

No order change is needed. B depends on genuine evidence produced in A; C can explain that same evidence. Existing genuine screenshots remain available on the published/readme branches. No new preview UI was added in A because it would dilute this bounded integration; unsupported navigation continues to explain its limitation.

## Implementation boundaries

- No new domain engine, timer formula, streak formula, XP award policy, authentication path, backend or durable repository.
- `DemoFocusController` implements the screen's existing controller contract using `createFocusSession`, pause/resume/elapsed functions and `recordFocusCompletion`. Its `demo-memory-only` field is a synthetic session namespace, never a Supabase owner/session. State exists only in the page's memory.
- End calls are coalesced. Missing/completed Tasks are rejected or invalidate the session. Audit acknowledgement failure does not close the session or announce success. Delayed work is fenced to its original History repository; deactivation prevents late UI publication. An already-dispatched memory audit may still finish; unmounting does not reverse it.
- `appendConfirmedForRepository` confirms the memory repository's returned snapshot only. Neither the adapter nor the repository claims local durable/cloud persistence; existing `waitForPersistence` methods continue to reject those claims.
- Real `HabitExecutionProvider` replaces the old unavailable Vite binding; actual Habit mutations flow through its trusted engines into the same memory History ledger used by Tasks and Focus.
- The Focus end prompt previously lacked keyboard management. It now opts into the existing native Modal. A new `dismissOnBackdrop` flag defaults false for all other callers and preserves Focus's old backdrop cancellation. No mutation/approval semantics changed.
- Quick Capture and the authenticated Focus History explorer remain unavailable and are explicitly labelled in the notice. Capture attempts throw rather than reporting a false save. Auth remains signed out and no fake identity is introduced.
- The historical five-test V1 fixed-snapshot presentation proof remains isolated. Mounted integration tests use real current providers; the old test-only unavailable bindings are not the production bundle's Habit path.
- CI retains the 952 existing-test gate and zero-skipped checks; the separate demo gate grows from 17 to 27 because ten additional integration cases are included. Only the additional Focus lint path is added; triggers, permissions, actions, secrets and deployment behavior are unchanged.

## Required verification before release

Run all 952 existing tests; all 27 demo tests; scanner self-tests; application/test/demo typechecks; focused lint; normal and isolated builds; source, client-bundle and demo isolation scans; whitespace. Verify actual browser Habit create/complete/uncomplete/archive/restore/monthly state, Dashboard cross-state, real Focus time/pause/end cancellation/explicit Task completion, actual keyboard containment, Light/Dark at 390/768/1366, and reload reset. JSDOM's modelled dialog is not native-browser proof.

No cloud, real user, public fixture or external account is involved. Public release, remote CI, reviewed Git operations and physical-device/browser certification remain separate gates. Existing public demo limitations continue to apply until an approved replacement deployment.

## Verification evidence

Results will be recorded after the final native-browser and regression gates; do not infer completion from this plan.

### Executed verification — October 27, 2026

| Gate | Result |
| --- | --- |
| Existing deterministic suite | 952/952, zero failed/cancelled/skipped, against the final Focus/modal implementation |
| Demo integration | 27/27: all original 17 plus ten new Habit/Focus cases; zero failed/cancelled/skipped |
| Scanner self-tests | 10/10 passed |
| TypeScript | Application/node (`tsc -b`), tests and strict demo checks passed |
| Builds and isolation | Normal and ordinary isolated demo builds passed; 23 normal bundle files, 474 tracked sources, new files and demo component/import/credential checks passed |
| Lint / CI / whitespace | Focused ESLint, cached verified Actionlint (optional shellcheck/pyflakes unavailable), tracked whitespace and new-file whitespace checks passed |
| Runtime | Actual local browser on loopback port 5191. Not the public deployment and not an authenticated test account. |

The two initial new error-message tests exposed the test loader's separate VM `Error` constructors. Modules in a real browser share that constructor. Supplying the shared host `Error` in the existing VM harness corrected the mismatch; failure-state assertions were retained. The session stayed open and no success was announced even before this harness correction.

Actual browser flows passed: Dashboard Habit toggle -> Habits; creation of one synthetic habit; monthly completion; uncompletion; archive/restore retaining the existing history; Dashboard summary updates with zero Habit XP. The seeded Task opened in real Focus Mode with its actual Goal/Month/Week relationship. Pause held at 00:00:44 throughout the layout tests; resume/end recorded 00:00:45 of actual unpaused focus, leaving the Task open and XP unchanged. A separate session followed by explicit Complete Task updated the real Tasks Done view/Planning and awarded the existing 25 XP. Dashboard deterministic priorities then advanced to the next real pending Task. No fabricated completion or focus-duration seed was introduced.

Native keyboard/browser proof passed at 390x844, 768x1024 and 1366x900 in Light and Dark: Tab/Shift+Tab wrapping inside the real modal, native :modal state, Escape cancellation and opener focus restoration. Continue focusing cancels without an audit. Eighteen Focus/Habits/Dashboard layout/theme states were measured/captured with no document/main horizontal overflow; the original Habit tracker uses intentional internal horizontal scrolling. Physical touch hardware, Safari and assistive-technology certification remain untested.

Two reloads, including abandoning a running session, restored the exact visible seed: 3 Tasks, 0 completed, 2 scheduled Habits, 0 completed, XP 0; the created Habit and active Focus session disappeared. These are intentional demo resets, not production reload-recovery semantics.

The existing verification-mode resource observer recorded only same-origin loopback JS/CSS during actual Habit and Focus interactions, with no CSP violations or browser warnings/errors. This is bounded resource timing, not a complete packet capture. The ordinary build was then restored, rebuilt and checked: no observer or diagnostic UI remains in the final bundle. The unchanged CSP blocks backend connections; the build's real transport/provider rejection remains enabled. Local Vite preview does not apply Cloudflare _headers; no new hosted-header claim is made.

Evidence: 24 layout/modal screenshots plus outcome/mobile-entry captures, `v26-browser-evidence.json`, and `v26-network-evidence.json` under the task's external visualizations directory. None is staged or deployed.

The normal and demo builds retain the Vite >500 kB chunk warning. Demo JS is about 902 kB before gzip (about 239 kB gzip); this is not hidden or silenced. No bundle optimization or unrelated redesign was added.

### Changed-file inventory

Eleven tracked modifications and three new files, empty index:

```text
M .github/workflows/ci.yml
M real-app-demo/DemoApplication.tsx
M real-app-demo/DemoDomainProviders.tsx
M real-app-demo/bindings.ts
M real-app-demo/index.html
M real-app-demo/planningTasks.test.ts
M real-app-demo/repository.ts
M scripts/verify-real-app-demo.mjs
M src/components/ui/Modal.tsx
M src/focus/FocusMode.tsx
M vite.real-app-demo.config.ts
? docs/real-demo-expansion-v26.md
? real-app-demo/focusController.ts
? real-app-demo/useDemoFocusSession.ts
```

No package/lockfile, authentication, production provider, schema, RLS, PowerSync or Google Calendar implementation was changed. CI's branch allowlist was not expanded; remote CI on this new branch requires a separately reviewed trigger decision.

### Preservation and release decision

All eight pre-existing worktrees retain their recorded branch/HEAD/status counts and empty indexes: original LifeOS 5 changes; Daily Planning 10; rejected showcase 12; lifecycle, outcome/recovery, receipts, published demo and documentation worktrees clean. No edit command targeted their source files. An interruption cleared the in-memory pre-edit hash snapshot; therefore this report does not claim a recoverable before/after hash comparison of the already-dirty files. Current hashes are recorded externally for subsequent checks.

The public demo's HTML still matches the previously published SHA-256 `7BC31C0DD3E6B2653C3BF4EDA9D0F29CEADFD80D3785814DFA74352277A5827E`. README PR #1 is not merged by this checkpoint. No commit, stage, push, deployment, infrastructure or live-data operation was performed.

GO for review of this local Checkpoint A candidate. A separate authorization is needed for Git checkpoint/remote CI/publication. The next implementation is B (Reviews and a reviewed memory-only preference/presentation boundary for Reality Mirror/Focus History), using visitor-generated events from A; do not enable it in this commit candidate.

### Module-specific gates for subsequent checkpoints

- Reviews: real period/date navigation, browser-local timezone boundaries, incomplete-history/empty states, correct event classification, and canonical Task/Habit/XP totals after edits/undo.
- Reality Mirror/Focus History: explicit memory-only preference injection without inventing authentication; allocation validation, current-vs-historical relationship limitations, exact pause-aware recorded duration totals, overlap/conflict exclusion, account-only sync wording removed only through a reviewed presentation boundary.
- Analytics: real metric/period controls, missing or invalid dates, no-data charts, historical/partial coverage caveats and event-derived XP; never infer duration from completions.
- Deterministic ATLAS: actual Fact Core/citations from current demo state, no Memory repository fallback, no provider transport imports/calls, no action authority, correct refresh/cancellation/stale-state handling.
- Calendar: genuine Task-date rendering and timezone/month navigation, explicitly disconnected Google context, no OAuth/create controls becoming actionable, and build/runtime rejection of external endpoints.

A's tests and browser evidence do not certify those unintegrated modules.
