"use client"

import { useState, useTransition } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, Save, Facebook, Instagram, Globe, Phone } from "lucide-react"
import type { TallerSettings } from "@/lib/actions/settings-prisma"
import { updateTallerSettings } from "@/lib/actions/settings-prisma"
import { toast } from "@/hooks/use-toast"

interface PerfilProps {
  loginEmail: string
  currentPassword: string
  setCurrentPassword: (value: string) => void
  newPassword: string
  setNewPassword: (value: string) => void
  handleChangePassword: () => void
  passwordLoading: boolean
  settings: TallerSettings | null
}

export function Perfil({
  loginEmail,
  currentPassword,
  setCurrentPassword,
  newPassword,
  setNewPassword,
  handleChangePassword,
  passwordLoading,
  settings,
}: PerfilProps) {
  const [social, setSocial] = useState({
    facebook: settings?.facebook || "",
    instagram: settings?.instagram || "",
    tiktok: settings?.tiktok || "",
    whatsapp: settings?.whatsapp || "",
  })
  const [savingSocial, startSavingSocial] = useTransition()

  const handleSaveSocial = () => {
    startSavingSocial(async () => {
      const { error } = await updateTallerSettings({
        facebook: social.facebook.trim() || null,
        instagram: social.instagram.trim() || null,
        tiktok: social.tiktok.trim() || null,
        whatsapp: social.whatsapp.trim() || null,
      })
      if (error) {
        toast({ variant: "destructive", title: "Error", description: error })
      } else {
        toast({ title: "Guardado", description: "Redes sociales actualizadas correctamente." })
      }
    })
  }

  return (
    <div className="space-y-8">
      {/* Seccion: Informacion de la cuenta */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1">
          <h3 className="text-lg font-semibold text-slate-900 mb-2">Informacion de la cuenta</h3>
          <p className="text-sm text-slate-600">
            Detalles de tu cuenta de propietario en ReparaHub.
          </p>
        </div>
        <div className="lg:col-span-2 space-y-6">
          <div>
            <Label className="text-sm font-medium text-slate-700">Email de acceso</Label>
            <Input
              value={loginEmail}
              disabled
              className="h-10 mt-1 bg-slate-50 border-slate-200"
            />
            <p className="text-xs text-slate-500 mt-1">
              El email no puede modificarse desde aqui por seguridad.
            </p>
          </div>
        </div>
      </div>

      {/* Seccion: Redes Sociales */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1">
          <h3 className="text-lg font-semibold text-slate-900 mb-2">Redes sociales del taller</h3>
          <p className="text-sm text-slate-600">
            Estos datos aparecen en los tickets cuando activas la opcion "Redes Sociales" en Imprenta.
          </p>
        </div>
        <div className="lg:col-span-2 space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold tracking-wide text-slate-600 flex items-center gap-1.5">
                <Facebook className="h-3.5 w-3.5 text-blue-600" />
                Facebook
              </Label>
              <Input
                value={social.facebook}
                onChange={(e) => setSocial((s) => ({ ...s, facebook: e.target.value }))}
                placeholder="/tallernombre o URL completa"
                className="h-10 border-slate-200 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold tracking-wide text-slate-600 flex items-center gap-1.5">
                <Instagram className="h-3.5 w-3.5 text-pink-600" />
                Instagram
              </Label>
              <Input
                value={social.instagram}
                onChange={(e) => setSocial((s) => ({ ...s, instagram: e.target.value }))}
                placeholder="@usuario o URL completa"
                className="h-10 border-slate-200 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold tracking-wide text-slate-600 flex items-center gap-1.5">
                <Globe className="h-3.5 w-3.5 text-slate-700" />
                TikTok
              </Label>
              <Input
                value={social.tiktok}
                onChange={(e) => setSocial((s) => ({ ...s, tiktok: e.target.value }))}
                placeholder="@usuario o URL completa"
                className="h-10 border-slate-200 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold tracking-wide text-slate-600 flex items-center gap-1.5">
                <Phone className="h-3.5 w-3.5 text-emerald-600" />
                WhatsApp
              </Label>
              <Input
                value={social.whatsapp}
                onChange={(e) => setSocial((s) => ({ ...s, whatsapp: e.target.value }))}
                placeholder="Numero (ej. 6681234567)"
                className="h-10 border-slate-200 focus:ring-blue-500 focus:border-blue-500"
              />
              <p className="text-[10px] text-slate-500">
                Formato: 6681234567 (se usara en links de WA Business)
              </p>
            </div>
          </div>
          <div className="flex justify-end">
            <Button
              onClick={handleSaveSocial}
              disabled={savingSocial}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg shadow-sm"
            >
              {savingSocial && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              <Save className="h-4 w-4 mr-2" />
              Guardar redes sociales
            </Button>
          </div>
        </div>
      </div>

      {/* Seccion: Seguridad */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1">
          <h3 className="text-lg font-semibold text-slate-900 mb-2">Seguridad</h3>
          <p className="text-sm text-slate-600">
            Actualiza tu contrasena para mantener segura tu cuenta.
          </p>
        </div>
        <div className="lg:col-span-2 space-y-6">
          <div>
            <Label className="text-sm font-medium text-slate-700">Contrasena actual</Label>
            <Input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="h-10 mt-1 border-slate-200 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <Label className="text-sm font-medium text-slate-700">Nueva contrasena</Label>
            <Input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="h-10 mt-1 border-slate-200 focus:ring-blue-500 focus:border-blue-500"
            />
            <p className="text-xs text-slate-500 mt-1">
              Minimo 8 caracteres. Combina letras, numeros y simbolos.
            </p>
          </div>
          <Button
            onClick={handleChangePassword}
            disabled={passwordLoading}
            className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg shadow-sm"
          >
            {passwordLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Actualizar contrasena
          </Button>
        </div>
      </div>
    </div>
  )
}

