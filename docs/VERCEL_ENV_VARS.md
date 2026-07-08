# VERCEL_ENV_VARS

## MVP objetivo (Neon + Prisma + Auth.js + R2)

### Requeridas
- `DATABASE_URL`
- `AUTH_SECRET`
- `NEXTAUTH_SECRET`
- `AUTH_URL`
- `NEXT_PUBLIC_APP_URL`
- `R2_ACCOUNT_ID`
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`
- `R2_BUCKET`
- `R2_PUBLIC_BASE_URL`

### Recomendadas según features activas
- `RESEND_API_KEY` (emails transaccionales)

## Variables Supabase (solo legacy/PRO)
Mientras existan módulos legacy/PRO no migrados, podrían seguir apareciendo referencias a:
- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_JWT_SECRET`

Estas no deberían ser requisito del runtime MVP crítico tras migrar completamente las rutas restantes.

## Estado fase 9
- MVP principal ya corre con Prisma/Neon en rutas críticas.
- Quedan módulos PRO/legacy con Supabase que no bloquean el núcleo MVP, pero sí pueden generar logs si sus endpoints/jobs se ejecutan.
