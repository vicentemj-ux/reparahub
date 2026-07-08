"use server"

import { cookies } from "next/headers"
import { getCurrentTenant } from "@/lib/auth"

export async function getTenantIdOrThrow(): Promise<string> {
  const cookieStore = await cookies()
  const tallerId = cookieStore.get("tallerId")?.value
  if (tallerId) return tallerId

  const tenant = await getCurrentTenant()
  if (tenant?.id) {
    try {
      cookieStore.set("tallerId", tenant.id, {
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24 * 30,
      })
      if (tenant.nombre_taller) {
        cookieStore.set("tallerName", encodeURIComponent(tenant.nombre_taller), {
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          path: "/",
          maxAge: 60 * 60 * 24 * 30,
        })
      }
    } catch { /* cookie may already be set by middleware */ }
    return tenant.id
  }

  throw new Error("Sesion invalida")
}
