"use client"

import { Input } from "@/components/ui/input"
import { UserCircle2, ShieldCheck } from "lucide-react"
import type { TallerSettings } from "@/lib/actions/settings-prisma"
import { FieldWrap } from "@/components/dashboard/field-wrap"

const CARGOS_SUGERIDOS = [
  "Dueno",
  "Gerente",
  "Encargado",
  "Socio",
  "Administrador",
  "Director",
]

interface ResponsableProps {
  settings: TallerSettings | null
  setSettings: (s: TallerSettings | null) => void
  fieldErrors: Record<string, string>
}

export function Responsable({ settings, setSettings, fieldErrors }: ResponsableProps) {
  const set = (k: keyof TallerSettings, v: string) => {
    if (!settings) return
    setSettings({ ...settings, [k]: v } as TallerSettings)
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="mb-4 flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
          <ShieldCheck className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <h3 className="text-sm font-black uppercase tracking-[0.18em] text-slate-900">Responsable del local</h3>
          <p className="mt-1 text-xs leading-relaxed text-slate-500">
            Destinatario privado para cortes de caja y alertas. No aparece en tickets.
          </p>
        </div>
      </div>

      <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <FieldWrap field="responsable_nombre" label="Nombre del responsable" errors={fieldErrors}>
              <div className="relative">
                <UserCircle2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  value={settings?.responsable_nombre ?? ""}
                  onChange={(e) => set("responsable_nombre", e.target.value)}
                  placeholder="Ej. Juan Perez"
                  className="h-10 border-slate-200 pl-9 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </FieldWrap>

            <FieldWrap field="responsable_cargo" label="Cargo (opcional)" errors={fieldErrors}>
              <Input
                value={settings?.responsable_cargo ?? ""}
                onChange={(e) => set("responsable_cargo", e.target.value)}
                placeholder="Ej. Dueno"
                list="responsable-cargo-sugeridos"
                className="h-10 border-slate-200 focus:ring-blue-500 focus:border-blue-500"
              />
              <datalist id="responsable-cargo-sugeridos">
                {CARGOS_SUGERIDOS.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </FieldWrap>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <FieldWrap field="responsable_telefono" label="Telefono (WhatsApp)" errors={fieldErrors}>
              <Input
                value={settings?.responsable_telefono ?? ""}
                onChange={(e) => set("responsable_telefono", e.target.value)}
                placeholder="5216681234567"
                inputMode="tel"
                className="h-10 border-slate-200 focus:ring-blue-500 focus:border-blue-500"
              />
            </FieldWrap>

            <FieldWrap field="responsable_email" label="Email del responsable (opcional)" errors={fieldErrors}>
              <Input
                value={settings?.responsable_email ?? ""}
                onChange={(e) => set("responsable_email", e.target.value)}
                placeholder="responsable@correo.com"
                type="email"
                className="h-10 border-slate-200 focus:ring-blue-500 focus:border-blue-500"
              />
            </FieldWrap>
          </div>

          <p className="text-[11px] leading-relaxed text-slate-500">
            Telefono con codigo de pais, sin "+". Si queda vacio, se usara el contacto del taller.
          </p>
      </div>
    </section>
  )
}
