# Plan 002: Classify And Remove Supabase Legacy Runtime Safely

> Executor instructions: Follow this plan step by step. Run every verification command. If a STOP condition occurs, stop and report. Update `plans/README.md` when done.
>
> Drift check: `git diff --stat 80c9a3a..HEAD -- app components lib hooks prisma package.json next.config.mjs proxy.ts`
> If files in scope changed, compare live code against this plan and `plans/runtime-inventory.md` before proceeding.

## Status

- Priority: P1
- Effort: L
- Risk: HIGH
- Depends on: `plans/001-active-runtime-inventory.md`
- Category: migration
- Planned at: commit `80c9a3a`, 2026-06-18

## Why this matters

The project has been migrating from Supabase runtime to Prisma/Neon. For a future VPS migration, any active dependency on Supabase runtime, Supabase storage, Supabase SSR client, or Supabase JWT assumptions must be intentionally kept, migrated, or removed. This phase removes dead Supabase runtime only after import proof and replaces active runtime only with explicit Prisma/R2 equivalents.

## Current state

Recon at commit `80c9a3a` found these Supabase signals:

- `lib/supabase/tenant-client.ts` imports `@supabase/supabase-js` and creates tenant clients with `SUPABASE_JWT_SECRET`.
- `lib/supabase/client.ts` imports `@supabase/ssr` and creates a browser client.
- `lib/supabase/admin.ts` imports `@supabase/supabase-js` and requires `SUPABASE_SERVICE_ROLE_KEY`.
- `app/api/visitas/detect/route.ts` imports `createAdminClient`, uploads to Supabase storage bucket `visitas`, and inserts into `bitacora_visitas`.
- `lib/caja/guard.ts` accepts `supabase: any` and queries `.from("caja")`.
- `app/layout.tsx` preconnects to a concrete Supabase host.
- `lib/storage.ts` still references `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_INVENTORY_BUCKET`, even though R2 is now used in many flows.
- `package.json` still includes `@supabase/ssr` and `@supabase/supabase-js`.

Known product caution:

- Auth still uses `SUPABASE_JWT_SECRET` as a fallback signing secret in `lib/auth.ts` and `lib/actions/auth-prisma.ts`. Do not remove this without replacing the env contract.
- Some docs say Supabase remains for legacy/PRO. Verify live imports before deleting.

## Commands you will need

| Purpose | Command | Expected on success |
|---------|---------|---------------------|
| Supabase scan | `rg "@supabase|createAdminClient|createTenantClient|createCurrentTenantClient|supabase\.from|supabase\.storage|createBrowserClient|SUPABASE" app components lib hooks prisma types -n` | Every match classified |
| Import proof | `rg "@/lib/supabase|lib/supabase" app components lib hooks types -n` | Only intentional matches remain |
| Build | `pnpm build` | exit 0 |
| Tests | `pnpm test` | exit 0 |

## Scope

In scope:

- `app/api/visitas/detect/route.ts`
- `app/layout.tsx`
- `lib/caja/guard.ts`
- `lib/storage.ts`
- `lib/supabase/*`
- `lib/auth.ts` and `lib/actions/auth-prisma.ts` only for env naming cleanup after explicit replacement
- `package.json` only after all imports are gone
- `docs/VERCEL_ENV_VARS.md` and cleanup docs if source changes affect env requirements

Out of scope:

- Do not remove R2 helpers.
- Do not change tenant isolation semantics.
- Do not remove `SUPABASE_JWT_SECRET` fallback unless `AUTH_SECRET`/`NEXTAUTH_SECRET` is proven configured in production and docs are updated.
- Do not delete a Supabase helper while any active import remains.

## Steps

### Step 1: Create a Supabase usage ledger

Add a section to `plans/runtime-inventory.md` named `Supabase usage ledger`. For every `rg` match, classify it as:

- `MIGRATE_NOW`: active runtime that should move to Prisma/R2.
- `KEEP_TEMP`: intentional temporary compatibility.
- `DELETE_AFTER_IMPORT_PROOF`: no active callers.
- `DOC_ONLY`: documentation reference.
- `ENV_COMPAT`: env fallback that must be replaced carefully.

Verify:

