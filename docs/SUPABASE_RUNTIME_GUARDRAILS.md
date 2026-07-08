# SUPABASE_RUNTIME_GUARDRAILS

## Objetivo
Evitar que rutas MVP vuelvan a depender de acciones legacy Supabase.

## Búsqueda global de riesgo
```bash
rg "createAdminClient|createTenantClient|createCurrentTenantClient|supabase\.from|supabase\.rpc|supabase\.storage|supabase\.auth" app components lib/actions
```

## Verificar imports legacy en rutas MVP
```bash
rg -n "@/lib/actions/(auth|clients|repairs|settings)(\"|')" app/dashboard app/auth app/track app/api/tracking
```

## Verificar capa oficial Prisma en MVP
```bash
rg -n "@/lib/actions/(auth-prisma|clients-prisma|repairs-prisma|settings-prisma|dashboard-prisma|tracking-prisma)" app/dashboard app/auth app/track app/api/tracking
```

## Política operacional
- Rutas MVP solo pueden importar `*-prisma.ts`.
- Archivos `auth.ts`, `clients.ts`, `repairs.ts`, `settings.ts` quedan como **LEGACY SUPABASE**.
- Si una ruta MVP necesita función nueva, crearla primero en archivo Prisma oficial.
- Ningun archivo bajo `app/dashboard`, `components/dashboard`, `components/auth` o `hooks` puede importar `lib/supabase/*` ni `@supabase/*`.
