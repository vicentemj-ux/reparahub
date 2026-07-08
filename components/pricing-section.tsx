"use client"

import { useState } from "react"
import { Check, Sparkles } from "lucide-react"
import { PLAN_CORE, PLAN_PRO } from "@/lib/plan-catalog"
import { TrackedLink } from "@/components/marketing/tracked-link"
import { trackMarketingEvent } from "@/lib/marketing-analytics"

const plans = [PLAN_CORE, PLAN_PRO]

export function PricingSection() {
  const [isAnnual, setIsAnnual] = useState(false)

  const selectBilling = (annual: boolean) => {
    setIsAnnual(annual)
    trackMarketingEvent("landing_pricing_toggle", { billing: annual ? "annual" : "monthly" })
  }

  return (
    <section id="precios" className="scroll-mt-20 border-t border-slate-200 bg-slate-50 py-20 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid items-end gap-8 lg:grid-cols-[1fr_auto]">
          <div className="max-w-3xl">
            <p className="font-semibold text-blue-700">Precios simples</p>
            <h2 className="mt-3 text-balance text-3xl font-black tracking-[-0.03em] text-slate-950 sm:text-5xl">
              Empieza con PRO. Elige después el plan que necesitas.
            </h2>
            <p className="mt-5 max-w-2xl text-pretty text-lg leading-8 text-slate-600">
              Tu prueba de 30 días incluye PLAN PRO completo. No pedimos tarjeta y puedes cancelar antes de tu siguiente periodo.
            </p>
          </div>

          <div className="inline-flex w-fit rounded-lg border border-slate-300 bg-white p-1" aria-label="Periodo de facturación">
            <button
              type="button"
              aria-pressed={!isAnnual}
              onClick={() => selectBilling(false)}
              className={`min-h-10 rounded-md px-5 text-sm font-bold outline-none focus-visible:ring-2 focus-visible:ring-blue-600 ${!isAnnual ? "bg-blue-600 text-white" : "text-slate-600 hover:text-slate-950"}`}
            >
              Mensual
            </button>
            <button
              type="button"
              aria-pressed={isAnnual}
              onClick={() => selectBilling(true)}
              className={`min-h-10 rounded-md px-5 text-sm font-bold outline-none focus-visible:ring-2 focus-visible:ring-blue-600 ${isAnnual ? "bg-blue-600 text-white" : "text-slate-600 hover:text-slate-950"}`}
            >
              Anual
            </button>
          </div>
        </div>

        <div className="mt-12 grid gap-6 lg:grid-cols-2">
          {plans.map((plan) => {
            const annualMonthly = Math.round(plan.annualPriceMx / 12)
            const annualSavings = plan.monthlyPriceMx * 12 - plan.annualPriceMx
            const isPro = plan.id === "pro"

            return (
              <article
                key={plan.id}
                className={`relative flex flex-col rounded-xl bg-white p-6 sm:p-8 ${isPro ? "border-2 border-blue-600" : "border border-slate-300"}`}
              >
                {isPro ? (
                  <div className="mb-5 inline-flex w-fit items-center gap-2 rounded-full bg-blue-100 px-3 py-1 text-xs font-bold text-blue-800">
                    <Sparkles className="h-4 w-4" aria-hidden />
                    Incluido durante tu prueba
                  </div>
                ) : null}

                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h3 className="text-2xl font-black text-slate-950">{plan.name}</h3>
                    <p className="mt-1 text-sm text-slate-600">{plan.tagline}</p>
                  </div>
                  <div className="mt-3 sm:mt-0 sm:text-right">
                    <div className="flex items-baseline gap-1 sm:justify-end">
                      <span className="text-4xl font-black tracking-tight text-slate-950">
                        ${isAnnual ? annualMonthly : plan.monthlyPriceMx}
                      </span>
                      <span className="text-sm text-slate-500">MXN/mes</span>
                    </div>
                    {isAnnual ? (
                      <p className="mt-1 text-xs font-semibold text-emerald-700">
                        Ahorras ${annualSavings.toLocaleString("es-MX")} MXN al año
                      </p>
                    ) : (
                      <p className="mt-1 text-xs text-slate-500">Facturación mensual</p>
                    )}
                  </div>
                </div>

                <div className="my-7 border-t border-slate-200" />

                <ul className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
                  {plan.bullets.map((item) => (
                    <li key={item} className="flex items-start gap-2.5 text-sm leading-6 text-slate-700">
                      <Check className="mt-1 h-4 w-4 shrink-0 text-emerald-600" aria-hidden />
                      {item}
                    </li>
                  ))}
                </ul>

                <TrackedLink
                  href="/auth/register"
                  eventName="landing_plan_click"
                  eventProperties={{ plan: plan.id, billing: isAnnual ? "annual" : "monthly" }}
                  className={`mt-8 inline-flex min-h-12 items-center justify-center rounded-lg px-6 text-center font-bold outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 ${isPro ? "btn-glow bg-blue-600 text-white hover:bg-blue-700" : "border border-blue-600 text-blue-700 hover:bg-blue-50"}`}
                >
                  Comenzar 30 días gratis
                </TrackedLink>
              </article>
            )
          })}
        </div>

        <p className="mt-6 text-center text-sm text-slate-600">
          Al terminar la prueba, eliges PLAN CORE o PLAN PRO. Tus datos permanecen en tu cuenta.
        </p>
      </div>
    </section>
  )
}
