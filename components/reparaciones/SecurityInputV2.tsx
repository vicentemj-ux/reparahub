"use client"

import { memo, useCallback, useEffect, useRef, useState } from "react"
import type { ReactNode } from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Lock, Hash, KeyRound, Grid3x3, RotateCcw } from "lucide-react"
import type { SecurityTab, SecurityValue } from "@/lib/reparaciones/security"
import { decodePattern, encodePattern, MIN_PATTERN, patternSummary } from "@/lib/reparaciones/pattern"

export type { SecurityTab, SecurityValue } from "@/lib/reparaciones/security"

export interface SecurityInputV2Props {
  value: SecurityValue
  onChange: (next: SecurityValue) => void
  className?: string
  /**
   * `inline`: lienzo 3x3 dentro del bloque de seguridad (p. ej. formulario pagina completa).
   * `external`: el editor abre en un modal; se invoca al elegir la pestana «Patron» (y al volver a pulsarla).
   */
  patternPlacement?: "inline" | "external"
  /** Solo con `patternPlacement="external"`: abre el modal del lienzo 3x3. */
  onRequestPatternEditor?: () => void
}

const GRID = 3
const DOT_COUNT = 9

const PatternCanvasInner = memo(function PatternCanvasInner({
  value,
  onPatternChange,
}: {
  value: string
  /** Solo cambios reales de trazo; estable (useCallback en el padre). */
  onPatternChange: (patternDash: string) => void
}) {
  const svgRef = useRef<SVGSVGElement>(null)
  /** Evita re-sincronizar `selected` cuando el padre ya refleja nuestro ultimo emit. */
  const skipNextValueSync = useRef(false)
  const onPatternChangeRef = useRef(onPatternChange)
  onPatternChangeRef.current = onPatternChange

  const [selected, setSelected] = useState<number[]>(() => decodePattern(value).map((n) => n - 1))
  const [drawing, setDrawing] = useState(false)
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null)

  /** Padre → hijo: solo cuando el valor no viene de nuestro ultimo emit. */
  useEffect(() => {
    if (skipNextValueSync.current) {
      skipNextValueSync.current = false
      return
    }
    const next = decodePattern(value).map((n) => n - 1)
    setSelected((prev) => {
      if (prev.length === next.length && prev.every((v, i) => v === next[i])) return prev
      return next
    })
  }, [value])

  /** Hijo → padre: solo si el trazo codificado difiere del prop (evita bucles). */
  useEffect(() => {
    const next = encodePattern(selected.map((i) => i + 1))
    if (next === value) return
    skipNextValueSync.current = true
    onPatternChangeRef.current(next)
  }, [selected, value])

  const size = 260
  const spacing = size / (GRID + 1)
  const dotR = 16

  const pos = useCallback(
    (index: number) => {
      const row = Math.floor(index / GRID)
      const col = index % GRID
      return { x: spacing * (col + 1), y: spacing * (row + 1) }
    },
    [spacing]
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
        strokeOpacity={0.5}
        strokeLinecap="round"
      />
    )
  }

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="space-y-2">
        <p className="text-[11px] font-bold uppercase tracking-wider text-blue-600">
          Dibuja el patron de desbloqueo
        </p>
        <p className="text-xs text-slate-500">Toca o arrastra entre puntos en orden (min. {MIN_PATTERN}).</p>
        <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
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
                    fill={on ? "rgb(37 99 235)" : "rgb(241 245 249)"}
                    stroke={on ? "rgb(29 78 216)" : "rgb(203 213 225)"}
                    strokeWidth={2}
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
        <div className="flex flex-wrap items-center gap-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1.5 border-slate-200 text-slate-700"
            onClick={clear}
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Limpiar
          </Button>
          <span className={cn("text-xs font-medium", valid ? "text-emerald-600" : "text-slate-500")}>
            {seqNums.length} punto{seqNums.length !== 1 ? "s" : ""}
            {valid ? " ✓" : ""}
          </span>
        </div>
      </div>
      <div className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-slate-50/80 p-4">
        <p className="text-[11px] font-bold uppercase tracking-wider text-blue-600">Patron registrado</p>
        <p className="mt-2 break-words font-mono text-base font-semibold leading-relaxed text-slate-900">
          {patternSummary(seqNums)}
        </p>
        <p className="mt-2 text-[11px] text-slate-500">Secuencia de puntos 1-9</p>
      </div>
    </div>
  )
})

