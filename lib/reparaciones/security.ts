import { decodePattern, MIN_PATTERN } from "@/lib/reparaciones/pattern"

export type SecurityTab = "none" | "pin" | "password" | "pattern"

export interface SecurityValue {
  type: SecurityTab
  value: string
}

export type RepairSecurityType = SecurityTab

export { decodePattern, MIN_PATTERN } from "@/lib/reparaciones/pattern"

export function isSecurityInputComplete(s: SecurityValue): boolean {
  if (s.type === "none") return true
  if (s.type === "pin") return /^\d{4,12}$/.test(s.value.trim())
  if (s.type === "password") return s.value.trim().length >= 1
  if (s.type === "pattern") return decodePattern(s.value).length >= MIN_PATTERN
  return false
}

/** Persistencia en reparaciones + compatibilidad pin_contrasena / patron_desbloqueo */
export function normalizeSecurityForDb(input: {
  securityType?: string | null
  securityValue?: string | null
  pinContrasena?: string | null
  patronDesbloqueo?: string | null
}): {
  security_type: string | null
  security_value: string | null
  pin_contrasena: string | null
  patron_desbloqueo: string | null
} {
  const st = (input.securityType || "").trim().toLowerCase()
  const sv = (input.securityValue || "").trim()

  if (st === "none") {
    return {
      security_type: "none",
      security_value: null,
      pin_contrasena: null,
      patron_desbloqueo: null,
    }
  }

  if (st && sv) {
    if (st === "pattern") {
      return {
        security_type: "pattern",
        security_value: sv,
        pin_contrasena: null,
        patron_desbloqueo: sv,
      }
    }
    if (st === "pin" || st === "password") {
      return {
        security_type: st,
        security_value: sv,
        pin_contrasena: sv,
        patron_desbloqueo: null,
      }
    }
  }

  const legacyPin = (input.pinContrasena || "").trim()
  const legacyPat = (input.patronDesbloqueo || "").trim()
  if (legacyPat) {
    return {
      security_type: "pattern",
      security_value: legacyPat,
      pin_contrasena: null,
      patron_desbloqueo: legacyPat,
    }
  }
  if (legacyPin) {
    return {
      security_type: "pin",
      security_value: legacyPin,
      pin_contrasena: legacyPin,
      patron_desbloqueo: null,
    }
  }

  return {
    security_type: null,
    security_value: null,
    pin_contrasena: null,
    patron_desbloqueo: null,
  }
}

export function mapRecordToSecurityDisplay(rec: Record<string, unknown>): {
  securityType: SecurityTab
  securityValue: string | null
  /** Compat: PIN/contrasena unificados en pin legado */
  pinContrasena: string | null
  patronDesbloqueo: string | null
} {
  const rawSt = (rec.security_type as string | null | undefined)?.trim().toLowerCase() || ""
  const rawSv = (rec.security_value as string | null | undefined)?.trim() || ""

  const pinRaw =
    rec.pin_contrasena ?? rec.password ?? rec.pin ?? rec.codigo_desbloqueo
  const pinContrasena =
    pinRaw != null && String(pinRaw).trim() !== "" ? String(pinRaw) : null
  const patronDesbloqueo =
    rec.patron_desbloqueo != null && String(rec.patron_desbloqueo).trim() !== ""
      ? String(rec.patron_desbloqueo)
      : null

  if (rawSt === "none") {
    return { securityType: "none", securityValue: null, pinContrasena: null, patronDesbloqueo: null }
  }
  if (rawSt === "pattern" && rawSv) {
    return { securityType: "pattern", securityValue: rawSv, pinContrasena, patronDesbloqueo }
  }
  if ((rawSt === "pin" || rawSt === "password") && rawSv) {
    return {
      securityType: rawSt as SecurityTab,
      securityValue: rawSv,
      pinContrasena,
      patronDesbloqueo,
    }
  }

  if (patronDesbloqueo) {
    return {
      securityType: "pattern",
      securityValue: patronDesbloqueo,
      pinContrasena,
      patronDesbloqueo,
    }
  }
  if (pinContrasena) {
    return {
      securityType: "pin",
      securityValue: pinContrasena,
      pinContrasena,
      patronDesbloqueo,
    }
  }

  return { securityType: "none", securityValue: null, pinContrasena: null, patronDesbloqueo: null }
}
