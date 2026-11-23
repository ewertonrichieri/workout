---
name: git-pr-workflow
description: Create branches, open pull requests, and merge PRs on GitHub. Use when the user asks to create a new branch for a feature, open a PR, merge changes, says "pode subir" or "subir", or manage git workflow on GitHub.
---

# GitHub PR Workflow

The **rules** (branch structure, naming, when to merge, commit format, history, PR checklist) live in `.agents/rules/git-workflow.md`. Read it first. This skill only holds the commands.

## New branch (always from updated `main`)

```bash
git checkout main
git pull origin main
git checkout -b feat/descriptive-name-00N   # or fix/ or chore/
```

If `git pull origin main` fails (divergence), stop and tell the user — no force push to `main`.

## Commit

```bash
git commit -m "feat: short description"   # max 50 chars, same type as the branch
```

Do **not** merge until the user says **"pode subir"** or **"subir"**.

## When the user says "pode subir" or "subir"

Always squash-merge into **`main`**, no extra confirmation needed:

```bash
git push -u origin HEAD   # if not pushed yet

gh pr create --base main --head feat/descriptive-name-00N --title "..." --body "..."
gh pr merge --squash --delete-branch

git checkout main
git pull origin main
```

(If `gh` is not available, do the same steps through the GitHub web UI or an equivalent tool.)

### Final step: verify the production deploy

If the project has automatic deploys, run the project's documented deploy verification (see the README or the "Observações" section of `docs/status.md`) and report the result to the user.

- Success → report it. Done.
- Failure → investigate:
  - Build/code error → fix on a new `fix/` branch (normal flow).
  - Not a code problem (blocking checks, deploy not promoted) → tell the user and **ask** before promoting or forcing a deploy; never do it silently.

If the project has no deploy verification documented, say so instead of guessing.

## Optional: release tag

When the user asks for **"release"**, **"tag"**, or a version bump:

```bash
git checkout main && git pull origin main
git tag -a v1.0.0 -m "Release v1.0.0"
git push origin --tags
```

## Conflict resolution on a feature branch

```bash
git checkout feat/descriptive-name-00N
git fetch origin
git merge origin/main
# resolve, commit, push
```
