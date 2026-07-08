"use client"

import { useEffect, useState } from "react"
import {
  TallerForAdmin,
  actualizarPlanActivo,
  extendSuscripcion,
  cambiarEstatus,
  resetPasswordAdmin,
  deleteTallerAccount,
} from "@/lib/actions/admin"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { useToast } from "@/hooks/use-toast"
import { X, Loader2, AlertTriangle, CheckCircle2, Ban, Zap, CalendarPlus, KeyRound, Trash2 } from "lucide-react"

interface ManagementPanelProps {
  taller: TallerForAdmin | null
  isOpen: boolean
  onClose: () => void
  onUpdate: () => void
}

// ─── Status badge ─────────────────────────────────────────────────────────────

function PlanBadge({ plan }: { plan: TallerForAdmin["plan_tipo"] }) {
  if (plan === "activo") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-blue-900/40 border border-blue-700 px-2.5 py-0.5 text-xs font-bold text-blue-300">
        <Zap className="h-3 w-3" /> ACTIVO
      </span>
    )
  }
  if (plan === "suspendido") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-red-900/30 border border-red-800 px-2.5 py-0.5 text-xs font-bold text-red-400">
        <Ban className="h-3 w-3" /> SUSPENDIDO
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-amber-900/30 border border-amber-800 px-2.5 py-0.5 text-xs font-bold text-amber-300">
      <CalendarPlus className="h-3 w-3" /> PRUEBA
    </span>
  )
}

// ─── Section wrapper ──────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-100/60 overflow-hidden">
      <div className="px-4 py-2.5 border-b border-slate-200 bg-slate-100">
        <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500">{title}</h3>
      </div>
      <div className="p-4 space-y-2">{children}</div>
    </div>
  )
}

// ─── Panel ────────────────────────────────────────────────────────────────────

