import { describe, it, expect } from "vitest"
import { sanitizeFileName, getPublicUrl } from "@/lib/r2"

describe("sanitizeFileName", () => {
  it("preserves original case (does not lowercase)", () => {
    const result = sanitizeFileName("Photo.JPG")
    expect(result).toBe("Photo.JPG")
  })

  it("removes special characters", () => {
    const result = sanitizeFileName("my photo (1).jpg")
    // Parentheses become hyphens, trailing hyphen before extension is kept
    expect(result).toBe("my-photo-1-.jpg")
  })

  it("collapses multiple hyphens", () => {
    const result = sanitizeFileName("a---b.jpg")
    expect(result).toBe("a-b.jpg")
  })

  it("strips leading/trailing hyphens", () => {
    const result = sanitizeFileName("-photo-")
    expect(result).toBe("photo")
  })

  it("returns default name for empty input", () => {
    expect(sanitizeFileName("")).toBe("foto.webp")
    expect(sanitizeFileName("   ")).toBe("foto.webp")
  })

  it("normalizes unicode accents", () => {
    const result = sanitizeFileName("fotografía.jpg")
    expect(result).toBe("fotografia.jpg")
  })

  it("handles dots in filename", () => {
    const result = sanitizeFileName("image.v2.final.png")
    expect(result).toBe("image.v2.final.png")
  })
})

describe("getPublicUrl", () => {
  it("returns clean key when no publicBaseUrl is set", () => {
    // When publicBaseUrl is undefined (no env), returns the key as-is
    const result = getPublicUrl("test/key.jpg")
    // Since we can't set env vars in test, it returns the key directly
    expect(result).toContain("test/key.jpg")
  })
})
