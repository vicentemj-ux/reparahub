import { PrismaPg } from "@prisma/adapter-pg"
import { PrismaClient } from "@prisma/client"

declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined
}

function createPrismaClient() {
  const url = process.env.DATABASE_URL
  if (!url) {
    throw new Error("DATABASE_URL is not configured")
  }

  if (!url.startsWith("postgresql://") && !url.startsWith("postgres://")) {
    throw new Error("DATABASE_URL must be a direct postgres URL for Prisma health checks")
  }

  const adapter = new PrismaPg({ connectionString: url })
  return new PrismaClient({ adapter })
}

export function getPrismaClient() {
  if (globalThis.__prisma) return globalThis.__prisma
  const client = createPrismaClient()
  // Cache globally in ALL environments to prevent connection pool exhaustion.
  // In production (serverless/Vercel), each invocation is isolated so the cache
  // is per-invocation. On a long-running server, it prevents new pools per request.
  globalThis.__prisma = client
  return client
}
