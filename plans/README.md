# Implementation Plans: ReparaHub Legacy And Dead Code Cleanup

Generated on 2026-06-18 against commit `80c9a3a`.

Goal: prepare ReparaHub for a future VPS migration by auditing and removing dead code, legacy Supabase runtime, stale hardware/Tauri assumptions, and unused dependencies without breaking the production SaaS currently used by real shops.

Each executor must read the target plan fully before acting. These plans are designed to be passed one by one to another AI model. Do not execute later phases until earlier phases either finish or explicitly mark themselves BLOCKED with evidence.

## Execution order and status

| Plan | Title | Priority | Effort | Depends on | Status |
|------|-------|----------|--------|------------|--------|
| 001 | Build the active runtime inventory | P1 | M | none | DONE |
| 002 | Classify and remove Supabase legacy runtime safely | P1 | L | 001 | DONE |
| 003 | Audit raw SQL, Prisma schema drift, and lowercase legacy maps | P1 | M | 001 | DONE |
| 004 | Audit PRO, disabled, placeholder, and archived modules | P2 | M | 001 | DONE |
| 005 | Audit print, daemon, Tauri stubs, and hardware boundaries | P2 | M | 001 | DONE |
| 006 | Audit dependencies, env vars, build config, and VPS readiness | P1 | M | 001,002 | DONE |
| 007 | Establish cleanup verification gates and regression baseline | P1 | M | 001 | DONE |

Status values: TODO | IN PROGRESS | DONE | BLOCKED (with one-line reason) | REJECTED (with one-line rationale).

## Dependency notes

- 001 must run first because the project has mixed live, PRO, archived, and placeholder code. Do not delete anything before proving whether it is reachable from an active route.
- 002 depends on 001 because Supabase files include both true legacy and still-active compatibility/storage/auth pieces.
- 006 depends on 002 because package removals like `@supabase/*` are only safe after runtime imports are gone.
- 007 can start after 001 and should be kept updated as cleanup phases land.

## Repo facts discovered during recon

- Current version: `package.json` says `2.9.0`.
- Framework: Next.js `16.2.0`, React `19.2.4`, Prisma `7.8.0`, TypeScript `5.7.3`.
- Package manager: pnpm.
- Build command: `pnpm build` -> `prisma generate && next build`.
- Test command exists: `pnpm test` -> `vitest run`.
- Existing tests live in `__tests__/` and cover utility-level logic only.
- Product convention: public SaaS runtime should be Prisma/Neon-first; Supabase is legacy/pro/historical and must be reduced or clearly isolated.
- Product convention: hardware/Tauri local work must not define public SaaS baseline.

## Commands all phases may use

| Purpose | Command | Expected on success |
|---------|---------|---------------------|
| Inspect git | `git status -sb` | Shows only the executor's intended files modified |
| Build | `pnpm build` | exit 0 |
| Tests | `pnpm test` | exit 0, all existing tests pass |
| Supabase scan | `rg "@supabase|createAdminClient|createTenantClient|createCurrentTenantClient|supabase" app components lib hooks prisma types -n` | Output decreases or is documented as intentional |
| Raw SQL scan | `rg "queryRaw|executeRaw|\$queryRaw|\$executeRaw|raw SQL|raw sql" app lib prisma -n` | Each match classified |
| Tauri/hardware scan | `rg "tauri|Tauri|isTauri|daemon|PrintDaemon|directPrint|hardware" app components lib docs -n` | Each match classified |
| Dead-code scan | `rg "legacy|Legacy|deprecated|DEPRECATED|stub|temporal|desactiv|placeholder" app components lib docs prisma -n` | Each match classified |

## Findings considered and not yet planned

- Full UI redesign is out of scope for this cleanup package. Only remove or isolate dead/legacy code.
- Database data dedupe is out of scope unless a phase discovers schema drift that blocks build/runtime.
- Feature strategy changes (Normal vs PRO packaging) are out of scope unless needed to identify dead code.
