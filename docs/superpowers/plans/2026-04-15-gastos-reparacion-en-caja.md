# Gastos de Reparación en Caja — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Every internal repair expense (`reparacion_gastos`) automatically generates a cash outflow (`movimientos_caja`) in the currently open register, with full traceability back to the repair folio.

**Architecture:** Two-task sequence — (1) DB migration adds `'gasto_reparacion'` to `movimientos_caja.tipo` CHECK; (2) `addGastoTicket()` in `lib/actions/gastos.ts` is extended to fetch the repair folio, look up the active caja, and insert a best-effort `movimientos_caja` entry immediately after the `reparacion_gastos` insert. No UI changes are needed — the cash movement is created transparently by the server action.

**Tech Stack:** Next.js Server Actions (TypeScript), Supabase JS v2

---

## Context for the implementer

- **`addGastoTicket()`** lives at `lib/actions/gastos.ts:65`. It currently inserts into `reparacion_gastos` and returns — no cash side-effect.
- **`createCurrentTenantClient()`** returns `{ supabase, tallerId }`. `tallerId` is a string UUID. Already imported at the top of `gastos.ts`.
- **Active caja lookup:** Query `caja` table where `taller_id = tallerId AND estado = 'abierta'` ORDER BY `fecha_apertura DESC` LIMIT 1. This is the same query used by `getCajaAbierta()` in `ventas.ts`. Do **not** import from `ventas.ts` to avoid coupling — replicate the 4-line query inline.
- **Best-effort cash movement:** If no active caja exists (shop is closed), still return success. The gasto is recorded; the cash movement is simply skipped. Log the skip with `console.warn`.
- **`movimientos_caja` insert shape** (from ventas.ts pattern):
  ```typescript
  {
    taller_id:    string   // tallerId
    caja_id:      string   // active caja.id — omit if null
    tipo:         string   // "gasto_reparacion"
    referencia_id: string  // reparacion_id (UUID) — traceability to repair
    descripcion:  string   // "Gasto por refacción/servicio en Folio #X"
    monto:        number   // negative (egreso) — -Math.abs(input.monto)
    metodo_pago:  string   // "efectivo" (shop's own funds)
    fecha:        string   // ISO timestamp
  }
  ```
- **`movimientos_caja.tipo` CHECK** — current valid values (after migration 20260415000004): `'venta_pdv', 'anticipo_reparacion', 'liquidacion_reparacion', 'gasto', 'anulacion_venta', 'devolucion_cancelacion'`. New value `'gasto_reparacion'` must be added before the server action can insert it.
- **Folio lookup:** Simple query `SELECT folio FROM reparaciones WHERE id = $reparacion_id AND taller_id = $tallerId`. If the repair is not found (unlikely), use `"?"` as fallback folio.
- **`reparacion_gastos` has no `movimiento_caja_id` column** — reversal on delete is out of scope for this plan.

---

## File Map

| Action | File | Change |
|--------|------|--------|
| Create | `supabase/migrations/20260415000005_gasto_reparacion_tipo.sql` | Adds `'gasto_reparacion'` to `movimientos_caja` tipo CHECK |
| Modify | `lib/actions/gastos.ts:65-86` — `addGastoTicket()` | Insert cash movement after gasto insert |

---

## Task 1: DB Migration — Add `gasto_reparacion` tipo

**Files:**
- Create: `supabase/migrations/20260415000005_gasto_reparacion_tipo.sql`

- [ ] **Step 1: Create the migration file**

```sql
-- Migration: add 'gasto_reparacion' to movimientos_caja.tipo CHECK
-- Date: 2026-04-15
-- Context: addGastoTicket() inserts cash outflow movements with this tipo
--          to distinguish internal repair expenses from generic 'gasto' (bitacora_gastos).
--
-- Full list after this migration:
--   venta_pdv, anticipo_reparacion, liquidacion_reparacion, gasto,
--   anulacion_venta, devolucion_cancelacion, gasto_reparacion

ALTER TABLE public.movimientos_caja
  DROP CONSTRAINT IF EXISTS movimientos_caja_tipo_check;

ALTER TABLE public.movimientos_caja
  ADD CONSTRAINT movimientos_caja_tipo_check CHECK (tipo IN (
    'venta_pdv',
    'anticipo_reparacion',
    'liquidacion_reparacion',
    'gasto',
    'anulacion_venta',
    'devolucion_cancelacion',
    'gasto_reparacion'
  ));
```

- [ ] **Step 2: Apply in Supabase SQL editor**

Paste the file contents and run. Expected output: `ALTER TABLE`. Verify:
```sql
SELECT pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conname = 'movimientos_caja_tipo_check';
```
Expected: one row listing all 7 tipos including `gasto_reparacion`.

- [ ] **Step 3: Commit**

```bash
cd C:\Users\Vincent\Desktop\reparahub
git add supabase/migrations/20260415000005_gasto_reparacion_tipo.sql
git commit -m "migration: add gasto_reparacion to movimientos_caja tipo CHECK"
```

---

## Task 2: Extend `addGastoTicket` to create cash movement

**Files:**
- Modify: `lib/actions/gastos.ts:65-86`

- [ ] **Step 1: Read the current function**

