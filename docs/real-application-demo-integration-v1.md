# Actual LifeOS shell + Dashboard integration proof

Status: local proof only. No publication, staging, commit, merge, deployment, user account or backend connection is authorized by this checkpoint.

Worktree: `C:\Projects\LifeOS-real-application-demo-v1`.
Branch: `feat/real-application-demo-integration-v1`.
Base: `b3147b18d8f6840c73ff5486db993dceed3ca9f7`.
The rejected showcase and five earlier worktrees are preserved separately.

## Actual components, not a reproduction

`src/components/AppShell.tsx` is the original shell markup moved from `src/App.tsx`. The production App now uses it with the same state, notification center, pages, capture FAB and modal. Sidebar and mobile-header markup, classes, content padding and scroll structure are preserved. A regression test renders the original committed App and refactored App with identical bindings and asserts exact HTML equality.

The demo imports the actual AppShell, Sidebar, DailyCommandCenter, RecentCaptures, CaptureFab, Button, ThemeProvider, theme tokens and index CSS. Dashboard, Sidebar and capture component files are unchanged. The actual ATLAS orchestrator builds the deterministic package; the original daily model and priority/domain engines derive the display.

`src/theme/ThemeProvider.tsx` accepts an optional storage port. Its production default remains `window.localStorage`. The demo passes a memory map, retaining real Light/Dark/System behavior without persistent preferences or synthetic records. The only demo CSS rule adapts the shell's outer height to the visible notice; no product typography, spacing or page styling is overridden.

The full production App cannot be the anonymous entry because it initializes Focus and provider composition and imports all other pages. This checkpoint therefore mounts its extracted shared shell with the unchanged actual Dashboard. It does not mount the production authentication entry or replace authentication with an allow-all flag.

## Demo boundary

Seven exact hook-module paths are substituted only by `vite.real-app-demo.config.ts`:

- canonical state hook;
- App context (empty captures and synthetic profile only);
- Planning and Habit execution contexts (unavailable callbacks only);
- Auth context (always signed out, no identity);
- Account context (no owner, services or sync status);
- Google Calendar context (disconnected, empty events).

These are presentation input adapters in a separate build. No Supabase session, JWT, authenticated owner or ready-account state is fabricated. The production Vite configuration does not contain these substitutions. AuthDataBoundary, auth/session logic, RLS, permission code, repositories and PowerSync are unchanged.

The existing AsyncTaskRepository contract is implemented by a read-only in-memory seed port. It returns cloned rows and rejects replacement and persistence claims. Synthetic state has three active tasks, two scheduled habits, two Goals, two Months, two Weeks, no captures/history and zero XP. Dates follow the browser's current day; the fixture is fictional and explicitly labeled. No demo writes are enabled, including task/habit completion, Capture or Focus. Clicking an unavailable action reports that nothing changed. Reload creates a fresh seed.

## Exact visible/functional differences from the normal app

1. A compact synthetic-demo notice, status message and appearance selector appear above the shell. They consume vertical space; the content/sidebar viewport is correspondingly shorter. Mobile sidebar overlay retains its original full-window behavior.
2. Greeting, task titles, priorities, planning links and counts come from fictional data. The existing sidebar's hardcoded author/footer remains unchanged; it is not evidence of authenticated identity.
3. Dashboard is the only integrated destination. All existing sidebar labels and controls remain visible; selecting another destination reports its unavailability and closes the mobile menu while retaining Dashboard selection.
4. Completion, Focus and Capture controls report unavailable; their original appearance remains. There is no false success, saved session, audit or XP award.
5. NotificationCenter is not mounted, so its floating bell/panel is absent. The actual Quick Capture FAB is present but does not open a capture workflow.
6. Google is disconnected, so the actual Dashboard correctly omits its conditional external schedule section. No calendar data is invented.
7. No execution events exist, so the actual Dashboard correctly omits its conditional progress-history panel. Capture inbox shows the genuine empty state.
8. Appearance uses memory only and resets on reload. The normal app's authentication, synchronization, adoption/recovery and other pages are not demonstrated.

No replacement Dashboard, invented navigation destination, copied planner JSX, landing page or independent action engine has been added.

## Verification commands

