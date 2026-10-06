# Development setup

## Install, test, build

Use Node.js 24 and npm from the repository root:

```sh
npm install
npm run test:atlas
npx tsc -p tests/tsconfig.json --noEmit
npm run build
npm run dev
```

Deterministic tests use fixtures/mock transport and need no cloud account or running model. Live scripts are separate; do not run them against personal data.

## Authenticated workspace prerequisites

There is no guest/demo workspace. Create an ignored `.env.local` with **public client configuration only**:

```dotenv
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLIC_PUBLISHABLE_KEY
VITE_POWERSYNC_URL=https://YOUR_POWERSYNC_INSTANCE
```

`VITE_*` values enter the browser bundle. Never put service-role keys, model keys, OAuth secrets, or encryption keys here. Restart Vite after configuration changes.

1. Configure Supabase Auth with exact redirects for your local origin.
2. Review/apply [Supabase migrations](../supabase/migrations) to your own project, not an unrelated existing database.
3. Configure PowerSync, the `powersync` Postgres publication, and user-scoped Sync Streams for canonical tables.
4. Configure PowerSync authentication for Supabase JWTs; every stream must scope rows by authenticated `user_id`.
5. Sign in and choose explicit adoption or cloud-only setup. Do not adopt personal data as a smoke test.

Cloud provisioning is not performed by `npm install`. Permissions, streams, JWT configuration, and account isolation require separate verification.

## Optional ATLAS providers

Deterministic summaries need no model. Natural-language answers do.

The default is `ollama-local`. Local reasoning needs an installed/running Ollama API and `llama3.2:3b`. Small-model answers can still fail strict validation or time out.

`VITE_ATLAS_PROVIDER=hosted-atlas` selects the hosted path, requiring a deployed authenticated `atlas-reason` Edge Function and server-only provider configuration. Adapters exist, but quotas, billing, and production selection are not promised ready. Never start a live benchmark implicitly.

## Optional Google Calendar

Core planning works without Google.

- Enable Calendar API, create an OAuth Web client/consent screen, and add test users in Testing mode.
- Register exact callbacks for the origins used: `http://localhost:5173/google-calendar-callback` and `http://127.0.0.1:5173/google-calendar-callback`.
- Apply connector migrations and deploy `google-calendar` to the same Supabase project.
- Configure server-only names: `GOOGLE_CALENDAR_CLIENT_ID`, `GOOGLE_CALENDAR_CLIENT_SECRET`, `GOOGLE_CALENDAR_TOKEN_ENCRYPTION_KEY`, `GOOGLE_CALENDAR_REDIRECT_URIS`.
- The encryption key must decode to 32 bytes. Redirect allowlisting is comma-separated, not JSON:

```text
http://localhost:5173/google-calendar-callback,http://127.0.0.1:5173/google-calendar-callback
```

Connect through Settings. Reads use Calendar List/Events read-only scopes; approved creation needs additional Events permission. Use normal refresh/disconnect flows. Tokens and OAuth secrets never belong in browser variables.

## Verification

Run relevant [package scripts](../package.json), test-project typecheck, and build. Use focused ESLint checks for changed code; a successful build does not establish global lint cleanliness. Review diffs for secrets, private data, and unintended mutations.

Deployment, OAuth consent, paid-provider requests, and cloud adoption must not happen implicitly during routine tests.
