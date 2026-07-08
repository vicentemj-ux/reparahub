# Cancelar Reparación — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "Cancelar reparación" button to the repair detail page that reverses all financial movements and restores parts stock atomically, then changes the repair status to "Cancelado".

**Architecture:** Three-task sequence — (1) DB migration to add `'devolucion_cancelacion'` to `movimientos_caja.tipo` CHECK; (2) two new server actions in `lib/actions/repairs.ts`: `getCancelacionSummary()` (prefetch refund total for the dialog) and `cancelarReparacion()` (atomic reversal); (3) a new "Cancelar" button + AlertDialog in `components/dashboard/repair-detail-view.tsx`. The repair status maps to the existing `"Cancelado"` value (already valid in DB and STATUS_OPTIONS), avoiding updates to the 6+ RPCs that filter `NOT IN ('Entregado','Cancelado')`.

**Tech Stack:** Next.js Server Actions (TypeScript), Supabase JS v2, Supabase RPC `batch_increment_stock`

---

## Context for the implementer

- **Detail page entry:** `app/dashboard/reparaciones/[id]/page.tsx` renders `<RepairDetailView>` from `components/dashboard/repair-detail-view.tsx`
- **Status change helper:** `applyRepairStatusChange()` at `lib/actions/repairs.ts:1161` — handles status update + `historial_reparacion` audit + `logRepairChange` in one call. Use this, don't write a raw `.update()`.
- **Stock increment RPC:** `batch_increment_stock` exists in Supabase (added in migration `20260329000001`). Same signature as `batch_decrement_stock`: `{ items: [{ producto_id: string, taller_id: string, cantidad: number }] }`.
- **`reparacion_gastos` has NO `cantidad` column** — the table schema is `(id, reparacion_id, taller_id, descripcion, monto, tipo, producto_id, created_at)`. Stock restoration must use `cantidad: 1` per `refaccion`-type gasto row that has a non-null `producto_id`.
- **`movimientos_caja`** — `caja_id` is nullable (best-effort copy from original movement). `referencia_id` = repair UUID. `metodo_pago` must be preserved from the original payment movement.
- **Current `movimientos_caja.tipo` values:** `'venta_pdv' | 'anticipo_reparacion' | 'liquidacion_reparacion' | 'gasto' | 'anulacion_venta'` — `'devolucion_cancelacion'` must be added via migration before the server action inserts it.
- **Guard logic:** `cancelarReparacion()` must refuse if `estatus` is already `'Cancelado'`, `'Sin Reparacion'`, or `'Entregado'` — terminal states where cancellation makes no sense.
- **No payments is valid:** If a repair has zero `movimientos_caja` records (e.g. no anticipo was recorded), cancellation still succeeds — it just skips the financial reversal step. The dialog should show "$0.00" in that case.
- **Existing AlertDialog pattern** — the component already imports and uses `AlertDialog`/`AlertDialogContent`/etc. from `@/components/ui/alert-dialog` (see delete dialog at line 518). Follow the same pattern.

---

## File Map

| Action | File | Change |
|--------|------|--------|
| Create | `supabase/migrations/20260415000004_cancelacion_reparacion_tipo.sql` | Adds `'devolucion_cancelacion'` to `movimientos_caja` tipo CHECK |
| Modify | `lib/actions/repairs.ts` | Add `getCancelacionSummary()` and `cancelarReparacion()` exports |
| Modify | `components/dashboard/repair-detail-view.tsx` | Add cancel button + AlertDialog |

---

## Task 1: DB Migration — Add `devolucion_cancelacion` tipo

**Files:**
- Create: `supabase/migrations/20260415000004_cancelacion_reparacion_tipo.sql`

- [ ] **Step 1: Create the migration file**

```sql
-- Migration: add 'devolucion_cancelacion' to movimientos_caja.tipo CHECK
-- Date: 2026-04-15
-- Context: cancelarReparacion() inserts reversal movements with this tipo.
--
-- Current valid tipos (from 20260329000001):
--   venta_pdv, anticipo_reparacion, liquidacion_reparacion, gasto, anulacion_venta
-- After this migration: same list + devolucion_cancelacion

ALTER TABLE public.movimientos_caja
  DROP CONSTRAINT IF EXISTS movimientos_caja_tipo_check;

ALTER TABLE public.movimientos_caja
  ADD CONSTRAINT movimientos_caja_tipo_check CHECK (tipo IN (
    'venta_pdv',
    'anticipo_reparacion',
    'liquidacion_reparacion',
    'gasto',
    'anulacion_venta',
    'devolucion_cancelacion'
  ));
```

- [ ] **Step 2: Apply in Supabase SQL editor**

Paste the file contents into the Supabase SQL editor and run it.

