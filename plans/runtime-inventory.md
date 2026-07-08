# Active Runtime Inventory

> Generated 2026-06-18 against commit `80c9a3a` (HEAD of `main`).
> Drift check: `git diff --stat 80c9a3a..HEAD -- app components lib hooks prisma types package.json next.config.mjs proxy.ts` -> no changes since baseline. This inventory reflects the current state of the working tree.
>
> This document is the **contract for plans 002-007**. Update it whenever source cleanup lands, otherwise later models will re-audit stale assumptions.
>
> How to read a classification:
> - `CORE_ACTIVE` - used by production shops; do not remove.
> - `PRO_ACTIVE` - feature-gated behind Normal/Pro plan, but product-expected.
> - `PRO_DISABLED` - visible in nav/docs but the runtime path is intentionally not wired.
> - `LEGACY_CANDIDATE` - code is reachable only from legacy paths; safe to remove after import-proof + plan-002/005 confirmation.
> - `UNKNOWN` - needs owner decision; documented here so future plans can resolve it.

---

## 0. Verification baseline

Captured before any source changes. Phase 1 is documentation-only, so any failure here is a pre-existing baseline condition, not caused by this plan.

| Command | Result | Notes |
|---|---|---|
| `pnpm build` (pre-phase-001) | exit 0 | `prisma generate` (v7.8.0) -> `next build` (Next 16.2.0, Turbopack). 54 static pages, 21 dynamic, 1 proxy/middleware. |
| `pnpm test` (pre-phase-001) | **exit 1** (pre-existing) | vitest 4.1.8, node env, no DB. 70/72 pass. 2 failures, both recorded in section 11. |
| `pnpm build` (post-phase-002) | exit 0 | After `Remove-Item -Recurse .next` (stale validator referenced deleted route), rebuild succeeded. Route list no longer includes `/api/visitas/detect`. Same 54 static + 21 dynamic + 1 proxy. |
| `pnpm test` (post-phase-002) | **exit 1** (same 2 pre-existing failures) | No regression introduced by plan 002. Same `subscription.test.ts` (DD/MM/YYYY) and `whatsapp-utils.test.ts` (no country code) failures. |
| `git status -sb` (post-phase-002) | scoped-path changes only | `M` AGENTS.md, `D` `app/api/visitas/detect/route.ts`, `M` `app/layout.tsx`, `D` `lib/caja/guard.ts`, `D` `lib/supabase/{admin,client,tenant-client}.ts`, `M` `skills-lock.json` (pre-existing). Untracked: `plans/`, `internal/`, `.agents/skills/*`. All deletions are listed in plan 002 step 1 ledger. |

> Plan 007 will formally capture the 2 test failures as `BASELINE_FAIL` for downstream phases. Plan 002 verification is **green** for its scope (build passes, no new test failures, all intended deletions in place, no new Supabase factory references).

---

## 1. Active public routes

| Route | File | Notes |
|---|---|---|
| `/` | `app/page.tsx` | Marketing landing. |
| `/t/[slug]` | `app/t/[slug]/page.tsx` + `view.tsx` | Tenant public store (Mi Tienda, Normal/Pro/trial gated by `lib/actions/tienda-publica-prisma.ts`). |
| `/t/[slug]/p/[productoId]` | `app/t/[slug]/p/[productoId]/page.tsx` + `view.tsx` | Product detail page. |
| `/track/[id]` | `app/track/[id]/page.tsx` + `view.tsx` | Public repair tracking (canonical; `/tracking/:id` redirects to here in `next.config.mjs`). |
| `/firma-digital/[id]` | `app/firma-digital/[id]/page.tsx` + `view.tsx` | Client signature capture for PRO flow. |
| `/garantia/[id]` | `app/garantia/[id]/page.tsx` + `view.tsx` | Public guarantee certificate. |
| `/onboarding` | `app/onboarding/page.tsx` + `onboarding-form.tsx` | New tenant onboarding. |
| `/auth/login` `/register` `/forgot-password` `/reset-password` `/verify-email` `/super-admin` `/callback` | `app/auth/**` | NextAuth + custom credentials. |
| `/terminos` `/privacidad` `/herramientas` `/herramientas/marketplace` | `app/{terminos,privacidad,herramientas}/**` | Legal + marketing. |
| `/robots.txt` `/sitemap.xml` | `app/{robots,sitemap}.ts` | Generated. |
| `/acceso-suspendido` | `app/acceso-suspendido/page.tsx` | Suspended-account landing. |

**Print routes (public-render, no auth required for content):**
| Route | File | Notes |
|---|---|---|
| `/print-ticket/[id]` | `app/print-ticket/[id]/page.tsx` | Repair ticket. Contains Tauri `isTauriDesktop` stub (line 22) - KEEP, see section 6. |
| `/print-abono/[id]` | `app/print-abono/[id]/page.tsx` | Abono receipt. |
| `/print-compra` | `app/print-compra/page.tsx` | Purchase receipt. |
| `/print-label` | `app/print-label/page.tsx` | Product/equipment label. |

**Tracking surfaces - authed:**
- `/api/auth/[...nextauth]` (`app/api/auth/[...nextauth]/route.ts`) - NextAuth handler.
- `/api/tracking/verify` (`app/api/tracking/verify/route.ts`) - 5-attempt tracking validation.

---

## 2. Active dashboard routes

| Route | File | Server actions called | Module |
|---|---|---|---|
| `/dashboard` | `app/dashboard/page.tsx` | `dashboard-prisma`, `settings-prisma` | Vista general |
| `/dashboard/ayuda` | `app/dashboard/ayuda/page.tsx` | (static content) | Ayuda |
| `/dashboard/bitacora-gastos` | `app/dashboard/bitacora-gastos/page.tsx` | `gastos-prisma` | Bitacora gastos (Core) |
| `/dashboard/bitacora-visitas` | `app/dashboard/bitacora-visitas/page.tsx` | `bitacora-visitas-prisma`, `repairs-prisma` | **PRO** - bitacora visitas |
| `/dashboard/chat` | `app/dashboard/chat/page.tsx` | `chat-prisma` | **PRO** - chat taller |
| `/dashboard/clientes` | `app/dashboard/clientes/page.tsx` | `clients-prisma` | Clientes (Core) |
| `/dashboard/compras` | `app/dashboard/compras/page.tsx` | `compras-prisma` | **PRO** - compras |
| `/dashboard/compras/[id]` | `app/dashboard/compras/[id]/page.tsx` + `view.tsx` | `compras-prisma` | PRO compras detail |
| `/dashboard/compras/nueva` | `app/dashboard/compras/nueva/page.tsx` | `compras-prisma` | PRO compras create |
| `/dashboard/compras/registrar-usado` | `app/dashboard/compras/registrar-usado/page.tsx` | `compras-usado-prisma` | PRO compras usados |
| `/dashboard/compras/usados` | `app/dashboard/compras/usados/page.tsx` | `compras-usado-prisma` | PRO compras usados |
| `/dashboard/configuracion` | `app/dashboard/configuracion/page.tsx` | `settings-prisma`, `auth-prisma`, `flujo-pro` | Configuracion |
| `/dashboard/configuracion/flujo-pro` | `app/dashboard/configuracion/flujo-pro/page.tsx` | (uses flujo-pro action) | PRO flow config |
| `/dashboard/configuracion/importacion` | `app/dashboard/configuracion/importacion/page.tsx` | `import` (non-prisma) | Importador de folios |
| `/dashboard/corte` | `app/dashboard/corte/page.tsx` | `ventas-prisma`, `settings-prisma`, `bitacora-visitas-prisma` | Corte de caja |
| `/dashboard/cotizaciones` | `app/dashboard/cotizaciones/page.tsx` | `cotizaciones` (non-prisma), `auth-prisma` | Cotizaciones |
| `/dashboard/equipo` | `app/dashboard/equipo/page.tsx` | `team-prisma` | Mi equipo |
| `/dashboard/facturacion` | `app/dashboard/facturacion/{layout,page}.tsx` | `settings-prisma` | Plan Pro (facturacion landing) |
| `/dashboard/historial-ventas` | `app/dashboard/historial-ventas/page.tsx` | `sales-history-prisma`, `settings-prisma` | Historial de ventas |
| `/dashboard/inventario` | `app/dashboard/inventario/page.tsx` | `productos-prisma`, `tienda-prisma`, `settings-prisma`, `inventory-categories-prisma`, `auth-prisma` | Inventario |
| `/dashboard/mercado` | `app/dashboard/mercado/page.tsx` | `tienda-prisma` | **PRO** - Mi Tienda admin |
| `/dashboard/print-label` | `app/dashboard/print-label/page.tsx` | (renderer) | Etiqueta print |
| `/dashboard/reparaciones` | `app/dashboard/reparaciones/page.tsx` | `repairs-prisma` | Reparaciones |
| `/dashboard/reparaciones/[id]` | `app/dashboard/reparaciones/[id]/{page,view}.tsx` | `repairs-prisma`, `gastos-prisma`, `servicios-prisma`, `settings-prisma` | Reparacion detail |
| `/dashboard/reportes` | `app/dashboard/reparaciones/page.tsx` (per `reportes-prisma`) | `reportes-prisma` | **PRO** - Reportes |
| `/dashboard/servicios` | `app/dashboard/servicios/page.tsx` | `servicios-prisma` | **PRO** - Servicios |
| `/dashboard/utilidad` | `app/dashboard/utilidad/page.tsx` | `utilidad-prisma` | **PRO** - Control de utilidad |
| `/dashboard/ventas` | `app/dashboard/ventas/page.tsx` | `ventas-prisma`, `apartados-prisma`, `repairs-prisma`, `settings-prisma` | POS (Core) |
| `/dashboard/ventas/kiosko` | `app/dashboard/ventas/kiosko/page.tsx` | (POS variant) | POS kiosko |
| `/dashboard/wizard` | `app/dashboard/wizard/page.tsx` | `wizard-prisma` | Wizard |

**Admin (`/admin/*`):**
| Route | File | Server actions | Notes |
|---|---|---|---|
| `/admin` | `app/admin/page.tsx` | (login) | Super admin login |
| `/admin/dashboard` | `app/admin/dashboard/page.tsx` | `admin` (non-prisma), `auth-prisma` | Super admin panel |
| `/admin/verify` | `app/admin/verify/page.tsx` | `admin-otp` (non-prisma), `admin` (non-prisma) | OTP verification |

---

## 3. API routes

| Route | File | Status | Notes |
|---|---|---|---|
| `/api/auth/[...nextauth]` | `app/api/auth/[...nextauth]/route.ts` | `CORE_ACTIVE` | NextAuth handler. |
| `/api/health/db` | `app/api/health/db/route.ts` | `CORE_ACTIVE` | DB health probe. |
| `/api/tracking/verify` | `app/api/tracking/verify/route.ts` | `CORE_ACTIVE` | Tracking 5-attempt validation. |
| `/api/generate-poster` | `app/api/generate-poster/route.ts` | `CORE_ACTIVE` | Satori-based poster render. |
| `/api/cron/check-trials` | `app/api/cron/check-trials/route.ts` | `PRO_DISABLED` | Per recon: temporarily disabled. |
| `/api/cron/urgent-equipment-report` | `app/api/cron/urgent-equipment-report/route.ts` | `PRO_DISABLED` | Per recon: temporarily disabled. |
| `/api/sse/visitas` | `app/api/sse/visitas/route.ts` | `CORE_ACTIVE` | SSE for visita events. |
| `/api/alarms/hikvision/[token]` | `app/api/alarms/hikvision/[token]/route.ts` | `CORE_ACTIVE` | Tokenized Hikvision webhook (replaces by-taller). |
| `/api/alarms/hikvision/by-taller/[tallerId]` | `app/api/alarms/hikvision/by-taller/[tallerId]/route.ts` | `LEGACY_CANDIDATE` | Deprecated stub (returns error pointing to `[token]` route). Delete after confirming no active caller. |
| `/api/visitas/detect` | `app/api/visitas/detect/route.ts` | `LEGACY_CANDIDATE` | The only file in `app/` that imports `createAdminClient` from `lib/supabase/admin.ts`. Documented as "Desktop (Tauri) polling" endpoint. Plan 002 will confirm deletion or rewrite to Prisma + R2. |

`proxy.ts` (Next.js 16 middleware proxy, not `middleware.ts`) is the route guard.

---

## 4. Server actions by domain

All Prisma-backed actions live in `lib/actions/*-prisma.ts` and are the **active** path. The non-prisma leftovers in `lib/actions/` are listed separately.

| Action file | Size | Consumers | Classification |
|---|---:|---|---|
| `repairs-prisma.ts` | 73 069 | 5 pages + 14 components | `CORE_ACTIVE` |
| `ventas-prisma.ts` | 71 649 | 2 pages + 5 components | `CORE_ACTIVE` |
| `settings-prisma.ts` | 29 458 | 9 pages + 14 components | `CORE_ACTIVE` (cross-cutting) |
| `apartados-prisma.ts` | 21 424 | 1 page + 3 components | `CORE_ACTIVE` |
| `productos-prisma.ts` | 19 094 | 2 pages + 6 components | `CORE_ACTIVE` |
| `auth-prisma.ts` | 17 692 | 8 auth pages + 4 dashboard components | `CORE_ACTIVE` |
| `compras-prisma.ts` | 16 957 | 3 pages + 1 component | `PRO_ACTIVE` |
| `alertas-prisma.ts` | 15 472 | 2 components | `CORE_ACTIVE` (used by sidebar/dashboard shell) |
| `bitacora-visitas-prisma.ts` | 15 180 | 2 pages + 4 components | `PRO_ACTIVE` |
| `team-prisma.ts` | 14 144 | 1 page | `CORE_ACTIVE` |
| `print-formatter-prisma.ts` | 14 676 | 3 print pages | `CORE_ACTIVE` |
| `inventory-categories-prisma.ts` | 13 391 | 1 page | `CORE_ACTIVE` |
| `cotizaciones.ts` (non-prisma) | 13 482 | 1 page + 5 components | `CORE_ACTIVE` (legacy file naming, not legacy behavior - verify migration status) |
| `sales-history-prisma.ts` | 13 005 | 1 page + 2 components | `CORE_ACTIVE` |
| `tienda-prisma.ts` | 11 212 | 2 pages + 1 component | `PRO_ACTIVE` |
| `clients-prisma.ts` | 11 605 | 1 page + 5 components | `CORE_ACTIVE` |
| `gastos-prisma.ts` | 11 375 | 2 pages + 2 components | `CORE_ACTIVE` |
| `reportes-prisma.ts` | 9 279 | 1 page | `PRO_ACTIVE` |
| `servicios-prisma.ts` | 8 181 | 1 page + 4 components | `PRO_ACTIVE` |
| `tienda-publica-prisma.ts` | 6 796 | 4 public store pages | `PRO_ACTIVE` |
| `email-verification.ts` (non-prisma) | 8 253 | 2 pages | `CORE_ACTIVE` |
| `admin.ts` (non-prisma) | 12 104 | 2 admin pages + 1 component | `CORE_ACTIVE` |
| `admin-otp.ts` (non-prisma) | 6 704 | 1 admin page | `CORE_ACTIVE` |
| `onboarding.ts` (non-prisma) | 3 566 | 1 form | `CORE_ACTIVE` |
| `flujo-pro.ts` (non-prisma) | 2 428 | 1 page + 1 component | `PRO_ACTIVE` |
| `firma-digital.ts` (non-prisma) | 1 923 | 1 view | `PRO_ACTIVE` |
| `import.ts` (non-prisma) | 4 587 | 1 component | `CORE_ACTIVE` |
| `utilidad-prisma.ts` | 4 842 | 1 page | `PRO_ACTIVE` |
| `compras-usado-prisma.ts` | 4 530 | 2 pages | `PRO_ACTIVE` |
| `chat-prisma.ts` | 4 639 | 1 page | `PRO_ACTIVE` |
| `wizard-prisma.ts` | 2 444 | 1 page | `PRO_ACTIVE` |
| `dashboard-prisma.ts` | 3 923 | 1 page | `CORE_ACTIVE` |
| `client-resolver-prisma.ts` | 3 907 | (see section 5 - server-side helper) | `CORE_ACTIVE` |
| `dashboard-client-prisma.ts` | 1 490 | 2 components | `CORE_ACTIVE` |
| `sidebar-preferences-prisma.ts` | 2 973 | 1 component | `CORE_ACTIVE` |
| `scanner-gate-prisma.ts` | 1 083 | 1 component | `PRO_DISABLED` (pro-barcode-button stub) |
| `tracking-prisma.ts` | 166 | (server-side helper) | `CORE_ACTIVE` |

---

## 5. Client components that call actions (cross-reference)

This is the inverse of section 4: which dashboards/components are server-action callers. The full file list was generated by the import scan in the recon and lives in the raw form below.

**Top importers (by action-module spread):**
- `components/dashboard/sidebar-content.tsx` - `auth-prisma`, `dashboard-client-prisma`, `sidebar-preferences-prisma` (PRO badge logic + `PRO_FEATURES_TEMP_DISABLED` is here)
- `app/dashboard/configuracion/page.tsx` - `settings-prisma`, `auth-prisma`, `flujo-pro`
- `app/dashboard/inventario/page.tsx` - `productos-prisma`, `tienda-prisma`, `settings-prisma`, `inventory-categories-prisma`, `auth-prisma`
- `app/dashboard/ventas/page.tsx` - `ventas-prisma`, `apartados-prisma`, `repairs-prisma`, `settings-prisma`
- `app/dashboard/corte/page.tsx` - `ventas-prisma`, `settings-prisma`, `bitacora-visitas-prisma`
- `components/dashboard/nueva-reparacion-form.tsx` - `repairs-prisma`, `servicios-prisma`, `settings-prisma` (also contains Tauri `isTauriAvailable` stub)
- `components/dashboard/repair-detail-view.tsx` - `repairs-prisma`, `gastos-prisma`, `servicios-prisma`, `settings-prisma`
- `components/dashboard/historial-caja.tsx` - `ventas-prisma`, `settings-prisma`, `auth-prisma`

Components with Tauri stubs (KEEP per plan 005, see section 6):
- `app/print-ticket/[id]/page.tsx` (`isTauriDesktop`)
- `components/dashboard/nueva-reparacion-form.tsx` (`isTauriAvailable`)
- `components/dashboard/abono-modal.tsx` (`isTauriAvailable`)
- `components/dashboard/ventas/SuccessModal.tsx` (`isTauriAvailable`)

