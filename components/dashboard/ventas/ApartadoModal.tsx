"use client"

import { useEffect, useMemo, useState, useTransition } from "react"
import { CalendarDays, CreditCard, Loader2, PackageCheck, Phone, ReceiptText, Smartphone, WalletCards, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { ActiveCustomerIndicator } from "@/components/dashboard/active-customer-indicator"
import { ClientAutocomplete, type ClientAutocompletePayload } from "@/components/dashboard/client-autocomplete"
import { crearApartado, type ApartadoResumen, type ApartadoMetodoPago } from "@/lib/actions/apartados-prisma"
import { type ProductoDisponible } from "@/lib/actions/ventas-prisma"
import { useToast } from "@/hooks/use-toast"
import { addDaysToYmd, todayYmdInTimezone } from "@/lib/date-utils"
import { useActiveCustomer } from "@/lib/context/active-customer-context"

interface ApartadoModalProps {
  product: ProductoDisponible | null
  open: boolean
  onClose: () => void
  onCreated: (apartado: ApartadoResumen) => void
}

const paymentMethods: Array<{ key: ApartadoMetodoPago; label: string; icon: typeof WalletCards }> = [
  { key: "efectivo", label: "Efectivo", icon: WalletCards },
  { key: "tarjeta", label: "Tarjeta", icon: CreditCard },
  { key: "transferencia", label: "Transf.", icon: ReceiptText },
]

const PLAZO_PRESETS: number[] = [15, 30, 45, 60, 90]
const PLAZO_DEFAULT = 30
const PLAZO_MIN = 1
const PLAZO_MAX = 365

function currency(value: number) {
  return value.toLocaleString("es-MX", { style: "currency", currency: "MXN" })
}

/**
 * Parsea un "YYYY-MM-DD" como fecha LOCAL para mostrarla sin que se
 * desplace un dia por la zona horaria del browser.
 */
function formatYmdLocal(ymd: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd)
  if (!m) return ymd
  const [, y, mo, d] = m
  const date = new Date(Number(y), Number(mo) - 1, Number(d))
  return date.toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" })
}

