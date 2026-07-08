import { PLAN_CORE, PLAN_PRO } from "@/lib/plan-catalog"

export const SITE_URL = "https://reparahub.com"

export type MarketingFaq = {
  question: string
  answer: string
}

export const MARKETING_FAQS: MarketingFaq[] = [
  {
    question: "¿Qué incluye la prueba gratuita de ReparaHub?",
    answer:
      "La prueba dura 30 días e incluye las funciones del PLAN PRO. No necesitas registrar una tarjeta de crédito para comenzar.",
  },
  {
    question: "¿Qué pasa cuando terminan los 30 días?",
    answer:
      "Puedes elegir PLAN CORE o PLAN PRO según la operación de tu taller. Tus datos permanecen en tu cuenta para que continúes con el plan que elijas.",
  },
  {
    question: "¿ReparaHub sirve para talleres de celulares, laptops y consolas?",
    answer:
      "Sí. ReparaHub organiza reparaciones, ventas, inventario y clientes para talleres de celulares, computadoras, consolas y electrónica.",
  },
  {
    question: "¿Puedo usar impresora térmica?",
    answer:
      "Sí. ReparaHub admite tickets térmicos de 58 mm y 80 mm, además de etiquetas para equipos y productos.",
  },
  {
    question: "¿Mis clientes pueden consultar su reparación?",
    answer:
      "Sí. Cada reparación puede compartir un enlace de seguimiento para que el cliente consulte el estado desde su teléfono.",
  },
  {
    question: "¿Puedo registrar apartados y cotizaciones?",
    answer:
      "Sí. PLAN PRO incluye apartados con anticipos y abonos, además de cotizaciones profesionales para convertir consultas en ventas.",
  },
  {
    question: "¿Necesito instalar ReparaHub?",
    answer:
      "No. ReparaHub funciona desde el navegador en computadora, tablet o celular. Sólo necesitas conexión a internet.",
  },
  {
    question: "¿Puedo cancelar cuando quiera?",
    answer:
      "Sí. Los planes no exigen permanencia forzosa y puedes cancelar antes de tu siguiente periodo de facturación.",
  },
]

export function buildHomeStructuredData() {
  return [
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      name: "ReparaHub",
      url: SITE_URL,
      logo: `${SITE_URL}/images/logo.png`,
      foundingLocation: {
        "@type": "Place",
        name: "Los Mochis, Sinaloa, México",
      },
      contactPoint: {
        "@type": "ContactPoint",
        contactType: "sales",
        availableLanguage: "Spanish",
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      name: "ReparaHub",
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web",
      url: SITE_URL,
      description:
        "Software para talleres de reparación con POS, inventario, apartados, cotizaciones y seguimiento de equipos.",
      offers: [PLAN_CORE, PLAN_PRO].map((plan) => ({
        "@type": "Offer",
        name: plan.name,
        price: plan.monthlyPriceMx.toString(),
        priceCurrency: "MXN",
        category: "monthly subscription",
        url: `${SITE_URL}/#precios`,
      })),
      featureList: [...PLAN_CORE.bullets, ...PLAN_PRO.bullets],
    },
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: "ReparaHub",
      url: SITE_URL,
      inLanguage: "es-MX",
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: MARKETING_FAQS.map((item) => ({
        "@type": "Question",
        name: item.question,
        acceptedAnswer: {
          "@type": "Answer",
          text: item.answer,
        },
      })),
    },
  ]
}

export function serializeStructuredData(data: unknown) {
  return JSON.stringify(data).replace(/</g, "\\u003c")
}
