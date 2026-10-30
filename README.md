# FAP Audit

Web app for running the First Aid Post & Ambulance audit protocol: section forms, dashboard, action tracker, Excel/Word export, and workbook import.

**Version:** see footer in the app, [`package.json`](package.json), and [`CHANGELOG.md`](CHANGELOG.md).

## Stack

- Next.js 16 (App Router), React 19, TypeScript, Tailwind v4
- Neon Postgres + Drizzle ORM (`drizzle/` migrations)
- Neon Auth (Better Auth) with `ALLOWED_EMAILS` sign-up allow-list
- Hosted on Vercel: https://fap-audit-app.vercel.app

## Local setup

1. Copy env (gitignored). Required:

   - `DATABASE_URL` — Neon connection string (use the **dev** branch for local work)
   - `NEON_AUTH_BASE_URL` — Auth base URL for that branch
   - `NEON_AUTH_COOKIE_SECRET`
   - `ALLOWED_EMAILS` — comma-separated emails allowed to sign up

2. Install and migrate:

   ```bash
   npm install
   npm run db:migrate
   npm run db:seed   # first time only
   npm run dev
   ```

3. Open http://localhost:3000

### Database branches

| Branch | Use |
|--------|-----|
| `main` | Production (Vercel production) |
| `dev` | Local + Vercel preview |

Migrations: `0000_init`, `0001_people` (auditor / fap_staff), `0002_people_fields` (rich fields + `app_config`). Apply with `npm run db:migrate` against the target `DATABASE_URL`.

## Docs

- [`docs/build-plan.md`](docs/build-plan.md) — original phased build plan and current status
- [`CHANGELOG.md`](CHANGELOG.md) — release history
- `/changelog` in the app — same changelog rendered in the UI

## Scripts

| Command | Purpose |
|---------|---------|
| `npm run dev` | Dev server |
| `npm run build` | Production build |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run db:generate` | Generate Drizzle migration from schema |
| `npm run db:migrate` | Apply migrations |
| `npm run db:seed` | Seed protocol, sites, Q4 2026 audit |

Workbook import (dry-run by default; add `--apply` to write):

```bash
npx tsx --conditions=react-server --env-file=.env.local ./scripts/import-workbook.ts <auditId> "<path.xlsx>"
```
