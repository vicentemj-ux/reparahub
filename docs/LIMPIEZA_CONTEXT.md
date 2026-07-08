# Limpieza de Código — Notas de Contexto Pendiente

> Fecha: 2026-05-01
> Estado: Fase 1 en progreso. Las siguientes decisiones quedan pendientes por falta de confirmación del equipo.

---

## Dudas sin resolver (NO se actuó sobre estas)

### 1. `proxy.ts` en raíz — ¿código muerto o middleware activo?
- **Contexto:** El agente de auditoría lo marcó como huérfano, pero `proxy.ts` contiene toda la lógica de autenticación del middleware (`checkSubscription`, `hasTallerProfile`, etc.).
- **Riesgo:** Si se elimina, se rompe la autenticación del dashboard.
- **Decisión:** **NO TOCAR** hasta confirmar si es importado dinámicamente o si es un middleware legacy.

### 2. Funciones de importación masiva (`processStagingToFinal`, `clearProcessedStaging`)
- **Contexto:** En `lib/actions/import.ts`. El agente confirmó que no se importan desde ningún archivo.
- **Duda:** ¿Son parte de una feature de importación Excel en desarrollo o desactivada?
- **Decisión:** **NO ELIMINAR** hasta confirmar si la feature de importación masiva está activa.

### 3. `getRepairForTracking` en `lib/actions/repairs.ts`
- **Contexto:** Función pública de tracking no importada. `app/track/[id]/page.tsx` usa `getTrackingPhotoUrls` y `getTrackingTallerInfo`.
- **Duda:** ¿Es un fallback para otra ruta de tracking?
- **Decisión:** **NO ELIMINAR** hasta confirmar si hay alguna ruta oculta que la use.

### 4. Consolidación de Server Actions duplicadas
- **Contexto:** `getRepairs` vs `getRepairsByTallerId`, `getRepairDetail` vs `getRepairDetailPageData`, `updateRepair` vs `updateRepairFull` vs `updateRepairWithTechnician`.
- **Duda:** Reescribir callers puede introducir bugs sutiles.
- **Decisión:** **NO CONSOLIDAR** en esta fase. Reservado para refactor separado con testing manual.

### 5. `updateRepair` en `lib/actions/repairs.ts`
- **Contexto:** Función simple de actualización. El agente dice que no se importa, pero `updateRepairFull` y `actualizarPresupuestoReparacion` cubren los casos.
- **Duda:** ¿Algún componente la importa dinámicamente o via string?
- **Decisión:** **NO ELIMINAR** hasta confirmar.

---

## Lo que SÍ se eliminó en Fase 1 (confirmado 100% muerto)

- [x] 4 dependencias sin usar de `package.json`
- [x] 8 componentes/hooks confirmados sin uso
- [x] Página `app/seguimiento/page.tsx` (obsoleta, redirige a `/track`)
- [x] 3 directorios vacíos
- [x] Script `find-dead.js` huérfano
- [x] Imports sin uso detectados por linter

## Métricas Pre-Limpieza

| Métrica | Valor |
|---|---|
| Archivos de código fuente | 295 |
| Líneas de código aprox. | 55,352 |
| Dependencias sin usar | 4 |
| Componentes/páginas sin usar | 12 archivos (~941 líneas) |
| Funciones exportadas sin usar | 5 (~209 líneas) |

## Métricas Post-Limpieza (Fase 1 — 2026-05-01)

| Métrica | Valor Pre | Valor Post | Delta |
|---|---|---|---|
| Archivos de código fuente | 295 | 285 | **-10** |
| Líneas de código aprox. | ~55,352 | 54,298 | **-1,054** |
| Dependencias instaladas | ~41 | 37 | **-4** |
| Páginas generadas | 51 | 50 | **-1** |
| Build time | ~5.1s | 4.6s | **-0.5s** |
| Build status | ✅ | ✅ | Sin cambios |

### Archivos eliminados en Fase 1
- `app/seguimiento/page.tsx` (~62 líneas)
- `components/register-modal.tsx` (~207 líneas)
- `components/dashboard/repair-success-whatsapp-button.tsx` (~40 líneas)
- `components/dashboard/pro-locked-feature-block.tsx` (~65 líneas)
- `components/dashboard/ventas/CorteCajaSummary.tsx` (~238 líneas)
- `components/dashboard/ventas/CorteModal.tsx` (~247 líneas)
- `components/ui/scroll-area.tsx` (~53 líneas)
- `components/ui/tabs.tsx` (~59 líneas)
- `hooks/use-mobile.ts` (~19 líneas)
- `find-dead.js` (~40 líneas)
- 3 directorios vacíos (`app/track/[ticketId]/`, `lib/equipo/`, `components/modals/`)

### Dependencias eliminadas
- `@hookform/resolvers`
- `date-fns`
- `next-themes`
- `react-resizable-panels`

---

## Métricas Post-Limpieza (Fase 2 — 2026-05-01)

| Métrica | Valor Pre | Valor Post | Delta |
|---|---|---|---|
| Archivos de código fuente | 285 | 285 | **0** |
| Líneas de código aprox. | 54,298 | ~54,280 | **-~18** |
| Funciones deshabilitadas | 1 | 0 | **-1** |
| Build time | 4.6s | 4.8s | **+0.2s** (variación normal) |
| Build status | ✅ | ✅ | Sin cambios |