```sh
npm ci --ignore-scripts --no-audit --no-fund
npx tsc --noEmit -p real-app-demo/tsconfig.json
node --experimental-strip-types --test real-app-demo/integration.test.ts
npx tsc -b
npx tsc --noEmit -p tests/tsconfig.json
npm run build
npx eslint real-app-demo src/App.tsx src/components/AppShell.tsx src/theme/ThemeProvider.tsx vite.real-app-demo.config.ts scripts/verify-real-app-demo.mjs
npx vite build --config vite.real-app-demo.config.ts
node scripts/verify-real-app-demo.mjs
npx vite preview --config vite.real-app-demo.config.ts
git diff --check
```

The local preview is loopback-only at `http://127.0.0.1:5190/`. `dist-real-app-demo` is ignored. No environment files are loaded; no dependency/lockfile or CI modifications are required. The build rejects live auth, data/cloud/database/account, AI-provider and Google Calendar implementation modules. It allows only the Calendar mapper and pure DTO/disconnect validators required by the actual Dashboard's date predicate. The output component manifest records the imported source modules. CSP denies all connections, form submissions, plugins and external scripts.

The five focused tests cover production shell HTML equivalence, actual Dashboard hierarchy/model output, independent repository reads and denied writes, signed-out/no-owner boundary, and mounted completion/habit/Focus clicks that leave seed data unchanged. The existing 952-test suite is separate; no baseline assertion is changed.

Browser evidence must cover 390/768/1366, Light/Dark/System, actual mobile navigation/Escape, unsupported actions and reload reset. Compare with the genuine repository screenshot and source/render equivalence; do not claim a pixel-identical comparison against a newly authenticated production session. Screenshots use synthetic data only. Desktop emulation is not physical-device or screen-reader certification.

During local network verification, a verification-only PerformanceObserver exposes resource origins/paths into a hidden output for the browser tools. It records requests without replacing fetch or altering application requests. The ordinary build excludes that observer; the bundle scan asserts its absence. Observed resource timing plus CSP errors are bounded browser evidence, not a packet capture or proof of production infrastructure behavior.

## Executed local results

- Focused real-component tests: 5/5; original deterministic suite: 952/952, zero failed/skipped.
- Application, test-project and strict demo TypeScript checks passed. Normal application and isolated demo production builds passed. Focused lint and whitespace checks passed. The normal application retains its existing >500 kB chunk warning.
- The demo build manifest confirms actual shared shell, Sidebar, DailyCommandCenter, Capture inbox/FAB and ThemeProvider modules. Output scan passed for all four files: no live auth/database/provider implementation, backend endpoint or credential pattern; no network observer in the final ordinary bundle.
- Browser viewport matrix: 390, 768 and 1366 px, Light and Dark. Document and main scroll widths matched their content widths in all six cases. System selection resolved through the actual ThemeProvider. Original mobile menu opened, Escape closed it, and selecting an unavailable destination closed it while retaining Dashboard.
- Repeated Task completion, Habit, Focus and Capture clicks left the snapshot at 3 Tasks, 0 completed, 2 habits due, 0 habits done and 0 XP. Reload restored the initial notice and synthetic seed.
- Browser resource timing in the verification variant recorded only the local JavaScript and CSS assets from `http://127.0.0.1:5190`, with no other resource origins or CSP violations during checked interactions. No production account was opened. This is resource-timing evidence, not a packet capture. The ordinary build was then rebuilt and its observer absence verified.
- All six protected worktrees matched their before-work HEAD, branch, index, complete status inventory and SHA-256 hashes of every pre-existing changed/untracked file: original (5), Daily Planning (10), rejected showcase (12); lifecycle, outcome/recovery and receipts remain clean. No staging, commit, push, merge or deployment occurred.

Exact new files: `src/components/AppShell.tsx`; `vite.real-app-demo.config.ts`; `scripts/verify-real-app-demo.mjs`; this document; and `real-app-demo/{DemoApplication.tsx,DemoScope.tsx,bindings.ts,fixtures.ts,index.html,integration.test.ts,main.tsx,repository.ts,scopeContext.ts,style.css,tsconfig.json}`. Modified files: `.gitignore`, `src/App.tsx`, `src/theme/ThemeProvider.tsx`. Total: 15 new and 3 modified; index empty.

### Following checkpoint

This checkpoint proves the actual shell and Dashboard can render without backend services. It does not authorize all remaining pages. After review, the next smallest checkpoint is mounting the actual Planning and Tasks pages with existing canonical providers and scoped in-memory repositories, while retaining the real UI and permission boundaries. Focus, account-scoped Reality Mirror/History, ATLAS action execution and real Google functionality need separate assessment. Any module that cannot be integrated safely should use genuine screenshots with explicit limitations.
