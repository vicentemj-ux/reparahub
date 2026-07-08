"use server"

import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { getCurrentTenant } from "@/lib/auth"

export async function getCurrentTallerId(): Promise<string> {
  const cookieStore = await cookies()
  const tallerId = cookieStore.get("tallerId")?.value

  if (tallerId) {
    return tallerId
  }

  const tenant = await getCurrentTenant()
  if (tenant?.id) {
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
    return tenant.id
  }

  redirect("/auth/login")
}
