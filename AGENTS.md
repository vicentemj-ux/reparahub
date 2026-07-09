# AGENTS.md

Compact reference for OpenCode agents working on ReparaHub. See `CLAUDE.md` for full project context, `docs/PROJECT_CONTEXT.md` for architecture, and `plans/README.md` if the task touches the active VPS-migration cleanup package.

## Product

- Multi-tenant SaaS for repair shops / stores (cell phones, computers, consoles, electronics, parts). Public site: `reparahub.net`. 30-day free trial grants Pro access.
- Plans: **Normal** (core ops) and **Pro** (automation, scale, advanced reporting, Mi Tienda, Bitacora de Visitas, Compras, Reportes, Servicios, Control de Utilidad, Chat Taller).
- Mi Tienda: public catalog at `/t/<slug>` and `/t/<slug>/p/<id>`. Limits 5 (Normal) / 50 (Pro) products, trial = 50. NORMAL shows "Hecho con ReparaHub" branding; PRO may hide it. No commissions, no payment gateway. See `docs/COMPLIANCE_TIENDA.md`.

## Stack

Next.js 16 (App Router, RSC, Server Actions) · React 19 · TypeScript 5.7 (strict) · Tailwind 4 · Prisma 7.8 with `@prisma/adapter-pg` (Postgres / Neon) · Supabase legacy (auth/storage) being phased out per `plans/002` · Resend (email) · Sonner (toasts) · `react-to-print` (web print fallback) · local print daemon at `127.0.0.1:8182` (WebSocket/HTTP) · NextAuth 4.24 (Google OAuth) + custom JWT for tenant claims.

## Commands

```bash
npm run dev              # Next.js dev (localhost:3000)
npm run build            # prisma generate && next build
npm start            # serve production build
npm run lint             # ESLint
npm test             # vitest run (utility tests in __tests__/)
npm run test:watch       # vitest watch mode
npm run version:bump -- patch|minor|major   # syncs package.json + CHANGELOG + git tag
```

`npm run build` **must** run `prisma generate` first — do not split them.

## Directory layout (real entrypoints)

```
app/                       # Next.js App Router (dashboard/* = authed, /t/<slug> = public store)
app/api/                   # Route handlers, including /api/cron/* and /api/alarms/hikvision/[token]
proxy.ts                   # Route protection (NOT middleware.ts — Next 16 renamed it)
components/dashboard/      # Module components; modals are dumb, logic in page.tsx
lib/actions/*-prisma.ts    # ACTIVE Server Actions per domain (repairs, ventas, productos, ...)
lib/actions/               # Non-prisma leftovers (admin, auth, flujo-pro, firma-digital, email) — verify before extending
lib/supabase/              # LEGACY — admin.ts, client.ts, tenant-client.ts. Do not import in new code.
lib/prisma.ts              # Singleton PrismaClient (DATABASE_URL, cached on globalThis)
lib/printing/              # Print provider: daemon-client.ts (WS), repair-print-service.ts (Tauri→daemon→web fallback)
lib/r2.ts                  # Cloudflare R2 client (active image storage)
lib/storage.ts             # Mixed: bridges R2 + Supabase for legacy paths
lib/offline/               # IndexedDB drafts + sync queue (fails silently)
lib/auth.ts                # Token signing: AUTH_SECRET > NEXTAUTH_SECRET > SUPABASE_JWT_SECRET (fallback)
prisma/schema.prisma       # Source of truth for app data model
prisma/migrations/         # Prisma migrations
supabase/migrations/       # LEGACY — pre-Prisma SQL migrations, do not extend
docs/                      # PROJECT_CONTEXT, PRODUCT_STRATEGY, VERSIONING, PRINTING_ARCHITECTURE, etc.
plans/                     # ACTIVE 7-phase cleanup plan for VPS migration (read plans/README.md first)
__tests__/                 # Vitest utility tests (node env, no DB)
scripts/bump-version.mjs   # Version bump + CHANGELOG + tag
```

## Critical conventions

### Tenant isolation
- Active path: Prisma. Read `tallerId` from `getCurrentTallerId()` (`lib/auth/get-current-taller.ts`) and **always** include it in `where` clauses.
- Legacy path: `createTenantClient(tallerId)` / `createCurrentTenantClient()` from `lib/supabase/tenant-client.ts`. Do not use in new code.
- `createAdminClient()` (`lib/supabase/admin.ts`) is allowed **only** in `/admin/**` and `/track/**` routes.
- `lib/auth.ts` signIn callback auto-provisions tenant + user + `configuracion_taller` for Google OAuth.

