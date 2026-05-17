---
name: release-publish
description: Publish a prepared release — push the release branch, open an auto-merge PR, monitor merge, push the tag to trigger CI, and clean up. Use when asked to "发布", "publish release", "release publish", "push release", or after `/release-version` has prepared the branch.
---

# Release Publish

Takes a prepared release branch (from `/release-version`) and drives it through PR creation, merge, tag push, and CI trigger.

## When to Use

- After `/release-version` has created the release branch with version bump and release notes
- When asked to "publish", "发布", or "push the release"
- When the release branch is ready and needs to go through the PR flow

Do not use for version bumping or release notes — that is `/release-version`.

## Prerequisites

- A `chore/release-v{X.Y.Z}` branch exists with committed version bump and release notes
- `gh` CLI authenticated with push/PR access
- Clean working tree

## Workflow

Execute these phases in order. Report the output of each phase before moving on.

---

### Phase 1 — Validate Release Branch

1. Confirm the current branch is the release branch:

   ```bash
   git branch --show-current
   ```

   If not on a release branch, check out the correct one:

   ```bash
   git checkout chore/release-v{NEXT_VERSION}
   ```

2. Extract the version from the branch name or `package.json`:

   ```bash
   VERSION=$(node -p "require('./package.json').version")
   ```

3. Verify the branch has at least the version bump commit:

   ```bash
   git log main..HEAD --oneline
   ```

**Output**: confirmed release branch and version string.

---

### Phase 2 — Push and Create Auto-Merge PR

1. Push the release branch:

   ```bash
   git push -u origin chore/release-v{NEXT_VERSION}
   ```

2. Create a PR targeting `main` with auto-merge enabled:

   ```bash
   gh pr create \
     --base main \
     --head chore/release-v{NEXT_VERSION} \
     --title "chore(release): v{VERSION}" \
     --body "## Release v{VERSION}

   Bumps version to v{VERSION} and adds release notes.

   ### Changes
   - Version bump in package.json, tauri.conf.json, Cargo.toml
   - Release notes at docs/releases/v{VERSION}.md
   "

   gh pr merge --auto --squash
   ```

   Do not use a heredoc with single-quoted delimiter — write the body as a plain string with the version substituted directly.

3. Capture the PR info:

   ```bash
   PR_URL=$(gh pr view --json url -q .url)
   PR_NUMBER=$(gh pr view --json number -q .number)
   ```

4. If `gh pr merge --auto` fails (e.g. branch protection requires reviews, or auto-merge is not enabled on the repo), report the PR URL to the user and tell them to review and merge manually. Then skip to Phase 4.

**Output**: PR_NUMBER, PR_URL, auto-merge status.

---

### Phase 3 — Monitor Merge and Push Tag

1. Switch back to `main`:

   ```bash
   git checkout main
   ```

2. Poll the PR status until it merges or a timeout is reached. Check every 15 seconds, up to 40 attempts (10 minutes total):

   ```bash
   gh pr view "$PR_NUMBER" --json state,mergedAt -q '.state'
   ```

   Possible states:
   - `MERGED` — proceed to publish
   - `CLOSED` — PR was closed without merging; tell the user
   - `OPEN` — still waiting; continue polling

3. If the PR is merged:

   a. Pull the latest `main`:

   ```bash
   git pull origin main
   ```

   b. Verify the version in `package.json` matches `v{VERSION}`.

   c. Create and push the release tag to trigger CI:

   ```bash
   pnpm release:tag v{VERSION}
   ```

4. If the PR is not merged after 10 minutes, tell the user:

   > The release PR has not been merged yet. Please review and merge it manually.
   >
   > After merging, run `pnpm release:tag v{VERSION}` on `main` to publish.

   Then end the workflow.

**Output**: tag pushed and CI triggered, OR instructions for manual merge.

---

### Phase 4 — Post-Release

1. Wait 2 minutes for CI to start, then check the release workflow status:

   ```bash
   gh run list --workflow=release.yml --limit=1 --json status,conclusion,databaseId
   ```

2. If the workflow is still running, tell the user:

   > Release build is in progress. Check the assets at:
   > https://github.com/hhhyyyy99/prot-skills/releases

3. If the workflow completed successfully, confirm:

   > Release v{VERSION} is complete. Download assets are available on the
   > GitHub release page.

4. Clean up the local release branch:

   ```bash
   git branch -d chore/release-v{VERSION}
   git push origin --delete chore/release-v{VERSION}
   ```

**Output**: release confirmed and cleanup done.

---

## Quick Reference

| Step              | Command                                        |
| ----------------- | ---------------------------------------------- |
| Create PR         | `gh pr create --base main --head <branch>`     |
| Enable auto-merge | `gh pr merge --auto --squash`                  |
| Check PR status   | `gh pr view <N> --json state,mergedAt`         |
| Create tag        | `pnpm release:tag v{VERSION}`                  |
| Watch CI          | `gh run list --workflow=release.yml --limit=1` |

## Error Handling

- **Tag already exists locally**: `git tag -d v{VERSION}` then retry
- **Tag exists remotely but not locally**: `git fetch origin tag v{VERSION}`
- **CI fails on push**: check Actions logs, fix on the release branch, re-push
- **Auto-merge unavailable**: report PR URL, ask user to merge manually, end workflow
- **PR already exists**: find the existing PR with `gh pr list --head chore/release-v{VERSION}` and report its URL
