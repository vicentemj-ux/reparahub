# Plan 004: Audit PRO, Disabled, Placeholder, And Archived Modules

> Executor instructions: Follow this plan step by step. Run every verification command. If a STOP condition occurs, stop and report. Update `plans/README.md` when done.
>
> Drift check: `git diff --stat 80c9a3a..HEAD -- app components lib docs types`
> If navigation, subscription, or feature gating files changed, re-audit before editing.

## Status

- Priority: P2
- Effort: M
- Risk: MED
- Depends on: `plans/001-active-runtime-inventory.md`
- Category: tech-debt
- Planned at: commit `80c9a3a`, 2026-06-18

## Why this matters

ReparaHub intentionally has Normal, Pro, Trial, disabled Pro modules, and modules that were temporarily parked to speed MVP. Dead-code cleanup must not confuse `PRO` with `dead`. This phase separates product-disabled code from truly unused legacy code and centralizes feature gating so future VPS deployment is cleaner.

## Current state

Product direction from `AGENTS.md`:

- Core/general: Vista General, Mi Suscripcion, Ventas (POS), Reparaciones, Historial de Ventas, Inventario, Clientes, Bitacora de Gastos, Mi Equipo, Configuracion.
- Pro: Bitacora de Visitas, Chat Taller, Compras, Control de Utilidad, Mi Tienda, Reportes, Servicios.
- Trial should provide full Pro access.
- PRO modules should have badges; old separate PRO section was removed/being removed.

Recon found active PRO/disabled signals in:

- `components/dashboard/sidebar-content.tsx` includes `PRO_FEATURES_TEMP_DISABLED` and PRO badge logic.
- `components/dashboard/pro-barcode-button.tsx` has scanner temporarily disabled text.
- `app/api/cron/check-trials/route.ts` and `app/api/cron/urgent-equipment-report/route.ts` are temporarily disabled.
- `docs/PRO_MODULES_ARCHIVE.md` says Hardware is placeholder and advanced hardware remains disabled.
- `docs/PRODUCT_STRATEGY.md` asks for centralized plan/feature helpers.

## Commands you will need

| Purpose | Command | Expected on success |
|---------|---------|---------------------|
| PRO scan | `rg "PRO|pro|Trial|trial|activo_pro|requiresPro|PRO_FEATURES_TEMP_DISABLED|feature" app components lib types docs -n` | Every relevant match classified |
| Disabled scan | `rg "desactiv|disabled|temporalmente|placeholder|proximamente|coming soon" app components lib docs -n` | Every match classified |
| Navigation scan | `rg "sidebar|navItems|requiresPro|badge|Mi Tienda|Reportes|Servicios|Compras" components app lib -n` | Navigation sources identified |
| Build | `pnpm build` | exit 0 |

## Scope

In scope:

- `components/dashboard/sidebar-content.tsx`
- Subscription/feature helper files under `lib/` and `types/`
- PRO module route pages under `app/dashboard/*`
- Docs under `plans/` and existing product docs as needed

Out of scope:

- Do not delete a PRO module just because Normal users cannot access it.
- Do not change pricing or plan strategy.
- Do not remove Mi Tienda, Bitacora de Visitas, Reportes, or Control de Utilidad if they are product-active.
- Do not reactivate disabled modules without owner approval.

## Steps

### Step 1: Create feature-gating ledger

Add `Feature gating and PRO ledger` to `plans/runtime-inventory.md`. For each module/feature, record:

- Route path.
- Sidebar/nav item.
- Current gating source.
- Plan access: Normal, Pro, Trial, Disabled.
- Runtime backend action file.
- Decision: KEEP, ARCHIVE, DELETE_AFTER_IMPORT_PROOF, CENTRALIZE_GATING.

Verify:

```powershell
Select-String -Path plans\runtime-inventory.md -Pattern "Feature gating and PRO ledger"
```

Expected: ledger exists.

### Step 2: Identify duplicate or scattered plan checks

Search for inline plan checks and repeated gating code. If there is no central helper, create a follow-up plan entry in `plans/runtime-inventory.md` instead of directly refactoring everything.

Recommended target shape for a future refactor:

- One helper like `canUseFeature(featureKey, planTipo, trialStatus)`.
- One feature registry with labels, module type, and access rule.
- Sidebar and route guards consume the same registry.

Verify:

```powershell
rg "planTipo|activo_pro|trial|requiresPro|PRO_FEATURES_TEMP_DISABLED" app components lib types -n
```

Expected: matches are either centralized or listed for future centralization.

### Step 3: Delete only archived code with zero import proof

For any file marked `DELETE_AFTER_IMPORT_PROOF`:

1. Run import proof command from Plan 001.
2. Run build.
3. Delete only if no active import remains and product owner classification says it is not PRO-active.

Verify:

```powershell
git status -sb
pnpm build
```

Expected: only intended files removed/changed; build passes.

### Step 4: Update docs to prevent future confusion

If classifications changed, update:

- `docs/PRODUCT_STRATEGY.md`
- `docs/PROJECT_CONTEXT.md`
- `docs/PRO_MODULES_ARCHIVE.md`
- `plans/runtime-inventory.md`

Verify:

```powershell
rg "PRO Modules|PRO|Trial|Normal" docs plans -n
```

Expected: no contradictory status for the same module.

## Test plan

Automated:

```powershell
pnpm build
pnpm test
```

Manual:

- Login with Normal-like account: PRO modules show badge/blocked state as intended.
- Login with Trial/Pro-like account: PRO modules reachable if product-active.
- Sidebar order/preferences still load.
- Core modules remain accessible.

## Done criteria

- [ ] Feature gating ledger exists.
- [ ] PRO-active, PRO-disabled, and dead code are separated.
- [ ] No PRO module deleted merely because it is gated.
- [ ] Any deleted file has import proof recorded.
- [ ] Build/test pass.
- [ ] `plans/README.md` row 004 updated.

## STOP conditions

Stop and report if:

- A module is business-active but technically disabled and owner decision is needed.
- A route is linked from sidebar but has no working backend.
- Deleting a file requires changing pricing/subscription behavior.

## Maintenance notes

Future features should register access in one feature registry before adding sidebar links or route guards. This avoids another scattered PRO cleanup later.
