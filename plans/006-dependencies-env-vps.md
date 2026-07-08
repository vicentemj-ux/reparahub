# Plan 006: Audit Dependencies, Env Vars, Build Config, And VPS Readiness

> Executor instructions: Follow this plan step by step. Run every verification command. If a STOP condition occurs, stop and report. Update `plans/README.md` when done.
>
> Drift check: `git diff --stat 80c9a3a..HEAD -- package.json pnpm-lock.yaml next.config.mjs tsconfig.json prisma.config.ts docs app lib components`
> If dependency or build config changed, re-run scans first.

## Status

- Priority: P1
- Effort: M
- Risk: MED
- Depends on: `plans/001-active-runtime-inventory.md`, `plans/002-supabase-legacy-runtime.md`
- Category: migration
- Planned at: commit `80c9a3a`, 2026-06-18

## Why this matters

A future VPS migration needs a clean dependency and environment contract. Vercel can hide runtime assumptions such as ignored TypeScript errors, implicit env vars, build caches, and serverless-only behavior. This phase makes dependencies, env vars, and build settings explicit.

## Current state

Recon at commit `80c9a3a` found:

- `package.json` includes Supabase packages even though the target direction is Prisma/Neon-first.
- `package.json` includes print, image, QR, Resend, Prisma, Next/Auth, and scanner dependencies that may be active.
- `AGENTS.md` env list still includes Supabase variables.
- `docs/VERCEL_ENV_VARS.md` says Supabase vars are only legacy/PRO.
- `docs/PROJECT_CONTEXT.md` mentions `ignoreBuildErrors: true` in `next.config.mjs` as critical debt, but this must be verified in the current file.
- Existing tests are utility-focused under `__tests__/`.

## Commands you will need

| Purpose | Command | Expected on success |
|---------|---------|---------------------|
| Dependency imports | `foreach ($pkg in (Get-Content package.json | ConvertFrom-Json).dependencies.PSObject.Properties.Name) { $pattern = [regex]::Escape($pkg); $hits = rg "from ['\"]$pattern|import\(\s*['\"]$pattern|require\(\s*['\"]$pattern" app components lib hooks scripts prisma __tests__ -n; if ($hits) { "### $pkg"; $hits } }` | Used deps show hits; unused deps investigated |
| Env scan | `rg "process\.env\.[A-Z0-9_]+" app components lib hooks scripts prisma next.config.mjs -n` | Every env var listed |
| Build config scan | `Get-Content next.config.mjs; Get-Content tsconfig.json; Get-Content prisma.config.ts` | Files readable |
| Build | `pnpm build` | exit 0 |
| Tests | `pnpm test` | exit 0 |

## Scope

In scope:

- `package.json`
- `pnpm-lock.yaml` if dependency removals are approved
- `next.config.mjs`
- `tsconfig.json`
- `prisma.config.ts`
- `docs/VERCEL_ENV_VARS.md`
- `docs/PROJECT_CONTEXT.md`
- `AGENTS.md` only if owner approves changing agent instructions
- `plans/runtime-inventory.md`

Out of scope:

- Do not change hosting provider in this phase.
- Do not write Docker/Nginx/systemd production configs unless the owner asks.
- Do not remove a dependency just because it has few imports; confirm feature ownership.
- Do not expose secret values in docs.

## Steps

### Step 1: Create dependency ledger

Add `Dependency and VPS readiness ledger` to `plans/runtime-inventory.md`. For each dependency in `package.json`, classify:

- `ACTIVE_RUNTIME`
- `ACTIVE_BUILD`
- `ACTIVE_TEST`
- `LEGACY_REMOVE_AFTER_PHASE_002`
- `UNKNOWN_REVIEW`

For unknown dependencies, include import scan evidence.

Verify:

```powershell
Select-String -Path plans\runtime-inventory.md -Pattern "Dependency and VPS readiness ledger"
```

Expected: ledger exists.

### Step 2: Create env var contract

Scan all `process.env` usage and produce a table in `plans/runtime-inventory.md` with:

- Env var name.
- Server-only or public.
- Feature owner.
- Required in production? yes/no/legacy.
- Safe fallback? yes/no.
- VPS note.

Do not include env values.

Verify:

```powershell
Select-String -Path plans\runtime-inventory.md -Pattern "Env var contract"
```

Expected: env contract exists.

### Step 3: Audit build config for strictness

Inspect `next.config.mjs`, `tsconfig.json`, and any lint config. If `ignoreBuildErrors` or equivalent is enabled, create a separate follow-up plan or remove it only after current `pnpm build` is green.

Verify:

```powershell
rg "ignoreBuildErrors|ignoreDuringBuilds|eslint|typescript" next.config.mjs tsconfig.json package.json -n
pnpm build
```

Expected: build passes; any ignore setting is documented or removed safely.

### Step 4: Remove dependencies only after source proof

For each dependency marked `LEGACY_REMOVE_AFTER_PHASE_002` or `UNKNOWN_REVIEW` with no import evidence:

1. Confirm no source import.
2. Confirm package is not needed by Next/Prisma tooling indirectly.
3. Remove from `package.json` only after owner approval or explicit assignment.
4. Update lockfile with pnpm if allowed.

Verify:

```powershell
pnpm install --lockfile-only
pnpm build
pnpm test
```

Expected: lockfile updates only as expected; build/test pass.

### Step 5: Write VPS readiness notes

Add a section to `plans/runtime-inventory.md` named `VPS readiness notes` with:

- Node.js version expectation.
- `pnpm build` and `pnpm start` expectation.
- Required env vars.
- Prisma generate/migrate strategy.
- File storage strategy: R2, not local disk.
- Background jobs/cron assumptions.
- Local print daemon remains optional client-side and not part of VPS server.

Verify:

```powershell
Select-String -Path plans\runtime-inventory.md -Pattern "VPS readiness notes"
```

Expected: section exists.

## Test plan

Run:

```powershell
pnpm build
pnpm test
```

If dependency changes occurred, also run:

```powershell
pnpm lint
```

Expected: build/test pass. Lint may reveal existing issues; record whether it is a baseline failure or new failure.

## Done criteria

- [ ] Dependency ledger exists.
- [ ] Env var contract exists and contains no secret values.
- [ ] Build config strictness is documented or improved.
- [ ] VPS readiness notes exist.
- [ ] Dependency removals, if any, have import proof.
- [ ] Build/test pass.
- [ ] `plans/README.md` row 006 updated.

## STOP conditions

Stop and report if:

- A dependency appears unused but is required by generated code, dynamic import, or deployment tooling.
- Removing an env var would break production auth, email, R2, database, or billing/trial behavior.
- `pnpm install --lockfile-only` causes broad lockfile churn unrelated to targeted removals.

## Maintenance notes

Do not treat VPS migration as just `next start`. Document DB migrations, process manager, env management, logs, cron, image storage, and local daemon boundaries before deployment work begins.
