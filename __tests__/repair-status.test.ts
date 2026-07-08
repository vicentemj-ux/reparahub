import { describe, it, expect } from "vitest"
import { getRepairStatusDisplayLabel } from "@/lib/repair-status"

describe("getRepairStatusDisplayLabel", () => {
  it("returns uppercase label for known statuses", () => {
    expect(getRepairStatusDisplayLabel("Recibido")).toBe("RECIBIDO")
    expect(getRepairStatusDisplayLabel("Diagnostico")).toBe("DIAGNÓSTICO")
    expect(getRepairStatusDisplayLabel("En Reparacion")).toBe("EN REPARACIÓN")
    expect(getRepairStatusDisplayLabel("Listo")).toBe("LISTO")
    expect(getRepairStatusDisplayLabel("Entregado")).toBe("ENTREGADO")
    expect(getRepairStatusDisplayLabel("Cancelado")).toBe("CANCELADO")
    expect(getRepairStatusDisplayLabel("Sin Reparacion")).toBe("SIN REPARACION")
    expect(getRepairStatusDisplayLabel("Reingreso")).toBe("REINGRESO")
  })

  it("handles trimmed input", () => {
    expect(getRepairStatusDisplayLabel("  Recibido  ")).toBe("RECIBIDO")
  })

  it("returns raw value for unknown status", () => {
    expect(getRepairStatusDisplayLabel("CustomStatus")).toBe("CustomStatus")
  })

  it("returns empty string for empty input", () => {
    expect(getRepairStatusDisplayLabel("")).toBe("")
  })

  it("does not crash on whitespace-only input", () => {
    expect(getRepairStatusDisplayLabel("   ")).toBe("")
  })
})
