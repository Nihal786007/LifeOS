# LifeOS CI V1 (validation only)

The workflow is `.github/workflows/ci.yml`. It runs on pushes to
`security/google-calendar-disconnect-v3` and pull requests targeting `main`.
PRs check GitHub's synthetic merge commit by default. No main-push trigger,
privileged `pull_request_target`, deployment, release or artifact upload is used.
This is a local candidate until separately approved, committed and pushed; no
hosted pass or green badge is claimed yet.

## Runtime and permissions

One `ubuntu-24.04` GitHub-hosted job, twenty-minute timeout and cancellation of
superseded runs per ref. Node **24.18.0** matches the validated local runtime and
satisfies the locked Vite 8/ESLint 10 engine requirements. Deno **2.9.6** uses the
previously validated pinned npm distribution. Both GitHub-maintained actions are
pinned to reviewed commit SHAs; re-review action metadata when updating pins.

Only `contents: read` is granted. Checkout does not persist Git credentials.
No repository/environment secrets, OIDC, private registries, cloud accounts or
production endpoints are configured. The optional npm cache contains downloaded
public packages only, not node_modules, environments, Deno state, databases or
backup data. Dependency lifecycle scripts are disabled; the current lock's only
install-script package is platform-specific optional fsevents, not needed here.
Changing install requirements needs review, not silently enabling scripts.

Untrusted PR code runs only in this read-only, secret-free context. Dependency
downloads and Deno type resolution require public registry access; that is not
permission to contact production or run live tests. Do not later inject secrets
or switch to `pull_request_target` to work around fork failures.

## Checks

1. Tracked-source artifact/credential-format scan before dependencies execute.
2. `npm ci --ignore-scripts --no-audit --no-fund`, then package/lockfile integrity.
3. Ten CI scanner self-tests, application/config TypeScript, and test typecheck.
4. Every tracked `tests/**/*.test.ts` via the existing Node TypeScript/test flags.
   Current baseline is **840/840**, including all **129 Calendar/security** cases;
   Calendar is not unnecessarily rerun as a second CI suite. Explicit TAP total,
   pass and zero-skip checks fail if discovery/hosted counts drift. Investigate
   before deliberately updating the baseline when tests change.
5. Both actual native Deno entrypoints, no server started.
6. Existing focused fourteen-file Calendar/security ESLint scope plus Node syntax
   checks for CI helpers. This is not a whole-repository lint pass: the existing
   `npm run lint` baseline has **7 errors and 1 warning** outside this verified
   scope. No rule/config or application source is changed to hide that debt.
7. Production Vite build and client-bundle server-secret/private-helper scan.
8. Changed-file whitespace against the PR base/push-before SHA. On first branch
   push (zero before SHA), check the pushed commit. Full history supports ranges.

The existing nonfatal large-chunk build warning is not suppressed.

## Local commands

Use Node 24.18.0 and the committed npm lockfile in a clean checkout without private
environment files. Do not run `test:cloud-rls-live` or load `.env.local` in CI.

```text
npm ci --ignore-scripts --no-audit --no-fund
node scripts/ci/security-check.mjs source
node --test scripts/ci/security-check.test.mjs
npx --no-install tsc -b
npx --no-install tsc --noEmit -p tests/tsconfig.json
npm run build
node scripts/ci/security-check.mjs bundle
git diff --check
```

Full suite in Bash (the workflow also asserts its TAP counts):

```bash
mapfile -d '' test_files < <(git ls-files -z 'tests/**/*.test.ts')
node --experimental-strip-types --experimental-specifier-resolution=node --test "${test_files[@]}"
```

PowerShell equivalent:

```powershell
$testFiles = @(git ls-files 'tests/**/*.test.ts')
node --experimental-strip-types --experimental-specifier-resolution=node --test @testFiles
```

Native checks, identical flags/paths to earlier verification:

```text
npx --yes --package=deno@2.9.6 deno check --no-config --no-lock --node-modules-dir=none supabase/functions/google-calendar/index.ts supabase/functions/google-calendar/maintenance-entry.ts
```

The workflow lists the exact focused ESLint paths. The existing
`npm run test:google-calendar` covers V1/V2 only; the full deterministic command
also includes Disconnect, Maintenance and RPC tests. No package scripts are renamed.

## Failure handling and limits

Read the first failing step; reproduce with matching versions and a clean lockfile
install. Never retry a live service, disable checks, add `continue-on-error` or
paste credentials into logs to make CI green. Scanner failures print fixed counts,
not matches, paths, values, lengths or digests. Inspect locally without sharing
contents. Format/filename/marker checks are bounded: they can miss unsupported
secret formats and generate false positives. They are not security certification,
full history scanning, malware/dependency auditing or a replacement for review.

All test fixtures are synthetic. CI does not run real OAuth/revocation, hosted AI,
live RLS/PowerSync, migrations, database exports/restores or actions on user data.
The **69/69 private PostgreSQL/recovery** proof remains separate local evidence;
its machine-bound harness is excluded and is not reproduced by this workflow.
A complete public, isolated PostgreSQL harness is a possible CI V2, not invented
coverage in V1. The existing floating Edge SDK major still resolves from public
registry metadata; Deno/runtime pins do not lock that whole import graph.

Windows local validation does not establish Ubuntu/hosted execution. YAML parsing
and local commands do not establish GitHub scheduling, runner availability or
repository Actions-policy permissions. Inspect the first separately authorized
hosted run, especially test discovery/counts and Linux case-sensitive imports.
No Actions/security settings are changed by this checkpoint. Production recovery
and deployment approvals remain separate and incomplete.

### Initial local verification (October 20, 2026)

A disposable source-only checkout, without private environments/recovery helpers,
completed the exact locked install and all twelve remaining shell-command steps
under Windows/Git Bash: 840 deterministic tests, the ten scanner self-tests, both
typechecks/Deno entrypoints, focused lint, build and scans passed. The Calendar
subset was independently checked at 129/129 locally, not duplicated in CI.
The build retained its large-chunk warning. Original project dependencies and
application files were not modified for this clean-install verification.

YAML 1.2 parsing with pinned `yaml` 2.8.2 and explicit trigger, permission,
action-pin, timeout and referenced-path assertions passed. No actionlint binary
was installed; this is not full actionlint or hosted validation. Read-only review
found Actions enabled for these actions, read-only repository token defaults and
first-time contributor approval required for fork runs. No setting was changed.
There is no hosted CI result until a separately approved commit/push or PR.

## Reviewed official contracts

- https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax
- https://github.com/actions/checkout
- https://github.com/actions/setup-node
- https://docs.npmjs.com/cli/v11/commands/npm-ci
- https://nodejs.org/docs/latest-v24.x/api/test.html
