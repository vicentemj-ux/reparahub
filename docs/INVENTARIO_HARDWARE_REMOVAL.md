# Inventario: Retiro temporal de la seccion HARDWARE

> Fecha: 2026-06-01
> Modulo: `app/dashboard/inventario` + `components/dashboard/inventario/NuevoProductoModal.tsx`
> Estado: **Eliminado de UI, pendiente re-implementacion**

## Resumen

La seccion **HARDWARE** del formulario `NuevoProductoModal` (campos `Procesador`, `Memoria RAM`, `Almacenamiento`, `Color / acabado`) se elimino de la UI en esta iteracion. Los datos en la base de datos (`producto.procesador`, `producto.ram`, `producto.almacenamiento`, `producto.color`) **NO se borran** y los handlers de estado (`setProcesador`, `setRam`, `setAlmacenamiento`, `setColor`) **siguen existiendo** en la pagina, pero ya no tienen controles visibles.

## Por que se elimino

1. **Reduccion de friccion en el alta rapida**: la mayoria de los productos del inventario de una reparadora NO son equipos. Mostrar 4 campos adicionales de hardware para cada producto (refacciones, accesorios, cables, etc.) generaba ruido visual y un formulario largo.
2. **Captura de caracteristicas en un solo lugar**: para EQUIPOS, las caracteristicas de hardware (almacenamiento, ram, color) ahora se capturan en el campo libre `Descripcion` con placeholder sugerido: *"Caracteristicas del equipo como almacenamiento, ram, color"*.
3. **Datos historicos preservados**: el esquema de Prisma (`Producto`) mantiene las columnas, asi que los productos creados antes de este cambio conservan su hardware. Si en el futuro se re-implementa la seccion, los datos seguiran disponibles sin necesidad de migracion.

## Cambios en UI

### `NuevoProductoModal.tsx`

**Eliminado** (lineas 363-389, antes de este cambio):

```tsx
<section>
  <h3>Hardware</h3>
  <Input label={labels.procesador} value={procesador} ... />
  <Input label={labels.ram} value={ram} ... />
  <Input label={labels.almacenamiento} value={almacenamiento} ... />
  <Input label={labels.color} value={color} ... />
</section>
```

**Mantenido**: la seccion **Identificador IMEI/Serie** (sigue siendo obligatoria para categoria `EQUIPOS`).

### `inventory-form-labels.ts`

Simplificacion de labels para categoria `EQUIPOS`:

| Antes | Ahora |
|-------|-------|
| `marca: "Marca del equipo"` | `marca: "Marca"` |
| `modelo: "Modelo o referencia"` | `modelo: "Modelo"` |

Las otras categorias (REFACCIONES, PANTALLAS, BATERIAS, default) **no se tocaron**.

### Placeholder condicional de `Descripcion`

```tsx
placeholder={esCategoriEquipos
  ? "Caracteristicas del equipo como almacenamiento, ram, color"
  : "Notas, compatibilidades, detalles de vitrina..."}
```

## Estado en base de datos

| Campo Prisma | Nullable | Sigue guardandose | Recomendacion |
|--------------|----------|-------------------|---------------|
| `procesador` | si | si (estado vive en `page.tsx`) | Dejar como esta |
| `ram` | si | si | Dejar como esta |
| `almacenamiento` | si | si | Dejar como esta |
| `color` | si | si | Dejar como esta |

**No ejecutar migracion de DROP COLUMN.** Los productos existentes con datos de hardware mantienen sus valores. El formulario, al guardar, re-escribe los valores en el payload (sea el mismo string o `null` si el handler del page.tsx decide limpiarlo). Ver `app/dashboard/inventario/page.tsx` linea ~362-383 (`buildFormCore`).

## Que SI existe en el formulario EQUIPOS

1. Identificacion (`Nombre`, `SKU`, `Codigo de barras`, `Categoria`, `Condicion`, `Descripcion`)
2. Clasificacion (`Marca`, `Modelo`)
3. Identificador IMEI/Serie (obligatorio, valida 15 digitos numericos o al menos 8 caracteres alfanumericos)
4. Foto, Precios y stock, Almacen (ubicacion)

## Re-implementacion futura (cuando aplique)

Cuando el equipo de producto pida restaurar HARDWARE como bloque estructurado:

1. Re-anadir el bloque `<section>Hardware</section>` en `NuevoProductoModal.tsx` con los 4 inputs originales.
2. Decidir si la captura de `Descripcion` sigue siendo libre o se vuelve un resumen auto-generado desde hardware.
3. Considerar mover `procesador`, `ram`, `almacenamiento`, `color` a una tabla relacionada `ProductoHardware` si se requiere filtrar/buscar por estas caracteristicas (actualmente son strings libres en `Producto`).
4. Evaluar si `Descripcion` debe auto-rellenarse con un template cuando se completan los campos de hardware (UX de "specs -> descripcion").
5. Si la seccion se restaura **solo para EQUIPOS**, NO aplicar a las otras categorias (refacciones usan `Especificacion 1/2/3` segun el helper actual).

## Archivos afectados

- `components/dashboard/inventario/NuevoProductoModal.tsx` — eliminacion del bloque HARDWARE
- `lib/inventory/inventory-form-labels.ts` — simplificacion de labels EQUIPOS
- `app/dashboard/inventario/page.tsx` — sin cambios funcionales, sigue pasando los props (compatibilidad)
