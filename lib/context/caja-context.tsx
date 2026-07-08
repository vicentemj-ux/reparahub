"use client"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react"
import { getCajaAbierta, abrirCaja } from "@/lib/actions/ventas-prisma"
import type { CajaRow } from "@/lib/actions/ventas-prisma"
import { getTallerSettings } from "@/lib/actions/settings-prisma"
import { AlertCircle, Loader2, Store } from "lucide-react"

type CajaStatus = "open" | "closed" | "loading"

export interface CajaContextValue {
  status: CajaStatus
  caja: CajaRow | null
  open: () => void
  close: () => void
  showOpenModal: boolean
  setShowOpenModal: (show: boolean) => void
  refresh: () => void
}

const CajaContext = createContext<CajaContextValue | null>(null)

export function useCajaContext() {
  const ctx = useContext(CajaContext)
  if (!ctx) {
    return {
      status: "loading" as CajaStatus,
      caja: null,
      open: () => {},
      close: () => {},
      showOpenModal: false,
      setShowOpenModal: () => {},
      refresh: () => {},
    }
  }
  return ctx
}

function CajaProviderInner({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<CajaStatus>("loading")
  const [caja, setCaja] = useState<CajaRow | null>(null)
  const [showOpenModal, setShowOpenModal] = useState(false)
  const checkingRef = useRef(false)

  const checkCaja = useCallback(async () => {
    if (checkingRef.current) return
    checkingRef.current = true
    try {
      const { caja: c } = await getCajaAbierta()
      setCaja(c)
      const hasCaja = c !== null
      setStatus(hasCaja ? "open" : "closed")
      if (!hasCaja) setShowOpenModal(true)
      return c
    } catch {
      setCaja(null)
      setStatus("closed")
      setShowOpenModal(true)
      return null
    } finally {
      checkingRef.current = false
    }
  }, [])

  useEffect(() => {
    void checkCaja()
  }, [checkCaja])

  useEffect(() => {
    const handler = () => {
      setStatus("closed")
      setCaja(null)
      setShowOpenModal(true)
    }
    window.addEventListener("caja:cerrada", handler)
    return () => window.removeEventListener("caja:cerrada", handler)
  }, [])

  useEffect(() => {
    const handler = () => void checkCaja()
    window.addEventListener("caja:abierta", handler)
    return () => window.removeEventListener("caja:abierta", handler)
  }, [checkCaja])

  const open = useCallback(() => setShowOpenModal(true), [])
  const close = useCallback(() => {
    setStatus("closed")
    setCaja(null)
    setShowOpenModal(true)
  }, [])
  const refresh = useCallback(() => void checkCaja(), [checkCaja])

  return (
    <CajaContext.Provider
      value={{ status, caja, open, close, showOpenModal, setShowOpenModal, refresh }}
    >
      {children}
    </CajaContext.Provider>
  )
}

export function CajaProvider({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    setMounted(true)
  }, [])
  if (!mounted) {
    return <>{children}</>
  }
  return <CajaProviderInner>{children}</CajaProviderInner>
}

interface OpenCajaModalProps {
  defaultFondo?: string
  onSuccess?: () => void
}

export function OpenCajaModal({ defaultFondo = "500", onSuccess }: OpenCajaModalProps) {
  const { showOpenModal, setShowOpenModal } = useCajaContext()
  const [monto, setMonto] = useState(defaultFondo)
  const [configuredFondo, setConfiguredFondo] = useState(defaultFondo)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    let cancelled = false
    getTallerSettings()
      .then(({ settings }) => {
        if (cancelled) return
        const next = String(settings?.fondo_caja_inicial ?? defaultFondo)
        setConfiguredFondo(next)
        setMonto(next)
      })
      .catch(() => {
        if (!cancelled) {
          setConfiguredFondo(defaultFondo)
          setMonto(defaultFondo)
        }
      })
    return () => {
      cancelled = true
    }
  }, [defaultFondo])

  const handleOpen = async () => {
    const val = parseFloat(monto.replace(",", "."))
    if (isNaN(val) || val < 0) {
      setError("Ingresa un monto valido")
      return
    }
    setLoading(true)
    setError("")
    try {
      const result = await abrirCaja(val)
      if (result.status === "error" || !result.caja) {
        setError(result.error ?? "Error al abrir caja")
        return
      }
      if (result.status === "already_open") {
        // otra pestana/conexion ya abrio la caja - cerrar modal y refrescar
        setShowOpenModal(false)
        window.dispatchEvent(new CustomEvent("caja:abierta"))
        onSuccess?.()
        return
      }
      setShowOpenModal(false)
      window.dispatchEvent(new CustomEvent("caja:abierta"))
      onSuccess?.()
    } catch {
      setError("Error inesperado. Intenta de nuevo.")
    } finally {
      setLoading(false)
    }
  }

  if (!mounted) return null

  return (
    <Dialog open={showOpenModal} onOpenChange={() => {}}>
      <DialogContent
        role="dialog"
        aria-modal="true"
        className="max-w-sm rounded-2xl border-slate-200 bg-white p-6 shadow-xl"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
        hideCloseButton
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg tracking-tight text-slate-900">
            <Store className="h-5 w-5 text-emerald-600" />
            Abrir Caja
          </DialogTitle>
          <DialogDescription className="text-left text-slate-600">
            Debes abrir la caja para poder continuar. Se precarga el fondo configurado para este local.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-1.5">
          <Label className="text-[11px] font-semibold uppercase tracking-wide text-slate-600">
            Fondo inicial en efectivo
          </Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-semibold">$</span>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={monto}
              onChange={(e) => {
                setMonto(e.target.value)
                setError("")
              }}
              className="pl-7 text-xl font-bold"
              onKeyDown={(e) => {
                if (e.key === "Enter") void handleOpen()
              }}
              autoFocus
            />
          </div>
          <p className="text-[11px] leading-relaxed text-slate-500">
            Fondo configurado: ${configuredFondo}. Puedes modificarlo solo para este turno.
          </p>
          {error && (
            <p className="flex items-center gap-1 text-[11px] text-red-600 font-medium">
              <AlertCircle className="h-3 w-3" />
              {error}
            </p>
          )}
        </div>
        <div className="mt-4 flex justify-end gap-3">
          <Button
            onClick={() => void handleOpen()}
            disabled={loading}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold w-full"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Store className="h-4 w-4" />
            )}
            Abrir Caja
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}


