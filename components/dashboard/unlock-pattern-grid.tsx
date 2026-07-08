"use client"

/**
 * 3x3 unlock pattern grid. Parses a string like "1-4-7-8-9" or "1,4,7,8,9"
 * (positions 1-9, row-major) and draws dots with connecting lines.
 */
interface UnlockPatternGridProps {
  /** Pattern string from DB, e.g. "1-4-7-8-9" or "14789" */
  pattern: string | null | undefined
  className?: string
  size?: number
}

const GRID_POSITIONS = [
  [0, 0], [1, 0], [2, 0], // 1, 2, 3
  [0, 1], [1, 1], [2, 1], // 4, 5, 6
  [0, 2], [1, 2], [2, 2], // 7, 8, 9
]

function parsePattern(pattern: string): number[] {
  if (!pattern || !pattern.trim()) return []
  const trimmed = pattern.trim().replace(/\s/g, "")
  if (trimmed.includes("-") || trimmed.includes(",")) {
    return trimmed
      .split(/[-,]/)
      .map((s) => parseInt(s, 10))
      .filter((n) => n >= 1 && n <= 9)
  }
  return trimmed
    .split("")
    .map((s) => parseInt(s, 10))
    .filter((n) => n >= 1 && n <= 9)
}

export function UnlockPatternGrid({ pattern, className = "", size = 120 }: UnlockPatternGridProps) {
  const indices = parsePattern(pattern || "")
  const dotRadius = 6
  const padding = 8
  const cellSize = (size - padding * 2) / 3
  const center = (i: number) => padding + cellSize * (i + 0.5)

  const points = indices.map((num) => {
    const idx = num - 1
    return { x: center(GRID_POSITIONS[idx][0]), y: center(GRID_POSITIONS[idx][1]) }
  })

  return (
    <div className={className}>
      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2">
        Patron de desbloqueo
      </p>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="rounded-lg border border-border bg-muted/30"
      >
        {/* Grid lines (optional, subtle) */}
        {[1, 2].map((i) => (
          <line
            key={`v${i}`}
            x1={center(i - 1)}
            y1={padding}
            x2={center(i - 1)}
            y2={size - padding}
            stroke="currentColor"
            strokeOpacity={0.15}
            strokeWidth={1}
          />
        ))}
        {[1, 2].map((i) => (
          <line
            key={`h${i}`}
            x1={padding}
            y1={center(i - 1)}
            x2={size - padding}
            y2={center(i - 1)}
            stroke="currentColor"
            strokeOpacity={0.15}
            strokeWidth={1}
          />
        ))}
        {/* Connecting lines */}
        {points.slice(0, -1).map((p, i) => (
          <line
            key={`line-${i}`}
            x1={p.x}
            y1={p.y}
            x2={points[i + 1].x}
            y2={points[i + 1].y}
            stroke="hsl(var(--primary))"
            strokeWidth={3}
            strokeLinecap="round"
          />
        ))}
        {/* Dots */}
        {points.map((p, i) => (
          <circle
            key={`dot-${i}`}
            cx={p.x}
            cy={p.y}
            r={dotRadius}
            fill="hsl(var(--primary))"
            stroke="hsl(var(--background))"
            strokeWidth={2}
          />
        ))}
      </svg>
      {indices.length === 0 && (
        <p className="text-xs text-muted-foreground mt-1">Sin patron registrado</p>
      )}
    </div>
  )
}