### Database gotchas
- **Never query `inventario`** (it doesn't exist). Use `productos`.
- `ventas`, `caja`, `movimientos_caja` store `taller_id` as **text**, not UUID. Other tables use UUID. RLS policies on those three do **not** cast to `::uuid` — do not add casts.
- Server Actions file naming: `lib/actions/<domain>-prisma.ts`. Don't add new top-level `actions/*.ts` for CRUD; extend the prisma variant.
- RPC functions still in use: `get_dashboard_stats`, `get_next_folio`, `batch_decrement_stock`, `get_garantia_ticket`, `get_inventory_operational_kpis`.
- Triggers: `reparaciones_sync_costos` (syncs `costo_total`/`restante`), `historial_reparacion_on_insert` (audit row on create).
- Decimal money: `Decimal @db.Decimal(12, 2)` in Prisma; never use floats for currency.

### Print
- `lib/printing/repair-print-service.ts` implements the fallback chain: Tauri (no-op in this repo) → local daemon (WebSocket `127.0.0.1:8182`) → web (`react-to-print` iframe). Don't change the order.
- `app/print-ticket/[id]/page.tsx`, `components/dashboard/nueva-reparacion-form.tsx` and `components/dashboard/ventas/SuccessModal.tsx` contain `isTauriAvailable = async () => false` stubs — leave them as documented integration points for the standalone Tauri fork. Do not remove.
- `components/dashboard/abono-modal.tsx` no longer has a Tauri stub (it was never injected); the print path is `useThermalTicketPrint` (in-modal `react-to-print`).
- CSP already permits `http://127.0.0.1:8182`, `http://localhost:8182`, and the matching `ws://`/`wss://` in `next.config.mjs`. Do not tighten without coordinating with the print panel.
- Paper size (`80mm` / `58mm`) is read from `configuracion_taller.tamano_papel`.
- For new thermal-ticket flows use `useThermalTicketPrint` from `lib/print/print-config.ts`. For letter reports use `useLetterReportPrint` from the same file. (`lib/print.ts` was retired — see `DISABLED/`.)

### Storage / uploads
- Active: Cloudflare R2 via `lib/r2.ts` (env: `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`, `R2_PUBLIC_BASE_URL`).
- Legacy: `NEXT_PUBLIC_SUPABASE_INVENTORY_BUCKET` and `lib/storage.ts` Supabase branch. `lib/storage.ts` intentionally bridges both; do not delete the Supabase branch without confirming the calling flow.
- Image compression happens client-side (`browser-image-compression`); uploads are batched with `Promise.allSettled`.

### UI patterns
- Page container: `<div className="min-h-screen bg-slate-50"><div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6">`
- Tables: wrap in `w-full overflow-x-auto` for mobile scroll.
- POS: `flex flex-col lg:flex-row gap-6` (mobile: cart below, desktop: two columns).
- Palette: `bg-slate-50` / `bg-white`, `border-slate-200`, accent `bg-blue-600` / `text-blue-600`. No dark backgrounds in operational views.
- Primary CTAs add the `btn-glow` class (radial-gradient blur in `app/globals.css`).
- Toasts: import from `@/hooks/use-toast`, never from `sonner` directly. Position `top-right` with `offset={80}`. Variants: `toast.success(title)` (green, title only); `toast({title, description, variant: "destructive"|"warning"|"info"})`. Never pass JSX content.
- Mobile inputs: monetary fields use `inputMode="decimal"` + `pattern`.

### WhatsApp links
- Use `https://api.whatsapp.com/send?phone=<intl-number>`. Mexico default prefix `52` is **not** hard-coded for all tenants — pull the country's dialing code from the tenant/phone util.
- For tracking, `lib/whatsapp-send-url.ts` and `lib/whatsapp-repair-status.ts` are the canonical builders.

## Env vars (active contract)

```
DATABASE_URL                       # Postgres/Neon direct connection (Prisma)
DIRECT_URL                         # Same, for migrations

AUTH_SECRET                        # Preferred token-signing secret
NEXTAUTH_SECRET                    # Fallback if AUTH_SECRET absent
NEXTAUTH_URL                       # http://localhost:3000 in dev

AUTH_GOOGLE_ID
AUTH_GOOGLE_SECRET

RESEND_API_KEY
NEXT_PUBLIC_APP_URL                # https://reparahub.net in prod

R2_ACCOUNT_ID
R2_ACCESS_KEY_ID
R2_SECRET_ACCESS_KEY
R2_BUCKET
R2_PUBLIC_BASE_URL
NEXT_PUBLIC_R2_PUBLIC_BASE_URL     # Public mirror used in CSP / next/image

# LEGACY — being removed. Do not read from new code.
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
SUPABASE_JWT_SECRET                # Only as last-resort signing fallback in lib/auth.ts
NEXT_PUBLIC_SUPABASE_INVENTORY_BUCKET
```

Vercel-specific: `next.config.mjs` derives the Supabase host from `NEXT_PUBLIC_SUPABASE_URL` for CSP / `next/image` `remotePatterns`. If you remove Supabase, update both.

## Security

- JWT (custom) includes `taller_id`, expires 1h, regenerated per request.
- 5 auth endpoints are rate-limited (`lib/auth/rate-limit.ts`, `lib/rate-limit-public.ts`).
- CSP set in `next.config.mjs` (HSTS, X-Frame-Options DENY, frame-ancestors 'none'). `ignoreBuildErrors` was removed — TS errors fail the build.
- `proxy.ts` guards routes; treat it as the only entrypoint for auth/session bootstrapping.

## Offline

IndexedDB at `lib/offline/`: `nueva_reparacion_draft` (form drafts), `repair_queue` (sync queue). Both fail silently when IndexedDB is unavailable; do not surface errors to users.

## Versioning & commits

- SemVer. `package.json:version` is the source of truth, synced with `docs/PROJECT_CONTEXT.md` and `CHANGELOG.md` by `scripts/bump-version.mjs`.
- Release tag format: `vX.Y.Z`. Checkpoint tag before large features: `vX.Y.Z-checkpoint-pre-<feature>`.
- Conventional Commits **required**: `feat/fix/perf/refactor/docs/chore(scope): message`. The bump script groups commits by type into the CHANGELOG.
- Rollback: `git reset --hard vX.Y.Z`.

## Working in `plans/` (VPS migration cleanup)

`plans/README.md` is the entrypoint. **Read the target plan in full before acting**; do not start a phase before the prior one is DONE. Status values: TODO | IN PROGRESS | DONE | BLOCKED | REJECTED. Plans are designed to be passed one by one to another model. Drift checks at the top of each plan (`git diff --stat <baseline>..HEAD ...`) must be run first.

Recon invariants (commit `80c9a3a`, 2026-06-18):
- 001 is the contract for 002–007. Don't delete anything before 001 produces the inventory.
- 002 cannot touch `lib/supabase/*` package removals until every source import is gone.
- 006 may not run before 002 finishes.
- Untouched unless explicitly assigned: `internal/`, `.agents/`, `.codex/`, `skills-lock.json`, `reparahubv28.rar`.

## Tauri desktop fork (not in this repo)

- This SaaS repo does **not** contain Tauri/Rust code. The desktop build is a **separate, private** repo for selected shops (CDSE, Reparatech, Electronica Morelos).
- Tauri `@tauri-apps/*` deps and the `tauri`/`tauri:dev`/`tauri:build` scripts are intentionally absent.
- The three `isTauriAvailable` / `isTauriDesktop` stubs (in `app/print-ticket/[id]/page.tsx`, `components/dashboard/nueva-reparacion-form.tsx`, `components/dashboard/ventas/SuccessModal.tsx`) are documented integration points. The web fallback (`react-to-print` iframe) is the production path. Do not add `@tauri-apps/*` to this repo.
- The local Tauri desktop fork used to inject `[REPARAHUB-DESKTOP PATCH START v1]` blocks into the SaaS repo on disk, replacing the stubs with real implementations. Those patches are now archived in `DISABLED/tauri-patches/` (see that folder's README). If the desktop fork re-injects them, the SaaS `tsc --noEmit` will fail because the patches injected into `import { ... }` blocks. The fix is to remove the patch and restore the SaaS stubs.

## Retired code (`/DISABLED/`)

Componentes, módulos y parches retirados del proyecto activo viven en `/DISABLED/` (raíz). Nada dentro de esa carpeta se compila, se lintéa, ni es alcanzable desde una ruta del SaaS. Si necesitas reintroducir algo, lee primero `DISABLED/README.md`.

Retiros actuales (jun 2026):
- **Parches Tauri** (`DISABLED/tauri-patches/*.patch.txt`): bloques `[REPARAHUB-DESKTOP PATCH START v1]` que el fork desktop inyectaba en 3 archivos del SaaS y rompían el build. Restaurados los stubs `() => false`.
- **DOM oculto Tauri** (`DISABLED/components/dashboard/*-hidden-div.txt`): `<div ref={hiddenRef}>` con tickets raster que solo consumía la rama Tauri retirada.
- **`lib/print.ts`**: `paperSizeToPx` y `PaperSize` nunca importados. Documentos que referencian `imprimirTicket()` ya no aplican.
- **`app/print-abono/[id]/page.tsx`** + **`getAbonoPrintData`** en `print-formatter-prisma.ts`: ruta huérfana y su Server Action. La impresión de abonos ocurre in-modal vía `useThermalTicketPrint`.
- **`useThermalLabelPrint` + `THERMAL_LABEL_PAGE_STYLE`** en `print-config.ts`: helpers sin callers. `app/print-label/page.tsx` define su propio CSS inline.
- **`scripts/prepare-tauri-server.js`**: script huérfano del fork desktop archivado.
- **Dependencia `html-to-image`**: solo la consumían los parches Tauri. Eliminada de `package.json` y `package-lock.json`.
