"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { signOut } from "next-auth/react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { HelpQuickSheet } from "@/components/dashboard/help-quick-sheet"
import {
  BarChart3,
  BriefcaseBusiness,
  ChevronRight,
  ClipboardList,
  CreditCard,
  FileText,
  History,
  LayoutDashboard,
  LogOut,
  Lock,
  Package,
  PlusCircle,
  Settings,
  ShieldCheck,
  ShoppingCart,
  Store,
  TrendingUp,
  Users,
  Video,
  Wallet,
  Wrench,
} from "lucide-react"
import { useTallerNegocioNombre } from "@/lib/hooks/use-taller-negocio-nombre"
import { logoutTaller, checkIsPro, getCurrentOwnerIdentity } from "@/lib/actions/auth-prisma"
import { PRO_FEATURES_TEMP_DISABLED } from "@/lib/runtime-flags"
import { DASHBOARD_SURFACE } from "@/lib/dashboard-surface"
import type { DashboardClientContext } from "@/lib/actions/dashboard-client-prisma"

type NavStatus = "active" | "pro"
type NavGroup = "operacion" | "finanzas" | "admin"

interface NavItem {
  label: string
  href: string
  icon: React.ElementType
  status: NavStatus
  group: NavGroup
}

const NAV_ITEMS: NavItem[] = [
  { label: "Ventas (POS)", href: "/dashboard/ventas", icon: CreditCard, status: "active", group: "operacion" },
  { label: "Reparaciones", href: "/dashboard/reparaciones", icon: Wrench, status: "active", group: "operacion" },
  { label: "Inventario", href: "/dashboard/inventario", icon: Package, status: "active", group: "operacion" },
  { label: "Clientes", href: "/dashboard/clientes", icon: Users, status: "active", group: "operacion" },
  { label: "Cotizaciones", href: "/dashboard/cotizaciones", icon: ClipboardList, status: "pro", group: "operacion" },
  { label: "Historial y Cortes", href: "/dashboard/historial-ventas", icon: History, status: "active", group: "finanzas" },
  { label: "Gastos", href: "/dashboard/bitacora-gastos", icon: Wallet, status: "active", group: "finanzas" },
  { label: "Bitacora de Visitas", href: "/dashboard/bitacora-visitas", icon: Video, status: "pro", group: "finanzas" },
  { label: "Mi Tienda", href: "/dashboard/mercado", icon: Store, status: "active", group: "finanzas" },
  { label: "Reportes", href: "/dashboard/reportes", icon: BarChart3, status: "pro", group: "finanzas" },
  { label: "Control de Utilidad", href: "/dashboard/utilidad", icon: TrendingUp, status: "pro", group: "finanzas" },
  { label: "Compras", href: "/dashboard/compras", icon: ShoppingCart, status: "pro", group: "finanzas" },
  { label: "Servicios", href: "/dashboard/servicios", icon: BriefcaseBusiness, status: "pro", group: "finanzas" },
  { label: "Mi Equipo", href: "/dashboard/equipo", icon: ShieldCheck, status: "active", group: "admin" },
  { label: "Configuracion", href: "/dashboard/configuracion", icon: Settings, status: "active", group: "admin" },
  { label: "Suscripcion", href: "/dashboard/facturacion", icon: FileText, status: "active", group: "admin" },
]

const NAV_GROUPS: Array<{ id: NavGroup; label: string }> = [
  { id: "operacion", label: "Operacion" },
  { id: "finanzas", label: "Finanzas" },
  { id: "admin", label: "Administracion" },
]

const BADGE_CONFIG = {
  pro: "bg-[#EFF8FF] text-[#155EEF]",
} as const

function SidebarAction({
  href,
  icon: Icon,
  label,
  pathname,
  compact,
  onNavigate,
  isDisabled = false,
  badge,
}: {
  href: string
  icon: React.ElementType
  label: string
  pathname: string
  compact: boolean
  onNavigate?: () => void
  isDisabled?: boolean
  badge?: "pro"
}) {
  const isActive = pathname === href
  const content = (
    <>
      <Icon className="h-[18px] w-[18px] shrink-0" />
      {!compact ? (
        <>
          <span className="min-w-0 flex-1 truncate">{label}</span>
          {badge ? (
            <Badge className={cn("h-5 rounded-full px-2 text-[10px] font-bold uppercase", BADGE_CONFIG[badge])}>
              Pro
            </Badge>
          ) : null}
          {isDisabled ? <Lock className="h-3.5 w-3.5 text-slate-400" /> : null}
        </>
      ) : null}
    </>
  )

  const rowClass = cn(
    compact
      ? "mx-auto flex h-10 w-10 items-center justify-center rounded-2xl transition-all"
      : "flex h-10 w-full items-center gap-3 rounded-2xl px-3.5 text-[13.5px] font-medium transition-all",
    isActive
      ? "bg-[#EFF8FF] text-[#155EEF]"
      : "text-[#344054] hover:bg-[#F8FAFC] hover:text-[#0B1220]",
    isDisabled && "cursor-default opacity-60",
  )

  if (isDisabled) {
    return (
      <div title="Disponible con plan PRO" className={rowClass}>
        {content}
      </div>
    )
  }

  return (
    <Link href={href} onClick={onNavigate} className={rowClass}>
      {content}
    </Link>
  )
}

