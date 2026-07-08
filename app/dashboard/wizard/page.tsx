"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2, Store, Phone, Globe } from "lucide-react"
import { checkWizardNeeded, completeWizard, getWizardSettings } from "@/lib/actions/wizard-prisma"
import { PAISES, type PaisInfo } from "@/lib/constants/paises"
import { toast } from "@/hooks/use-toast"

const TIMEZONES = [
  { value: "America/Mexico_City", label: "Ciudad de Mexico (GMT-6)" },
  { value: "America/Monterrey", label: "Monterrey (GMT-6)" },
  { value: "America/Guadalajara", label: "Guadalajara (GMT-6)" },
  { value: "America/Cancun", label: "Cancun (GMT-5)" },
  { value: "America/Tijuana", label: "Tijuana (GMT-8)" },
  { value: "America/Hermosillo", label: "Hermosillo (GMT-7)" },
  { value: "America/Mazatlan", label: "Mazatlan (GMT-7)" },
  { value: "America/Merida", label: "Merida (GMT-6)" },
  { value: "America/Montevideo", label: "Montevideo (GMT-3)" },
  { value: "America/Buenos_Aires", label: "Buenos Aires (GMT-3)" },
  { value: "America/Bogota", label: "Bogota (GMT-5)" },
  { value: "America/Lima", label: "Lima (GMT-5)" },
  { value: "America/Santiago", label: "Santiago (GMT-4)" },
  { value: "America/Sao_Paulo", label: "Sao Paulo (GMT-3)" },
  { value: "UTC", label: "UTC" },
]

export default function WizardPage() {
  const router = useRouter()
  const [checking, setChecking] = useState(true)
  const [nombreTaller, setNombreTaller] = useState("")
  const [pais, setPais] = useState("")
  const [telefono, setTelefono] = useState("")
  const [zonaHoraria, setZonaHoraria] = useState("America/Mexico_City")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    const init = async () => {
      const needed = await checkWizardNeeded()
      if (!needed) { router.replace("/dashboard"); return }
      const prefill = await getWizardSettings()
      if (prefill.nombreTaller) setNombreTaller(prefill.nombreTaller)
      if (prefill.telefono) setTelefono(prefill.telefono)
      if (prefill.pais) setPais(prefill.pais)
      if (prefill.zonaHoraria) setZonaHoraria(prefill.zonaHoraria)
      setChecking(false)
    }
    init()
  }, [router])

  const codigoPais = PAISES.find((p) => p.nombre === pais)?.codigoTelefono

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!nombreTaller.trim()) { setError("El nombre del taller es obligatorio"); return }
    if (!pais.trim()) { setError("Selecciona tu pais para continuar"); return }
    if (!telefono.trim()) { setError("El telefono es obligatorio"); return }
    if (!codigoPais) { setError("El pais seleccionado no tiene un codigo telefonico valido"); return }
    setSaving(true)
    setError("")
    const result = await completeWizard({
      nombreTaller: nombreTaller.trim(),
      telefono: `${codigoPais}${telefono.trim()}`,
      pais,
      zonaHoraria,
    })
    setSaving(false)
    if (result.success) {
      toast({ title: "Bienvenido a ReparaHub", description: "Configuracion inicial guardada" })
      // Hard redirect to force full page reload and bypass layout guard timing issues
      window.location.href = "/dashboard"
    } else {
      setError(result.error || "Error al guardar")
    }
  }

  if (checking) {
    return (
      <div className="min-h-screen bg-dashboard-surface flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-black italic uppercase tracking-tight text-blue-600">
            ReparaHub
          </h1>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400 mt-2">
            Configuracion inicial del taller
          </p>
        </div>

        <form onSubmit={handleSubmit} className="rounded-3xl bg-white border border-slate-100 shadow-sm p-8 space-y-6">
          <div className="space-y-2">
            <Label className="text-xs font-black uppercase tracking-wider text-slate-500">
              <Store className="h-3.5 w-3.5 inline mr-1" />
              Nombre del taller
            </Label>
            <Input
              value={nombreTaller}
              onChange={(e) => { setNombreTaller(e.target.value); setError("") }}
              placeholder="Ej: Taller Garcia Reparaciones"
              className="h-11 rounded-xl"
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-black uppercase tracking-wider text-slate-500">
              <Globe className="h-3.5 w-3.5 inline mr-1" />
              Pais
            </Label>
            <Select value={pais} onValueChange={(v) => { setPais(v); setError("") }}>
              <SelectTrigger className="h-11 rounded-xl">
                <SelectValue placeholder="Selecciona tu pais" />
              </SelectTrigger>
              <SelectContent>
                {PAISES.map((p: PaisInfo) => (
                  <SelectItem key={p.nombre} value={p.nombre}>
                    {p.nombre} (+{p.codigoTelefono})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[10px] text-slate-400">Define la region para formatos de telefono y WhatsApp</p>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-black uppercase tracking-wider text-slate-500">
              <Phone className="h-3.5 w-3.5 inline mr-1" />
              Telefono del taller
            </Label>
            <div className="flex gap-2">
              <div className="flex h-11 shrink-0 items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-medium text-slate-600">
                <span>{codigoPais ? `+${codigoPais}` : "+?"}</span>
              </div>
              <Input
                value={telefono}
                onChange={(e) => { setTelefono(e.target.value); setError("") }}
                placeholder="Ej: 5512345678"
                className="h-11 rounded-xl flex-1"
                type="tel"
              />
            </div>
            <p className="text-[10px] text-slate-400">
              {codigoPais
                ? `Numero sin el prefijo del pais (el codigo +${codigoPais} se agregara automaticamente)`
                : "Selecciona primero un pais para ver el prefijo telefonico"}
            </p>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-black uppercase tracking-wider text-slate-500">
              <Globe className="h-3.5 w-3.5 inline mr-1" />
              Zona horaria
            </Label>
            <Select value={zonaHoraria} onValueChange={setZonaHoraria}>
              <SelectTrigger className="h-11 rounded-xl">
                <SelectValue placeholder="Selecciona tu zona horaria" />
              </SelectTrigger>
              <SelectContent>
                {TIMEZONES.map((tz) => (
                  <SelectItem key={tz.value} value={tz.value}>{tz.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[10px] text-slate-400">Afecta reportes, cortes de caja y recordatorios</p>
          </div>

          {error && (
            <p className="text-xs text-red-500 font-medium">{error}</p>
          )}

          <Button
            type="submit"
            disabled={saving}
            className="w-full h-12 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-black uppercase tracking-wider text-sm btn-glow"
          >
            {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : "Guardar y comenzar"}
          </Button>
        </form>
      </div>
    </div>
  )
}
