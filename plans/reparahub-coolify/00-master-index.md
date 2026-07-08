# ReparaHub Coolify Migration - Master Index

## Objetivo

Desplegar ReparaHub en Coolify usando app Dockerfile, PostgreSQL administrado por Coolify y MinIO S3-compatible, con dominio final `https://reparahub.com`.

## Orden operativo

1. Preparar Dockerfile, `.env.production.example` y documentacion Coolify.
2. Configurar servicios Coolify: app, Postgres y MinIO.
3. Configurar `S3_*` y migrar objetos preservando keys.
4. Restaurar dump final de Neon en PostgreSQL Coolify.
5. Configurar Google OAuth, Resend y DNS.
6. Ejecutar smoke test completo.
7. Cambiar DNS y monitorear.

## Gates

```bash
pnpm lint
pnpm exec tsc --noEmit
pnpm test
pnpm build
```

## Criterios globales

- `NEXT_PUBLIC_APP_URL` y `NEXTAUTH_URL` apuntan a `https://reparahub.com`.
- Coolify maneja proxy y TLS; no se usa Caddy propio.
- Uploads nuevos usan `S3_*`.
- URLs absolutas legacy de R2/Supabase siguen renderizando durante rollback.
- Neon y R2 se conservan intactos al menos 7 dias despues del cutover.