Read `lib/actions/gastos.ts` lines 65–90 to confirm the current shape:
```typescript
export async function addGastoTicket(
  input: AddGastoTicketInput
): Promise<{ data: ReparacionGasto | null; error: string | null }> {
  const { supabase, tallerId } = await createCurrentTenantClient()

  const { data, error } = await supabase
    .from("reparacion_gastos")
    .insert({ ... })
    .select()
    .single()

  if (error) return { data: null, error: error.message }
  return { data: data as ReparacionGasto, error: null }
}
```

- [ ] **Step 2: Replace `addGastoTicket` with the extended version**

Use the Edit tool to replace the function body. The new version adds 3 steps after the `reparacion_gastos` insert: fetch repair folio, fetch active caja, insert cash movement.

Replace the existing function (from `export async function addGastoTicket` through its closing `}`) with:

```typescript
export async function addGastoTicket(
  input: AddGastoTicketInput
): Promise<{ data: ReparacionGasto | null; error: string | null }> {
  const { supabase, tallerId } = await createCurrentTenantClient()

  const { data, error } = await supabase
    .from("reparacion_gastos")
    .insert({
      taller_id:       tallerId,
      reparacion_id:   input.reparacion_id,
      concepto:        input.concepto.trim(),
      monto:           input.monto,
      tipo:            input.tipo,
      producto_id:     input.producto_id ?? null,
      mostrar_cliente: input.mostrar_cliente ?? false,
    })
    .select()
    .single()

  if (error) return { data: null, error: error.message }

  // ── Egreso automático en caja ────────────────────────────────────────────
  // Best-effort: if no active caja, skip silently. Never block the gasto save.
  try {
    // 1. Fetch repair folio for the description
    const { data: repairRow } = await supabase
      .from("reparaciones")
      .select("folio")
      .eq("id", input.reparacion_id)
      .eq("taller_id", tallerId)
      .single()

    const folio = (repairRow as { folio?: string } | null)?.folio ?? "?"

    // 2. Fetch active caja
    const { data: cajaRow } = await supabase
      .from("caja")
      .select("id")
      .eq("taller_id", tallerId)
      .eq("estado", "abierta")
      .order("fecha_apertura", { ascending: false })
      .limit(1)
      .maybeSingle()

    if (!cajaRow) {
      console.warn("[addGastoTicket] No hay caja abierta — egreso omitido para reparacion_id:", input.reparacion_id)
    } else {
      // 3. Insert cash outflow
      const tipoLabel = input.tipo === "refaccion" ? "refacción" : "servicio"
      const { error: movErr } = await supabase.from("movimientos_caja").insert({
        taller_id:    tallerId,
        caja_id:      cajaRow.id,
        tipo:         "gasto_reparacion",
        referencia_id: input.reparacion_id,
        descripcion:  `Gasto por ${tipoLabel} en Folio #${folio}`,
        monto:        -Math.abs(input.monto),
        metodo_pago:  "efectivo",
        fecha:        new Date().toISOString(),
      })
      if (movErr) {
        console.error("[addGastoTicket] movimientos_caja insert error:", movErr)
        // Non-fatal — gasto was saved, cash movement failed
      }
    }
  } catch (cashErr) {
    console.error("[addGastoTicket] cash movement (fatal catch):", cashErr)
    // Non-fatal
  }
  // ─────────────────────────────────────────────────────────────────────────

  return { data: data as ReparacionGasto, error: null }
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd C:\Users\Vincent\Desktop\reparahub
pnpm build 2>&1 | grep -E "error TS" | head -10
```

Expected: no TypeScript errors.

- [ ] **Step 4: Commit**

```bash
cd C:\Users\Vincent\Desktop\reparahub
git add lib/actions/gastos.ts
git commit -m "feat(gastos): addGastoTicket inserts gasto_reparacion egreso in active caja"
```

---

## How to Test After These Changes

1. Open ReparaHub → open a caja (if one isn't open)
2. Go to any repair ticket (Reparaciones → click any repair)
3. Add a gasto manually (concepto + monto) or add a product refaccion
4. Check the caja movements:
   - Go to Ventas → Caja (or the relevant view for movimientos)
   - Verify a new entry with tipo `gasto_reparacion`, negative monto, and description "Gasto por refacción/servicio en Folio #X" appeared
5. Add a second gasto — verify second movement appears
6. **Edge case:** Close the caja, then add a gasto → gasto saves successfully, no crash, `console.warn` logged in server

---

## Self-Review

### Spec Coverage

| Requirement | Status | Location |
|---|---|---|
| Detect gasto is "paid by shop" | ✅ All `reparacion_gastos` are shop costs — no flag needed | Task 2 |
| Insert `reparacion_gastos` first | ✅ Unchanged — insert still happens first, cash is best-effort after | Task 2 |
| Fetch active `caja_id` for taller | ✅ Inline query on `caja` table | Task 2 |
| Insert `movimientos_caja` tipo `gasto_reparacion` | ✅ | Task 2 |
| Description includes folio | ✅ "Gasto por refacción/servicio en Folio #X" | Task 2 |
| `referencia_id` = repair UUID for traceability | ✅ `referencia_id: input.reparacion_id` | Task 2 |
| Negative monto (egreso) | ✅ `-Math.abs(input.monto)` | Task 2 |
| Best-effort — no blocking if caja closed | ✅ Wrapped in `try/catch`, returns gasto success either way | Task 2 |
| DB migration for new tipo | ✅ | Task 1 |
| No UI changes needed | ✅ Callers in `bitacora-edit-modal.tsx` and `nueva-reparacion-form.tsx` unchanged | — |
