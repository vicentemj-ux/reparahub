/**
 * create-admin-neon.ts
 *
 * Convierte un usuario existente de Prisma/Neon en administrador.
 *
 * Uso:
 *   npx tsx scripts/create-admin-neon.ts
 *
 * Configura en .env.local:
 *   DATABASE_URL=postgresql://...
 *   ADMIN_EMAIL=vicentemj@gmail.com
 */

import { PrismaPg } from "@prisma/adapter-pg"
import { PrismaClient } from "@prisma/client"

const DATABASE_URL = process.env.DATABASE_URL
const ADMIN_EMAIL = process.env.ADMIN_EMAIL

if (!DATABASE_URL) {
  console.error("❌ DATABASE_URL no configurado en .env.local")
  process.exit(1)
}
if (!ADMIN_EMAIL) {
  console.error("❌ Configura ADMIN_EMAIL en .env.local")
  process.exit(1)
}

async function main() {
  const adapter = new PrismaPg({ connectionString: DATABASE_URL! })
  const prisma = new PrismaClient({ adapter })

  const user = await prisma.user.findUnique({ where: { email: ADMIN_EMAIL! } })
  if (!user) {
    console.error(`❌ No se encontro usuario con email: ${ADMIN_EMAIL}`)
    console.error("   Registrate primero en /auth/register")
    process.exit(1)
  }

  await prisma.user.update({
    where: { email: ADMIN_EMAIL! },
    data: { role: "ADMIN" },
  })

  console.log(`✅ Usuario ${ADMIN_EMAIL} ahora es ADMIN`)
  console.log(`   id: ${user.id}`)
  console.log(`   Accede en: /auth/super-admin`)
  await prisma.$disconnect()
}

main().catch((e) => {
  console.error("❌ Error:", e)
  process.exit(1)
})
