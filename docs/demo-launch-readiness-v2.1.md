# Real application demo — release readiness V2.1

Local release candidate only. No commit, public hosting, Git integration or cloud operation is authorized by this document. The verified live URL is **pending separate deployment approval and post-deployment verification**.

## Product and boundaries

The demo uses the actual Dashboard, Planning and Tasks pages and their real providers/engines, with synthetic memory repositories. Authentication is signed out, there is no account owner, backend or durable persistence, and a reload resets all fictional records and XP. Unsupported pages/actions explain their limits. Normal production authentication, repository defaults, RLS, PowerSync and Calendar security are unchanged.

See the historical [V1](real-application-demo-integration-v1.md) and [V2](real-planning-tasks-integration-v2.md) evidence. V2's Goal-modal Escape limitation is addressed here; those documents describe the state when those checkpoints ran.

## Modal correction and failure diagnosis

The original shared Modal used an ARIA-labelled overlay without a dismissal callback or keyboard management. GoalModal now passes its existing reset-and-close cancellation callback. Shared Modal opts into native `showModal()` only when that callback is supplied; MonthlyTargetModal and TaskModal retain the original overlay contract. Native modality blocks background interaction. Escape follows cancellation, never creation. Initial focus moves to a real form control; boundary Tab/Shift+Tab wrap locally; closing restores a connected, enabled opener. Nested cancel/key events are fenced to their owning dialog. No global keyboard listener, dependency or domain mutation is added. Goal fields now have programmatic labels.

The interrupted command was `node --experimental-strip-types --test real-app-demo/planningTasks.test.ts`. Reproduction showed `ReferenceError: HTMLElement is not defined` during VM-loaded modal cleanup, plus ReactDOM legacy input-event errors (`attachEvent`/`detachEvent` not functions). The test VM had omitted HTMLElement, and ReactDOM was imported before the JSDOM document existed. The fix exposes the same test-window HTMLElement and dynamically imports ReactDOM after DOM setup. No event shim, assertion suppression or production workaround is used. JSDOM models showModal/close only; actual native behavior is checked separately in the browser.

## Reproducible verification

```powershell
$testFiles = @(git ls-files 'tests/**/*.test.ts')
node --experimental-strip-types --experimental-specifier-resolution=node --test @testFiles
node --experimental-strip-types --test real-app-demo/integration.test.ts real-app-demo/planningTasks.test.ts
node --test scripts/ci/security-check.test.mjs
npx tsc -b
npx tsc --noEmit -p tests/tsconfig.json
npx tsc --noEmit -p real-app-demo/tsconfig.json
npm run build
npx vite build --config vite.real-app-demo.config.ts
node scripts/ci/security-check.mjs source
node scripts/ci/security-check.mjs bundle
node scripts/verify-real-app-demo.mjs
npx eslint real-app-demo src/App.tsx src/components/AppShell.tsx src/components/tasks/UniversalTaskTable.tsx src/components/ui/Modal.tsx src/components/planning/GoalModal.tsx src/theme/ThemeProvider.tsx vite.real-app-demo.config.ts scripts/verify-real-app-demo.mjs
git diff --check
```

The established deterministic baseline remains 952. Demo integration tests are separate; CI test-count checks are not weakened. Pattern scanners have limited coverage and do not prove absence of every possible secret. A verification-mode build can expose read-only resource timing; rebuild without that mode before packaging, and require the scanner to confirm the observer is absent.

Final commit review pinned the shell-equivalence regression to the pre-extraction commit `b3147b18d8f6840c73ff5486db993dceed3ca9f7`, rather than moving HEAD. It therefore continues to compare the real original App after the release candidate is committed; no assertion or test count changed.

## Static hosting plan — Cloudflare Pages Direct Upload

Official documentation checked October 26, 2026:

