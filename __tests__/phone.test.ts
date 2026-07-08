import { describe, it, expect } from "vitest"
import { onlyDigits, last4 } from "@/lib/phone"

describe("onlyDigits", () => {
  it("removes all non-digit characters", () => {
    expect(onlyDigits("52-123-456-7890")).toBe("521234567890")
  })

  it("handles null/undefined by returning empty string", () => {
    expect(onlyDigits(null)).toBe("")
    expect(onlyDigits(undefined)).toBe("")
  })

  it("returns empty string for non-numeric input", () => {
    expect(onlyDigits("abc")).toBe("")
  })

  it("preserves pure digits", () => {
    expect(onlyDigits("1234567890")).toBe("1234567890")
  })

  it("handles empty string", () => {
    expect(onlyDigits("")).toBe("")
  })
})

describe("last4", () => {
  it("returns last 4 digits of a phone number", () => {
    expect(last4("521234567890")).toBe("7890")
  })

  it("returns last 4 from formatted phone", () => {
    expect(last4("(52) 123-456-7890")).toBe("7890")
  })

  it("returns full string if less than 4 digits", () => {
    expect(last4("123")).toBe("123")
  })

  it("handles null/undefined", () => {
    expect(last4(null)).toBe("")
    expect(last4(undefined)).toBe("")
  })

  it("returns empty string for no digits", () => {
    expect(last4("abc")).toBe("")
  })
})
