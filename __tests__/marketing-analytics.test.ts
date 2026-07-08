import { describe, expect, it } from "vitest"
import { sanitizeMarketingProperties } from "@/lib/marketing-analytics"

describe("sanitizeMarketingProperties", () => {
  it("keeps approved funnel properties", () => {
    expect(
      sanitizeMarketingProperties({
        location: "hero",
        plan: "pro",
        billing: "annual",
        completed: true,
      }),
    ).toEqual({
      location: "hero",
      plan: "pro",
      billing: "annual",
      completed: true,
    })
  })

  it("removes personally identifiable property keys", () => {
    expect(
      sanitizeMarketingProperties({
        email: "cliente@example.com",
        nombre: "Cliente",
        telefono: "5551234567",
        password: "secret",
        token: "verification-token",
        location: "register",
      }),
    ).toEqual({ location: "register" })
  })

  it("matches forbidden keys without case sensitivity", () => {
    expect(sanitizeMarketingProperties({ Email: "a@b.com", PHONE: "123", plan: "core" })).toEqual({
      plan: "core",
    })
  })
})
