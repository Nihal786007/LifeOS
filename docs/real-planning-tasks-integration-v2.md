# Real Planning + Tasks Integration V2

This checkpoint extends the uncommitted real shell/Dashboard V1. It renders the actual production Planning and Tasks pages without copying their JSX or changing their domain logic. It is an anonymous synthetic demonstration, not an authenticated account or a cloud-persistence proof. No deployment is included.

## Composition and authority

`DemoDomainProviders` composes the existing Task, PlanningState, LifeGoals, MonthlyPlanning, WeeklyPlanning, Habit and PlanningExecution providers. The actual `useAtlasCanonicalState` reads those providers and the actual `ExecutionHistoryService`. PlanningMutationEngine, GoalPlanningMutationEngine, ExecutionCoordinator/Kernel and XPAutomationEngine remain the only domain mutation paths.

The isolated Vite build replaces `DataServicesContext` with a typed context containing memory implementations of the existing asynchronous repository ports. The repositories clone values and publish repository events; they contain no planning, completion, relationship or XP rules. Persistence receipt methods reject durable/cloud claims. History is configured/released through its existing service contract. StrictMode initialization is covered by mounted tests.

No new production composition seam is needed in V2. The V1 shared AppShell extraction and optional ThemeProvider storage port remain unchanged. One presentation correction in the actual UniversalTaskTable changes its clipping wrapper to a labelled, keyboard-focusable horizontal scroll region: at 768px the original desktop grid hid its Due/Status/Actions columns. No rows or domain behavior changed. The demo's profile and empty Captures use fixed synthetic bindings; Task/Planning/canonical selectors no longer use the V1 read-only mock hooks. Habit execution and other modules remain explicitly unavailable.

Windows resolver paths are normalized to forward slashes so alias and direct imports share one React services context. The first browser build exposed a duplicate-context failure; the corrected build and module-manifest check verify a single services context.

## Real components and interactions

- Planning, LifeGoalPlanner, PersonalPlanner, PlanningSummary, goal/month/week controls and their original modals.
- Tasks, UniversalTaskTable/Row and the original search, All/Today/Overdue/Upcoming/Done filters and Task creation controls.
- Existing AppShell, Sidebar, DailyCommandCenter, Capture inbox/FAB, ThemeProvider and application styles.
- Goal and Personal month/week creation, title editing, linked/standalone Task creation and Task completion/uncompletion use the original commands. No alternate mutation engine is installed.
- Dashboard updates from the same canonical providers. Completing seed Task 1 records 25 XP. Existing rules retain earned XP on uncompletion, emit a zero-XP undo event and prevent a second award when it is completed again. Reload resets all demo history and XP.

The initial dataset has three active Tasks, two Goals, two Monthly Outcomes, two Weekly Focus items, two read-only Habits, and zero History/Captures/XP. All dates are generated for the visitor's current day/week/month. IDs and goal→month→week→task relationships are synthetic and valid. Every reload creates a fresh memory repository set. There is no Supabase user, PowerSync owner or fake session.

## Isolation

The build loads no environment files and rejects authentication, account/cloud/database implementations, Supabase/PowerSync SDKs, live Calendar transports and AI providers. CSP denies network connections and form submissions. Calendar date mapping and pure DTO validators are the only Calendar modules allowed. The UI clearly labels synthetic data and reload reset. Other navigation destinations, Focus, Habits execution, Capture, ATLAS and Google functionality report limitations rather than pretending to execute.

`component-manifest.json` and `scripts/verify-real-app-demo.mjs` verify real pages/providers/engines, one services context, absence of live implementations, credential patterns and backend endpoints. A separate verification-mode resource observer is read-only and excluded from the ordinary bundle. No browser storage or backend connection is needed.

## Verification procedure

```sh
node --experimental-strip-types --test real-app-demo/integration.test.ts real-app-demo/planningTasks.test.ts
npx tsc -b
npx tsc --noEmit -p tests/tsconfig.json
npx tsc --noEmit -p real-app-demo/tsconfig.json
npm run build
npx vite build --config vite.real-app-demo.config.ts
node scripts/verify-real-app-demo.mjs
npx eslint real-app-demo src/App.tsx src/components/AppShell.tsx src/theme/ThemeProvider.tsx vite.real-app-demo.config.ts scripts/verify-real-app-demo.mjs
git diff --check
```

Run all tracked `tests/**/*.test.ts` separately with the existing Node runner; the established 952-test baseline and CI are unchanged. Five V1 fixed-presentation tests remain intact. Six additional tests mount actual domain providers/engines and pages: StrictMode hydration/relationships, completion/history/XP/undo/anti-farming, hierarchy/Task creation and rename, invalid input handling, Tasks Done filter and shared Planning state, and fresh-storage reset/no persistence claims. They use JSDOM only; they are not browser proof.

