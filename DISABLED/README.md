# DISABLED

Carpeta de cuarentena para componentes, módulos y parches que han sido **retirados del proyecto activo** y se conservan exclusivamente como referencia histórica.

Nada dentro de esta carpeta es parte del build, del lint, del type-check ni de ninguna ruta accesible al usuario. Es un "cementerio" consultable: si necesitas reintroducir algo, lee primero el contexto aquí y luego decide.

## Contexto del retiro

La auditoría 2026-06 (post-migración a VPS / plan 002) encontró tres categorías de código muerto o foráneo que se movieron aquí:

1. **Inyección local del fork Tauri desktop** — parches que el binario `reparahub-desktop` (fork privado para CDSE / Reparatech / Electrónica Morelos) deposita en disco dentro de este repo SaaS. Nunca se commitean. El SaaS no debe ejecutar lógica Tauri: su contrato es stubs `() => false` y la ruta web (`react-to-print`).
2. **Rutas y funciones de impresión sin callers** — quedaron tras refactors previos y ya no se invocan desde el código activo.
3. **Dependencia `html-to-image` huérfana** — solo la consumían los parches Tauri. Eliminada de `package.json`; los comentarios que la mencionan se conservaron.

Lo que vive aquí se divide en tres tipos:

| Sufijo | Significado |
| --- | --- |
| `*.txt` | Fragmento extraído de un archivo del repo, guardado verbatim para preservar el bloque exacto que se removió. |
| `*.ts` / `*.tsx` / `*.js` | Archivo completo retirado tal cual. |
| `README.md` (este archivo) | Índice de todo lo retirado y la razón. |

## Inventario

### 1. Parches Tauri (inyección `reparahub-desktop` → SaaS)

Estos parches reemplazaban los stubs SaaS con implementaciones reales que dependían de `window.__TAURI__` y `html-to-image`. La inyección venía mal posicionada dentro de bloques `import { ... }` y rompía `pnpm build` / `tsc --noEmit`. **Ya fueron removidos** de los archivos activos y los stubs SaaS `() => false` restaurados.

| Archivo retirado | Archivo activo restaurado | Razón |
| --- | --- | --- |
| `tauri-patches/print-ticket-page.patch.txt` | `app/print-ticket/[id]/page.tsx` | Parche Tauri dentro de un bloque `import { ... }` → `tsc:14` syntax error. Stub SaaS restaurado. |
| `tauri-patches/nueva-reparacion-form.patch.txt` | `components/dashboard/nueva-reparacion-form.tsx` | Misma sintaxis rota. Stub SaaS restaurado. El `<div ref={hiddenTicketRef}>` con el ticket raster se eliminó (solo lo consumía el branch Tauri). |
| `tauri-patches/ventas-success-modal.patch.txt` | `components/dashboard/ventas/SuccessModal.tsx` | Parche completo entre imports (sintaxis válida) pero 4 símbolos sin callers. Stubs SaaS restaurados. |

**Contrato de stubs (SaaS, no Tauri):**

```ts
const isTauriAvailable = async () => false
const isTauriDesktop = isTauriAvailable
const domToPngBase64 = async () => ""
const printEscposImage = async () => {}
```

El fork Tauri standalone los reemplaza por la implementación real en su build de escritorio. En el SaaS, `isTauriDesktop()` siempre devuelve `false` → el camino de producción es `react-to-print` iframe. Ver `AGENTS.md → "Tauri desktop fork (not in this repo)"`.

**Lo que NO se movió (intencional):** el branch `tauriPrint` en `lib/printing/repair-print-service.ts` se conserva como contrato del orquestador `printWithProvider({ web, daemon, tauriPrint })`. La rama Tauri nunca se ejecuta en el SaaS, pero removerla rompería el contrato de integración cuando el fork desktop se conecte.

### 2. Rutas y módulos de impresión huérfanos

| Archivo retirado | Reemplazo activo | Razón |
| --- | --- | --- |
| `app/print-abono/[id]/page.tsx` | `useThermalTicketPrint` (in-modal) en `components/dashboard/abono-modal.tsx` | Ruta `/print-abono/[id]` sin callers. La impresión de abonos ocurre dentro del modal vía `react-to-print`. |
| `lib/print.ts` | (sin reemplazo, ver `lib/print/print-config.ts`) | `paperSizeToPx` y `PaperSize` nunca se importaron. Documentos que referencian `imprimirTicket()` (`AGENTS.md`, `CLAUDE.md`, `docs/PROJECT_CONTEXT.md`, `docs/REPARAHUB_CORE_RULES.md`) tienen drift previo. |
| `lib/print/print-config-stubs.ts` | `app/print-label/page.tsx` define su propio CSS inline | `useThermalLabelPrint` y `THERMAL_LABEL_PAGE_STYLE` sin callers. La página de etiqueta usa estilos inline. |
| `lib/actions/print-formatter-prisma-getAbonoPrintData.ts` | `useThermalTicketPrint` en `abono-modal.tsx` | `getAbonoPrintData` solo servía a la ruta `/print-abono/[id]` retirada. |
| `components/dashboard/ventas/SuccessModal-hidden-div.txt` | — | `<div ref={hiddenRef}>` con el ticket raster, sin consumidores tras restaurar stubs. |
| `components/dashboard/nueva-reparacion-form-hidden-div.txt` | — | `<div ref={hiddenTicketRef}>` con el ticket raster, sin consumidores tras restaurar stubs. |

### 3. Scripts y dependencias

| Archivo / dep | Razón |
| --- | --- |
| `scripts/prepare-tauri-server.js` | Construye `src-tauri/server/` del fork desktop legacy. Ningún script de `package.json` lo invoca. El fork desktop se archivó (ver `docs/PRO_MODULES_ARCHIVE.md`). |
| `html-to-image` (dep eliminada de `package.json`) | Solo la consumían los 3 parches Tauri retirados. Los comentarios que la mencionan en `components/printing/tickets/CartelExhibicion.tsx:27` y `lib/print/poster-exhibicion-utils.ts:177` se conservan (documentan intención, no uso real). |

## Lo que vive en `components/printing/`

Por claridad: **no todo** lo que está bajo `components/printing/` está retirado. Los templates visuales (`tickets/RepairIntakeTicket.tsx`, `tickets/RepairDeliveryTicket.tsx`, `tickets/PosSaleTicket.tsx`, `tickets/CashRegisterCutTicket.tsx`, `tickets/RepairPaymentTicket.tsx`, las etiquetas 50.8×25.4mm, etc.) **siguen activos** y se usan en modales y rutas de impresión en vivo. Esta carpeta `DISABLED/` no los toca.

## Cómo reintroducir algo de aquí

1. Identifica el archivo o fragmento específico en este `DISABLED/`.
2. Lee la sección "Razón" arriba para entender por qué se retiró.
3. Verifica que el motivo original (por ejemplo, "ruta sin callers") ya no aplique.
4. Mueve el archivo de vuelta a su ruta original. Si era un fragmento `.txt`, intégralo manualmente en el archivo activo respetando el contrato de stubs del SaaS.
5. Si reintroduces un parche Tauri, **no** lo commitees: el fork desktop lo reinyectará en disco. Solo el stub SaaS debe estar en el árbol.

## Auditoría original

Análisis completo de junio 2026 (post plan 002, baseline `80c9a3a`) disponible en `plans/runtime-inventory.md` y en el log de la sesión de OpenCode que ejecutó este retiro.
