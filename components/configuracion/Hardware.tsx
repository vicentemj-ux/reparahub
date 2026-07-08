"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import {
  Camera,
  CheckCircle2,
  Copy,
  Cpu,
  Download,
  Eye,
  Globe,
  Key,
  Link as LinkIcon,
  Loader2,
  Lock,
  RotateCcw,
  Save,
  Server,
  UserIcon,
  Video,
  Wifi,
} from "lucide-react"
import { toast } from "@/hooks/use-toast"
import {
  generateGo2RtcConfig,
  getCamaraConfig,
  getCurrentTallerIdPublic,
  rotateHikvisionWebhookToken,
  testHikvisionSnapshot,
  updateCamaraConfig,
} from "@/lib/actions/bitacora-visitas-prisma"
import { cn } from "@/lib/utils"

interface CamaraHikvisionConfig {
  enabled: boolean
  mode: "snapshot" | "event"
  ip: string
  port: number
  username: string
  password: string
  snapshot_channel: string
  webhook_token: string
  event_filter: string[]
  portalUrl: string
  snapshotUrl: string
  snapshotAuthMode: "none" | "basic"
  snapshotRefreshSeconds: number
  rtspUrl: string
  streamName: string
  agentUrl: string
  notes: string
}

const DEFAULT_FILTERS = ["VMD", "linedetection", "fielddetection"]

function defaultConfig(): CamaraHikvisionConfig {
  return {
    enabled: false,
    mode: "event",
    ip: "",
    port: 80,
    username: "",
    password: "",
    snapshot_channel: "101",
    webhook_token: "",
    event_filter: DEFAULT_FILTERS,
    portalUrl: "",
    snapshotUrl: "",
    snapshotAuthMode: "basic",
    snapshotRefreshSeconds: 10,
    rtspUrl: "",
    streamName: "entrada",
    agentUrl: "http://127.0.0.1:1984",
    notes: "",
  }
}

function normalizeConfig(raw: Partial<CamaraHikvisionConfig> | undefined): CamaraHikvisionConfig {
  const base = defaultConfig()
  return {
    ...base,
    ...raw,
    enabled: raw?.enabled ?? base.enabled,
    mode: raw?.mode ?? base.mode,
    port: Number(raw?.port ?? base.port) || base.port,
    password: "",
    snapshot_channel: raw?.snapshot_channel ?? base.snapshot_channel,
    snapshotAuthMode: raw?.snapshotAuthMode ?? base.snapshotAuthMode,
    snapshotRefreshSeconds: Number(raw?.snapshotRefreshSeconds ?? base.snapshotRefreshSeconds) || base.snapshotRefreshSeconds,
    event_filter: Array.isArray(raw?.event_filter) && raw.event_filter.length > 0
      ? raw.event_filter.map((x) => String(x))
      : DEFAULT_FILTERS,
    streamName: raw?.streamName || base.streamName,
    agentUrl: raw?.agentUrl || base.agentUrl,
  }
}

function buildSnapshotPreviewUrl(config: CamaraHikvisionConfig) {
  if (config.snapshotUrl.trim()) return config.snapshotUrl.trim()
  if (!config.ip.trim()) return ""
  const channel = config.snapshot_channel.trim() || "101"
  return `http://${config.ip.trim()}:${Number(config.port) || 80}/ISAPI/Streaming/channels/${channel}/picture`
}

function downloadTextFile(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/yaml;charset=utf-8" })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

function ConfigSection({
  icon: Icon,
  title,
  description,
  children,
  accent = "blue",
}: {
  icon: React.ElementType
  title: string
  description: string
  children: React.ReactNode
  accent?: "blue" | "emerald" | "amber"
}) {
  const styles = {
    blue: "bg-blue-50 text-blue-600 border-blue-100",
    emerald: "bg-emerald-50 text-emerald-700 border-emerald-100",
    amber: "bg-amber-50 text-amber-700 border-amber-100",
  }[accent]

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="mb-4 flex items-start gap-3">
        <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border", styles)}>
          <Icon className="h-5 w-5" aria-hidden />
        </div>
        <div className="min-w-0">
          <h3 className="text-sm font-black uppercase tracking-[0.18em] text-slate-950">{title}</h3>
          <p className="mt-1 max-w-2xl text-sm leading-relaxed text-slate-600">{description}</p>
        </div>
      </div>
      {children}
    </section>
  )
}