Browser verification uses only local synthetic data. Check actual Planning and Tasks at 390/768/1366 in Light/Dark, original mobile navigation/Escape, search/filters, linked Task creation, month editing, Personal month/week creation, Goal modal cancellation/creation, shared Dashboard state and reload reset. Save screenshots outside Git. Desktop viewport emulation is not physical-phone or assistive-technology certification.

## Known presentation limitations

The unchanged Life Goal modal supports Tab navigation and Cancel but Escape did not close it in the real browser. Its wider focus-management behavior is not certified. Personal Planner inline editors support Enter/Escape. This is an existing production-component limitation, not a replacement demo dialog. A separate accessibility checkpoint is recommended before a public launch. Task filter tabs intentionally scroll horizontally on narrow screens; the page/main must not overflow. Long Task names use the original truncation behavior. The Sidebar's existing static builder identity is original UI copy, not an authenticated demo identity.

Task editing is available only where the original page exposes it; this checkpoint adds no new edit affordance. Domain update validation is covered by the actual provider test. No durable persistence, cross-device synchronization, Google operation or AI execution is claimed.

## Release boundary

Only the authorized real-demo worktree may change. Preserve all six other worktrees, empty Git index and starting HEAD. Do not stage, commit, publish, deploy or connect live services. Stop after Planning + Tasks; any next integration or public launch needs a separate checkpoint.

## Executed results — October 26, 2026

- Existing deterministic suite: 952/952, zero failed/skipped. V1 presentation tests: 5/5. New mounted V2 tests: 6/6. Scanner self-tests: 10/10. Test discovery remains unchanged; demo tests are run separately.
- Application, test-project and strict demo TypeScript passed. Normal and isolated demo production builds passed. Focused lint, whitespace and credential-pattern checks passed. Normal client scan: 23 output files; tracked source scan: 451 files; demo scan: four output files plus all new demo sources. Pattern scanners have bounded coverage and are not a proof that every possible secret format is detected.
- Browser checks used the actual pages and controls: search isolated the calculus Task; Overdue showed its empty state; completion changed Dashboard to one completed Task/25 XP; undo reopened it with the existing retained-XP rule. Planning created a linked Task, edited a Monthly Outcome, created a Personal Monthly Outcome/Weekly Focus, and created a Goal. Cancel preserved state; Tab moved between the Goal fields. Escape did not close that existing Goal modal. Mobile navigation Escape did close the original Sidebar.
- Both pages were captured at 390/768/1366 in Light/Dark. Document/main content widths matched viewport/container widths in all twelve combinations. The tablet table defect was corrected in the actual shared component; native ArrowRight scrolling reached scrollLeft 240 in a 718px viewport over 958px content, and its Delete controls were then visibly inside the region. Phone filter tabs retain their deliberate internal horizontal scrolling. Modals fit the checked 390px viewport.
- After completion, two reloads each restored three Tasks, zero completed and zero XP; Planning again showed two Goals, two Monthly Outcomes and two Weekly Focus items. Mounted tests also verify fresh history is empty. No cloud synchronization is claimed.
- Verification-mode resource timing recorded only local JavaScript/CSS from loopback, with no other origins or CSP violations during checked Task/Planning interactions. This is bounded browser evidence, not a packet capture. The normal bundle was rebuilt, its observer absence scanned, and the browser confirmed that the diagnostic output was absent. The initial duplicate-context error belongs to the superseded first build; no further errors were observed from the corrected assets.
- Six protected worktrees exactly matched their saved HEAD, branch, index, full status inventory and SHA-256 hashes of every pre-existing changed/untracked file. Original: five preserved changes; Daily Planning: ten; rejected showcase: twelve; lifecycle/outcome/receipts: clean. Authorized worktree HEAD remains `b3147b18d8f6840c73ff5486db993dceed3ca9f7`, with empty index. No Git publication or cloud operation occurred.

### V2 file scope

New: `real-app-demo/DemoDomainProviders.tsx`, `real-app-demo/servicesContext.ts`, `real-app-demo/planningTasks.test.ts`, this document.

Updated from the uncommitted V1: `real-app-demo/DemoApplication.tsx`, `real-app-demo/repository.ts`, `real-app-demo/integration.test.ts` (historical harness comment only), `real-app-demo/index.html`, `vite.real-app-demo.config.ts`, `scripts/verify-real-app-demo.mjs`.

Presentation correction: `src/components/tasks/UniversalTaskTable.tsx`.

Combined V1+V2 pending scope is four tracked modifications and nineteen new files. No dependencies, lockfile, CI, auth, security policy or backend architecture changed. Local preview remains loopback-only on port 5190. Screenshots are outside Git in the authorized visualizations directory under `lifeos-planning-tasks-v2`.

Verdict: GO for review of the bounded Planning + Tasks integration and planning a separately authorized next integration. This is not a public-launch accessibility certification: the original Goal modal Escape/focus limitation needs a separate decision, and unsupported modules remain unavailable.
