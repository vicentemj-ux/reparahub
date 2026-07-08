import type { NextAuthOptions } from "next-auth"
import { getServerSession } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import GoogleProvider from "next-auth/providers/google"
import bcrypt from "bcryptjs"
import { cookies } from "next/headers"
import { getPrismaClient } from "@/lib/prisma"

function slugifyName(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50)
}

function resolveAuthSecret() {
  const explicit = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET
  if (process.env.NODE_ENV === "production" && !explicit) {
    throw new Error("AUTH_SECRET (or NEXTAUTH_SECRET) is required in production")
  }
  return explicit || process.env.SUPABASE_JWT_SECRET
}

const AUTH_SECRET_FALLBACK = resolveAuthSecret()

export const authOptions: NextAuthOptions = {
  secret: AUTH_SECRET_FALLBACK,
  session: { strategy: "jwt" },
  providers: [
    GoogleProvider({
      clientId: process.env.AUTH_GOOGLE_ID || "",
      clientSecret: process.env.AUTH_GOOGLE_SECRET || "",
      allowDangerousEmailAccountLinking: true,
    }),
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const emailRaw = credentials?.email?.trim()
        const email = emailRaw?.toLowerCase()
        const password = credentials?.password ?? ""
        if (!email || !password) return null

        const prisma = getPrismaClient()
        const user = await prisma.user.findFirst({
          where: {
            email: { equals: email, mode: "insensitive" },
          },
          include: { tenant: true },
        })
        if (!user || !user.passwordHash || !user.emailVerified || !user.activo) return null

        const ok = await bcrypt.compare(password, String(user.passwordHash))
        if (!ok) return null

        return {
          id: user.id,
          email: user.email,
          name: user.nombre || user.email,
          tenantId: user.tenantId,
          tenantName: user.tenant?.nombre || "Mi Taller",
          isAdmin: user.role === "ADMIN",
          role: user.role,
          sessionVersion: Number(user.sessionVersion ?? 1),
        } as any
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider !== "google") return true

      const email = user.email?.toLowerCase().trim()
      if (!email) return false

      try {
        const prisma = getPrismaClient()

        // Already has an account linked? Allow.
        const existingAccount = await prisma.account.findFirst({
          where: { providerAccountId: account.providerAccountId, provider: "google" },
          include: { user: { select: { tenantId: true } } },
        })
        if (existingAccount) {
          ;(user as any).tenantId = existingAccount.user.tenantId
          return true
        }

        // User already exists by email? Link the Google account.
        const existingUser = await prisma.user.findFirst({
          where: { email },
          include: { tenant: true },
        })
        if (existingUser) {
          await prisma.account.create({
            data: {
              userId: existingUser.id,
              tenantId: existingUser.tenantId,
              type: account.type,
              provider: "google",
              providerAccountId: account.providerAccountId,
              access_token: account.access_token,
              expires_at: account.expires_at,
              id_token: account.id_token,
              refresh_token: account.refresh_token,
              token_type: account.token_type,
              scope: account.scope,
              session_state: account.session_state,
            },
          })
          ;(user as any).tenantId = existingUser.tenantId
          ;(user as any).tenantName = existingUser.tenant?.nombre || "Mi Taller"
          return true
        }

        // New user: create tenant + user + config
        const displayName = user.name?.trim() || "Mi Taller"
        const baseSlug = slugifyName(displayName) || "mi-taller"
        const trialEndsAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)

        let slug = baseSlug
        let counter = 1
        while (await prisma.tenant.findUnique({ where: { slug }, select: { id: true } })) {
          counter++
          slug = `${baseSlug}-${counter}`
        }

        const tenant = await prisma.tenant.create({
          data: {
            nombre: displayName,
            slug,
            plan: "PRO",
            trialEndsAt,
            currency: "MXN",
            timezone: "America/Mexico_City",
            paperSize: "80mm",
            printSettings: {},
          },
        })

        const newUser = await prisma.user.create({
          data: {
            tenantId: tenant.id,
            email,
            nombre: displayName,
            emailVerified: true,
            sessionVersion: 1,
            role: "OWNER",
          },
        })

        await prisma.account.create({
          data: {
            userId: newUser.id,
            tenantId: tenant.id,
            type: account.type,
            provider: "google",
            providerAccountId: account.providerAccountId,
            access_token: account.access_token,
            expires_at: account.expires_at,
            id_token: account.id_token,
            refresh_token: account.refresh_token,
            token_type: account.token_type,
            scope: account.scope,
            session_state: account.session_state,
          },
        })

        await prisma.configuracionTaller.create({
          data: {
            tenantId: tenant.id,
            nombreComercial: displayName,
            moneda: "MXN",
            timezone: "America/Mexico_City",
            paperSize: "80mm",
            printSettings: {},
            wizardCompletado: false,
          },
        })

        // Pass tenantId to JWT callback via user object (avoids DB lookup in jwt callback)
        ;(user as any).tenantId = tenant.id
        ;(user as any).tenantName = displayName

        return true
      } catch (error) {
        console.error("[auth] Google signIn error:", error)
        return false
      }
    },
    async jwt({ token, user, account }) {
      if (user) {
        // Both Credentials and OAuth providers pass tenantId on user object
        // (signIn callback sets it for OAuth, authorize sets it for Credentials)
        if ((user as any).tenantId) {
          token.tenantId = (user as any).tenantId
          token.tenantName = (user as any).tenantName
          token.isAdmin = (user as any).isAdmin
          token.role = (user as any).role
          token.sessionVersion = (user as any).sessionVersion ?? 1
        } else if (user.email) {
          // Fallback: look up our DB user by email if tenantId wasn't set
          try {
            const prisma = getPrismaClient()
            const dbUser = await prisma.user.findFirst({
              where: { email: user.email.toLowerCase().trim() },
              include: { tenant: { select: { nombre: true } } },
            })
            if (dbUser) {
              token.tenantId = dbUser.tenantId
              token.tenantName = dbUser.tenant?.nombre || "Mi Taller"
              token.isAdmin = dbUser.role === "ADMIN"
              token.role = dbUser.role
              token.sessionVersion = dbUser.sessionVersion
            }
          } catch (e) {
            console.error("[auth] jwt callback lookup error:", e)
          }
        }
      }
      return token
    },
    async session({ session, token }) {
      ;(session.user as any).id = token.sub
      ;(session.user as any).tenantId = token.tenantId
      ;(session.user as any).tenantName = token.tenantName
      ;(session.user as any).isAdmin = token.isAdmin
      ;(session.user as any).role = token.role
      ;(session.user as any).sessionVersion = token.sessionVersion
      return session
    },
  },
  pages: {
    signIn: "/auth/login",
  },
}

export async function getAuthSession() {
  return getServerSession(authOptions)
}

export async function getCurrentUser() {
  const session = await getAuthSession()
  return session?.user ?? null
}

export async function getCurrentTenant() {
  const user = await getCurrentUser()
  if (!user) return null
  return {
    id: (user as any).tenantId as string,
    nombre_taller: (user as any).tenantName as string,
  }
}

export async function clearLegacySessionCookies() {
  const cookieStore = await cookies()
  cookieStore.delete("tallerId")
  cookieStore.delete("tallerName")
  cookieStore.delete("isAdmin")
  cookieStore.delete("session_version")
  cookieStore.delete("reparahub_admin_verified")
}
