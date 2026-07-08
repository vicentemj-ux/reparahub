"use client"

export type MarketingEventName =
  | "landing_cta_trial_click"
  | "landing_demo_click"
  | "landing_pricing_toggle"
  | "landing_plan_click"
  | "landing_whatsapp_click"
  | "register_view"
  | "register_submit"
  | "register_error"
  | "register_success"
  | "register_abandon"
  | "register_google_click"
  | "email_verified"

export type MarketingPropertyValue = string | number | boolean | null

const FORBIDDEN_PROPERTY_KEYS = new Set([
  "email",
  "correo",
  "name",
  "nombre",
  "phone",
  "telefono",
  "password",
  "contrasena",
  "token",
])

export function sanitizeMarketingProperties(
  properties: Record<string, MarketingPropertyValue> = {},
) {
  return Object.fromEntries(
    Object.entries(properties).filter(([key]) => !FORBIDDEN_PROPERTY_KEYS.has(key.toLowerCase())),
  )
}

export function trackMarketingEvent(
  name: MarketingEventName,
  properties: Record<string, MarketingPropertyValue> = {},
) {
  void name
  void sanitizeMarketingProperties(properties)
}
