# Plan de trabajo: Landing ReparaHub cercana a 10/10

**Estado:** Implementado con validación local completada
**Fecha:** 2026-06-23

## Objetivo

Rediseñar la landing alrededor de una conversión principal: crear una prueba gratuita.
La página combina una propuesta de valor más concreta, demostraciones del producto, prueba social verificable, medición del embudo y SEO técnico y semántico.

## Lo que se implementó

- Nueva home con hero directo, CTA principal a registro, CTA secundario a demo y copy alineado a reparaciones, POS, inventario, apartados y cotizaciones.
- Componentes de marketing reutilizables para showcase del producto, beneficios, FAQ y enlaces con tracking.
- Metadata SEO, JSON-LD para Organization, SoftwareApplication, WebSite y FAQPage, Open Graph y Twitter cards.
- Cuatro páginas públicas de intención prioritaria:
  - `software para talleres de celulares`
  - `sistema de reparaciones`
  - `punto de venta para talleres`
  - `control de inventario y apartados`
- Registro optimizado con promesa clara de 30 días PRO, mejor accesibilidad y analítica del embudo sin PII.
- Footer, header y pricing rearmados con navegación más clara y CTA menos ambiguos.
- `robots.txt` y `sitemap.xml` actualizados para las nuevas rutas.

## Línea base observada

- Producción previa: performance fuerte en desktop y aceptable en mobile, con SEO y accesibilidad ya buenos.
- Vista local posterior a los cambios: desktop prácticamente intacto y mobile aún con margen de mejora en LCP.
- El build quedó sano y la estructura de rutas se mantiene estable.

## Bloqueo real

- No había en el repo un paquete aprobado de testimonios, logos o métricas verificables.
- Por eso no se inventó prueba social; la implementación usa contenido factual y un testimonio fundador, mientras la prueba social externa queda pendiente de autorización.

## Criterios de salida

- `pnpm lint` sin errores.
- `pnpm test` pasando.
- `pnpm build` pasando.
- Rutas nuevas visibles en el build.
- JSON-LD válido y sin PII en eventos de analítica.

## Próximos pasos recomendados

1. Cargar testimonios autorizados y métricas verificables.
2. Sustituir el showcase de producto por capturas reales anonimizadas cuando estén disponibles.
3. Medir conversión real durante 30 días y ajustar el hero y los CTAs con datos.
