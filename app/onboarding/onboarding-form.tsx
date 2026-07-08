"use client"

import { useState } from "react"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { completeOnboardingTaller } from "@/lib/actions/onboarding"

export function OnboardingForm() {
  const [nombreTaller, setNombreTaller] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)
    try {
      const result = await completeOnboardingTaller(nombreTaller)
      if (result && !result.success) {
        setError(result.error || "No se pudo completar el registro")
      }
    } catch {
      setError("Error inesperado. Intenta de nuevo.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>
      )}

      <div className="space-y-2">
        <Label htmlFor="nombreTaller" className="text-slate-800">
          Nombre de tu Taller <span className="text-red-500">*</span>
        </Label>
        <Input
          id="nombreTaller"
          name="nombreTaller"
          type="text"
          required
          minLength={2}
          maxLength={100}
          placeholder="Ej. Taller Garcia Reparaciones"
          value={nombreTaller}
          onChange={(e) => setNombreTaller(e.target.value)}
          disabled={loading}
          className="h-11 bg-white"
        />
      </div>

      <Button
        type="submit"
        disabled={loading}
        className="h-11 w-full bg-blue-600 text-white hover:bg-blue-700"
      >
        {loading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Creando tu taller...
          </>
        ) : (
          "Continuar al dashboard"
        )}
      </Button>
    </form>
  )
}
