import { useCallback, useRef } from "react"
import { recordDataFetch } from "@/lib/perf/data-fetch-perf"

/**
 * Measures the wall-clock time between a Supabase call start and the first
 * paint after the data lands in state (i.e. when the skeleton disappears).
 *
 * Usage:
 *   const { startFetch, stopFetch } = useDataFetchPerf("reparaciones")
 *   startFetch()                         // call right before the await
 *   const result = await getRepairs()
 *   setState(result)
 *   setLoading(false)
 *   stopFetch()                          // call after the last state setter
 */
export function useDataFetchPerf(module: string) {
  const startRef = useRef<number>(0)

  const startFetch = useCallback(() => {
    startRef.current = performance.now()
  }, [])

  /**
   * Records elapsed time via requestAnimationFrame so the measurement ends
   * after React commits the new state to the DOM (skeleton truly gone).
   */
  const stopFetch = useCallback(() => {
    if (startRef.current === 0) return
    const start = startRef.current
    startRef.current = 0
    requestAnimationFrame(() => {
      recordDataFetch(Math.round(performance.now() - start), module)
    })
  }, [module])

  return { startFetch, stopFetch }
}
