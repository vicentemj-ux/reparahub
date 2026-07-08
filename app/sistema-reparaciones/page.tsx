import type { Metadata } from "next"
import { SeoIntentPage, type SeoIntentPageContent } from "@/components/marketing/seo-intent-page"

export const metadata: Metadata = {
  title: "Sistema de control de reparaciones",
  description: "Organiza folios, diagnósticos, técnicos, estatus, abonos y entregas con un sistema de reparaciones creado para talleres.",
  alternates: { canonical: "/sistema-reparaciones" },
}

const content: SeoIntentPageContent = {
  slug: "sistema-reparaciones",
  eyebrow: "Control de reparaciones",
  title: "Cada reparación avanza con responsable, estatus e historial",
  description: "Consulta qué llegó, quién lo atiende, qué se diagnosticó, cuánto se cobró y cuándo quedó listo sin reconstruir la historia entre mensajes.",
  benefits: [
    { title: "Folios consistentes", description: "Cada servicio conserva datos del cliente, equipo, recepción, diagnóstico y garantía." },
    { title: "Trabajo asignado", description: "Los técnicos consultan reparaciones activas y registran avances desde el mismo sistema." },
    { title: "Entregas documentadas", description: "Abonos, saldo, ticket y seguimiento permanecen asociados a la reparación." },
  ],
  workflowTitle: "De la recepción a la entrega",
  workflow: ["Captura el equipo y su condición de entrada.", "Registra diagnóstico, costos y técnico responsable.", "Actualiza el estatus y comparte seguimiento con el cliente.", "Liquida el saldo, entrega e imprime el comprobante."],
  closingTitle: "Deja de perseguir el estado de cada equipo",
  closingDescription: "Centraliza tu operación con una prueba de 30 días que incluye las funciones avanzadas de PLAN PRO.",
}

export default function SistemaReparacionesPage() {
  return <SeoIntentPage content={content} />
}
