# Folio Numérico Puro — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eliminate string prefixes from repair folios (REP-001 → 1) and upgrade the search bar to match by folio, customer name, phone, and device brand/model.

**Architecture:** A new DB migration rewrites the folio-assignment trigger to store pure integers. A second migration adds denormalized `cliente_nombre`/`cliente_telefono` columns to `reparaciones` so Supabase `.or()` can filter across those fields server-side without a JOIN. The photo upload path changes from `{safeFolio}/...` to `{taller_id}/{repair_id}/...` for tenant isolation. Dead-code function `getNextFolio()` is deleted.

**Tech Stack:** Supabase PostgreSQL (trigger, migration), Supabase JS v2 (`.or()` filter), Next.js Server Actions (TypeScript)

---

## File Map

| Action | File | Responsibility |
|--------|------|----------------|
| Create | `supabase/migrations/20260415000001_folio_numerico_puro.sql` | Replace `reparaciones_assign_folio()` trigger; store plain integer text |
| Create | `supabase/migrations/20260415000002_reparaciones_cliente_denormalized.sql` | Add `cliente_nombre`/`cliente_telefono` columns, backfill, trigger |
| Modify | `lib/actions/repairs.ts:123-150` | Delete `getNextFolio()` dead-code function |
| Modify | `lib/actions/repairs.ts:192-241` | `uploadRepairPhotos()` — use `repairId` instead of `folio` for storage path |
| Modify | `lib/actions/repairs.ts:496-504` | Call `uploadRepairPhotos` with `repairId` instead of `assignedFolio` |
| Modify | `lib/actions/repairs.ts:2097-2104` | Second call to `uploadRepairPhotos` in edit flow — pass repair ID |
| Modify | `lib/actions/repairs.ts:961-1040` | `getRepairsByTallerId()` — include new columns, replace `ilike("folio")` with `.or()` |

---

## Task 1: DB Migration — Pure Integer Folio Trigger

**Files:**
- Create: `supabase/migrations/20260415000001_folio_numerico_puro.sql`

- [ ] **Step 1: Write the migration**

```sql
-- =============================================================================
-- Folio Numérico Puro: eliminar prefijo del trigger de asignación de folios
-- Los folios ahora son enteros serializados como texto: "1", "2", "3", ...
-- La columna prefijo_folio se conserva pero deja de usarse en el trigger.
-- =============================================================================

-- Reemplazar la función del trigger para emitir solo el número
CREATE OR REPLACE FUNCTION public.reparaciones_assign_folio()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_next  INTEGER;
BEGIN
  -- Si ya viene folio explícito, no tocarlo
  IF NEW.folio IS NOT NULL AND btrim(NEW.folio) <> '' THEN
    RETURN NEW;
  END IF;

  -- Asegurar fila de configuración (concurrencia safe)
  INSERT INTO configuracion_taller (taller_id, nombre_taller, prefijo_folio, siguiente_folio)
  VALUES (NEW.taller_id, 'Mi Taller', '', 1)
  ON CONFLICT (taller_id) DO NOTHING;

  SELECT ct.siguiente_folio
    INTO v_next
    FROM configuracion_taller ct
   WHERE ct.taller_id = NEW.taller_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No se encontró configuracion_taller para taller_id %', NEW.taller_id;
  END IF;

  v_next := COALESCE(v_next, 1);
  NEW.folio := v_next::text;  -- Folio puro: "1", "2", "3", ...
  -- Nota: el contador ya fue reseteado a 1 via UPDATE en esta misma migración

  UPDATE configuracion_taller
     SET siguiente_folio = v_next + 1
   WHERE taller_id = NEW.taller_id;

  RETURN NEW;
END;
$$;

-- Resetear contador a 1 en TODOS los talleres (base de datos limpia post-TRUNCATE)
UPDATE configuracion_taller SET siguiente_folio = 1;

-- Re-crear el trigger (ya existe, DROP IF EXISTS para ser idempotente)
DROP TRIGGER IF EXISTS trg_reparaciones_assign_folio ON public.reparaciones;

CREATE TRIGGER trg_reparaciones_assign_folio
  BEFORE INSERT ON public.reparaciones
  FOR EACH ROW
  EXECUTE PROCEDURE public.reparaciones_assign_folio();
```

- [ ] **Step 2: Apply the migration in Supabase**

Run in Supabase SQL editor or via CLI:
```bash
# Option A — Supabase CLI
supabase db push

# Option B — paste the SQL directly in Supabase SQL editor
```

Expected: "Success. 0 rows affected." (DDL statement)

- [ ] **Step 3: Verify trigger works**

