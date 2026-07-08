# Anular Venta — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the "Cancelar / devolución" button visible and functional for all authenticated taller users (currently hidden because the permission gate requires a platform-admin flag that most talleres don't have).

**Architecture:** The entire feature is already implemented — server action (`anularVenta`), atomic Supabase RPC (`anular_venta_pdv`), confirmation dialog, and grey/badge UI all exist in `app/dashboard/historial-ventas`. The only broken piece is `canAnularVentas()` which checks `taller_users.es_admin` (a platform-admin flag set by Vicente from `/admin`) instead of simply checking that the user has an authenticated taller session. The RPC itself already validates tenant ownership, so removing the overly-restrictive gate is safe.

**Tech Stack:** Next.js Server Action (TypeScript), Supabase JS v2

---

## Context for the implementer

- **Where the feature lives:** `app/dashboard/historial-ventas/page.tsx` — accessible via the sidebar nav link "Historial de Ventas"
- **What's already working:** atomic DB transaction (estado → 'anulado', stock restored, movimiento_caja de type 'anulacion_venta' inserted, audit fields set), confirmation dialog with optional motivo field, row shown with `opacity-55` + red "ANULADA" badge
- **What's broken:** `canAnularVentas()` at `lib/actions/ventas.ts:1134` returns `false` for any taller that hasn't had `es_admin = true` set from the `/admin` panel, so the dropdown menu item never renders
- **Security note:** The RPC `anular_venta_pdv` validates `taller_id` ownership and 'activa' state server-side. Removing the client-side `es_admin` gate does not introduce a security vulnerability.

---

## File Map

| Action | File | Change |
|--------|------|--------|
| Modify | `lib/actions/ventas.ts:1133-1136` | Replace `isUserAdmin()` with `getCurrentTallerId()` existence check |

---

## Task 1: Fix `canAnularVentas()` Permission Gate

**Files:**
- Modify: `lib/actions/ventas.ts:1133-1136`

- [ ] **Step 1: Read the current function**

Open `lib/actions/ventas.ts` around line 1133. The current code is:

```typescript
/** Cuenta con `taller_users.es_admin` (panel /admin y permisos sensibles como anular ventas). */
export async function canAnularVentas(): Promise<boolean> {
  return isUserAdmin()
}
```

- [ ] **Step 2: Replace with an authenticated-session check**

Change the function to return `true` for any user with a valid taller session:

```typescript
/** Cualquier usuario autenticado del taller puede anular ventas. La seguridad real está en el RPC `anular_venta_pdv`. */
export async function canAnularVentas(): Promise<boolean> {
  const tallerId = await getCurrentTallerId()
  return !!tallerId
}
```

`getCurrentTallerId()` is already imported at line 5 of the file (`import { getCurrentTallerId } from "@/lib/auth/get-current-taller"`). No new imports needed.

- [ ] **Step 3: Verify `isUserAdmin` is no longer the only caller**

Run this to check if `isUserAdmin` is still used elsewhere in ventas.ts:

```bash
cd C:\Users\Vincent\Desktop\reparahub
grep -n "isUserAdmin" lib/actions/ventas.ts
```

Expected: 0 results (you just removed the only call). If there are other calls, leave them untouched.

- [ ] **Step 4: If `isUserAdmin` is now unused in ventas.ts, remove its import**

The import at line 6 is:
```typescript
import { isUserAdmin } from "@/lib/auth/check-admin"
```

If `grep` from Step 3 returned 0 results, delete that import line. If it still appears elsewhere in the file, leave the import.

- [ ] **Step 5: Verify TypeScript compiles**

```bash
cd C:\Users\Vincent\Desktop\reparahub
pnpm build 2>&1 | grep -E "error TS" | head -10
```

Expected: no TypeScript errors related to `canAnularVentas` or `isUserAdmin`.

- [ ] **Step 6: Commit**

```bash
cd C:\Users\Vincent\Desktop\reparahub
git add lib/actions/ventas.ts
git commit -m "fix(ventas): canAnularVentas checks taller session — was blocking all non-platform-admin users"
```

---

## Task 2: Verify Supabase Migrations Are Applied

The atomic `anular_venta_pdv` RPC and the `ventas.estado` column were added in two migrations. If the DB was recently truncated/reset and these migrations were never applied, the feature will fail at the RPC call.

**Files:**
- No code changes — DB verification only

- [ ] **Step 1: Check if `ventas.estado` column exists**

Run in Supabase SQL editor:
```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'ventas'
  AND column_name IN ('estado', 'anulado_por', 'fecha_anulacion', 'motivo_anulacion');
```

Expected: 4 rows returned. If 0 rows → apply migration `20260329` and `20260330` (next step).

- [ ] **Step 2: Check if RPC `anular_venta_pdv` exists**

```sql
SELECT routine_name
FROM information_schema.routines
WHERE routine_name = 'anular_venta_pdv';
```

Expected: 1 row. If 0 rows → apply the migrations.

- [ ] **Step 3 (only if columns/RPC are missing): Apply migrations in order**

Paste the contents of these files into the Supabase SQL editor and run them in order:

1. `supabase/migrations/20260329000001_ventas_estado_increment_stock_anulacion.sql`
2. `supabase/migrations/20260330000001_anular_venta_atomic_audit.sql`

Expected after each: "Success. N rows affected."

- [ ] **Step 4: Verify `batch_increment_stock` RPC also exists**

```sql
SELECT routine_name
FROM information_schema.routines
WHERE routine_name = 'batch_increment_stock';
```

Expected: 1 row. This RPC is called internally by `anular_venta_pdv` to restore stock. If missing, re-run migration `20260329`.

---

## How to Test After These Changes

1. Go to `app.reparahub.net/dashboard/historial-ventas` (or `localhost:3000/dashboard/historial-ventas`)
2. Find any sale with status "activa"
3. Click the `⋯` (three dots) actions button on that row
4. You should now see "Cancelar / devolución" in red at the bottom of the dropdown
5. Click it → a confirmation dialog opens with optional motivo field
6. Click "Confirmar anulación"
7. The row should turn grey with a red "ANULADA" badge
8. Go to Caja → the day's cash should reflect the reversal (negative `anulacion_venta` movement)
9. Check the product's stock in Inventario — it should have been restored

---

## Self-Review

### Spec Coverage

| Requirement | Status | Location |
|---|---|---|
| `anularVenta(saleId)` function | ✅ Already exists | `lib/actions/ventas.ts:1283` |
| Anular button in historial | ✅ Already exists, **fixed by Task 1** | `HistorialVentasAcciones.tsx:228` |
| Change estado to 'anulada' | ✅ Already in RPC | `anular_venta_pdv` step 7 |
| Restore stock from detalle_ventas | ✅ Already in RPC | `batch_increment_stock` called by RPC |
| Create movimiento_caja 'anulacion_venta' | ✅ Already in RPC | `anular_venta_pdv` step 6 |
| Validation (not already anulada, correct taller) | ✅ Already in RPC | `anular_venta_pdv` steps 3-4 |
| Confirmation dialog | ✅ Already exists | `HistorialVentasAcciones.tsx:277` |
| Grey row + 'ANULADA' badge | ✅ Already exists | `historial-ventas/page.tsx:383-397` |
| DB migrations applied | **Verify in Task 2** | |
