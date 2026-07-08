/** Patron 3x3 en formato `1-4-7` (compatible con almacenamiento en BD). */

export const MIN_PATTERN = 4

export function encodePattern(seq: number[]): string {
  return seq.join("-")
}

export function decodePattern(s: string): number[] {
  if (!s.trim()) return []
  return s
    .split(/[-,\s]+/)
    .map((x) => parseInt(x.trim(), 10))
    .filter((n) => n >= 1 && n <= 9)
}

export function patternSummary(seq: number[]): string {
  if (seq.length === 0) return "-"
  return seq.map((n) => String(n)).join(" → ")
}
