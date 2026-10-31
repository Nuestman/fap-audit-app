# Git workflow

## Branches

| Branch | Role |
|--------|------|
| `main` | Production. Vercel production + Neon `main`. |
| `development` | Day-to-day work. Push here; open PRs **into `main` from `development`**. |

Feature work can use short-lived branches off `development`, then merge back into `development` before promoting to `main`.

## Happy path (what we automate)

1. **Work on `development`** — commit and push as usual.
2. **Open a PR** `development` → `main` on GitHub when ready to release.
3. **Branch sync check** — PR must already include every commit from `main` (not behind). If not, merge `main` into `development` and push.
4. **CI** — lint, typecheck, and build must pass.
5. **Merge the PR on GitHub** — prefer a **merge commit** (not squash) so history stays shareable between the two branches.
6. **Auto sync back** — workflow **Sync development from main** runs on every push to `main` and merges `main` into `development`, then pushes. That stops the cycle where `main` is ahead and `development` is stuck behind after each release merge.

```text
development ──PR──► main
     ▲                │
     └──── auto sync ─┘
```

## Preventing “1 ahead, 1 behind”

| Mechanism | What it does |
|-----------|----------------|
| **Branch sync** (`branch-sync.yml`) | On PRs into `main`: fail if the head branch is **behind** `main`. |
| **Sync development from main** (`sync-development.yml`) | On pushes to `main`: merge `main` **into** `development` automatically. |
| GitHub branch protection (optional) | Require the same status checks + “Require branches to be up to date before merging”. |

If auto-sync hits conflicts (rare if you only land production via `development` → `main`), fix locally:

```bash
git fetch origin
git checkout development
git merge origin/main
# resolve conflicts
git push origin development
```

**Avoid squash-merging** `development` → `main` if you can. Squash creates a new commit on `main` that `development` does not share, which makes the reverse sync noisier. Use a normal merge commit (or rebase+fast-forward if you prefer a linear history).

## CI

**CI** (`ci.yml`) runs lint, `tsc`, and `next build` on pushes and PRs to `main` and `development`.

## Branch protection (recommended, once)

GitHub → **Settings → Branches** → protect `main`:

- Require a pull request before merging
- Require status checks: **Lint, typecheck, build** and **Up to date with main**
- Require branches to be up to date before merging

Leave `development` unprotected so the sync workflow can push with `GITHUB_TOKEN`.
