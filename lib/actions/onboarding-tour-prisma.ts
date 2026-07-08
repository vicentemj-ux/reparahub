"use server"

import { revalidatePath } from "next/cache"
import { getTenantIdOrThrow } from "@/lib/auth/tenant-utils"
import { getPrismaClient } from "@/lib/prisma"

const ONBOARDING_TOUR_ROLLOUT_AT = new Date("2026-06-19T00:00:00.000Z")

export interface OnboardingTourState {
  completed: boolean
  completedAt: string | null
  lastStep: string | null
  shouldAutoStart: boolean
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? { ...(value as Record<string, unknown>) } : {}
}

function readOnboardingTour(source: unknown): { completed: boolean; completedAt: string | null; lastStep: string | null } {
  const prefs = asRecord(source)
  const tour = asRecord(prefs.onboardingTour)
  return {
    completed: tour.completed === true,
    completedAt: typeof tour.completedAt === "string" ? tour.completedAt : null,
    lastStep: typeof tour.lastStep === "string" ? tour.lastStep : null,
  }
}

function mergeOnboardingTour(current: unknown, patch: { completed?: boolean; completedAt?: string | null; lastStep?: string | null }) {
  const base = asRecord(current)
  const currentTour = asRecord(base.onboardingTour)
  const nextTour = { ...currentTour }
  if (typeof patch.completed === "boolean") nextTour.completed = patch.completed
  if (patch.completedAt !== undefined) nextTour.completedAt = patch.completedAt
  if (patch.lastStep !== undefined) nextTour.lastStep = patch.lastStep
  base.onboardingTour = nextTour
  return base
}

export async function getOnboardingTourState(): Promise<OnboardingTourState> {
  try {
    const prisma = getPrismaClient()
    const tenantId = await getTenantIdOrThrow()
    const row = await prisma.configuracionTaller.findUnique({
      where: { tenantId },
      select: { uiPreferences: true, createdAt: true, wizardCompletado: true },
    })
    const tour = readOnboardingTour(row?.uiPreferences)
    const createdAt = row?.createdAt ?? null
    const isNewAfterRollout = Boolean(createdAt && createdAt.getTime() >= ONBOARDING_TOUR_ROLLOUT_AT.getTime())
    return {
      ...tour,
      shouldAutoStart: Boolean(row?.wizardCompletado && !tour.completed && isNewAfterRollout),
    }
  } catch (error) {
    console.error("[onboarding-tour] get:", error)
    return { completed: true, completedAt: null, lastStep: null, shouldAutoStart: false }
  }
}

export async function updateOnboardingTourState(input: { completed?: boolean; lastStep?: string | null }): Promise<{ ok: boolean; error: string | null }> {
  try {
    const prisma = getPrismaClient()
    const tenantId = await getTenantIdOrThrow()
    const row = await prisma.configuracionTaller.findUnique({
      where: { tenantId },
      select: { uiPreferences: true },
    })
    const completedAt = input.completed ? new Date().toISOString() : undefined
    const uiPreferences = mergeOnboardingTour(row?.uiPreferences, {
      completed: input.completed,
      completedAt,
      lastStep: input.lastStep ?? undefined,
    })

    await prisma.configuracionTaller.upsert({
      where: { tenantId },
      create: {
        tenantId,
        nombreComercial: "Mi Taller",
        uiPreferences: uiPreferences as any,
      },
      update: { uiPreferences: uiPreferences as any },
    })

    revalidatePath("/dashboard")
    return { ok: true, error: null }
  } catch (error) {
    console.error("[onboarding-tour] update:", error)
    return { ok: false, error: "No se pudo guardar el estado del tutorial." }
  }
}