```powershell
Select-String -Path plans\runtime-inventory.md -Pattern "Supabase usage ledger|MIGRATE_NOW|KEEP_TEMP|DELETE_AFTER_IMPORT_PROOF"
```

Expected: ledger exists and has classifications.

### Step 2: Handle `app/api/visitas/detect/route.ts`

This route is likely legacy because Hikvision webhook was moved to tokenized Prisma route `app/api/alarms/hikvision/[token]/route.ts`. Before deleting or rewriting:

1. Search for callers:
   ```powershell
   rg "/api/visitas/detect|visitas/detect|detect/route" app components lib docs -n
   ```
2. If only docs or no callers remain, either delete the route or replace it with `410 Gone` plus a message pointing to `/api/alarms/hikvision/[token]`.
3. If active callers remain, migrate it to Prisma + R2 using the same patterns as `app/api/alarms/hikvision/[token]/route.ts`.

Verify:

```powershell
rg "createAdminClient|supabase\.storage|supabase\.from" app/api/visitas/detect/route.ts -n
```

Expected: no matches if the route remains. If the file was deleted, command should report file not found; record that in `plans/runtime-inventory.md`.

### Step 3: Remove stale Supabase preconnect if no public client remains

Check whether browser code still needs Supabase:

```powershell
rg "createBrowserClient|@/lib/supabase/client|lib/supabase/client" app components hooks lib -n
```

If no browser code needs Supabase, remove the Supabase preconnect from `app/layout.tsx`.

Verify:

```powershell
rg "supabase.co" app/layout.tsx -n
```

Expected: no matches, unless a documented browser Supabase feature remains.

### Step 4: Decide `lib/caja/guard.ts`

Search callers:

```powershell
rg "caja/guard|requireOpenCaja|ensure.*Caja|from \"@/lib/caja/guard\"|from '@/lib/caja/guard'" app components lib -n
```

If there are no active callers, delete `lib/caja/guard.ts`. If active callers exist, rewrite it to Prisma and remove the `supabase: any` API.

Verify:

```powershell
rg "supabase: any|\.from\(\"caja\"\)" lib/caja app components lib -n
```

Expected: no active Supabase caja guard remains.

### Step 5: Remove Supabase package dependencies only when safe

Only after all source imports to `@supabase/*` are gone:

1. Remove `@supabase/ssr` and/or `@supabase/supabase-js` from `package.json`.
2. Run package manager update if the operator allows dependency mutation. If not allowed, leave a note in `plans/runtime-inventory.md`.

Verify:

```powershell
rg "@supabase" package.json pnpm-lock.yaml app components lib hooks -n
pnpm build
pnpm test
```

Expected: no source imports, build/test exit 0.

## Test plan

Manual smoke tests after this phase:

- Login and enter dashboard.
- Open Clientes, Reparaciones, Ventas, Inventario, Configuracion.
- Tracking public verification still works.
- Bitacora de Visitas still registers manual visit and Hikvision webhook path still works if enabled.
- Print daemon settings still render.

Automated:

```powershell
pnpm build
pnpm test
rg "@supabase|createAdminClient|createTenantClient|createCurrentTenantClient|createBrowserClient|supabase\.from|supabase\.storage" app components lib hooks prisma types -n
```

Expected: build/test pass; remaining rg matches are only documented intentional exceptions.

## Done criteria

- [ ] `plans/runtime-inventory.md` includes Supabase ledger.
- [ ] No accidental active Supabase runtime remains in MVP/core paths.
- [ ] Each remaining Supabase reference is documented as intentional or removed.
- [ ] `pnpm build` passes.
- [ ] `pnpm test` passes.
- [ ] `plans/README.md` row 002 updated.

## STOP conditions

Stop and report if:

- Removing a Supabase helper breaks Auth, tracking, visits, or storage without a clear Prisma/R2 replacement.
- Production env still depends on a Supabase variable that would be removed.
- A route is used by an external device/integration and cannot be safely deleted.

## Maintenance notes

After this phase, update `docs/VERCEL_ENV_VARS.md`, `docs/CURRENT_MVP_RUNTIME_MAP.md`, and `AGENTS.md` so future agents do not reintroduce Supabase by following stale instructions.