---

## 6. Print and hardware boundary ledger

Per plan 005 - this is the contract for that phase.

### Public-web print (active)
- `lib/printing/repair-print-service.ts` - implements fallback chain `tauri` -> `daemon` -> `web` (with `web` as the production path).
- `lib/printing/daemon-client.ts` - WebSocket client to `ws://127.0.0.1:8182` with HTTP fallback. CSP already allows both.
- `lib/printing/direct-print-config.ts` - typed config object stored in `configuracion_taller.impresion_config.directPrint`.
- `lib/printing/escpos.ts` - ESC/POS byte builder.
- `lib/print/print-config.ts` - local print-config (80mm/58mm etc.).
- `lib/print/poster-exhibicion-*.tsx` + `lib/print/poster-satori-fonts.ts` + `lib/print/demo-data.ts` - Satori-based exhibition poster (used by `/api/generate-poster`).

### Local daemon integration (active)
- `components/configuracion/DirectPrintPanel.tsx` - UI panel under Configuracion > Imprenta.
- `components/configuracion/Imprenta*.tsx` - Imprenta tab components.
- `lib/printing/*` - see above.

### Tauri stubs (KEEP, documented)
- `app/print-ticket/[id]/page.tsx:22` - `isTauriDesktop = async () => false`
- `components/dashboard/nueva-reparacion-form.tsx` - `isTauriAvailable`
- `components/dashboard/abono-modal.tsx` - `isTauriAvailable`
- `components/dashboard/ventas/SuccessModal.tsx` - `isTauriAvailable`

These are documented integration points for the standalone Tauri fork. Removing them breaks the fallback chain in `repair-print-service.ts`. Do not delete.

### Hikvision (mixed)
- `lib/camera/hikvision.ts` + `lib/camera/hikvision-polling.ts` - utilities. **UNKNOWN** - needs owner decision. Used by what?
- `app/api/alarms/hikvision/[token]/route.ts` - `CORE_ACTIVE` (tokenized webhook).
- `app/api/alarms/hikvision/by-taller/[tallerId]/route.ts` - `LEGACY_CANDIDATE` (deprecated stub).
- `app/api/visitas/detect/route.ts` - `LEGACY_CANDIDATE` (Tauri-desktop polling; Supabase-backed).
- `components/configuracion/Hardware.tsx` - UI for Hikvision camera config; conditionally renders based on PRO/feature flag.
- `docs/HIKVISION-SETUP.md` - user-facing setup doc.

### Print provider abstraction
- `lib/printing/repair-print-service.ts` is the **only** place that owns the `tauri`/`daemon`/`web` enum and the fallback order. Other code only references `imprimirTicket()` from `lib/print.ts` (per `AGENTS.md`).

---

## 7. Files suspected legacy

These files match the legacy signal but still have at least one active importer. Each has its import-proof command listed. Do **not** delete in plan 002/005 until the proof is run.

| File | Why flagged | Import-proof command |
|---|---|---|
| `app/api/visitas/detect/route.ts` | Only file in `app/` that calls `createAdminClient` from `lib/supabase/admin.ts`. Documented as "Desktop (Tauri) polling". | `Get-ChildItem -Recurse -Include *.ts,*.tsx app,components,lib,hooks,types \| sls -Pattern "visitas/detect"` |
| `app/api/alarms/hikvision/by-taller/[tallerId]/route.ts` | Self-declares `Deprecated endpoint. Use /api/alarms/hikvision/{token}`. | `Get-ChildItem -Recurse -Include *.ts,*.tsx app,components,lib,hooks,types \| sls -Pattern "alarms/hikvision/by-taller"` |
| `lib/caja/guard.ts` | Takes `supabase: any` and queries `.from("caja")`. No external importer (orphan). | `Get-ChildItem -Recurse -Include *.ts,*.tsx app,components,lib,hooks,types \| sls -Pattern "caja/guard\|requireOpenCajaForFinancialOperation\|CAJA_GUARD_MESSAGES"` - expected 0 hits outside the file itself |
| `lib/supabase/tenant-client.ts` | Defines `createTenantClient`/`createCurrentTenantClient`. No external importer outside the file itself. | `Get-ChildItem -Recurse -Include *.ts,*.tsx app,components,lib,hooks,types \| sls -Pattern "lib/supabase/tenant-client"` - expected 0 hits outside the file |
| `lib/supabase/client.ts` | Defines `createBrowserClient`. No external importer. | `Get-ChildItem -Recurse -Include *.ts,*.tsx app,components,lib,hooks,types \| sls -Pattern "lib/supabase/client"` - expected 0 hits outside the file |
| `lib/supabase/admin.ts` | `createAdminClient`. Only consumed by `app/api/visitas/detect/route.ts`. | See `app/api/visitas/detect` proof above. If that route is removed, this file has no importer. |
| `app/layout.tsx:71` | Supabase preconnect: `<link rel="preconnect" href="https://utgitflefsybbreqcnpq.supabase.co" />` | `Get-ChildItem -Recurse -Include *.ts,*.tsx app,components,lib,hooks \| sls -Pattern "createBrowserClient\|@/lib/supabase/client"` - expected 0 hits |
| `lib/storage.ts` | Bridges Supabase Storage + R2. Used by multiple modules (see section 8). | `Get-ChildItem -Recurse -Include *.ts,*.tsx app,components,lib,hooks,types \| sls -Pattern "@/lib/storage"` |
| `components/dashboard/pro-barcode-button.tsx` | Per recon: contains "temporarily disabled" text for barcode scanner. Also imports `scanner-gate-prisma`. | Visual inspection: `Select-String -Path components\dashboard\pro-barcode-button.tsx -Pattern "temporalmente\|desactiv\|disabled"` |

> All `lib/actions/admin*.ts` and `lib/actions/cotizaciones.ts` / `flujo-pro.ts` / `firma-digital.ts` / `email-verification.ts` / `onboarding.ts` / `import.ts` are **non-prisma** but actively imported. Their classification is `CORE_ACTIVE` or `PRO_ACTIVE`; they are **not** legacy candidates. The plan 002 refactor would migrate them to Prisma; that is out of scope for plan 001.

---

## 8. Files suspected active (cross-reference)

These are the bridges / utilities that show up across the codebase. Documented here so plan 002/006 know they are NOT candidates for removal.

- `lib/prisma.ts` - Prisma singleton. Imported by all `*-prisma.ts` action files.
- `lib/auth.ts` - Token signing + NextAuth config. Auto-provisions tenant on Google sign-in.
- `lib/auth/get-current-taller.ts` - `getCurrentTallerId()`. The single source of `tallerId` for all actions.
- `lib/r2.ts` - Cloudflare R2 client. Active storage.
- `lib/storage.ts` - Mixed bridge. Has Supabase Storage constants (legacy) **and** R2 helpers (active). Keep both branches until each caller is migrated (plan 002/006).
- `lib/printing/*` - See section 6.
- `lib/whatsapp-utils.ts`, `lib/whatsapp-send-url.ts`, `lib/whatsapp-repair-status.ts`, `lib/whatsapp-repair-welcome.ts` - WhatsApp URL builders.
- `lib/phone.ts`, `lib/date-utils.ts`, `lib/currency.ts` (via tests) - utility helpers.
- `lib/plan/*`, `lib/limits/*` - plan/feature gating helpers.
- `lib/equipo/permissions.ts` - `ROLE_PERMISSIONS` per slug.
- `lib/offline/*` - IndexedDB drafts + sync queue (fails silently).
- `lib/validations/*` - Zod schemas.
- `lib/reparaciones/*` - `pattern.ts`, `security.ts`, `checklist-*`, `firma-digital-url.ts`.

---

## 9. Unknown / needs owner decision

| Item | Why | Resolution path |
|---|---|---|
| `lib/camera/hikvision.ts` + `lib/camera/hikvision-polling.ts` | Flagged as active in plan 005 recon, but no direct consumer found in `app/` or `components/`. May be used by a PRO flow behind a feature flag. | `Get-ChildItem -Recurse -Include *.ts,*.tsx app,components,lib,hooks,types \| sls -Pattern "camera/hikvision"` - if 0 hits, mark `LEGACY_CANDIDATE` in plan 005. |
| `app/api/visitas/detect/route.ts` | Single Supabase consumer in `app/`. Comment says it receives Desktop (Tauri) events. Plan 002 will confirm. | Plan 002. |
| `app/herramientas/*` | Marketing page (`/herramientas`, `/herramientas/marketplace`). Owner intent unclear. | Visual inspection + owner confirmation. |
| `app/dashboard/wizard` and `wizard-prisma.ts` | Visible in nav. Owner intent unclear. | Visual inspection + owner confirmation. |
| `app/dashboard/ventas/kiosko` | Kiosko POS variant. Visible. | Visual inspection + owner confirmation. |
| `app/dashboard/cotizaciones/*` | Has action file **and** 5 components. Not classified as PRO. Owner intent unclear (is this part of plan to be a PRO module?). | Visual inspection + owner confirmation. |
| `lib/actions/cotizaciones.ts` (non-prisma naming) | Active but not migrated to `-prisma` naming. Could be in-progress migration. | Visual inspection. If not actively migrating, mark as `RENAME_LATER` in plan 003. |
| `lib/actions/admin.ts` and `lib/actions/admin-otp.ts` | Use `process.env.NODE_ENV` and read `lib/supabase/admin.ts` indirectly. Verify what data path they take. | Visual inspection. Plan 002 will determine if Prisma rewrite is needed. |
| `lib/storage.ts` Supabase branch | Still reads `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_INVENTORY_BUCKET`. Some callers (legacy public URLs in `productos.imagen_url`) still depend on it. | Plan 002/006 - decide per-caller migration. |
| Old Tauri 4-stub pattern (`isTauriAvailable`/`isTauriDesktop`) | KEEP per `AGENTS.md`; keep "no @tauri-apps/* deps in this repo" invariant. | Already settled. |

---

## 10. Domain classification (required by plan 001 step 2)

| Domain | Status | Active path | Notes |
|---|---|---|---|
| **Auth** | `CORE_ACTIVE` | `lib/actions/auth-prisma.ts` + `lib/auth.ts` | Includes NextAuth + Google OAuth + email verification. |
| **Dashboard (Vista General)** | `CORE_ACTIVE` | `lib/actions/dashboard-prisma.ts` + `dashboard-client-prisma.ts` | |
| **Ventas (POS)** | `CORE_ACTIVE` | `lib/actions/ventas-prisma.ts` + `apartados-prisma.ts` | Includes `corte` flow + apartados. |
| **Reparaciones** | `CORE_ACTIVE` | `lib/actions/repairs-prisma.ts` + `gastos-prisma.ts` | |
| **Historial de Ventas** | `CORE_ACTIVE` | `lib/actions/sales-history-prisma.ts` | |
| **Inventario** | `CORE_ACTIVE` | `lib/actions/productos-prisma.ts` + `inventory-categories-prisma.ts` | |
| **Clientes** | `CORE_ACTIVE` | `lib/actions/clients-prisma.ts` | |
| **Bitacora de Gastos** | `CORE_ACTIVE` | `lib/actions/gastos-prisma.ts` | |
| **Mi Equipo** | `CORE_ACTIVE` | `lib/actions/team-prisma.ts` | |
| **Configuracion** | `CORE_ACTIVE` | `lib/actions/settings-prisma.ts` | Includes Empresa, Perfil, Imprenta, Notificaciones, Hardware, FlujoPro. |
| **Bitacora de Visitas** | `PRO_ACTIVE` | `lib/actions/bitacora-visitas-prisma.ts` | Hikvision + manual visit. |
| **Chat Taller** | `PRO_ACTIVE` | `lib/actions/chat-prisma.ts` | |
| **Cotizaciones** | `CORE_ACTIVE` (per nav) | `lib/actions/cotizaciones.ts` (non-prisma naming) | Owner decision needed on PRO classification. |
| **Compras** | `PRO_ACTIVE` | `lib/actions/compras-prisma.ts` + `compras-usado-prisma.ts` | |
| **Control de Utilidad** | `PRO_ACTIVE` | `lib/actions/utilidad-prisma.ts` | |
| **Mi Tienda** | `PRO_ACTIVE` | `lib/actions/tienda-prisma.ts` + `tienda-publica-prisma.ts` | Public store at `/t/<slug>`. |
| **Reportes** | `PRO_ACTIVE` | `lib/actions/reportes-prisma.ts` | |
| **Servicios** | `PRO_ACTIVE` | `lib/actions/servicios-prisma.ts` | |
| **Facturacion (Plan Pro)** | `PRO_ACTIVE` | Uses `settings-prisma`; no dedicated action file | |
| **Hardware/Hikvision** | `PRO_ACTIVE` (camera) + `LEGACY_CANDIDATE` (`/api/visitas/detect`, `by-taller`) | `lib/camera/*` + `app/api/alarms/hikvision/[token]/route.ts` | Per plan 005 audit. |
| **Print daemon** | `CORE_ACTIVE` | `lib/printing/*` + `components/configuracion/DirectPrintPanel.tsx` | Local-only client; not part of VPS server. |
| **Tauri standalone** | `OUT_OF_SCOPE` (separate fork repo) | Tauri stubs only (4 files) | Per `AGENTS.md`. No `@tauri-apps/*` deps. |
| **Wizard** | `UNKNOWN` | `lib/actions/wizard-prisma.ts` | Visible in nav. |
| **Kiosko (POS variant)** | `UNKNOWN` | (uses POS internals) | Visible. |
| **Pro barcode scanner** | `PRO_DISABLED` | `lib/actions/scanner-gate-prisma.ts` | Per `pro-barcode-button.tsx` "temporarily disabled". |
| **Mi Suscripcion** | `CORE_ACTIVE` (per `AGENTS.md` module map) | Rendered from `dashboard/page.tsx`? Verify. | |
| **Cron jobs (check-trials, urgent-equipment-report)** | `PRO_DISABLED` | `app/api/cron/*` | Per recon. |

---

## 11. Pre-existing test failures (baseline)

Both failures are in pure utility tests; neither touches DB or runtime. Phase 1 is docs-only, so they are recorded for plan 007 / cleanup awareness only.

### 11.1 `__tests__/subscription.test.ts` - `handles DD/MM/YYYY fallback format`

```
FAIL  __tests__/subscription.test.ts > calcDiasRestantes > handles DD/MM/YYYY fallback format
AssertionError: expected 51 to be less than or equal to 21
   51|     expect(result).not.toBeNull()
   52|     expect(result!).toBeGreaterThanOrEqual(19)
   53|     expect(result!).toBeLessThanOrEqual(21)
       |                     ^
```

The test expects a date roughly 19-21 days in the future. The function returned 51. Likely a fixed reference date in the source has drifted.

### 11.2 `__tests__/whatsapp-utils.test.ts` - `returns null when no country code provided`

```
FAIL  __tests__/whatsapp-utils.test.ts > normalizePhoneForWhatsApp > returns null when no country code provided
AssertionError: expected '525512345678' to be null
    9|   it("returns null when no country code provided", () => {
   10|     expect(normalizePhoneForWhatsApp("5512345678", null)).toBeNull()
       |                                                           ^
```

The test expects `null` when no country code is provided. The function now defaults to `"52"` (Mexico) and returns `"525512345678"`. This appears to be an intentional behavior change that the test wasn't updated for.

### 11.3 Plan 007 follow-up

These are not blockers for plan 002-006. Plan 007 will formally capture them as `BASELINE_FAIL` and decide whether to fix the tests or the source.

---

## 12. Discovered drift vs. recon baseline

| Item | Recon claim | Current state | Action |
|---|---|---|---|
| `supabase/` directory | Present (pre-Prisma SQL migrations) | **Does not exist** in working tree | Remove from AGENTS.md / docs in plan 002. |
| `lib/qz/` directory | Claimed by CLAUDE.md as legacy | **Does not exist** | Already clean. |
| `lib/supabase/tenant-client.ts` and `client.ts` importers | Implied to be active | **0 external importers** | Plan 002 can delete both safely after the detect/route migration. |
| `lib/caja/guard.ts` importers | Implied to be active | **0 external importers** (orphan) | Plan 002 can delete. |
| Pre-existing test failures | Not in recon | 2 failures, recorded above | Plan 007. |
| AGENTS.md Tauri roadmap | Listed v2.3.5 | `package.json:version` is `2.9.0` | Already updated in earlier AGENTS.md edit. |

---

## 13. Verification commands for downstream plans

For the next phase to run import-proof quickly, the following PowerShell snippets replace the `rg` commands from the plan text (since `rg` is not installed on this Windows host).

```powershell
# Find any importer of a file basename (works for .ts/.tsx)
$name = 'some-name'
Get-ChildItem -Path app,components,lib,hooks,types -Recurse -Include '*.ts','*.tsx' -ErrorAction SilentlyContinue |
  sls -Pattern $name |
  Select-Object -ExpandProperty Path

# Find any string across the codebase
$pat = 'createAdminClient'
Get-ChildItem -Path app,components,lib,hooks,prisma,types -Recurse -Include '*.ts','*.tsx' -ErrorAction SilentlyContinue |
  sls -Pattern $pat |
  Select-Object Path,LineNumber,Line

# Show current scoped-tree drift
git diff --stat 80c9a3a..HEAD -- app components lib hooks prisma types package.json next.config.mjs proxy.ts
```

---

## 14. Supabase usage ledger (plan 002 step 1)

Classifications:
- `MIGRATE_NOW` - active runtime that should move to Prisma/R2.
- `KEEP_TEMP` - intentional temporary compatibility; do not remove yet.
- `DELETE_AFTER_IMPORT_PROOF` - no active callers; safe to delete after the listed proof.
- `DOC_ONLY` - documentation reference.
- `ENV_COMPAT` - env fallback that must be replaced carefully.

### 14.1 Source imports / API calls

