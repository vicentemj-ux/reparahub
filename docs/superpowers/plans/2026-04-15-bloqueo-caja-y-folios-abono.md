# Bloqueo de Caja y Folios de Abono — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Three linked improvements: (1) prefix repair payment folios with `A-` in historial de ventas, (2) add a mandatory caja-opening modal to the dashboard layout, (3) make `registrarAbono` hard-fail when no caja is open.

**Architecture:** Three independent file changes — `historial-ventas.ts` (1 line), a new `CajaGuard` client component in `components/dashboard/caja-guard.tsx` wired into `app/dashboard/layout.tsx`, and `registrarAbono` in `repairs.ts` promoted from best-effort to mandatory caja check. No DB migrations needed.

**Tech Stack:** Next.js App Router (client + server), Supabase JS v2, shadcn/ui Dialog, existing server actions `getCajaAbierta()` and `abrirCaja()` from `lib/actions/ventas.ts`

---

## Context for the implementer

### Codebase orientation

- **`lib/actions/historial-ventas.ts:269`** — line that builds the `folio` for repair-payment rows in the historial. Currently `const folio = rep?.folio ?? "—"`. Repair folios are pure integers ("1", "2", "3") since migration `20260415000001`.
- **`app/dashboard/layout.tsx`** — `"use client"` component, ~519 lines. The `DashboardLayout` function renders at line 460. The main content area renders `{children}` at line 512. Add `<CajaGuard />` just before `{children}`.
- **`lib/actions/ventas.ts`**:
  - `getCajaAbierta()` at line 416 — returns `{ caja: CajaRow | null; error: string | null }`. Exported server action.
  - `abrirCaja(montoInicial: number)` at line 434 — opens a caja. Exported server action.
- **`lib/actions/repairs.ts`** — `registrarAbono()` at line 1616. The movimientos_caja insert at line 1688 is currently `// Best-effort`. The caja query there uses `.maybeSingle()` without error on null. Change: check for open caja BEFORE updating `reparaciones.anticipo`, return error if none found.
- **shadcn Dialog** — already used in the codebase. Non-closeable by adding `onInteractOutside={(e) => e.preventDefault()}` and `onEscapeKeyDown={(e) => e.preventDefault()}` to `<DialogContent>`. Do NOT render a `<DialogClose>` or `X` button.
- **`getCajaAbierta` from a client component** — server actions can be called directly from client components. Import and call normally.

---

## File Map

| Action | File | Change |
|--------|------|--------|
| Modify | `lib/actions/historial-ventas.ts:269` | Prefix repair folios with `A-` |
| Create | `components/dashboard/caja-guard.tsx` | Non-closeable opening-balance modal |
| Modify | `app/dashboard/layout.tsx` | Add `<CajaGuard />` before `{children}` |
| Modify | `lib/actions/repairs.ts` | Make caja check mandatory in `registrarAbono` |

---

## Task 1: Prefix repair payment folios with `A-`

**Files:**
- Modify: `lib/actions/historial-ventas.ts:269`

This is a 1-line change inside `fetchCobrosReparacion()`.

- [ ] **Step 1: Read the target line**

Read `lib/actions/historial-ventas.ts` lines 265–280 to confirm line 269 reads:
```typescript
    const folio = rep?.folio ?? "—"
```

- [ ] **Step 2: Apply the change**

Replace that single line with:
```typescript
    const folio = rep ? `A-${rep.folio}` : "—"
```

- [ ] **Step 3: Verify TypeScript**

```bash
cd C:\Users\Vincent\Desktop\reparahub
pnpm build 2>&1 | grep -E "error TS" | head -10
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
cd C:\Users\Vincent\Desktop\reparahub
git add lib/actions/historial-ventas.ts
git commit -m "feat(historial): prefix repair payment folios with A- in historial de ventas"
```

---

## Task 2: CajaGuard — mandatory opening-balance modal

**Files:**
- Create: `components/dashboard/caja-guard.tsx`
- Modify: `app/dashboard/layout.tsx`

