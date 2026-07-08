# Post-cleanup Handoff

> **Updated:** 2026-06-18 after commit `6bb1738`.
> **Audience:** future agents, owner, VPS-migration cleanup follow-ups.
> **Status:** 7-phase cleanup package is closed. Most follow-ups are done; the remaining items below are the current backlog.

---

## 1. Current Status

The cleanup package and follow-up cycle are committed and pushed through:

| Commit | Subject |
|---|---|
| `2a72b6f` | `docs(plans): add 7-phase VPS-migration cleanup package` |
| `ae93908` | `chore(supabase): remove Supabase legacy runtime` |
| `1f46a69` | `refactor(proxy): remove supabase rest fallback` |
| `5e60f0d` | `refactor(storage): resolver imagenes de inventario via r2` |
| `f1b1210` | `docs(plans): marcar h2 storage r2 completado` |
| `6bb1738` | `chore(cleanup): completar pendientes de auditoria vps` |

Verification after `6bb1738`:

| Check | Status | Notes |
|---|---|---|
| `pnpm build` | PASS | Production build green. |
| `pnpm test` | PASS | 72/72 tests passing. |
| `pnpm lint` | PASS | ESLint 9 + Next flat config added; current baseline exits 0 with warnings. |

Important local context:

- The working tree still has unrelated local changes not produced by this cleanup cycle: `AGENTS.md`, `skills-lock.json`, `.agents/skills/*`, `internal/`.
- Do not stage those unless the owner explicitly asks.

---

## 2. Completed Follow-ups

Completed in the latest cycle:

| ID | Status | Result |
|---|---|---|
| H1 | DONE | Removed `proxy.ts` Supabase REST fallback. |
| H2 | DONE | Inventory relative images now resolve through R2. |
| H3 | DONE | Removed `NEXT_PUBLIC_SUPABASE_ANON_KEY` from tracked runtime docs/templates. Ignored local `.env*` files were not touched. |
| H5 | DONE | Added `engines.node >=20.0.0` to `package.json`. |
| M1 | DONE | Removed 8 unused dependencies from `package.json` and `pnpm-lock.yaml`. |
| M3 | DONE | Deleted dead Hikvision polling package: `hooks/use-hikvision-polling.ts` and `lib/camera/*`. |
| M4 | DONE | Deleted deprecated `/api/alarms/hikvision/by-taller/[tallerId]` route. |
| M5 | DONE | Removed orphan `GLOBAL_CAJA_GUARD_DISABLED`. |
| L2 | DONE | Added ESLint 9 + `eslint-config-next` flat config. |
| L3 / Point 9 | DONE | Fixed baseline tests in `subscription.test.ts` and `whatsapp-utils.test.ts`. |

---

## 3. What Remains Pending

### High / Owner Decision

#### H4. Disabled cron routes

Current state:

- `app/api/cron/check-trials/route.ts` returns `skipped: true`.
- `app/api/cron/urgent-equipment-report/route.ts` returns `skipped: true`.
- `vercel.json` still schedules both routes.

Recommendation:

- Keep disabled until a dedicated cron/alerts mini-project is approved.
- Reactivation changes customer notifications / Resend behavior and, for VPS, requires a runner strategy (`systemd`, Linux cron, or a Node scheduler calling the same endpoints with `CRON_SECRET`).

Decision needed:

- **Reactivate:** restore real logic and define VPS scheduler.
- **Remove:** delete both routes and remove entries from `vercel.json`.
- **Keep disabled:** acceptable short-term, but document that trial/urgent alerts are inert.

### Medium / Cleanup

#### M2. Drop 5 dead Postgres functions in production

Candidates recorded in `plans/runtime-inventory.md`:

- `get_dashboard_stats`
- `get_next_folio`
- `batch_decrement_stock`
- `get_garantia_ticket`
- `get_inventory_operational_kpis`

Recommendation:

- Do not drop blindly from Neon production.
- First verify no external dashboard, SQL job, or manual report uses them.
- Then execute a DB-side cleanup migration or direct DBA-approved `DROP FUNCTION` statements.

