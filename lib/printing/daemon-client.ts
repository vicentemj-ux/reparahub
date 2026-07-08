"use client"

import type { DirectPrintConfig } from "@/lib/printing/direct-print-config"

const DAEMON_HTTP_URL = "http://127.0.0.1:8182"
const DAEMON_WS_URL = "ws://127.0.0.1:8182/ws"

export interface DaemonHealth {
  name: string
  version: string
  listenAddress: string
  defaultPrinter?: string
}

export interface DaemonPrinter {
  name: string
  isDefault?: boolean
}

export interface DaemonPrintJob {
  jobId: string
  tenantId: string
  source: string
  contentBase64: string
  config: DirectPrintConfig
  copies?: number
}

export class DaemonPrintError extends Error {
  code:
    | "daemon_unavailable"
    | "auth_failed"
    | "invalid_config"
    | "print_failed"
    | "timeout"

  constructor(code: DaemonPrintError["code"], message: string) {
    super(message)
    this.name = "DaemonPrintError"
    this.code = code
  }
}

function withTimeout<T>(promise: Promise<T>, ms: number, code: DaemonPrintError["code"], message: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined
  return Promise.race([
    promise.finally(() => {
      if (timer) clearTimeout(timer)
    }),
    new Promise<T>((_, reject) => {
      timer = setTimeout(() => reject(new DaemonPrintError(code, message)), ms)
    }),
  ])
}

export async function getDaemonHealth(timeoutMs = 1200): Promise<DaemonHealth> {
  return withTimeout(
    fetch(`${DAEMON_HTTP_URL}/health`, { cache: "no-store" }).then(async (res) => {
      if (!res.ok) throw new DaemonPrintError("daemon_unavailable", "El servidor local de impresion no respondio correctamente.")
      return (await res.json()) as DaemonHealth
    }),
    timeoutMs,
    "daemon_unavailable",
    "No se detecto ReparaHub Print Daemon en esta PC.",
  )
}

export async function listDaemonPrinters(pairingToken: string, timeoutMs = 1500): Promise<DaemonPrinter[]> {
  return withTimeout(
    fetch(`${DAEMON_HTTP_URL}/printers`, {
      cache: "no-store",
      headers: pairingToken.trim() ? { "X-ReparaHub-Pairing-Token": pairingToken.trim() } : undefined,
    }).then(async (res) => {
      if (!res.ok) throw new DaemonPrintError("daemon_unavailable", "No se pudo leer la lista de impresoras del daemon.")
      const data = await res.json()
      if (Array.isArray(data)) return data as DaemonPrinter[]
      if (Array.isArray(data?.printers)) return data.printers as DaemonPrinter[]
      return []
    }),
    timeoutMs,
    "daemon_unavailable",
    "No se pudo consultar la lista de impresoras locales.",
  )
}

export async function printEscposWithDaemon(job: DaemonPrintJob): Promise<void> {
  if (!job.config.enabled) throw new DaemonPrintError("invalid_config", "La impresion directa no esta activa.")
  if (!job.config.pairingToken.trim()) throw new DaemonPrintError("invalid_config", "Falta el token de emparejamiento del daemon.")
  if (!job.tenantId.trim()) throw new DaemonPrintError("invalid_config", "No se pudo resolver el taller para imprimir.")
  if (!job.contentBase64.trim()) throw new DaemonPrintError("invalid_config", "El ticket ESC/POS esta vacio.")

  await withTimeout(
    new Promise<void>((resolve, reject) => {
      const ws = new WebSocket(DAEMON_WS_URL)
      let authed = false
      let settled = false

      const close = () => {
        try {
          ws.close()
        } catch {}
      }

      const fail = (code: DaemonPrintError["code"], message: string) => {
        if (settled) return
        settled = true
        close()
        reject(new DaemonPrintError(code, message))
      }

      ws.onerror = () => fail("daemon_unavailable", "No se pudo conectar con ReparaHub Print Daemon.")
      ws.onopen = () => {
        ws.send(
          JSON.stringify({
            type: "auth.hello",
            requestId: `auth_${Date.now()}`,
            payload: {
              pairingToken: job.config.pairingToken.trim(),
              tenantId: job.tenantId,
              client: "web",
            },
          }),
        )
      }
      ws.onmessage = (event) => {
        let message: { type?: string; payload?: Record<string, unknown>; error?: string } = {}
        try {
          message = JSON.parse(String(event.data))
        } catch {
          fail("print_failed", "Respuesta invalida del daemon de impresion.")
          return
        }

        if (message.type === "auth.ok") {
          authed = true
          ws.send(
            JSON.stringify({
              type: "print.job",
              requestId: `print_${job.jobId}_${Date.now()}`,
              payload: {
                jobId: job.jobId,
                tenantId: job.tenantId,
                printerTarget:
                  job.config.printerMode === "by_name"
                    ? { mode: "by_name", name: job.config.printerName?.trim() ?? "" }
                    : { mode: "default" },
                document: {
                  format: "raw_escpos_base64",
                  content: job.contentBase64,
                },
                meta: {
                  source: job.source,
                  paperWidth: job.config.paperWidth,
                  copies: job.copies ?? 1,
                },
              },
            }),
          )
          return
        }

        if (message.type === "auth.error") {
          fail("auth_failed", String(message.error || message.payload?.message || "Token de impresion directa invalido."))
          return
        }

        if (message.type === "print.done") {
          if (settled) return
          settled = true
          close()
          resolve()
          return
        }

        if (message.type === "print.error" || message.type === "server.error") {
          fail("print_failed", String(message.error || message.payload?.message || "El daemon no pudo imprimir el ticket."))
        }
      }
      ws.onclose = () => {
        if (!settled && !authed) fail("daemon_unavailable", "El daemon cerro la conexion antes de autenticar.")
      }
    }),
    9000,
    "timeout",
    "La impresion directa tardo demasiado. Revisa la impresora o usa impresion web.",
  )
}