### Cambios en Fase 2
- Eliminada `getRepairByPhone` en `lib/actions/repairs.ts` (~15 líneas) — función deshabilitada que retornaba error fijo.
- **Server Actions duplicadas evaluadas pero NO consolidadas** (ver decisión documentada arriba).

---

## Métricas Post-Limpieza (Fase 3 — 2026-05-01)

| Métrica | Valor Pre | Valor Post | Delta |
|---|---|---|---|
| Archivos editados | — | 31 | **31** |
| Imports sin uso eliminados | — | 85 | **-85** |
| Console.log debug eliminados | — | 22 | **-22** |
| Líneas neto eliminadas | — | ~121 | **-121** |
| Build time | 4.8s | 4.6s | **-0.2s** |
| Build status | ✅ | ✅ | Sin cambios |

### Cambios en Fase 3
- **31 archivos core limpiados** (lib/actions/, app/, components/)
- **85 imports sin uso eliminados** — reduce ruido del bundle y mejora legibilidad
- **22 console.log de debug eliminados** — elimina ruido en consola del cliente/servidor
- Archivos principales afectados: `repairs.ts`, `ventas.ts`, `admin-otp.ts`, `settings.ts`, `generate-poster/route.ts`, `nueva-reparacion-form.tsx`, `configuracion/page.tsx`, `ventas/page.tsx`, `inventario/page.tsx`

---

## Métricas Post-Limpieza (Fase 4 — 2026-05-01)

| Métrica | Valor Pre | Valor Post | Delta |
|---|---|---|---|
| Archivos en raíz (.md) | 11 | 6 | **-5** |
| Docs organizados | 0 | 5 | **+5 en docs/auditoria/** |
| Build time | 4.6s | 4.8s | **+0.2s** (variación normal) |
| Build status | ✅ | ✅ | Sin cambios |

### Cambios en Fase 4
- **5 archivos de auditoría movidos** de raíz a `docs/auditoria/`:
  - `auditoria.md` (~25KB)
  - `AUDITORIA_MVP.md` (~21KB)
  - `guia_auditoria_seguridad.md` (~15KB)
  - `plan_auditoria_seguridad.md` (~5KB)
  - `reporte_auditoria_seguridad.md` (~24KB)
- Raíz del repo limpiada — solo quedan docs de contexto activos (AGENTS.md, CLAUDE.md, etc.)

---

## Métricas Post-Limpieza (Fase 5 — 2026-05-01)

| Métrica | Valor Pre | Valor Post | Delta |
|---|---|---|---|
| Archivos basura eliminados | 2 | 0 | **-2** |
| Tamaño de basura eliminada | ~10,090 KB | 0 | **-~10MB** |
| Docs de contexto movidos | 4 en raíz | 4 en docs/ | **+organización** |
| Archivos en raíz (.md/.txt) | 11 | 4 | **-7** |
| Build time | 4.8s | 4.9s | **+0.1s** (variación normal) |
| Build status | ✅ | ✅ | Sin cambios |

### Cambios en Fase 5
- **Eliminado `estructura.txt`** (~10MB) — dump generado, no código
- **Eliminado `commented-blocks.txt`** — archivo vacío
- **Movidos 4 docs de contexto** de raíz a `docs/`:
  - `SKILL.md` (~8KB)
  - `PROJECT_CONTEXT.md` (~12KB)
  - `REPARAHUB_CORE_RULES.md` (~2KB)
  - `LIMPIEZA_CONTEXT.md` (~7KB)
- Raíz del repo ahora solo tiene: `AGENTS.md`, `CLAUDE.md`, `package.json`, `next.config.mjs`, `pnpm-lock.yaml`, `tsconfig.json`, `postcss.config.mjs`, `.env.local` (gitignored), `.gitignore`

---

## Resumen Total de Limpieza (Fases 1-5) ✅ COMPLETADA

| Métrica | Valor Original | Valor Final | **Delta Total** |
|---|---|---|---|
| Archivos de código fuente | 295 | 285 | **-10** |
| Líneas de código aprox. | ~55,352 | ~54,159 | **-~1,193** |
| Dependencias instaladas | ~41 | 37 | **-4** |
| Páginas generadas | 51 | 50 | **-1** |
| Imports sin uso eliminados | — | 85 | **-85** |
| Console.log debug eliminados | — | 22 | **-22** |
| Archivos basura eliminados | 2 | 0 | **-2 (~10MB)** |
| Docs organizados | 9 en raíz | 9 en docs/ | **+estructura** |
| Build time | ~5.1s | 4.9s | **-0.2s** |
| Build status | ✅ | ✅ | **Sin errores** |

### Estado final del repositorio
- **Raíz limpia:** Solo archivos de configuración y docs de contexto activos (AGENTS.md, CLAUDE.md)
- **docs/auditoria/:** 5 docs de auditoría de seguridad
- **docs/:** 4 docs de contexto del proyecto
- **Código limpio:** 0 imports sin uso en archivos core, 0 console.log de debug
- **Build sano:** Pasa sin errores de TypeScript
