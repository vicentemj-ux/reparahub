import { NextResponse, type NextRequest } from "next/server"
import { getToken } from "next-auth/jwt"
import { checkPublicRateLimit, getClientIp } from "./lib/rate-limit-public"

function resolveAuthSecret() {
  const explicit = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET
  if (process.env.NODE_ENV === "production" && !explicit) {
    throw new Error("AUTH_SECRET (or NEXTAUTH_SECRET) is required in production")
  }
  return explicit || process.env.SUPABASE_JWT_SECRET
}

const AUTH_SECRET_FALLBACK = resolveAuthSecret()

function normalizeSessionVersion(value: unknown): number {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1
}

function clearTenantCookies(out: NextResponse): NextResponse {
  out.cookies.delete("tallerId")
  out.cookies.delete("tallerName")
  out.cookies.delete("isAdmin")
  out.cookies.delete("session_version")
  return out
}

const tallerCookieOpts = {
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: 60 * 60 * 24 * 30,
}

export default async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  if (pathname.startsWith("/t/")) {
    const ip = getClientIp(request.headers)
    const rl = checkPublicRateLimit(`tienda:${ip}`)
    if (!rl.ok) {
      return new NextResponse("Demasiadas solicitudes. Intentalo de nuevo en un minuto.", {
        status: 429,
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          "Retry-After": String(Math.ceil((rl.resetAt - Date.now()) / 1000)),
          "X-RateLimit-Limit": "60",
          "X-RateLimit-Remaining": "0",
        },
      })
    }
    const res = NextResponse.next()
    res.headers.set("X-RateLimit-Limit", "60")
    res.headers.set("X-RateLimit-Remaining", String(rl.remaining))
    return res
  }

  const token = await getToken({ req: request, secret: AUTH_SECRET_FALLBACK })
  const authUserId = token?.sub
  const tokenTenantId = (token as any)?.tenantId as string | undefined
  const tokenTenantName = (token as any)?.tenantName as string | undefined
  const tokenSessionVersion = normalizeSessionVersion((token as any)?.sessionVersion)
  const tokenIsAdmin = Boolean((token as any)?.isAdmin)

  const tallerId = request.cookies.get("tallerId")?.value
  const isAdminCookie = request.cookies.get("isAdmin")?.value === "true"

  if (
    pathname.startsWith("/auth/verify-email") ||
    pathname.startsWith("/auth/reset-password") ||
    pathname.startsWith("/auth/super-admin") ||
    pathname.startsWith("/auth/forgot-password") ||
    pathname.startsWith("/auth/callback")
  ) {
    return NextResponse.next()
  }

  if (pathname.startsWith("/admin")) {
    if (!tallerId) return NextResponse.redirect(new URL("/auth/super-admin", request.url))
    if (!isAdminCookie) return NextResponse.redirect(new URL("/dashboard", request.url))

    const adminVerified = request.cookies.get("reparahub_admin_verified")?.value
    if (!adminVerified && !pathname.startsWith("/admin/verify")) {
      return NextResponse.redirect(new URL("/admin/verify", request.url))
    }
    return NextResponse.next()
  }

  if (pathname.startsWith("/onboarding")) {
    if (!authUserId) return NextResponse.redirect(new URL("/auth/login", request.url))
    if (tokenTenantId) return NextResponse.redirect(new URL("/dashboard", request.url))
    if (tallerId) {
      return clearTenantCookies(NextResponse.next())
    }
    return NextResponse.next()
  }

  if (pathname.startsWith("/dashboard")) {
    if (tokenTenantId) {
      const sessionVersion = request.cookies.get("session_version")?.value
      const out = NextResponse.next()
      if (!tallerId || tallerId !== tokenTenantId || sessionVersion !== String(tokenSessionVersion)) {
        out.cookies.set("tallerId", tokenTenantId, { httpOnly: true, ...tallerCookieOpts })
        out.cookies.set("tallerName", encodeURIComponent(tokenTenantName || "Mi Taller"), tallerCookieOpts)
        out.cookies.set("session_version", String(tokenSessionVersion), { httpOnly: true, ...tallerCookieOpts })
      }
      if (tokenIsAdmin) {
        out.cookies.set("isAdmin", "true", { httpOnly: true, ...tallerCookieOpts })
      }
      return out
    }

    if (authUserId) {
      return clearTenantCookies(NextResponse.redirect(new URL("/onboarding", request.url)))
    }

    if (tallerId) {
      return clearTenantCookies(NextResponse.redirect(new URL("/auth/login", request.url)))
    }

    return NextResponse.redirect(new URL("/auth/login", request.url))
  }

  if (pathname.startsWith("/auth/login") || pathname.startsWith("/auth/register")) {
    if (tokenTenantId) return NextResponse.redirect(new URL("/dashboard", request.url))
    if (authUserId) return NextResponse.redirect(new URL("/onboarding", request.url))
    if (tallerId) return clearTenantCookies(NextResponse.next())
    return NextResponse.next()
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/t/:path*", "/dashboard/:path*", "/auth/:path*", "/admin/:path*", "/onboarding", "/onboarding/:path*"],
}
