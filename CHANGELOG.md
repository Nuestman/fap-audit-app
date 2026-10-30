# Changelog

All notable changes to the FAP Audit app are recorded here.
Format loosely follows [Keep a Changelog](https://keepachangelog.com/). Version numbers follow [SemVer](https://semver.org/).

## [0.3.2] — 2026-10-30

### Fixed
- Resolved Dependabot / `npm audit` findings by pinning nested transitive deps via `package.json` overrides (`better-auth` / `@better-auth/drizzle-adapter` ≥1.7.14, `zod` ≥4.6.7, `uuid` ≥11.1.1, `esbuild` ≥0.25, `@react-email/render` ≥2.2.0). Audit now reports **0 vulnerabilities**.
- Custom domain `https://audit.mineaidhms.com` caused Neon Auth **invalid origin** after Vercel redirect (not CORS). Fixed by adding that origin to Neon Auth **trusted domains** on the production `main` branch (alongside `https://fap-audit-app.vercel.app`). No app code change required for the whitelist; future custom/preview hosts need the same Neon Auth step.

## [0.3.1] — 2026-10-30

### Changed
- Settings **Auditors** and **FAP staff** use a compact table list; add/edit opens a modal instead of inline forms.
- Build plan and README brought up to date with people directories, Neon branch setup, and Drizzle migrations.

### Fixed
- Ensured `0002_people_fields` is recorded in Drizzle’s migration journal on both Neon **main** and **dev** (schema already matched).

## [0.3.0] — 2026-10-30

### Added
- Richer **Auditors** directory: organisation, job title, optional email, phone, employee number.
- Richer **FAP staff** directory: organisation, job title, qualification, PIN status and expiry, optional contact fields, optional FAP assignment.
- **FAP staff model** setting: *Global* (default) vs *Site-assigned* (nurse-in-charge and post action owners filter by assigned FAP).
- Picker labels show `Name — Job title (Org)`.
- App version in the shell footer, with a **Changelog** page (`/changelog`).

### Fixed
- **Other…** on person pickers now opens the free-text field (previously snapped back to blank).
- Settings crash from exporting Zod schemas from a `"use server"` module.
- Missing people-field columns on the local/dev database after migration bookkeeping drift.

## [0.2.0] — 2026-10-30

### Added
- **Auditors** and **FAP staff** directories in Settings (CRUD, active flag), mirroring First aid posts.
- Shared **PersonPicker** (single + multi + Other) for lead auditor, audit team, nurse-in-charge, and action owners.
- Action owners draw from auditors and FAP staff together.

### Changed
- Cleared draft **classifications** in the database (actions left intact) so the team can rate findings together.
- Cleared action **owners** so people can be assigned from the new directories.
- Rebuilt the workbook **Note Mapping** sheet from corrected post sheets (ODD, STP, KMS, GCS).

## [0.1.0] — 2026-10-28

### Added
- Next.js app with Neon Postgres (Drizzle), Neon Auth, and `ALLOWED_EMAILS` sign-up allow-list.
- Protocol v1 seed, four sites (ODD, STP, KMS, GCS), Q4 2026 audit shell.
- Section A–G checklist forms with autosave, conditional finding/action fields, filters.
- Supplementary tables (A2, B2, D2, E2, G2), H1–H3, I1–I4, photo upload (stored as Postgres bytea).
- Dashboard: compliance heatmap, classification/risk charts, Major NCs, cross-site themes.
- Action tracker with owner/status/overdue filters and close-out evidence.
- Excel workbook export/import (merge without duplicates) and Word report draft.
- Settings for First aid posts and protocol version listing.
- Production deploy to Vercel (`fap-audit-app.vercel.app`) with Neon main; local/preview on Neon `dev`.

[0.3.2]: https://github.com/Nuestman/fap-audit-app/compare/v0.3.1...v0.3.2
[0.3.1]: https://github.com/Nuestman/fap-audit-app/compare/v0.3.0...v0.3.1
[0.3.0]: https://github.com/Nuestman/fap-audit-app/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/Nuestman/fap-audit-app/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/Nuestman/fap-audit-app/releases/tag/v0.1.0