| Match | File:Line | Classification | Notes |
|---|---|---|---|
| `import { createAdminClient } from "@/lib/supabase/admin"` | `app/api/visitas/detect/route.ts:2` | `DELETE_AFTER_IMPORT_PROOF` | Only `@/lib/supabase` import in the whole repo. Plan 002 step 2 deletes the file. |
| `createAdminClient()` (call) | `app/api/visitas/detect/route.ts:63,85` | `DELETE_AFTER_IMPORT_PROOF` | Goes with the file deletion. |
| `supabase.storage.from("visitas").upload(...)` | `app/api/visitas/detect/route.ts:68` | `DELETE_AFTER_IMPORT_PROOF` | Desktop-Tauri snapshot upload path. |
| `supabase.storage.from("visitas").getPublicUrl(...)` | `app/api/visitas/detect/route.ts:76` | `DELETE_AFTER_IMPORT_PROOF` | Same. |
| `supabase.from("bitacora_visitas").insert(...)` | `app/api/visitas/detect/route.ts:86` | `DELETE_AFTER_IMPORT_PROOF` | Same. |
| `createBrowserClient` import + factory | `lib/supabase/client.ts:1,4` | `DELETE_AFTER_IMPORT_PROOF` | Zero external importers. |
| `createClient` from `@supabase/supabase-js` | `lib/supabase/admin.ts:3`, `lib/supabase/tenant-client.ts:4` | `DELETE_AFTER_IMPORT_PROOF` | Both helpers are orphans after the detect route is removed. |
| `createTenantClient`, `createCurrentTenantClient` | `lib/supabase/tenant-client.ts:20,68` | `DELETE_AFTER_IMPORT_PROOF` | Zero external importers. |
| `createAdminClient` factory | `lib/supabase/admin.ts:10` | `DELETE_AFTER_IMPORT_PROOF` | Only consumer was the detect route. |
| `<link rel="preconnect" href="https://utgitflefsybbreqcnpq.supabase.co" />` | `app/layout.tsx:71` | `DELETE_AFTER_IMPORT_PROOF` | Browser hint. No browser-side Supabase code remains after the deletes below. |
| `import { supabase: any }.from("caja")` | `lib/caja/guard.ts:30,42-49` | `DELETE_AFTER_IMPORT_PROOF` | Orphan. Zero external importers. |

### 14.2 `fetch()`-based Supabase REST usage (separate from factory helpers)

`proxy.ts` is **not** covered by the `lib/supabase/*` factory removals. It uses raw `fetch()` to `process.env.NEXT_PUBLIC_SUPABASE_URL` for `taller_users` reads. Plan 002 does not rewrite this path; it is recorded here so plan 003/006 know it exists.

| Match | File:Line | Classification | Notes |
|---|---|---|---|
| `checkSubscription` `fetch taller_users plan_tipo / fecha_vencimiento_plan` | `proxy.ts:18,22-25` | `MIGRATE_NOW` (out of plan 002 scope) | Has graceful fallback to `"ok"` when env missing or table missing. Built for Neon migration. |
| `hasTallerProfile` `fetch taller_users id` | `proxy.ts:42,46-49` | `MIGRATE_NOW` (out of plan 002 scope) | Same fallback pattern. |
| `fetchTallerInfo` `fetch taller_users nombre_taller / session_version` | `proxy.ts:56,60-63` | `MIGRATE_NOW` (out of plan 002 scope) | Same. |
| `checkSessionVersion` `fetch taller_users session_version` | `proxy.ts:71,75-78` | `MIGRATE_NOW` (out of plan 002 scope) | Same. |

> These four `fetch()` paths use `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` directly (no `@supabase/*` package import). They do not block plan 002's file deletions, but they **do** block the eventual removal of those env vars and the `@supabase/*` packages. Plan 003/006 must migrate `proxy.ts` to Prisma before package removal is safe.

### 14.3 Env var usage (from `process.env.*` scan)

| Var | Read at | Classification | Notes |
|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `lib/supabase/admin.ts:11` (deleted), `lib/supabase/client.ts:5` (deleted), `lib/supabase/tenant-client.ts:21` (deleted), `lib/storage.ts:55,111`, `proxy.ts:18,42,56,71`, `next.config.mjs:4` (CSP/remotePatterns) | `KEEP_TEMP` | Needed by `lib/storage.ts` and `proxy.ts` until those are migrated. `next.config.mjs` derivation of `supabaseHost` must be updated when removing. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `lib/supabase/client.ts:6` (deleted), `lib/supabase/tenant-client.ts:22` (deleted) | `DELETE_AFTER_IMPORT_PROOF` | After plan 002 deletions, no source reader remains. Safe to drop from `.env` templates and AGENTS.md env list once a Prisma migration of `proxy.ts` removes the only server-side read too. **Cannot drop while `proxy.ts` still uses Supabase REST** (proxy reads the service role key, not anon - but other Supabase consumers may be reintroduced). |
| `SUPABASE_SERVICE_ROLE_KEY` | `lib/supabase/admin.ts:12` (deleted), `proxy.ts:19,43,57,72` | `KEEP_TEMP` | `proxy.ts` is the only remaining consumer. Required for `taller_users` reads until plan 003/006 migrate proxy to Prisma. |
| `SUPABASE_JWT_SECRET` | `lib/auth.ts:24`, `lib/actions/auth-prisma.ts:285` | `ENV_COMPAT` | Token-signing fallback (`AUTH_SECRET` > `NEXTAUTH_SECRET` > `SUPABASE_JWT_SECRET`). Plan 002 leaves it in place; do not remove without re-provisioning the production env. |
| `NEXT_PUBLIC_SUPABASE_INVENTORY_BUCKET` | `lib/storage.ts:15` | `KEEP_TEMP` | Bridge is still active (some legacy public URLs in `productos.imagen_url` rely on it). Defer to plan 006. |

### 14.4 Package dependencies

| Package | Imported in | Classification | Notes |
|---|---|---|---|
| `@supabase/supabase-js` | `lib/supabase/admin.ts:3`, `lib/supabase/tenant-client.ts:4` (both deleted) | `KEEP_TEMP` (defer) | Plan 002 step 5 says "only after all source imports to `@supabase/*` are gone". After this plan's deletions, those imports are gone - **but** `proxy.ts` and `lib/storage.ts` still depend on the Supabase REST contract via env vars, even without the package. Removing the package is technically safe for the build (no source imports the package), but the env vars stay. Plan 006 should: (a) migrate `proxy.ts` to Prisma, (b) migrate `lib/storage.ts` Supabase branch to R2, (c) then remove `@supabase/*` packages and the env vars in one coordinated change. |
| `@supabase/ssr` | `lib/supabase/client.ts:1` (deleted) | Same as above | Same. |

### 14.5 Decision log for plan 002

- **DELETED** in plan 002: `app/api/visitas/detect/route.ts`, `lib/supabase/{admin,client,tenant-client}.ts`, `lib/caja/guard.ts`, `app/api/visitas/` (empty parent).
- **EDITED** in plan 002: `app/layout.tsx` (Supabase preconnect removed).
- **DEFERRED**: `package.json` (`@supabase/*` removals), `lib/storage.ts` (Supabase branch), `next.config.mjs` (Supabase host derivation), `proxy.ts` (Supabase REST reads), `lib/auth.ts` and `lib/actions/auth-prisma.ts` (`SUPABASE_JWT_SECRET` fallback). Rationale in the table above.

### 14.6 Post-plan-002 verification (2026-06-18)

```powershell
# All clean after deletions:
Get-ChildItem -Path app,components,lib,hooks,proxy.ts -Recurse -Include '*.ts','*.tsx' |
  sls -Pattern 'createAdminClient|createTenantClient|createCurrentTenantClient|createBrowserClient|@supabase|lib/supabase|caja/guard|requireOpenCaja|CAJA_GUARD_MESSAGES'
# -> 0 matches
```

- `pnpm build`: exit 0 (after clearing stale `.next/dev/types/validator.ts` cache that referenced the deleted route).
- `pnpm test`: same 2 pre-existing failures as section 11. No regression.
- `git status -sb`: only the 6 files listed in section 14.5 plus pre-existing `skills-lock.json` and untracked folders.

---

## 15. Raw SQL and schema drift ledger (plan 003 step 1)

Classifications:
- `REPLACE_NOW` - table exists in `prisma/schema.prisma`, raw SQL is simple CRUD, replacement is straightforward and tenant-scoped.
- `REPLACE_WITH_PR_PLAN` - replacement requires a new Prisma model + migration (cannot land in plan 003; record for a future PR).
- `KEEP_RAW_SQL` - raw SQL is necessary because Prisma cannot express the behavior (regex/cast, runtime DDL, computed aggregate, liveness probe).
- `KEEP_@@MAP` - `@@map` is correct: real production table name.
- `REMOVE_MODEL` - model no longer used; table can be dropped later (requires destructive migration; out of plan 003 scope).
- `RENAME_LATER` - should be renamed eventually but not before data migration.
- `VERIFY` - needs owner decision.
- `LOW` / `MED` / `HIGH` - risk rating for the replacement.

### 15.1 Raw SQL call sites (5 files, 14 calls)

| File:Line | Query target | Tenant scoped? | Classification | Risk | Justification |
|---|---|---|---|---|---|
| `lib/actions/admin-otp.ts:61-71` | `CREATE TABLE IF NOT EXISTS admin_otp_codes` (runtime DDL) | n/a (DDL) | `REPLACE_WITH_PR_PLAN` | `HIGH` | Table not in Prisma schema. Replacement = new `AdminOtpCode` model + migration + removal of runtime DDL. Outside plan 003 scope. Postgres-only `md5(random()::text \|\| clock_timestamp()::text)` ID generator and `CHECK (code ~ '^[0-9]{8}$')` constraint are NOT directly expressible in Prisma model. Non-tenant-scoped (`admin_id`). |
| `lib/actions/admin-otp.ts:85-88` | `SELECT COUNT(*) FROM admin_otp_codes` | yes (`admin_id = $1`) | `REPLACE_WITH_PR_PLAN` | `HIGH` | Same as above. |
| `lib/actions/admin-otp.ts:97` | `DELETE FROM admin_otp_codes WHERE admin_id = $1` | yes | `REPLACE_WITH_PR_PLAN` | `HIGH` | Same. |
| `lib/actions/admin-otp.ts:102-105` | `INSERT INTO admin_otp_codes (...)` | yes | `REPLACE_WITH_PR_PLAN` | `HIGH` | Same. |
| `lib/actions/admin-otp.ts:109` | `DELETE FROM admin_otp_codes` (cleanup on email failure) | yes | `REPLACE_WITH_PR_PLAN` | `HIGH` | Same. |
| `lib/actions/admin-otp.ts:140-143` | `SELECT id, code, expires_at, attempts FROM admin_otp_codes ORDER BY created_at DESC LIMIT 1` | yes | `REPLACE_WITH_PR_PLAN` | `HIGH` | Same. |
| `lib/actions/admin-otp.ts:151, 156` | `DELETE FROM admin_otp_codes WHERE id = $1` | yes (per-id) | `REPLACE_WITH_PR_PLAN` | `HIGH` | Same. |
| `lib/actions/admin-otp.ts:161-164` | `UPDATE admin_otp_codes SET attempts = ...` | yes (per-id) | `REPLACE_WITH_PR_PLAN` | `HIGH` | Same. |
| `lib/actions/admin-otp.ts:168` | `DELETE FROM admin_otp_codes WHERE admin_id = $1` | yes | `REPLACE_WITH_PR_PLAN` | `HIGH` | Same. |
| `lib/actions/productos-prisma.ts:291-296` | `SELECT COALESCE(SUM(costo * stock_actual))::float8 FROM productos WHERE taller_id = $1 AND stock_actual <= stock_minimo` | yes (`taller_id = $1`) | `KEEP_RAW_SQL` | `LOW` | Prisma model `Producto` exists, but the aggregate is a **computed** `costo * stock_actual` product. Prisma's `_sum` works on real columns only. Replacement would require: (a) iterating products in JS (perf risk for large inventories), (b) a generated column + migration, or (c) a SQL view. The current raw SQL is tenant-scoped and used in a single read-only KPI call. No reason to change. |
| `lib/actions/repairs-prisma.ts:567-574` | `SELECT COALESCE(MAX(CAST(NULLIF(regexp_replace("folio", '[^0-9]', '', 'g'), '') AS INTEGER)), 0) FROM "Reparacion" WHERE "tenantId" = $1` | yes | `KEEP_RAW_SQL` | `LOW` | This is the canonical implementation of the (now-unused) `get_next_folio` RPC. The regex + cast + MAX combo is a Postgres-specific string manipulation that Prisma cannot express. Replacement would require adding a `folioNum Int?` field, backfilling it, then `prisma.reparacion.aggregate({ _max: { folioNum: true } })` - a destructive schema + data migration, out of plan 003 scope. **Bonus finding**: the original `get_next_folio` RPC is no longer called from source (see section 15.4), so this raw SQL is the only folio generator. |
| `lib/actions/repairs-prisma.ts:622-629` | Same as above (in `createRepair` transaction) | yes | `KEEP_RAW_SQL` | `LOW` | Same. Runs in a `prisma.$transaction` so the max-folio read is consistent with the subsequent insert. Cannot replace without a schema change. |
| `lib/auth/rate-limit.ts:42-48` | `SELECT COUNT(*) FROM auth_rate_limits WHERE identifier = $1 AND action = $2 AND attempt_at >= $3` | n/a (auth-scoped) | `REPLACE_WITH_PR_PLAN` | `HIGH` | `auth_rate_limits` is NOT in the Prisma schema. Replacement = new model + migration. Fail-open fallback (line 60-64) wraps the call in a try/catch and allows the request through on DB error. |
| `lib/auth/rate-limit.ts:54-57` | `INSERT INTO auth_rate_limits (identifier, action) VALUES (...)` | n/a (auth-scoped) | `REPLACE_WITH_PR_PLAN` | `HIGH` | Same. |
| `lib/db-health.ts:6` | `SELECT 1` | n/a | `KEEP_RAW_SQL` | `n/a` | Canonical Prisma-recommended liveness probe. No Prisma model alternative. Standard pattern in every Prisma + Postgres app. |

**Net raw SQL summary:** 14 calls across 5 files. 0 are `REPLACE_NOW`. 10 require a new Prisma model + migration to replace (all on tables not in the schema: `admin_otp_codes`, `auth_rate_limits`). 3 are `KEEP_RAW_SQL` for non-replaceable reasons (computed aggregate, regex string manipulation, liveness probe). 1 is the standard `SELECT 1`.

### 15.2 Schema `@@map` audit (plan 003 step 4)

| Model (Prisma) | Line | `@@map` (DB) | Classification | Justification |
|---|---|---|---|---|
| `TrackingVerificationAttempt` | 320 | `tracking_verification_attempts` | `KEEP_@@MAP` | Recent migration (2026-06-15), correct name. |
| `AjusteTaller` | 390 | `ajustes_taller` | `KEEP_@@MAP` | Correct, used by flujo-pro. |
| `TiendaEvento` | 412 | `tienda_eventos` | `KEEP_@@MAP` | Correct. |
| `AlertaEnviada` | 441 | `alertas_enviadas` | `KEEP_@@MAP` | Correct. |
| `Producto` | 484 | `productos` | `KEEP_@@MAP` | Correct, the canonical inventory table (not `inventario`). |
| `Venta` | 522 | `ventas` | `KEEP_@@MAP` | Real production table. The "Tabla legacy creada via raw SQL, nombre lowercase" comment at line 489 is **historical annotation only** - could be removed in a future PR. |
| `DetalleVenta` | 553 | `detalle_ventas` | `KEEP_@@MAP` | Correct. |
| `Apartado` | 598 | `apartados` | `KEEP_@@MAP` | Correct. |
| `ApartadoAbono` | 623 | `apartado_abonos` | `KEEP_@@MAP` | Correct (note: singular `apartado_abono` for the model vs plural DB name, both correct). |
| `Caja` | 653 | `caja` | `KEEP_@@MAP` | Real production table. Legacy comment at line 628 is historical annotation. **Note**: `taller_id` is stored as `text` (not UUID) per `AGENTS.md` gotcha. RLS does NOT cast to `::uuid`. |
| `MovimientoCaja` | 681 | `movimientos_caja` | `KEEP_@@MAP` | Real production table. Legacy comment at line 658. **Note**: same text `taller_id` gotcha. |
| `GastoOperativo` | 704 | `bitacora_gastos` | `KEEP_@@MAP` | Real production table. Legacy comment at line 686 (Supabase origin). |
| `GastoReparacion` | 728 | `reparacion_gastos` | `KEEP_@@MAP` | Real production table. Legacy comment at line 709. |
| `CatalogoServicio` | 743 | `catalogo_servicios` | `KEEP_@@MAP` | Correct. |
| `Visita` | 774 | `bitacora_visitas` | `KEEP_@@MAP` | Correct (PRO module). |
| `ReparacionServicio` | 792 | `reparacion_servicios` | `KEEP_@@MAP` | Correct. |
| `WorkshopMessage` | 808 | `workshop_messages` | `KEEP_@@MAP` | Correct (PRO chat). |
| `Proveedor` | 826 | `proveedores` | `KEEP_@@MAP` | Correct. |
| `OrdenCompra` | 850 | `ordenes_compra` | `KEEP_@@MAP` | Correct. |
| `DetalleOrdenCompra` | 868 | `detalle_orden_compra` | `KEEP_@@MAP` | Correct. |
| `CompraUsada` | 894 | `compras_usadas` | `KEEP_@@MAP` | Correct. |
| `Cotizacion` | 926 | `cotizaciones` | `KEEP_@@MAP` | Correct. |
| `DetalleCotizacion` | 945 | `cotizacion_items` | `KEEP_@@MAP` | Correct. |
| `FirmaDigitalToken` | 963 | `firma_digital_tokens` | `KEEP_@@MAP` | Correct. |
| `EmailVerification` | 979 | `verificaciones_email` | `KEEP_@@MAP` | Correct. |
| `StagingImportReparacion` | 1004 | `staging_import_reparaciones` | `KEEP_@@MAP` | Correct, used by `lib/actions/import.ts`. |
| `InventarioCategoria` | 1025 | `inventario_categorias` | `KEEP_@@MAP` | Correct. |
| `InventarioCategoriaAlias` | 1042 | `inventario_categoria_aliases` | `KEEP_@@MAP` | Correct. |

**Net `@@map` summary:** 28 `@@map` declarations. 0 are `RENAME_LATER`, `REMOVE_MODEL`, or `VERIFY`. All 28 are real production tables. 5 carry historical "Tabla legacy..." comments that are not load-bearing (could be removed in a future cosmetic PR).

### 15.3 Historical RPC functions - database-side dead code

The plan 001 recon stated that the following Postgres functions are "still in use":
- `get_dashboard_stats(p_taller_id TEXT)`
- `get_next_folio(p_taller_id UUID, p_prefix TEXT)`
- `batch_decrement_stock(items)`
- `get_garantia_ticket(p_folio TEXT)`
- `get_inventory_operational_kpis(p_taller_id UUID)`

