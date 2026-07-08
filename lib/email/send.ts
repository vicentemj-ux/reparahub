"use server"

import { Resend } from "resend"
import { MemberVerificationPinTemplate, VerifyEmailTemplate, ResetPasswordTemplate } from "./templates"
import type { AlertaEstancadasItem, AlertaStockBajoItem, ReporteDiarioResumen } from "./types"

function getResendClient() {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    console.error("[email] RESEND_API_KEY is missing")
    return null
  }
  return new Resend(apiKey)
}

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || (process.env.NODE_ENV === "development" ? "http://localhost:3000" : "https://reparahub.com")
const DEFAULT_FROM = process.env.RESEND_FROM_EMAIL
  ? `ReparaHub <${process.env.RESEND_FROM_EMAIL}>`
  : "ReparaHub <noreply@reparahub.com>"
const REPORTES_FROM = process.env.RESEND_REPORTS_EMAIL
  ? `ReparaHub <${process.env.RESEND_REPORTS_EMAIL}>`
  : "ReparaHub <reportes@reparahub.com>"

export async function sendVerificationEmail(
  email: string,
  userName: string,
  tallerName: string,
  verificationToken: string,
  signature?: string
) {
  const verificationLink = `${BASE_URL}/auth/verify-email?token=${verificationToken}${signature ? `&sig=${signature}` : ""}`

  try {
    const resend = getResendClient()
    if (!resend) return { success: false, error: "Servicio de correo no configurado" }

    const { data, error } = await resend.emails.send({
      from: DEFAULT_FROM,
      to: email,
      subject: "Verifica tu correo en ReparaHub",
      react: VerifyEmailTemplate({
        userName,
        verificationLink,
        tallerName,
      }),
    })

    if (error) throw error
    return { success: true, messageId: data!.id }
  } catch (error) {
    console.error("[v0] Error sending verification email:", error)
    return { success: false, error: "Error al enviar correo de verificacion" }
  }
}

export async function sendPasswordResetEmail(
  email: string,
  userName: string,
  tallerName: string,
  resetToken: string,
  signature?: string
) {
  const resetLink = `${BASE_URL}/auth/reset-password?token=${resetToken}${signature ? `&sig=${signature}` : ""}`

  try {
    const resend = getResendClient()
    if (!resend) return { success: false, error: "Servicio de correo no configurado" }

    const { data, error } = await resend.emails.send({
      from: DEFAULT_FROM,
      to: email,
      subject: "Recupera tu contrasena en ReparaHub",
      react: ResetPasswordTemplate({
        userName,
        resetLink,
        tallerName,
      }),
    })

    if (error) throw error
    return { success: true, messageId: data!.id }
  } catch (error) {
    console.error("[v0] Error sending password reset email:", error)
    return { success: false, error: "Error al enviar correo de recuperacion" }
  }
}

