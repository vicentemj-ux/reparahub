# MVP_ROUTE_ACTION_MAP

## Rutas MVP y actions

| Ruta | Actions usadas | Estado |
|---|---|---|
| `/` | Ninguna de `lib/actions` | Limpia |
| `/auth/login` | NextAuth (`lib/auth.ts`) | Parcial (auth server central) |
| `/auth/register` | `auth-prisma.registerWithPrisma` | Prisma |
| `/dashboard` | `dashboard-prisma.getDashboardMvpData`, `settings-prisma.getDashboardSubscriptionBannerContext` | Prisma |
| `/dashboard/clientes` | `clients-prisma.getAllClients`, `searchClients`, `getClientDetail`, `deleteClient` | Prisma |
| `/dashboard/reparaciones` | `repairs-prisma.getRepairsByTallerId` | Prisma |
| `/dashboard/reparaciones/[id]` | `repairs-prisma.getRepairDetailPageData`, `repairs-prisma.reactivarReingreso`, `gastos.getGastosTicket` | Mixto (pendiente gastos-prisma) |
| `/dashboard/configuracion` | `settings-prisma.getTallerSettings`, `settings-prisma.updateTallerSettings`, `settings-prisma.getTallerPlanType`, `auth-prisma.getOwnerLoginEmail`, `auth-prisma.changeOwnerPassword`, `flujo-pro.*` | Mixto (tab PRO usa flujo-pro supabase) |
| `/track/[id]` | fetch a `/api/tracking/verify` | Prisma indirecto |
| `/api/tracking/verify` | Prisma directo (`getPrismaClient`) | Prisma |
| `/api/health/db` | `lib/db-health` | Prisma |

## Conclusión MVP
- Flujo base web-first (auth/register/login/dashboard/clientes/reparaciones/config/tracking) está apuntado a actions Prisma para los puntos críticos.
- Pendientes no críticos en MVP inmediato:
  - gastos de detalle (`lib/actions/gastos.ts`)
  - pestaña PRO de configuración (`lib/actions/flujo-pro.ts`)

## Nota runtime dashboard (post Fase 9)
- `/dashboard` mantiene ruta/action Prisma (`dashboard-prisma` + `settings-prisma`) y ahora incluye hardening de runtime con fallback cero-datos.
- Logging temporal agregado: `console.error("[dashboard] failed", { message, stack })`.