const TAB_CONFIG: { id: SecurityTab; label: string; icon: React.ReactNode }[] = [
  { id: "none", label: "Sin bloqueo", icon: <Lock className="h-4 w-4 text-amber-600" /> },
  { id: "pin", label: "PIN", icon: <Hash className="h-4 w-4 text-blue-600" /> },
  { id: "password", label: "Contrasena", icon: <KeyRound className="h-4 w-4 text-blue-600" /> },
  { id: "pattern", label: "Patron", icon: <Grid3x3 className="h-4 w-4 text-blue-600" /> },
]

export const SecurityInputV2 = memo(function SecurityInputV2({
  value,
  onChange,
  className,
  patternPlacement = "inline",
  onRequestPatternEditor,
}: SecurityInputV2Props) {
  const setTab = useCallback(
    (type: SecurityTab) => {
      if (type === "pattern" && patternPlacement === "external" && onRequestPatternEditor) {
        if (value.type !== "pattern") {
          onChange({ type: "pattern", value: "" })
        }
        onRequestPatternEditor()
        return
      }
      if (type === value.type) return
      onChange({ type, value: "" })
    },
    [value.type, onChange, patternPlacement, onRequestPatternEditor]
  )

  const handlePatternChange = useCallback(
    (patternDash: string) => {
      onChange({ type: "pattern", value: patternDash })
    },
    [onChange]
  )

  const pinOk = value.type !== "pin" || /^\d{4,12}$/.test(value.value.trim())
  const passOk = value.type !== "password" || value.value.trim().length >= 1
  const patOk = value.type !== "pattern" || decodePattern(value.value).length >= MIN_PATTERN

  return (
    <div className={cn("space-y-4 rounded-xl border border-slate-200 bg-slate-50/50 p-4", className)}>
      <div className="flex items-center gap-2">
        <Lock className="h-4 w-4 text-blue-600" aria-hidden />
        <h3 className="text-sm font-semibold tracking-tight text-slate-900">Seguridad del equipo</h3>
      </div>

      <input type="hidden" name="security-type" value={value.type} readOnly />
      <input type="hidden" name="security-value" value={value.value} readOnly />

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {TAB_CONFIG.map((t) => {
          const active = value.type === t.id
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={cn(
                "flex flex-col items-center gap-1 rounded-xl border px-2 py-2.5 text-center transition-colors",
                active
                  ? "border-blue-600 bg-white shadow-sm ring-1 ring-blue-600/20"
                  : "border-slate-200 bg-white/80 hover:border-slate-300"
              )}
            >
              {t.icon}
              <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-800">{t.label}</span>
            </button>
          )
        })}
      </div>

      {value.type === "none" && (
        <p className="text-xs text-slate-500">No se guardara PIN, contrasena ni patron para este equipo.</p>
      )}

      {value.type === "pin" && (
        <div className="space-y-2">
          <Label htmlFor="sec-pin" className="text-xs font-medium text-slate-600">
            PIN numerico
          </Label>
          <Input
            id="sec-pin"
            type="text"
            inputMode="numeric"
            autoComplete="off"
            placeholder="Ej. 1234"
            className="rounded-xl border-slate-200 font-mono"
            value={value.value}
            onChange={(e) => onChange({ type: "pin", value: e.target.value.replace(/\D/g, "") })}
          />
          {!pinOk && value.value.length > 0 ? (
            <p className="text-xs text-amber-700">Usa entre 4 y 12 digitos.</p>
          ) : null}
        </div>
      )}

      {value.type === "password" && (
        <div className="space-y-2">
          <Label htmlFor="sec-pass" className="text-xs font-medium text-slate-600">
            Contrasena del equipo
          </Label>
          <Input
            id="sec-pass"
            type="text"
            autoComplete="new-password"
            placeholder="Contrasena o frase"
            className="rounded-xl border-slate-200"
            value={value.value}
            onChange={(e) => onChange({ type: "password", value: e.target.value })}
          />
          {!passOk ? <p className="text-xs text-slate-500">Ingresa al menos un caracter.</p> : null}
        </div>
      )}

      {value.type === "pattern" && patternPlacement === "inline" ? (
        <PatternCanvasInner value={value.value} onPatternChange={handlePatternChange} />
      ) : null}

      {value.type === "pattern" && !patOk && value.value.length > 0 ? (
        <p className="text-xs text-amber-700">El patron debe tener al menos {MIN_PATTERN} puntos.</p>
      ) : null}
    </div>
  )
})
