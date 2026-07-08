export function onlyDigits(phone: string | null | undefined): string {
  return String(phone ?? "").replace(/\D/g, "")
}

export function last4(phone: string | null | undefined): string {
  return onlyDigits(phone).slice(-4)
}

