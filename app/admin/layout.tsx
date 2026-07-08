import { cookies } from "next/headers"
import { redirect } from "next/navigation"

/**
 * Admin layout - server component.
 *
 * This is layer 2 of the admin guard (the proxy is layer 1).
 * Checks that the isAdmin cookie is present and valid.
 *
 * The 2FA check (reparahub_admin_verified cookie) is intentionally handled
 * ONLY in the proxy so that /admin/verify itself - which also runs through
 * this layout - is not caught in a redirect loop.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies()
  const isAdmin = cookieStore.get("isAdmin")?.value === "true"

  if (!isAdmin) {
    redirect("/dashboard")
  }

  return <>{children}</>
}
