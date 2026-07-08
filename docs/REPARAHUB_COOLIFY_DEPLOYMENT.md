# ReparaHub Coolify Deployment

This repo is prepared for a native Coolify deployment from Git.

## Target services

- App: Dockerfile build, Next.js standalone server on port `3000`.
- Proxy/TLS: Coolify managed domains and certificates.
- Database: Coolify PostgreSQL service.
- Storage: MinIO/S3-compatible service deployed as a manual Docker Compose resource in Coolify.
- Domains:
  - `https://reparahub.com` for the app.
  - `https://www.reparahub.com` redirect/alias.
  - `https://media.reparahub.com` for public MinIO objects.

## Coolify app setup

1. Create a new Application from the Git repository.
2. Select Dockerfile build pack.
3. Set the exposed port to `3000`.
4. Add domain `reparahub.com`.
5. Add every variable from `.env.production.example` in Coolify.
6. Ensure these production values are set. `S3_PUBLIC_BASE_URL`, `NEXTAUTH_URL`, and `NEXT_PUBLIC_APP_URL` must be available during build because Next.js uses them for metadata, CSP, and image host allowlists.

```env
NEXTAUTH_URL=https://reparahub.com
NEXT_PUBLIC_APP_URL=https://reparahub.com
S3_BUCKET=reparahub-app
S3_PUBLIC_BASE_URL=https://media.reparahub.com/reparahub-app
```

## MinIO manual setup in Coolify

Coolify may not show MinIO as a one-click service. Use a Docker Compose resource instead:

1. Create a new Resource > Docker Compose.
2. Paste `infra/coolify/minio/docker-compose.yml`.
3. Add these environment variables:

```env
MINIO_ROOT_USER=reparahub
MINIO_ROOT_PASSWORD=<generate-a-long-secret>
MINIO_SERVER_URL=https://media.reparahub.com
MINIO_BROWSER_REDIRECT_URL=https://minio.reparahub.com
```

4. Expose port `9000` on `media.reparahub.com`.
5. Optionally expose port `9001` on `minio.reparahub.com` for the admin console.
6. Open the MinIO console and create bucket `reparahub-app`.
7. Create an access key for the app and use it as:

```env
S3_ENDPOINT=https://media.reparahub.com
S3_REGION=us-east-1
S3_ACCESS_KEY_ID=<minio-access-key>
S3_SECRET_ACCESS_KEY=<minio-secret-key>
S3_BUCKET=reparahub-app
S3_PUBLIC_BASE_URL=https://media.reparahub.com/reparahub-app
```

The app uses path-style S3 requests, so the public object URL is expected to be `https://media.reparahub.com/reparahub-app/<key>`.

## Postgres migration

During the maintenance window:

```bash
pg_dump "$NEON_DATABASE_URL" -Fc -f neon-final.dump
pg_restore -d "$COOLIFY_DATABASE_URL" --clean --if-exists neon-final.dump
```

Keep Neon read-only until the production smoke test passes and the rollback window closes.

## MinIO migration

Create the `reparahub-app` bucket in MinIO, configure public read access for the public object domain, then sync objects while preserving keys:

```bash
rclone sync r2:tallercloud-v1-3 minio:reparahub-app --progress
```

New uploads use `S3_*` variables. Existing absolute R2 URLs continue rendering during the rollback window.

## Auth, email, and DNS

- Google OAuth origin: `https://reparahub.com`
- Google OAuth callback: `https://reparahub.com/api/auth/callback/google`
- Resend senders: `noreply@reparahub.com`, `reportes@reparahub.com`
- DNS before cutover:
  - Lower TTL.
  - Point `reparahub.com`, `www.reparahub.com`, and `media.reparahub.com` to the Coolify server.
  - Verify SPF, DKIM, and DMARC for `reparahub.com`.

## Verification gates

Run locally before pushing the deploy branch:

```bash
pnpm lint
pnpm exec tsc --noEmit
pnpm test
pnpm build
```

Run after deploy:

- App loads at `/`.
- Login and registration work.
- Google OAuth returns to dashboard.
- Password reset email links point to `https://reparahub.com`.
- Create a repair.
- Upload an image and confirm it is served from `media.reparahub.com`.
- Create a POS sale.
- Open and close cash drawer.
- Public store `/t/<slug>` loads.
- Tracking `/track/<id>` validates with the last 4 phone digits.
- Warranty, signature, transactional email, and web print fallback work.

## Rollback

Keep Neon and R2 intact for at least 7 days after cutover. If a critical production issue appears, restore DNS to the previous production target, unfreeze Neon/R2, and keep Coolify paused until the issue is fixed.
