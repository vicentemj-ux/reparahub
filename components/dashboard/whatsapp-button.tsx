"use client"

import { Button } from "@/components/ui/button"
import { MessageCircle } from "lucide-react"
import { buildCustomerWhatsAppUrl, normalizePhoneForWhatsApp } from "@/lib/whatsapp-utils"

interface WhatsAppButtonProps {
  phone: string
  customerName?: string
  countryCode?: string
  variant?: "default" | "outline" | "ghost"
  size?: "default" | "sm" | "lg"
  className?: string
}

export function WhatsAppButton({
  phone,
  customerName = "Cliente",
  countryCode,
  variant = "outline",
  size = "sm",
  className = "",
}: WhatsAppButtonProps) {
  const handleWhatsApp = () => {
    if (!phone) return

    const digits = normalizePhoneForWhatsApp(phone, countryCode)
    if (!digits) return

    const message = `Hola ${customerName}, te contacto desde ReparaHub.`
    window.open(buildCustomerWhatsAppUrl(digits, message), "_blank", "noopener,noreferrer")
  }

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleWhatsApp}
      disabled={!phone}
      className={className}
      title={`Enviar WhatsApp a ${phone}`}
    >
      <MessageCircle className="h-4 w-4" />
    </Button>
  )
}
