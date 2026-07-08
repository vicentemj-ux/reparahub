"use client"

import { memo, useCallback, useEffect, useRef, useState } from "react"
import type { ReactNode } from "react"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import {
  decodePattern,
  encodePattern,
  MIN_PATTERN,
  patternSummary,
} from "@/lib/reparaciones/pattern"
import { RotateCcw } from "lucide-react"

const GRID = 3
const DOT_COUNT = 9

export interface ModalPatronSeguridadProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Valor codificado actual (`1-2-3-4`) al abrir el modal */
  initialPattern: string
  onSave: (encoded: string) => void
}

export const ModalPatronSeguridad = memo(function ModalPatronSeguridad({
  open,
  onOpenChange,
  initialPattern,
  onSave,
}: ModalPatronSeguridadProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [selected, setSelected] = useState<number[]>([])
  const [drawing, setDrawing] = useState(false)
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null)

  useEffect(() => {
    if (!open) return
    setSelected(decodePattern(initialPattern).map((n) => n - 1))
    setDrawing(false)
    setMousePos(null)
  }, [open, initialPattern])

  const size = 288
  const spacing = size / (GRID + 1)
  const dotR = 17

  const pos = useCallback(
    (index: number) => {
      const row = Math.floor(index / GRID)
      const col = index % GRID
      return { x: spacing * (col + 1), y: spacing * (row + 1) }
    },
    [spacing],
  )

  const getCoords = (e: React.MouseEvent<SVGSVGElement> | React.TouchEvent<SVGSVGElement>) => {
    if (!svgRef.current) return null
    const rect = svgRef.current.getBoundingClientRect()
    let cx: number
    let cy: number
    if ("touches" in e && e.touches.length > 0) {
      cx = e.touches[0].clientX
      cy = e.touches[0].clientY
    } else if ("clientX" in e) {
      cx = e.clientX
      cy = e.clientY
    } else return null
    return { x: cx - rect.left, y: cy - rect.top }
  }

  const dotAt = (x: number, y: number): number | null => {
    for (let i = 0; i < DOT_COUNT; i++) {
      const p = pos(i)
      const d = Math.hypot(x - p.x, y - p.y)
      if (d <= dotR * 1.45) return i
    }
    return null
  }

  const handleStart = (e: React.MouseEvent<SVGSVGElement> | React.TouchEvent<SVGSVGElement>) => {
    const c = getCoords(e)
    if (!c) return
    const idx = dotAt(c.x, c.y)
    if (idx !== null) {
      setDrawing(true)
      setSelected((prev) => (prev.includes(idx) ? prev : [...prev, idx]))
      setMousePos(c)
    }
  }

  const handleMove = (e: React.MouseEvent<SVGSVGElement> | React.TouchEvent<SVGSVGElement>) => {
    const c = getCoords(e)
    if (!c || !drawing) return
    setMousePos(c)
    const idx = dotAt(c.x, c.y)
    if (idx !== null) {
      setSelected((prev) => (prev.includes(idx) ? prev : [...prev, idx]))
    }
  }

  const handleEnd = () => {
    setDrawing(false)
    setMousePos(null)
  }

  const clear = () => {
    setSelected([])
  }

  const seqNums = selected.map((i) => i + 1)
  const valid = seqNums.length >= MIN_PATTERN
  const sequenceText = seqNums.length ? seqNums.join(" ➔ ") : "-"

  const lines = selected.map((dot, i) => {
    if (i === 0) return null
    const a = pos(selected[i - 1]!)
    const b = pos(dot)
    return (
      <line
        key={`ln-${i}`}
        x1={a.x}
        y1={a.y}
        x2={b.x}
        y2={b.y}
        stroke="rgb(37 99 235)"
        strokeWidth={3}
        strokeLinecap="round"
      />
    )
  })

  let tailLine: ReactNode = null
  if (drawing && mousePos && selected.length > 0) {
    const last = pos(selected[selected.length - 1]!)
    tailLine = (
      <line
        x1={last.x}
        y1={last.y}
        x2={mousePos.x}
        y2={mousePos.y}
        stroke="rgb(37 99 235)"
        strokeWidth={3}
        strokeOpacity={0.45}
        strokeLinecap="round"
      />
    )
  }

  const handleSave = () => {
    if (!valid) return
    onSave(encodePattern(seqNums))
    onOpenChange(false)
  }

  const handleCancel = () => {
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        overlayClassName="z-[125]"
        className={cn(
          "z-[125] max-h-[min(92vh,900px)] max-w-[calc(100%-1.5rem)] gap-0 overflow-hidden border-amber-200/60 bg-white p-0 shadow-xl sm:max-w-2xl",
        )}
      >
        <DialogHeader className="border-b border-amber-100/90 bg-gradient-to-r from-white via-amber-50/40 to-white px-5 py-4 text-left">
          <DialogTitle className="text-base font-semibold tracking-tight text-slate-900">
            Dibujar Patron de Desbloqueo
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col items-stretch gap-5 px-5 py-5 sm:flex-row sm:items-start sm:justify-between sm:gap-8">
          <div className="mx-auto shrink-0 rounded-2xl border border-slate-200 bg-white p-3 shadow-inner ring-1 ring-slate-100 sm:mx-0">
            <svg
              ref={svgRef}
              width={size}
              height={size}
              className="touch-none select-none"
              onMouseDown={handleStart}
              onMouseMove={handleMove}
              onMouseUp={handleEnd}
              onMouseLeave={handleEnd}
              onTouchStart={(e) => {
                e.preventDefault()
                handleStart(e)
              }}
              onTouchMove={(e) => {
                e.preventDefault()
                handleMove(e)
              }}
              onTouchEnd={(e) => {
                e.preventDefault()
                handleEnd()
              }}
            >
              {lines}
              {tailLine}
              {Array.from({ length: DOT_COUNT }, (_, i) => {
                const p = pos(i)
                const on = selected.includes(i)
                const n = i + 1
                return (
                  <g key={i}>
                    <circle
                      cx={p.x}
                      cy={p.y}
                      r={dotR}
                      fill={on ? "rgb(37 99 235)" : "rgb(248 250 252)"}
                      stroke={on ? "rgb(29 78 216)" : "rgb(203 213 225)"}
                      strokeWidth={on ? 2.5 : 2}
                      className={cn(on && "drop-shadow-[0_0_6px_rgba(37,99,235,0.45)]")}
                    />
                    <text
                      x={p.x}
                      y={p.y}
                      textAnchor="middle"
                      dominantBaseline="central"
                      className="fill-slate-900 text-[13px] font-bold"
                      style={{ pointerEvents: "none" }}
                    >
                      {n}
                    </text>
                  </g>
                )
              })}
            </svg>
          </div>

          <div className="flex min-w-0 flex-1 flex-col justify-between gap-4 rounded-xl border border-slate-200 bg-slate-50/80 p-4 sm:min-h-[288px]">
            <div className="space-y-2">
              <p className="text-[11px] font-bold uppercase tracking-wider text-blue-600">Secuencia</p>
              <p
                className="min-h-[2.75rem] break-words font-mono text-base font-semibold leading-snug text-slate-900"
                aria-live="polite"
              >
                {sequenceText}
              </p>
              <p className="break-words font-mono text-xs text-slate-600">{patternSummary(seqNums)}</p>
            </div>
            <p className={cn("text-xs font-medium", valid ? "text-emerald-600" : "text-slate-500")}>
              {seqNums.length} punto{seqNums.length !== 1 ? "s" : ""}
              {valid ? " · listo para guardar" : ` · faltan al menos ${Math.max(0, MIN_PATTERN - seqNums.length)}`}
            </p>
          </div>
        </div>

        <DialogFooter className="flex-col gap-2 border-t border-slate-100 bg-slate-50/50 px-5 py-4 sm:flex-row sm:justify-between">
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1.5 border-slate-200 bg-white text-slate-800"
              onClick={clear}
            >
              <RotateCcw className="h-3.5 w-3.5" aria-hidden />
              Limpiar
            </Button>
          </div>
          <div className="flex w-full flex-wrap justify-end gap-2 sm:w-auto">
            <Button type="button" variant="ghost" size="sm" className="text-slate-700" onClick={handleCancel}>
              Cancelar
            </Button>
            <Button
              type="button"
              size="sm"
              className="bg-blue-600 text-white hover:bg-blue-700"
              disabled={!valid}
              onClick={handleSave}
            >
              Guardar patron
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
})