- [Direct Upload](https://developers.cloudflare.com/pages/get-started/direct-upload/): upload a prebuilt folder through the Dashboard, without GitHub integration. Dashboard upload allows 1,000 files, each at most 25 MiB. A Direct Upload project cannot later switch to Git integration; a new project would be needed.
- [Pages limits](https://developers.cloudflare.com/pages/platform/limits/): Free-plan limits include 20,000 site files and 25 MiB per asset. The much smaller demo is suitable in principle; the actual account's availability, quota and no-charge selection must still be confirmed at creation. No paid plan is required by this design or approved here.
- [Serving Pages](https://developers.cloudflare.com/pages/configuration/serving-pages/): without a top-level 404.html, Pages serves the SPA entry for unmatched paths. The demo uses in-memory page selection, not URL route persistence: reload and direct navigation intentionally return to Dashboard. Base is `/` and generated JS/CSS use `/assets/…`. Use a root Pages domain rather than a subdirectory.
- [Headers](https://developers.cloudflare.com/pages/configuration/headers/): `_headers` is parsed by Pages. The demo's public folder supplies CSP (including connect-src none and frame-ancestors none), no-referrer, nosniff, frame denial and disabled camera/microphone/geolocation/payment. Fingerprinted `/assets/*` receive immutable one-year caching; HTML uses Pages' default revalidation. Do not add a cache-everything rule or service worker.

### Exact procedure after separate approval

1. Review and authorize the final release-candidate commit separately. Run the commands above from the real-demo worktree. Never provide production environment variables; `envDir: false` and import guards isolate the build.
2. Confirm the final ordinary artifact is `dist-real-app-demo`, with index.html, component-manifest.json, `_headers`, hashed local JS/CSS only. No verification observer, source maps, credentials, Functions or `_worker.js` may be present. Do not upload `dist`, source code, `.env`, local evidence or the repository root.
3. In the intended Cloudflare account, choose Workers & Pages → Create application → Pages/Direct Upload (Dashboard labels may change). Confirm account ownership, available Free plan, proposed project name `lifeos-real-demo`, and no charge. Stop for explicit authorization before resource creation or publishing. Do not connect GitHub.
4. After that authorization, upload only the final `dist-real-app-demo` folder. Publish once, record the real issued URL, and verify HTTPS, MIME types, CSP/security headers, asset caching and SPA fallback on the hosted origin. Do not bypass browser warnings.
5. Run the six viewport/theme checks, keyboard/modal interactions, synthetic creation/execution, reload reset and request-origin review against the hosted site. Local Vite preview does not apply Cloudflare `_headers`; local success is not hosted-header proof.
6. Only after hosted verification, replace the README's pending URL text with the verified address in a separately reviewed update. Keep the synthetic limitations visible. If validation fails, stop publication/promotion and use the last reviewed deployment or remove the new public site with explicit authorization; do not patch production LifeOS.

No backend, secrets, database, OAuth, paid domain, GitHub connection or Pages Functions are needed. Account creation/terms acceptance and final public deployment remain human authorization gates. Physical-device Safari and screen-reader certification are outside local desktop-emulation evidence; a quick phone smoke test is recommended after hosting.

## Verification results and inventory

Results, screenshots, exact file inventory and remaining gates are recorded after the recovery verification below. No success should be inferred for checks not explicitly completed.

### Executed recovery verification — October 26, 2026

| Gate | Observed result |
| --- | --- |
| Existing tracked deterministic tests | 952/952 passed, zero failed/skipped; original discovery/count contract unchanged |
| Demo tests | 17/17 passed: five V1, six V2, six modal/accessibility/compatibility cases |
| Scanner self-tests | 10/10 passed |
| TypeScript | Application (`tsc -b`), tests and strict demo checks passed |
| Builds | Normal production and isolated ordinary demo passed; normal app retains its existing large-chunk warning |
| Lint/whitespace | Focused changed-code lint and tracked/untracked text whitespace checks passed; no claim of repository-wide lint cleanup |
| Scans | 451 tracked sources, 23 normal client output files, four demo text assets plus `_headers` and all new demo source/document files passed bounded pattern/isolation checks |
| Artifact | Five files; largest is hashed JS, 493,616 bytes; no environment file, Worker, Function, source map or backend SDK; normal observer absent |
| Protected worktrees | Six worktrees matched the recovery-session branch/HEAD/index/status and SHA-256 baseline for every pre-existing dirty/untracked file |

### Real browser evidence

Actual Chromium desktop-browser interactions, not JSDOM, verified Dashboard/Planning/Tasks and original navigation in all 18 page × width × theme combinations: 390×844, 768×1024, 1366×900, each in Light and Dark. Document/main widths showed no page overflow. Task filters use intentional internal horizontal scrolling on phones; the real Task table remains keyboard-scrollable at tablet width. Six additional Goal-modal screenshots show the same original design, with all controls within the checked viewport.

At each width/theme, a typed unsaved Goal draft was dismissed with actual Escape; focus returned to New Goal, reopening showed an empty draft, and Cancel closed without creating data. Actual Shift+Tab on the first field reached Create Goal; Tab on Create Goal returned to the title field. The active dialog matched `:modal`, the accessibility tree excluded background controls, and hit-testing a background navigation button returned DIALOG rather than the button. No synthetic creation/submit occurred on dismissal. Native initial focus first landed on the scroll container; the verified correction now explicitly focuses a form control after showModal.

Additional real flows passed: Goal creation, dated Goal timeline, legacy Monthly Outcome dialog Cancel and creation, Weekly Focus creation, linked Task creation, Task search, Done filter, mobile Overdue/Upcoming empty states, Task completion/uncompletion and Dashboard consistency. Completing seed Task 1 produced the existing 25-XP award; undo retained it under the original anti-farming rules. Native date filling alone did not update React's selected-date display through the browser automation tool; changing the date with actual ArrowUp/ArrowDown committed it, and the resulting Dec 31 target appeared correctly in the timeline. This is documented as an automation-input limitation, not evidence of a product data-loss defect.

Two subsequent ordinary-bundle reloads each restored three Tasks, zero completed, zero XP and the original seed. Modal/fixture mutations were memory-only. The Sidebar opened on mobile and actual Escape closed it; unavailable Calendar navigation reported no action. Browser logs contained no errors/warnings during the corrected run. Verification-mode resource timing recorded only loopback JS/CSS, with no other origins or CSP violations. That evidence is bounded resource timing, not a packet capture. The final normal bundle was rebuilt and verified to omit the observer. Local `/planning` direct navigation served the SPA and intentionally displayed Dashboard; this demo has no persistent URL route state.

Nested dismissal/focus ownership and disconnected-opener handling passed mounted component regressions with modeled dialog APIs. No nested-dialog product flow exists in the three demonstrated pages; a live arbitrary multi-dialog stack or another browser engine is not certified. Existing callers without `onClose` retain their original overlay behavior; the actual Monthly dialog was exercised in the browser. TaskModal is not exposed by the demonstrated inline Task creation path, so its compatibility is established by the unchanged legacy branch/type/build checks, not a claimed live TaskModal proof. Physical touch hardware, Safari and screen readers remain untested.

All 24 matrix/modal screenshots are retained outside Git under `lifeos-release-v21` in the authorized visualizations directory. Two actual baseline screenshots are included in `docs/images` for the README. No account, production service or private data was opened.

### Exact pending Git inventory

HEAD `b3147b18d8f6840c73ff5486db993dceed3ca9f7`, branch `feat/real-application-demo-integration-v1`, empty index. Seven tracked modifications and 23 new files (combined V1/V2/V2.1):

```text
M .gitignore
M README.md
M src/App.tsx
M src/components/planning/GoalModal.tsx
M src/components/tasks/UniversalTaskTable.tsx
M src/components/ui/Modal.tsx
M src/theme/ThemeProvider.tsx
? docs/demo-launch-readiness-v2.1.md
? docs/images/lifeos-demo-planning-v21.jpg
? docs/images/lifeos-demo-tasks-v21.jpg
? docs/real-application-demo-integration-v1.md
? docs/real-planning-tasks-integration-v2.md
? real-app-demo/DemoApplication.tsx
? real-app-demo/DemoDomainProviders.tsx
? real-app-demo/DemoScope.tsx
? real-app-demo/bindings.ts
? real-app-demo/fixtures.ts
? real-app-demo/index.html
? real-app-demo/integration.test.ts
? real-app-demo/main.tsx
? real-app-demo/planningTasks.test.ts
? real-app-demo/public/_headers
? real-app-demo/repository.ts
? real-app-demo/scopeContext.ts
? real-app-demo/servicesContext.ts
? real-app-demo/style.css
? real-app-demo/tsconfig.json
? scripts/verify-real-app-demo.mjs
? src/components/AppShell.tsx
? vite.real-app-demo.config.ts
```

V2.1 touches only the real GoalModal/shared Modal, existing demo regression test/scanner, README, this guide, demo `_headers` and two screenshots. It adds no product module, dependency, authentication shortcut or alternate domain authority. All earlier uncommitted work remains. Nothing is staged, committed, pushed, merged or deployed.

### Decision and remaining gates

**GO for separately authorizing a reviewed release-candidate commit.** No local test remains failing. This is not a claim that a public deployment exists or has passed hosted checks. Before publication: confirm the intended Cloudflare account's Free-plan availability/name, authorize resource creation/final upload, then verify issued HTTPS URL, actual applied headers/cache behavior, SPA assets and browser interactions on that origin. README live URL remains pending. Existing hosted CI does not discover the separate demo test directory; run the documented demo checks for each release and review any future CI integration separately. No public URL, paid resource or production mutation is required to complete this local checkpoint.
