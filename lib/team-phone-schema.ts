import { getPrismaClient } from "@/lib/prisma"

type PrismaClientLike = ReturnType<typeof getPrismaClient>

let ensured = false

export async function ensureTeamPhoneColumns(prisma: PrismaClientLike) {
  if (ensured) return
  await prisma.$executeRawUnsafe(`
    ALTER TABLE "User"
      ADD COLUMN IF NOT EXISTS "telefono" TEXT,
      ADD COLUMN IF NOT EXISTS "telefono_pais" TEXT
  `)
  await prisma.$executeRawUnsafe(`
    ALTER TABLE "colaboradores_operativos"
      ADD COLUMN IF NOT EXISTS "telefono" TEXT,
      ADD COLUMN IF NOT EXISTS "telefono_pais" TEXT
  `)
  ensured = true
}