function LogoutButton({ compact }: { compact: boolean }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const handleLogout = async () => {
    setLoading(true)
    try {
      await signOut({ redirect: false })
    } catch {}
    await logoutTaller()
    router.push("/")
  }

  return (
    <Button
      type="button"
      onClick={handleLogout}
      disabled={loading}
      variant="outline"
      className={cn(
        "border-[#E4E7EC] bg-white text-[#667085] shadow-none hover:bg-[#F8FAFC] hover:text-[#155EEF]",
        compact ? "h-12 w-12 rounded-2xl p-0" : "h-12 w-12 rounded-2xl p-0",
      )}
      title="Cerrar sesion"
    >
      <LogOut className="h-4 w-4" />
      <span className="sr-only">{loading ? "Cerrando sesion" : "Cerrar sesion"}</span>
    </Button>
  )
}

export function SidebarContent({
  pathname,
  onNavigate,
  clientCtx,
  compact = false,
  onToggleCompact,
  onStartTour,
}: {
  pathname: string
  onNavigate?: () => void
  clientCtx?: DashboardClientContext | null
  compact?: boolean
  onToggleCompact?: () => void
  onStartTour?: () => void
}) {
  const tallerName = useTallerNegocioNombre()
  const [isUsuarioPro, setIsUsuarioPro] = useState(false)
  const [ownerName, setOwnerName] = useState(clientCtx?.ownerName ?? "")

  useEffect(() => {
    if (clientCtx?.ownerName) {
      setOwnerName(clientCtx.ownerName)
      return
    }
    let cancelled = false
    getCurrentOwnerIdentity()
      .then((r) => {
        if (!cancelled) setOwnerName(r.nombre || "")
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [clientCtx?.ownerName])

  useEffect(() => {
    if (PRO_FEATURES_TEMP_DISABLED) {
      setIsUsuarioPro(false)
      return
    }
    if (clientCtx) {
      setIsUsuarioPro(clientCtx.isPro)
      return
    }
    checkIsPro().then(setIsUsuarioPro).catch(() => {})
  }, [clientCtx])

  const itemsByGroup = useMemo(
    () =>
      NAV_GROUPS.map((group) => ({
        ...group,
        items: NAV_ITEMS.filter((item) => item.group === group.id),
      })),
    [],
  )

  const displayName = tallerName || ownerName || "ReparaHub"
  const initial = (ownerName || tallerName || "V").charAt(0).toUpperCase()
  const shouldShowPlanCard = !compact && (Boolean(clientCtx?.showPlanCta) || (clientCtx?.trialDaysLeft ?? 0) > 0)
  const trialDaysLeft = clientCtx?.trialDaysLeft ?? 0

  return (
    <div
      className={cn("flex h-full min-w-0 max-w-full flex-col overflow-visible", compact ? "items-center" : "")}
      style={{ backgroundColor: DASHBOARD_SURFACE }}
    >
      <div
        className={cn(
          "relative flex h-full min-h-0 flex-col overflow-visible rounded-[30px] border border-[#E4E7EC] bg-white shadow-[0_24px_60px_rgba(11,18,32,0.08)]",
          compact ? "w-[88px]" : "w-full",
        )}
      >
        <button
          type="button"
          onClick={onToggleCompact}
          className="absolute right-[-18px] top-5 z-50 flex h-12 w-12 items-center justify-center rounded-full border border-[#E4E7EC] bg-white text-[#667085] shadow-[0_16px_36px_rgba(11,18,32,0.14)] transition-all hover:scale-[1.04] hover:border-[#B2DDFF] hover:text-[#155EEF]"
          aria-label={compact ? "Expandir menu" : "Compactar menu"}
        >
          <ChevronRight className={cn("h-[19px] w-[19px] transition-transform", compact ? "" : "rotate-180")} />
        </button>

        <div className={cn("shrink-0", compact ? "px-2 pb-3 pt-4" : "px-4 pb-2 pt-5")}>
          {compact ? (
            <div className="space-y-3">
              <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-2xl bg-[#EFF8FF] text-sm font-bold text-[#155EEF]">
                {initial}
              </div>
              <Button
                className="btn-glow h-11 w-11 rounded-2xl bg-[#155EEF] p-0 text-white shadow-none hover:bg-[#004EEB]"
                asChild
              >
                <Link href="/dashboard/reparaciones/nueva" onClick={onNavigate} title="Nueva recepcion">
                  <PlusCircle className="h-5 w-5" />
                </Link>
              </Button>
              <SidebarAction
                href="/dashboard"
                icon={LayoutDashboard}
                label="Vista General"
                pathname={pathname}
                compact
                onNavigate={onNavigate}
              />
            </div>
          ) : (
            <>
              <div className="flex items-start justify-between gap-3">
                <p className="truncate text-[1.85rem] font-bold tracking-[-0.03em] text-[#0B1220]">{displayName}</p>
              </div>
              <Button
                className="btn-glow mt-3 h-11 w-full justify-start rounded-2xl bg-[#155EEF] px-4 text-[14px] font-bold text-white shadow-none hover:bg-[#004EEB]"
                asChild
              >
                <Link href="/dashboard/reparaciones/nueva" onClick={onNavigate}>
                  <PlusCircle className="h-4 w-4" />
                  Nueva recepcion
                </Link>
              </Button>
              <div className="mt-3.5">
                <SidebarAction
                  href="/dashboard"
                  icon={LayoutDashboard}
                  label="Dashboard"
                  pathname={pathname}
                  compact={false}
                  onNavigate={onNavigate}
                />
              </div>
            </>
          )}
        </div>

        <div className={cn("min-h-0 flex-1 overflow-y-auto", compact ? "px-2 pb-3" : "px-4 pb-1")}>
          {itemsByGroup.map((group, index) => (
            <div key={group.id} className={cn(index > 0 && compact ? "mt-4" : index > 0 ? "mt-4.5" : "")}>
              {!compact ? (
                <p className="px-2 pb-1.5 text-[9px] font-semibold uppercase tracking-[0.22em] text-[#98A2B3]">{group.label}</p>
              ) : index > 0 ? (
                <div className="mx-auto mb-3 h-px w-8 bg-[#E4E7EC]" />
              ) : null}
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const requiresPro = item.status === "pro"
                  const isDisabled = requiresPro && (!isUsuarioPro || PRO_FEATURES_TEMP_DISABLED)
                  const badge = item.status === "pro" ? "pro" : undefined
                  return (
                    <SidebarAction
                      key={item.href}
                      href={item.href}
                      icon={item.icon}
                      label={item.label}
                      pathname={pathname}
                      compact={compact}
                      onNavigate={onNavigate}
                      isDisabled={isDisabled}
                      badge={badge}
                    />
                  )
                })}
              </div>
            </div>
          ))}
        </div>

        <div className={cn("shrink-0", compact ? "px-2 py-3" : "px-4 py-2")}>
          {shouldShowPlanCard ? (
            <div className="mb-2 rounded-[20px] border border-[#D1E9FF] bg-[#EFF8FF] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.95)]">
              <p className="text-[12px] font-bold text-[#0B1220]">Activa tu plan</p>
              <p className="mt-1 text-[10.5px] text-[#667085]">
                {trialDaysLeft > 0 ? `Quedan ${trialDaysLeft} dias de prueba.` : "Gestiona tu plan y desbloquea funciones PRO."}
              </p>
              <Button className="mt-3 h-9 w-full rounded-2xl bg-[#155EEF] text-[12.5px] font-bold text-white shadow-none hover:bg-[#004EEB]" asChild>
                <Link href="/dashboard/facturacion" onClick={onNavigate}>
                  {trialDaysLeft > 0 ? "Activar plan" : "Gestionar plan"}
                </Link>
              </Button>
            </div>
          ) : null}

          <div className="border-t border-[#E4E7EC]" />

          <div className={cn("flex", compact ? "flex-col items-center gap-3" : "items-center justify-between gap-3")}>
            {compact ? (
              <>
                <HelpQuickSheet onStartTour={onStartTour} className="h-12 w-12 rounded-2xl border border-[#E4E7EC] bg-white text-[#667085] hover:bg-[#F8FAFC] hover:text-[#155EEF]" />
                <LogoutButton compact />
              </>
            ) : (
              <>
                <div className="flex items-center gap-2">
                  <HelpQuickSheet onStartTour={onStartTour} className="h-12 w-12 rounded-2xl border border-[#E4E7EC] bg-white text-[#667085] hover:bg-[#F8FAFC] hover:text-[#155EEF]" />
                  <LogoutButton compact />
                </div>
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#155EEF] text-sm font-bold text-white">
                    {initial}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-[12px] font-bold leading-tight text-[#0B1220]">{ownerName || "Usuario activo"}</p>
                    <p className="truncate text-[9.5px] leading-tight text-[#667085]">Super Admin</p>
                  </div>
                  <Link href="/dashboard/configuracion" onClick={onNavigate} className="ml-1 text-[#98A2B3] transition-colors hover:text-[#155EEF]" title="Configuracion">
                    <Settings className="h-4 w-4" />
                  </Link>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