### Step 1: Create the component

- [ ] **Create `components/dashboard/caja-guard.tsx`** with this exact content:

```tsx
"use client"

import { useEffect, useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { getCajaAbierta, abrirCaja } from "@/lib/actions/ventas"

export function CajaGuard({ children }: { children: React.ReactNode }) {
  const [checked, setChecked] = useState(false)
  const [cajaAbierta, setCajaAbierta] = useState(true) // optimistic: assume open until checked
  const [fondo, setFondo] = useState("")
  const [isOpening, setIsOpening] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  useEffect(() => {
    getCajaAbierta().then(({ caja }) => {
      setCajaAbierta(caja !== null)
      setChecked(true)
    })
  }, [])

  const handleAbrirCaja = async () => {
    const monto = parseFloat(fondo)
    if (isNaN(monto) || monto < 0) {
      setErrorMsg("Ingresa un monto válido (puede ser 0 si no hay fondo inicial).")
      return
    }
    setIsOpening(true)
    setErrorMsg(null)
    const res = await abrirCaja(monto)
    setIsOpening(false)
    if (res.error) {
      setErrorMsg(res.error)
      return
    }
    setCajaAbierta(true)
  }

  // While checking: render children (avoids flash of modal on first render)
  if (!checked || cajaAbierta) {
    return <>{children}</>
  }

  return (
    <>
      {children}
      <Dialog open modal>
        <DialogContent
          className="max-w-sm"
          onInteractOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
          // Hide the default X close button from shadcn
          hideCloseButton
        >
          <DialogHeader>
            <DialogTitle className="text-center text-xl font-bold text-slate-900">
              Abrir Caja
            </DialogTitle>
            <DialogDescription className="text-center text-slate-600">
              Para garantizar que el corte de caja sea exacto, es necesario definir el fondo inicial
              antes de realizar cualquier operación.
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fondo-inicial" className="text-sm font-semibold text-slate-700">
                Fondo de Caja Inicial
              </Label>
              <Input
                id="fondo-inicial"
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={fondo}
                onChange={(e) => setFondo(e.target.value)}
                className="h-14 text-center text-2xl font-bold"
                onKeyDown={(e) => { if (e.key === "Enter") handleAbrirCaja() }}
                autoFocus
              />
              <p className="text-xs text-slate-500 text-center">
                Ingresa el efectivo con el que inicias el día. Puede ser $0.
              </p>
            </div>

            {errorMsg && (
              <p className="text-sm text-red-600 text-center">{errorMsg}</p>
            )}

            <Button
              className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-bold text-base"
              onClick={handleAbrirCaja}
              disabled={isOpening}
            >
              {isOpening ? "Abriendo caja..." : "Abrir Caja y Empezar"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
```

> **Note on `hideCloseButton`:** shadcn's `DialogContent` renders an `X` close button by default via an internal `DialogClose`. Check if your local `components/ui/dialog.tsx` supports a `hideCloseButton` prop. If it doesn't, you have two options:
> - **Option A (preferred):** Add `hideCloseButton?: boolean` prop to `DialogContent` in `components/ui/dialog.tsx` and conditionally render the close button. See Step 2 below.
> - **Option B:** Add CSS to hide it: `[&>button]:hidden` on the `DialogContent` className.

- [ ] **Step 2: Handle the close button suppression**

Read `components/ui/dialog.tsx` and look for the `DialogContent` component. It likely has a `<DialogClose>` with `<X>` icon near the bottom of the render. 

If `hideCloseButton` prop does NOT exist, add it:

Find the `DialogContent` React.forwardRef definition. Add the `hideCloseButton` prop and conditionally render the close button:

```tsx
const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> & { hideCloseButton?: boolean }
>(({ className, children, hideCloseButton, ...props }, ref) => (
  <DialogPortal>
    <DialogOverlay />
    <DialogPrimitive.Content ref={ref} className={cn("...", className)} {...props}>
      {children}
      {!hideCloseButton && (
        <DialogClose className="...">
          <X className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </DialogClose>
      )}
    </DialogPrimitive.Content>
  </DialogPortal>
))
```

