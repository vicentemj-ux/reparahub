export interface CustomerGreetingWhatsAppPayload {
  customerName?: string | null
  shopName?: string | null
}

export function buildCustomerGreetingWhatsAppMessage({
  customerName,
  shopName,
}: CustomerGreetingWhatsAppPayload) {
  const name = customerName?.trim() || "cliente"
  const business = shopName?.trim() || "nuestro taller"

  return [
    `Hola ${name}, bienvenido(a) a *${business}*.`,
    "",
    "Gracias por visitarnos hoy. Guarda este numero para recibir tus comprobantes, seguimiento, promociones y novedades del taller.",
    "",
    "Si necesitas una cotizacion, datos para transferencia o cualquier apoyo, con gusto te atendemos por aqui.",
  ].join("\n")
}
