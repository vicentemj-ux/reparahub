import type { PlanType } from "@prisma/client"

export function canUsePosKiosco(plan: PlanType | null | undefined, trialEndsAt: Date | null | undefined): boolean {
  if (plan === "PRO") return true
  if (!trialEndsAt) return false
  return trialEndsAt.getTime() >= Date.now()
}

