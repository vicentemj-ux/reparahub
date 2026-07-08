# ReparaHub Core Rules

## Sistema de Memoria - Reglas Fundamentales

**Última actualización:** Abril 2026

---

### Hecho 1: Arquitectura del Proyecto

- **ReparaHub.net es 100% Web (Next.js/React)**
- Electron está **totalmente descartado** como opción
- El proyecto usa solo tecnología web: Next.js 16, React 19, TypeScript, Tailwind CSS 4
- El cliente Electron existente es solo un visor del SaaS web

---

### Hecho 2: Estética Visual

- **Corporativa y limpia**: blanco, azules institucionales, grises claros
- **NUNCA usar temas oscuros** (dark mode)
- Paleta de colores estricta:
  - Fondo principal: `bg-white`, `bg-slate-50`
  - Acentos: `bg-blue-600` / `text-blue-600`
  - Texto: `text-slate-900`, `text-slate-700`

---

### Hecho 3: Objetivo Actual

- **Optimizar tiempos de carga** - score Lighthouse objetivo: 100
- **Limpiar código basura heredado** de prototipos anteriores
- Focus en performance: lazy loading, bundle optimization

---

### Stack Tecnológico

| Capa | Tecnología |
|------|------------|
| Frontend | Next.js 16 (App Router), React 19, TypeScript |
| UI | shadcn/ui, Radix UI, Tailwind CSS 4 |
| Backend | Supabase (PostgreSQL + Auth + Storage + RLS) |
| Server | Next.js Server Actions |
| Auth | JWT custom con Supabase |
| Deploy | Vercel |

---

### Convenciones Críticas

- Nunca usar `createAdminClient()` excepto en `/admin` y `/tracking`
- Siempre usar `createTenantClient()` o `createCurrentTenantClient()` para tenant isolation
- NEVER query tabla `inventario` - usar `productos`
- Usar `imprimirTicket()` de `lib/print.ts` para impresión
- WhatsApp: `api.whatsapp.com/send?phone=...`

---

### Entorno Requerido

```
NEXT_PUBLIC_SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
SUPABASE_JWT_SECRET
RESEND_API_KEY
NEXT_PUBLIC_SUPABASE_INVENTARIO_BUCKET
```

---

*Este documento sirve como fuente de verdad para decisiones técnicas del proyecto.*