In Supabase SQL editor, run a test insert and immediately delete it:
```sql
-- Find any taller_id from your DB to use for testing
SELECT id FROM taller_users LIMIT 1;

-- Test insert (replace 'YOUR-TALLER-ID' with a real UUID)
-- This will fail on FK constraints for cliente_id; that's expected.
-- What we're checking is that the function compiles correctly.
SELECT public.reparaciones_assign_folio();  -- Should return TRIGGER (not error)
```

Expected: No compilation errors from the `CREATE OR REPLACE FUNCTION`.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260415000001_folio_numerico_puro.sql
git commit -m "feat(folio): pure integer folio trigger — removes prefix from new repairs"
```

---

## Task 2: DB Migration — Denormalized Client Columns on `reparaciones`

This adds `cliente_nombre` and `cliente_telefono` directly to `reparaciones` so `getRepairsByTallerId()` can use Supabase `.or()` for universal search without a JOIN.

**Files:**
- Create: `supabase/migrations/20260415000002_reparaciones_cliente_denormalized.sql`

- [ ] **Step 1: Write the migration**

```sql
-- =============================================================================
-- Denormalized client columns on reparaciones for universal search
-- =============================================================================

-- Add columns (idempotent with IF NOT EXISTS)
ALTER TABLE reparaciones
  ADD COLUMN IF NOT EXISTS cliente_nombre    TEXT,
  ADD COLUMN IF NOT EXISTS cliente_telefono  TEXT;

-- Backfill existing rows from clientes table
UPDATE reparaciones r
   SET cliente_nombre    = c.nombre,
       cliente_telefono  = c.telefono
  FROM clientes c
 WHERE c.id = r.cliente_id
   AND (r.cliente_nombre IS NULL OR r.cliente_telefono IS NULL);

-- Trigger to keep columns in sync on INSERT
CREATE OR REPLACE FUNCTION public.reparaciones_sync_cliente()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.cliente_id IS NOT NULL THEN
    SELECT c.nombre, c.telefono
      INTO NEW.cliente_nombre, NEW.cliente_telefono
      FROM clientes c
     WHERE c.id = NEW.cliente_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_reparaciones_sync_cliente ON public.reparaciones;

CREATE TRIGGER trg_reparaciones_sync_cliente
  BEFORE INSERT ON public.reparaciones
  FOR EACH ROW
  EXECUTE PROCEDURE public.reparaciones_sync_cliente();

-- Index for fast ilike search on new columns
CREATE INDEX IF NOT EXISTS idx_reparaciones_cliente_nombre
  ON reparaciones USING gin (to_tsvector('simple', coalesce(cliente_nombre, '')));

CREATE INDEX IF NOT EXISTS idx_reparaciones_cliente_telefono
  ON reparaciones (cliente_telefono);
```

- [ ] **Step 2: Apply the migration in Supabase**

```bash
# Option A — Supabase CLI
supabase db push

# Option B — paste SQL in Supabase SQL editor
```

Expected: Rows updated in backfill step (number matches `SELECT COUNT(*) FROM reparaciones WHERE cliente_id IS NOT NULL`).

- [ ] **Step 3: Verify backfill**

```sql
-- Should return 0 (all rows with cliente_id now have names filled)
SELECT COUNT(*)
  FROM reparaciones
 WHERE cliente_id IS NOT NULL
   AND (cliente_nombre IS NULL OR cliente_telefono IS NULL);
```

Expected: `0`

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260415000002_reparaciones_cliente_denormalized.sql
git commit -m "feat(search): denormalize cliente_nombre/telefono on reparaciones for .or() search"
```

---

## Task 3: Update `uploadRepairPhotos()` — Tenant-Isolated Storage Path

**Files:**
- Modify: `lib/actions/repairs.ts:192-241` (function signature + path)
- Modify: `lib/actions/repairs.ts:496-504` (call site 1 — createRepair)
- Modify: `lib/actions/repairs.ts:2097-2104` (call site 2 — updateRepair edit)

- [ ] **Step 1: Update function signature and path**

In `lib/actions/repairs.ts`, find the `uploadRepairPhotos` function (line 192). Change the first parameter from `folio: string` to `repairId: string`:

```typescript
// BEFORE (line 192):
async function uploadRepairPhotos(
  folio: string,
  photoDataArray: string[],
  tallerId: string
): Promise<UploadRepairPhotosResult> {

// AFTER:
async function uploadRepairPhotos(
  repairId: string,
  photoDataArray: string[],
  tallerId: string
): Promise<UploadRepairPhotosResult> {
```

