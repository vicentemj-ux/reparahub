# Plan 001: Build The Active Runtime Inventory

> Executor instructions: Follow this plan step by step. Run every verification command and confirm the expected result before moving to the next step. If anything in STOP conditions occurs, stop and report. When done, update `plans/README.md`.
>
> Drift check: `git diff --stat 80c9a3a..HEAD -- app components lib hooks prisma types package.json next.config.mjs proxy.ts`
> If active route or action files changed since this plan was written, compare the current code against the facts below before proceeding.

## Status

- Priority: P1
- Effort: M
- Risk: LOW
- Depends on: none
- Category: tech-debt
- Planned at: commit `80c9a3a`, 2026-06-18

## Why this matters

ReparaHub has production users and a mixed history of Prisma migration, Supabase legacy, PRO placeholders, local daemon work, and archive docs. Deleting code without first proving route reachability can break active shops. This phase creates the source-of-truth inventory for later cleanup phases.

## Current state

Relevant repo facts:

- `package.json` scripts: `pnpm build`, `pnpm test`, `pnpm lint`.
- App Router lives under `app/`.
- Server actions mostly live under `lib/actions/`.
- Important docs already exist but are historical and may be stale:
  - `docs/MIGRATION_STATUS.md`
  - `docs/CURRENT_MVP_RUNTIME_MAP.md`
  - `docs/LEGACY_FILES_CLEANUP.md`
  - `docs/LIB_ACTIONS_AUDIT.md`
- `docs/LEGACY_FILES_CLEANUP.md` claims some legacy files were removed, but recon currently shows many mixed files still present in `lib/actions/`.
- `git status -sb` before this package showed unrelated dirty items: `skills-lock.json`, `.agents/skills/*`, `internal/`, and `reparahubv28.rar`. Do not touch them unless the operator explicitly assigns them.

## Commands you will need

| Purpose | Command | Expected on success |
|---------|---------|---------------------|
| Route list | `rg --files app | sort` | Lists all app route files |
| Actions list | `Get-ChildItem lib/actions -File | Sort-Object Name | Select-Object Name,Length` | Lists actions with sizes |
| Import graph quick scan | `rg "from \"@/lib/actions|from '@/lib/actions|from \"@/lib/supabase|from '@/lib/supabase" app components lib -n` | Shows action and Supabase import sites |
| Baseline build | `pnpm build` | exit 0 |
| Baseline tests | `pnpm test` | exit 0 |

## Scope

In scope:

- Create or update only documentation under `plans/`.
- Produce an inventory markdown file at `plans/runtime-inventory.md`.
- Classify files, do not edit source code.

Out of scope:

- Do not delete, rename, or refactor source files.
- Do not modify Prisma schema.
- Do not change package dependencies.
- Do not run formatters or code generators except `pnpm build` if needed for baseline.

## Steps

### Step 1: Capture route and action inventory

Create `plans/runtime-inventory.md` with these sections:

1. `Active public routes`
2. `Active dashboard routes`
3. `API routes`
4. `Server actions by domain`
5. `Client components that call actions`
6. `Files suspected legacy`
7. `Files suspected active`
8. `Unknown / needs owner decision`

Populate the route sections from `app/`. For each route, list the primary page/route file and the actions it imports directly or indirectly where obvious.

Verify:

```powershell
Test-Path plans\runtime-inventory.md
```

Expected: `True`.

### Step 2: Mark active modules using product direction

Use `AGENTS.md` and `docs/PROJECT_CONTEXT.md` to mark each module as:

- `CORE_ACTIVE`: used by production shops and must not be removed.
- `PRO_ACTIVE`: feature-gated but still part of product.
- `PRO_DISABLED`: visible/known but not operational.
- `LEGACY_CANDIDATE`: likely safe to remove after import proof.
- `UNKNOWN`: requires manual review.

At minimum classify these domains: Auth, Dashboard, Ventas, Reparaciones, Historial de Ventas, Inventario, Clientes, Bitacora de Gastos, Mi Equipo, Configuracion, Bitacora de Visitas, Chat, Cotizaciones, Compras, Control de Utilidad, Mi Tienda, Reportes, Servicios, Hardware/Hikvision, Print daemon.

Verify:

```powershell
Select-String -Path plans\runtime-inventory.md -Pattern "CORE_ACTIVE|PRO_ACTIVE|PRO_DISABLED|LEGACY_CANDIDATE|UNKNOWN"
```

Expected: at least one match per category or a note explaining why a category is absent.

### Step 3: Build an import-proof list before deletion phases

For every file marked `LEGACY_CANDIDATE`, add the exact command the next phase must run before deleting it:

```powershell
rg "<file-basename-without-extension>" app components lib hooks types -n
```

Also add stronger import-specific variants when possible:

```powershell
rg "@/lib/actions/<name>|lib/actions/<name>" app components lib hooks types -n
```

Verify:

```powershell
Select-String -Path plans\runtime-inventory.md -Pattern "rg \"@/lib/actions"
```

Expected: at least one import-proof command exists.

## Test plan

This is documentation-only. Run:

```powershell
pnpm build
pnpm test
```

Expected: both exit 0. If they fail before source changes, record baseline failure in `plans/runtime-inventory.md` and STOP.

## Done criteria

- [ ] `plans/runtime-inventory.md` exists.
- [ ] Every top-level product domain is classified.
- [ ] Every legacy candidate has at least one proof command.
- [ ] `pnpm build` and `pnpm test` results are recorded.
- [ ] `plans/README.md` row 001 updated.

## STOP conditions

Stop and report if:

- Build or tests fail before any source cleanup.
- A suspected legacy file is imported by an active route and cannot be safely classified.
- The operator cannot decide whether a module is still product-active.

## Maintenance notes

This inventory becomes the contract for phases 002-007. Keep it updated whenever source cleanup lands, otherwise later models will re-audit stale assumptions.