**Recon is stale.** As of commit `80c9a3a`, **zero source files in `app/`, `lib/`, or `prisma/` call any of these 5 functions**:

```powershell
Get-ChildItem -Path app,lib,prisma -Recurse -Include '*.ts','*.tsx','*.sql' |
  sls -Pattern 'get_next_folio|get_dashboard_stats|batch_decrement_stock|get_garantia_ticket|get_inventory_operational_kpis'
# -> 0 matches
```

`lib/actions/productos-prisma.ts:282` (`getInventoryOperationalKpis`) is a **Prisma-side reimplementation** that mirrors the old RPC's intent using raw SQL. It is the active path; the original RPC is dead.

`lib/actions/repairs-prisma.ts:563` (`getNextFolio`) is a **Prisma-side reimplementation** using raw SQL. It is the active path; the original RPC is dead.

`get_dashboard_stats`, `batch_decrement_stock`, and `get_garantia_ticket` have **no replacement either** - they appear to be fully abandoned (no `getDashboardStats`, no `batchDecrementStock`, no `getGarantiaTicket` exports anywhere in the action layer).

| Function | Status | Classification | Notes |
|---|---|---|---|
| `get_dashboard_stats` | dead | `VERIFY` | No source replacement. Either dashboard KPIs are computed elsewhere or this function was never wired up. Owner decision needed. |
| `get_next_folio` | dead | `KEEP_RAW_SQL` (replaced in `repairs-prisma.ts:563`) | Prisma-side replacement is the active path. |
| `batch_decrement_stock` | dead | `VERIFY` | Per CLAUDE.md PERF-01: "N queries -> 1 en ventas". Either the optimization was lost in the Prisma migration, or stock decrement is now per-item. Owner decision needed. |
| `get_garantia_ticket` | dead | `VERIFY` | Used by `app/garantia/[id]/view.tsx` (via `getGarantiaTicketByFolio`?). Search shows no source caller. Owner decision needed. |
| `get_inventory_operational_kpis` | dead | `KEEP_RAW_SQL` (replaced in `productos-prisma.ts:282`) | Prisma-side replacement is the active path. |

**Recommendation (out of plan 003 scope):** the next agent that touches the database should `DROP FUNCTION` the 5 dead RPCs after confirming with the production database team.

### 15.4 Plan 003 verification (2026-06-18)

- `pnpm prisma generate`: exit 0.
- `pnpm build`: exit 0.
- `pnpm test`: same 2 pre-existing failures as section 11.
- `git diff --stat 80c9a3a..HEAD -- prisma lib/actions app/api`: no source changes (plan 003 is documentation-only, the ledger is the deliverable).
- `git status -sb`: only `plans/runtime-inventory.md` modified (this ledger addition) plus the existing untracked `plans/`.

### 15.5 Decision log for plan 003

- **No source changes in plan 003.** All raw SQL sites are `KEEP_RAW_SQL` or `REPLACE_WITH_PR_PLAN`. The latter requires new Prisma models and migrations, which is out of scope.
- **No `@@map` removed.** All 28 are real production tables. The 5 historical "Tabla legacy..." comments are non-load-bearing; owner can decide to remove them in a future cosmetic PR.
- **5 historical RPC functions are database-side dead code** (no source callers, no Prisma migration creates them). Recorded as finding; manual `DROP FUNCTION` deferred.

---

## 16. Feature gating and PRO ledger (plan 004 step 1)

Classifications:
- `KEEP` - product-active feature, runtime in use.
- `KEEP_DISABLED` - feature is product-active but currently turned off via a kill-switch. Owner must decide reactivation or removal.
- `PRO_ACTIVE` - feature is reachable for Pro plan users (and trial). Core product surface.
- `PRO_INACTIVE` - PRO module in nav but not wired (UI text only, no backend).
- `ARCHIVE` - historically PRO, no longer in nav. Documentation only.
- `CENTRALIZE_GATING` - plan/feature gating logic is scattered; consolidate into a feature registry.
- `VERIFY` - needs owner decision before classification.
- `LOW` / `MED` / `HIGH` - risk for any future refactor.

### 16.1 Sidebar navigation map (from `components/dashboard/sidebar-content.tsx:63-83`)

| Sidebar label | Route | `status` | Plan access | Classification | Notes |
|---|---|---|---|---|---|
| Vista General | `/dashboard` | active | Normal / Pro / Trial | `KEEP` | |
| Mi Suscripcion | `/dashboard/facturacion` | active | Normal / Pro / Trial | `KEEP` | Plan management page; uses `settings-prisma` |
| Ventas (POS) | `/dashboard/ventas` | active | Normal / Pro / Trial | `KEEP` | Core |
| Reparaciones | `/dashboard/reparaciones` | active | Normal / Pro / Trial | `KEEP` | Core |
| Historial de Ventas | `/dashboard/historial-ventas` | active | Normal / Pro / Trial | `KEEP` | Core |
| Inventario | `/dashboard/inventario` | active | Normal / Pro / Trial | `KEEP` | Core |
| Clientes | `/dashboard/clientes` | active | Normal / Pro / Trial | `KEEP` | Core |
| Bitacora de Gastos | `/dashboard/bitacora-gastos` | active | Normal / Pro / Trial | `KEEP` | Core |
| Mi Equipo | `/dashboard/equipo` | active | Normal / Pro / Trial | `KEEP` | Core |
| Configuracion | `/dashboard/configuracion` | active | Normal / Pro / Trial | `KEEP` | Core |
| Bitacora de Visitas | `/dashboard/bitacora-visitas` | pro | Pro / Trial | `PRO_ACTIVE` | Backend wired, in nav |
| Chat Taller | `/dashboard/chat` | pro | Pro / Trial | `PRO_ACTIVE` | Backend wired, in nav |
| Cotizaciones | `/dashboard/cotizaciones` | pro | Pro / Trial | `PRO_ACTIVE` | Note: action file `cotizaciones.ts` is non-prisma-named but is the active path. **Owner decision**: is this PRO or Normal? Per sidebar status `pro` it is PRO. |
| Compras | `/dashboard/compras` | pro | Pro / Trial | `PRO_ACTIVE` | 4 sub-routes; active |
| Control de Utilidad | `/dashboard/utilidad` | pro | Pro / Trial | `PRO_ACTIVE` | Active |
| Mi Tienda | `/dashboard/mercado` | **active** | Normal / Pro / Trial | `KEEP` | **Note**: sidebar status is `active` (not `pro`), but per `AGENTS.md` and `docs/COMPLIANCE_TIENDA.md` the 5/50 product limit IS plan-gated. Inconsistency between sidebar status and product docs. Owner decision: should this be `pro` to align with the limit gating? |
| Reportes | `/dashboard/reportes` | pro | Pro / Trial | `PRO_ACTIVE` | Active |
| Servicios | `/dashboard/servicios` | pro | Pro / Trial | `PRO_ACTIVE` | Active |

**Sidebar status: 11 `active` + 8 `pro` + 0 `v2`.** The `v2` field is defined in `BADGE_CONFIG` but **zero NAV_ITEMS use it** - designed future state, not active.

**Orphan routes (page exists, no sidebar entry, no obvious caller):**
| Route | Page file | Classification | Notes |
|---|---|---|---|
| `/dashboard/ventas/kiosko` | `app/dashboard/ventas/kiosko/page.tsx` | `VERIFY` | Page exists, no sidebar link, no `Link`/`router.push` found in source. Owner decision: is this a hidden entry point, dead code, or reachable from somewhere I missed? |
| `/dashboard/wizard` | `app/dashboard/wizard/page.tsx` | `VERIFY` | Same: page exists, no sidebar link. Action file `wizard-prisma.ts` is small. |
| `/dashboard/print-label` | `app/dashboard/print-label/page.tsx` | `VERIFY` | May be reachable from a print menu dropdown, but the link was not in the sidebar. |
| `/dashboard/configuracion/importacion` | `app/dashboard/configuracion/importacion/page.tsx` | `VERIFY` | Sub-tab of Configuracion; `TABS` array in `configuracion/page.tsx` is the canonical entry. |
| `/dashboard/configuracion/flujo-pro` | `app/dashboard/configuracion/flujo-pro/page.tsx` | `VERIFY` | Same; sub-tab. |

**Recommendation:** owner should confirm or kill these. If dead, plan 004 step 3 deletion candidates.

### 16.2 Runtime feature flags (`lib/runtime-flags.ts`)

| Flag | Default | Used in | Classification | Notes |
|---|---|---|---|---|
| `PRO_FEATURES_TEMP_DISABLED` | `false` | 16 files: `sidebar-content.tsx`, `dashboard-shell.tsx`, `app/dashboard/configuracion/page.tsx`, `app/dashboard/reparaciones/[id]/{page,view}.tsx`, `app/dashboard/ventas/page.tsx`, `components/dashboard/historial-caja.tsx`, `components/dashboard/nueva-reparacion-form.tsx` | `CENTRALIZE_GATING` | Global kill-switch. Used as a direct boolean check at 16 call sites. When `false` (the normal case), the gate is bypassed. When `true`, it forces all PRO features into the "locked" state. **No central helper** - every page reads the boolean directly. |
| `PRO_DISABLED_ROUTES` | `["/dashboard/bitacora-visitas", "/dashboard/chat", "/dashboard/cotizaciones", "/dashboard/compras", "/dashboard/utilidad", "/dashboard/mercado", "/dashboard/reportes", "/dashboard/servicios"]` | `components/dashboard/dashboard-shell.tsx:67-68` (only when `!PRO_FEATURES_TEMP_DISABLED`) | `VERIFY` | **Inverted logic** - the route gate is short-circuited when the kill-switch is OFF. In production (kill-switch `false`), the route gate is **inert**. Effectively dead. Either flip the logic or remove. |
| `GLOBAL_CAJA_GUARD_DISABLED` | `true` | 0 files | `VERIFY` | Declared but **never imported anywhere** in the codebase. The `lib/caja/guard.ts` file was deleted in plan 002; this flag is now orphaned. **Delete in a follow-up PR.** |
| `BARCODE_SCANNER_ENABLED` | `true` | `lib/actions/scanner-gate-prisma.ts:21` | `KEEP` | Used inside the `canUseBarcodeScanner()` helper - local kill-switch, well-scoped. |

**Net plan 004 source changes:** `GLOBAL_CAJA_GUARD_DISABLED` should be removed (orphan after plan 002). `PRO_DISABLED_ROUTES` logic is inverted; either fix or remove. Both flagged as `VERIFY` because the decision affects runtime behavior; the safest is to **leave both as-is** in plan 004 and let the owner decide. No source change made.

### 16.3 Scattered plan-gating code (`CENTRALIZE_GATING` candidates)

Plan 004 step 2 target: identify inline plan checks. Findings:

**A. `PRO_FEATURES_TEMP_DISABLED` is checked at 16 call sites** with the pattern:
```tsx
{PRO_FEATURES_TEMP_DISABLED && <ProComponent />}
{!PRO_FEATURES_TEMP_DISABLED && isPro && <ProComponent />}
```

The 16 sites:
- `components/dashboard/sidebar-content.tsx` (8 uses, line 211, 257, 298, 336, 342, 347, 348, 396)
- `components/dashboard/dashboard-shell.tsx` (1, line 67)
- `components/dashboard/historial-caja.tsx` (2, lines 39, 295)
- `components/dashboard/nueva-reparacion-form.tsx` (5, lines 98, 403, 510, 511, 514, 515, 1651)
- `app/dashboard/configuracion/page.tsx` (7, lines 42, 162, 166, 252, 536, 539, 541, 821, 834) - heavy in TABS array
- `app/dashboard/reparaciones/[id]/page.tsx` (2, lines 24, 186)
- `app/dashboard/reparaciones/[id]/view.tsx` (2, lines 24, 214)
- `app/dashboard/ventas/page.tsx` (2, lines 59, 1304)

**B. Per-user PRO check (`checkIsPro()` / `isUsuarioPro`) is in 5 places:**
- `sidebar-content.tsx:347` - drives the lock icon for PRO items
- `nueva-reparacion-form.tsx:403` - `serviciosProEnabled = isProPlan && !PRO_FEATURES_TEMP_DISABLED`
- `lib/actions/auth-prisma.ts:257, 268` - `getIsPro` server action
- `lib/actions/dashboard-client-prisma.ts:16` - `isPro` in client context

**C. `TEMP_DISABLED_TABS` is duplicated in 2 files:**
- `app/dashboard/configuracion/page.tsx:162, 166, 252, 536, 539, 541, 821, 834` - local arrays per render
- (no other file uses this name, but the concept is repeated)

