# FAP Audit

Web app for running the First Aid Post & Ambulance audit protocol: public landing, section forms, dashboard, action tracker, Excel/Word export, workbook import, and staff directories.

**Version:** **1.0.0** — see the app footer, [`package.json`](package.json), and [`CHANGELOG.md`](CHANGELOG.md).

**Production:** https://audit.mineaidhms.com (also https://fap-audit-app.vercel.app)

## Stack

- Next.js 16 (App Router), React 19, TypeScript, Tailwind v4
- Neon Postgres + Drizzle ORM (`drizzle/` migrations)
- Neon Auth (Better Auth) with `ALLOWED_EMAILS` sign-up allow-list
- Hosted on Vercel

## Local setup

1. Use the Git **`development`** branch for day-to-day work (see [`docs/git-workflow.md`](docs/git-workflow.md)).
2. Copy env (gitignored). Required:

   - `DATABASE_URL` — Neon connection string (use the **dev** database branch for local work)
   - `NEON_AUTH_BASE_URL` — Auth base URL for that branch
   - `NEON_AUTH_COOKIE_SECRET`
   - `ALLOWED_EMAILS` — comma-separated emails allowed to sign up

3. Install and migrate:

   ```bash
   npm install
   npm run db:migrate
   npm run db:seed   # first time only
   npm run dev
   ```

4. Open http://localhost:3000 (public landing). Sign in to use `/audits`.

### Database branches (Neon)

| Branch | Use |
|--------|-----|
| `main` | Production (Vercel production) |
| `dev` | Local + Vercel preview |

Migrations: `0000_init` … `0004_staff_on_duty` (people directories, profile, staff-on-duty rename). Apply with `npm run db:migrate` against the target `DATABASE_URL`.

Neon Auth **trusted domains** on production must include every browser origin that serves the app (e.g. `https://fap-audit-app.vercel.app` and `https://audit.mineaidhms.com`). Missing origins show as “invalid origin”, not CORS.

### Git branches (GitHub)

| Branch | Use |
|--------|-----|
| `main` | Production |
| `development` | Local / integration; open PRs into `main` from here |

CI runs lint, typecheck, and build. PRs into `main` must be **up to date with `main`** (Branch sync check) to avoid “1 ahead, 1 behind” merges — details in [`docs/git-workflow.md`](docs/git-workflow.md).

## Docs

- [`docs/build-plan.md`](docs/build-plan.md) — phased build plan and current status
- [`docs/git-workflow.md`](docs/git-workflow.md) — branching and merge rules
- [`CHANGELOG.md`](CHANGELOG.md) — release history
- `/changelog` in the app — same changelog in the UI

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
