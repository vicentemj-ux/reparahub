import { getPrismaClient } from "@/lib/prisma"

export async function checkDbHealth() {
  try {
    const prisma = getPrismaClient()
    await prisma.$queryRaw`SELECT 1`
    return { ok: true as const }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Database connection failed"
    return { ok: false as const, error: message }
  }
}
