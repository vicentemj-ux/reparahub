import { describe, expect, it } from "vitest"
import { PLAN_CORE, PLAN_PRO } from "@/lib/plan-catalog"
import {
  buildHomeStructuredData,
  MARKETING_FAQS,
  serializeStructuredData,
} from "@/lib/marketing-schema"

describe("home structured data", () => {
  it("publishes the required schema types", () => {
    const schemas = buildHomeStructuredData()
    expect(schemas.map((schema) => schema["@type"])).toEqual([
      "Organization",
      "SoftwareApplication",
      "WebSite",
      "FAQPage",
    ])
  })

  it("uses the plan catalog as the pricing source", () => {
    const software = buildHomeStructuredData().find((schema) => schema["@type"] === "SoftwareApplication")
    expect(software?.offers).toEqual([
      expect.objectContaining({ name: PLAN_CORE.name, price: PLAN_CORE.monthlyPriceMx.toString() }),
      expect.objectContaining({ name: PLAN_PRO.name, price: PLAN_PRO.monthlyPriceMx.toString() }),
    ])
  })

  it("keeps FAQ content unique and indexable", () => {
    const questions = MARKETING_FAQS.map((faq) => faq.question)
    expect(new Set(questions).size).toBe(questions.length)
    expect(MARKETING_FAQS.every((faq) => faq.answer.length > 40)).toBe(true)
  })

  it("escapes opening angle brackets in serialized JSON-LD", () => {
    expect(serializeStructuredData({ value: "</script>" })).toContain("\\u003c/script>")
  })
})
