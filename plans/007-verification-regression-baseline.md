# Plan 007: Establish Cleanup Verification Gates And Regression Baseline

> Executor instructions: Follow this plan step by step. Run every verification command. If a STOP condition occurs, stop and report. Update `plans/README.md` when done.
>
> Drift check: `git diff --stat 80c9a3a..HEAD -- __tests__ app components lib prisma package.json vitest.config.* tsconfig.json`
> If tests or critical modules changed, adapt the baseline before adding new gates.

## Status

- Priority: P1
- Effort: M
- Risk: LOW
- Depends on: `plans/001-active-runtime-inventory.md`
- Category: tests
- Planned at: commit `80c9a3a`, 2026-06-18

## Why this matters

Dead-code cleanup is risky because success often looks like "nothing changed." ReparaHub is already in production at multiple shops. Before large removals, the project needs repeatable verification gates that protect money, repairs, tracking, customers, inventory, visits, printing, and subscription access.

## Current state

Recon found existing tests under `__tests__/`:

- `__tests__/whatsapp-utils.test.ts`
- `__tests__/subscription.test.ts`
- `__tests__/repair-status.test.ts`
- `__tests__/r2.test.ts`
- `__tests__/phone.test.ts`
- `__tests__/inventory-categories.test.ts`
- `__tests__/date.test.ts`
- `__tests__/currency.test.ts`

`package.json` has:

- `pnpm test` -> `vitest run`
- `pnpm build` -> `prisma generate && next build`
- `pnpm lint` -> `eslint .`

## Commands you will need

| Purpose | Command | Expected on success |
|---------|---------|---------------------|
| Existing tests | `pnpm test` | exit 0 |
| Build | `pnpm build` | exit 0 |
| Lint baseline | `pnpm lint` | exit 0 or documented baseline failure |
| Test inventory | `rg --files __tests__` | Lists current tests |
| Action exports | `rg "export (async )?function|export const" lib/actions -n` | Used to pick characterization targets |

## Scope

In scope:

- `__tests__/`
- `plans/runtime-inventory.md`
- Utility functions extracted only if needed to test critical behavior
- Test docs under `plans/`

Out of scope:

- Do not write full browser E2E in this phase unless tooling already exists.
- Do not mock database-heavy server actions without a clear pattern.
- Do not refactor production code just to make it testable unless a small pure helper extraction is clearly safe.

## Steps

### Step 1: Record verification baseline

Add `Verification baseline` to `plans/runtime-inventory.md` with the exact result of:

```powershell
pnpm build
pnpm test
pnpm lint
```

If lint fails but build/test pass, mark lint as `BASELINE_FAIL` and include the first 20 lines of output only. Do not fix lint in this phase unless specifically assigned.

Verify:

```powershell
Select-String -Path plans\runtime-inventory.md -Pattern "Verification baseline"
```

Expected: baseline exists.

### Step 2: Define must-not-break manual smoke checklist

Add `Manual smoke checklist` to `plans/runtime-inventory.md` covering:

- Login/logout.
- Dashboard loads.
- Reparaciones: list, create ticket, detail, status change, WhatsApp tracking link.
- Ventas: open caja, quick sale, apartados, cancellation/refund behavior, corte.
- Inventario: create/edit product, category, image thumbnail.
- Clientes: search, create by phone, detail history.
- Bitacora de Visitas: register visit and phone call.
- Tracking public: 5 attempts behavior and verified access.
- Configuracion: Taller, Imprenta, Hardware placeholder.
- Print: web fallback and daemon status off/on.

Verify:

```powershell
Select-String -Path plans\runtime-inventory.md -Pattern "Manual smoke checklist|Apartados|Tracking public"
```

Expected: checklist exists.

### Step 3: Add characterization tests for pure helpers first

Identify pure helpers already used by risky cleanup phases. Prefer tests similar to existing utility tests. Candidate areas:

- Phone normalization and last 4 tracking behavior.
- Date/timezone grouping for visits and repairs table.
- Currency formatting and caja totals helpers if pure.
- Feature gating helper if centralization exists.
- Direct print config parsing if pure.
- Inventory category slug normalization.

Create tests only for pure functions or tiny extracted pure helpers. Avoid DB integration tests in this phase.

Verify:

```powershell
pnpm test
```

Expected: all tests pass, including new tests.

### Step 4: Create cleanup guard scripts if simple

If useful and low-risk, add package scripts or documented commands for:

- Supabase scan.
- Raw SQL scan.
- Tauri/hardware scan.
- Dead legacy scan.

If adding package scripts feels too broad, keep commands in `plans/runtime-inventory.md` only.

Verify:

```powershell
Get-Content package.json | Select-String -Pattern "scan|legacy|supabase|raw"
```

Expected: scripts exist only if intentionally added; otherwise note that commands remain manual.

## Test plan

Automated:

```powershell
pnpm build
pnpm test
```

Optional:

```powershell
pnpm lint
```

Manual smoke checklist must be run by a human/operator in production-like tenant after source cleanup phases.

## Done criteria

- [ ] Verification baseline recorded.
- [ ] Manual smoke checklist recorded.
- [ ] New characterization tests added for any pure helpers touched by cleanup.
- [ ] Build/test pass.
- [ ] Lint status documented.
- [ ] `plans/README.md` row 007 updated.

## STOP conditions

Stop and report if:

- Build or tests fail before any source cleanup.
- A proposed test requires real production DB credentials.
- A helper extraction would touch money/caja/reparaciones behavior more than trivially.

## Maintenance notes

Every cleanup PR should include:

1. The relevant `rg` proof that old code is gone or intentionally kept.
2. `pnpm build` result.
3. `pnpm test` result.
4. Manual smoke checklist items run.

Without this, deleting legacy code becomes guesswork.