export async function sendWelcomeEmail(
  email: string,
  userName: string,
  tallerName: string
) {
  try {
    const resend = getResendClient()
    if (!resend) return { success: false, error: "Servicio de correo no configurado" }

    const { data, error } = await resend.emails.send({
      from: DEFAULT_FROM,
      to: email,
      subject: "Bienvenido a ReparaHub",
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; }
              .container { max-width: 600px; margin: 0 auto; padding: 40px; background: #f5f5f5; }
              .card { background: white; border-radius: 8px; padding: 40px; }
              .header { text-align: center; margin-bottom: 30px; }
              .header h1 { color: #2563eb; margin: 0; }
              .content { color: #666; line-height: 1.6; }
              .footer { border-top: 1px solid #eee; padding-top: 20px; text-align: center; color: #999; font-size: 12px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="card">
                <div class="header">
                  <h1>¡Bienvenido a ReparaHub!</h1>
                </div>
                <div class="content">
                  <p>Hola ${userName},</p>
                  <p>Tu taller <strong>${tallerName}</strong> esta listo para usar ReparaHub.</p>
<p>Accede a tu dashboard en <a href="${BASE_URL}">ReparaHub</a> para comenzar a gestionar tus reparaciones.</p>
          <p>Si tienes preguntas, no dudes en contactarnos.</p>
                </div>
                <div class="footer">
                  <p>© 2024 ReparaHub. Todos los derechos reservados.</p>
                </div>
              </div>
            </div>
          </body>
        </html>
      `,
    })

    if (error) throw error
    return { success: true, messageId: data!.id }
  } catch (error) {
    console.error("[v0] Error sending welcome email:", error)
    return { success: false, error: "Error al enviar correo de bienvenida" }
  }
}

export async function sendAdminOTPEmail(email: string, code: string) {
  try {
    const resend = getResendClient()
    if (!resend) return { success: false, error: "Servicio de correo no configurado" }

    const { data, error } = await resend.emails.send({
      from: DEFAULT_FROM,
      to: email,
      subject: `${code} - Codigo de verificacion de administrador`,
      html: `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f8fafc; margin: 0; padding: 40px 0; }
    .wrap { max-width: 480px; margin: 0 auto; }
    .card { background: #ffffff; border-radius: 12px; padding: 40px; border: 1px solid #e2e8f0; }
    .logo { color: #60a5fa; font-size: 13px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; margin-bottom: 28px; }
    h1 { color: #f1f5f9; font-size: 20px; font-weight: 700; margin: 0 0 8px; }
    p { color: #94a3b8; font-size: 14px; line-height: 1.6; margin: 0 0 24px; }
    .code-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; text-align: center; margin: 24px 0; }
    .code { font-family: 'Courier New', monospace; font-size: 36px; font-weight: 700; letter-spacing: 0.25em; color: #60a5fa; }
    .expiry { color: #64748b; font-size: 12px; margin-top: 8px; }
    .warning { background: #431407; border: 1px solid #7c2d12; border-radius: 6px; padding: 12px 16px; color: #fca5a5; font-size: 12px; }
    .footer { color: #475569; font-size: 11px; margin-top: 28px; padding-top: 20px; border-top: 1px solid #ffffff; }
  </style>
</head>
<body>
<div class="wrap">
  <div class="card">
    <div class="logo">ReparaHub - Admin</div>
    <h1>Verificacion de identidad</h1>
    <p>Se solicito acceso al panel de administracion. Ingresa este codigo de 6 digitos para continuar.</p>
    <div class="code-box">
      <div class="code">${code}</div>
      <div class="expiry">Valido por 10 minutos</div>
    </div>
    <div class="warning">
      ⚠️ Si no solicitaste este codigo, alguien puede estar intentando acceder a tu cuenta. Cambia tu contrasena inmediatamente.
    </div>
    <div class="footer">Este correo fue enviado automaticamente por ReparaHub. No respondas a este mensaje.</div>
  </div>
</div>
</body>
</html>`,
    })
    if (error) throw error
    return { success: true, messageId: data!.id }
  } catch (error) {
    console.error("[admin-otp] Error sending OTP email:", error)
    return { success: false, error: "Error al enviar correo OTP" }
  }
}

export interface SendCorteCajaEmailMovimiento {
  fecha: string
  descripcion: string
  monto: number
  metodoPago: string | null
}

export interface SendCorteCajaEmailCobro {
  fecha: string
  descripcion: string
  monto: number
  metodoPago: string | null
}

export interface SendCorteCajaEmailGasto {
  fecha: string
  descripcion: string
  monto: number
  metodoPago: string | null
}

export interface SendCorteCajaEmailVisita {
  fechaLlegada: string
  fechaSalida: string | null
  cliente: string
  motivo: string
  estado: string
  atendidoPor: string | null
}

export async function sendCorteCajaEmail(input: {
  to: string
  tallerNombre: string
  numeroCorte: number
  fechaApertura: string
  fechaCierre: string
  montoInicial: number
  totalEfectivo: number
  totalTarjeta: number
  totalTransferencia: number
  totalAbonos: number
  totalAbonosEfectivo: number
  totalAbonosTarjeta: number
  totalAbonosTransferencia: number
  totalGastos: number
  totalGastosEfectivo: number
  totalGastosTarjeta: number
  totalGastosTransferencia: number
  totalAnulaciones: number
  totalAnulacionesEfectivo: number
  totalAnulacionesTarjeta: number
  totalAnulacionesTransferencia: number
  saldoFinal: number
  montoCierre: number | null
  diferencia: number | null
  notaCierre?: string | null
  totalVentas: number
  ventas: SendCorteCajaEmailMovimiento[]
  cobrosRep: SendCorteCajaEmailCobro[]
  gastos: SendCorteCajaEmailGasto[]
  anulaciones: SendCorteCajaEmailMovimiento[]
  visitas?: SendCorteCajaEmailVisita[]
}) {
  try {
    const resend = getResendClient()
    if (!resend) return { success: false, error: "Servicio de correo no configurado (RESEND_API_KEY ausente)." }

    const fmt = (n: number) =>
      n.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    const fmtDate = (iso: string) =>
      new Date(iso).toLocaleString("es-MX", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })

    const fmtTime = (iso: string) =>
      new Date(iso).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" })
    const metodoLabel = (m: string | null | undefined) =>
      m === "efectivo" ? "Efectivo" : m === "tarjeta" ? "Tarjeta" : m === "transferencia" ? "Transferencia" : "-"
    const escapeHtml = (s: string) =>
      s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;")

    // Entradas en efectivo: ventas en efectivo + cobros de reparacion en efectivo.
    // Las ventas en tarjeta/transferencia NO afectan la caja fisica.
    const entradasEfectivo = input.totalEfectivo + input.totalAbonosEfectivo
    const salidasEfectivo = input.totalGastosEfectivo + input.totalAnulacionesEfectivo
    const saldoEsperadoEfectivo = input.montoInicial + entradasEfectivo - salidasEfectivo

    const renderMovRows = (
      rows: Array<{ fecha: string; descripcion: string; monto: number; metodoPago: string | null }>,
      max: number,
    ) => {
      const head = rows.slice(0, max)
      const overflow = rows.length - max
      const html = head
        .map(
          (r) => `
                <tr>
                  <td style="padding:7px 12px;font-size:11px;color:#94a3b8;border-bottom:1px solid #ffffff;white-space:nowrap;">${fmtTime(r.fecha)}</td>
                  <td style="padding:7px 12px;font-size:12px;color:#e2e8f0;border-bottom:1px solid #ffffff;">${escapeHtml(r.descripcion)}</td>
                  <td align="right" style="padding:7px 12px;font-size:12px;color:${r.monto < 0 ? "#fca5a5" : "#86efac"};font-weight:600;border-bottom:1px solid #ffffff;white-space:nowrap;">${r.monto < 0 ? "-$" : "$"}${fmt(Math.abs(r.monto))}</td>
                  <td style="padding:7px 12px;font-size:11px;color:#cbd5e1;border-bottom:1px solid #ffffff;white-space:nowrap;">${escapeHtml(metodoLabel(r.metodoPago))}</td>
                </tr>`,
        )
        .join("")
      const overflowHtml =
        overflow > 0
          ? `<tr><td colspan="4" style="padding:8px 12px;font-size:11px;color:#64748b;font-style:italic;text-align:center;">... y ${overflow} movimiento(s) mas</td></tr>`
          : ""
      return html + overflowHtml
    }

    const totalMovimientos =
      input.ventas.length + input.cobrosRep.length + input.gastos.length + input.anulaciones.length

    const subject = `Corte de Caja #${input.numeroCorte} - ${input.tallerNombre}`
    const html = `
<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8" /><title>Corte de Caja</title></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#e2e8f0;">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#f8fafc;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="560" style="max-width:560px;background:#ffffff;border-radius:16px;border:1px solid #e2e8f0;overflow:hidden;">
          <tr>
            <td style="background:linear-gradient(135deg,#2563eb 0%,#1d4ed8 100%);padding:28px 32px;text-align:center;">
              <div style="font-size:11px;letter-spacing:0.25em;color:#bfdbfe;font-weight:700;text-transform:uppercase;">ReparaHub - Reporte Diario</div>
              <h1 style="margin:8px 0 0;font-size:24px;color:#ffffff;font-weight:800;">Corte de Caja #${input.numeroCorte}</h1>
              <div style="margin-top:6px;font-size:13px;color:#bfdbfe;">${input.tallerNombre}</div>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 32px;">
              <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.2em;color:#94a3b8;margin-bottom:8px;">Periodo</div>
              <div style="font-size:13px;color:#cbd5e1;line-height:1.6;">
                <div><strong style="color:#f1f5f9;">Apertura:</strong> ${fmtDate(input.fechaApertura)}</div>
                <div><strong style="color:#f1f5f9;">Cierre:</strong> ${fmtDate(input.fechaCierre)}</div>
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding:0 32px 16px;">
              <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.2em;color:#94a3b8;margin-bottom:10px;">Resumen financiero (por metodo de pago)</div>
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;overflow:hidden;">
                <tr><td colspan="3" style="padding:10px 14px 4px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.16em;color:#86efac;">Entradas</td></tr>
                <tr>
                  <td style="padding:4px 14px;font-size:12px;color:#cbd5e1;border-bottom:1px solid #ffffff;">Ventas PDV (${input.totalVentas})</td>
                  <td style="padding:4px 14px;font-size:11px;color:#94a3b8;border-bottom:1px solid #ffffff;white-space:nowrap;">Ef $${fmt(input.totalEfectivo)} &nbsp; Tj $${fmt(input.totalTarjeta)} &nbsp; Tr $${fmt(input.totalTransferencia)}</td>
                  <td align="right" style="padding:4px 14px;font-size:13px;color:#86efac;font-weight:600;border-bottom:1px solid #ffffff;">$${fmt(input.totalEfectivo + input.totalTarjeta + input.totalTransferencia)}</td>
                </tr>
                <tr>
                  <td style="padding:4px 14px;font-size:12px;color:#cbd5e1;border-bottom:1px solid #ffffff;">Cobros de reparaciones (${input.cobrosRep.length})</td>
                  <td style="padding:4px 14px;font-size:11px;color:#94a3b8;border-bottom:1px solid #ffffff;white-space:nowrap;">Ef $${fmt(input.totalAbonosEfectivo)} &nbsp; Tj $${fmt(input.totalAbonosTarjeta)} &nbsp; Tr $${fmt(input.totalAbonosTransferencia)}</td>
                  <td align="right" style="padding:4px 14px;font-size:13px;color:#86efac;font-weight:600;border-bottom:1px solid #ffffff;">$${fmt(input.totalAbonos)}</td>
                </tr>
                <tr><td colspan="3" style="padding:12px 14px 4px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.16em;color:#fca5a5;">Salidas</td></tr>
                <tr>
                  <td style="padding:4px 14px;font-size:12px;color:#cbd5e1;border-bottom:1px solid #ffffff;">Gastos (${input.gastos.length})</td>
                  <td style="padding:4px 14px;font-size:11px;color:#94a3b8;border-bottom:1px solid #ffffff;white-space:nowrap;">Ef -$${fmt(input.totalGastosEfectivo)} &nbsp; Tj -$${fmt(input.totalGastosTarjeta)} &nbsp; Tr -$${fmt(input.totalGastosTransferencia)}</td>
                  <td align="right" style="padding:4px 14px;font-size:13px;color:#fca5a5;font-weight:600;border-bottom:1px solid #ffffff;">-$${fmt(input.totalGastos)}</td>
                </tr>
                <tr>
                  <td style="padding:4px 14px 10px;font-size:12px;color:#cbd5e1;">Anulaciones (${input.anulaciones.length})</td>
                  <td style="padding:4px 14px 10px;font-size:11px;color:#94a3b8;white-space:nowrap;">Ef -$${fmt(input.totalAnulacionesEfectivo)} &nbsp; Tj -$${fmt(input.totalAnulacionesTarjeta)} &nbsp; Tr -$${fmt(input.totalAnulacionesTransferencia)}</td>
                  <td align="right" style="padding:4px 14px 10px;font-size:13px;color:#fca5a5;font-weight:600;">-$${fmt(input.totalAnulaciones)}</td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:8px 32px 24px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;overflow:hidden;">
                <tr><td colspan="2" style="padding:10px 14px 4px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.16em;color:#bfdbfe;">Calculo de efectivo en caja</td></tr>
                <tr><td style="padding:4px 14px;font-size:12px;color:#cbd5e1;border-bottom:1px solid #ffffff;">Fondo inicial</td><td align="right" style="padding:4px 14px;font-size:13px;color:#f1f5f9;font-weight:600;border-bottom:1px solid #ffffff;">$${fmt(input.montoInicial)}</td></tr>
                <tr><td style="padding:4px 14px;font-size:12px;color:#86efac;border-bottom:1px solid #ffffff;">+ Ventas en efectivo</td><td align="right" style="padding:4px 14px;font-size:13px;color:#86efac;font-weight:600;border-bottom:1px solid #ffffff;">$${fmt(input.totalEfectivo)}</td></tr>
                <tr><td style="padding:4px 14px;font-size:12px;color:#86efac;border-bottom:1px solid #ffffff;">+ Cobros de reparacion en efectivo</td><td align="right" style="padding:4px 14px;font-size:13px;color:#86efac;font-weight:600;border-bottom:1px solid #ffffff;">$${fmt(input.totalAbonosEfectivo)}</td></tr>
                <tr><td style="padding:4px 14px;font-size:12px;color:#fca5a5;border-bottom:1px solid #ffffff;">- Gastos en efectivo</td><td align="right" style="padding:4px 14px;font-size:13px;color:#fca5a5;font-weight:600;border-bottom:1px solid #ffffff;">-$${fmt(input.totalGastosEfectivo)}</td></tr>
                <tr><td style="padding:4px 14px 10px;font-size:12px;color:#fca5a5;">- Anulaciones en efectivo</td><td align="right" style="padding:4px 14px 10px;font-size:13px;color:#fca5a5;font-weight:600;">-$${fmt(input.totalAnulacionesEfectivo)}</td></tr>
              </table>
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:linear-gradient(135deg,#1e3a8a 0%,#1d4ed8 100%);border-radius:10px;margin-top:10px;overflow:hidden;">
                <tr><td style="padding:14px 18px;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.2em;color:#bfdbfe;">Efectivo esperado en caja</td><td align="right" style="padding:14px 18px;font-size:22px;color:#ffffff;font-weight:800;">$${fmt(saldoEsperadoEfectivo)}</td></tr>
              </table>
              ${input.montoCierre != null ? `
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;margin-top:10px;overflow:hidden;">
                <tr><td style="padding:10px 14px;font-size:12px;color:#94a3b8;">Efectivo contado en caja</td><td align="right" style="padding:10px 14px;font-size:13px;color:#f1f5f9;font-weight:600;">$${fmt(input.montoCierre)}</td></tr>
                ${input.diferencia != null && input.diferencia !== 0 ? `
                <tr><td style="padding:10px 14px;font-size:12px;color:${input.diferencia < 0 ? "#fca5a5" : "#86efac"};font-weight:600;">${input.diferencia < 0 ? "Faltante" : "Sobrante"}</td><td align="right" style="padding:10px 14px;font-size:13px;color:${input.diferencia < 0 ? "#fca5a5" : "#86efac"};font-weight:700;">${input.diferencia < 0 ? "-" : "+"}$${fmt(Math.abs(input.diferencia))}</td></tr>
                ` : ""}
              </table>
              ` : ""}
            </td>
          </tr>
          ${totalMovimientos > 0 ? `
          <tr>
            <td style="padding:0 32px 16px;">
              <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.2em;color:#94a3b8;margin-bottom:10px;">Detalle de movimientos (${totalMovimientos})</div>
              ${input.ventas.length > 0 ? `
              <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.14em;color:#86efac;margin:8px 0 4px;">Ventas PDV (${input.ventas.length})</div>
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;margin-bottom:10px;">
                <thead><tr style="background:#ffffff;">
                  <th align="left" style="padding:6px 12px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:#94a3b8;">Hora</th>
                  <th align="left" style="padding:6px 12px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:#94a3b8;">Folio</th>
                  <th align="right" style="padding:6px 12px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:#94a3b8;">Monto</th>
                  <th align="left" style="padding:6px 12px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:#94a3b8;">Metodo</th>
                </tr></thead>
                <tbody>${renderMovRows(input.ventas.map((v) => ({ fecha: v.fecha, descripcion: v.descripcion, monto: v.monto, metodoPago: v.metodoPago })), 8)}</tbody>
              </table>
              ` : ""}
              ${input.cobrosRep.length > 0 ? `
              <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.14em;color:#86efac;margin:8px 0 4px;">Cobros de reparacion (${input.cobrosRep.length})</div>
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;margin-bottom:10px;">
                <thead><tr style="background:#ffffff;">
                  <th align="left" style="padding:6px 12px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:#94a3b8;">Hora</th>
                  <th align="left" style="padding:6px 12px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:#94a3b8;">Concepto</th>
                  <th align="right" style="padding:6px 12px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:#94a3b8;">Monto</th>
                  <th align="left" style="padding:6px 12px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:#94a3b8;">Metodo</th>
                </tr></thead>
                <tbody>${renderMovRows(input.cobrosRep.map((c) => ({ fecha: c.fecha, descripcion: c.descripcion, monto: c.monto, metodoPago: c.metodoPago })), 6)}</tbody>
              </table>
              ` : ""}
              ${input.gastos.length > 0 ? `
              <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.14em;color:#fca5a5;margin:8px 0 4px;">Gastos / Salidas (${input.gastos.length})</div>
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;margin-bottom:10px;">
                <thead><tr style="background:#ffffff;">
                  <th align="left" style="padding:6px 12px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:#94a3b8;">Hora</th>
                  <th align="left" style="padding:6px 12px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:#94a3b8;">Concepto</th>
                  <th align="right" style="padding:6px 12px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:#94a3b8;">Monto</th>
                  <th align="left" style="padding:6px 12px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:#94a3b8;">Metodo</th>
                </tr></thead>
                <tbody>${renderMovRows(input.gastos.map((g) => ({ fecha: g.fecha, descripcion: g.descripcion, monto: -g.monto, metodoPago: g.metodoPago })), 6)}</tbody>
              </table>
              ` : ""}
              ${input.anulaciones.length > 0 ? `
              <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.14em;color:#fca5a5;margin:8px 0 4px;">Anulaciones (${input.anulaciones.length})</div>
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;margin-bottom:10px;">
                <thead><tr style="background:#ffffff;">
                  <th align="left" style="padding:6px 12px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:#94a3b8;">Hora</th>
                  <th align="left" style="padding:6px 12px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:#94a3b8;">Folio</th>
                  <th align="right" style="padding:6px 12px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:#94a3b8;">Monto</th>
                  <th align="left" style="padding:6px 12px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:#94a3b8;">Metodo</th>
                </tr></thead>
                <tbody>${renderMovRows(input.anulaciones.map((a) => ({ fecha: a.fecha, descripcion: a.descripcion, monto: -a.monto, metodoPago: a.metodoPago })), 4)}</tbody>
              </table>
              ` : ""}
            </td>
          </tr>
          ` : ""}
          ${input.visitas && input.visitas.length > 0 ? `
          <tr>
            <td style="padding:0 32px 24px;">
              <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.2em;color:#94a3b8;margin-bottom:10px;">Bitacora de visitas (${input.visitas.length})</div>
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;">
                <thead><tr style="background:#ffffff;">
                  <th align="left" style="padding:6px 10px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:#94a3b8;">Llegada</th>
                  <th align="left" style="padding:6px 10px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:#94a3b8;">Salida</th>
                  <th align="left" style="padding:6px 10px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:#94a3b8;">Cliente</th>
                  <th align="left" style="padding:6px 10px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:#94a3b8;">Motivo</th>
                  <th align="left" style="padding:6px 10px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:#94a3b8;">Estado</th>
                </tr></thead>
                <tbody>
                ${input.visitas.slice(0, 10).map((v) => {
                  const estadoLabel = v.estado === "atendido" ? "Atendido" : v.estado === "se_fue" ? "Se fue" : v.estado === "no_atendido" ? "No atendido" : "Pendiente"
                  const estadoColor = v.estado === "atendido" ? "#86efac" : v.estado === "se_fue" ? "#fca5a5" : v.estado === "no_atendido" ? "#fca5a5" : "#fde68a"
                  return `<tr>
                    <td style="padding:7px 10px;font-size:11px;color:#94a3b8;border-bottom:1px solid #ffffff;white-space:nowrap;">${fmtTime(v.fechaLlegada)}</td>
                    <td style="padding:7px 10px;font-size:11px;color:#94a3b8;border-bottom:1px solid #ffffff;white-space:nowrap;">${v.fechaSalida ? fmtTime(v.fechaSalida) : "-"}</td>
                    <td style="padding:7px 10px;font-size:12px;color:#e2e8f0;border-bottom:1px solid #ffffff;">${escapeHtml(v.cliente || "-")}</td>
                    <td style="padding:7px 10px;font-size:11px;color:#cbd5e1;border-bottom:1px solid #ffffff;">${escapeHtml(v.motivo || "-")}</td>
                    <td style="padding:7px 10px;font-size:11px;color:${estadoColor};font-weight:600;border-bottom:1px solid #ffffff;white-space:nowrap;">${estadoLabel}</td>
                  </tr>`
                }).join("")}
                ${input.visitas.length > 10 ? `<tr><td colspan="5" style="padding:8px 10px;font-size:11px;color:#64748b;font-style:italic;text-align:center;">... y ${input.visitas.length - 10} visita(s) mas</td></tr>` : ""}
                </tbody>
              </table>
            </td>
          </tr>
          ` : ""}
          ${input.notaCierre ? `
          <tr>
            <td style="padding:0 32px 24px;">
              <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.2em;color:#94a3b8;margin-bottom:6px;">Nota de cierre</div>
              <div style="font-size:13px;color:#cbd5e1;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:10px 12px;line-height:1.5;">${input.notaCierre.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</div>
            </td>
          </tr>
          ` : ""}
          <tr>
            <td style="padding:16px 32px 28px;border-top:1px solid #e2e8f0;">
              <div style="font-size:11px;color:#64748b;line-height:1.5;">
                Reporte generado automaticamente por ReparaHub. Este correo fue enviado al contacto registrado en la cuenta (Configuracion del taller).
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`

    const { data, error } = await resend.emails.send({
      from: DEFAULT_FROM,
      to: input.to,
      subject,
      html,
    })

    if (error) throw error
    return { success: true, messageId: data!.id, sentTo: input.to }
  } catch (error) {
    console.error("[corte-email] Error sending corte email:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error al enviar el correo del corte.",
    }
  }
}

export async function sendMemberVerificationPinEmail(
  email: string,
  userName: string,
  pin: string
) {
  try {
    const resend = getResendClient()
    if (!resend) return { success: false, error: "Servicio de correo no configurado" }

    const { data, error } = await resend.emails.send({
      from: DEFAULT_FROM,
      to: email,
      subject: "Bienvenido a ReparaHub - Confirma tu correo electronico",
      react: MemberVerificationPinTemplate({
        userName,
        pin,
      }),
    })

    if (error) throw error
    return { success: true, messageId: data!.id }
  } catch (error) {
    console.error("[v0] Error sending member PIN email:", error)
    return { success: false, error: "Error al enviar correo de verificacion por PIN" }
  }
}

export async function sendTiendaActivadaEmail(input: {
  to: string
  tallerNombre: string
  slug: string
  url: string
}) {
  try {
    const resend = getResendClient()
    if (!resend) return { success: false, error: "Servicio de correo no configurado" }

    const safeNombre = input.tallerNombre.replace(/[<>]/g, "")
    const safeUrl = input.url.replace(/"/g, "&quot;")
    const subject = `Tu tienda publica esta lista - ${safeNombre}`

    const html = `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8" /><title>Mi Tienda activada</title></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#e2e8f0;">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#f8fafc;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="560" style="max-width:560px;background:#ffffff;border-radius:16px;border:1px solid #e2e8f0;overflow:hidden;">
          <tr>
            <td style="background:linear-gradient(135deg,#2563eb 0%,#1d4ed8 100%);padding:28px 32px;text-align:center;">
              <div style="font-size:11px;letter-spacing:0.25em;color:#bfdbfe;font-weight:700;text-transform:uppercase;">ReparaHub</div>
              <h1 style="margin:8px 0 0;font-size:24px;color:#ffffff;font-weight:800;">Mi Tienda ya esta en linea</h1>
              <div style="margin-top:6px;font-size:13px;color:#bfdbfe;">${safeNombre}</div>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 32px;">
              <p style="margin:0 0 16px;font-size:14px;line-height:1.6;color:#cbd5e1;">Tu catalogo publico esta activo. Comparte el siguiente enlace con tus clientes para que vean tus productos y te contacten por WhatsApp.</p>
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;overflow:hidden;">
                <tr><td style="padding:14px 16px;font-size:12px;color:#94a3b8;word-break:break-all;">
                  <a href="${safeUrl}" style="color:#60a5fa;text-decoration:none;">${input.url}</a>
                </td></tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:0 32px 24px;">
              <h3 style="margin:0 0 10px;font-size:13px;color:#f1f5f9;font-weight:700;text-transform:uppercase;letter-spacing:0.15em;">Que puedes hacer ahora</h3>
              <ul style="margin:0;padding-left:20px;font-size:13px;line-height:1.8;color:#cbd5e1;">
                <li>Marca productos como <strong style="color:#f1f5f9;">publicados</strong> desde tu inventario</li>
                <li>Personaliza el slogan, redes y horarios en Mi Tienda</li>
                <li>Comparte el enlace en tus redes sociales</li>
              </ul>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 32px 28px;border-top:1px solid #e2e8f0;">
              <div style="font-size:11px;color:#64748b;line-height:1.5;">
                Plan NORMAL: hasta 5 productos publicados. Actualiza a PRO para llegar a 50 productos.
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`

    const { data, error } = await resend.emails.send({
      from: DEFAULT_FROM,
      to: input.to,
      subject,
      html,
    })

    if (error) throw error
    return { success: true, messageId: data!.id, sentTo: input.to }
  } catch (error) {
    console.error("[tienda-email] Error sending tienda activada email:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error al enviar el correo de activacion.",
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Motor de "Reportes y Alertas" (lib/actions/alertas-prisma.ts)
// Plantillas en HTML oscuro consistentes con sendCorteCajaEmail.
// ─────────────────────────────────────────────────────────────────────────────

function escapeHtml(s: string | null | undefined): string {
  if (s == null) return ""
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

function fmtMoney(n: number, moneda: string): string {
  const symbol = moneda === "MXN" ? "$" : moneda === "UYU" ? "$U" : `${moneda} `
  return `${symbol}${n.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function emailShell(opts: {
  brandLabel: string
  title: string
  subtitle: string
  bodyHtml: string
  footerNote?: string
}): string {
  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8" /><title>${escapeHtml(opts.title)}</title></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#e2e8f0;">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#f8fafc;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="560" style="max-width:560px;background:#ffffff;border-radius:16px;border:1px solid #e2e8f0;overflow:hidden;">
          <tr>
            <td style="background:linear-gradient(135deg,#2563eb 0%,#1d4ed8 100%);padding:28px 32px;text-align:center;">
              <div style="font-size:11px;letter-spacing:0.25em;color:#bfdbfe;font-weight:700;text-transform:uppercase;">${escapeHtml(opts.brandLabel)}</div>
              <h1 style="margin:8px 0 0;font-size:22px;color:#ffffff;font-weight:800;">${escapeHtml(opts.title)}</h1>
              <div style="margin-top:6px;font-size:13px;color:#bfdbfe;">${escapeHtml(opts.subtitle)}</div>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 32px 8px;">
              ${opts.bodyHtml}
            </td>
          </tr>
          ${
            opts.footerNote
              ? `<tr><td style="padding:16px 32px 28px;border-top:1px solid #e2e8f0;">
                  <div style="font-size:11px;color:#64748b;line-height:1.5;">${escapeHtml(opts.footerNote)}</div>
                </td></tr>`
              : ""
          }
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

function emptyStateHtml(mensaje: string): string {
  return `<div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:18px;text-align:center;color:#94a3b8;font-size:13px;">${escapeHtml(mensaje)}</div>`
}

function itemListHtml<T>(
  items: T[],
  opts: {
    accent: "amber" | "red" | "emerald"
    row: (item: T) => { label: string; detail: string; badge?: string }
    emptyMessage: string
  },
): string {
  if (items.length === 0) return emptyStateHtml(opts.emptyMessage)
  const accentColor =
    opts.accent === "red" ? "#fca5a5" : opts.accent === "amber" ? "#fbbf24" : "#86efac"
  const rows = items
    .map((it) => {
      const r = opts.row(it)
      return `<tr>
        <td style="padding:10px 14px;border-bottom:1px solid #ffffff;font-size:13px;color:#f1f5f9;font-weight:600;">${escapeHtml(r.label)}</td>
        <td style="padding:10px 14px;border-bottom:1px solid #ffffff;font-size:12px;color:#cbd5e1;">${escapeHtml(r.detail)}</td>
        ${
          r.badge
            ? `<td align="right" style="padding:10px 14px;border-bottom:1px solid #ffffff;font-size:12px;font-weight:700;color:${accentColor};">${escapeHtml(r.badge)}</td>`
            : `<td></td>`
        }
      </tr>`
    })
    .join("")
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;overflow:hidden;">
    <tr><td colspan="3" style="padding:0;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">${rows}</table>
    </td></tr>
  </table>`
}

export async function sendAlertaStockBajoEmail(input: {
  to: string
  tallerNombre: string
  items: AlertaStockBajoItem[]
  moneda?: string
}) {
  try {
    const resend = getResendClient()
    if (!resend) return { success: false, error: "Servicio de correo no configurado (RESEND_API_KEY ausente)." }

    const subject = input.items.length === 0
      ? `Sin alertas de inventario - ${input.tallerNombre}`
      : `${input.items.length} producto(s) por agotarse - ${input.tallerNombre}`

    const list = itemListHtml(input.items, {
      accent: "amber",
      emptyMessage: "Todos tus productos tienen stock suficiente. Buen trabajo.",
      row: (p) => ({
        label: p.nombre,
        detail: [p.sku ? `SKU ${p.sku}` : null, p.categoria].filter(Boolean).join(" - ") || "Sin categoria",
        badge: `${p.stockActual} / min ${p.stockMinimo}`,
      }),
    })

    const bodyHtml = `
      <p style="margin:0 0 16px;font-size:14px;line-height:1.6;color:#cbd5e1;">
        ${input.items.length === 0
          ? "Hoy no detectamos productos por debajo de su stock minimo."
          : `Detectamos <strong style="color:#fbbf24;">${input.items.length} producto(s)</strong> por debajo de su stock minimo. Considera re-abastecerlos pronto.`}
      </p>
      ${list}
    `

    const html = emailShell({
      brandLabel: "ReparaHub - Inventario",
      title: input.items.length === 0 ? "Inventario saludable" : "Inventario bajo",
      subtitle: input.tallerNombre,
      bodyHtml,
      footerNote: "Esta alerta se envia una vez al dia. Puedes desactivarla en Configuracion > Reportes y Alertas.",
    })

    const { data, error } = await resend.emails.send({
      from: REPORTES_FROM,
      to: input.to,
      subject,
      html,
    })
    if (error) throw error
    return { success: true, messageId: data!.id, sentTo: input.to, count: input.items.length }
  } catch (error) {
    console.error("[alertas] Error sending stock bajo email:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error al enviar alerta de stock bajo.",
    }
  }
}

export async function sendAlertaEstancadasEmail(input: {
  to: string
  tallerNombre: string
  items: AlertaEstancadasItem[]
  umbralDias?: number
}) {
  try {
    const resend = getResendClient()
    if (!resend) return { success: false, error: "Servicio de correo no configurado (RESEND_API_KEY ausente)." }

    const umbral = input.umbralDias ?? 3
    const subject = input.items.length === 0
      ? `Sin reparaciones estancadas - ${input.tallerNombre}`
      : `${input.items.length} reparacion(es) sin movimiento - ${input.tallerNombre}`

    const list = itemListHtml(input.items, {
      accent: "red",
      emptyMessage: "Todas tus reparaciones activas tuvieron movimiento reciente.",
      row: (r) => {
        const equipo = [r.marca, r.modelo].filter(Boolean).join(" ") || r.tipoEquipo || "Sin especificar"
        return {
          label: `${r.folio} - ${equipo}`,
          detail: [r.clienteNombre, r.estado].filter(Boolean).join(" - "),
          badge: `${r.diasSinMovimiento}d`,
        }
      },
    })

    const bodyHtml = `
      <p style="margin:0 0 16px;font-size:14px;line-height:1.6;color:#cbd5e1;">
        ${input.items.length === 0
          ? `Hoy no hay reparaciones con mas de ${umbral} dias sin movimiento.`
          : `Hay <strong style="color:#fca5a5;">${input.items.length} reparacion(es)</strong> activas con mas de ${umbral} dias sin actualizacion. Te recomendamos revisarlas o contactar al cliente.`}
      </p>
      ${list}
    `

    const html = emailShell({
      brandLabel: "ReparaHub - Operaciones",
      title: input.items.length === 0 ? "Sin estancamientos" : "Equipos sin movimiento",
      subtitle: input.tallerNombre,
      bodyHtml,
      footerNote: `Esta alerta se envia una vez al dia cuando hay items con mas de ${umbral} dias sin movimiento. Puedes desactivarla en Configuracion > Reportes y Alertas.`,
    })

    const { data, error } = await resend.emails.send({
      from: REPORTES_FROM,
      to: input.to,
      subject,
      html,
    })
    if (error) throw error
    return { success: true, messageId: data!.id, sentTo: input.to, count: input.items.length }
  } catch (error) {
    console.error("[alertas] Error sending estancadas email:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error al enviar alerta de reparaciones estancadas.",
    }
  }
}

export async function sendReporteDiarioEmail(input: {
  to: string
  tallerNombre: string
  resumen: ReporteDiarioResumen
}) {
  try {
    const resend = getResendClient()
    if (!resend) return { success: false, error: "Servicio de correo no configurado (RESEND_API_KEY ausente)." }

    const r = input.resumen
    const subject = `Reporte diario - ${input.tallerNombre}`

    const kpiRow = (label: string, value: string, accent: "default" | "emerald" | "amber" | "red") => {
      const color = accent === "default" ? "#f1f5f9" : accent === "emerald" ? "#86efac" : accent === "amber" ? "#fbbf24" : "#fca5a5"
      return `<td style="padding:14px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;width:33.33%;">
        <div style="font-size:10px;letter-spacing:0.2em;text-transform:uppercase;color:#94a3b8;font-weight:700;">${escapeHtml(label)}</div>
        <div style="margin-top:6px;font-size:20px;font-weight:800;color:${color};">${escapeHtml(value)}</div>
      </td>`
    }

    const bodyHtml = `
      <p style="margin:0 0 16px;font-size:14px;line-height:1.6;color:#cbd5e1;">
        Aqui esta el resumen de operacion de tu taller para hoy.
      </p>
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-bottom:14px;">
        <tr>
          <td style="padding:4px;">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"><tr>
              ${kpiRow("Ventas del dia", r.ventasCantidad > 0 ? fmtMoney(r.ventasTotal, r.moneda) : "-", r.ventasTotal > 0 ? "emerald" : "default")}
              ${kpiRow("Reparaciones activas", String(r.reparacionesActivas), r.reparacionesUrgentes > 0 ? "amber" : "default")}
              ${kpiRow("Stock bajo", String(r.productosStockBajo), r.productosStockBajo > 0 ? "red" : "default")}
            </tr></table>
          </td>
        </tr>
      </table>
      ${
        r.cajaAbierta
          ? `<div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:14px;margin-bottom:14px;">
              <div style="font-size:11px;letter-spacing:0.2em;text-transform:uppercase;color:#94a3b8;font-weight:700;margin-bottom:6px;">Caja abierta</div>
              <div style="font-size:14px;color:#cbd5e1;">Corte #${escapeHtml(String(r.cajaNumero ?? "-"))} - Saldo esperado: <strong style="color:#f1f5f9;">${escapeHtml(r.cajaSaldoEsperado != null ? fmtMoney(r.cajaSaldoEsperado, r.moneda) : "-")}</strong></div>
            </div>`
          : `<div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:14px;margin-bottom:14px;color:#94a3b8;font-size:13px;text-align:center;">No hay caja abierta.</div>`
      }
    `

    const html = emailShell({
      brandLabel: "ReparaHub - Reporte Diario",
      title: "Tu dia en cifras",
      subtitle: input.tallerNombre,
      bodyHtml,
      footerNote: "Este resumen se envia una vez al dia. Configuralo en Configuracion > Reportes y Alertas.",
    })

    const { data, error } = await resend.emails.send({
      from: REPORTES_FROM,
      to: input.to,
      subject,
      html,
    })
    if (error) throw error
    return { success: true, messageId: data!.id, sentTo: input.to }
  } catch (error) {
    console.error("[alertas] Error sending reporte diario email:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error al enviar reporte diario.",
    }
  }
}
