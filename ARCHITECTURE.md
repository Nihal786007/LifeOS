# LifeOS architecture

These are implemented boundaries, not a proposed rewrite.

## Application composition

[AppProviders](src/providers/AppProviders.tsx) puts authenticated account hydration before canonical domain providers:

```text
Auth → account lifecycle / hydration gate → account-bound data services
                                        → domain providers → UI
```

Each user has a separate PowerSync database; pre-auth device data stays separate. Account transitions release old watches/sessions before exposing the next account. Adoption is explicit, with recovery and conflict handling rather than automatic merging.

## Domain ownership

- Typed repositories are the application-facing persistence boundary.
- Contexts own runtime state and APIs; planning, habit, and execution engines own business behavior.
- Account repositories sync through PowerSync to Supabase with user ownership and RLS.
- UUID remote row identities preserve existing canonical IDs as `entity_id`. Execution rows remain independent even when canonical event IDs repeat.
- XP derives from the execution ledger, not a separate UI/AI patch.
- Notification facts are derived; only read/dismiss IDs and preferences persist.
- Active Focus recovery checkpoints and Reality Mirror intentions remain device-scoped local state, not a promise of cross-device sync.

[Data services](src/data/DataServicesContext.tsx) binds repositories without creating another domain store.

## Read-only intelligence

```text
AtlasCanonicalState → deterministic intelligence / brief / patterns
                    → AtlasReasoningContext → deterministic Fact Core
                    → bounded provider request → strict validation
                    → deterministic factual answer / citations + commentary
```

[Canonical state](src/atlas/state/useAtlasCanonicalState.ts) is the read boundary. UI does not reimplement priority or evidence logic. Conversation is linguistic context; explicit Memory is non-authoritative and non-citable. Providers receive no mutation handles. Ollama is optional local transport; hosted adapters are server-only, with production selection unfinished.

## Permissioned actions

```text
request / untrusted candidate → strict schema → live reference validation
  → deterministic permission → proposal → explicit exact-payload approval
  → trusted executor / connector → canonical audit
```

Candidates cannot forge approval, execution state, or permission tiers. Duplicate execution is guarded. Mock connectors remain simulations, not message delivery or financial integrations.

## Google Calendar

OAuth Authorization Code + PKCE, exact redirects, server-side exchange/refresh, encrypted token storage, and user-scoped access protect the connection. External events do not become Tasks. Event creation requires exact approval and duplicate-prevention bookkeeping.

## Focus and reflection

Focus uses timestamps and pause-aware durations, not timer ticks as truth. Focus completion and Task completion are distinct; duration does not automatically award XP.

Reviews compose existing analytics, habits, planning, and execution without AI-generated facts. Reality Mirror compares declared priorities with valid recorded Focus durations in local Monday–Sunday weeks. Unavailable evidence stays unavailable; recorded time is not total life activity.

## Verification

Node tests use fake storage, databases, and transport. Live checks are separately controlled and disposable. Test-project Node types stay separate from browser types. Credentials, real account datasets, and raw vendor errors do not belong in committed fixtures or screenshots.

See [setup](docs/SETUP.md) and [roadmap](ROADMAP.md).
