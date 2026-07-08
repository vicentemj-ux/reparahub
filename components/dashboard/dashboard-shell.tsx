"use client"

import { useEffect, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import dynamic from "next/dynamic"
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet"
import { Menu } from "lucide-react"
import { PRO_DISABLED_ROUTES, PRO_FEATURES_TEMP_DISABLED } from "@/lib/runtime-flags"
import { getDashboardClientContext, type DashboardClientContext } from "@/lib/actions/dashboard-client-prisma"
import { runDailyAlertsCheck } from "@/lib/actions/alertas-prisma"
import { OnboardingTour } from "@/components/dashboard/onboarding-tour"
import { ActiveCustomerProvider } from "@/lib/context/active-customer-context"
import { ActiveCustomerToolbar } from "@/components/dashboard/active-customer-toolbar"
import { PwaInstallBanner } from "@/components/dashboard/pwa-install-banner"
import { cn } from "@/lib/utils"
import { DASHBOARD_SURFACE } from "@/lib/dashboard-surface"

// Lazy-load sidebar con DnD (~100-150KB ahorrados en bundle inicial)
const SidebarContent = dynamic(
  () => import("@/components/dashboard/sidebar-content").then((m) => m.SidebarContent),
  { ssr: false, loading: () => <SidebarSkeleton /> }
)

const OfflineBanner = dynamic(
  () => import("@/components/dashboard/offline-banner").then((m) => m.OfflineBanner),
  { ssr: false }
)
const OfflineSyncListener = dynamic(
  () => import("@/components/dashboard/offline-sync-listener").then((m) => m.OfflineSyncListener),
  { ssr: false }
)

// --- Skeleton para sidebar mientras carga DnD ---------------------------------

function SidebarSkeleton() {
  return (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center gap-2.5 border-b border-sidebar-border px-5">
        <div className="h-8 w-8 rounded-md bg-sidebar-accent animate-pulse" />
        <div className="h-5 w-24 rounded-md bg-sidebar-accent animate-pulse" />
      </div>
      <div className="flex-1 space-y-2 px-3 py-4">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="h-9 rounded-lg bg-sidebar-accent animate-pulse" />
        ))}
      </div>
      <div className="shrink-0 border-t border-sidebar-border p-3 space-y-3">
        <div className="h-10 rounded-lg bg-sidebar-accent animate-pulse" />
        <div className="h-9 rounded-lg bg-sidebar-accent animate-pulse" />
      </div>
    </div>
  )
}

// --- Dashboard Content --------------------------------------------------------

function DashboardContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [desktopSidebarCompact, setDesktopSidebarCompact] = useState(false)
  const [mobileSidebarCompact, setMobileSidebarCompact] = useState(true)
  const [clientCtx, setClientCtx] = useState<DashboardClientContext | null>(null)
  const [tourSignal, setTourSignal] = useState(0)

  useEffect(() => {
    const stored = window.localStorage.getItem("tc-sidebar-compact")
    if (stored === "1") setDesktopSidebarCompact(true)
  }, [])

  useEffect(() => {
    window.localStorage.setItem("tc-sidebar-compact", desktopSidebarCompact ? "1" : "0")
  }, [desktopSidebarCompact])

  useEffect(() => {
    if (!mobileOpen) return
    const originalOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      document.body.style.overflow = originalOverflow
    }
  }, [mobileOpen])

  useEffect(() => {
    if (!PRO_FEATURES_TEMP_DISABLED) return
    const blocked = PRO_DISABLED_ROUTES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))
    if (blocked) {
      router.replace("/dashboard")
    }
  }, [pathname, router])

  useEffect(() => {
    if (pathname.startsWith("/dashboard/wizard") || pathname.startsWith("/onboarding")) return
    let cancelled = false
    getDashboardClientContext().then((ctx) => {
      if (cancelled) return
      setClientCtx(ctx)
      if (ctx.wizardNeeded) router.replace("/dashboard/wizard")
    })
    return () => { cancelled = true }
  }, [pathname, router])

  useEffect(() => {
    runDailyAlertsCheck().catch(() => {})
  }, [])

  return (
    <div className="flex h-screen [height:100dvh] gap-0 overflow-x-hidden p-3" style={{ backgroundColor: DASHBOARD_SURFACE }}>
      {/* Desktop Sidebar - lazy loaded */}
      <aside
        className={cn("hidden shrink-0 transition-[width] duration-200 lg:relative lg:z-20 lg:block", desktopSidebarCompact ? "w-[110px] pr-5" : "w-[316px] pr-5")}
        style={{ backgroundColor: DASHBOARD_SURFACE }}
      >
        <SidebarContent
          pathname={pathname}
          clientCtx={clientCtx}
          compact={desktopSidebarCompact}
          onToggleCompact={() => setDesktopSidebarCompact((v) => !v)}
          onStartTour={() => setTourSignal((v) => v + 1)}
        />
      </aside>

      {/* Mobile Sidebar */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent
          side="left"
          overlayClassName="bg-slate-200/75"
          className={cn(
            "h-full border-sidebar-border bg-transparent p-0 transition-[width] duration-200",
            mobileSidebarCompact ? "w-[96px] max-w-[96px]" : "w-[min(88vw,296px)] max-w-[88vw]",
          )}
        >
          <SheetTitle className="sr-only">Menu de navegacion</SheetTitle>
          <SidebarContent
            pathname={pathname}
            onNavigate={() => setMobileOpen(false)}
            clientCtx={clientCtx}
            compact={mobileSidebarCompact}
            onToggleCompact={() => setMobileSidebarCompact((v) => !v)}
            onStartTour={() => {
              setMobileOpen(false)
              setTourSignal((v) => v + 1)
            }}
          />
        </SheetContent>
      </Sheet>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-visible" style={{ backgroundColor: DASHBOARD_SURFACE }}>
        <OfflineBanner />
        <PwaInstallBanner />
        <ActiveCustomerToolbar />

        <main className="flex-1 overflow-x-hidden overflow-y-auto scroll-smooth font-sans" style={{ backgroundColor: DASHBOARD_SURFACE }}>
          {children}
        </main>
      </div>

      {/* Mobile floating menu button (no top header bar) */}
      <button
        type="button"
        onClick={() => {
          setMobileSidebarCompact(true)
          setMobileOpen(true)
        }}
        className="fixed left-3 z-[120] flex h-12 w-12 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-lg bottom-[max(0.75rem,env(safe-area-inset-bottom))] lg:hidden"
        aria-label="Abrir menu"
      >
        <Menu className="h-5 w-5" />
      </button>
      <OnboardingTour autoStart={Boolean(clientCtx?.onboardingTourShouldAutoStart)} openSignal={tourSignal} />
    </div>
  )
}

// --- Dashboard Shell (Client Component) ---------------------------------------

export function DashboardShell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <OfflineSyncListener />
      <ActiveCustomerProvider>
        <DashboardContent>{children}</DashboardContent>
      </ActiveCustomerProvider>
    </>
  )
}
