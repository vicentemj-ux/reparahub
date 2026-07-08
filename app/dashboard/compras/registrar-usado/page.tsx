"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "@/hooks/use-toast"
import { registrarCompraUsado } from "@/lib/actions/compras-usado-prisma"
import {
  ArrowLeft, FileText, MonitorSmartphone, Search,
  User, DollarSign, ShieldAlert, Loader2,
} from "lucide-react"
import { ModuleHeader } from "@/components/dashboard/module-header"

export default function RegistrarCompraUsadoPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    vendedor: "",
    documento: "",
    telefono: "",
    marca: "",
    modelo: "",
    serial: "",
    imei: "",
    color: "",
    condicion: "Usado",
    capacidad: "",
    monto: "",
    observaciones: "",
  })

  const patch = (key: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const handleSubmit = async () => {
    if (!form.vendedor || !form.documento || !form.marca || !form.modelo || !form.monto) {
      toast({ variant: "destructive", title: "Faltan campos obligatorios" })
      return
    }

    const montoNum = Number(form.monto)
    if (!Number.isFinite(montoNum) || montoNum <= 0) {
      toast({ variant: "destructive", title: "El monto debe ser mayor a 0" })
      return
    }

    setLoading(true)
    const result = await registrarCompraUsado({
      vendedor: form.vendedor.trim(),
      documento: form.documento.trim(),
      telefono: form.telefono.trim(),
      marca: form.marca.trim(),
      modelo: form.modelo.trim(),
      serial: form.serial.trim() || "—",
      imei: form.imei.trim() || "—",
      color: form.color.trim() || "—",
      condicion: form.condicion.trim() || "—",
      capacidad: form.capacidad.trim() || "—",
      monto: montoNum,
      observaciones: form.observaciones.trim() || undefined,
    })
    setLoading(false)

    if (!result.success) {
      toast({ variant: "destructive", title: "Error", description: result.error || "No se pudo registrar la compra." })
      return
    }

    toast({ title: "Compra registrada", description: `Folio ${result.folio}. Se desconto de caja.` })

    const paramsObject: Record<string, string> = {
      folio: result.folio ?? "",
      fecha: new Date().toLocaleString("es-MX"),
      vendedor: form.vendedor.trim(),
      documento: form.documento.trim(),
      marca: form.marca.trim(),
      modelo: form.modelo.trim(),
      serial: form.serial.trim() || "—",
      imei: form.imei.trim() || "—",
      monto: String(montoNum),
      condicion: form.condicion.trim() || "—",
      color: form.color.trim() || "—",
      capacidad: form.capacidad.trim() || "—",
    }
    if (form.observaciones.trim()) paramsObject.observaciones = form.observaciones.trim()
    const params = new URLSearchParams(paramsObject)
    window.open(`/print-compra?${params.toString()}`, "_blank")

    router.push("/dashboard/compras/usados")
  }

  const inputBase = "h-12 rounded-2xl border-slate-100 bg-slate-50 text-sm font-semibold text-slate-800 placeholder:text-slate-400 placeholder:font-normal focus:border-blue-300 focus:ring-2 focus:ring-blue-500/10 transition-all"
  const labelBase = "text-[10px] font-black uppercase tracking-[0.15em] text-slate-500"

  return (
    <div className="min-h-screen bg-dashboard-surface">
      <div className="w-full px-4 py-6 sm:px-6 lg:px-8 xl:px-10 2xl:px-12">

        <ModuleHeader
          icon={MonitorSmartphone}
          title="COMPRA DE EQUIPO"
          eyebrow="ADQUISICION DE EQUIPOS USADOS A CLIENTES"
          description="Captura vendedor, identidad del equipo y monto para dejar evidencia de compra."
          actions={(
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => router.push("/dashboard/compras/usados")}
                className="flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 transition-colors hover:border-slate-300 hover:text-slate-700"
              >
                <ArrowLeft className="h-4 w-4" />
                Volver
              </button>
              <Button
                onClick={handleSubmit}
                disabled={loading}
                className="h-10 gap-2 rounded-xl bg-blue-600 px-5 text-xs font-black uppercase tracking-wider text-white shadow-sm hover:bg-blue-700 btn-glow"
              >
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                <FileText className="h-4 w-4" />
                Registrar compra
              </Button>
            </div>
          )}
          className="mb-8"
        />

        {/* -- 2-COLUMN LAYOUT -- */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

          {/* -- LEFT: Datos del vendedor -- */}
          <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-6">
              <User className="h-5 w-5 text-blue-600" />
              <h2 className="text-sm font-black italic tracking-tight text-slate-900 uppercase">
                DATOS DEL VENDEDOR
              </h2>
            </div>

            <div className="space-y-5">
              {/* Buscador cliente */}
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                <Input
                  placeholder="Buscar cliente existente..."
                  className={`${inputBase} pl-11`}
                />
              </div>

              <div className="h-px bg-slate-100" />

              {/* Nombre */}
              <div className="space-y-2">
                <Label className={labelBase}>Nombre completo *</Label>
                <Input
                  value={form.vendedor}
                  onChange={(e) => patch("vendedor", e.target.value)}
                  placeholder=""
                  className={inputBase}
                />
              </div>

              {/* Telefono */}
              <div className="space-y-2">
                <Label className={labelBase}>WhatsApp / Telefono</Label>
                <Input
                  value={form.telefono}
                  onChange={(e) => patch("telefono", e.target.value)}
                  placeholder=""
                  className={inputBase}
                />
              </div>

              {/* Documento */}
              <div className="space-y-2">
                <Label className={labelBase}>Documento de identidad (cedula/ID)</Label>
                <Input
                  value={form.documento}
                  onChange={(e) => patch("documento", e.target.value)}
                  placeholder=""
                  className={inputBase}
                />
              </div>
            </div>
          </div>

          {/* -- RIGHT: Detalles del equipo -- */}
          <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-6">
              <MonitorSmartphone className="h-5 w-5 text-blue-600" />
              <h2 className="text-sm font-black italic tracking-tight text-slate-900 uppercase">
                DETALLES DEL EQUIPO
              </h2>
            </div>

            <div className="space-y-5">
              {/* Marca / Modelo */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className={labelBase}>Marca *</Label>
                  <Input
                    value={form.marca}
                    onChange={(e) => patch("marca", e.target.value)}
                    placeholder="Ej: iPhone, Sams..."
                    className={inputBase}
                  />
                </div>
                <div className="space-y-2">
                  <Label className={labelBase}>Modelo *</Label>
                  <Input
                    value={form.modelo}
                    onChange={(e) => patch("modelo", e.target.value)}
                    placeholder="Ej: 13 Pro Max"
                    className={inputBase}
                  />
                </div>
              </div>

              {/* IMEI / Serie */}
              <div className="space-y-2">
                <Label className={labelBase}>IMEI / Serie</Label>
                <Input
                  value={form.imei || form.serial}
                  onChange={(e) => {
                    const val = e.target.value
                    patch("imei", val)
                    patch("serial", val)
                  }}
                  placeholder=""
                  className={inputBase}
                />
              </div>

              {/* Color / Estado */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className={labelBase}>Color</Label>
                  <Input
                    value={form.color}
                    onChange={(e) => patch("color", e.target.value)}
                    placeholder=""
                    className={inputBase}
                  />
                </div>
                <div className="space-y-2">
                  <Label className={labelBase}>Estado</Label>
                  <Input
                    value={form.condicion}
                    onChange={(e) => patch("condicion", e.target.value)}
                    placeholder=""
                    className={inputBase}
                  />
                </div>
              </div>

              {/* Precio de compra */}
              <div className="space-y-2">
                <Label className={`${labelBase} text-blue-600 flex items-center gap-1`}>
                  <DollarSign className="h-3 w-3" />
                  Precio de compra (se descontara de caja) *
                </Label>
                <div className="relative">
                  <span className="absolute left-5 top-1/2 -translate-y-1/2 text-blue-400 font-black text-lg">
                    $
                  </span>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.monto}
                    onChange={(e) => patch("monto", e.target.value)}
                    placeholder="0.00"
                    className="h-14 pl-10 text-xl font-black text-blue-600 border-blue-100 bg-blue-50/40 rounded-2xl focus:border-blue-300 focus:ring-2 focus:ring-blue-500/10"
                  />
                </div>
              </div>

              {/* Observaciones */}
              <div className="space-y-2">
                <Label className={labelBase}>Observaciones tecnicas</Label>
                <Textarea
                  value={form.observaciones}
                  onChange={(e) => patch("observaciones", e.target.value)}
                  placeholder="Cualquier detalle del estado del equipo..."
                  className="min-h-[100px] rounded-2xl border-slate-100 bg-slate-50 text-sm font-semibold text-slate-800 placeholder:text-slate-400 placeholder:font-normal resize-none focus:border-blue-300 focus:ring-2 focus:ring-blue-500/10"
                />
              </div>

              {/* Disclaimer */}
              <div className="rounded-2xl border border-amber-100 bg-amber-50/60 p-4 flex items-start gap-3">
                <ShieldAlert className="h-5 w-5 text-amber-7000 flex-shrink-0 mt-0.5" />
                <p className="text-[10px] font-black uppercase tracking-[0.12em] text-amber-700 leading-relaxed">
                  El registro generara una declaracion jurada de propiedad que el cliente debera firmar fisicamente.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}


