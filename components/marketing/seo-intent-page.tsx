import { ArrowRight, CheckCircle2 } from "lucide-react"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { TrackedLink } from "@/components/marketing/tracked-link"
import { serializeStructuredData, SITE_URL } from "@/lib/marketing-schema"

export type SeoIntentPageContent = {
  slug: string
  eyebrow: string
  title: string
  description: string
  benefits: Array<{ title: string; description: string }>
  workflowTitle: string
  workflow: string[]
  closingTitle: string
  closingDescription: string
}

export function SeoIntentPage({ content }: { content: SeoIntentPageContent }) {
  const pageUrl = `${SITE_URL}/${content.slug}`
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: content.title,
    description: content.description,
    url: pageUrl,
    inLanguage: "es-MX",
    isPartOf: { "@type": "WebSite", name: "ReparaHub", url: SITE_URL },
  }

  return (
    <div className="min-h-screen bg-white text-slate-950">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeStructuredData(structuredData) }} />
      <Header />
      <main id="contenido">
        <section className="border-b border-slate-200 bg-blue-50">
          <div className="mx-auto max-w-5xl px-4 py-16 text-center sm:px-6 sm:py-24 lg:px-8">
            <p className="font-semibold text-blue-700">{content.eyebrow}</p>
            <h1 className="mx-auto mt-4 max-w-4xl text-balance text-4xl font-black leading-tight tracking-[-0.04em] sm:text-6xl">
              {content.title}
            </h1>
            <p className="mx-auto mt-6 max-w-3xl text-pretty text-lg leading-8 text-slate-600 sm:text-xl">
              {content.description}
            </p>
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <TrackedLink
                href="/auth/register"
                eventName="landing_cta_trial_click"
                eventProperties={{ location: content.slug }}
                className="btn-glow inline-flex min-h-13 items-center justify-center gap-2 rounded-lg bg-blue-600 px-7 font-bold text-white hover:bg-blue-700"
              >
                Comenzar 30 días gratis
                <ArrowRight className="h-4 w-4" aria-hidden />
              </TrackedLink>
              <TrackedLink
                href="/#precios"
                eventName="landing_demo_click"
                eventProperties={{ location: content.slug, target: "pricing" }}
                className="inline-flex min-h-13 items-center justify-center rounded-lg border border-slate-400 bg-white px-7 font-bold text-slate-900 hover:border-blue-600 hover:text-blue-700"
              >
                Ver planes y precios
              </TrackedLink>
            </div>
          </div>
        </section>

        <section className="py-20 sm:py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <h2 className="max-w-3xl text-balance text-3xl font-black tracking-[-0.03em] sm:text-5xl">
              Lo que cambia en la operación diaria
            </h2>
            <div className="mt-12 grid border-y border-slate-200 md:grid-cols-3">
              {content.benefits.map((benefit, index) => (
                <article key={benefit.title} className={`py-7 md:p-8 ${index > 0 ? "border-t border-slate-200 md:border-l md:border-t-0" : ""}`}>
                  <CheckCircle2 className="h-6 w-6 text-emerald-600" aria-hidden />
                  <h3 className="mt-7 text-xl font-bold">{benefit.title}</h3>
                  <p className="mt-3 leading-7 text-slate-600">{benefit.description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-slate-50 py-20 text-slate-900 sm:py-24">
          <div className="mx-auto grid max-w-6xl gap-10 px-4 sm:px-6 lg:grid-cols-[0.8fr_1.2fr] lg:px-8">
            <h2 className="text-balance text-3xl font-black tracking-[-0.03em] sm:text-4xl">{content.workflowTitle}</h2>
            <ol className="space-y-4">
              {content.workflow.map((step, index) => (
                <li key={step} className="flex gap-4 border-b border-slate-200 pb-4 last:border-0">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-600 text-sm font-black">{index + 1}</span>
                  <span className="pt-1 leading-7 text-slate-700">{step}</span>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="py-20 sm:py-24">
          <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
            <h2 className="text-balance text-3xl font-black tracking-[-0.03em] sm:text-5xl">{content.closingTitle}</h2>
            <p className="mx-auto mt-5 max-w-2xl text-pretty text-lg leading-8 text-slate-600">{content.closingDescription}</p>
            <TrackedLink
              href="/auth/register"
              eventName="landing_cta_trial_click"
              eventProperties={{ location: `${content.slug}_closing` }}
              className="btn-glow mt-8 inline-flex min-h-13 items-center justify-center gap-2 rounded-lg bg-blue-600 px-7 font-bold text-white hover:bg-blue-700"
            >
              Crear mi cuenta gratis
              <ArrowRight className="h-4 w-4" aria-hidden />
            </TrackedLink>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  )
}
