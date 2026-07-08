import { OrdersTable } from "@/components/dashboard/orders-table"
import { getDashboardMvpData } from "@/lib/actions/dashboard-prisma"
import { getDashboardSubscriptionBannerContext } from "@/lib/actions/settings-prisma"
import { REPAIR_URGENCY_DAYS } from "@/lib/constants/repair-urgency"
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Clock3,
  CreditCard,
  Globe,
  ListChecks,
  Package,
  PhoneCall,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  TrendingUp,
  Users,
  WalletCards,
  Wrench,
} from "lucide-react"
import Image from "next/image"
import Link from "next/link"

export const dynamic = "force-dynamic"

export default async function DashboardPage() {
  let dashboardData: Awaited<ReturnType<typeof getDashboardMvpData>>
  let subCtx: Awaited<ReturnType<typeof getDashboardSubscriptionBannerContext>>

  try {
    ;[dashboardData, subCtx] = await Promise.all([
      getDashboardMvpData(),
      getDashboardSubscriptionBannerContext(),
    ])
  } catch (error) {
    console.error("[dashboard] failed", {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    })
    dashboardData = {
      stats: {
        reparacionesTotales: 0,
        recibidas: 0,
        diagnostico: 0,
        enReparacion: 0,
        esperandoRefaccion: 0,
        listas: 0,
        entregadas: 0,
        urgentes: 0,
        ingresosBasicosMes: 0,
      },
      orders: [],
      cashSummary: {
        cajaAbierta: false,
        ventasDia: 0,
        operacionesDia: 0,
        efectivoEnCaja: 0,
        apertura: 0,
      },
      agenda: [],
      firstSteps: {
        settingsReady: false,
        cashReady: false,
        inventoryReady: false,
        repairReady: false,
        clientOrVisitReady: false,
        communicationReady: false,
      },
    }
    subCtx = {
      showBanner: true,
      isPro: false,
      planTipo: "activo",
      diasRestantes: 0,
      tieneVencimiento: false,
      precioPlanMensual: null,
      zonaHoraria: null,
    }
  }

  const activeRepairs = dashboardData.stats.diagnostico + dashboardData.stats.enReparacion
  const waitingParts = dashboardData.stats.esperandoRefaccion
  const queueToday = dashboardData.stats.recibidas
  const stats = {
    enProceso: activeRepairs + queueToday,
    listos: dashboardData.stats.listas,
    ventasMes: dashboardData.stats.ingresosBasicosMes,
    urgentes: dashboardData.stats.urgentes,
  }
  const totalTickets =
    dashboardData.stats.recibidas +
    dashboardData.stats.diagnostico +
    dashboardData.stats.enReparacion +
    dashboardData.stats.esperandoRefaccion +
    dashboardData.stats.listas +
    dashboardData.stats.entregadas
  const safeTicketTotal = Math.max(totalTickets, 1)
  const repairedPct = Math.round((activeRepairs / safeTicketTotal) * 100)
  const readyPct = Math.round((stats.listos / safeTicketTotal) * 100)
  const queuePct = Math.round((queueToday / safeTicketTotal) * 100)
  const waitingPartsPct = Math.round((waitingParts / safeTicketTotal) * 100)
  const urgentPct = Math.round((stats.urgentes / safeTicketTotal) * 100)
  const deliveredPct = Math.max(0, 100 - repairedPct - readyPct - queuePct - waitingPartsPct - urgentPct)
  const showTimezoneBanner = !subCtx.zonaHoraria || subCtx.zonaHoraria === "UTC"
  const todayLabel = new Intl.DateTimeFormat("es-MX", {
    weekday: "short",
    day: "numeric",
    month: "long",
  }).format(new Date())

  const firstStepItems = [
    {
      label: "Configurar taller",
      description: "Nombre, telefono y zona horaria",
      href: "/dashboard/configuracion",
      done: dashboardData.firstSteps.settingsReady,
      icon: Settings,
    },
    {
      label: "Definir fondo de caja",
      description: "Monto inicial por turno",
      href: "/dashboard/configuracion",
      done: dashboardData.firstSteps.cashReady,
      icon: CreditCard,
    },
    {
      label: "Crear primer producto",
      description: "Inventario listo para POS",
      href: "/dashboard/inventario",
      done: dashboardData.firstSteps.inventoryReady,
      icon: Package,
    },
    {
      label: "Crear primera reparacion",
      description: "Folio, tracking y ticket",
      href: "/dashboard/reparaciones/nueva",
      done: dashboardData.firstSteps.repairReady,
      icon: Wrench,
    },
    {
      label: "Registrar cliente o visita",
      description: "Telefono primero, historial despues",
      href: "/dashboard/clientes",
      done: dashboardData.firstSteps.clientOrVisitReady,
      icon: Users,
    },
    {
      label: "Probar WhatsApp o ticket",
      description: "Mensajes, impresora y firma",
      href: "/dashboard/configuracion",
      done: dashboardData.firstSteps.communicationReady,
      icon: PhoneCall,
    },
  ]
  const completedFirstSteps = firstStepItems.filter((item) => item.done).length
  const showFirstSteps = completedFirstSteps < firstStepItems.length
  const todayAgenda = dashboardData.agenda
  const healthItems = [
    {
      label: stats.urgentes > 0 ? `${stats.urgentes} tickets criticos` : "Sin tickets criticos",
      description: stats.urgentes > 0 ? "Requieren atencion prioritaria" : "Todo bajo control",
      healthy: stats.urgentes === 0,
    },
    {
      label: dashboardData.firstSteps.inventoryReady ? "Inventario actualizado" : "Inventario pendiente",
      description: dashboardData.firstSteps.inventoryReady ? "Base lista para POS" : "Agrega productos para vender",
      healthy: dashboardData.firstSteps.inventoryReady,
    },
    {
      label: dashboardData.firstSteps.cashReady ? "Caja en orden" : "Caja por configurar",
      description: dashboardData.firstSteps.cashReady ? "Lista para operar el turno" : "Define fondo inicial",
      healthy: dashboardData.firstSteps.cashReady,
    },
  ]
  const ticketSegments = [
    { color: "#155EEF", label: "En reparacion", value: activeRepairs },
    { color: "#12B76A", label: "Listos para entregar", value: stats.listos },
    { color: "#F79009", label: "En espera / cola", value: queueToday },
    { color: "#06B6D4", label: "Pendientes", value: waitingParts },
    { color: "#F04438", label: "Urgentes", value: stats.urgentes },
    { color: "#D0D5DD", label: "Entregados", value: dashboardData.stats.entregadas },
  ]
  const cashSummary = dashboardData.cashSummary

  return (
    <div className="min-h-screen bg-[#F5F7FA]">
      <div className="flex w-full min-w-0 flex-col gap-3 px-3 pb-4 pt-2 sm:gap-4 sm:px-6 sm:pb-5 sm:pt-3 lg:px-8 xl:px-10 2xl:px-12">
        <header className="rounded-[24px] border border-[#E4E7EC] bg-white px-4 py-3 shadow-[0_16px_44px_rgba(11,18,32,0.06)]">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#EFF8FF] text-[#155EEF]">
              <Image src="/icon.webp" alt="" width={28} height={26} priority className="h-7 w-7 object-contain" />
              </div>
              <div className="min-w-0">
                <h1 className="text-xl font-black italic uppercase tracking-[-0.045em] text-[#0B1220] sm:text-2xl">
                  Vista general
                </h1>
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#667085]">
                  Centro de mando operativo
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex h-10 items-center gap-2 rounded-2xl border border-[#E4E7EC] bg-white px-4 text-sm font-black text-[#0B1220] shadow-sm">
                <span className="capitalize">{todayLabel}</span>
                <CalendarDays className="h-4 w-4 text-[#155EEF]" />
              </div>
              <Link
                href="/dashboard/configuracion"
                className="inline-flex h-10 items-center gap-2 rounded-2xl border border-[#E4E7EC] bg-white px-4 text-sm font-black text-[#0B1220] shadow-sm transition hover:border-[#B2DDFF] hover:bg-[#EFF8FF] hover:text-[#155EEF]"
              >
                <SlidersHorizontal className="h-4 w-4" />
                Personalizar
              </Link>
            </div>
          </div>
        </header>

        {showTimezoneBanner && (
          <section>
            <Link href="/dashboard/configuracion" className="group flex items-center gap-3 rounded-2xl border border-[#E4E7EC] bg-white px-4 py-3 shadow-[0_10px_30px_rgba(11,18,32,0.05)] transition-colors hover:border-[#B2DDFF] hover:bg-[#F8FAFC]">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#EFF8FF]">
                <Globe className="h-4 w-4 text-[#155EEF]" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold uppercase tracking-wider text-[#98A2B3]">Configuracion pendiente</p>
                <p className="text-sm font-semibold text-[#0B1220]">Configura tu zona horaria</p>
              </div>
              <ArrowRight className="h-4 w-4 shrink-0 text-[#98A2B3] transition-colors group-hover:text-[#155EEF]" />
            </Link>
          </section>
        )}

        {showFirstSteps && (
          <section className="rounded-[22px] border border-[#E4E7EC] bg-white p-3 shadow-[0_16px_44px_rgba(11,18,32,0.06)] sm:p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.22em] text-[#98A2B3]">Primeros pasos</p>
                <h2 className="mt-1 text-lg font-black tracking-tight text-[#0B1220]">
                  {completedFirstSteps} de {firstStepItems.length} completados
                </h2>
              </div>
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#EFF8FF] text-[#155EEF]">
                <ListChecks className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
              {firstStepItems.map((item) => {
                const Icon = item.icon
                return (
                  <Link
                    key={item.label}
                    href={item.href}
                    className="group flex items-center gap-3 rounded-2xl border border-[#E4E7EC] bg-[#F8FAFC] px-3 py-2.5 transition hover:border-[#B2DDFF] hover:bg-[#EFF8FF]"
                  >
                    <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${item.done ? "bg-[#ECFDF3] text-[#12B76A]" : "bg-white text-[#667085] ring-1 ring-[#E4E7EC]"}`}>
                      {item.done ? <CheckCircle2 className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-bold text-[#0B1220]">{item.label}</span>
                      <span className="block truncate text-xs text-[#667085]">{item.description}</span>
                    </span>
                  </Link>
                )
              })}
            </div>
          </section>
        )}

        <section
          className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(280px,2fr)_repeat(4,minmax(170px,1fr))]"
          aria-label="Metricas operativas"
        >
          <Link
            href="/dashboard/ventas"
            aria-label="Ver ventas e ingresos del mes"
            className="group relative min-h-[132px] overflow-hidden rounded-[24px] bg-gradient-to-br from-[#155EEF] via-[#155EEF] to-[#004EEB] p-4 text-white shadow-xl shadow-[rgba(21,94,239,0.20)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-2xl hover:shadow-[rgba(21,94,239,0.30)] sm:col-span-2 xl:col-span-1"
          >
            <div className="pointer-events-none absolute -right-10 bottom-0 h-28 w-52 rotate-[-18deg] rounded-[44px] bg-blue-50" />
            <div className="pointer-events-none absolute bottom-7 right-6 h-16 w-16 rounded-full bg-[#06B6D4]/25 blur-2xl" />
            <div className="relative z-10 flex h-full flex-col justify-between gap-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-100 backdrop-blur-sm">
                  <TrendingUp className="h-4 w-4 text-white" />
                </div>
                <span className="text-xs font-bold uppercase tracking-widest text-[#D1E9FF]">
                  Ingresos del Mes
                </span>
              </div>
              <div>
                <p className="text-3xl font-black tabular-nums leading-none tracking-tight sm:text-4xl">
                  ${stats.ventasMes.toLocaleString("es-MX")}
                </p>
                <p className="mt-1 text-sm text-[#D1E9FF]/90">
                  Ventas brutas registradas este mes
                </p>
              </div>
              <div className="flex items-center gap-1.5 text-sm font-black text-white">
                Ver ventas <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
              </div>
            </div>
          </Link>

          <DashboardMetricCard
            href="/dashboard/reparaciones?filter=queue"
            title="En reparacion"
            value={activeRepairs}
            helper="Trabajos activos"
            cta="Ver reparaciones"
            icon={<Wrench className="h-5 w-5" />}
            tone="blue"
          />
          <DashboardMetricCard
            href="/dashboard/reparaciones"
            title="Listos para entregar"
            value={stats.listos}
            helper="Esperando al cliente"
            cta="Ver lista"
            icon={<CheckCircle2 className="h-5 w-5" />}
            tone="success"
          />
          <DashboardMetricCard
            href="/dashboard/reparaciones?filter=critical"
            title="Urgentes"
            value={stats.urgentes}
            helper={`Requieren atencion (${REPAIR_URGENCY_DAYS}+ dias)`}
            cta="Ver urgentes"
            icon={<AlertTriangle className="h-5 w-5" />}
            tone="danger"
          />
          <DashboardMetricCard
            href="/dashboard/reparaciones?filter=waiting-parts"
            title="Pendientes"
            value={waitingParts}
            helper="Bloqueados por proveedor"
            cta="Ver pendientes"
            icon={<Clock3 className="h-5 w-5" />}
            tone="warning"
          />
        </section>

        <section className="grid gap-4 xl:grid-cols-[minmax(0,1.55fr)_minmax(340px,0.95fr)]">
          <div aria-labelledby="dashboard-actividad-heading">
            <h2 id="dashboard-actividad-heading" className="sr-only">
              Actividad reciente de reparaciones
            </h2>
            <OrdersTable orders={dashboardData.orders} />
          </div>

          <div className="grid gap-4">
            <section className="rounded-[22px] border border-[#E4E7EC] bg-white p-4 shadow-[0_16px_44px_rgba(11,18,32,0.06)]">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <WalletCards className="h-5 w-5 text-[#155EEF]" />
                  <h2 className="text-base font-black tracking-tight text-[#0B1220]">Resumen de caja</h2>
                </div>
                <Link href="/dashboard/historial-ventas" className="text-sm font-black text-[#155EEF] hover:text-[#004EEB]">
                  Ver cortes
                </Link>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#667085]">Ventas del dia</p>
                  <p className="mt-1 text-2xl font-black tabular-nums text-[#12B76A]">${cashSummary.ventasDia.toLocaleString("es-MX")}</p>
                  <p className="text-sm font-medium text-[#667085]">{cashSummary.operacionesDia} operaciones</p>
                </div>
                <div className="border-l border-[#E4E7EC] pl-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#667085]">Efectivo en caja</p>
                  <p className="mt-1 text-2xl font-black tabular-nums text-[#0B1220]">${cashSummary.efectivoEnCaja.toLocaleString("es-MX")}</p>
                  <p className="text-sm font-medium text-[#667085]">
                    {cashSummary.cajaAbierta ? `Apertura: $${cashSummary.apertura.toLocaleString("es-MX")}` : "Caja sin abrir"}
                  </p>
                </div>
              </div>
              <Link href="/dashboard/ventas" className="mt-4 flex items-center gap-2 border-t border-[#E4E7EC] pt-3 text-sm font-black text-[#155EEF] hover:text-[#004EEB]">
                Abrir punto de venta (POS) <ArrowRight className="h-4 w-4" />
              </Link>
            </section>

            <section className="rounded-[22px] border border-[#E4E7EC] bg-white p-4 shadow-[0_16px_44px_rgba(11,18,32,0.06)]">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <CalendarDays className="h-5 w-5 text-[#155EEF]" />
                  <h2 className="text-base font-black tracking-tight text-[#0B1220]">Agenda de hoy</h2>
                </div>
                <Link href="/dashboard/reparaciones" className="text-sm font-black text-[#155EEF] hover:text-[#004EEB]">
                  Ver agenda
                </Link>
              </div>
              <div className="mt-3 space-y-2">
                {todayAgenda.length > 0 ? (
                  todayAgenda.map((order, index) => (
                    <Link
                      key={order.id || `${order.folio}-${index}`}
                      href={order.id ? `/dashboard/reparaciones/${order.id}` : "/dashboard/reparaciones"}
                      className="grid grid-cols-[46px_minmax(0,1fr)_auto] items-start gap-3 rounded-2xl px-2 py-1.5 transition hover:bg-[#F8FAFC]"
                    >
                      <span className="text-sm font-black tabular-nums text-[#667085]">
                        {index === 0 ? "Hoy" : `#${index + 1}`}
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-black text-[#0B1220]">{order.device}</span>
                        <span className="block truncate text-sm font-medium text-[#667085]">{order.customer} · {order.problem}</span>
                      </span>
                      <span className="rounded-full border border-[#D1E9FF] bg-[#EFF8FF] px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-[#155EEF]">
                        {order.status || "Activo"}
                      </span>
                    </Link>
                  ))
                ) : (
                  <div className="rounded-2xl border border-dashed border-[#E4E7EC] px-4 py-8 text-center text-sm font-medium text-[#667085]">
                    Sin agenda operativa por ahora.
                  </div>
                )}
              </div>
            </section>
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.85fr)]">
          <div className="rounded-[22px] border border-[#E4E7EC] bg-white p-4 shadow-[0_16px_44px_rgba(11,18,32,0.06)]">
            <div className="flex items-center gap-3">
              <Activity className="h-5 w-5 text-[#155EEF]" />
              <h2 className="text-base font-black tracking-tight text-[#0B1220]">Tickets por estado</h2>
            </div>
            <div className="mt-3 grid gap-4 sm:grid-cols-[140px_minmax(0,1fr)] sm:items-center">
              <div
                className="mx-auto flex h-28 w-28 items-center justify-center rounded-full"
                style={{
                  background: `conic-gradient(#155EEF 0 ${repairedPct}%, #12B76A ${repairedPct}% ${repairedPct + readyPct}%, #F79009 ${repairedPct + readyPct}% ${repairedPct + readyPct + queuePct}%, #06B6D4 ${repairedPct + readyPct + queuePct}% ${repairedPct + readyPct + queuePct + waitingPartsPct}%, #F04438 ${repairedPct + readyPct + queuePct + waitingPartsPct}% ${repairedPct + readyPct + queuePct + waitingPartsPct + urgentPct}%, #D0D5DD ${repairedPct + readyPct + queuePct + waitingPartsPct + urgentPct}% ${repairedPct + readyPct + queuePct + waitingPartsPct + urgentPct + deliveredPct}%)`,
                }}
              >
                <div className="flex h-20 w-20 flex-col items-center justify-center rounded-full bg-white shadow-inner">
                  <span className="text-xl font-black tabular-nums text-[#0B1220]">{totalTickets}</span>
                  <span className="text-xs font-bold text-[#667085]">Total</span>
                </div>
              </div>
              <div className="grid gap-2">
                {ticketSegments.map((segment) => (
                  <div key={segment.label} className="flex items-center justify-between gap-3 text-sm">
                    <span className="flex items-center gap-2 font-medium text-[#667085]">
                      <span className="h-3 w-3 rounded-full" style={{ backgroundColor: segment.color }} />
                      {segment.label}
                    </span>
                    <span className="font-black tabular-nums text-[#0B1220]">{segment.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="rounded-[22px] border border-[#E4E7EC] bg-white p-4 shadow-[0_16px_44px_rgba(11,18,32,0.06)]">
            <div className="flex items-center gap-3">
              <ShieldCheck className="h-5 w-5 text-[#155EEF]" />
              <h2 className="text-base font-black tracking-tight text-[#0B1220]">Salud del taller</h2>
            </div>
            <div className="mt-3 space-y-3">
              {healthItems.map((item) => (
                <div key={item.label} className="flex items-start gap-3">
                  <span className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${item.healthy ? "bg-[#ECFDF3] text-[#12B76A]" : "bg-[#FFFAEB] text-[#F79009]"}`}>
                    {item.healthy ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
                  </span>
                  <span>
                    <span className="block text-sm font-black text-[#0B1220]">{item.label}</span>
                    <span className="block text-sm font-medium text-[#667085]">{item.description}</span>
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}

function DashboardMetricCard({
  href,
  title,
  value,
  helper,
  cta,
  icon,
  tone,
}: {
  href: string
  title: string
  value: number
  helper: string
  cta: string
  icon: React.ReactNode
  tone: "blue" | "success" | "danger" | "warning"
}) {
  const tones = {
    blue: {
      card: "border-[#D1E9FF] bg-white hover:border-[#84CAFF]",
      icon: "bg-[#EFF8FF] text-[#155EEF]",
      title: "text-[#344054]",
      link: "text-[#155EEF]",
    },
    success: {
      card: "border-[#ABEFC6] bg-[linear-gradient(135deg,#ECFDF3,#FFFFFF)] hover:border-[#75E0A7]",
      icon: "bg-[#D1FADF] text-[#12B76A]",
      title: "text-[#027A48]",
      link: "text-[#027A48]",
    },
    danger: {
      card: "border-[#FECDCA] bg-[linear-gradient(135deg,#FEF3F2,#FFFFFF)] hover:border-[#FDA29B]",
      icon: "bg-[#FEE4E2] text-[#F04438]",
      title: "text-[#B42318]",
      link: "text-[#B42318]",
    },
    warning: {
      card: "border-[#FEDF89] bg-[linear-gradient(135deg,#FFFAEB,#FFFFFF)] hover:border-[#FDB022]",
      icon: "bg-[#FEF0C7] text-[#F79009]",
      title: "text-[#B54708]",
      link: "text-[#B54708]",
    },
  }[tone]

  return (
    <Link
      href={href}
      className={`group min-h-[132px] rounded-[24px] border p-4 shadow-[0_16px_44px_rgba(11,18,32,0.06)] transition hover:-translate-y-0.5 ${tones.card}`}
    >
      <div className="flex h-full flex-col justify-between gap-3">
        <div className={`flex h-8 w-8 items-center justify-center rounded-xl ${tones.icon}`}>
          {icon}
        </div>
        <div>
          <p className={`text-xs font-black uppercase tracking-[0.16em] ${tones.title}`}>{title}</p>
          <p className="mt-2 text-3xl font-black tabular-nums leading-none text-[#0B1220]">{value}</p>
          <p className="mt-1 text-sm font-medium text-[#667085]">{helper}</p>
        </div>
        <div className={`flex items-center gap-1.5 text-sm font-black ${tones.link}`}>
          {cta} <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
        </div>
      </div>
    </Link>
  )
}
