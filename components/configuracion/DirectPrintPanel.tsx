"use client"

import { useState, useTransition } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "@/hooks/use-toast"
import { Cable, CheckCircle2, Loader2, RefreshCcw, ShieldCheck, TestTube2 } from "lucide-react"
import type { DirectPrintConfig } from "@/lib/printing/direct-print-config"
import { getDaemonHealth, listDaemonPrinters, printEscposWithDaemon, type DaemonPrinter } from "@/lib/printing/daemon-client"
import { buildPosSaleEscposBase64 } from "@/lib/printing/escpos"

interface DirectPrintPanelProps {
  config: DirectPrintConfig
  onChange: (next: DirectPrintConfig) => void
  tenantId?: string
  tallerNombre?: string
  tallerTelefono?: string
}

export function DirectPrintPanel({
  config,
  onChange,
  tenantId = "",
  tallerNombre = "ReparaHub",
  tallerTelefono = "",
}: DirectPrintPanelProps) {
  const [checking, startChecking] = useTransition()
  const [printing, startPrinting] = useTransition()
  const [printers, setPrinters] = useState<DaemonPrinter[]>([])
  const [status, setStatus] = useState<string>("Sin verificar")

  const patch = (partial: Partial<DirectPrintConfig>) => onChange({ ...config, ...partial })

  const handleCheck = () => {
    startChecking(async () => {
      try {
        const health = await getDaemonHealth()
        setStatus(`Conectado: ${health.version || "daemon local"}`)
        toast.success("Daemon detectado")
      } catch (error) {
        const message = error instanceof Error ? error.message : "No se detecto el daemon local."
        setStatus("No detectado")
        toast({ title: "Daemon no detectado", description: message, variant: "warning" })
      }
    })
  }

  const handlePrinters = () => {
    startChecking(async () => {
      try {
        if (!config.pairingToken.trim()) {
          throw new Error("Primero pega el pairing token real que devuelve el daemon.")
        }
        const rows = await listDaemonPrinters(config.pairingToken)
        setPrinters(rows)
        toast.success(rows.length ? "Impresoras cargadas" : "Daemon sin impresoras")
      } catch (error) {
        toast({
          title: "No se pudieron cargar impresoras",
          description: error instanceof Error ? error.message : "Revisa el daemon local.",
          variant: "destructive",
        })
      }
    })
  }

  const handleTestPrint = () => {
    startPrinting(async () => {
      try {
        const contentBase64 = buildPosSaleEscposBase64({
          paperWidth: config.paperWidth,
          business: { name: tallerNombre, phone: tallerTelefono, mensajeDespedida: "Prueba de impresion directa ReparaHub" },
          data: {
            id: "test",
            folio: "TEST",
            total: 1,
            descuento: 0,
            metodoPago: "efectivo",
            montoEfectivo: 1,
            montoTarjeta: 0,
            montoTransferencia: 0,
            referenciaPago: null,
            clienteNombre: "Prueba",
            clienteTelefono: null,
            createdAt: new Date().toISOString(),
            cambio: 0,
            items: [{ id: "test", descripcion: "Ticket de prueba", cantidad: 1, precioUnitario: 1 }],
          },
        })
        await printEscposWithDaemon({
          jobId: `test_${Date.now()}`,
          tenantId,
          source: "configuracion.imprenta.test",
          contentBase64,
          config,
        })
        toast.success("Prueba enviada")
      } catch (error) {
        toast({
          title: "No se pudo imprimir prueba",
          description: error instanceof Error ? error.message : "Revisa token, daemon e impresora.",
          variant: "destructive",
        })
      }
    })
  }

  return (
    <div className="rounded-2xl border border-blue-100 bg-gradient-to-br from-white via-blue-50/40 to-slate-50 p-5 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-500/25">
            <Cable className="h-5 w-5" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-black uppercase tracking-[0.18em] text-slate-900">
                Impresion directa local
              </h3>
              <span className="rounded-full bg-blue-600 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-white">
                Beta
              </span>
            </div>
            <p className="mt-1 max-w-2xl text-xs leading-relaxed text-slate-500">
              Usa ReparaHub Print Daemon en esta PC para imprimir tickets termicos sin dialogo del navegador.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2">
          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
            {config.enabled ? "Activo" : "Inactivo"}
          </span>
          <Switch checked={config.enabled} onCheckedChange={(v) => patch({ enabled: v })} />
        </div>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Pairing token</Label>
          <Input
            value={config.pairingToken}
            onChange={(e) => patch({ pairingToken: e.target.value })}
            placeholder="tc_pd_xxxxx"
            className="mt-1 rounded-xl border-slate-200 bg-white font-mono text-xs"
          />
          <p className="mt-1 text-[11px] leading-relaxed text-slate-500">
            Pega aqui el token real que devuelve <span className="font-mono">.\dist\reparahub-print-daemon.exe token show</span>. No uses la fecha del log.
          </p>
        </div>
        <div className="lg:col-span-3">
          <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Papel</Label>
          <Select value={String(config.paperWidth)} onValueChange={(v) => patch({ paperWidth: v === "58" ? 58 : 80 })}>
            <SelectTrigger className="mt-1 rounded-xl border-slate-200 bg-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="80">Termico 80mm</SelectItem>
              <SelectItem value="58">Termico 58mm</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="lg:col-span-4">
          <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Impresora</Label>
          <div className="mt-1 flex gap-2">
            <Select value={config.printerMode} onValueChange={(v) => patch({ printerMode: v === "by_name" ? "by_name" : "default" })}>
              <SelectTrigger className="w-32 rounded-xl border-slate-200 bg-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="default">Default</SelectItem>
                <SelectItem value="by_name">Por nombre</SelectItem>
              </SelectContent>
            </Select>
            <Input
              disabled={config.printerMode !== "by_name"}
              value={config.printerName ?? ""}
              onChange={(e) => patch({ printerName: e.target.value })}
              placeholder="EPSON TM-T20"
              className="min-w-0 rounded-xl border-slate-200 bg-white text-xs"
            />
          </div>
        </div>
      </div>

      {printers.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {printers.map((printer) => (
            <button
              key={printer.name}
              type="button"
              onClick={() => patch({ printerMode: "by_name", printerName: printer.name })}
              className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-600 hover:border-blue-300 hover:text-blue-700"
            >
              {printer.name}
              {printer.isDefault ? " · default" : ""}
            </button>
          ))}
        </div>
      )}

      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600">
          <Switch checked={config.fallbackToWeb} onCheckedChange={(v) => patch({ fallbackToWeb: v })} />
          Usar impresion web como respaldo
        </label>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" onClick={handleCheck} disabled={checking} className="gap-2 rounded-xl">
            {checking ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
            Probar conexion
          </Button>
          <Button type="button" variant="outline" onClick={handlePrinters} disabled={checking} className="gap-2 rounded-xl">
            <RefreshCcw className="h-4 w-4" />
            Impresoras
          </Button>
          <Button type="button" onClick={handleTestPrint} disabled={printing || !config.enabled} className="gap-2 rounded-xl bg-blue-600 text-white btn-glow hover:bg-blue-700">
            {printing ? <Loader2 className="h-4 w-4 animate-spin" /> : <TestTube2 className="h-4 w-4" />}
            Prueba
          </Button>
        </div>
      </div>
      <div className="mt-3 flex items-center gap-2 text-[11px] text-slate-500">
        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
        Estado: {status}
      </div>
    </div>
  )
}
