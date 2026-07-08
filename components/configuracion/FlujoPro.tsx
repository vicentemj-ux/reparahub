"use client"

import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Loader2, Sparkles, ClipboardList, PenLine, Camera, AlertCircle, Lock } from "lucide-react"
import Link from "next/link"

import { AjustesTallerFlujoPro } from "@/lib/actions/flujo-pro"

interface FlujoProProps {
  loadingFluJoPro: boolean
  ajustesFluJoPro: AjustesTallerFlujoPro | null
  planTipo: string
  inTrial?: boolean
  pendingFluJoPro: boolean
  handlePatchFluJoPro: <K extends keyof AjustesTallerFlujoPro>(key: K, value: AjustesTallerFlujoPro[K]) => void
}

export function FlujoPro({
  loadingFluJoPro,
  ajustesFluJoPro,
  planTipo,
  inTrial,
  pendingFluJoPro,
  handlePatchFluJoPro
}: FlujoProProps) {
  return (
    <div className="space-y-8">
      {/* Banner de PRO */}
      <div className="rounded-3xl border-2 border-amber-300 bg-gradient-to-r from-amber-50 via-amber-50/80 to-amber-50 p-6 sm:p-8 shadow-sm ring-1 ring-amber-100">
        <div className="flex items-start gap-4">
          <div className="mt-1 flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-200 to-amber-300 text-amber-900 shadow-md">
            <Sparkles className="h-7 w-7" aria-hidden />
          </div>
          <div className="min-w-0">
            <div className="mb-1 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-amber-300 to-amber-400 px-3 py-1 text-xs font-bold uppercase tracking-wider text-amber-950 shadow-sm">
              Premium
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Flujo PRO</h1>
            <p className="mt-1 text-sm text-slate-600 leading-relaxed">
              Define los requisitos obligatorios que deben completarse antes de avanzar el estatus de cada equipo. Ideal para talleres que requieren control de calidad y trazabilidad completa.
            </p>
          </div>
        </div>
      </div>

      {/* Contenido */}
      {loadingFluJoPro ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-amber-7000" aria-hidden />
        </div>
      ) : ajustesFluJoPro ? (
        <div className="relative">
          {/* Lock overlay for non-PRO users */}
          {planTipo !== "activo" && !inTrial && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 rounded-3xl bg-white/85 backdrop-blur-[2px]">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 shadow-sm">
                <Lock className="h-7 w-7 text-amber-600" />
              </div>
              <div className="text-center px-6">
                <p className="font-bold text-slate-800">Plan PRO requerido</p>
                <p className="text-sm text-slate-500 mt-1 max-w-xs">
                  Activa una suscripcion PRO para configurar y activar el Flujo PRO.
                </p>
              </div>
              <Button asChild size="sm" className="bg-amber-500 hover:bg-amber-600 text-white font-semibold rounded-xl px-5">
                <Link href="/dashboard/facturacion">Ver planes</Link>
              </Button>
            </div>
          )}

          <div className={`grid gap-5 sm:grid-cols-1 lg:grid-cols-3 ${planTipo !== "activo" && !inTrial ? "opacity-40 pointer-events-none select-none" : ""}`}>
            {/* Health Check Card */}
            <div className="border-2 border-amber-200 bg-gradient-to-br from-white to-amber-50/40 shadow-md hover:shadow-lg transition-shadow p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-100 to-amber-200 text-amber-700 shadow-sm ring-1 ring-amber-300">
                  <ClipboardList className="h-6 w-6" aria-hidden />
                </div>
                <h4 className="text-lg font-bold text-slate-900">Diagnostico</h4>
              </div>
              <p className="text-xs text-slate-600 mb-4">
                Checklist obligatorio antes de avanzar estado
              </p>
              <p className="text-xs text-amber-700 font-medium bg-amber-50 px-3 py-2 rounded-lg mb-4">
                Minimo 5 pruebas o motivo de express
              </p>
              <div className="flex items-center justify-between">
                <Label htmlFor="hc-req" className="text-sm font-semibold text-slate-700 cursor-pointer">
                  Requerir
                </Label>
                <Switch
                  id="hc-req"
                  checked={ajustesFluJoPro?.health_check_required || false}
                  disabled={pendingFluJoPro || planTipo !== "activo" && !inTrial}
                  onCheckedChange={(v) => handlePatchFluJoPro("health_check_required", v)}
                />
              </div>
            </div>

            {/* Firma Card */}
            <div className="border-2 border-amber-200 bg-gradient-to-br from-white to-amber-50/40 shadow-md hover:shadow-lg transition-shadow p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-100 to-amber-200 text-amber-700 shadow-sm ring-1 ring-amber-300">
                  <PenLine className="h-6 w-6" aria-hidden />
                </div>
                <h4 className="text-lg font-bold text-slate-900">Firma</h4>
              </div>
              <p className="text-xs text-slate-600 mb-4">
                Firma digital del cliente en ingreso
              </p>
              <p className="text-xs text-amber-700 font-medium bg-amber-50 px-3 py-2 rounded-lg mb-4">
                Capturada electronicamente con timestamp
              </p>
              <div className="flex items-center justify-between">
                <Label htmlFor="firma-req" className="text-sm font-semibold text-slate-500">
                  Requerir <span className="ml-1 text-[10px] font-normal text-slate-500">(deshabilitado)</span>
                </Label>
                <Switch
                  id="firma-req"
                  checked={false}
                  disabled={true}
                  onCheckedChange={() => {}}
                />
              </div>
            </div>

            {/* Fotos Card */}
            <div className="border-2 border-amber-200 bg-gradient-to-br from-white to-amber-50/40 shadow-md hover:shadow-lg transition-shadow p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-100 to-amber-200 text-amber-700 shadow-sm ring-1 ring-amber-300">
                  <Camera className="h-6 w-6" aria-hidden />
                </div>
                <h4 className="text-lg font-bold text-slate-900">Evidencia</h4>
              </div>
              <p className="text-xs text-slate-600 mb-4">
                Fotos obligatorias antes de avanzar
              </p>
              <p className="text-xs text-amber-700 font-medium bg-amber-50 px-3 py-2 rounded-lg mb-4">
                Minimo 2 fotos con fecha y hora
              </p>
              <div className="flex items-center justify-between">
                <Label htmlFor="fotos-req" className="text-sm font-semibold text-slate-700 cursor-pointer">
                  Requerir
                </Label>
                <Switch
                  id="fotos-req"
                  checked={ajustesFluJoPro?.fotos_required || false}
                  disabled={pendingFluJoPro || planTipo !== "activo" && !inTrial}
                  onCheckedChange={(v) => handlePatchFluJoPro("fotos_required", v)}
                />
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center py-12">
          <AlertCircle className="h-8 w-8 text-slate-600 mx-auto mb-3" />
          <p className="text-sm text-slate-500">No pudimos cargar los ajustes de Flujo PRO</p>
        </div>
      )}
    </div>
  )
}