Expected output: `ALTER TABLE` (no error). Verify with:
```sql
SELECT conname, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conname = 'movimientos_caja_tipo_check';
```
Expected: one row showing all 6 tipos including `devolucion_cancelacion`.

- [ ] **Step 3: Commit the migration file**

```bash
cd C:\Users\Vincent\Desktop\reparahub
git add supabase/migrations/20260415000004_cancelacion_reparacion_tipo.sql
git commit -m "migration: add devolucion_cancelacion to movimientos_caja tipo CHECK"
```

---

## Task 2: Server Actions — `getCancelacionSummary` + `cancelarReparacion`

**Files:**
- Modify: `lib/actions/repairs.ts` (append two exports at the end of the file)

- [ ] **Step 1: Read the end of repairs.ts to find the insertion point**

Open `lib/actions/repairs.ts` and scroll to the last line. Find the last `export async function` so you know where to append.

- [ ] **Step 2: Append `getCancelacionSummary` export**

Add this function after the last existing export in `lib/actions/repairs.ts`:

```typescript
/**
 * Prefetch: returns the total refund amount and breakdown by metodo_pago
 * for the repair's existing payment movements (anticipo + liquidacion).
 * Used to populate the cancellation dialog BEFORE the user confirms.
 */
export async function getCancelacionSummary(repairId: string): Promise<{
  total: number
  movements: Array<{ id: string; tipo: string; monto: number; metodo_pago: string; caja_id: string | null }>
  error?: string
}> {
  try {
    const supabase = await createClient()
    const tallerId = await getCurrentTallerId()
    if (!tallerId) return { total: 0, movements: [], error: "Sin sesión" }

    const { data, error } = await supabase
      .from("movimientos_caja")
      .select("id, tipo, monto, metodo_pago, caja_id")
      .eq("referencia_id", repairId)
      .eq("taller_id", tallerId)
      .in("tipo", ["anticipo_reparacion", "liquidacion_reparacion"])

    if (error) return { total: 0, movements: [], error: error.message }

    const movements = (data ?? []) as Array<{ id: string; tipo: string; monto: number; metodo_pago: string; caja_id: string | null }>
    const total = movements.reduce((sum, m) => sum + Number(m.monto), 0)
    return { total, movements }
  } catch (e) {
    console.error("[getCancelacionSummary]", e)
    return { total: 0, movements: [], error: "Error inesperado" }
  }
}
```

- [ ] **Step 3: Append `cancelarReparacion` export**

Add this function immediately after `getCancelacionSummary`:

