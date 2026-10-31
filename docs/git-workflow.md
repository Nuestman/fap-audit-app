# Git workflow

## Branches

| Branch | Role |
|--------|------|
| `main` | Production. Vercel production + Neon `main`. |
| `development` | Integration branch for local/day-to-day work. Prefer opening PRs **into `main` from `development`**. |

Feature work can use short-lived branches off `development`, then merge back into `development` before promoting to `main`.

## Preventing “1 ahead, 1 behind”

GitHub Actions workflow **Branch sync** (`branch-sync.yml`) runs on every PR targeting `main`. It fails unless the PR head already contains every commit from `origin/main` (i.e. the branch is not behind `main`).

Before opening or updating a PR from `development` → `main`:

```bash
git fetch origin
git checkout development
git merge origin/main
# resolve any conflicts
git push origin development
```

Then merge the PR (squash or merge commit — either is fine once the sync check is green).

Also enable in GitHub → **Settings → Branches → Branch protection rule** for `main` (do this once after CI has run once so the check names appear):

- Require a pull request before merging
- Require status checks to pass: **Lint, typecheck, build** and **Up to date with main**
- Turn on **Require branches to be up to date before merging** (GitHub-native companion to the Branch sync workflow)

## CI

**CI** (`ci.yml`) runs lint, `tsc`, and `next build` on pushes and PRs to `main` and `development`.
