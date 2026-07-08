import { redirect } from "next/navigation"
import { OnboardingForm } from "./onboarding-form"
import { getCurrentUser } from "@/lib/auth"
import { getPrismaClient } from "@/lib/prisma"

export default async function OnboardingPage() {
  const user = await getCurrentUser()

  if (!user) {
    redirect("/auth/login")
  }

  const prisma = getPrismaClient()
  const existing = await prisma.user.findUnique({
    where: { id: (user as any).id },
    select: { tenantId: true },
  })

  if (existing?.tenantId) {
    redirect("/dashboard")
  }

  const welcomeName =
    ((user as any).name as string | undefined) ||
    user.email?.split("@")[0] ||
    "Usuario"

  return (
    <div className="min-h-screen bg-white px-4 py-16">
      <div className="mx-auto w-full max-w-md">
        <div className="mb-10 text-center">
          <h1 className="text-3xl font-bold text-blue-600">ReparaHub</h1>
          <p className="mt-2 text-sm text-slate-600">Configura tu taller en un solo paso</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-8 shadow-sm">
          <h2 className="text-xl font-semibold text-slate-900">¡Bienvenido, {welcomeName}!</h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">
            Para activar tu prueba gratuita de 30 dias, indica como se llama tu taller. Podras cambiarlo
            despues en configuracion.
          </p>

          <div className="mt-8">
            <OnboardingForm />
          </div>
        </div>

        <p className="mt-8 text-center text-xs text-slate-500">
          Al continuar aceptas los terminos de uso de ReparaHub para cuentas de prueba.
        </p>
      </div>
    </div>
  )
}
