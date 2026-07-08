"use server"

import { getTenantIdOrThrow } from "@/lib/auth/tenant-utils"
import { getCurrentUser } from "@/lib/auth"
import { getPrismaClient } from "@/lib/prisma"

export interface DashboardClientContext {
  wizardNeeded: boolean
  ownerName: string
  isPro: boolean
  onboardingTourShouldAutoStart: boolean
  trialDaysLeft: number
  showPlanCta: boolean
}

/**
 * Batched server action que resuelve 3 valores client-side en UNA sola
 * round-trip: wizardNeeded, ownerName, isPro.
 * Reemplaza las 3 calls separadas (checkWizardNeeded, getCurrentOwnerIdentity, checkIsPro).
 */
export async function getDashboardClientContext(): Promise<DashboardClientContext> {
  try {
    const prisma = getPrismaClient()
    const tenantId = await getTenantIdOrThrow()
    const user = await getCurrentUser()
    const userId = (user as any)?.id as string | undefined

    const [cfg, ownerRow, tenant] = await Promise.all([
      prisma.configuracionTaller.findUnique({
        where: { tenantId },
        select: { wizardCompletado: true, uiPreferences: true, createdAt: true },
      }),
      userId
        ? prisma.user.findUnique({
            where: { id: userId },
            select: { nombre: true },
          })
        : null,
      prisma.tenant.findUnique({
        where: { id: tenantId },
        select: { plan: true, trialEndsAt: true },
      }),
    ])

    const prefs = cfg?.uiPreferences && typeof cfg.uiPreferences === "object" && !Array.isArray(cfg.uiPreferences)
      ? (cfg.uiPreferences as Record<string, unknown>)
      : {}
    const tour = prefs.onboardingTour && typeof prefs.onboardingTour === "object" && !Array.isArray(prefs.onboardingTour)
      ? (prefs.onboardingTour as Record<string, unknown>)
      : {}
    const rolloutAt = new Date("2026-06-19T00:00:00.000Z")
    const isNewAfterRollout = Boolean(cfg?.createdAt && cfg.createdAt.getTime() >= rolloutAt.getTime())

    const inTrial = Boolean(tenant?.trialEndsAt && tenant.trialEndsAt.getTime() >= Date.now())
    const trialDaysLeft = tenant?.trialEndsAt
      ? Math.max(0, Math.ceil((tenant.trialEndsAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
      : 0

    return {
      wizardNeeded: cfg?.wizardCompletado === false,
      ownerName: ownerRow?.nombre?.trim() || "Usuario activo",
      isPro: tenant?.plan === "PRO" || inTrial,
      onboardingTourShouldAutoStart: Boolean(cfg?.wizardCompletado && tour.completed !== true && isNewAfterRollout),
      trialDaysLeft,
      showPlanCta: tenant?.plan !== "PRO",
    }
  } catch {
    return {
      wizardNeeded: false,
      ownerName: "Usuario activo",
      isPro: false,
      onboardingTourShouldAutoStart: false,
      trialDaysLeft: 0,
      showPlanCta: false,
    }
  }
}
