# Plan 005: Audit Print, Daemon, Tauri Stubs, And Hardware Boundaries

> Executor instructions: Follow this plan step by step. Run every verification command. If a STOP condition occurs, stop and report. Update `plans/README.md` when done.
>
> Drift check: `git diff --stat 80c9a3a..HEAD -- app components lib docs package.json`
> If print or hardware files changed, re-run all scans first.

## Status

- Priority: P2
- Effort: M
- Risk: MED
- Depends on: `plans/001-active-runtime-inventory.md`
- Category: tech-debt
- Planned at: commit `80c9a3a`, 2026-06-18

## Why this matters

The public SaaS must remain web-first, while local print daemon and historical Tauri/Rust ideas are operational side tracks. For VPS migration, hardware-specific code must be isolated behind capability checks and must not create server deployment assumptions. This phase audits what is active, what is a stub, and what belongs in the separate daemon repo.

## Current state

Recon found:

- Active daemon integration in:
  - `lib/printing/daemon-client.ts`
  - `lib/printing/repair-print-service.ts`
  - `lib/printing/direct-print-config.ts`
  - `components/configuracion/DirectPrintPanel.tsx`
  - `components/dashboard/ventas/SuccessModal.tsx`
  - `components/dashboard/nueva-reparacion-form.tsx`
  - `components/dashboard/print-menu-dropdown.tsx`
- Tauri stubs still exist in:
  - `app/print-ticket/[id]/page.tsx`
  - `components/dashboard/nueva-reparacion-form.tsx`
  - `components/dashboard/ventas/SuccessModal.tsx`
- Docs say Tauri standalone is future and not part of public SaaS.
- `app/api/visitas/detect/route.ts` says it receives events from Desktop/Tauri and may be legacy after Hikvision webhook work.
- Direct print daemon lives outside this repo at `C:\Users\Vincent\Desktop\reparahub-print-daemon` and should not be folded into the SaaS repo.

## Commands you will need

| Purpose | Command | Expected on success |
|---------|---------|---------------------|
| Hardware scan | `rg "tauri|Tauri|isTauri|daemon|PrintDaemon|directPrint|hardware|Hikvision|ONVIF|RTSP" app components lib docs -n` | Every match classified |
| Print flow scan | `rg "printEscposWithDaemon|printWithProvider|imprimirTicket|react-to-print|print-ticket|print-label" app components lib -n` | Active print flows identified |
| Package scan | `rg "tauri|qz|electron" package.json pnpm-lock.yaml app components lib docs -n` | No stale runtime deps unless intentional |
| Build | `pnpm build` | exit 0 |

## Scope

In scope:

- Print provider abstraction under `lib/printing/*`
- Print UI components and pages
- Configuracion Imprenta panel
- Tauri stub comments and docs
- Hardware/Hikvision docs and routes only when they affect public SaaS runtime

Out of scope:

- Do not modify the separate `reparahub-print-daemon` repo in this phase.
- Do not implement PWA.
- Do not remove the daemon integration if it is product-active.
- Do not reintroduce Tauri dependencies into this SaaS repo.

## Steps

### Step 1: Create hardware/print ledger

Add `Print and hardware boundary ledger` to `plans/runtime-inventory.md`. Classify each match as:

- `PUBLIC_WEB_ACTIVE`: needed in SaaS browser runtime.
- `LOCAL_DAEMON_ACTIVE`: needed for local print daemon integration.
- `TAURI_STUB_KEEP`: intentional future contract, no dependency.
- `LEGACY_DESKTOP_REMOVE`: stale desktop/Tauri route or helper.
- `DOC_ONLY`.

Verify:

```powershell
Select-String -Path plans\runtime-inventory.md -Pattern "Print and hardware boundary ledger"
```

Expected: ledger exists.

### Step 2: Keep daemon integration isolated

Confirm daemon code is client/browser-only where required. It should not execute during server rendering except parsing config or building payloads.

Check:

```powershell
rg "127.0.0.1:8182|WebSocket|window|fetch\(" lib/printing components/configuracion app components -n
```

If browser-only code can run on the server, guard it or move it behind client components.

Verify:

```powershell
pnpm build
```

Expected: exit 0.

### Step 3: Decide Tauri stubs

For each `isTauriAvailable` or `isTauriDesktop` stub:

- If it is still referenced by `printWithProvider`, decide whether to keep as documented future contract or remove from the web SaaS path.
- If kept, comments must say: no runtime dependency, future standalone fork only.
- If removed, verify all print flows still use `web` and `daemon` providers correctly.

Verify:

```powershell
rg "@tauri|src-tauri|isTauriAvailable|isTauriDesktop|tauriPrint" app components lib package.json -n
```

Expected: no package import; remaining stubs are documented or removed.

### Step 4: Remove stale hardware route references only after import proof

For routes like `app/api/visitas/detect/route.ts`, coordinate with Plan 002. Do not delete here if Supabase migration is not complete. Instead, mark as `LEGACY_DESKTOP_REMOVE` in the ledger and reference Plan 002.

Verify:

```powershell
Select-String -Path plans\runtime-inventory.md -Pattern "LEGACY_DESKTOP_REMOVE"
```

Expected: any stale route is documented.

## Test plan

Automated:

```powershell
pnpm build
pnpm test
```

Manual:

- Configuracion > Imprenta renders.
- Direct print panel handles daemon off state gracefully.
- POS sale success modal still supports web fallback.
- Repair print menu still supports web fallback and daemon when configured.
- No server route tries to connect to local `127.0.0.1`.

## Done criteria

- [ ] Print/hardware ledger exists.
- [ ] Public SaaS, daemon, Tauri stub, and legacy desktop code are separated.
- [ ] No stale native dependencies in `package.json`.
- [ ] Build/test pass.
- [ ] `plans/README.md` row 005 updated.

## STOP conditions

Stop and report if:

- Removing a Tauri stub changes current printing behavior.
- A server component tries to use browser-only daemon APIs.
- A hardware integration is actively used by a shop and owner approval is needed.

## Maintenance notes

Keep all local hardware as capability-based integration. A VPS deployment should never require Windows printer APIs, localhost daemon access, Tauri, camera hardware, or Supabase Realtime unless explicitly documented as optional.
