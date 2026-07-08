import { MARKETING_FAQS } from "@/lib/marketing-schema"

export function FaqSection() {
  return (
    <section id="preguntas" className="border-t border-slate-200 bg-white py-20 sm:py-24">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 sm:px-6 lg:grid-cols-[0.75fr_1.25fr] lg:px-8">
        <div>
          <p className="text-sm font-semibold text-blue-700">Respuestas claras antes de empezar</p>
          <h2 className="mt-3 text-balance text-3xl font-black tracking-[-0.03em] text-slate-950 sm:text-4xl">
            Preguntas frecuentes sobre ReparaHub
          </h2>
          <p className="mt-4 max-w-md text-pretty leading-7 text-slate-600">
            Precios, prueba gratuita, equipos compatibles y operación diaria, sin letra pequeña.
          </p>
        </div>

        <div className="divide-y divide-slate-200 border-y border-slate-200">
          {MARKETING_FAQS.map((item) => (
            <details key={item.question} className="group py-1">
              <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 py-4 font-semibold text-slate-900 outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-4 [&::-webkit-details-marker]:hidden">
                {item.question}
                <span aria-hidden className="text-xl font-normal text-blue-600 transition-transform group-open:rotate-45">
                  +
                </span>
              </summary>
              <p className="max-w-2xl pb-5 pr-10 leading-7 text-slate-600">{item.answer}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  )
}