(Adapt to the exact existing code — don't rewrite what you don't need to change.)

- [ ] **Step 3: Wire CajaGuard into the layout**

Read `app/dashboard/layout.tsx` lines 510–515. The `{children}` is rendered like:
```tsx
        <main className="flex-1 overflow-y-auto scroll-smooth bg-slate-50/50 font-sans">
          {children}
        </main>
```

Add the import at the top of the file:
```tsx
import { CajaGuard } from "@/components/dashboard/caja-guard"
```

Then wrap children:
```tsx
        <main className="flex-1 overflow-y-auto scroll-smooth bg-slate-50/50 font-sans">
          <CajaGuard>
            {children}
          </CajaGuard>
        </main>
```

- [ ] **Step 4: Verify TypeScript**

```bash
cd C:\Users\Vincent\Desktop\reparahub
pnpm build 2>&1 | grep -E "error TS" | head -10
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
cd C:\Users\Vincent\Desktop\reparahub
git add components/dashboard/caja-guard.tsx app/dashboard/layout.tsx components/ui/dialog.tsx
git commit -m "feat(caja): mandatory opening-balance modal when no caja is open"
```

---

## Task 3: Block `registrarAbono` when no caja is open

**Files:**
- Modify: `lib/actions/repairs.ts` — `registrarAbono()` at line ~1686

Currently the caja check in `registrarAbono` is inside a `// Best-effort` try/catch block — it skips silently if no caja. Change it to a hard guard that runs BEFORE updating `reparaciones.anticipo`.

- [ ] **Step 1: Read the function**

Read `lib/actions/repairs.ts` lines 1636–1720 to confirm the current structure. The function:
1. Validates input (~line 1628)
2. Fetches repair row (folio, anticipo, precio_estimado) (~line 1641)
3. Checks overpayment (~line 1657)
4. Updates `reparaciones.anticipo` (~line 1666)
5. Logs change (~line 1678)
6. Best-effort caja insert (~line 1688)

- [ ] **Step 2: Add the hard caja guard**

After the overpayment check (after the `if (presupuesto > 0 && currentAnticipo + input.monto > presupuesto * 1.1)` block, around line 1659) and **before** the `Update anticipo` step, insert this block:

```typescript
  // 2b. Require an open caja — abonos must be linked to a cash register
  const { data: cajaCheck } = await supabase
    .from("caja")
    .select("id")
    .eq("taller_id", tallerId)
    .eq("estado", "abierta")
    .order("fecha_apertura", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!cajaCheck?.id) {
    return {
      success: false,
      error: "No hay caja abierta. Abre la caja antes de registrar un abono.",
    }
  }
  const cajaId = (cajaCheck as Record<string, unknown>).id as string
```

- [ ] **Step 3: Use `cajaId` in the movimientos_caja insert**

Now that we guaranteed `cajaId` exists, replace the existing best-effort block (lines ~1686–1716) with a direct insert that uses `cajaId`:

Find this block:
```typescript
  let movimientoCajaId: string | null = null

  // 4. Best-effort: register in movimientos_caja if there is an open caja
  try {
    const { data: cajaRow } = await supabase
      .from("caja")
      .select("id")
      .eq("taller_id", tallerId)
      .eq("estado", "abierta")
      .maybeSingle()

    if (cajaRow?.id) {
      const tipo = liquidado ? "liquidacion_reparacion" : "anticipo_reparacion"
      const { data: movData } = await supabase
        .from("movimientos_caja")
        .insert({
          taller_id: tallerId,
          caja_id: (cajaRow as Record<string, unknown>).id,
          tipo,
          referencia_id: input.repairId,
          descripcion: `${liquidado ? "Liquidación" : "Anticipo"} — Folio ${folio}`,
          monto: input.monto,
          metodo_pago: input.metodoPago,
        })
        .select("id")
        .single()
      movimientoCajaId = (movData as Record<string, unknown> | null)?.id as string | undefined ?? null
    }
  } catch (e) {
    console.error("[registrarAbono] movimientos_caja insert failed (best-effort):", e)
  }
```