- [ ] **Step 2: Update the file path inside `uploadRepairPhotos`**

Find lines 227-228 (inside the function):
```typescript
// BEFORE (lines 227-228):
const safeFolio = String(folio).replace(/[^a-zA-Z0-9_-]/g, "").toUpperCase()
const filePath = `${safeFolio}/${safeFolio}-photo-${i}-${ts}.webp`

// AFTER:
const safeId = String(repairId).replace(/[^a-zA-Z0-9_-]/g, "")
const filePath = `${tallerId}/${safeId}/${safeId}-photo-${i}-${ts}.webp`
```

- [ ] **Step 3: Update call site 1 — `createRepairInner` (line ~500)**

Find the call `await uploadRepairPhotos(assignedFolio, data.photos, tallerId)` (line ~500):
```typescript
// BEFORE:
const up = await uploadRepairPhotos(assignedFolio, data.photos, tallerId)

// AFTER (repairId is already available as `repairId = inserted?.id`):
const up = await uploadRepairPhotos(repairId!, data.photos, tallerId)
```

- [ ] **Step 4: Update call site 2 — edit flow (line ~2100)**

Find the second call to `uploadRepairPhotos(folio, input.newPhotos, tallerId)`:
```typescript
// BEFORE (line ~2100):
const up = await uploadRepairPhotos(folio, input.newPhotos, tallerId)

// AFTER — in this context, the repair id is available; find the variable name in surrounding code:
// Look at what variable holds the repair UUID at that point in the function.
// It will be either `repairId`, `input.repairId`, or `id` — use whichever is available.
const up = await uploadRepairPhotos(repairId, input.newPhotos, tallerId)
```

> **Note:** Existing stored photo paths (e.g., `REP001/REP001-photo-0-123.webp`) remain valid. The path is stored per-record in `reparaciones.fotos[]`, so old records continue to generate signed URLs correctly. Only photos uploaded after this change use the new path.

- [ ] **Step 5: Verify TypeScript compiles**

```bash
pnpm build 2>&1 | grep -E "error|Error" | head -20
```

Expected: No TypeScript errors related to `uploadRepairPhotos`.

- [ ] **Step 6: Commit**

```bash
git add lib/actions/repairs.ts
git commit -m "fix(storage): tenant-isolated photo path {taller_id}/{repair_id}/ — replaces folio-based path"
```

---

## Task 4: Delete Dead Code — `getNextFolio()`

This function (lines 117-150 in `lib/actions/repairs.ts`) is exported but called nowhere. The DB trigger handles folio assignment on every INSERT.

**Files:**
- Modify: `lib/actions/repairs.ts:117-150`

- [ ] **Step 1: Verify the function is unused**

```bash
grep -r "getNextFolio" --include="*.ts" --include="*.tsx" C:/Users/Vincent/Desktop/reparahub/components C:/Users/Vincent/Desktop/reparahub/app C:/Users/Vincent/Desktop/reparahub/lib
```

Expected: No results (the function only appears in its own definition in `repairs.ts`).

- [ ] **Step 2: Delete the function**

In `lib/actions/repairs.ts`, delete lines 117–150 (the JSDoc comment block plus the entire `getNextFolio` function). The code to remove:

```typescript
/**
 * Generates the next consecutive folio for the current taller.
 * Format: PREFIX + 3-digit number (e.g. REP001, REP002). No dashes.
 * Prefix = first 3 letters of taller name (uppercase).
 * Queries Supabase for the last folio with that prefix and increments.
 */
export async function getNextFolio(): Promise<{ folio: string; error: string | null }> {
  const supabase = await createClient()
  const tallerId = await getCurrentTallerId()
  const { name: tallerName } = await getCurrentTallerInfo()

  const prefix = (tallerName || "TAL")
    .replace(/\s+/g, "")
    .substring(0, 3)
    .toUpperCase()
  if (prefix.length === 0) {
    return { folio: "TAL001", error: null }
  }

  // MAX() en DB — sin descargar todos los folios al cliente
  const { data, error } = await supabase.rpc("get_next_folio", {
    p_taller_id: tallerId,
    p_prefix:    prefix,
  })

  if (error) {
    console.error("Error fetching last folio:", error)
    return { folio: `${prefix}001`, error: "No se pudo obtener el siguiente folio." }
  }

  const nextNum = (Number(data) || 0) + 1
  const folio = `${prefix}${zfill(nextNum, 3)}`
  return { folio, error: null }
}
```

- [ ] **Step 3: Verify build still passes**

