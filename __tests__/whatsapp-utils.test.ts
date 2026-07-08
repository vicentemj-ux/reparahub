import { describe, it, expect } from "vitest"
import { normalizePhoneForWhatsApp, buildWhatsAppUrl } from "@/lib/whatsapp-utils"

describe("normalizePhoneForWhatsApp", () => {
  it("prepends country code when phone has no prefix", () => {
    expect(normalizePhoneForWhatsApp("5512345678", "52")).toBe("525512345678")
  })

  it("returns null for local phones when no country code is provided", () => {
    expect(normalizePhoneForWhatsApp("5512345678", null)).toBeNull()
    expect(normalizePhoneForWhatsApp("5512345678", undefined)).toBeNull()
    expect(normalizePhoneForWhatsApp("5512345678", "")).toBeNull()
  })

  it("returns null for empty/null phone", () => {
    expect(normalizePhoneForWhatsApp(null, "52")).toBeNull()
    expect(normalizePhoneForWhatsApp("", "52")).toBeNull()
    expect(normalizePhoneForWhatsApp("   ", "52")).toBeNull()
  })

  it("preserves phone that already has country code prefix", () => {
    expect(normalizePhoneForWhatsApp("525512345678", "52")).toBe("525512345678")
  })

  it("preserves international phones even without a country code", () => {
    expect(normalizePhoneForWhatsApp("+1 415 555 2671", null)).toBe("14155552671")
    expect(normalizePhoneForWhatsApp("0052 55 1234 5678", null)).toBe("525512345678")
    expect(normalizePhoneForWhatsApp("5215512345678", null)).toBe("5215512345678")
  })

  it("strips non-digit characters from phone", () => {
    expect(normalizePhoneForWhatsApp("(55) 1234-5678", "52")).toBe("525512345678")
  })

  it("prepends country code when phone is only the country code", () => {
    expect(normalizePhoneForWhatsApp("52", "52")).toBe("5252")
  })
})

describe("buildWhatsAppUrl", () => {
  it("builds a valid WhatsApp API URL", () => {
    const url = buildWhatsAppUrl("525512345678", "Hola")
    expect(url).toContain("https://api.whatsapp.com/send?")
    expect(url).toContain("phone=525512345678")
    expect(url).toContain("text=Hola")
  })

  it("strips non-digit characters from phone", () => {
    const url = buildWhatsAppUrl("(52) 555-1234", "Test")
    expect(url).toContain("phone=525551234")
  })

  it("encodes special characters in text", () => {
    const url = buildWhatsAppUrl("525512345678", "Hola & adios")
    expect(url).toContain("text=Hola%20%26%20adios")
  })
})
