import { describe, it, expect } from "vitest"
import {
  normalizeCategoryName,
  toCategorySlug,
  inventoryBaseCategoryNames,
  EQUIPOS_CANONICAL_NAME,
} from "@/lib/inventory-categories"

describe("inventoryBaseCategoryNames", () => {
  it("returns an array of category names", () => {
    const names = inventoryBaseCategoryNames()
    expect(names).toBeInstanceOf(Array)
    expect(names.length).toBeGreaterThan(0)
  })

  it("includes EQUIPOS", () => {
    expect(inventoryBaseCategoryNames()).toContain("EQUIPOS")
  })
})

describe("normalizeCategoryName", () => {
  it("uppercases input", () => {
    expect(normalizeCategoryName("pantallas")).toBe("PANTALLAS")
  })

  it("trims whitespace", () => {
    expect(normalizeCategoryName("  refacciones  ")).toBe("REFACCIONES")
  })

  it("normalizes EQUIPO to EQUIPOS", () => {
    expect(normalizeCategoryName("equipo")).toBe(EQUIPOS_CANONICAL_NAME)
    expect(normalizeCategoryName("EQUIPOS")).toBe(EQUIPOS_CANONICAL_NAME)
  })

  it("returns empty string for empty input", () => {
    expect(normalizeCategoryName("")).toBe("")
    expect(normalizeCategoryName("   ")).toBe("")
  })

  it("collapses multiple spaces", () => {
    expect(normalizeCategoryName("  mi   categoria  ")).toBe("MI CATEGORIA")
  })
})

describe("toCategorySlug", () => {
  it("converts to lowercase slug", () => {
    expect(toCategorySlug("Refacciones")).toBe("refacciones")
  })

  it("replaces spaces with hyphens", () => {
    expect(toCategorySlug("Mi Categoria")).toBe("mi-categoria")
  })

  it("removes accents", () => {
    expect(toCategorySlug("PANTALLAS")).toBe("pantallas")
  })

  it("handles empty string", () => {
    expect(toCategorySlug("")).toBe("")
  })

  it("truncates to 64 characters", () => {
    const long = "a".repeat(100)
    expect(toCategorySlug(long).length).toBeLessThanOrEqual(64)
  })

  it("strips leading/trailing hyphens", () => {
    expect(toCategorySlug(" hello world ")).toBe("hello-world")
  })
})
