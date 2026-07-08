# Legacy Files Cleanup — Current State

> 9 archivos legacy eliminados (~5637 líneas). Quedan pendientes `clients.ts` y `settings.ts` (aún con imports activos).

## ✅ ELIMINADOS (9 archivos, ~5637 líneas)

| Archivo | Líneas | Reemplazo |
|---------|--------|-----------|
| `lib/actions/repairs.ts` | 2906 | `repairs-prisma.ts` |
| `lib/actions/gastos.ts` | 327 | `gastos-prisma.ts` |
| `lib/actions/servicios.ts` | 238 | `servicios-prisma.ts` |
| `lib/actions/utilidad.ts` | 172 | `utilidad-prisma.ts` |
| `lib/actions/reportes.ts` | 311 | `reportes-prisma.ts` |
| `lib/actions/bitacora-visitas.ts` | 231 | `bitacora-visitas-prisma.ts` |
| `lib/actions/chat.ts` | 157 | `chat-prisma.ts` |
| `lib/actions/compras.ts` | 705 | `compras-prisma.ts` |
| `lib/actions/compras-usado.ts` | 142 | `compras-usado-prisma.ts` |

## 🟡 CONSERVADOS (con imports activos)

| Archivo | Líneas | Por qué no se borra |
|---------|--------|---------------------|
| `lib/actions/clients.ts` | 195 | Importado por `cotizacion-form.tsx` |
| `lib/actions/settings.ts` | 323 | Importado por `cotizaciones.ts` |

Para borrarlos: actualizar imports en esos archivos para que usen `clients-prisma.ts` y `settings-prisma.ts`.

## 📋 RAW SQL RESTANTE EN lib/actions/

| Archivo | Calls | Notas |
|---------|-------|-------|
| `productos-prisma.ts` | 1 | Migración pendiente |
| `historial-ventas.ts` | 4 | Migración pendiente |
| `admin-otp.ts` | 9 | Migración pendiente |

## 🔴 SUPABASE CLIENT EN ARCHIVOS ACTIVOS

`solo cotizaciones.ts`, `firma-digital.ts`, `flujo-pro.ts`, `roles.ts`, `import.ts`, `garantia/*`, etc.

## 📦 SUABASE CLIENT DEFINITIONS (lib/supabase/)

Se eliminarán solo cuando ningún archivo activo los importe.

## RESUMEN

- **9/11** archivos legacy PRO/Core eliminados ✅
- **2** pendientes (clients, settings) — requieren actualizar imports de cotizaciones
- **~7900 → ~2263** líneas legacy restantes (support files + supabase clients)
