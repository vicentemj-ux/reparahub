"use client"

import { useParams } from "next/navigation"
import { useCallback, useEffect, useRef, useState } from "react"
import { saveFirmaSignatureBase64 } from "@/lib/actions/firma-digital"
import { Button } from "@/components/ui/button"
import { Loader2, CheckCircle2 } from "lucide-react"

/** Segmento [id] en la URL = token UUID de `firma_digital_tokens`. */
export default function FirmaDigitalPage() {
  const params = useParams()
  const token = (params?.id as string) || ""
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const drawing = useRef(false)
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const W = 800
  const H = 360

  const initCanvas = useCallback(() => {
    const c = canvasRef.current
    if (!c) return
    c.width = W
    c.height = H
    const ctx = c.getContext("2d")
    if (!ctx) return
    ctx.fillStyle = "#ffffff"
    ctx.fillRect(0, 0, W, H)
    ctx.strokeStyle = "#f8fafc"
    ctx.lineWidth = 2.5
    ctx.lineCap = "round"
    ctx.lineJoin = "round"
  }, [])

  useEffect(() => {
    initCanvas()
  }, [initCanvas])

  const pos = (e: React.MouseEvent | React.TouchEvent) => {
    const c = canvasRef.current
    if (!c) return { x: 0, y: 0 }
    const r = c.getBoundingClientRect()
    let clientX: number
    let clientY: number
    if ("touches" in e && e.touches[0]) {
      clientX = e.touches[0].clientX
      clientY = e.touches[0].clientY
    } else {
      clientX = (e as React.MouseEvent).clientX
      clientY = (e as React.MouseEvent).clientY
    }
    return {
      x: (clientX - r.left) * (W / r.width),
      y: (clientY - r.top) * (H / r.height),
    }
  }

  const start = (e: React.MouseEvent | React.TouchEvent) => {
    drawing.current = true
    const c = canvasRef.current
    const ctx = c?.getContext("2d")
    if (!ctx) return
    const p = pos(e)
    ctx.beginPath()
    ctx.moveTo(p.x, p.y)
  }

  const move = (e: React.MouseEvent | React.TouchEvent) => {
    if (!drawing.current) return
    const c = canvasRef.current
    const ctx = c?.getContext("2d")
    if (!ctx) return
    const p = pos(e)
    ctx.lineTo(p.x, p.y)
    ctx.stroke()
  }

  const end = () => {
    drawing.current = false
  }

  const clear = () => {
    initCanvas()
  }

  const submit = async () => {
    const c = canvasRef.current
    if (!c || !token) return
    setError(null)
    setSubmitting(true)
    try {
      const dataUrl = c.toDataURL("image/png")
      const res = await saveFirmaSignatureBase64(token, dataUrl)
      if (!res.success) {
        setError(res.error ?? "No se pudo guardar.")
        return
      }
      setDone(true)
    } catch (err) {
      console.error(err)
      setError("Error al enviar la firma.")
    } finally {
      setSubmitting(false)
    }
  }

  if (!token) {
    return (
      <div className="min-h-[100dvh] bg-slate-50 flex items-center justify-center px-4">
        <p className="text-slate-600">Enlace no valido.</p>
      </div>
    )
  }

  if (done) {
    return (
      <div className="min-h-[100dvh] bg-slate-50 flex flex-col items-center justify-center px-4 pb-12">
        <div className="max-w-md w-full rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <CheckCircle2 className="mx-auto h-14 w-14 text-emerald-600" aria-hidden />
          <h1 className="mt-4 text-xl font-bold text-slate-900">Firma registrada</h1>
          <p className="mt-2 text-sm text-slate-600">Gracias. El taller ha recibido tu conformidad de ingreso.</p>
          <p className="mt-6 text-xs text-slate-500">ReparaHub</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-[100dvh] bg-gradient-to-b from-slate-50 to-white px-4 py-8">
      <div className="mx-auto max-w-lg">
        <h1 className="text-center text-lg font-bold text-slate-900">Conformidad de ingreso</h1>
        <p className="mt-2 text-center text-sm text-slate-600">
          Firma en el recuadro con tu dedo o el mouse. Luego envia para confirmar que recibes el equipo en el taller.
        </p>

        <div className="mt-6 overflow-hidden rounded-xl border-2 border-dashed border-slate-300 bg-white shadow-inner">
          <canvas
            ref={canvasRef}
            className="h-48 w-full touch-none"
            onMouseDown={start}
            onMouseMove={move}
            onMouseUp={end}
            onMouseLeave={end}
            onTouchStart={(e) => {
              e.preventDefault()
              start(e)
            }}
            onTouchMove={(e) => {
              e.preventDefault()
              move(e)
            }}
            onTouchEnd={end}
          />
        </div>

        {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}

        <div className="mt-4 flex gap-3">
          <Button type="button" variant="outline" className="flex-1 rounded-xl" onClick={clear} disabled={submitting}>
            Limpiar
          </Button>
          <Button
            type="button"
            className="flex-1 rounded-xl bg-blue-600 font-semibold hover:bg-blue-700"
            onClick={submit}
            disabled={submitting}
          >
            {submitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Enviando...
              </>
            ) : (
              "Enviar firma"
            )}
          </Button>
        </div>

        <p className="mt-8 text-center text-[11px] text-slate-500">ReparaHub · firma digital</p>
      </div>
    </div>
  )
}
