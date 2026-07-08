import { DashboardShell } from "@/components/dashboard/dashboard-shell"

/**
 * Layout server-side que envuelve TODAS las paginas de `/dashboard/*`.
 *
 * Delega a `DashboardShell` (client component) que se encarga del
 * shell visual y de disparar `runDailyAlertsCheck()` en background
 * via useEffect (non-blocking).
 */
export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <DashboardShell>{children}</DashboardShell>
}