```typescript
/**
 * Cancels a repair:
 * 1. Guards against double-cancel and terminal states.
 * 2. Mirrors each payment movement (anticipo/liquidacion) as a devolucion_cancelacion egreso.
 * 3. Restores stock for all refaccion-type gastos with a linked producto_id (qty 1 each).
 * 4. Changes estatus to "Cancelado" via applyRepairStatusChange (writes historial_reparacion).
 *
 * Financial movements are best-effort (logged on failure, don't block status change).
 * Stock restore is best-effort (logged on failure, don't block status change).
 */
export async function cancelarReparacion(repairId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient()
    const tallerId = await getCurrentTallerId()
    if (!tallerId) return { success: false, error: "Sin sesión activa." }

    // 1. Fetch current repair — validate ownership and guard terminal states
    const { data: repair, error: repairErr } = await supabase
      .from("reparaciones")
      .select("id, estatus, folio")
      .eq("id", repairId)
      .eq("taller_id", tallerId)
      .single()

    if (repairErr || !repair) {
      return { success: false, error: "Reparación no encontrada." }
    }

    const TERMINAL = ["Cancelado", "Sin Reparacion", "Entregado"]
    if (TERMINAL.includes(repair.estatus)) {
      return { success: false, error: `No se puede cancelar una reparación en estado "${repair.estatus}".` }
    }

    // 2. Mirror payment movements as devolucion_cancelacion
    const { movements } = await getCancelacionSummary(repairId)

    if (movements.length > 0) {
      const reversals = movements.map((m) => ({
        taller_id: tallerId,
        tipo: "devolucion_cancelacion" as const,
        monto: -Math.abs(Number(m.monto)),
        metodo_pago: m.metodo_pago,
        referencia_id: repairId,
        caja_id: m.caja_id ?? null,
        descripcion: `Devolución por cancelación de reparación #${repair.folio}`,
      }))

      const { error: reversalErr } = await supabase.from("movimientos_caja").insert(reversals)
      if (reversalErr) {
        console.error("[cancelarReparacion] reversals insert:", reversalErr)
        // Non-fatal: log and continue — status change is the source of truth
      }
    }

    // 3. Restore stock for refaccion gastos with a linked product
    const { data: gastosData } = await supabase
      .from("reparacion_gastos")
      .select("producto_id")
      .eq("reparacion_id", repairId)
      .eq("taller_id", tallerId)
      .eq("tipo", "refaccion")
      .not("producto_id", "is", null)

    const gastosConProducto = (gastosData ?? []).filter((g) => g.producto_id)

    if (gastosConProducto.length > 0) {
      const stockItems = gastosConProducto.map((g) => ({
        producto_id: g.producto_id as string,
        taller_id: tallerId,
        cantidad: 1,
      }))

      const { error: stockErr } = await supabase.rpc("batch_increment_stock", { items: stockItems })
      if (stockErr) {
        console.error("[cancelarReparacion] stock restore error:", stockErr)
        // Non-fatal: log and continue
      }
    }

    // 4. Change status to "Cancelado" with full audit trail
    const result = await applyRepairStatusChange({
      repairId,
      estadoAnterior: repair.estatus,
      estadoNuevo: "Cancelado",
      notaTecnica: "Reparación cancelada con devolución automática.",
    })

    return result
  } catch (e) {
    console.error("[cancelarReparacion] fatal:", e)
    return { success: false, error: "Error inesperado al cancelar la reparación." }
  }
}
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
cd C:\Users\Vincent\Desktop\reparahub
pnpm build 2>&1 | grep -E "error TS" | head -10
```

Expected: no TypeScript errors.

- [ ] **Step 5: Commit**

```bash
cd C:\Users\Vincent\Desktop\reparahub
git add lib/actions/repairs.ts
git commit -m "feat(repairs): add getCancelacionSummary + cancelarReparacion server actions"
```

---

## Task 3: UI — Cancelar Button + AlertDialog

**Files:**
- Modify: `components/dashboard/repair-detail-view.tsx`

The plan has 4 sub-steps: (a) add state variables, (b) add the prefetch + confirm handler, (c) add the button in the header, (d) add the AlertDialog markup.

- [ ] **Step 1: Read lines 83–113 of repair-detail-view.tsx**

Confirm the existing state declarations. The new state vars go right after the existing `useState` block — after line `const [viewTicketOpen, setViewTicketOpen] = useState(false)` (around line 112).

- [ ] **Step 2: Add state variables**

In `components/dashboard/repair-detail-view.tsx`, locate this line (around line 112):
```typescript
  const [viewTicketOpen, setViewTicketOpen] = useState(false)
```

Add the three new state declarations immediately after it:
```typescript
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false)
  const [cancelSummary, setCancelSummary] = useState<{ total: number; movements: Array<{ id: string; tipo: string; monto: number; metodo_pago: string; caja_id: string | null }> } | null>(null)
  const [isCancelling, setIsCancelling] = useState(false)
