import { beforeEach, describe, expect, it, vi } from "vitest"

const { mockCreateRepair, mockUpdateRepairFull } = vi.hoisted(() => ({
  mockCreateRepair: vi.fn(),
  mockUpdateRepairFull: vi.fn(),
}))

vi.mock("@/lib/actions/repairs-prisma", () => ({
  createRepair: mockCreateRepair,
  updateRepairFull: mockUpdateRepairFull,
}))

import { submitRepairFormData } from "@/lib/reparaciones/repair-form-submit"

function baseFormData(): FormData {
  const formData = new FormData()
  formData.set("clienteId", "cliente-1")
  formData.set("customer-name", "Ana")
  formData.set("customer-phone", "5551234567")
  formData.set("device-type", "Celular")
  formData.set("brand", "Samsung")
  formData.set("model", "A54")
  formData.set("imei", "123456789012345")
  formData.set("color", "Azul")
  formData.set("problem-desc", "No enciende")
  formData.set("security-type", "none")
  formData.set("security-value", "")
  formData.set("technician", "Sin asignar")
  formData.set("estimated-price", "500")
  formData.set("customer-email", "ana@example.com")
  formData.set("notas-internas", "")
  formData.set("servicios", "[]")
  return formData
}

beforeEach(() => {
  mockCreateRepair.mockReset()
  mockUpdateRepairFull.mockReset()
})

describe("submitRepairFormData", () => {
  it("passes color when creating a repair", async () => {
    mockCreateRepair.mockResolvedValue({
      success: true,
      repairId: "repair-1",
      folio: "001",
    })

    await submitRepairFormData(baseFormData())

    expect(mockCreateRepair).toHaveBeenCalledTimes(1)
    expect(mockCreateRepair.mock.calls[0][0]).toMatchObject({
      deviceColor: "Azul",
    })
  })

  it("passes color when updating a repair", async () => {
    mockUpdateRepairFull.mockResolvedValue({ success: true })

    const formData = baseFormData()
    formData.set("editingRepairId", "repair-1")
    formData.set("existingPhotos", JSON.stringify(["https://cdn.example.com/foto-1.webp"]))
    formData.set("removedPhotos", JSON.stringify(["https://cdn.example.com/foto-2.webp"]))

    await submitRepairFormData(formData)

    expect(mockUpdateRepairFull).toHaveBeenCalledTimes(1)
    expect(mockUpdateRepairFull.mock.calls[0][0]).toMatchObject({
      deviceColor: "Azul",
      keptPhotos: ["https://cdn.example.com/foto-1.webp"],
      removedPhotos: ["https://cdn.example.com/foto-2.webp"],
      newPhotos: [],
    })
  })
})
