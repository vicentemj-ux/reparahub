/**
 * Lightweight in-memory perf store for data-fetch latency.
 * Never persisted - lives only for the current browser session.
 *
 * Modules call recordDataFetch() after their Supabase response arrives.
 * CloudConnectionStatus listens to DATA_PERF_EVENT to update the UI.
 */

export const DATA_PERF_EVENT = "reparahub:data-perf"

/** < 100 ms → likely a cached / pre-warmed response.  >= 100 ms → fresh DB hit. */
export type PerfSource = "cache" | "fresh"

export interface DataPerfDetail {
  ms: number
  source: PerfSource
  module: string
}

// Session-scoped history (capped at 50 entries - no leak risk).
const _history: number[] = []

export function recordDataFetch(ms: number, module: string): void {
  const source: PerfSource = ms < 100 ? "cache" : "fresh"

  _history.push(ms)
  if (_history.length > 50) _history.shift()

  if (typeof window === "undefined") return
  window.dispatchEvent(
    new CustomEvent<DataPerfDetail>(DATA_PERF_EVENT, {
      detail: { ms, source, module },
    }),
  )
}

/** Rolling average of all recorded fetches in the session. */
export function getSessionAvg(): number | null {
  if (_history.length === 0) return null
  return Math.round(_history.reduce((a, b) => a + b, 0) / _history.length)
}
