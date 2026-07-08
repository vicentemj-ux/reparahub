"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { searchClientByPhone } from "@/lib/actions/repairs-prisma"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { CheckCircle2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

export type ClientAutocompletePayload = {
  id: string
  nombre: string
  telefono: string
  correo: string
}

/** Telefono solo digitos; correo string seguro. */
function normalizeClientPayload(raw: ClientAutocompletePayload | null): ClientAutocompletePayload | null {
  if (!raw) return null
  const tel = raw.telefono.replace(/\D/g, "")
  const id = raw.id ?? ""
  const nombreTrim = raw.nombre.trim()
  const nombre = nombreTrim || (id ? "Cliente" : "")
  return {
    id,
    nombre,
    telefono: tel,
    correo: (raw.correo ?? "").trim(),
  }
}

interface ClientAutocompleteProps {
  onClientFound: (client: ClientAutocompletePayload | null) => void
  /** Pre-populate fields when editing an existing repair */
  initialClient?: { id?: string; nombre: string; telefono: string; correo: string } | null
  /** Modal nuevo ticket: inputs mas bajos y menos espacio vertical */
  compact?: boolean
  /** Minimo de digitos para buscar/emitir telefono. POS usa 8 para evitar capturas parciales. */
  minPhoneDigits?: number
  /** Si es false, no emite telefono sin nombre/id mientras el usuario todavia captura. */
  emitProvisional?: boolean
}

export function ClientAutocomplete({
  onClientFound,
  initialClient,
  compact = false,
  minPhoneDigits = 6,
  emitProvisional = true,
}: ClientAutocompleteProps) {
  const onClientFoundRef = useRef(onClientFound)
  const seededClientSignatureRef = useRef("")
  const [phone, setPhone] = useState("")
  const [clientName, setClientName] = useState("")
  const [clientId, setClientId] = useState("")
  const [isFrequent, setIsFrequent] = useState(false)
  const [isSearching, setIsSearching] = useState(false)
  const [isFieldsLocked, setIsFieldsLocked] = useState(false)
  const [displayPhone, setDisplayPhone] = useState("")

  useEffect(() => {
    onClientFoundRef.current = onClientFound
  }, [onClientFound])

  const emit = useCallback((raw: ClientAutocompletePayload | null) => {
    onClientFoundRef.current(normalizeClientPayload(raw))
  }, [])

  // Format phone display for variable-length LATAM numbers
  const formatPhoneDisplay = (value: string) => {
    const cleaned = value.replace(/\D/g, "")
    if (cleaned.length <= 2) return cleaned
    if (cleaned.length <= 6) return `${cleaned.slice(0, 2)} ${cleaned.slice(2)}`
    return `${cleaned.slice(0, 2)} ${cleaned.slice(2, 6)} ${cleaned.slice(6)}`
  }

  // Pre-populate when editing an existing repair
  useEffect(() => {
    if (!initialClient) {
      seededClientSignatureRef.current = ""
      return
    }

    const signature = [
      initialClient.id ?? "",
      initialClient.nombre ?? "",
      initialClient.telefono ?? "",
      initialClient.correo ?? "",
    ].join("|")

    if (seededClientSignatureRef.current === signature) return
    seededClientSignatureRef.current = signature

    const tel = initialClient.telefono || ""
    setPhone(tel)
    setDisplayPhone(formatPhoneDisplay(tel))
    setClientName(initialClient.nombre || "")
    setClientId(initialClient.id || "")
    setIsFrequent(false)
    setIsFieldsLocked(false)
    emit({
      id: initialClient.id || "",
      nombre: initialClient.nombre || "",
      telefono: tel,
      correo: initialClient.correo || "",
    })
  }, [initialClient, emit])

  // Debounced search for client by phone
  const debouncedSearch = useCallback(
    async (phoneNumber: string) => {
      if (phoneNumber.length < minPhoneDigits) {
        setIsFrequent(false)
        setClientName("")
        setClientId("")
        setIsFieldsLocked(false)
        emit(null)
        return
      }

      setIsSearching(true)
      const { client } = await searchClientByPhone(phoneNumber)

      if (client) {
        // Client found - frecuente (id estable para cliente_id / validacion)
        setClientName(client.nombre)
        setClientId(client.id)
        setIsFrequent(true)
        setIsFieldsLocked(true)
        emit({
          id: client.id,
          nombre: (client.nombre?.trim() || "Cliente"),
          telefono: phoneNumber,
          correo: client.correo ?? "",
        })
      } else {
        // Client not found - allow registering new client with name
        setClientName("")
        setClientId("")
        setIsFrequent(false)
        setIsFieldsLocked(false)
        if (emitProvisional) {
          emit({
            id: "",
            nombre: "",
            telefono: phoneNumber,
            correo: "",
          })
        } else {
          emit(null)
        }
      }

      setIsSearching(false)
    },
    [emit, emitProvisional, minPhoneDigits]
  )

  // Trigger search when phone changes
  useEffect(() => {
    const timer = setTimeout(() => {
      const cleanedPhone = phone.replace(/\D/g, "")
      if (cleanedPhone.length >= minPhoneDigits) {
        debouncedSearch(cleanedPhone)
      } else {
        setIsFrequent(false)
        setClientId("")
        setIsFieldsLocked(false)
        emit(null)
      }
    }, 300) // 300ms debounce

    return () => clearTimeout(timer)
  }, [phone, debouncedSearch, emit, minPhoneDigits])

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setPhone(value)
    setDisplayPhone(formatPhoneDisplay(value))
  }

  const inClass = compact
    ? "h-8 rounded-lg border-slate-200 px-2.5 text-xs focus-visible:ring-2 focus-visible:ring-blue-500/50"
    : ""
  const labClass = compact ? "text-[11px] font-semibold uppercase tracking-wide text-slate-500" : ""

  return (
    <div className={compact ? "space-y-2" : "space-y-4"}>
      {/* Telefono del Cliente - Primary field */}
      <div className={compact ? "flex flex-col gap-1" : "flex flex-col gap-2"}>
        <Label htmlFor="customer-phone" className={labClass}>
          Telefono del Cliente *
        </Label>
        <div className="relative">
          <Input
            id="customer-phone"
            name="customer-phone"
            placeholder="55 1234 5678"
            type="tel"
            value={displayPhone}
            onChange={handlePhoneChange}
            required
            className={inClass}
          />
          {isSearching && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          )}
        </div>
      </div>

      {/* Cliente Frecuente Badge */}
      {isFrequent && (
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 hover:bg-emerald-50">
            Cliente Frecuente
          </Badge>
        </div>
      )}

      {/* Nombre del Cliente */}
      <div className={compact ? "flex flex-col gap-1" : "flex flex-col gap-2"}>
        <Label htmlFor="customer-name" className={labClass}>
          Nombre Completo *
        </Label>
        <Input
          id="customer-name"
          name="customer-name"
          placeholder="Ej. Maria Lopez Garcia"
          value={clientName}
          onChange={(e) => {
            const newName = e.target.value
            setClientName(newName)
            if (!isFieldsLocked) {
              const rawPhone = phone.replace(/\D/g, "")
              if (rawPhone.length >= minPhoneDigits) {
                emit(
                  newName.trim()
                    ? { id: clientId, nombre: newName, telefono: rawPhone, correo: "" }
                    : null
                )
              }
            }
          }}
          readOnly={isFieldsLocked}
          className={cn(isFieldsLocked ? "bg-muted" : "", inClass)}
          required
        />
      </div>

      {/* Store actual clientId in hidden input for form submission */}
      <input type="hidden" name="client-id" value={clientId} />
    </div>
  )
}
