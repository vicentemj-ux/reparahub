"use client"

import { createRepair, updateRepairFull } from "@/lib/actions/repairs-prisma"
import { parseChecklistIngreso, type ChecklistIngreso } from "@/lib/reparaciones/checklist-ingreso"

export function parseChecklistFromForm(formData: FormData): ChecklistIngreso | undefined {
  const raw = (formData.get("checklist-ingreso") as string) || ""
  if (!raw.trim()) return undefined
  try {
    return parseChecklistIngreso(JSON.parse(raw)) ?? undefined
  } catch {
    return undefined
  }
}

async function readPhotoFilesAsBase64(formData: FormData): Promise<string[]> {
  const photosBase64: string[] = []
  let photoIndex = 0

  while (formData.has(`photo_${photoIndex}`)) {
    const photoFile = formData.get(`photo_${photoIndex}`) as File
    if (photoFile) {
      const base64 = await new Promise<string>((resolve) => {
        const reader = new FileReader()
        reader.onloadend = () => resolve(reader.result as string)
        reader.readAsDataURL(photoFile)
      })
      photosBase64.push(base64)
    }
    photoIndex++
  }

  return photosBase64
}

export async function submitRepairFormData(
  formData: FormData,
): Promise<{ repairId?: string; folio?: string } | void> {
  const clienteId = (formData.get("clienteId") as string) || ""
  const editRepairId = (formData.get("editingRepairId") as string) || ""

  const rawCustomerName = (formData.get("customer-name") as string) || ""
  const rawCustomerPhone = (formData.get("customer-phone") as string) || ""
  const clienteNombre =
    ((formData.get("clienteNombre") as string) || "").trim() || rawCustomerName.trim()
  const clienteTelefono =
    ((formData.get("clienteTelefono") as string) || "").trim() || rawCustomerPhone.trim()
  const tipo_equipo = formData.get("device-type") as string
  const brand = formData.get("brand") as string
  const model = formData.get("model") as string
  const imei = formData.get("imei") as string
  const color = (formData.get("color") as string) || ""
  const problemDesc = formData.get("problem-desc") as string
  const securityType = (formData.get("security-type") as string) || undefined
  const securityValue = (formData.get("security-value") as string) || undefined
  const technician = formData.get("technician") as string
  const estimatedPrice = formData.get("estimated-price") as string
  const fechaPromesaEntrega = (formData.get("fecha-promesa-entrega") as string) || ""
  const email = (formData.get("customer-email") as string) || ""
  const notasInternas = (formData.get("notas-internas") as string) || ""
  const serviciosRaw = (formData.get("servicios") as string) || ""
  const servicios: { servicio_id: string; cantidad?: number }[] = serviciosRaw
    ? JSON.parse(serviciosRaw)
    : []

  const photosBase64 = await readPhotoFilesAsBase64(formData)
  const checklistParsed = parseChecklistFromForm(formData)

  const rawChecklistPro = (formData.get("checklist-pro-json") as string) || ""
  let checklistProParsed: unknown = undefined
  if (rawChecklistPro.trim()) {
    try {
      checklistProParsed = JSON.parse(rawChecklistPro) as unknown
    } catch {
      // ignore malformed health-check JSON
    }
  }

  if (editRepairId) {
    const keptPhotos: string[] = JSON.parse((formData.get("existingPhotos") as string) || "[]")
    const removedPhotos: string[] = JSON.parse((formData.get("removedPhotos") as string) || "[]")

    const result = await updateRepairFull({
      repairId: editRepairId,
      customerName: clienteNombre,
      customerPhone: clienteTelefono,
      customerEmail: email,
      clienteId: clienteId || undefined,
      tipo_equipo: tipo_equipo || undefined,
      deviceBrand: brand,
      deviceModel: model,
      deviceSerial: imei || undefined,
      deviceColor: color || undefined,
      reportedFault: problemDesc,
      estimatedPrice: estimatedPrice || undefined,
      fechaPromesaEntrega: fechaPromesaEntrega || undefined,
      technician: technician && technician !== "Sin asignar" ? technician : undefined,
      securityType,
      securityValue,
      newPhotos: photosBase64,
      removedPhotos,
      keptPhotos,
      notasInternas: notasInternas || undefined,
      servicios,
      ...(checklistParsed !== undefined ? { checklistIngreso: checklistParsed } : {}),
    })

    if (!result.success) {
      throw new Error(result.error || "Error al guardar cambios")
    }

    return { repairId: editRepairId }
  }

  const result = await createRepair({
    customerName: clienteNombre,
    customerPhone: clienteTelefono,
    customerEmail: email,
    tipo_equipo,
    deviceBrand: brand,
    deviceModel: model,
    deviceSerial: imei,
    deviceColor: color || undefined,
    reportedFault: problemDesc,
    estimatedPrice,
    fechaPromesaEntrega: fechaPromesaEntrega || undefined,
    clienteId: clienteId || undefined,
    technician: technician && technician !== "Sin asignar" ? technician : undefined,
    securityType,
    securityValue,
    photos: photosBase64,
    servicios,
    notasInternas: notasInternas || undefined,
    checklistIngreso: checklistParsed ?? null,
    checklist_pro: checklistProParsed,
  })

  if (!result.success || !result.repairId || !result.folio) {
    throw new Error(
      result.error?.trim() ||
        "El servidor no devolvio folio ni id. Revisa la consola de Vercel, migraciones de Supabase y columnas de `reparaciones`.",
    )
  }

  return { repairId: result.repairId, folio: result.folio }
}
