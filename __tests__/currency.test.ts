import { describe, it, expect } from "vitest"
import { formatCurrency, formatPosterMoney, formatMoneyCompact } from "@/lib/utils/currency"

describe("formatCurrency", () => {
  it("formats a number as MXN currency", () => {
    const result = formatCurrency(1234.56)
    expect(result).toContain("1,234")
    expect(result).toContain("56")
    expect(result).toContain("$")
  })

  it("returns dash for null/undefined", () => {
    expect(formatCurrency(null)).toBe("-")
    expect(formatCurrency(undefined)).toBe("-")
  })

  it("returns dash for NaN string", () => {
    expect(formatCurrency("not-a-number")).toBe("-")
  })

  it("parses string input with $ and commas", () => {
    const result = formatCurrency("$1,234.56")
    expect(result).toContain("1,234")
  })

  it("formats zero correctly", () => {
    const result = formatCurrency(0)
    expect(result).toContain("0")
    expect(result).toContain(".00")
  })

  it("formats negative numbers", () => {
    const result = formatCurrency(-500)
    expect(result).toContain("500")
    expect(result).toContain("-")
  })
})

describe("formatPosterMoney", () => {
  it("formats without $ symbol", () => {
    const result = formatPosterMoney(1234.56)
    expect(result).not.toContain("$")
    expect(result).toContain("1,234")
  })

  it("returns dash for null", () => {
    expect(formatPosterMoney(null)).toBe("-")
  })
})

describe("formatMoneyCompact", () => {
  it("omits decimals for whole numbers", () => {
    const result = formatMoneyCompact(150)
    expect(result).toContain("150")
    expect(result).not.toContain(".")
  })

  it("includes decimals for fractional amounts", () => {
    const result = formatMoneyCompact(150.5)
    expect(result).toContain("150")
    expect(result).toContain(".5")
  })

  it("returns dash for null", () => {
    expect(formatMoneyCompact(null)).toBe("-")
  })
})
