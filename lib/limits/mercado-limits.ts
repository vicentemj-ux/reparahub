import { PlanType } from "@prisma/client"

export const MERCADO_LIMITS = {
  NORMAL: 5,
  PRO: 50,
} as const

export type MercadoLimit = (typeof MERCADO_LIMITS)[keyof typeof MERCADO_LIMITS]

export function getMercadoLimit(plan: PlanType, inTrial: boolean): MercadoLimit {
  if (inTrial) return MERCADO_LIMITS.PRO
  return MERCADO_LIMITS[plan] ?? MERCADO_LIMITS.NORMAL
}

export function canPublishMoreProductos(
  currentPublishedCount: number,
  plan: PlanType,
  inTrial: boolean,
): boolean {
  const limit = getMercadoLimit(plan, inTrial)
  return currentPublishedCount < limit
}

export function getRemainingSlots(
  currentPublishedCount: number,
  plan: PlanType,
  inTrial: boolean,
): number {
  const limit = getMercadoLimit(plan, inTrial)
  return Math.max(0, limit - currentPublishedCount)
}

export function isMercadoLimitReached(
  currentPublishedCount: number,
  plan: PlanType,
  inTrial: boolean,
): boolean {
  return getRemainingSlots(currentPublishedCount, plan, inTrial) === 0
}
