# Plan 003: Audit Raw SQL, Prisma Schema Drift, And Legacy Table Maps

> Executor instructions: Follow this plan step by step. Run every verification command. If a STOP condition occurs, stop and report. Update `plans/README.md` when done.
>
> Drift check: `git diff --stat 80c9a3a..HEAD -- prisma lib/actions app/api`
> If Prisma schema or server actions changed, re-run the scans before editing.

## Status

- Priority: P1
- Effort: M
- Risk: MED
- Depends on: `plans/001-active-runtime-inventory.md`
- Category: migration
- Planned at: commit `80c9a3a`, 2026-06-18

## Why this matters

A VPS migration will expose any hidden dependency on manually-created lowercase tables, raw SQL snippets, or schema drift between Prisma and Neon. ReparaHub has already moved many flows to Prisma, but some models are mapped to legacy lowercase tables and some raw SQL may remain. This phase creates a precise ledger and removes raw SQL only where Prisma models already support the same behavior.

## Current state

Recon and docs indicate:

- `prisma/schema.prisma` contains comments like `Tabla legacy creada via raw SQL` and `Tabla legacy creada via raw SQL en Supabase, ahora gestionada por Prisma`.
- Historical docs mention raw SQL in `productos-prisma.ts`, `historial-ventas.ts`, and `admin-otp.ts`, but those docs may be stale.
- Current action files include large critical files:
  - `lib/actions/repairs-prisma.ts` (~73k)
  - `lib/actions/ventas-prisma.ts` (~71k)
  - `lib/actions/settings-prisma.ts` (~29k)
  - `lib/actions/apartados-prisma.ts` (~21k)
- `AGENTS.md` states: never query `inventario`; use `productos`.
- `AGENTS.md` also warns `ventas`, `caja`, and `movimientos_caja` use text `taller_id`, unlike most UUID tenant columns.

## Commands you will need

| Purpose | Command | Expected on success |
|---------|---------|---------------------|
| Raw SQL scan | `rg "queryRaw|executeRaw|\$queryRaw|\$executeRaw|raw SQL|raw sql" app lib prisma -n` | Every match classified |
| Legacy schema scan | `rg "legacy|raw SQL|@@map|@map" prisma/schema.prisma -n` | Every risky map classified |
| Inventario wrong-table scan | `rg "inventario" app components lib prisma -n` | No runtime query to table `inventario` |
| Prisma generate | `pnpm prisma generate` | exit 0 |
| Build | `pnpm build` | exit 0 |

## Scope

In scope:

- `prisma/schema.prisma`
- `lib/actions/*-prisma.ts`
- `app/api/*` routes that use raw SQL or schema-specific assumptions
- Documentation under `plans/` and existing technical docs if needed

Out of scope:

- Do not rename database tables in this phase.
- Do not change tenant ID column types.
- Do not run destructive migrations.
- Do not normalize historical data without a separate data migration plan.

## Steps

### Step 1: Create the raw SQL ledger

Add `Raw SQL and schema drift ledger` to `plans/runtime-inventory.md`. For every raw SQL match, record:

- File and line.
- Query purpose.
- Whether Prisma model exists for the table.
- Whether the query is safe to replace now.
- Tenant isolation check present or missing.
- Risk: LOW, MED, HIGH.

Verify:

```powershell
Select-String -Path plans\runtime-inventory.md -Pattern "Raw SQL and schema drift ledger"
```

Expected: ledger exists.

### Step 2: Replace low-risk raw SQL with Prisma model calls

Only replace raw SQL when all are true:

- The table exists in `prisma/schema.prisma`.
- The raw SQL is simple CRUD, count, sum, or lookup.
- Tenant isolation can be expressed in Prisma without type casting hacks.
- The behavior is covered by build plus a manual smoke test.

Do not replace complex reporting SQL without a separate performance review.

Verify after each replacement:

```powershell
pnpm build
```

Expected: exit 0.

### Step 3: Mark non-removable raw SQL with justification

For any raw SQL that remains, add a comment near the code only if source edits are already in scope, or document in `plans/runtime-inventory.md` if not editing source. Justification must include:

- Why Prisma cannot currently express it safely.
- What model/index/schema change would make removal possible.
- Which manual QA flow validates it.

Verify:

```powershell
rg "queryRaw|executeRaw|\$queryRaw|\$executeRaw" app lib prisma -n
```

Expected: remaining matches are all documented.

### Step 4: Audit legacy mapped models

In `prisma/schema.prisma`, classify each `@@map` or legacy comment as:

- `KEEP`: real production table name.
- `RENAME_LATER`: should eventually be renamed but not before data migration.
- `REMOVE_MODEL`: model no longer used and table can be dropped later.
- `VERIFY`: unclear.

Do not rename anything yet. Add results to `plans/runtime-inventory.md`.

Verify:

```powershell
Select-String -Path plans\runtime-inventory.md -Pattern "KEEP|RENAME_LATER|REMOVE_MODEL|VERIFY"
```

Expected: schema classifications exist.

## Test plan

Run:

```powershell
pnpm prisma generate
pnpm build
pnpm test
```

Manual smoke if source changed:

- Open Ventas and create/cancel a small test sale in a safe tenant.
- Open Reparaciones list and detail.
- Open Historial de Ventas and Corte.
- Open Inventario list and product edit.

## Done criteria

- [ ] Raw SQL ledger exists.
- [ ] Low-risk raw SQL removed or explicitly deferred.
- [ ] Every remaining raw SQL match has a reason.
- [ ] Schema legacy maps classified.
- [ ] Build/test pass.
- [ ] `plans/README.md` row 003 updated.

## STOP conditions

Stop and report if:

- A raw SQL query depends on `ventas/caja/movimientos_caja.taller_id` text semantics and Prisma replacement risks UUID casting.
- Prisma schema does not represent the target table accurately.
- A replacement changes money/caja behavior without a clear manual test.

## Maintenance notes

Do not chase cosmetic table renames before VPS migration. Stability matters more than pretty table names. The first goal is zero dangerous raw SQL and clear schema ownership.
