"use client"

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react"

export type ActiveCustomerRecord = {
  id: string
  nombre: string
  telefono: string
  correo?: string
}

type ActiveCustomerState =
  | {
      mode: "public"
      updatedAt: number
    }
  | (ActiveCustomerRecord & {
      mode: "selected"
      updatedAt: number
    })

type ActiveCustomerContextValue = {
  activeCustomer: ActiveCustomerState
  setActiveCustomer: (customer: ActiveCustomerRecord) => void
  clearActiveCustomer: () => void
}

const STORAGE_KEY = "tc_active_customer_v1"

const ActiveCustomerContext = createContext<ActiveCustomerContextValue | null>(null)

function createPublicState(): ActiveCustomerState {
  return {
    mode: "public",
    updatedAt: Date.now(),
  }
}

function normalizeDigits(value?: string | null) {
  return (value ?? "").replace(/\D/g, "")
}

function sameSelectedCustomer(
  current:
    | (ActiveCustomerRecord & {
        mode: "selected"
        updatedAt: number
      })
    | null,
  next: ActiveCustomerRecord,
) {
  if (!current) return false
  return (
    current.id === (next.id?.trim() ?? "") &&
    current.nombre === (next.nombre?.trim() || "Cliente") &&
    normalizeDigits(current.telefono) === normalizeDigits(next.telefono) &&
    (current.correo ?? "") === (next.correo?.trim() || "")
  )
}

function parseStoredCustomer(raw: string | null): ActiveCustomerState {
  if (!raw) return createPublicState()

  try {
    const parsed = JSON.parse(raw) as Partial<ActiveCustomerState>
    if (parsed.mode === "selected" && typeof parsed.nombre === "string" && typeof parsed.telefono === "string") {
      return {
        mode: "selected",
        id: typeof parsed.id === "string" ? parsed.id : "",
        nombre: parsed.nombre.trim() || "Cliente",
        telefono: normalizeDigits(parsed.telefono),
        correo: typeof parsed.correo === "string" ? parsed.correo : "",
        updatedAt: typeof parsed.updatedAt === "number" ? parsed.updatedAt : Date.now(),
      }
    }
  } catch {
    // noop
  }

  return createPublicState()
}

export function ActiveCustomerProvider({ children }: { children: React.ReactNode }) {
  const [activeCustomer, setActiveCustomerState] = useState<ActiveCustomerState>(createPublicState)

  useEffect(() => {
    if (typeof window === "undefined") return
    setActiveCustomerState(parseStoredCustomer(window.sessionStorage.getItem(STORAGE_KEY)))
  }, [])

  useEffect(() => {
    if (typeof window === "undefined") return
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(activeCustomer))
  }, [activeCustomer])

  const setActiveCustomer = useCallback((customer: ActiveCustomerRecord) => {
    const normalized = {
      id: customer.id?.trim() ?? "",
      nombre: customer.nombre.trim() || "Cliente",
      telefono: normalizeDigits(customer.telefono),
      correo: customer.correo?.trim() || "",
    }
    setActiveCustomerState((current) => {
      if (current.mode === "selected" && sameSelectedCustomer(current, normalized)) {
        return current
      }
      return {
        mode: "selected",
        ...normalized,
        updatedAt: Date.now(),
      }
    })
  }, [])

  const clearActiveCustomer = useCallback(() => {
    setActiveCustomerState(createPublicState())
  }, [])

  const value = useMemo(
    () => ({
      activeCustomer,
      setActiveCustomer,
      clearActiveCustomer,
    }),
    [activeCustomer, clearActiveCustomer, setActiveCustomer],
  )

  return <ActiveCustomerContext.Provider value={value}>{children}</ActiveCustomerContext.Provider>
}

export function useActiveCustomer() {
  const ctx = useContext(ActiveCustomerContext)
  if (!ctx) throw new Error("useActiveCustomer must be used inside ActiveCustomerProvider")
  return ctx
}