#### M6. Resolve `PRO_DISABLED_ROUTES` gate

Current issue:

- `PRO_DISABLED_ROUTES` still exists in `lib/runtime-flags.ts`.
- Previous audit identified route-gate logic as inverted/inert.

Recommendation:

- Prefer removing this global route block and relying on per-feature/server-side plan checks already used by sidebar/actions.
- If owner wants hard route blocking for Normal users, fix it as a dedicated access-control task and smoke-test direct URLs.

#### M7. Decide orphan dashboard routes

Routes without clear sidebar entry / direct UX ownership:

- `/dashboard/ventas/kiosko`
- `/dashboard/wizard`
- `/dashboard/print-label`
- `/dashboard/configuracion/importacion`
- `/dashboard/configuracion/flujo-pro`

Recommendation:

- `configuracion/importacion` and `configuracion/flujo-pro` likely belong as config subtabs.
- `ventas/kiosko` may remain direct-entry for kiosk mode.
- `wizard` and `print-label` need owner decision: keep, link, or delete.

### Low / Maintenance

#### L1. Refresh `AGENTS.md`

Current state:

- `AGENTS.md` has unrelated local edits in the working tree, so it was intentionally not touched in commit `6bb1738`.

Known drift to reconcile later:

- Tauri/daemon print fallback order.
- Runtime flag descriptions after `GLOBAL_CAJA_GUARD_DISABLED` removal.
- Current dependency/env expectations after Supabase cleanup.

#### L4. Add `scripts/audit-runtime.mjs`

Goal:

- Codify recurring scans from `plans/runtime-inventory.md` into a script like `pnpm audit:runtime`.

Recommended checks:

- Supabase source imports.
- Dead legacy endpoints.
- Runtime flags with zero importers.
- Raw SQL hotspots.
- Dependency imports vs `package.json`.

#### L5. Lint-hardening cycle

Current state:

- `pnpm lint` exits 0.
- Warnings remain intentionally: unused vars, hook deps, `<img>` warnings, etc.

Recommendation:

- Treat warning cleanup as a separate per-module hardening pass.
- Do not turn warnings into hard errors until the current production flow is stable.

#### L6. Peer dependency warning

Current warning:

- `@zxing/browser@0.2.0` expects `@zxing/library@^0.22.0`; project has `0.23.0`.

Recommendation:

- Leave unless scanner behavior regresses.
- If scanner bugs appear, test downgrade `@zxing/library` to `0.22.x` or upgrade `@zxing/browser` if available.

---

## 4. Point 10 Analysis: Cron Jobs

Point 10 was analyzed but not implemented.

Why not implemented in cleanup commit:

- Reactivating crons is not just code cleanup. It affects customer emails, trial status, urgent reports, Resend, and VPS scheduling.
- Removing them changes Vercel scheduled behavior and should be coordinated with product/ops.

Recommended mini-project:

1. Decide whether the two jobs are still product requirements.
2. If yes, migrate implementation to Prisma/Neon-only paths.
3. Add `CRON_SECRET` verification consistently to both routes.
4. Add VPS scheduler docs and commands.
5. Add a smoke script or admin-only endpoint to test each job safely.

---

## 5. Verification Commands For Next Agent

```bash
git status -sb
pnpm test
pnpm lint
pnpm build
rg "NEXT_PUBLIC_SUPABASE_ANON_KEY|GLOBAL_CAJA_GUARD_DISABLED|lib/camera|hikvision-polling|alarms/hikvision/by-taller" app components lib hooks types docs README.md CLAUDE.md
```

Expected:

- Tests pass 72/72.
- Lint exits 0 with warnings only.
- Build exits 0.
- Legacy `rg` scan should return no active source matches. Historic mentions may exist in `plans/runtime-inventory.md` only.

---

## 6. Reference

- Full historical ledger: `plans/runtime-inventory.md`.
- Original plan files: `plans/001-*.md` through `plans/007-*.md`.
- Current active handoff: this file.