export function ManagementPanel({ taller, isOpen, onClose, onUpdate }: ManagementPanelProps) {
  const [loading, setLoading] = useState(false)
  const [feedback, setFeedback] = useState<{ msg: string; ok: boolean } | null>(null)
  const [diasInput, setDiasInput] = useState("")
  const [deleteConfirm, setDeleteConfirm] = useState("")
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [planProActivo, setPlanProActivo] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    setPlanProActivo(Boolean(taller?.plan_activo))
  }, [taller?.id, taller?.plan_activo])

  if (!isOpen || !taller) return null

  const feedback_ok = (msg: string) => {
    setFeedback({ msg, ok: true })
    setTimeout(() => { setFeedback(null); onUpdate() }, 1800)
  }
  const feedback_err = (msg: string) => setFeedback({ msg, ok: false })

  const run = async (fn: () => Promise<void>) => {
    setLoading(true)
    setFeedback(null)
    try { await fn() } finally { setLoading(false) }
  }

  // ── Extend subscription ─────────────────────────────────────────────────
  const handleExtend = async (dias: number) => run(async () => {
    const r = await extendSuscripcion(taller.id, dias)
    if (r.success) {
      const d = r.nuevaFecha ? new Date(r.nuevaFecha).toLocaleDateString("es-MX") : ""
      feedback_ok(`Acceso extendido${taller.plan_tipo === "suspendido" ? " y cuenta reactivada" : ""}. Nuevo vencimiento: ${d}`)
    } else {
      feedback_err(r.error ?? "Error")
    }
  })

  const handleExtendCustom = () => {
    const d = parseInt(diasInput, 10)
    if (!d || d <= 0) { feedback_err("Ingresa un numero de dias valido"); return }
    setDiasInput("")
    handleExtend(d)
  }

  // ── Change status ───────────────────────────────────────────────────────
  const handleActivar = () => run(async () => {
    const r = await cambiarEstatus(taller.id, "activo")
    if (r.success) feedback_ok("Cuenta activada correctamente")
    else feedback_err(r.error ?? "Error")
  })

  const handleSuspender = () => run(async () => {
    const r = await cambiarEstatus(taller.id, "suspendido")
    if (r.success) feedback_ok("Acceso suspendido")
    else feedback_err(r.error ?? "Error")
  })

  // ── Reset password ──────────────────────────────────────────────────────
  const handleReset = () => run(async () => {
    const r = await resetPasswordAdmin(taller.id)
    if (r.success) setFeedback({ msg: "Token generado. Comparte el enlace de recuperacion con el cliente.", ok: true })
    else feedback_err(r.error ?? "Error")
  })

  // ── Delete account ──────────────────────────────────────────────────────
  const handleDelete = () => run(async () => {
    const r = await deleteTallerAccount(taller.id)
    if (r.success) {
      setFeedback({ msg: "Cuenta eliminada", ok: true })
      setTimeout(() => { onClose(); onUpdate() }, 1500)
    } else {
      feedback_err(r.error ?? "Error")
    }
  })

  const handleTogglePro = (checked: boolean) => run(async () => {
    const previous = planProActivo
    setPlanProActivo(checked)
    const r = await actualizarPlanActivo(taller.id, checked)
    if (r.success) {
      toast({
        title: `Plan PRO actualizado para ${taller.nombre_taller}`,
      })
      onUpdate()
    } else {
      setPlanProActivo(previous)
      toast({
        title: "No se pudo actualizar el modo Pro",
        description: r.error ?? "Revisa la consola del servidor o vuelve a intentar.",
        variant: "destructive",
      })
    }
  })

  const diasRestantesLabel =
    taller.dias_restantes === null
      ? "-"
      : taller.dias_restantes <= 0
        ? "Vencido"
        : `${taller.dias_restantes} dias`

  return (
    <div
      className={`fixed right-0 top-0 h-full w-full max-w-sm bg-white border-l border-slate-200 shadow-2xl z-50 flex flex-col transition-transform duration-300 ${
        isOpen ? "translate-x-0" : "translate-x-full"
      }`}
    >
      {/* Header */}
      <div className="flex items-start justify-between p-5 border-b border-slate-200 gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Gestionar taller</p>
          <h2 className="text-base font-bold text-slate-900 truncate">{taller.nombre_taller}</h2>
          <p className="text-xs text-slate-500 truncate">{taller.email}</p>
          <div className="mt-2">
            <PlanBadge plan={taller.plan_tipo} />
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="shrink-0 flex h-8 w-8 items-center justify-center rounded-full hover:bg-slate-100 text-slate-500 hover:text-slate-700 transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        {/* Info */}
        <div className="rounded-xl bg-slate-100/40 border border-slate-200 divide-y divide-slate-700/50 text-sm">
          {[
            ["Propietario", taller.nombre_propietario],
            ["Vencimiento", taller.fecha_vencimiento_plan
              ? new Date(taller.fecha_vencimiento_plan).toLocaleDateString("es-MX")
              : "-"],
            ["Dias restantes", diasRestantesLabel],
          ].map(([label, value]) => (
            <div key={label} className="flex justify-between items-center px-4 py-2.5">
              <span className="text-slate-500">{label}</span>
              <span className={`font-medium ${
                label === "Dias restantes" && taller.dias_restantes !== null && taller.dias_restantes <= 0
                  ? "text-red-400"
                  : taller.dias_restantes !== null && taller.dias_restantes < 3
                    ? "text-amber-400"
                    : "text-slate-700"
              }`}>{value}</span>
            </div>
          ))}
        </div>

        {/* Feedback */}
        {feedback && (
          <div className={`flex items-start gap-2 rounded-lg p-3 text-sm border ${
            feedback.ok
              ? "bg-green-900/20 border-green-800 text-green-300"
              : "bg-red-900/20 border-red-800 text-red-300"
          }`}>
            {feedback.ok
              ? <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
              : <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />}
            {feedback.msg}
          </div>
        )}

        {/* ── Plan privileges ──────────────────────────────────────────── */}
        <Section title="Privilegios de Plan">
          <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-white/90 px-3 py-2.5">
            <div className="space-y-0.5">
              <p className="text-sm font-semibold text-slate-900">Plan PRO Activo</p>
              <p className="text-xs text-slate-500">Habilita Chat, Mercado y reportes avanzados para este taller.</p>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={planProActivo}
                onCheckedChange={handleTogglePro}
                disabled={loading}
                className="data-[state=checked]:bg-violet-600 data-[state=unchecked]:bg-slate-600"
                aria-label="Plan PRO Activo"
              />
            </div>
          </div>
        </Section>

        {/* ── Extend subscription ─────────────────────────────────────── */}
        <Section title="Extender acceso">
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: "+30 dias", days: 30 },
              { label: "+90 dias", days: 90 },
              { label: "+180 dias", days: 180 },
              { label: "+365 dias", days: 365 },
            ].map(({ label, days }) => (
              <Button
                key={days}
                onClick={() => handleExtend(days)}
                disabled={loading}
                size="sm"
                className="bg-blue-700 hover:bg-blue-600 text-white text-xs font-bold"
              >
                {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : label}
              </Button>
            ))}
          </div>
          {/* Custom days input */}
          <div className="flex gap-2 mt-1">
            <Input
              type="number"
              min="1"
              placeholder="Dias personalizados..."
              value={diasInput}
              onChange={(e) => setDiasInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleExtendCustom()}
              disabled={loading}
              className="bg-white border-slate-300 text-slate-900 placeholder:text-slate-400 text-sm h-9"
            />
            <Button
              onClick={handleExtendCustom}
              disabled={loading || !diasInput}
              size="sm"
              className="bg-blue-600 hover:bg-blue-700 text-white shrink-0 h-9"
            >
              + Dias
            </Button>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            Si el taller esta suspendido, extender reactivara el acceso automaticamente.
          </p>
        </Section>

        {/* ── Change status ───────────────────────────────────────────── */}
        <Section title="Estado del acceso">
          <Button
            onClick={handleActivar}
            disabled={loading || taller.plan_tipo === "activo"}
            className="w-full bg-emerald-700 hover:bg-emerald-600 disabled:opacity-40 text-white font-bold gap-2"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
            Activar acceso
          </Button>
          <Button
            onClick={handleSuspender}
            disabled={loading || taller.plan_tipo === "suspendido"}
            className="w-full bg-slate-700 hover:bg-red-900/60 border border-slate-300 hover:border-red-800 disabled:opacity-40 text-slate-700 hover:text-red-300 font-bold gap-2"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Ban className="h-4 w-4" />}
            Suspender acceso
          </Button>
          <p className="text-[11px] text-slate-500">
            Suspender bloquea el acceso de inmediato. Activar sin fecha vigente anade 30 dias por defecto.
          </p>
        </Section>

        {/* ── Security ─────────────────────────────────────────────────── */}
        <Section title="Seguridad">
          <Button
            onClick={handleReset}
            disabled={loading}
            className="w-full bg-purple-700 hover:bg-purple-600 text-white font-bold gap-2"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
            Resetear contrasena
          </Button>
        </Section>

        {/* ── Delete account ───────────────────────────────────────────── */}
        <div className="rounded-xl border border-red-200 bg-red-950/20 overflow-hidden">
          <div className="px-4 py-2.5 border-b border-red-900/40 flex items-center gap-2">
            <AlertTriangle className="h-3.5 w-3.5 text-red-500" />
            <h3 className="text-xs font-bold uppercase tracking-widest text-red-400">Eliminar cuenta</h3>
          </div>
          <div className="p-4 space-y-3">
            {!showDeleteConfirm ? (
              <Button
                onClick={() => setShowDeleteConfirm(true)}
                disabled={loading}
                variant="destructive"
                className="w-full gap-2"
              >
                <Trash2 className="h-4 w-4" />
                Eliminar permanentemente
              </Button>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-red-200">
                  Esta accion es <strong>irreversible</strong>. Se eliminaran todos los datos del taller.
                </p>
                <p className="text-xs text-slate-500">
                  Escribe{" "}
                  <code className="bg-slate-100 px-1.5 py-0.5 rounded text-red-300 font-mono text-xs">
                    {taller.nombre_taller}
                  </code>{" "}
                  para confirmar:
                </p>
                <Input
                  value={deleteConfirm}
                  onChange={(e) => setDeleteConfirm(e.target.value)}
                  placeholder="Nombre del taller..."
                  className="bg-white border-red-200 text-slate-900 placeholder:text-slate-400 text-sm"
                />
                <div className="flex gap-2">
                  <Button
                    onClick={() => { setShowDeleteConfirm(false); setDeleteConfirm("") }}
                    disabled={loading}
                    variant="outline"
                    className="flex-1 border-slate-200 text-slate-600 hover:bg-slate-100"
                  >
                    Cancelar
                  </Button>
                  <Button
                    onClick={handleDelete}
                    disabled={loading || deleteConfirm !== taller.nombre_taller}
                    variant="destructive"
                    className="flex-1 gap-1"
                  >
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                    Confirmar
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