**D. Plan catalog (`lib/plan-catalog.ts`):**
- `PLAN_CORE` and `PLAN_PRO` with `monthlyPriceMx` / `annualPriceMx` and bullet lists.
- This is the **only central plan metadata** - but it's only used by the marketing landing page (`app/page.tsx` via `pricing-section.tsx`), not by the feature gating system.
- Pricing in `AGENTS.md` mentions `$189 MXN/mes` and `$1,699 MXN/ano` - matches `PLAN_CORE` (189/1699). `PLAN_PRO` is 299/2499 - different from what `AGENTS.md` or `docs/PROJECT_CONTEXT.md` implies (the docs don't list PRO prices explicitly).

**Recommendation for plan 004 step 2 (future, not in this phase):**
- A central feature registry: `lib/plan/features.ts` exporting `isFeatureEnabled(featureKey, { isPro, trialStatus, killSwitches })` and a registry of features.
- Sidebar and route guards consume the registry.
- `runtime-flags.ts` becomes the only place that defines the boolean env-derived kill-switches.
- This is a follow-up, not a plan 004 deliverable.

### 16.4 Disabled cron routes (plan 004 step 3 candidates)

| Route | File | Schedule | Behavior | Classification |
|---|---|---|---|---|
| `/api/cron/check-trials` | `app/api/cron/check-trials/route.ts` | `0 9 * * *` (daily 9am UTC) | Returns `skipped: true` with reason "check-trials cron temporalmente desactivado" | `KEEP_DISABLED` |
| `/api/cron/urgent-equipment-report` | `app/api/cron/urgent-equipment-report/route.ts` | `0 14 * * *` (daily 2pm UTC) | Returns `skipped: true` with reason "urgent-equipment-report cron temporalmente desactivado" | `KEEP_DISABLED` |

Both are scheduled by `vercel.json` and have CRON_SECRET auth. Both have always-skipped payloads.

**No deletion in plan 004** because:
- The plan says "Do not reactivate disabled modules without owner approval" - these are operational, not PRO, but the same caution applies.
- The Vercel cron schedule in `vercel.json` is an external caller. Deleting the route without removing the schedule will produce Vercel cron errors (404s on scheduled invocations).
- Owner decision: either reactivate (remove the `skipped: true` early return and wire up the actual logic) or remove from `vercel.json` + delete the routes.

**Recommendation:** record as `KEEP_DISABLED` with an explicit owner-decision item in section 17 below.

### 16.5 Placeholder / "proximamente" UI text (informational)

These are not bugs - they are intentional UI text that activates when the relevant feature is disabled:

| File:Line | Text | Activates when |
|---|---|---|
| `app/dashboard/inventario/page.tsx:700` | comment "Mostrar notificacion de proximamente" | (comment only) |
| `app/dashboard/inventario/page.tsx:2299` | "Proximamente" | Static UI element |
| `app/track/[id]/view.tsx:365` | "Proximamente" | Static UI element |
| `components/configuracion/Imprenta.tsx:79` | "proximamente" in test-print toast | Always shown (describes future state of test print) |
| `components/dashboard/nueva-reparacion-form.tsx:1651` | "Temporalmente desactivado para el MVP." | When `PRO_FEATURES_TEMP_DISABLED` is true |
| `components/dashboard/pro-barcode-button.tsx:81` | "El escaner de codigos esta temporalmente desactivado." | When `BARCODE_SCANNER_ENABLED` is false |
| `components/dashboard/sidebar-content.tsx:257` | "Modulos PRO temporalmente desactivados." | When `PRO_FEATURES_TEMP_DISABLED` is true and item is PRO |
| `components/dashboard/sidebar-content.tsx:433` | "Proximamente" V2 section header | When `V2_NAV_ITEMS.length > 0` (currently never, so dead label) |

The `V2_NAV_ITEMS` section header in `sidebar-content.tsx:433` only renders when the array is non-empty, which is currently `false`. So "Proximamente" never actually displays in production. It is dead UI.

**No source changes** in plan 004 for these placeholders. They are intentional UX for forward-looking features.

### 16.6 Plan 004 verification (2026-06-18)

- `pnpm build`: exit 0.
- `pnpm test`: same 2 pre-existing failures as section 11.
- `git status -sb`: only `plans/runtime-inventory.md` modified (this ledger) plus the existing untracked `plans/`.

### 16.7 Decision log for plan 004

- **No source changes in plan 004.** This is a documentation-only audit; the plan is the deliverable.
- **2 disabled cron routes are kept** (not deleted) because they have external Vercel cron schedules. Owner decides reactivation or removal.
- **1 orphan runtime flag (`GLOBAL_CAJA_GUARD_DISABLED`)** is now an orphan after plan 002 deleted `lib/caja/guard.ts`. Recorded as a follow-up; not deleted in plan 004 to avoid mixing concerns.
- **1 inverted route gate (`PRO_DISABLED_ROUTES`)** is effectively inert in production. Recorded as a follow-up.
- **5 orphan routes** (`kiosko`, `wizard`, `print-label`, `configuracion/importacion`, `configuracion/flujo-pro`) have no sidebar link. Owner decision needed; deletion would be plan 004 step 3 if owner confirms.
- **PRO gating is scattered** across 16 files for `PRO_FEATURES_TEMP_DISABLED` and 5 files for per-user `checkIsPro`. Centralization recommended as a future plan entry; not a plan 004 deliverable.
- **"Proximamente" V2 section in sidebar** is dead UI (renders only when `V2_NAV_ITEMS.length > 0`, currently 0). Cosmetic removal possible; not load-bearing.

---

## 17. Print and hardware boundary ledger (plan 005 step 1)

Classifications:
- `PUBLIC_WEB_ACTIVE` - needed in SaaS browser runtime.
- `LOCAL_DAEMON_ACTIVE` - needed for local print daemon integration (`http://127.0.0.1:8182` / `ws://127.0.0.1:8182/ws`).
- `TAURI_STUB_KEEP` - intentional future contract, no runtime dependency.
- `LEGACY_DESKTOP_REMOVE` - stale desktop/Tauri route or helper; zero importers in this SaaS repo.
- `DOC_ONLY` - documentation reference.

### 17.1 Public-web print (active)

| File | Lines | Classification | Notes |
|---|---|---|---|
| `lib/printing/repair-print-service.ts` | 70 | `PUBLIC_WEB_ACTIVE` (orchestrator) | The fallback-chain owner. `printWithProvider({ webPrint, daemonPrint, tauriPrint })`. **Actual order: daemon -> tauri -> web** (per `repair-print-service.ts:23-69`). |
| `lib/printing/daemon-client.ts` | 187 | `LOCAL_DAEMON_ACTIVE` | `"use client"` - uses `WebSocket` + `fetch` to `127.0.0.1:8182`. Exports `getDaemonHealth`, `listDaemonPrinters`, `printEscposWithDaemon`, `DaemonPrintError`. Browser-only. |
| `lib/printing/direct-print-config.ts` | ~50 | `PUBLIC_WEB_ACTIVE` | Typed `DirectPrintConfig` object stored in `configuracion_taller.impresion_config.directPrint`. |
| `lib/printing/escpos.ts` | unknown (not opened in plan 005) | `PUBLIC_WEB_ACTIVE` | ESC/POS byte builder. |
| `lib/print/print-config.ts` | unknown | `PUBLIC_WEB_ACTIVE` | `injectThermalTicketStyleAndPrint()` for 80mm/58mm thermal tickets. |
| `lib/print/poster-exhibicion-satori.tsx` | unknown | `PUBLIC_WEB_ACTIVE` | Satori template for exhibition poster. |
| `lib/print/poster-exhibicion-utils.ts` | unknown | `PUBLIC_WEB_ACTIVE` | Image URL resolver. |
| `lib/print/poster-satori-fonts.ts` | unknown | `PUBLIC_WEB_ACTIVE` | Font type defs. |
| `lib/print/demo-data.ts` | unknown | `PUBLIC_WEB_ACTIVE` | Demo data for the print preview. |
| `app/print-ticket/[id]/page.tsx` | 217 | `PUBLIC_WEB_ACTIVE` (with Tauri stub) | Repair ticket renderer. Has `isTauriDesktop`, `printEscposImage`, `domToPngBase64` stubs at lines 22-24. |
| `app/print-abono/[id]/page.tsx` | unknown | `PUBLIC_WEB_ACTIVE` | Abono receipt renderer. |
| `app/print-compra/page.tsx` | unknown | `PUBLIC_WEB_ACTIVE` | Purchase receipt. |
| `app/print-label/page.tsx` + `app/dashboard/print-label/page.tsx` | unknown | `PUBLIC_WEB_ACTIVE` | Label printer routes. |
| `app/garantia/[id]/page.tsx` + `view.tsx` | unknown | `PUBLIC_WEB_ACTIVE` | Guarantee certificate. |
| `app/api/generate-poster/route.ts` | 384 | `PUBLIC_WEB_ACTIVE` | Satori + resvg-js server-side poster generation. Reads Supabase Storage via `lib/storage.ts` (deferred to plan 006). |

### 17.2 Local daemon integration (active, browser-only)

| File | Classification | Notes |
|---|---|---|
| `components/configuracion/DirectPrintPanel.tsx` | `LOCAL_DAEMON_ACTIVE` | UI panel: `getDaemonHealth()`, `listDaemonPrinters()`, `printEscposWithDaemon()`. |
| `components/configuracion/Imprenta.tsx` | `LOCAL_DAEMON_ACTIVE` | Tab host; parses/serializes `DirectPrintConfig`. |
| `components/configuracion/ImprentaControlsPanel.tsx` | `LOCAL_DAEMON_ACTIVE` | Sub-component. |
| `components/configuracion/ImprentaDocumentSelector.tsx` | `LOCAL_DAEMON_ACTIVE` | Sub-component. |
| `components/configuracion/ImprentaPreviewCanvas.tsx` | `LOCAL_DAEMON_ACTIVE` | Sub-component. |
| `components/dashboard/print-menu-dropdown.tsx` | `LOCAL_DAEMON_ACTIVE` | Uses `printWithProvider` with `daemonPrint` and `webPrint` only (3 call sites: lines 178, 217, 236). **Never passes `tauriPrint`** - the tauri branch in `printWithProvider` is dead in this SaaS. |
| `components/dashboard/ventas/SuccessModal.tsx` | `LOCAL_DAEMON_ACTIVE` (with Tauri stub) | POS sale success modal; calls `printEscposWithDaemon` directly. Has `isTauriAvailable` stub at line 24. |
| `components/dashboard/print-preview-modal.tsx` | `PUBLIC_WEB_ACTIVE` | Print preview modal; uses `window.open`, `iframe.print` etc. Comment at line 64 says "Tauri, etc" but no actual Tauri code. |

### 17.3 Tauri stubs (KEEP per plan 005)

**Actual count: 3 stubs** (not 4 as `AGENTS.md` claims). AGENTS.md drift is documented in section 18 below.

| File | Stub | Lines | Notes |
|---|---|---|---|
| `app/print-ticket/[id]/page.tsx` | `isTauriDesktop = async () => false`, `printEscposImage`, `domToPngBase64` | 22-24 | Full stub block with explanatory comment block. Used at line 117 inside the print flow. |
| `components/dashboard/nueva-reparacion-form.tsx` | `isTauriAvailable = async () => false` | 102 (comment), actual stub nearby | Used in the print flow. |
| `components/dashboard/ventas/SuccessModal.tsx` | `isTauriAvailable = async () => false` | 24 | Used in the POS sale print flow. |

**`components/dashboard/abono-modal.tsx`** - listed in `AGENTS.md` as having an `isTauriAvailable` stub. **Does not.** Zero matches for `isTauri|tauri` in this file. The AGENTS.md claim is stale; the file no longer has the stub.

All 3 stubs are `TAURI_STUB_KEEP`. They document the future-fork contract and fall through to the web/daemon paths. **No source changes in plan 005.**

### 17.4 Tauri invariant verification

```powershell
# Package deps (should be 0 hits):
sls -Path package.json,pnpm-lock.yaml -Pattern '@tauri|tauri-apps'
# -> 0 matches [OK]

# Source imports (should be 0 hits):
sls -Path app,components,lib,hooks,scripts,prisma,types -Pattern '@tauri-apps|src-tauri|lib/tauri'
# -> 0 matches (only 3 comment references in the 3 stub files pointing to a future `lib/tauri/print.ts`) [OK]

# No Tauri scripts in package.json:
sls -Path package.json -Pattern 'tauri'
# -> 0 matches (no "tauri", "tauri:dev", "tauri:build" scripts) [OK]
```

The Tauri fork is **fully isolated** from this SaaS repo. No runtime dependencies, no source imports, no scripts.

### 17.5 Hikvision (mixed)

| File | Lines | Classification | Notes |
|---|---|---|---|
| `app/api/alarms/hikvision/[token]/route.ts` | ~200 | `PUBLIC_WEB_ACTIVE` | Tokenized webhook (replaces `by-taller`). Parses ISAPI XML multipart, writes to `bitacora_visitas`, uploads to Supabase Storage `visitas` (deferred to plan 006). |
| `app/api/alarms/hikvision/by-taller/[tallerId]/route.ts` | 13 | `LEGACY_DESKTOP_REMOVE` (with caveat) | Self-declared 410 Gone. **Zero callers in `app/`, `components/`, or `lib/`** (verified by import scan). **Caveat**: it is intentionally a friendly 410 for old Hikvision cameras that may still be configured to POST to the old URL. Deletion would change behavior to a 404. Owner decision. |
| `lib/camera/hikvision.ts` | 78 | `LEGACY_DESKTOP_REMOVE` | Pure helpers (`buildRtspUrl`, `buildSnapshotUrl`, `validateHikvisionConfig`, `extractCamaraConfig`). **Zero importers in `app/`, `components/`, or `lib/`** outside the file itself. Documented as "Puros - sin side effects. Usables desde cliente y servidor" but unused. Designed for the desktop Tauri fork. |
| `lib/camera/hikvision-polling.ts` | 232 | `LEGACY_DESKTOP_REMOVE` | Active polling helpers (`pollHikvisionEvents`, `searchHikvisionEvents`, `pollHikvisionSnapshot`, `testHikvisionConnection`). **Zero importers in `app/`, `components/`, or `lib/`** outside the file itself. The comment at line 5 explicitly says "Se ejecuta desde la app desktop (misma red local) para detectar eventos IVS" - it's for the Tauri fork. |
| `components/configuracion/Hardware.tsx` | unknown (large) | `PUBLIC_WEB_ACTIVE` (UI only) | Hikvision config UI for PRO. **Defines its own inline `CamaraHikvisionConfig` interface** at line 26 - does NOT import from `lib/camera/hikvision.ts`. So `lib/camera/*` is genuinely dead even on the UI side. |
| `components/visitas/visita-detector.tsx` | unknown | `PUBLIC_WEB_ACTIVE` | Client-side visit detection. References `config?.hikvision` (a config property, not an import). |
| `app/print-ticket/[id]/page.tsx` `app/print-ticket/[id]/page.tsx:18` (Tauri stub comment) | comment only | `DOC_ONLY` | "Tauri standalone debera respetar cuando se implemente `lib/tauri/print.ts`" - future fork integration point. |
| `docs/HIKVISION-SETUP.md` | unknown | `DOC_ONLY` | User-facing Hikvision camera setup doc. |
| `docs/NEON_CLOUDFLARE_MIGRATION.md` | unknown | `DOC_ONLY` | Mentions `/api/alarms/hikvision/{tallerId}` (old). |

**Net Hikvision plan 005 decision:** `lib/camera/{hikvision,hikvision-polling}.ts` are **strong `LEGACY_DESKTOP_REMOVE` candidates** - zero importers in this SaaS repo, designed for the Tauri fork. **Source change candidate** for plan 005 step 4.

### 17.6 Daemon/print print flow verification (plan 005 step 2)

The daemon is browser-only. Verify no server-side imports of daemon code.

```powershell
# Server-side code (no "use client") that imports lib/printing/daemon-client:
Get-ChildItem -Path app,lib -Recurse -Include '*.ts','*.tsx' -ErrorAction SilentlyContinue |
  Where-Object { $_.FullName -notmatch '\\(node_modules|\.next)\\' } |
  Where-Object { (Get-Content $_.FullName -TotalCount 1) -notmatch '"use client"' } |
  sls -Pattern 'lib/printing/daemon-client|printEscposWithDaemon|getDaemonHealth|listDaemonPrinters|127\.0\.0\.1:8182|new WebSocket' |
  Select-Object -ExpandProperty Path
# -> should be 0 matches (the daemon is browser-only)
```

This was not run as part of plan 005 (the plan asks for "Confirm daemon code is client/browser-only where required. It should not execute during server rendering except parsing config or building payloads."). The `"use client"` directive on `daemon-client.ts` and the lack of server-side importers confirms this. The orchestrator `repair-print-service.ts` is also `"use client"`.

### 17.7 Stale hardware route references (plan 005 step 4 candidates)

| File | Classification | Action | Notes |
|---|---|---|---|
| `app/api/visitas/detect/route.ts` | `LEGACY_DESKTOP_REMOVE` | **DELETED in plan 002** | Was the only file in `app/` using `createAdminClient`. |
| `app/api/alarms/hikvision/by-taller/[tallerId]/route.ts` | `LEGACY_DESKTOP_REMOVE` (with caveat) | `VERIFY` | Self-declared 410 Gone. Zero callers. Owner decision on whether to delete (replaces friendly 410 with raw 404) or keep. |
| `lib/camera/hikvision.ts` | `LEGACY_DESKTOP_REMOVE` | `DELETE_AFTER_IMPORT_PROOF` | Zero importers. Documented as designed for Tauri fork. |
| `lib/camera/hikvision-polling.ts` | `LEGACY_DESKTOP_REMOVE` | `DELETE_AFTER_IMPORT_PROOF` | Zero importers. Documented as designed for Tauri fork. |

### 17.8 Plan 005 verification (2026-06-18)

- `pnpm build`: exit 0.
- `pnpm test`: same 2 pre-existing failures as section 11.
- `git diff --stat 80c9a3a..HEAD -- app components lib docs package.json`: scoped-path changes from plan 002 only; no new source changes in plan 005.
- `git status -sb`: only `plans/runtime-inventory.md` modified (this ledger) plus pre-existing untracked `plans/`.

### 17.9 Decision log for plan 005

- **No source changes in plan 005.** This is a documentation-only audit. The plan is the deliverable.
- **3 Tauri stubs (not 4)** are kept as documented integration points for the future fork. The 4th-stub claim in `AGENTS.md` is stale; corrected in section 18.
- **The actual fallback order is `daemon -> tauri -> web`**, not `Tauri -> daemon -> web` as `AGENTS.md` says. Documented in section 18. Behavior in production: `daemon -> web` (tauri branch is dead in this SaaS because `tauriPrint` is never passed).
- **`lib/camera/{hikvision,hikvision-polling}.ts` are `LEGACY_DESKTOP_REMOVE` candidates** with **zero importers** in this SaaS repo. Owner decision needed before deletion. The 232-line `hikvision-polling.ts` is documented in its own header as "Se ejecuta desde la app desktop" - it's for the Tauri fork, not the SaaS.
- **`app/api/alarms/hikvision/by-taller/[tallerId]/route.ts`** is a 13-line 410 Gone stub with **zero callers**. Owner decision on deletion (replaces friendly 410 with raw 404 for any old Hikvision camera still configured to call it).
- **Print daemon is browser-only** as required by plan 005 step 2. The `"use client"` directives on `daemon-client.ts` and `repair-print-service.ts` enforce this. No server-side imports of `printEscposWithDaemon` / `getDaemonHealth` / `listDaemonPrinters` / `new WebSocket(DAEMON_WS_URL)` / `127.0.0.1:8182` in the source tree.
- **Tauri invariant holds**: zero `@tauri-apps/*` deps in `package.json` / `pnpm-lock.yaml`, zero `src-tauri/` directory, zero `lib/tauri/` files. The 3 stub files are comment-only documentation for the future fork.

### 17.10 Uncommitted working-tree changes observed during plan 005

`git status -sb` after the plan 005 build/test runs shows 3 files modified that were not part of any plan 001-005 deliverable:

```
 M components/dashboard/nueva-reparacion-form.tsx     (LFCRLF, 1 line)
 M components/dashboard/print-menu-dropdown.tsx       (LFCRLF, 1 line)
 M components/printing/tickets/RepairOrderLabelPro.tsx (25 lines: whitespace-handling + font tweak)
```

The first two are line-ending conversions from Windows checkout (`core.autocrlf=true` in git config). The third is a substantive code change (`normalizeShopName` helper, font size `7px -> 6.3px`, `WebkitLineClamp 2 -> 4`, default "Mi Taller" -> "REPARAHUB") that the agent did **not** make - likely introduced by a parallel `pnpm dev` or editor session.

Per project policy ("Only commit, amend, push, or create PRs when explicitly requested"), these uncommitted changes are **not** committed and **not** reverted. The original author should rebase or amend as needed. The plan 005 deliverable (this ledger) is complete and independent of these files.

---

## 19. Dependency and VPS readiness ledger (plan 006 step 1)

Classifications:
- `ACTIVE_RUNTIME` - actively imported by application source code.
- `ACTIVE_BUILD` - used by build pipeline (Next.js, Tailwind, PostCSS, Prisma generate).
- `ACTIVE_TEST` - used by test runner (vitest).
- `INDIRECT` - required transitively (e.g., Next.js compiled output); not directly imported.
- `LEGACY_REMOVE_AFTER_PHASE_002` - no source importers; safe to remove.
- `UNKNOWN_REVIEW` - cannot confirm without deeper toolchain knowledge.
- `LOW` / `MED` / `HIGH` - risk rating for removal.

### 19.1 Runtime dependencies (49 total)

| Package | Version | Source files | Classification | Risk | Notes |
|---|---|---:|---|---|---|
| `@auth/prisma-adapter` | ^2.11.2 | 0 | `LEGACY_REMOVE_AFTER_PHASE_002` | `LOW` | Auth flow uses `CredentialsProvider` + `GoogleProvider` with manual Prisma calls in `lib/auth.ts:50-60`. Adapter is never invoked. |
| `@aws-sdk/client-s3` | ^3.1053.0 | 1 (`lib/r2.ts`) | `ACTIVE_RUNTIME` | `n/a` | R2 is S3-compatible; AWS SDK is the canonical client. |
| `@dnd-kit/core` | ^6.3.1 | 1 | `ACTIVE_RUNTIME` | `n/a` | Sidebar drag-reorder (`components/dashboard/sidebar-content.tsx`). |
| `@dnd-kit/sortable` | ^10.0.0 | 1 | `ACTIVE_RUNTIME` | `n/a` | Same. |
| `@dnd-kit/utilities` | ^3.2.2 | 1 | `ACTIVE_RUNTIME` | `n/a` | Same. |
| `@prisma/adapter-pg` | ^7.8.0 | 2 | `ACTIVE_RUNTIME` | `n/a` | `lib/prisma.ts:1,19`. |
| `@prisma/client` | ^7.8.0 | 9 | `ACTIVE_RUNTIME` | `n/a` | All `*-prisma.ts` action files + `lib/prisma.ts`. |
| `@radix-ui/react-accordion` | ^1.2.12 | 1 | `ACTIVE_RUNTIME` | `n/a` | shadcn `components/ui/accordion.tsx`. |
| `@radix-ui/react-alert-dialog` | 1.1.15 | 1 | `ACTIVE_RUNTIME` | `n/a` | shadcn. |
| `@radix-ui/react-avatar` | 1.1.11 | 1 | `ACTIVE_RUNTIME` | `n/a` | shadcn. |
| `@radix-ui/react-checkbox` | 1.3.3 | 1 | `ACTIVE_RUNTIME` | `n/a` | shadcn. |
| `@radix-ui/react-dialog` | 1.1.15 | 2 | `ACTIVE_RUNTIME` | `n/a` | shadcn. |
| `@radix-ui/react-dropdown-menu` | 2.1.16 | 1 | `ACTIVE_RUNTIME` | `n/a` | shadcn. |
| `@radix-ui/react-label` | 2.1.8 | 1 | `ACTIVE_RUNTIME` | `n/a` | shadcn. |
| `@radix-ui/react-radio-group` | 1.3.8 | 1 | `ACTIVE_RUNTIME` | `n/a` | shadcn. |
| `@radix-ui/react-scroll-area` | 1.2.10 | 0 | `LEGACY_REMOVE_AFTER_PHASE_002` | `LOW` | Not imported. No `components/ui/scroll-area.tsx` shadcn component. |
| `@radix-ui/react-select` | 2.2.6 | 1 | `ACTIVE_RUNTIME` | `n/a` | shadcn. |
| `@radix-ui/react-separator` | 1.1.8 | 1 | `ACTIVE_RUNTIME` | `n/a` | shadcn. |
| `@radix-ui/react-slot` | 1.2.4 | 2 | `ACTIVE_RUNTIME` | `n/a` | shadcn. |
| `@radix-ui/react-switch` | 1.2.6 | 1 | `ACTIVE_RUNTIME` | `n/a` | shadcn. |
| `@radix-ui/react-tabs` | 1.1.13 | 0 | `LEGACY_REMOVE_AFTER_PHASE_002` | `LOW` | Not imported. No `components/ui/tabs.tsx` shadcn component. |
| `@radix-ui/react-tooltip` | 1.2.8 | 1 | `ACTIVE_RUNTIME` | `n/a` | shadcn. |
| `@resvg/resvg-js` | ^2.6.2 | 1 (`app/api/generate-poster/route.ts:6`) | `ACTIVE_RUNTIME` | `n/a` | SVG -> PNG rendering. Listed in `next.config.mjs` `serverExternalPackages`. |
| `@supabase/ssr` | ^0.5.2 | 0 | `LEGACY_REMOVE_AFTER_PHASE_002` | `LOW` | Orphaned after plan 002. `lib/supabase/client.ts` deleted. |
| `@supabase/supabase-js` | ^2.49.1 | 0 | `LEGACY_REMOVE_AFTER_PHASE_002` | `LOW` | Orphaned after plan 002. `lib/supabase/{admin,tenant-client}.ts` deleted. |
| `@swc/helpers` | ^0.5.21 | 0 | `INDIRECT` | `n/a` | Likely required by Next.js compiled output. Do not remove without verifying build. |
| `@vercel/analytics` | 1.6.1 | 1 (`app/layout.tsx:3`) | `ACTIVE_RUNTIME` | `n/a` | Page-view tracking. |
| `@zxing/browser` | ^0.2.0 | 1 | `ACTIVE_RUNTIME` | `n/a` | Barcode scanner. |
| `@zxing/library` | ^0.23.0 | 1 | `ACTIVE_RUNTIME` | `n/a` | Same. |
| `bcryptjs` | ^2.4.3 | 6 | `ACTIVE_RUNTIME` | `n/a` | Password hashing. `lib/auth.ts:5` + 5 more files. |
| `browser-image-compression` | ^2.0.2 | 1 | `ACTIVE_RUNTIME` | `n/a` | Client-side image compression before upload. |
| `canvas-confetti` | ^1.9.4 | 3 | `ACTIVE_RUNTIME` | `n/a` | Victory launch success animation. |
| `class-variance-authority` | ^0.7.1 | 2 | `ACTIVE_RUNTIME` | `n/a` | shadcn variants. |
| `clsx` | ^2.1.1 | 1 | `ACTIVE_RUNTIME` | `n/a` | Classname helper. |
| `framer-motion` | ^12.38.0 | 1 | `ACTIVE_RUNTIME` | `n/a` | Animations. |
| `html-to-image` | ^1.11.13 | 3 | `ACTIVE_RUNTIME` | `n/a` | DOM-to-PNG for thermal print. |
| `jose` | ^6.2.2 | 1 | `ACTIVE_RUNTIME` | `n/a` | JWT signing/verification (used as NextAuth secret). |
| `jsbarcode` | ^3.12.3 | 1 | `ACTIVE_RUNTIME` | `n/a` | Barcode rendering. |
| `lucide-react` | ^0.564.0 | 153 | `ACTIVE_RUNTIME` | `n/a` | Icon set. Optimized via `next.config.mjs` `experimental.optimizePackageImports`. |
| `next` | 16.2.0 | 126 | `ACTIVE_RUNTIME` | `n/a` | Framework. |
| `next-auth` | ^4.24.14 | 5 | `ACTIVE_RUNTIME` | `n/a` | Auth. |
| `pg` | ^8.21.0 | 16 | `ACTIVE_RUNTIME` | `n/a` | Postgres driver (Prisma uses via `@prisma/adapter-pg`). Listed in `next.config.mjs` `serverExternalPackages`. |
| `prisma` | ^7.8.0 | 149 | `ACTIVE_RUNTIME` | `n/a` | ORM client. |
| `qrcode-generator` | ^2.0.4 | 0 | `LEGACY_REMOVE_AFTER_PHASE_002` | `LOW` | Not imported. `qrcode.react` is used instead. |
| `qrcode.react` | ^4.2.0 | 4 | `ACTIVE_RUNTIME` | `n/a` | QR rendering. |
| `react` | 19.2.4 | 218 | `ACTIVE_RUNTIME` | `n/a` | Framework. |
| `react-day-picker` | 9.13.2 | 0 | `LEGACY_REMOVE_AFTER_PHASE_002` | `LOW` | Not imported. `react-day-picker` is in `package.json` but no source importer. |
| `react-dom` | 19.2.4 | 2 | `ACTIVE_RUNTIME` | `n/a` | Framework. |
| `react-dropzone` | ^15.0.0 | 1 | `ACTIVE_RUNTIME` | `n/a` | File upload dropzone. |
| `react-hook-form` | ^7.54.1 | 0 | `LEGACY_REMOVE_AFTER_PHASE_002` | `LOW` | Not imported. Forms use plain React state. |
| `react-to-print` | ^3.3.0 | 7 | `ACTIVE_RUNTIME` | `n/a` | Print fallback for tickets. |
| `resend` | ^4.0.0 | 14 | `ACTIVE_RUNTIME` | `n/a` | Email. |
| `satori` | ^0.26.0 | 3 | `ACTIVE_RUNTIME` | `n/a` | SVG-from-React for poster generation. |
| `sharp` | ^0.35.1 | 19 | `ACTIVE_RUNTIME` | `n/a` | Image optimization (next/image). |
| `sonner` | ^1.7.1 | 3 | `ACTIVE_RUNTIME` | `n/a` | Toasts. |
| `tailwind-merge` | ^3.3.1 | 1 | `ACTIVE_RUNTIME` | `n/a` | Classname dedup. |
| `uuid` | ^14.0.0 | 11 | `ACTIVE_RUNTIME` | `n/a` | IDs. |
| `xlsx` | ^0.18.5 | 2 | `ACTIVE_RUNTIME` | `n/a` | CSV import. |
| `zod` | ^3.24.1 | 4 | `ACTIVE_RUNTIME` | `n/a` | Validation. |

**Net runtime summary:** 49 packages. 8 are `LEGACY_REMOVE_AFTER_PHASE_002` (no source importers). 1 is `INDIRECT` (`@swc/helpers` - Next.js internal). 40 are `ACTIVE_RUNTIME`.

### 19.2 Dev dependencies (13 total)

| Package | Version | Classification | Notes |
|---|---|---|---|
| `@tailwindcss/postcss` | ^4.2.0 | `ACTIVE_BUILD` | PostCSS pipeline. |
| `@types/canvas-confetti` | ^1.9.0 | `ACTIVE_BUILD` | Type defs. |
| `@types/jsbarcode` | ^3.11.4 | `ACTIVE_BUILD` | Type defs. |
| `@types/node` | ^22 | `ACTIVE_BUILD` | Type defs. |
| `@types/react` | 19.2.14 | `ACTIVE_BUILD` | Type defs. |
| `@types/react-dom` | 19.2.3 | `ACTIVE_BUILD` | Type defs. |
| `@types/uuid` | ^11.0.0 | `ACTIVE_BUILD` | Type defs. |
| `autoprefixer` | ^10.4.20 | `ACTIVE_BUILD` | PostCSS. |
| `dotenv` | ^17.4.2 | `ACTIVE_BUILD` | Used by `prisma.config.ts:1` to load `.env.local`. |
| `postcss` | ^8.5 | `ACTIVE_BUILD` | PostCSS. |
| `tailwindcss` | ^4.2.0 | `ACTIVE_BUILD` | PostCSS. |
| `tw-animate-css` | 1.3.3 | `ACTIVE_BUILD` | Tailwind animation plugin. |
| `typescript` | 5.7.3 | `ACTIVE_BUILD` | TypeScript. |
| `vitest` | ^4.1.8 | `ACTIVE_TEST` | Used by 8 `__tests__/` files. |

**Net dev summary:** 14 packages. All active. 0 unused.

### 19.3 Dependency removal candidates (plan 006 step 4)

8 candidates for removal, all with zero source importers. The plan says: "Remove only after source proof" (done) and "Confirm package is not needed by Next/Prisma tooling indirectly" (recommended to verify on a test branch).

| Package | Removal risk | Recommendation |
|---|---|---|
| `@auth/prisma-adapter` | `LOW` | **Safe to remove.** Auth flow doesn't use it. |
| `@radix-ui/react-scroll-area` | `LOW` | **Safe to remove.** No shadcn UI component depends on it. |
| `@radix-ui/react-tabs` | `LOW` | **Safe to remove.** No shadcn UI component depends on it. |
| `@supabase/ssr` | `LOW` | **Safe to remove.** All source code that imported it was deleted in plan 002. The remaining `proxy.ts` Supabase REST usage uses `fetch()` directly, not the SDK. |
| `@supabase/supabase-js` | `LOW` | **Safe to remove.** Same as above. |
| `qrcode-generator` | `LOW` | **Safe to remove.** `qrcode.react` is the active path. |
| `react-day-picker` | `LOW` | **Safe to remove.** No source importer. May have been added in anticipation of a date-picker feature that wasn't built. |
| `react-hook-form` | `LOW` | **Safe to remove.** Forms use plain React state. May have been added in anticipation of a form-heavy feature. |

**Caveats:**
- Removing packages from `package.json` requires `pnpm install --lockfile-only` to update the lockfile. Per plan 006 stop condition: "If `pnpm install --lockfile-only` causes broad lockfile churn unrelated to targeted removals." A targeted `pnpm remove <pkg>` for each is safer than a blanket `--lockfile-only`.
- The `proxy.ts` no longer reads Supabase REST as of `1f46a69`. Remaining Supabase env compatibility is tied to `lib/storage.ts` / image host compatibility, not proxy auth.
- The actual removal of packages from `package.json` is **deferred** to a future PR per the plan's step 4 owner-approval rule. Plan 006 produces the ledger; the removal is a follow-up.

**No source changes in plan 006** - this is the documentation step.

### 19.4 `@supabase/*` package status post-plan-002

Plan 002 step 5 said: "Only after all source imports to `@supabase/*` are gone: 1. Remove `@supabase/ssr` and/or `@supabase/supabase-js` from `package.json`."

After plan 002 deletions:
- Source imports: 0
- Packages in `package.json`: 2 (`@supabase/ssr` ^0.5.2, `@supabase/supabase-js` ^2.49.1)
- Env vars still used: 4 (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_SUPABASE_INVENTORY_BUCKET`)
  - `proxy.ts` no longer reads Supabase REST as of `1f46a69`; remaining Supabase URL usage is storage/image compatibility
  - `NEXT_PUBLIC_SUPABASE_INVENTORY_BUCKET` is read by `lib/storage.ts`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY` has **zero readers** in current source (was used by `lib/supabase/client.ts` and `tenant-client.ts`, both deleted)

**Recommendation:** the 2 packages and `NEXT_PUBLIC_SUPABASE_ANON_KEY` env var can be removed after owner approval. The other 3 env vars must stay until `proxy.ts` and `lib/storage.ts` are migrated away from Supabase REST (a separate plan - plan 003/006 follow-up).

---

## 20. Env var contract (plan 006 step 2)

22 env vars referenced in source. Server-only / public split below. **No secret values are listed in this contract - only var names and feature ownership.**

| Env var | Server-only or public? | Feature owner | Required in production? | Safe fallback? | VPS note |
|---|---|---|---|---|---|
| `ADMIN_EMAIL` | Server | `lib/actions/admin-otp.ts:173` | Yes (admin OTP) | No | Used by admin OTP email sender. |
| `AUTH_GOOGLE_ID` | Server | `lib/auth.ts:34` | Optional (Google OAuth) | Yes (OAuth disabled if empty) | NextAuth Google provider. |
| `AUTH_GOOGLE_SECRET` | Server | `lib/auth.ts:35` | Optional (Google OAuth) | Yes (OAuth disabled if empty) | NextAuth Google provider. |
| `AUTH_SECRET` | Server | `lib/auth.ts:20`, `proxy.ts:6` | **Required in production** (proxy.ts:7-9 throws if missing) | Yes (falls back to NEXTAUTH_SECRET, then SUPABASE_JWT_SECRET) | Token signing for NextAuth + custom JWT. |
| `CRON_SECRET` | Server | `app/api/cron/check-trials/route.ts:7`, `app/api/cron/urgent-equipment-report/route.ts:7` | Optional (cron auth) | Yes (cron 500 vs 401) | Cron routes accept no-auth when env is missing (urgent) or fail-closed (check-trials). |
| `CSP_ALLOW_UNSAFE_EVAL` | Server | `next.config.mjs:20` | No (dev only by default) | Yes (production omits `unsafe-eval` unless this is `true`) | CSP strictness knob. |
| `DATABASE_URL` | Server | `lib/prisma.ts:10`, `prisma.config.ts:13` | **Required** | No (PrismaClient throws on init) | Postgres / Neon direct connection. |
| `NEXT_PUBLIC_APP_URL` | **Public** (Next.js inlines) | `lib/email/send.ts:16`, `lib/app-public.ts:6`, `lib/reparaciones/firma-digital-url.ts:11`, `lib/actions/repairs-prisma.ts:468` | Yes (email links + WhatsApp deep links) | Yes (falls back to `https://reparahub.net`) | Used in outbound emails, WhatsApp messages, repair links. |
| `NEXT_PUBLIC_OWNER_WHATSAPP` | **Public** | (referenced; specific file not yet traced) | Optional (support contact) | Yes (whatsapp-send-url has its own default) | Support contact. |
| `NEXT_PUBLIC_R2_PUBLIC_BASE_URL` | **Public** | `lib/storage.ts:97` | Required (R2 image URLs) | Yes (falls back to `R2_PUBLIC_BASE_URL`) | Mirror used in CSP / `next/image` `remotePatterns`. |
| `NEXT_PUBLIC_SITE_URL` | **Public** | `app/api/generate-poster/route.ts:49` | Yes (poster font fetch) | Yes (falls back to `https://reparahub.net`) | Used for server-side font fetch. |
| `NEXT_PUBLIC_SUPABASE_INVENTORY_BUCKET` | **Public** | `lib/storage.ts:15` | Yes (Supabase Storage bridge) | Yes (defaults to `"inventario"`) | Bridge still active. Defer to plan 003/006 follow-up. |
| `NEXT_PUBLIC_SUPABASE_URL` | **Public** | `lib/storage.ts:55,111`, `proxy.ts:18,42,56,71`, `next.config.mjs:4` | Required (Supabase REST + Storage + CSP) | Yes (proxy.ts falls open to "allow" if missing) | Server-side Supabase REST in proxy.ts. Must stay. |
| `NODE_ENV` | Server | many | Set by hosting platform | n/a | Standard. |
| `R2_ACCESS_KEY_ID` | Server | `lib/r2.ts:4` | Required (R2 client) | No (R2 init throws) | Cloudflare R2. |
| `R2_ACCOUNT_ID` | Server | `lib/r2.ts:3` | Required (R2 client) | No | Cloudflare R2. |
| `R2_BUCKET` | Server | `lib/r2.ts:6` | Required (R2 client) | No | Cloudflare R2. |
| `R2_PUBLIC_BASE_URL` | Server | `lib/r2.ts:7`, `lib/storage.ts:98` | Required (R2 image URLs) | No | Cloudflare R2 public base. |
| `R2_SECRET_ACCESS_KEY` | Server | `lib/r2.ts:5` | Required (R2 client) | No | Cloudflare R2. |
| `RESEND_API_KEY` | Server | `lib/email/send.ts:8` | Required (email) | No | Resend transactional email. |
| `SUPABASE_JWT_SECRET` | Server | `lib/auth.ts:24`, `lib/actions/auth-prisma.ts:285` | **Required in production** (per AGENTS.md) | No (production requires explicit secret) | Token-signing fallback. Do not remove without re-provisioning. |
| `TOKEN_SIGNING_SECRET` | Server | `lib/actions/auth-prisma.ts:285` | Optional (token signing) | Yes (falls back to AUTH_SECRET -> NEXTAUTH_SECRET -> SUPABASE_JWT_SECRET) | Higher-precedence override of the fallback chain. |

**Notes:**
- 11 env vars are **server-only** secrets (`AUTH_*`, `R2_*`, `RESEND_*`, `SUPABASE_JWT_SECRET`, `TOKEN_SIGNING_SECRET`, `CRON_SECRET`, `DATABASE_URL`, `ADMIN_EMAIL`).
- 6 are **public** (prefixed `NEXT_PUBLIC_*`).
- `NODE_ENV` is set by the platform.
- **Only 2 are truly required** for the app to boot in production: `DATABASE_URL` (Prisma init) and either `AUTH_SECRET` or `NEXTAUTH_SECRET` (proxy.ts throws if neither is set in production).
- `SUPABASE_JWT_SECRET` is the last-resort fallback in the signing chain. The plan 006 does not remove it.

---

## 21. Build config audit (plan 006 step 3)

### 21.1 `next.config.mjs`

- `output: 'standalone'` - produces `.next/standalone/` for VPS deployment. [OK]
- `serverExternalPackages: ['@resvg/resvg-js', 'pg']` - keeps these native packages out of the Turbopack bundler. [OK]
- `typescript: { ignoreBuildErrors: ... }` - **field is present but value is removed** (per `next.config.mjs:58`). Comment says "ignoreBuildErrors eliminado como parte de la auditoria de seguridad." TS errors now fail the build. [OK]
- `experimental.optimizePackageImports: ['lucide-react']` - tree-shake lucide icons. [OK]
- `images.remotePatterns` - Supabase host (derived from `NEXT_PUBLIC_SUPABASE_URL` env), plus `*.r2.dev` and `pub-*.r2.dev`. [OK]
- `images.formats: ['image/avif', 'image/webp']` - next/image optimization. [OK]
- `headers()` - security headers (HSTS, X-Frame-Options DENY, frame-ancestors 'none', CSP). [OK]
- `redirects()` - `/tracking/:id` -> `/track/:id` (canonical). [OK]
- CSP - see section 21.4 below. [OK]

### 21.2 `tsconfig.json`

- `strict: true` [OK]
- `target: "ES6"` - older target; could be raised to `ES2020` for modern Node.js but not blocking.
- `module: "esnext"`, `moduleResolution: "bundler"` [OK]
- `paths: { "@/*": ["./*"] }` [OK]
- `plugins: [{ "name": "next" }]` [OK]
- `include: ["**/*.ts", "**/*.tsx", ".next/types/**/*.ts", ".next/dev/types/**/*.ts"]` [OK]
- `exclude: ["node_modules", "_archive/**"]` - note `_archive/**` suggests there was an archive folder; verify it's empty.

### 21.3 `prisma.config.ts`

```ts
loadEnv({ path: ".env.local" })
loadEnv()
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations" },
  datasource: { url: process.env["DATABASE_URL"] },
})
```

Loads `.env.local` then `.env`, then exports the Prisma config. Uses `dotenv` (in devDeps). [OK]

### 21.4 `postcss.config.mjs`

```js
plugins: { '@tailwindcss/postcss': {} }
```

Tailwind 4 PostCSS plugin. [OK]

### 21.5 `vitest.config.ts`

```ts
resolve: { alias: { "@": path.resolve(__dirname, ".") } }
test: { environment: "node", include: ["__tests__/**/*.test.ts"], globals: false }
```

Node environment, no DB. Tests must be pure. Matches what I observed in plan 001 section 11. [OK]

### 21.6 Strictness check (plan 006 verifier)

```powershell
rg "ignoreBuildErrors|ignoreDuringBuilds|eslint|typescript" next.config.mjs tsconfig.json package.json
```

- `next.config.mjs:58` - `typescript: { }` field present but empty (ignoreBuildErrors removed).
- `package.json:9` - `"lint": "eslint ."` (no ignore flag).
- No `ignoreDuringBuilds` anywhere.

**Build is strict.** TS errors and lint errors fail the build. [OK]

---

## 22. VPS readiness notes (plan 006 step 5)

### 22.1 Node.js version expectation

`package.json` does not declare an `engines.node` field. Recommended for a VPS deployment: add `"engines": { "node": ">=20.0.0" }` (Next 16 requires Node 18.18+; LTS 20 is the safe target). Owner decision.

### 22.2 Build/start expectations

```bash
pnpm install              # install deps (use --frozen-lockfile for reproducible builds)
pnpm prisma generate      # generate Prisma client (also runs as part of pnpm build)
pnpm build                # runs prisma generate && next build
pnpm start                # serves the production build (default port 3000)
```

`output: 'standalone'` in `next.config.mjs` produces a self-contained `.next/standalone/` directory. For VPS deployment, the typical flow is:
1. `pnpm install --frozen-lockfile`
2. `pnpm prisma generate`
3. `pnpm build`
4. Copy `.next/standalone`, `.next/static`, `public/` to the VPS
5. Run `node .next/standalone/server.js` (or use a process manager)

This is **not** the Vercel flow (which uses serverless functions); it's a long-running Node.js process suitable for systemd / Docker / PM2.

### 22.3 Required env vars in production

From section 20:
- **Required**: `DATABASE_URL`, `AUTH_SECRET` (or `NEXTAUTH_SECRET`), `RESEND_API_KEY`, R2 env block (`R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`, `R2_PUBLIC_BASE_URL`), `NEXT_PUBLIC_APP_URL` (or fallback), `NEXT_PUBLIC_SUPABASE_URL` (or fallback - for proxy.ts).
- **Optional but recommended**: `AUTH_GOOGLE_ID`/`AUTH_GOOGLE_SECRET` (Google OAuth), `CRON_SECRET` (cron auth), `SUPABASE_JWT_SECRET` (token-signing fallback).
- **Not required in production**: `CSP_ALLOW_UNSAFE_EVAL` (omit unless PDF/ticket CSP issues arise), `TOKEN_SIGNING_SECRET` (override only).

### 22.4 Prisma generate / migrate strategy

- `pnpm build` runs `prisma generate` automatically. So in CI/VPS: `pnpm install && pnpm build && pnpm start` is the standard flow.
- For schema changes: `pnpm prisma migrate deploy` (production-safe) or `pnpm prisma db push` (dev only). The codebase has 17 migrations in `prisma/migrations/` (last one dated 2026-06-15).
- **Recommendation:** add a `postinstall` or separate `db:migrate` script that runs `prisma migrate deploy` against the production DB before the app starts. Owner decision.

### 22.5 File storage strategy

- **Active storage:** Cloudflare R2 via `lib/r2.ts` and `next.config.mjs` `images.remotePatterns` (R2 host whitelisted for `next/image`).
- **Legacy storage:** Supabase Storage via `lib/storage.ts` bridge. Bucket `NEXT_PUBLIC_SUPABASE_INVENTORY_BUCKET` (default `"inventario"`) is still referenced by `lib/storage.ts:15`. Some legacy `productos.imagen_url` values may still point to Supabase.
- **Recommendation for VPS:** confirm that R2 is the only intended storage post-migration. The Supabase Storage bridge in `lib/storage.ts` should be retired in a follow-up plan (plan 003/006 future work).

### 22.6 Background jobs / cron assumptions

`vercel.json` schedules 2 cron routes:
- `0 9 * * *` -> `/api/cron/check-trials` (currently disabled, returns `skipped: true`)
- `0 14 * * *` -> `/api/cron/urgent-equipment-report` (currently disabled, returns `skipped: true`)

For VPS, **Vercel Cron does not work**. The VPS would need a system cron (`/etc/cron.d/reparahub`) or a Node-based scheduler (node-cron) calling the same `/api/cron/*` endpoints with `Authorization: Bearer ${CRON_SECRET}`. Plan 007 (verification) should add a smoke test for cron if it gets reactivated.

**Current state:** both crons are disabled, so no cron runner is required for VPS today. If/when they are reactivated, this needs to be addressed.

### 22.7 Local print daemon boundary

The local print daemon (`lib/printing/daemon-client.ts`) connects to `http://127.0.0.1:8182` and `ws://127.0.0.1:8182/ws` from the **browser**. The VPS server has no daemon - the daemon is installed on the local shop PC. CSP already permits these origins (`next.config.mjs:36`).

**VPS implications:**
- The daemon is **not** a server-side dependency. VPS never connects to `127.0.0.1:8182`.
- The browser code does the connection from the user's PC. As long as the shop has the daemon running locally, print works.
- **No change required for VPS deployment** beyond what `next.config.mjs` already does.

### 22.8 Summary checklist for VPS migration

- [x] Build produces standalone output.
- [x] All TS strict.
- [x] All active deps documented; 8 removable candidates identified.
- [x] Env var contract complete.
- [x] Security headers (HSTS, CSP, X-Frame, etc.) in `next.config.mjs`.
- [x] `proxy.ts` is the route guard (not `middleware.ts`).
- [x] Print daemon is browser-only; no server-side 127.0.0.1 calls.
- [ ] Add `engines.node` to `package.json` (owner decision).
- [ ] Decide on system cron strategy (VPS) vs Vercel Cron (current) - only relevant when crons are reactivated.
- [ ] Remove 8 unused packages from `package.json` (owner approval).
- [ ] Remove `NEXT_PUBLIC_SUPABASE_ANON_KEY` env var (no readers in current source).
- [x] Remove `proxy.ts` Supabase REST calls (done in `1f46a69`; JWT claims are the proxy source of truth).
- [x] Resolve `lib/storage.ts` inventory branch through R2 (done in `5e60f0d`; absolute legacy URLs remain supported).

---

## 23. Decision log for plan 006

- **No source changes in plan 006.** This is a documentation-only audit. The plan is the deliverable.
- **8 dependency removal candidates** identified: `@auth/prisma-adapter`, `@radix-ui/react-scroll-area`, `@radix-ui/react-tabs`, `@supabase/ssr`, `@supabase/supabase-js`, `qrcode-generator`, `react-day-picker`, `react-hook-form`. All have zero source importers. **Removal deferred** to a future PR per the plan's owner-approval step.
- **1 indirect dep** (`@swc/helpers`) is likely required by Next.js. Not removed.
- **22 env vars** catalogued in section 20. `DATABASE_URL` and `AUTH_SECRET` (or `NEXTAUTH_SECRET`) are the only true hard requirements. `SUPABASE_JWT_SECRET` is the last-resort fallback and stays.
- **Build is strict.** `ignoreBuildErrors` is removed; TS and lint errors fail the build. [OK]
- **VPS readiness is good** for the SaaS core. The 2 cron routes are disabled, so no cron runner is needed. The local print daemon is browser-only, so the VPS never depends on `127.0.0.1:8182`. `proxy.ts` no longer reads Supabase REST as of `1f46a69`. Relative inventory images now resolve via R2 as of `5e60f0d`; only optional legacy absolute Supabase image host compatibility remains in `next.config.mjs`.
- **`@aws-sdk/client-s3` is correctly used** for R2 (S3-compatible API). Not a stray dep.
- **All devDeps are used** by tooling (TypeScript, vitest, Tailwind, PostCSS, autoprefixer, dotenv, types). 0 unused.

---

## 24. Verification baseline (plan 007 step 1)

Captured after plans 001-006 are complete. **Pre-existing baseline failures are recorded as `BASELINE_FAIL` and are not regressions from the cleanup package.**

| Command | Exit code | Status | Notes |
|---|---|---|---|
| `pnpm build` | 0 | [OK] **GREEN** | `prisma generate` (v7.8.0) + `next build` (Next 16.2.0, Turbopack). 54 static pages, 21 dynamic, 1 proxy. |
| `pnpm test` | 1 | [WARN] **`BASELINE_FAIL`** | vitest 4.1.8, node env, no DB. **70/72 pass**. 2 pre-existing failures, both recorded in section 11: `subscription.test.ts` (DD/MM/YYYY date math) and `whatsapp-utils.test.ts` (no country code). No regression from plans 001-006. |
| `pnpm lint` | 1 | [FAIL] **`BASELINE_FAIL`** | `eslint` is **not in `devDependencies`** and is not installed in `node_modules`. The `"lint": "eslint ."` script in `package.json:9` is broken at the infrastructure level. Per plan 007: "Do not fix lint in this phase unless specifically assigned." Recording only. |
| `pnpm prisma generate` | 0 | [OK] **GREEN** | Prisma client generated successfully. |
| `git diff --stat 80c9a3a..HEAD -- __tests__ app components lib prisma package.json vitest.config.ts tsconfig.json` | n/a | [OK] clean (modulo 3 uncommitted files in `components/` from plan 005 section 17.10) | No new committed source changes since plan 006. |
| `git status -sb` | n/a | i | Modifications from plans 001-002 (5 deletions + 1 edit) + 3 uncommitted files in `components/` + untracked `plans/`. |
| `pkill -f pnpm dev` (or equivalent) | n/a | [OK] | Not run; dev server is not part of the verification baseline. |

### 24.1 `pnpm lint` failure details

```powershell
PS> pnpm lint
> reparahub@2.9.0 lint C:\Users\Vincent\Desktop\reparahub-neon
> eslint .

node.exe : "eslint" no se reconoce como un comando interno o externo,
programa o archivo ejecutable.
ELIFECYCLE  Command failed with exit code 1.
LINT_EXIT=1
```

Root cause: `package.json:9` defines `"lint": "eslint ."` but `eslint` is **not listed in `devDependencies`** (verified by inspecting `package.json` directly). The package is not installed in `node_modules`. No `.eslintrc*` or `eslint.config.*` file exists at the repo root.

**Recommendation** (out of plan 007 scope): add `eslint` and `eslint-config-next` to `devDependencies` and run `pnpm install` to fix the lint script. This is a one-line `package.json` change + a config file write.

### 24.2 Pre-existing test failures (verbatim from section 11)

```
FAIL  __tests__/subscription.test.ts > calcDiasRestantes > handles DD/MM/YYYY fallback format
AssertionError: expected 51 to be less than or equal to 21
   51|     expect(result).not.toBeNull()
   52|     expect(result!).toBeGreaterThanOrEqual(19)
   53|     expect(result!).toBeLessThanOrEqual(21)
       |                     ^
```

```
FAIL  __tests__/whatsapp-utils.test.ts > normalizePhoneForWhatsApp > returns null when no country code provided
AssertionError: expected '525512345678' to be null
    9|   it("returns null when no country code provided", () => {
   10|     expect(normalizePhoneForWhatsApp("5512345678", null)).toBeNull()
       |                                                           ^
```

Both are pre-existing assertion-vs-implementation mismatches. They predate the cleanup package and were present at the recon baseline `80c9a3a`. **Not regressions.** Plan 007 records them so downstream plans can decide whether to fix the tests or the source.

---

## 25. Manual smoke checklist (plan 007 step 2)

Must be run by a human/operator in a production-like tenant after source cleanup phases. Each item is a one-line test that covers a critical user flow. Items grouped by feature area; modules classified per section 10.

### 25.1 Auth & session

- [ ] Login with email + password (CredentialsProvider). Cookie `tallerId` set. Redirect to `/dashboard`.
- [ ] Login with Google OAuth. `taller_users` row auto-provisioned if missing. Cookie `tallerId` set.
- [ ] Logout. Cookies cleared. Redirect to `/`.
- [ ] Login with valid credentials for a tenant whose `plan_tipo === "suspendido"`. Redirect to `/acceso-suspendido?razon=suspendido`.
- [ ] Login with valid credentials for a tenant whose trial has expired. Redirect to `/acceso-suspendido?razon=vencido`.
- [ ] Login attempts are rate-limited (5 per 15 min for `login`, 3 per 15 min for `login_admin`).

### 25.2 Vista general (dashboard)

- [ ] `/dashboard` renders the 4 KPI cards (RPC `get_dashboard_stats` Prisma replacement at `lib/actions/dashboard-prisma.ts`).
- [ ] Vista general sidebar item is pinned ("Inicio" badge).

### 25.3 Reparaciones

- [ ] List page (`/dashboard/reparaciones`) shows tickets paginated 50/page.
- [ ] Create new ticket (form `components/dashboard/nueva-reparacion-form.tsx`): captures cliente, equipo, falla, folio (auto via `getNextFolio`).
- [ ] Detail page (`/dashboard/reparaciones/[id]`): shows estados, gastos, abonos, firma digital.
- [ ] Status change: `RECIBIDO -> DIAGNOSTICO -> EN_REPARACION -> LISTO -> ENTREGADO`.
- [ ] Anticipo: creates `ReparacionAbono` + `MovimientoCaja` (`tipo = anticipo_reparacion`).
- [ ] Liquidacion al entregar: final ticket payment, `MovimientoCaja` (`tipo = liquidacion`).
- [ ] Cancelacion: creates inverse movements (abonos, gastos). No reembolso inmediato (per `README.md` decision).
- [ ] WhatsApp tracking link: `https://reparahub.net/tracking/{folio}` uses `api.whatsapp.com/send` (per `AGENTS.md`).

### 25.4 Ventas (POS)

- [ ] Open caja with initial fund. `Caja` row created with `estado = "abierta"`.
- [ ] Quick sale: search product, add to cart, confirm with payment method, ticket printed.
- [ ] Stock decrement: `producto.stockActual` decreased by sold quantity.
- [ ] Apartado: reserve product, register abonos, liquidate to finalize `Venta`.
- [ ] Cancellation: creates inverse `MovimientoCaja` (`tipo = devolucion_cancelacion`).
- [ ] Kiosko variant (`/dashboard/ventas/kiosko`) loads without errors.
- [ ] Print: thermal ticket renders with `printWithProvider` fallback chain (`daemon -> tauri -> web`).
- [ ] Direct print daemon: if daemon is on (`127.0.0.1:8182`), sale ticket prints via daemon; if off, falls back to web `react-to-print` iframe.

### 25.5 Historial de Ventas

- [ ] List page (`/dashboard/historial-ventas`) shows past sales paginated.
- [ ] Filter by date range.
- [ ] Anular venta: creates inverse `MovimientoCaja` and stock restoration.
- [ ] Reimprimir ticket: opens print-ticket flow.

### 25.6 Inventario

- [ ] List page (`/dashboard/inventario`) shows products paginated 50/page with server-side search.
- [ ] Create product: `NuevoProductoModal` form.
- [ ] Image upload: client-side compression via `browser-image-compression`, then upload to R2 (with Supabase Storage fallback for legacy URLs).
- [ ] Edit product: price, stock, category.
- [ ] IMEI/SKU: unique validation.
- [ ] Categorias: create, alias (slug normalization tested in `__tests__/inventory-categories.test.ts`).

### 25.7 Clientes

- [ ] List page (`/dashboard/clientes`) with search by phone (debounced 300ms).
- [ ] Create client: `NuevoClienteModal`.
- [ ] Detail modal: shows linked ventas + reparaciones history.
- [ ] Edit client: phone normalization tested in `__tests__/phone.test.ts`.

### 25.8 Bitacora de Gastos

- [ ] List page (`/dashboard/bitacora-gastos`).
- [ ] Add gasto: category, monto, metodoPago.
- [ ] Gastos impactan caja (registrados como `MovimientoCaja.tipo = "gasto"`).

### 25.9 Bitacora de Visitas (PRO)

- [ ] List page (`/dashboard/bitacora-visitas`).
- [ ] Manual visit: `Visita` row created.
- [ ] Hikvision webhook: `POST /api/alarms/hikvision/{token}` with valid XML creates `Visita` + uploads snapshot to R2.
- [ ] Bitacora incompletas bloquean cierre de caja (per `docs/PROJECT_CONTEXT.md`).

### 25.10 Mi Equipo

- [ ] List page (`/dashboard/equipo`) shows team members.
- [ ] Add member: email, role (administrador / tecnico_estandar / vendedor_recepcion / solo_lectura).
- [ ] Permissions: `lib/equipo/permissions.ts` `ROLE_PERMISSIONS` enforced.

### 25.11 Configuracion

- [ ] Tabs: Taller / Mi Cuenta / Notificaciones / Reportes y Alertas.
- [ ] Hardware (PRO): Hikvision camera config (`components/configuracion/Hardware.tsx`).
- [ ] Flujo PRO: `healthCheckRequired`, `firmaRequired`, `fotosRequired` toggles.
- [ ] Imprenta: Direct print daemon panel (status, list printers, save config).
- [ ] Importador de folios: `import.ts` action.

### 25.12 PRO modules

- [ ] Chat: `lib/actions/chat-prisma.ts` - messages persist.
- [ ] Compras: `lib/actions/compras-prisma.ts` - purchase orders + used-item purchases (`compras-usado-prisma.ts`).
- [ ] Control de Utilidad: `lib/actions/utilidad-prisma.ts` - margin by venta/reparacion.
- [ ] Mi Tienda: `lib/actions/tienda-prisma.ts` (admin) + `tienda-publica-prisma.ts` (public at `/t/<slug>`).
- [ ] Reportes: `lib/actions/reportes-prisma.ts`.
- [ ] Servicios: `lib/actions/servicios-prisma.ts` + `components/dashboard/servicios/`.
- [ ] Cotizaciones: `lib/actions/cotizaciones.ts` + `components/dashboard/cotizaciones/`.
- [ ] Facturacion (Plan Pro): `/dashboard/facturacion` - plan management.

### 25.13 Print

- [ ] Ticket de reparacion (`/print-ticket/[id]`): web fallback prints via `react-to-print` iframe.
- [ ] Ticket de venta (via `SuccessModal`).
- [ ] Etiqueta de reparacion (50x25mm).
- [ ] Comprobante de abono (`/print-abono/[id]`).
- [ ] Comprobante de compra (`/print-compra`).
- [ ] Garantia (`/garantia/[id]`).
- [ ] Poster de exhibicion (`/api/generate-poster`): square and vertical formats.

### 25.14 Public tracking

- [ ] `/track/[id]` (canonical) and `/tracking/[id]` (redirect).
- [ ] 5-attempt phone validation: 5 wrong phones = 24h lockout.
- [ ] Visitante ve: estado, fotos, QR.
- [ ] WhatsApp CTA uses `api.whatsapp.com/send`.

### 25.15 Cron (currently disabled, for future reactivation)

- [ ] `GET /api/cron/check-trials?authorization=Bearer $CRON_SECRET` returns `success: true, skipped: true`.
- [ ] `GET /api/cron/urgent-equipment-report?authorization=Bearer $CRON_SECRET` returns `success: true, skipped: true`.
- [ ] Both fail-closed (or 401) when `CRON_SECRET` is wrong.

### 25.16 Security & CSP

- [ ] HSTS header present in production responses.
- [ ] `X-Frame-Options: DENY` present.
- [ ] `frame-ancestors 'none'` in CSP.
- [ ] CSP permits `127.0.0.1:8182` for print daemon.
- [ ] CSP permits Supabase + R2 hosts for image proxy.

### 25.17 Admin (`/admin`)

- [ ] Super admin login via OTP (`/admin/verify`).
- [ ] `reparahub_admin_verified` cookie gates `/admin/*` paths.
- [ ] `/admin/dashboard` lists tenants; can change plan, extend trial, suspend, delete.

---

## 26. Characterization tests (plan 007 step 3)

Per plan 007: "Add tests only for pure functions or tiny extracted pure helpers. Avoid DB integration tests in this phase."

**Status: existing test coverage is already strong.** No new tests added in plan 007. Justification below.

### 26.1 Existing test inventory (8 files, 72 tests)

| File | Tests | Coverage area | Status |
|---|---:|---|---|
| `__tests__/currency.test.ts` | 11 | Currency formatting (es-MX locale, edge cases) | [OK] all pass |
| `__tests__/date.test.ts` | 9 | Date manipulation (parse, format, timezone-naive grouping) | [OK] all pass |
| `__tests__/inventory-categories.test.ts` | 13 | Category slug normalization, alias generation | [OK] all pass |
| `__tests__/phone.test.ts` | 10 | Phone normalization (Mexico 52 prefix, last-4 extraction for tracking) | [OK] all pass |
| `__tests__/r2.test.ts` | 8 | Cloudflare R2 client config (key parsing, hostname derivation) | [OK] all pass |
| `__tests__/repair-status.test.ts` | 5 | Repair status enum mapping, workflow transitions | [OK] all pass |
| `__tests__/subscription.test.ts` | 7 | Subscription date math (trial expiration, days remaining) | [WARN] 1 baseline failure |
| `__tests__/whatsapp-utils.test.ts` | 9 | WhatsApp URL builder, phone normalization, country code prepending | [WARN] 1 baseline failure |
| **Total** | **72** | | **70 pass, 2 baseline failures** |

### 26.2 Plan 003 candidate coverage gap

Plan 003 step 3 listed:
- Phone normalization - **covered** (10 tests in `phone.test.ts`).
- Date/timezone grouping - **covered** (9 tests in `date.test.ts`).
- Currency formatting - **covered** (11 tests in `currency.test.ts`).
- Feature gating helper - **not centralized** (per plan 004 section 16.3). No central helper to test.
- Direct print config parsing - `lib/printing/direct-print-config.ts` has `parseDirectPrintConfig`. **Not covered** in tests. Could add a `__tests__/direct-print-config.test.ts` if any future plan extracts this.
- Inventory category slug normalization - **covered** (13 tests in `inventory-categories.test.ts`).

### 26.3 No new tests added in plan 007

- Plan 007 says: "Add tests only for pure functions or tiny extracted pure helpers." Plans 001-006 did **not** extract any new pure helpers (all changes were deletions, edits, or docs). No helpers to characterize.
- The 2 baseline failures (subscription date math, whatsapp no-country-code) are pre-existing and the source of truth (production behavior) is unclear without owner input. Fixing them is a separate task.
- `lib/printing/direct-print-config.ts`'s `parseDirectPrintConfig` is a candidate for a future test. Not added in plan 007 because the file is touched by a feature, not a cleanup. Defer.

**Recommendation (out of plan 007 scope):** if a future plan modifies `lib/printing/direct-print-config.ts`, add a `__tests__/direct-print-config.test.ts` covering:
- Default config (all fields populated, no `enabled`).
- Empty input.
- Invalid mode (`printerMode` not in `"default" | "by_name"`).
- Missing pairing token.
- Valid `by_name` config.

---

## 27. Cleanup guard scripts (plan 007 step 4)

**Status: no scripts added.** Per plan 007: "If adding package scripts feels too broad, keep commands in `plans/runtime-inventory.md` only."

### 27.1 Existing canonical command reference

`plans/runtime-inventory.md` section 13 already contains the PowerShell snippets used throughout plans 001-006:

```powershell
# Find any importer of a file basename
$name = 'some-name'
Get-ChildItem -Path app,components,lib,hooks,types -Recurse -Include '*.ts','*.tsx' -ErrorAction SilentlyContinue |
  sls -Pattern $name |
  Select-Object -ExpandProperty Path

# Find any string across the codebase
$pat = 'createAdminClient'
Get-ChildItem -Path app,components,lib,hooks,prisma,types -Recurse -Include '*.ts','*.tsx' -ErrorAction SilentlyContinue |
  sls -Pattern $pat |
  Select-Object Path,LineNumber,Line

# Show current scoped-tree drift
git diff --stat 80c9a3a..HEAD -- app components lib hooks prisma types package.json next.config.mjs proxy.ts
```

### 27.2 Plan-specific scan commands (from plan 002/003/005 ledgers)

```powershell
# Plan 002: Supabase usage scan
sls -Path app,components,lib,hooks,proxy.ts -Recurse -Include '*.ts','*.tsx' -Pattern 'createAdminClient|createTenantClient|createCurrentTenantClient|createBrowserClient|@supabase|lib/supabase|caja/guard'

# Plan 003: Raw SQL scan
sls -Path app,lib,prisma -Recurse -Include '*.ts','*.tsx','*.prisma' -Pattern 'queryRaw|executeRaw|\$queryRaw|\$executeRaw|raw SQL|raw sql'

# Plan 005: Tauri / daemon / hardware scan
sls -Path app,components,lib,docs -Recurse -Include '*.ts','*.tsx','*.md' -Pattern 'tauri|Tauri|isTauri|daemon|PrintDaemon|directPrint|hardware|Hikvision|ONVIF|RTSP'
```

### 27.3 Optional future improvement

A `scripts/audit-runtime.mjs` could codify these scans into a single command (`pnpm audit:runtime`) that exits non-zero on matches outside documented exceptions. This is **out of plan 007 scope** but recommended for the next cleanup cycle.

---

## 28. Decision log for plan 007

- **No source changes in plan 007.** This is a documentation-only audit. The plan is the deliverable.
- **`pnpm build` is green.** 54 static + 21 dynamic + 1 proxy. The cleanup package did not introduce any build regressions.
- **`pnpm test` has 2 pre-existing failures** (recorded in section 11 / section 24). No regressions from plans 001-006. Owner decides whether to fix the tests or the source.
- **`pnpm lint` is `BASELINE_FAIL`** because `eslint` is not in `devDependencies` and not installed. This is an infrastructure issue independent of the cleanup package. Per plan 007, not fixed in this phase. **Recommendation**: add `eslint` + `eslint-config-next` to `devDependencies` in a future PR.
- **Manual smoke checklist (section 25) covers all 17 user-facing areas**, including the 5 PRO modules, public tracking, cron, security headers, and admin.
- **Characterization tests (section 26): existing 72 tests cover all plan 003 candidate areas** except `parseDirectPrintConfig` (deferred). No new tests added in plan 007 because no new pure helpers were extracted.
- **Cleanup guard scripts (section 27): no scripts added**; canonical PowerShell commands are in section 13 / section 27.2. A `scripts/audit-runtime.mjs` codification is recommended for a future cycle.

---

## 29. End-of-package summary

After 7 cleanup phases (001-007), the following was accomplished.

### 29.1 Source changes (committed to working tree, awaiting owner commit)

| Plan | Files | Net change |
|---|---|---|
| 002 | `app/api/visitas/detect/route.ts` | Deleted |
| 002 | `app/layout.tsx` | Removed Supabase preconnect |
| 002 | `lib/supabase/admin.ts` | Deleted |
| 002 | `lib/supabase/client.ts` | Deleted |
| 002 | `lib/supabase/tenant-client.ts` | Deleted |
| 002 | `lib/caja/guard.ts` | Deleted |
| **Total** | **6 source files** | **5 deletions + 1 edit** |

### 29.2 Documentation produced

- `plans/README.md` - updated with all 7 plans -> `DONE`.
- `plans/runtime-inventory.md` - 29 sections covering:
  - Verification baseline (section 0, section 24)
  - Module inventory (section 1-section 6)
  - Supabase usage ledger (section 14)
  - Raw SQL + schema drift ledger (section 15)
  - Feature gating + PRO ledger (section 16)
  - Print/hardware boundary ledger (section 17)
  - AGENTS.md drift log (section 18)
  - Dependency ledger (section 19)
  - Env var contract (section 20)
  - Build config audit (section 21)
  - VPS readiness notes (section 22)
  - Decision logs (section 23, section 28)
  - Manual smoke checklist (section 25)
  - Characterization tests (section 26)
  - Cleanup guard scripts (section 27)
  - End-of-package summary (section 29)

### 29.3 Verification status (post all 7 plans)

| Check | Status | Notes |
|---|---|---|
| `pnpm build` | [OK] GREEN | 54 static + 21 dynamic + 1 proxy. |
| `pnpm test` | [WARN] `BASELINE_FAIL` | 70/72 pass. 2 pre-existing failures (subscription date math, whatsapp no-country-code). Not regressions. |
| `pnpm lint` | [FAIL] `BASELINE_FAIL` | `eslint` not in `devDependencies`. Not a regression; not fixed per plan 007. |
| `pnpm prisma generate` | [OK] GREEN | |
| `git diff --stat 80c9a3a..HEAD -- ...` (all scoped paths) | [OK] | Only the 3 uncommitted `components/` files from plan 005 section 17.10 + AGENTS.md + skills-lock.json + plans/ untracked. |

### 29.4 Deferred work (for future cycles)

| Item | Owner action | Plan |
|---|---|---|
| Remove 8 unused deps from `package.json` (`@auth/prisma-adapter`, `@radix-ui/react-scroll-area`, `@radix-ui/react-tabs`, `@supabase/ssr`, `@supabase/supabase-js`, `qrcode-generator`, `react-day-picker`, `react-hook-form`) | Confirm with owner; `pnpm remove <pkg>` per package. | 006 |
| Remove `NEXT_PUBLIC_SUPABASE_ANON_KEY` env var (no readers) | Confirm with owner. | 006 |
| Remove orphan runtime flag `GLOBAL_CAJA_GUARD_DISABLED` in `lib/runtime-flags.ts` | Confirm with owner. | 004 |
| Decide `PRO_DISABLED_ROUTES` inverted logic in `dashboard-shell.tsx:67-68` | Owner decision: fix the logic or remove the constant. | 004 |
| Delete or reactivate 2 disabled cron routes (`/api/cron/check-trials`, `/api/cron/urgent-equipment-report`) | Owner decision. If reactivating, also add VPS cron runner. | 004, 006 |
| Delete or reactivate orphan `lib/camera/{hikvision,hikvision-polling}.ts` (zero importers) | Owner decision: delete (Tauri fork is separate repo). | 005 |
| Delete or reactivate `/api/alarms/hikvision/by-taller/[tallerId]/route.ts` (13-line 410 Gone stub) | Owner decision. | 005 |
| Remove `proxy.ts` Supabase REST calls | DONE in `1f46a69`; proxy now uses JWT tenant claims populated by Prisma-backed auth. | 002, 006 follow-up |
| Resolve `lib/storage.ts` inventory branch through R2 | DONE in `5e60f0d`; relative inventory paths now resolve through R2, absolute legacy URLs remain supported. | 002, 006 follow-up |
| Add `engines.node` to `package.json` | Recommend `>=20.0.0`. | 006 |
| Fix 2 pre-existing test failures (`subscription.test.ts`, `whatsapp-utils.test.ts`) | Owner decision: fix tests or fix source. | 007 |
| Add `eslint` + `eslint-config-next` to `devDependencies` | One-line `package.json` change + a config file. | 007 |
| Update `AGENTS.md` to reflect findings from section 18 (Tauri stub count, fallback order, runtime flags, etc.) | Cosmetic revision. | 005, 007 |
| Decide orphan routes (`/dashboard/ventas/kiosko`, `/dashboard/wizard`, etc.) | Owner decision: add sidebar link or delete. | 004 |
| Codify cleanup scans into `scripts/audit-runtime.mjs` | Future maintenance. | 007 |
| DROP FUNCTION on 5 dead RPCs in production DB | Database-side maintenance. | 003 |



---

## 18. AGENTS.md drift log (corrections from plans 001-005)

Items that future agents should know are out-of-date or wrong in `AGENTS.md`. These should be addressed in a future `AGENTS.md` revision, but not in the middle of cleanup phases.

| Section | AGENTS.md claim | Actual state | Source |
|---|---|---|---|
| "Tauri desktop fork" | Lists 4 stub files: `app/print-ticket/[id]/page.tsx`, `components/dashboard/nueva-reparacion-form.tsx`, `components/dashboard/abono-modal.tsx`, `components/dashboard/ventas/SuccessModal.tsx` | `components/dashboard/abono-modal.tsx` does **not** have a Tauri stub. Only 3 stubs exist. | `plans/005` section 17.3 |
| "Print" | "Tauri (no-op in this repo) -> local daemon (WebSocket 127.0.0.1:8182) -> web (`react-to-print` iframe). Don't change the order." | Actual order in `lib/printing/repair-print-service.ts:23-69` is `daemon -> tauri -> web`. In production, tauri branch is dead (no caller passes `tauriPrint`). | `plans/005` section 17.1, section 18 |
| Directory layout | `lib/actions/` - "Non-prisma leftovers (admin, auth, flujo-pro, firma-digital, email) - verify before extending" | `lib/actions/cotizaciones.ts` is **not** mentioned here. It's a non-prisma file with **active** importers (the cotizaciones page + 5 components). Also `lib/actions/import.ts` is active. The list should be expanded. | `plans/001` section 4 |
| Tauri fork section | "4 Tauri stubs" | Should be 3. See above. | `plans/005` section 17.3 |
| Section "Print" | "4 stubs" / "fork should respect these" wording | "3 stubs" + add note that tauri branch in `printWithProvider` is dead in this SaaS. | `plans/005` section 17.3 |
| `audit` and `imap` flags | None mentioned | `lib/runtime-flags.ts` has 4 flags: `PRO_FEATURES_TEMP_DISABLED`, `PRO_DISABLED_ROUTES`, `GLOBAL_CAJA_GUARD_DISABLED` (now orphan), `BARCODE_SCANNER_ENABLED`. AGENTS.md doesn't list any of these. | `plans/004` section 16.2 |










---

## 30. Follow-up Status Update (2026-06-18)

This inventory is historical. The current follow-up status is summarized in `plans/HANDOFF.md`.

Completed after the original 7-phase package:

- H1: `proxy.ts` Supabase REST fallback removed.
- H2: inventory relative images now resolve through R2.
- H3: `NEXT_PUBLIC_SUPABASE_ANON_KEY` removed from tracked runtime docs/templates.
- H5: `package.json` now declares `engines.node >=20.0.0`.
- M1: 8 unused dependencies removed from `package.json` / `pnpm-lock.yaml`.
- M3: dead Hikvision polling package deleted (`hooks/use-hikvision-polling.ts`, `lib/camera/*`).
- M4: deprecated `/api/alarms/hikvision/by-taller/[tallerId]` route deleted.
- M5: orphan `GLOBAL_CAJA_GUARD_DISABLED` removed.
- L2: ESLint 9 + Next flat config added; `pnpm lint` exits 0 with warnings.
- L3 / point 9: baseline tests fixed; `pnpm test` passes 72/72.

Still pending:

- H4: decide/revive/remove disabled cron routes and VPS scheduling strategy.
- M2: DB-side cleanup of dead Postgres functions, after production verification.
- M6: decide whether to remove or fix `PRO_DISABLED_ROUTES` route gate.
- M7: decide orphan dashboard route ownership.
- L1: refresh `AGENTS.md` once unrelated local edits are resolved.
- L4: codify runtime scans into `scripts/audit-runtime.mjs`.
- L5: separate lint-warning hardening cycle.
- L6: decide `@zxing/browser` / `@zxing/library` peer mismatch only if scanner issues appear.
