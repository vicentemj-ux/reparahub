import { describe, it, expect } from "vitest"
import { calcDiasRestantes, MS_PER_DAY } from "@/lib/utils/subscription"

describe("MS_PER_DAY", () => {
  it("equals 86400000", () => {
    expect(MS_PER_DAY).toBe(86400000)
  })
})

describe("calcDiasRestantes", () => {
  it("returns null for null/undefined input", () => {
    expect(calcDiasRestantes(null)).toBeNull()
    expect(calcDiasRestantes(undefined)).toBeNull()
  })

  it("returns null for invalid date string", () => {
    expect(calcDiasRestantes("not-a-date")).toBeNull()
  })

  it("returns >= 0 for a future ISO date", () => {
    const future = new Date(Date.now() + 30 * MS_PER_DAY).toISOString()
    const result = calcDiasRestantes(future)
    expect(result).not.toBeNull()
    expect(result!).toBeGreaterThanOrEqual(29)
    expect(result!).toBeLessThanOrEqual(31)
  })

  it("returns 0 for a past date", () => {
    const past = new Date(Date.now() - 10 * MS_PER_DAY).toISOString()
    const result = calcDiasRestantes(past)
    expect(result).toBe(0)
  })

  it("handles ISO date-only format (YYYY-MM-DD)", () => {
    const future = new Date(Date.now() + 15 * MS_PER_DAY)
    const dateOnly = future.toISOString().substring(0, 10)
    const result = calcDiasRestantes(dateOnly)
    expect(result).not.toBeNull()
    expect(result!).toBeGreaterThanOrEqual(14)
    expect(result!).toBeLessThanOrEqual(16)
  })

  it("handles DD/MM/YYYY fallback format", () => {
    // Create a date 20 days from now in DD/MM/YYYY format
    const future = new Date(Date.now() + 20 * MS_PER_DAY)
    const day = String(future.getDate()).padStart(2, "0")
    const month = String(future.getMonth() + 1).padStart(2, "0")
    const year = future.getFullYear()
    const dmy = `${day}/${month}/${year}`
    const result = calcDiasRestantes(dmy)
    expect(result).not.toBeNull()
    expect(result!).toBeGreaterThanOrEqual(19)
    expect(result!).toBeLessThanOrEqual(21)
  })
})