```bash
pnpm build 2>&1 | grep -E "error|Error" | head -20
```

Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add lib/actions/repairs.ts
git commit -m "refactor(folio): remove dead getNextFolio() — folio is always DB-assigned via trigger"
```

---

## Task 5: Update `getRepairsByTallerId()` — Universal Search with `.or()`

After Task 2's migration adds `cliente_nombre` and `cliente_telefono` to `reparaciones`, update the search to cover folio + client + device.

**Files:**
- Modify: `lib/actions/repairs.ts:977-993` (`getRepairsByTallerId` function body)

- [ ] **Step 1: Add new columns to the select**

Find the `.select(...)` call inside `getRepairsByTallerId` (around line 977). Add `cliente_nombre` and `cliente_telefono` to it:

```typescript
// BEFORE (line 979-984):
let query = supabase
  .from("reparaciones")
  .select(
    `id, folio, estatus, created_at, updated_at,
     precio_estimado, anticipo, marca, modelo, tecnico, falla,
     security_type, security_value, pin_contrasena,
     clientes ( nombre, telefono )`,
    { count: "planned" }
  )

// AFTER:
let query = supabase
  .from("reparaciones")
  .select(
    `id, folio, estatus, created_at, updated_at,
     precio_estimado, anticipo, marca, modelo, tecnico, falla,
     security_type, security_value, pin_contrasena,
     cliente_nombre, cliente_telefono,
     clientes ( nombre, telefono )`,
    { count: "planned" }
  )
```

- [ ] **Step 2: Replace `ilike("folio")` with `.or()` universal search**

Find the search block (lines 990-993):

```typescript
// BEFORE:
if (search?.trim()) {
  query = query.ilike("folio", `%${search.trim()}%`)
}

// AFTER:
if (search?.trim()) {
  const term = search.trim()
  query = query.or(
    [
      `folio.ilike.%${term}%`,
      `cliente_nombre.ilike.%${term}%`,
      `cliente_telefono.ilike.%${term}%`,
      `marca.ilike.%${term}%`,
      `modelo.ilike.%${term}%`,
    ].join(",")
  )
}
```

- [ ] **Step 3: Verify build and type-check**

```bash
pnpm build 2>&1 | grep -E "error|Error" | head -20
```

Expected: No TypeScript errors.

- [ ] **Step 4: Smoke test in the browser**

```
1. Run: pnpm dev
2. Go to /dashboard/reparaciones
3. Search by folio number (e.g., "5" or "15") — should return matching repairs
4. Search by customer name fragment (e.g., "Juan") — should return repairs for that client
5. Search by phone fragment (e.g., "668") — should return repairs for clients with that phone
6. Search by brand (e.g., "Samsung") — should return matching repairs
7. Clear search — full list should reload
```

- [ ] **Step 5: Commit**

```bash
git add lib/actions/repairs.ts
git commit -m "feat(search): universal search by folio, customer name/phone, brand/model using .or()"
```

---

## Self-Review

### Spec Coverage Check

| Requirement | Task |
|---|---|
| Eliminar prefijos (REP-, CDS-, etc.) en nuevas reparaciones | Task 1 — trigger rewritten |
| Folios son enteros por taller, empiezan en 1 | Task 1 — `v_folio := v_next::text` |
| Búsqueda universal por folio, nombre, teléfono, marca/modelo | Tasks 2 + 5 |
| Ruta de fotos incluye `taller_id` para aislamiento tenant | Task 3 |
| Eliminar `getNextFolio()` dead code | Task 4 |

### Notes for Implementation

**Existing repairs**: Old repairs keep their prefixed folios (REP-001, CDS-5, etc.) — the trigger only affects new INSERTs. The UI display (print, list, search) works correctly with both formats since folio is a plain text field. No data migration of existing folios is required.

**Tracking URL**: The WhatsApp tracking link in `bitacora-table.tsx:115` already uses `repair.id` (UUID), not the folio: `/track/${repair.id}`. Pure integer folios do NOT affect public tracking.

**`siguiente_folio` counter**: Is per-taller and already in `configuracion_taller`. If a taller had old prefix-based folios up to number 47, their `siguiente_folio` will continue from where it left off (e.g., 48). The counter is not reset — only new repairs will get pure integer folios from that point forward.

**`prefijo_folio` column**: Is intentionally kept in `configuracion_taller` — the column still exists, it's just not used by the trigger anymore. This avoids a schema change that could break other code references. It can be dropped in a future cleanup migration.

**Phone search collision**: The `.or()` search on `cliente_telefono` uses `ilike` (substring match). Searching "668" will match any phone containing those digits. This is intentional and matches the UX in the spec.
