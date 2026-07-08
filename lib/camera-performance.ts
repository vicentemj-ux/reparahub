"use client"

const TRACE_KEY = "__reparahubCameraTraceId"

function canMeasure() {
  return typeof window !== "undefined" && typeof performance !== "undefined"
}

function getTraceId() {
  if (typeof window === "undefined") return null
  return (window as unknown as Record<string, string | undefined>)[TRACE_KEY] ?? null
}

function setTraceId(traceId: string) {
  if (typeof window === "undefined") return
  ;(window as unknown as Record<string, string | undefined>)[TRACE_KEY] = traceId
}

function markName(traceId: string, name: string) {
  return `camera:${traceId}:${name}`
}

export function beginCameraTrace(source: string) {
  if (!canMeasure()) return null
  const traceId = `${source}:${Date.now().toString(36)}`
  setTraceId(traceId)
  performance.mark(markName(traceId, "click"))
  return traceId
}

export function ensureCameraTrace(source = "unknown") {
  const existing = getTraceId()
  if (existing) return existing
  return beginCameraTrace(source)
}

export function markCameraTrace(name: string, traceId = getTraceId()) {
  if (!traceId || !canMeasure()) return
  performance.mark(markName(traceId, name))
}

export function measureCameraTrace(label: string, start: string, end: string, traceId = getTraceId()) {
  if (!traceId || !canMeasure()) return
  const measureName = `camera:${traceId}:${label}`
  try {
    performance.measure(measureName, markName(traceId, start), markName(traceId, end))
  } catch {
    // Missing marks are acceptable when a browser blocks or short-circuits the flow.
  }
}

export function clearCameraTrace(traceId = getTraceId()) {
  if (!traceId || !canMeasure()) return
  try {
    for (const entry of performance.getEntries()) {
      if (entry.name.startsWith(`camera:${traceId}:`)) {
        performance.clearMarks(entry.name)
        performance.clearMeasures(entry.name)
      }
    }
  } catch {
    // Best-effort cleanup only.
  }
}
