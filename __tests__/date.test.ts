import { describe, it, expect } from "vitest"
import { formatDate, formatDateTime, formatShortDate, formatFolioFecha } from "@/lib/utils/date"

describe("formatDate", () => {
  it("returns dash for null/undefined", () => {
    expect(formatDate(null)).toBe("-")
    expect(formatDate(undefined)).toBe("-")
  })

  it("returns original string for invalid date", () => {
    expect(formatDate("not-a-date")).toBe("not-a-date")
  })

  it("formats a valid ISO date", () => {
    const result = formatDate("2026-04-14T10:30:00.000Z")
    expect(result).not.toBe("-")
    expect(result).not.toBe("not-a-date")
    // Should contain day, month, year components
    expect(result).toMatch(/\d/)
  })
})

describe("formatDateTime", () => {
  it("returns dash for null", () => {
    expect(formatDateTime(null)).toBe("-")
  })

  it("includes time component", () => {
    const result = formatDateTime("2026-04-14T10:30:00.000Z")
    expect(result).toMatch(/\d/)
  })
})

describe("formatShortDate", () => {
  it("returns dash for null", () => {
    expect(formatShortDate(null)).toBe("-")
  })

  it("formats with slash separators", () => {
    const result = formatShortDate("2026-04-14T10:30:00.000Z")
    expect(result).toMatch(/\d/)
  })
})

describe("formatFolioFecha", () => {
  it("returns dash for null", () => {
    expect(formatFolioFecha(null)).toBe("-")
  })

  it("includes separator dot", () => {
    const result = formatFolioFecha("2026-04-14T10:30:00.000Z")
    expect(result).toContain("·")
  })
})