export function Hardware({ planTipo, inTrial }: { planTipo: string; inTrial?: boolean }) {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [generatingYaml, setGeneratingYaml] = useState(false)
  const [rotatingToken, setRotatingToken] = useState(false)
  const [tallerId, setTallerId] = useState<string | null>(null)
  const [config, setConfig] = useState<CamaraHikvisionConfig>(() => defaultConfig())
  const [origin, setOrigin] = useState("")
  const [snapshotPreview, setSnapshotPreview] = useState<string | null>(null)
  const [hasStoredPassword, setHasStoredPassword] = useState(false)

  useEffect(() => {
    if (typeof window !== "undefined") setOrigin(window.location.origin)
  }, [])

  useEffect(() => {
    let cancelled = false
    getCurrentTallerIdPublic().then((id) => {
      if (cancelled) return
      setTallerId(id)
      if (!id) {
        setLoading(false)
        return
      }
      getCamaraConfig(id).then(({ config: c }) => {
        if (cancelled) return
        const hv = (c?.hikvision as Partial<CamaraHikvisionConfig>) || {}
        setHasStoredPassword(Boolean(hv.password))
        setConfig(normalizeConfig(hv))
        setLoading(false)
      })
    })
    return () => { cancelled = true }
  }, [])

  const webhookUrl = useMemo(() => (
    config.webhook_token.trim() && origin
      ? `${origin}/api/alarms/hikvision/${config.webhook_token.trim()}`
      : ""
  ), [config.webhook_token, origin])

  const snapshotUrl = useMemo(() => buildSnapshotPreviewUrl(config), [config])
  const isLocked = planTipo !== "activo" && !inTrial

  function setField<K extends keyof CamaraHikvisionConfig>(key: K, value: CamaraHikvisionConfig[K]) {
    setConfig((prev) => ({ ...prev, [key]: value }))
  }

  function ensureLocalToken() {
    if (config.webhook_token.trim()) return
    const token = typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : `hv-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
    setField("webhook_token", token)
  }

  async function copy(text: string, label: string) {
    if (!text) return
    await navigator.clipboard.writeText(text)
    toast.success(`${label} copiado`)
  }

  async function handleSave() {
    if (!tallerId) return
    setSaving(true)
    const { success, error } = await updateCamaraConfig(tallerId, { hikvision: config })
    setSaving(false)
    if (!success) {
      toast.error(error || "Error al guardar configuracion")
      return
    }
    setHasStoredPassword(hasStoredPassword || Boolean(config.password.trim()))
    setConfig((prev) => ({ ...prev, password: "" }))
    toast.success("Hardware guardado")
  }

  async function handleRotateToken() {
    if (!tallerId) return
    setRotatingToken(true)
    const result = await rotateHikvisionWebhookToken(tallerId)
    setRotatingToken(false)
    if (!result.success || !result.token) {
      toast.error(result.error || "No se pudo regenerar el token")
      return
    }
    setField("webhook_token", result.token)
    toast.success("Token regenerado")
  }

  async function handleTestSnapshot() {
    if (!tallerId) return
    setTesting(true)
    setSnapshotPreview(null)
    const result = await testHikvisionSnapshot(tallerId, config)
    setTesting(false)
    if (!result.success || !result.imageDataUrl) {
      toast.error(result.error || "No se pudo obtener snapshot")
      return
    }
    setSnapshotPreview(result.imageDataUrl)
    toast.success("Snapshot recibido")
  }

  async function handleDownloadYaml() {
    if (!tallerId) return
    setGeneratingYaml(true)
    const result = await generateGo2RtcConfig(tallerId, config)
    setGeneratingYaml(false)
    if (!result.success || !result.yaml) {
      toast.error(result.error || "No se pudo generar go2rtc.yaml")
      return
    }
    downloadTextFile(result.filename, result.yaml)
    toast.success("go2rtc.yaml descargado")
  }

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" aria-hidden />
      </div>
    )
  }

  if (!tallerId) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center">
        <Lock className="mx-auto mb-3 h-8 w-8 text-slate-300" />
        <p className="text-sm font-bold text-slate-600">Inicia sesion para configurar hardware</p>
      </div>
    )
  }

  return (
    <div className="relative space-y-5">
      {isLocked && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 rounded-3xl bg-white/85 px-6 text-center backdrop-blur-[2px]">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 shadow-sm">
            <Lock className="h-7 w-7 text-amber-600" />
          </div>
          <div>
            <p className="font-bold text-slate-800">Plan PRO requerido</p>
            <p className="mt-1 max-w-sm text-sm text-slate-500">
              La deteccion automatica de visitas y camaras IP forma parte de las herramientas PRO.
            </p>
          </div>
          <Button asChild size="sm" className="rounded-xl bg-amber-500 px-5 font-semibold text-white hover:bg-amber-600">
            <Link href="/dashboard/facturacion">Ver planes</Link>
          </Button>
        </div>
      )}

      <div className={isLocked ? "pointer-events-none select-none opacity-40" : ""}>
        <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-600/20">
                <Cpu className="h-6 w-6" aria-hidden />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-xl font-black italic tracking-tight text-slate-950 sm:text-2xl">HARDWARE</h1>
                  <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-amber-800">PRO</span>
                </div>
                <p className="mt-1 max-w-3xl text-sm leading-relaxed text-slate-600">
                  Configura camaras IP para que la bitacora registre visitas automaticamente. El webhook recibe la deteccion y el snapshot ISAPI toma la evidencia.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <span className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">Deteccion</span>
              <Switch checked={config.enabled} onCheckedChange={(v) => setField("enabled", v)} />
            </div>
          </div>
        </div>

        <div className="grid gap-5 xl:grid-cols-[1fr_1fr]">
          <ConfigSection
            icon={Wifi}
            title="Deteccion automatica"
            description="Copia esta URL en Alarm Server de Hikvision. Cada evento valido crea una visita pendiente en la bitacora."
          >
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-black uppercase tracking-wider text-slate-500">URL Webhook</Label>
                  <Input value={webhookUrl} readOnly placeholder="Genera un token para ver la URL" className="h-11 rounded-xl bg-slate-50 text-xs sm:text-sm" />
                </div>
                <div className="flex items-end gap-2">
                  <Button type="button" variant="outline" className="h-11 rounded-xl" onClick={ensureLocalToken}>
                    <Key className="h-4 w-4" />
                    Generar
                  </Button>
                  <Button type="button" variant="outline" className="h-11 rounded-xl" disabled={!webhookUrl} onClick={() => copy(webhookUrl, "Webhook")}>
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button type="button" variant="outline" className="h-11 rounded-xl text-amber-700" disabled={rotatingToken} onClick={handleRotateToken}>
                    {rotatingToken ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-black uppercase tracking-wider text-slate-500">Modo</Label>
                  <select
                    value={config.mode}
                    onChange={(e) => setField("mode", e.target.value as CamaraHikvisionConfig["mode"])}
                    className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-800 shadow-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                  >
                    <option value="event">Hikvision por webhook</option>
                    <option value="snapshot">Webcam local experimental</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-black uppercase tracking-wider text-slate-500">Eventos permitidos</Label>
                  <Input
                    value={config.event_filter.join(",")}
                    onChange={(e) => setField("event_filter", e.target.value.split(",").map((x) => x.trim()).filter(Boolean))}
                    placeholder="VMD,linedetection,fielddetection"
                    className="h-11 rounded-xl"
                  />
                </div>
              </div>

              <div className="rounded-2xl border border-blue-100 bg-blue-50 p-3 text-xs leading-relaxed text-blue-900">
                En Hikvision activa Notify Surveillance Center o HTTP Host. El sistema ignora eventos inactivos y eventos fuera del filtro.
              </div>
            </div>
          </ConfigSection>

          <ConfigSection
            icon={Eye}
            title="Snapshot de evidencia"
            description="El snapshot se usa como foto de entrada cuando la camara dispara un evento. No es video, es una imagen fija."
            accent="emerald"
          >
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-black uppercase tracking-wider text-slate-500">IP o host local</Label>
                  <div className="relative">
                    <Globe className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <Input value={config.ip} onChange={(e) => setField("ip", e.target.value)} placeholder="192.168.1.100" className="h-11 rounded-xl pl-9" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-black uppercase tracking-wider text-slate-500">Puerto</Label>
                    <Input value={config.port} onChange={(e) => setField("port", Number(e.target.value) || 80)} type="number" min={1} max={65535} className="h-11 rounded-xl" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-black uppercase tracking-wider text-slate-500">Canal</Label>
                    <Input value={config.snapshot_channel} onChange={(e) => setField("snapshot_channel", e.target.value)} placeholder="101" className="h-11 rounded-xl" />
                  </div>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-black uppercase tracking-wider text-slate-500">Usuario</Label>
                  <div className="relative">
                    <UserIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <Input value={config.username} onChange={(e) => setField("username", e.target.value)} placeholder="admin" className="h-11 rounded-xl pl-9" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-black uppercase tracking-wider text-slate-500">Contrasena</Label>
                  <div className="relative">
                    <Key className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <Input
                      type="password"
                      value={config.password}
                      onChange={(e) => setField("password", e.target.value)}
                      placeholder={hasStoredPassword ? "Guardada, escribe solo para cambiar" : "Contrasena de la camara"}
                      className="h-11 rounded-xl pl-9"
                    />
                  </div>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-[1fr_180px]">
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-black uppercase tracking-wider text-slate-500">Snapshot JPEG opcional</Label>
                  <Input value={config.snapshotUrl} onChange={(e) => setField("snapshotUrl", e.target.value)} placeholder={snapshotUrl || "http://.../snapshot.jpg"} className="h-11 rounded-xl" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-black uppercase tracking-wider text-slate-500">Refresco</Label>
                  <Input value={config.snapshotRefreshSeconds} onChange={(e) => setField("snapshotRefreshSeconds", Number(e.target.value) || 10)} type="number" min={3} className="h-11 rounded-xl" />
                </div>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <Button type="button" variant="outline" className="h-11 rounded-xl" disabled={testing} onClick={handleTestSnapshot}>
                  {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
                  Probar snapshot
                </Button>
                <p className="text-xs text-slate-500">La prueba se ejecuta en servidor y no muestra la contrasena en el navegador.</p>
              </div>

              {snapshotPreview ? (
                <div className="overflow-hidden rounded-2xl border border-emerald-200 bg-emerald-50 p-2">
                  <img src={snapshotPreview} alt="Snapshot de prueba" className="max-h-56 w-full rounded-xl object-contain bg-white" />
                </div>
              ) : null}
            </div>
          </ConfigSection>
        </div>

        <ConfigSection
          icon={Video}
          title="Video RTSP avanzado"
          description="Opcional. Sirve para preparar go2rtc en una PC local si despues quieres ver video en vivo dentro del sistema."
          accent="amber"
        >
          <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase tracking-wider text-slate-500">Fuente RTSP</Label>
                <Input value={config.rtspUrl} onChange={(e) => setField("rtspUrl", e.target.value)} placeholder="rtsp://192.168.1.100:554/Streaming/Channels/101" className="h-11 rounded-xl" />
                <p className="text-xs text-slate-500">Si incluye usuario y contrasena, el YAML tambien los incluira. Guardalo solo en la PC del local.</p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-black uppercase tracking-wider text-slate-500">Nombre del stream</Label>
                  <Input value={config.streamName} onChange={(e) => setField("streamName", e.target.value)} placeholder="entrada" className="h-11 rounded-xl" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-black uppercase tracking-wider text-slate-500">URL agente go2rtc</Label>
                  <Input value={config.agentUrl} onChange={(e) => setField("agentUrl", e.target.value)} placeholder="http://127.0.0.1:1984" className="h-11 rounded-xl" />
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
              <div className="flex items-start gap-3">
                <Server className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
                <div>
                  <p className="text-sm font-black text-amber-950">Configuracion manual</p>
                  <p className="mt-1 text-xs leading-relaxed text-amber-900">
                    Descarga `go2rtc.yaml`, instala go2rtc en la PC del taller y ejecuta `go2rtc -config go2rtc.yaml`.
                  </p>
                </div>
              </div>
              <Button type="button" className="mt-4 h-11 w-full rounded-xl bg-amber-500 font-bold text-white hover:bg-amber-600" disabled={generatingYaml} onClick={handleDownloadYaml}>
                {generatingYaml ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                Descargar go2rtc.yaml
              </Button>
            </div>
          </div>
        </ConfigSection>

        <ConfigSection
          icon={LinkIcon}
          title="Portal y notas"
          description="Guarda accesos de referencia para el personal. Estos enlaces no se publican al cliente."
        >
          <div className="grid gap-3 lg:grid-cols-[1fr_1fr]">
            <div className="space-y-1.5">
              <Label className="text-[10px] font-black uppercase tracking-wider text-slate-500">Portal NVR o app del fabricante</Label>
              <Input value={config.portalUrl} onChange={(e) => setField("portalUrl", e.target.value)} placeholder="https://..." className="h-11 rounded-xl" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10px] font-black uppercase tracking-wider text-slate-500">Notas internas</Label>
              <Input value={config.notes} onChange={(e) => setField("notes", e.target.value)} placeholder="Entrada, mostrador, zona configurada..." className="h-11 rounded-xl" />
            </div>
          </div>
        </ConfigSection>

        <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
            <p className="text-sm leading-relaxed text-slate-600">
              Registro manual sigue disponible en Bitacora de Visitas aunque la camara este apagada o sin conexion.
            </p>
          </div>
          <Button onClick={() => void handleSave()} disabled={saving} className="btn-glow h-11 rounded-2xl bg-blue-600 px-6 text-xs font-black uppercase tracking-wider text-white hover:bg-blue-700">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Guardar configuracion
          </Button>
        </div>
      </div>
    </div>
  )
}
