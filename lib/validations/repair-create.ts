import { z } from "zod"

/**
 * Mensaje explicito por campo (Zod issue) para depuracion en servidor y UI.
 * Ej.: Error: 'checklistIngreso' - ...
 */
export function formatCreateRepairValidationError(err: z.ZodError): string {
  return err.issues
    .map((issue) => {
      const field = issue.path.length ? issue.path.map(String).join(".") : "entrada"
      return `Error: '${field}' - ${issue.message}`
    })
    .join(" | ")
}

const optionalStr = z.union([z.string(), z.undefined(), z.null()]).transform((v) => {
  if (v == null) return undefined
  const s = String(v).trim()
  return s === "" ? undefined : s
})

/** Cadena permitida vacia (p. ej. modelo o falla aun no detallada). */
const optionalStrOrEmpty = z
  .union([z.string(), z.undefined(), z.null()])
  .optional()
  .transform((v) => (v == null ? "" : String(v)))

const optionalNumLike = z.union([z.string(), z.number(), z.undefined(), z.null()]).transform((v) => {
  if (v == null || v === "") return undefined
  return String(v)
})

/**
 * Alineado con `CreateRepairInput` y el modal de 3 columnas.
 * checklist_pro / firma_cliente: solo compatibilidad; se eliminan antes de persistir.
 * fotos, notas_internas (notasInternas), checklist (checklistIngreso): opcionales.
 */
export const createRepairInputSchema = z
  .object({
    folio: z.union([z.string(), z.null(), z.undefined()]).optional(),
    customerName: z.preprocess(
      (v) => (typeof v === "string" ? v.trim() : v),
      z.string().min(1, "es requerido pero llego vacio"),
    ),
    customerPhone: z.preprocess(
      (v) => (typeof v === "string" ? v.trim() : v),
      z.string().min(1, "es requerido pero llego vacio"),
    ),
    customerEmail: optionalStr,
    tipo_equipo: optionalStr,
    deviceBrand: z.preprocess(
      (v) => (typeof v === "string" ? v.trim() : v),
      z.string().min(1, "es requerido pero llego vacio"),
    ),
    deviceModel: optionalStrOrEmpty,
    deviceSerial: optionalStr,
    reportedFault: optionalStrOrEmpty,
    estimatedPrice: optionalNumLike,
    deposit: optionalNumLike,
    clienteId: optionalStr,
    technician: optionalStr,
    pinContrasena: optionalStr,
    patronDesbloqueo: optionalStr,
    securityType: optionalStr,
    securityValue: optionalStr,
    notasInternas: z.union([z.string(), z.undefined(), z.null()]).optional(),
    checklistIngreso: z.any().optional().nullable(),
  photos: z.array(z.string()).optional(),
  checklist_pro: z.any().optional().nullable(),
  firma_cliente: z.union([z.string(), z.undefined(), z.null()]).optional(),
  metodoPagoAnticipo: z.union([z.string(), z.undefined(), z.null()]).optional(),
  servicios: z.array(
    z.object({
      servicio_id: z.string().uuid(),
      cantidad: z.number().int().min(1).default(1),
    })
  ).optional().default([]),
})
  .transform(({ checklist_pro, firma_cliente: _firmaCliente, ...rest }) => ({
    ...rest,
    checklist_pro: checklist_pro ?? null,
  }))
