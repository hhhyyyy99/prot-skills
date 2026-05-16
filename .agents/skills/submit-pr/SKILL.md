---
name: submit-pr
description: Submit a PR to main with auto-merge. Scans current changes, assesses risk, creates the PR, enables auto-merge when safe, and reports any blockers. Use when asked to "提交PR", "提个PR", "create a PR", "open a PR", "submit PR", "提PR到main", "merge to main", or when code changes are ready for review.
---

# Submit PR

Creates a PR targeting `main`, analyzes the diff to assess whether auto-merge is safe, enables auto-merge when possible, and reports any blockers that prevent immediate merge.

## When to Use

- Code changes are committed and ready for review
- Any request to "提PR", "提交PR", "create PR", "open PR"
- After completing a feature, fix, or refactor on a task branch
- When the user wants to merge work into main

## Prerequisites

- On a non-`main` branch with committed changes
- `gh` CLI authenticated
- Remote branch pushed (the skill handles this if not yet pushed)

## Branch Protection Rules

Before creating the PR, understand what blocks auto-merge on this repo:

| Rule                    | Requirement                                      |
| ----------------------- | ------------------------------------------------ |
| Required status checks  | `Frontend Checks`, `Backend Checks`, `ai-review` |
| Required reviews        | 1 approving review                               |
| Conversation resolution | All threads must be resolved                     |

Auto-merge can be **enabled** even before reviews are done — it queues the merge and executes once all gates pass. The skill enables auto-merge whenever possible and tells the user what manual steps remain.

## Workflow

---

### Phase 1 — Scan Changes

1. Confirm current branch and that it is not `main`:

   ```bash
   git branch --show-current
   ```

2. Check for uncommitted changes:

   ```bash
   git status --short
   ```

   If there are uncommitted changes, stop and tell the user to commit or stash first.

3. Get the diff summary against `main`:

   ```bash
   git diff main...HEAD --stat
   git log main..HEAD --oneline
   ```

4. Classify the change risk based on the diff:

   **Low risk** (safe for auto-merge):
   - Docs-only changes (`*.md`, `docs/`)
   - Config/tooling changes (`.github/`, `scripts/`, `.agents/`)
   - Test-only changes (`*.test.ts`, `*.test.tsx`, `src/tests/`)
   - Style/formatting changes

   **Medium risk** (auto-merge OK, but flag for careful review):
   - Frontend component changes (`src/components/`, `src/pages/`)
   - Hook or utility changes (`src/hooks/`, `src/lib/`)
   - Design token changes (`src/design/`)

   **High risk** (recommend manual review before merge):
   - Backend/Rust changes (`src-tauri/`)
   - Tauri config changes (`tauri.conf.json`)
   - Dependency changes (`package.json`, `Cargo.toml`)
   - API surface changes (`src/api/`)
   - Auth, permissions, or security-related changes

5. Report the scan result to the user:
   > **Diff summary**: {N} files changed, {insertions}+/{deletions}-
   > **Change type**: {low/medium/high} risk
   > **Files**: {list key files}
   > **Auto-merge**: {recommended / OK with review / not recommended}

---

### Phase 2 — Push Branch

If the branch has not been pushed to the remote yet:

```bash
git push -u origin HEAD
```

---

### Phase 3 — Create PR

1. Generate the PR title from the branch name and commit messages:
   - Use the conventional commit format: `type(scope): description`
   - Derive from the branch name or the first commit message

2. Generate the PR body from the commit log:

   ```bash
   git log main..HEAD --format="- %s"
   ```

3. Create the PR and capture the PR number:

   ```bash
   gh pr create \
     --base main \
     --head "$(git branch --show-current)" \
     --title "<title>" \
     --body "<body>"

   PR_NUMBER=$(gh pr view --json number -q .number)
   ```

**Output**: PR_URL and PR_NUMBER created.

---

### Phase 4 — Enable Auto-Merge

1. Enable auto-merge with squash:

   ```bash
   gh pr merge "$PR_NUMBER" --auto --squash
   ```

2. If auto-merge enables successfully:

   > Auto-merge is ON. The PR will merge automatically once:
   >
   > - All CI checks pass (Frontend Checks, Backend Checks, ai-review)
   > - At least 1 review approval is received
   > - All review conversations are resolved

3. If auto-merge fails to enable, check the reason:
   - **Not enabled on repo**: tell the user to enable auto-merge in repo settings
   - **Branch protection blocks it**: report the specific blocker

**Output**: auto-merge status and remaining steps.

---

### Phase 5 — Report

Report the full status to the user:

```
PR #{NUMBER}: {title}
URL: {PR_URL}
Auto-merge: {ON/OFF}
Change risk: {low/medium/high}

Remaining steps:
- {list what's needed before merge}
```

If the risk is **low** (docs, tests, config only):

> Changes look safe. Once a reviewer approves and CI passes, this will merge automatically.

If the risk is **medium**:

> Changes touch application code. A reviewer should look at this before it merges. Auto-merge is queued — it will merge after approval + CI.

If the risk is **high**:

> Changes touch backend, dependencies, or security-sensitive areas. Recommend careful review. Auto-merge is enabled but will only merge after explicit approval.

---

## Quick Reference

| Step                    | Command                                                        |
| ----------------------- | -------------------------------------------------------------- |
| Diff against main       | `git diff main...HEAD --stat`                                  |
| Create PR               | `gh pr create --base main --head <branch>`                     |
| Enable auto-merge       | `gh pr merge <N> --auto --squash`                              |
| Check PR status         | `gh pr view <N> --json state,reviewDecision,statusCheckRollup` |
| Check branch protection | `gh api repos/{owner}/{repo}/branches/main/protection`         |

## Error Handling

- **On main**: do not create a PR from main. Tell the user to create a task branch first.
- **No changes**: nothing to PR. Tell the user.
- **Branch not pushed**: push first, then create PR.
- **PR already exists**: find the existing PR with `gh pr list --head <branch>` and report its URL.
- **Auto-merge unavailable**: report the PR URL and explain what's blocking.
- **CI not starting**: check if the workflow triggers on the branch's file changes.
