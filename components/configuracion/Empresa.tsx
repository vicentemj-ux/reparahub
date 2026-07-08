"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel } from "@/components/ui/select"
import { Loader2, ImageIcon, DatabaseBackup } from "lucide-react"
import type { TallerSettings } from "@/lib/actions/settings-prisma"
import { FieldWrap } from "@/components/dashboard/field-wrap"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"

interface EmpresaProps {
  settings: TallerSettings | null
  setSettings: (settings: TallerSettings | null) => void
  fieldErrors: Record<string, string>
  handleSaveTaller: () => void
  saving: boolean
  showSaveButton?: boolean
  logoPreview: string | null
  handleLogoChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  logoError: string | null
  clockNow: Date
  formatTimezoneClock: (tz: string, now: Date) => string
  TIMEZONE_GROUPS: any[]
  PAISES: string[]
  ESTADOS_MEXICO: string[]
}

export function Empresa({
  settings,
  setSettings,
  fieldErrors,
  handleSaveTaller,
  saving,
  showSaveButton = true,
  logoPreview,
  handleLogoChange,
  logoError,
  clockNow,
  formatTimezoneClock,
  TIMEZONE_GROUPS,
  PAISES,
  ESTADOS_MEXICO
}: EmpresaProps) {
  return (
    <div className="space-y-8">
      {/* Seccion: Identidad del negocio + Logo */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1">
          <h3 className="text-lg font-semibold text-slate-900 mb-2">Identidad del negocio</h3>
          <p className="text-sm text-slate-600">
            Informacion basica que aparece en tickets, comprobantes y comunicaciones.
          </p>
        </div>
        <div className="lg:col-span-2 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FieldWrap field="nombre_taller" label="Nombre del taller" errors={fieldErrors}>
              <Input
                value={settings?.nombre_taller || ""}
                onChange={(e) => settings && setSettings({ ...settings, nombre_taller: e.target.value })}
                placeholder="Ej. Electronica del Centro"
                className="h-10 border-slate-200 focus:ring-blue-500 focus:border-blue-500"
              />
            </FieldWrap>
            <FieldWrap field="telefono" label="Telefono" errors={fieldErrors}>
              <Input
                value={settings?.telefono || ""}
                onChange={(e) => settings && setSettings({ ...settings, telefono: e.target.value })}
                placeholder="6681234567"
                className="h-10 border-slate-200 focus:ring-blue-500 focus:border-blue-500"
              />
            </FieldWrap>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FieldWrap field="email_contacto" label="Email de contacto (opcional)" errors={fieldErrors}>
              <Input
                value={settings?.email_contacto || ""}
                onChange={(e) => settings && setSettings({ ...settings, email_contacto: e.target.value })}
                placeholder="contacto@taller.com"
                className="h-10 border-slate-200 focus:ring-blue-500 focus:border-blue-500"
              />
            </FieldWrap>
            <div className="border border-dashed border-slate-300 rounded-lg p-3 bg-slate-50 flex items-center gap-3">
              {logoPreview ? (
                <>
                  <img src={logoPreview} alt="Logo" className="h-10 w-10 object-contain rounded" />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => document.getElementById("logo-input")?.click()}
                    className="bg-white/80 backdrop-blur-sm border-slate-200 hover:bg-white text-xs h-8"
                  >
                    Cambiar logo
                  </Button>
                </>
              ) : (
                <>
                  <ImageIcon className="h-6 w-6 text-slate-400 shrink-0" />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => document.getElementById("logo-input")?.click()}
                    className="bg-white/80 backdrop-blur-sm border-slate-200 hover:bg-white text-xs h-8"
                  >
                    Subir logo
                  </Button>
                  <p className="text-[10px] text-slate-500 leading-tight">JPG/PNG max. 2MB</p>
                </>
              )}
              <input id="logo-input" type="file" accept="image/jpeg,image/png" className="hidden" onChange={handleLogoChange} />
              {logoError && <p className="text-[10px] text-red-600">{logoError}</p>}
            </div>
          </div>
        </div>
      </div>

      {/* Sección: Ubicación — fila compacta */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1">
          <h3 className="text-lg font-semibold text-slate-900 mb-2">Ubicacion</h3>
          <p className="text-sm text-slate-600">
            Direccion fisica del taller para facturacion y ubicacion en mapas.
          </p>
        </div>
        <div className="lg:col-span-2">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <FieldWrap field="pais" label="Pais" errors={fieldErrors}>
              <Select
                value={settings?.pais || ""}
                onValueChange={(v) => settings && setSettings({ ...settings, pais: v, estado: "" })}
              >
                <SelectTrigger className="h-11 border-slate-200 focus:ring-blue-500 focus:border-blue-500">
                  <SelectValue placeholder="Selecciona" />
                </SelectTrigger>
                <SelectContent>
                  {PAISES.map((pais) => (
                    <SelectItem key={pais} value={pais}>
                      {pais}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FieldWrap>
            <FieldWrap field="estado" label="Estado / Provincia" errors={fieldErrors}>
              {settings?.pais === "Mexico" ? (
                <Select
                  value={settings?.estado || ""}
                  onValueChange={(v) => settings && setSettings({ ...settings, estado: v })}
                >
                  <SelectTrigger className="h-11 border-slate-200 focus:ring-blue-500 focus:border-blue-500">
                    <SelectValue placeholder="Selecciona" />
                  </SelectTrigger>
                  <SelectContent>
                    {ESTADOS_MEXICO.map((estado) => (
                      <SelectItem key={estado} value={estado}>
                        {estado}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  value={settings?.estado || ""}
                  onChange={(e) => settings && setSettings({ ...settings, estado: e.target.value })}
                  placeholder="Ej. Montevideo"
                  className="h-11 border-slate-200 focus:ring-blue-500 focus:border-blue-500"
                />
              )}
            </FieldWrap>
            <FieldWrap field="ciudad" label="Ciudad" errors={fieldErrors}>
              <Input
                value={settings?.ciudad || ""}
                onChange={(e) => settings && setSettings({ ...settings, ciudad: e.target.value })}
                placeholder="Ej. Montevideo"
                className="h-11 border-slate-200 focus:ring-blue-500 focus:border-blue-500"
              />
            </FieldWrap>
            <FieldWrap field="direccion" label="Direccion (opcional)" errors={fieldErrors}>
              <Input
                value={settings?.direccion || ""}
                onChange={(e) => settings && setSettings({ ...settings, direccion: e.target.value })}
                placeholder="Calle, numero, colonia"
                className="h-11 border-slate-200 focus:ring-blue-500 focus:border-blue-500"
              />
            </FieldWrap>
          </div>
        </div>
      </div>

      {/* Seccion: Configuracion operativa */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1">
          <h3 className="text-lg font-semibold text-slate-900 mb-2">Configuracion operativa</h3>
          <p className="text-sm text-slate-600">
            Ajustes tecnicos para zona horaria y garantia.
          </p>
        </div>
        <div className="lg:col-span-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FieldWrap field="zona_horaria" label="Zona horaria" errors={fieldErrors}>
              <Select
                value={settings?.zona_horaria || "UTC"}
                onValueChange={(v) => settings && setSettings({ ...settings, zona_horaria: v })}
              >
                <SelectTrigger className="h-11 border-slate-200 focus:ring-blue-500 focus:border-blue-500">
                  <SelectValue placeholder="Selecciona zona horaria" />
                </SelectTrigger>
                <SelectContent>
                  {TIMEZONE_GROUPS.map((group) => (
                    <SelectGroup key={group.label}>
                      <SelectLabel>{group.label}</SelectLabel>
                      {group.options.map((tz: { value: string; city: string; country: string }) => (
                        <SelectItem key={tz.value} value={tz.value}>
                          {tz.city}, {tz.country} ({formatTimezoneClock(tz.value, clockNow)})
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  ))}
                </SelectContent>
              </Select>
            </FieldWrap>
            <FieldWrap field="dias_garantia" label="Dias de garantia" errors={fieldErrors}>
              <Input
                type="number"
                min={1}
                max={365}
                value={settings?.dias_garantia ?? 30}
                onChange={(e) => {
                  const num = Math.max(1, Math.min(365, parseInt(e.target.value) || 30))
                  if (settings) setSettings({ ...settings, dias_garantia: num })
                }}
                className="h-11 border-slate-200 focus:ring-blue-500 focus:border-blue-500"
              />
            </FieldWrap>
          </div>
        </div>
      </div>

      {/* Seccion: Importacion de Datos */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="text-lg font-semibold text-slate-900">Importar Folios Historicos</h3>
            <Badge variant="secondary" className="text-xs bg-slate-100 text-slate-600 border-slate-200">
              Herramienta Admin
            </Badge>
          </div>
          <p className="text-sm text-slate-600">
            Carga archivos Excel o CSV para migrar datos de otros sistemas.
          </p>
        </div>
        <div className="lg:col-span-2">
          <Link href="/dashboard/configuracion/importacion">
            <Card className="border border-slate-200 bg-white shadow-sm hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="p-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <div className="shrink-0">
                    <DatabaseBackup className="h-8 w-8 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <h4 className="text-sm font-semibold text-slate-900 mb-1">
                      Importar Folios Historicos
                    </h4>
                    <p className="text-xs text-slate-600">
                      Carga archivos Excel o CSV para migrar datos de otros sistemas.
                    </p>
                  </div>
                  <div className="shrink-0 self-start sm:self-auto">
                    <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-700 hover:bg-blue-50">
                      Configurar {">"}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>

      {showSaveButton && (
        <div className="flex justify-end border-t border-slate-200 pt-6">
          <Button
            onClick={handleSaveTaller}
            disabled={saving}
            className="h-11 w-full rounded-xl bg-blue-600 px-6 py-2 text-white shadow-sm hover:bg-blue-700 sm:w-auto btn-glow"
          >
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Guardar cambios
          </Button>
        </div>
      )}
    </div>
  )
}