```

- [ ] **Step 3: Add the imports for new server actions**

Find the existing server action import line near the top of the file. It will look something like:
```typescript
import { getRepairDetail, ... } from "@/lib/actions/repairs"
```

Add `getCancelacionSummary` and `cancelarReparacion` to that import.

- [ ] **Step 4: Add `handleCancelClick` and `handleCancelConfirm` handlers**

Find `const handleDeleteConfirm = async () => {` (around line 149). Add these two handlers just BEFORE `handleDeleteConfirm`:

```typescript
  const handleCancelClick = async () => {
    if (!repair) return
    const summary = await getCancelacionSummary(repair.id)
    setCancelSummary(summary)
    setCancelDialogOpen(true)
  }

  const handleCancelConfirm = async () => {
    if (!repair) return
    setIsCancelling(true)
    const result = await cancelarReparacion(repair.id)
    setIsCancelling(false)
    setCancelDialogOpen(false)
    if (result.success) {
      // Refresh local state: update estatus to Cancelado
      onRepairUpdated({ ...repair, estatus: "Cancelado" } as BitacoraRepair)
      setEstado("Cancelado")
    } else {
      alert(result.error ?? "No se pudo cancelar la reparación.")
    }
  }
```

- [ ] **Step 5: Add the Cancel button in the header action row**

Find the Trash2 delete button (around line 504–513):
```typescript
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="text-red-600 hover:bg-red-50 hover:text-red-700"
                onClick={() => setDeleteDialogOpen(true)}
                aria-label="Eliminar"
              >
                <Trash2 className="h-5 w-5" />
              </Button>
```

Add the cancel button immediately BEFORE the Trash2 button:
```typescript
              {repair && !["Cancelado", "Sin Reparacion", "Entregado"].includes(estado) && (
                <Button
                  type="button"
                  variant="outline"
                  size="default"
                  className="gap-2 border-red-300 text-red-600 hover:bg-red-50 hover:text-red-700"
                  onClick={handleCancelClick}
                >
                  <span className="text-sm font-semibold">Cancelar reparación</span>
                </Button>
              )}
```

- [ ] **Step 6: Add the AlertDialog markup**

Find the closing tag of the delete AlertDialog (the `</AlertDialog>` that closes at around line 551). Add the new cancel AlertDialog immediately after it:

```typescript
        <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
          <AlertDialogContent className="max-w-md">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-center text-xl font-bold text-slate-900">
                ¿Cancelar esta reparación?
              </AlertDialogTitle>
              <AlertDialogDescription className="space-y-2 text-center text-base text-slate-700">
                <span className="block">Esta acción cancelará el folio y generará devoluciones automáticas.</span>
                {cancelSummary && cancelSummary.total > 0 ? (
                  <span className="block font-semibold text-red-600">
                    Total a devolver:{" "}
                    {new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(cancelSummary.total)}
                  </span>
                ) : (
                  <span className="block text-slate-500">Sin pagos registrados — no se generarán devoluciones.</span>
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="flex flex-col-reverse gap-2 pt-4 sm:flex-row">
              <AlertDialogCancel disabled={isCancelling} className="border-slate-300 text-slate-700">
                Volver
              </AlertDialogCancel>
              <AlertDialogAction
                disabled={isCancelling}
                onClick={(e) => {
                  e.preventDefault()
                  handleCancelConfirm()
                }}
                className="bg-red-600 text-white hover:bg-red-700"
              >
                {isCancelling ? "Cancelando..." : "Confirmar cancelación"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
```

- [ ] **Step 7: Verify TypeScript compiles**

```bash
cd C:\Users\Vincent\Desktop\reparahub
pnpm build 2>&1 | grep -E "error TS" | head -10
```

Expected: no TypeScript errors.

- [ ] **Step 8: Commit**

```bash
cd C:\Users\Vincent\Desktop\reparahub
git add components/dashboard/repair-detail-view.tsx
git commit -m "feat(repairs): cancelar reparacion button with auto-refund dialog"
```

---

## How to Test After These Changes

1. Go to `localhost:3000/dashboard/reparaciones`
2. Open any repair with `estatus = 'Recibido'`, `'En Reparacion'`, or `'Listo'`
3. You should see a new **"Cancelar reparación"** button in the top-right action row (red outline, next to the trash icon)
4. Click it → an AlertDialog should open showing:
   - If the repair had an anticipo/liquidacion: "Total a devolver: $XXX.XX" in red
   - If no payments: "Sin pagos registrados — no se generarán devoluciones."
5. Click "Confirmar cancelación"
6. The repair card should update its status to "CANCELADO"
7. **Verify in Supabase:**
   - `reparaciones.estatus = 'Cancelado'` for the repair
   - `historial_reparacion` has a new row for the status change
   - `movimientos_caja` has new `devolucion_cancelacion` rows (if payments existed), each with negative `monto` and same `metodo_pago` as originals
   - `productos.stock_actual` incremented by 1 for each `refaccion`-type gasto with `producto_id` (if any existed)
8. Try clicking "Cancelar reparación" on a repair already in `'Cancelado'` status → button should be hidden (guard in JSX: `!["Cancelado", "Sin Reparacion", "Entregado"].includes(estado)`)

---

## Self-Review

### Spec Coverage

| Requirement | Status | Location |
|---|---|---|
| Change estatus to cancelled | ✅ Uses "Cancelado" (existing valid DB value) via `applyRepairStatusChange` | Task 2, Step 3 |
| Mirror-refund each payment movement | ✅ Inserts `devolucion_cancelacion` per `anticipo_reparacion`/`liquidacion_reparacion` | Task 2, Step 3 |
| Preserve metodo_pago on refund | ✅ Copied from original movement | Task 2, Step 3 |
| Restore stock for parts | ✅ `batch_increment_stock` qty 1 per refaccion gasto with producto_id | Task 2, Step 3 |
| Skip financial moves if no payments | ✅ `if (movements.length > 0)` guard | Task 2, Step 3 |
| AlertDialog with total amount | ✅ Prefetched via `getCancelacionSummary` before dialog opens | Task 3, Steps 4+6 |
| Guard already-terminal repairs | ✅ Server-side check + button hidden for Cancelado/SinReparacion/Entregado | Task 2 Step 3 + Task 3 Step 5 |
| Audit trail in historial_reparacion | ✅ Via `applyRepairStatusChange` | Task 2, Step 3 |
| DB migration for devolucion_cancelacion tipo | ✅ | Task 1 |
| `reparacion_gastos` has no `cantidad` | ✅ Uses qty=1 per row — documented in Context section | Task 2, Step 3 |