export function ApartadoModal({ product, open, onClose, onCreated }: ApartadoModalProps) {
  const { toast } = useToast()
  const { activeCustomer, setActiveCustomer, clearActiveCustomer } = useActiveCustomer()
  const [isPending, startTransition] = useTransition()
  const [client, setClient] = useState<ClientAutocompletePayload | null>(null)
  const [cantidad, setCantidad] = useState("1")
  const [precio, setPrecio] = useState("")
  const [anticipo, setAnticipo] = useState("")
  const [metodo, setMetodo] = useState<ApartadoMetodoPago>("efectivo")
  const [referencia, setReferencia] = useState("")
  const [plazoDias, setPlazoDias] = useState<number>(PLAZO_DEFAULT)
  const [plazoInput, setPlazoInput] = useState<string>(String(PLAZO_DEFAULT))
  const [notas, setNotas] = useState("")
  const safeProduct = useMemo(
    () =>
      product
        ? {
            ...product,
            precio_venta: Number.isFinite(Number(product.precio_venta)) ? Number(product.precio_venta) : 0,
            stock_actual: Number.isFinite(Number(product.stock_actual)) ? Math.max(0, Math.floor(Number(product.stock_actual))) : 0,
          }
        : null,
    [product],
  )

  const qty = Math.max(1, Math.floor(Number(cantidad || 1)))
  const price = Number(precio || safeProduct?.precio_venta || 0)
  const paid = Number(anticipo || 0)
  const total = useMemo(() => Math.max(0, qty * price), [qty, price])
  const saldo = Math.max(0, total - paid)
  const initialClient = useMemo(
    () =>
      activeCustomer.mode === "selected"
        ? {
            id: activeCustomer.id,
            nombre: activeCustomer.nombre,
            telefono: activeCustomer.telefono,
            correo: activeCustomer.correo ?? "",
          }
        : null,
    [activeCustomer],
  )

  // Resolver la fecha limite en la zona horaria del browser para mostrarla
  // como preview. El server hace la misma operacion en la TZ del tenant.
  const todayYmd = useMemo(() => {
    try {
      return todayYmdInTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone)
    } catch {
      const d = new Date()
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
    }
  }, [])
  const plazoValido = plazoDias >= PLAZO_MIN && plazoDias <= PLAZO_MAX
  const fechaLimitePreview = plazoValido ? addDaysToYmd(todayYmd, plazoDias) : null

  useEffect(() => {
    if (!open) return
    if (initialClient) {
      setClient(initialClient)
      return
    }
    setClient(null)
  }, [initialClient, open])

  if (!open || !product) return null

  const resetAndClose = () => {
    setClient(null)
    setCantidad("1")
    setPrecio("")
    setAnticipo("")
    setMetodo("efectivo")
    setReferencia("")
    setPlazoDias(PLAZO_DEFAULT)
    setPlazoInput(String(PLAZO_DEFAULT))
    setNotas("")
    onClose()
  }

  const handlePlazoPreset = (days: number) => {
    setPlazoDias(days)
    setPlazoInput(String(days))
  }

  const handlePlazoInputChange = (raw: string) => {
    const digits = raw.replace(/\D/g, "").slice(0, 3)
    setPlazoInput(digits)
    const n = Number(digits)
    setPlazoDias(Number.isFinite(n) ? n : 0)
  }

  const submit = () => {
    if (!plazoValido) {
      toast({
        title: "Plazo invalido",
        description: `El plazo debe estar entre ${PLAZO_MIN} y ${PLAZO_MAX} dias.`,
        variant: "destructive",
      })
      return
    }
    startTransition(async () => {
      try {
        const result = await crearApartado({
          producto_id: product.id,
          cliente_nombre: client?.nombre || null,
          cliente_telefono: client?.telefono || "",
          cantidad: qty,
          precio_acordado: price,
          anticipo: paid,
          metodo_pago: metodo,
          referencia_pago: referencia,
          plazo_dias: plazoDias,
          notas,
        })
        if (result.error || !result.data) {
          toast({ title: "No se pudo crear apartado", description: result.error ?? "Intenta de nuevo.", variant: "destructive" })
          return
        }
        toast.success("Apartado creado")
        onCreated(result.data)
        resetAndClose()
      } catch (error) {
        toast({
          title: "No se pudo crear apartado",
          description: error instanceof Error ? error.message : "Intenta de nuevo.",
          variant: "destructive",
        })
      }
    })
  }

  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center bg-slate-200/75 px-3 py-4 backdrop-blur-sm sm:items-center" role="dialog" aria-modal="true">
      <div className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-2xl">
        <div className="relative overflow-hidden border-b border-slate-100 bg-gradient-to-br from-white via-blue-50 to-blue-100 px-5 py-5 text-white sm:px-7">
          <button type="button" onClick={resetAndClose} className="absolute right-4 top-4 rounded-full bg-blue-50 p-2 text-slate-700 transition hover:bg-blue-100 hover:text-blue-700">
            <X className="h-4 w-4" />
          </button>
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-500 shadow-lg shadow-blue-950/30">
              <PackageCheck className="h-6 w-6" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.26em] text-blue-200">Apartado PRO</p>
              <h2 className="truncate text-xl font-black italic tracking-tight">Reservar producto</h2>
              <p className="truncate text-sm text-slate-600">{product.nombre}</p>
            </div>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-7">
          <div className="mb-5 rounded-2xl border border-blue-100 bg-blue-50/70 px-4 py-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-widest text-blue-900">Producto reservado</p>
                <p className="text-sm font-semibold text-slate-700">Stock disponible: {safeProduct?.stock_actual ?? 0}</p>
              </div>
              <Badge className="bg-blue-600 text-white">{currency(safeProduct?.precio_venta ?? 0)}</Badge>
            </div>
          </div>

          <div className="grid gap-5 lg:grid-cols-[1.05fr_0.95fr]">
            <section className="space-y-4">
              <div>
                <div className="mb-2 flex items-center gap-2">
                  <Phone className="h-4 w-4 text-blue-600" />
                  <p className="text-xs font-black uppercase tracking-widest text-slate-500">Cliente</p>
                </div>
                <ActiveCustomerIndicator compact className="mb-3" />
                <ClientAutocomplete
                  initialClient={initialClient}
                  onClientFound={(payload) => {
                    setClient(payload)
                    if (payload?.telefono) {
                      setActiveCustomer({
                        id: payload.id || "",
                        nombre: payload.nombre || "Cliente",
                        telefono: payload.telefono,
                        correo: payload.correo || "",
                      })
                    } else {
                      clearActiveCustomer()
                    }
                  }}
                  compact
                  minPhoneDigits={8}
                  emitProvisional
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-[11px] font-bold uppercase tracking-widest text-slate-500">Cantidad</Label>
                  <Input value={cantidad} onChange={(e) => setCantidad(e.target.value)} type="number" min={1} max={safeProduct?.stock_actual ?? 0} className="mt-1 h-11 rounded-2xl" />
                </div>
                <div>
                  <Label className="text-[11px] font-bold uppercase tracking-widest text-slate-500">Precio acordado</Label>
                  <Input value={precio || String(safeProduct?.precio_venta ?? 0)} onChange={(e) => setPrecio(e.target.value)} type="number" min={1} className="mt-1 h-11 rounded-2xl" />
                </div>
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between gap-2">
                  <Label className="text-[11px] font-bold uppercase tracking-widest text-slate-500">Plazo en dias</Label>
                  {fechaLimitePreview && plazoValido && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700">
                      <CalendarDays className="h-3 w-3" />
                      Vence {formatYmdLocal(fechaLimitePreview)}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Input
                      inputMode="numeric"
                      type="text"
                      value={plazoInput}
                      onChange={(e) => handlePlazoInputChange(e.target.value)}
                      placeholder="30"
                      aria-label="Plazo en dias"
                      aria-invalid={!plazoValido}
                      className="h-11 rounded-2xl pl-3 pr-12 text-lg font-black"
                    />
                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-black uppercase tracking-widest text-slate-500">
                      dias
                    </span>
                  </div>
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {PLAZO_PRESETS.map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => handlePlazoPreset(d)}
                      className={`min-w-[44px] rounded-full border px-3 py-1.5 text-[10px] font-black uppercase tracking-wider transition ${
                        plazoDias === d
                          ? "border-blue-600 bg-blue-600 text-white shadow-sm"
                          : "border-slate-200 bg-white text-slate-600 hover:border-blue-200 hover:bg-blue-50"
                      }`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
                {!plazoValido && plazoInput.length > 0 && (
                  <p className="mt-1.5 text-[10px] font-semibold text-red-600">
                    Ingresa un plazo entre {PLAZO_MIN} y {PLAZO_MAX} dias.
                  </p>
                )}
              </div>
            </section>

            <section className="space-y-4 rounded-3xl border border-slate-200 bg-slate-50 p-4">
              <div>
                <p className="text-xs font-black uppercase tracking-widest text-slate-500">Anticipo inicial</p>
                <Input value={anticipo} onChange={(e) => setAnticipo(e.target.value)} type="number" min={1} className="mt-2 h-12 rounded-2xl bg-white text-lg font-black" placeholder="3000" />
              </div>
              <div className="grid grid-cols-3 gap-2">
                {paymentMethods.map(({ key, label, icon: Icon }) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setMetodo(key)}
                    className={`flex min-h-14 flex-col items-center justify-center rounded-2xl border text-[10px] font-black uppercase tracking-wider transition ${metodo === key ? "border-blue-600 bg-blue-600 text-white shadow-lg shadow-blue-600/20" : "border-slate-200 bg-white text-slate-600 hover:border-blue-200 hover:bg-blue-50"}`}
                  >
                    <Icon className="mb-1 h-4 w-4" />
                    {label}
                  </button>
                ))}
              </div>
              {metodo !== "efectivo" && (
                <Input value={referencia} onChange={(e) => setReferencia(e.target.value)} className="h-11 rounded-2xl bg-white" placeholder="Referencia / autorizacion" />
              )}
              <Input value={notas} onChange={(e) => setNotas(e.target.value)} className="h-11 rounded-2xl bg-white" placeholder="Notas internas opcionales" />

              <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
                <div className="flex justify-between text-sm text-slate-500"><span>Total</span><strong className="text-slate-900">{currency(total)}</strong></div>
                <div className="mt-2 flex justify-between text-sm text-slate-500"><span>Anticipo</span><strong className="text-emerald-700">{currency(paid || 0)}</strong></div>
                <div className="mt-3 border-t border-dashed border-slate-200 pt-3 flex justify-between"><span className="text-xs font-black uppercase tracking-widest text-slate-500">Saldo</span><strong className="text-xl font-black text-slate-950">{currency(saldo)}</strong></div>
              </div>
            </section>
          </div>
        </div>

        <div className="flex shrink-0 flex-col gap-2 border-t border-slate-100 bg-white px-5 py-4 sm:flex-row sm:justify-end sm:px-7">
          <Button type="button" variant="outline" onClick={resetAndClose} className="h-11 rounded-2xl">Cancelar</Button>
          <Button type="button" onClick={submit} disabled={isPending} className="h-11 rounded-2xl bg-blue-600 text-white hover:bg-blue-700 btn-glow">
            {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Smartphone className="mr-2 h-4 w-4" />}
            Crear apartado
          </Button>
        </div>
      </div>
    </div>
  )
}