Replace it with:
```typescript
  let movimientoCajaId: string | null = null

  // 4. Register in movimientos_caja (caja is guaranteed open from step 2b)
  try {
    const tipo = liquidado ? "liquidacion_reparacion" : "anticipo_reparacion"
    const { data: movData, error: movErr } = await supabase
      .from("movimientos_caja")
      .insert({
        taller_id:     tallerId,
        caja_id:       cajaId,
        tipo,
        referencia_id: input.repairId,
        descripcion:   `${liquidado ? "Liquidación" : "Anticipo"} — Folio ${folio}`,
        monto:         input.monto,
        metodo_pago:   input.metodoPago,
      })
      .select("id")
      .single()
    if (movErr) {
      console.error("[registrarAbono] movimientos_caja insert:", movErr)
    }
    movimientoCajaId = (movData as Record<string, unknown> | null)?.id as string | undefined ?? null
  } catch (e) {
    console.error("[registrarAbono] movimientos_caja insert failed:", e)
  }
```

- [ ] **Step 4: Verify TypeScript**

```bash
cd C:\Users\Vincent\Desktop\reparahub
pnpm build 2>&1 | grep -E "error TS" | head -10
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
cd C:\Users\Vincent\Desktop\reparahub
git add lib/actions/repairs.ts
git commit -m "feat(repairs): registrarAbono requires open caja — no longer best-effort"
```

---

## How to Test After These Changes

### Task 1 — Folio prefix
1. Go to `Historial de Ventas`
2. Filter by "Reparación" (cobros de reparación)
3. All repair payment rows should show folio as `A-1`, `A-2`, etc.
4. PDV sales still show `V-00001` style folios (unchanged)

### Task 2 — CajaGuard
1. Close any open caja in the DB (or use a taller with no open caja)
2. Navigate to any dashboard route
3. A full-screen modal should appear with the explanatory text and a large numeric input
4. Pressing Escape or clicking outside should NOT close it
5. Enter a fondo amount (e.g., 500) and click "Abrir Caja y Empezar"
6. The modal disappears and the dashboard renders normally
7. If caja is already open, the modal never appears

### Task 3 — Hard caja guard on abono
1. Close the active caja (or test with a taller that has no open caja, bypassing the CajaGuard via direct API call)
2. Call `registrarAbono` — it should return `{ success: false, error: "No hay caja abierta..." }`
3. With caja open: abono should succeed and create a `movimientos_caja` entry with `caja_id` set

---

## Self-Review

### Spec Coverage

| Requirement | Status | Location |
|---|---|---|
| Folio 'A-' + repair_folio in historial | ✅ | Task 1 |
| Folio visible in historial de ventas | ✅ Historial reparacion rows show `A-{folio}` | Task 1 |
| Check caja abierta on dashboard load | ✅ `CajaGuard` calls `getCajaAbierta()` on mount | Task 2 |
| Non-closeable modal if no caja | ✅ `onInteractOutside/onEscapeKeyDown` preventDefault, no X button | Task 2 |
| Explanatory text in modal | ✅ "Para garantizar que el corte de caja sea exacto..." | Task 2 |
| Large numeric input for fondo | ✅ `h-14 text-2xl` input | Task 2 |
| "Abrir Caja y Empezar" button | ✅ | Task 2 |
| abono blocked when no caja | ✅ Returns error before updating anticipo | Task 3 |
| `caja_id` always set in movimiento | ✅ Uses `cajaId` from hard check, not re-queried | Task 3 |
| `confirmarEntregaConLiquidacion` already blocks | ✅ Already implemented at line 1783 — no change needed | — |
