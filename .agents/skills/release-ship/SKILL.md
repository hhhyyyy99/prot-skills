---
name: release-ship
description: Release Prot Skills via a PR-based workflow — bump version, write release notes, auto-merge PR, then publish on merge. Use when asked to "release", "ship a new version", "发版", "发布新版本", "release a new version", or "cut a release".
---

# Release Ship

Branch-and-PR release workflow for Prot Skills. Creates a release branch from `main`, bumps the version, writes release notes, opens an auto-merge PR, then publishes once merged.

## When to Use

- Publishing a new Prot Skills version
- Any request to "release", "ship", "发版", or "发布"
- Cutting a new version with an auditable PR trail

Do not use for hotfixes that skip the normal release cadence, or for non-Tauri projects.

## Prerequisites

- Clean `main` branch with no uncommitted changes
- `gh` CLI authenticated with push/PR access
- `pnpm` and `cargo` available

## Workflow

Execute these phases in order. Each phase has a clear output — report it to the user before moving on.

---

### Phase 1 — Determine Version

1. Read the current version from `package.json`.

2. Show the user the current version and ask which bump level to use:
   - `patch` — bug fixes, CI fixes (e.g. 0.0.4 → 0.0.5)
   - `minor` — new features, backward compatible (e.g. 0.0.4 → 0.1.0)
   - `major` — breaking changes (e.g. 0.0.4 → 1.0.0)

3. Compute the next version string (e.g. `0.0.5`).

4. Check whether `docs/releases/v{NEXT_VERSION}.md` already exists.
   - If it exists, note this and skip release notes writing in Phase 2.
   - If not, gather commits since the last release tag to draft notes.

   To gather commits:

   ```bash
   LAST_TAG=$(git describe --tags --abbrev=0 2>/dev/null || echo "")
   if [[ -n "$LAST_TAG" ]]; then
     git log "$LAST_TAG..HEAD" --oneline
   else
     git log --oneline
   fi
   ```

   If there are no tags yet, fall back to `git log --oneline` to show all commits.

**Output**: confirmed next version and whether release notes need to be written.

---

### Phase 2 — Create Release Branch and Prepare Changes

1. Create and switch to the release branch:

   ```bash
   git checkout -b chore/release-v{NEXT_VERSION} main
   ```

2. Bump the version:

   ```bash
   pnpm release:version {LEVEL}
   ```

   This updates `package.json`, `src-tauri/tauri.conf.json`, `src-tauri/Cargo.toml`, `src-tauri/Cargo.lock` and commits `chore(release): bump version to {NEXT_VERSION}`.

3. If release notes do not yet exist, write them now:
   - Copy `docs/releases/TEMPLATE.md` to `docs/releases/v{NEXT_VERSION}.md`
   - Fill in the sections using the gathered commits, grouping by type (Added, Changed, Fixed)
   - Show the draft to the user for review before saving

4. Commit the release notes:
   ```bash
   git add docs/releases/v{NEXT_VERSION}.md
   git commit -m "docs(release): add v{NEXT_VERSION} release notes"
   ```

**Output**: release branch with version bump + release notes committed.

---

### Phase 3 — Push and Create Auto-Merge PR

1. Push the release branch:

   ```bash
   git push -u origin chore/release-v{NEXT_VERSION}
   ```

2. Create a PR targeting `main` with auto-merge enabled. Substitute the version value before running the command. Capture the PR URL and number for use in Phase 4:

   ```bash
   gh pr create \
     --base main \
     --head chore/release-v{NEXT_VERSION} \
     --title "chore(release): v{NEXT_VERSION}" \
     --body "## Release v{NEXT_VERSION}

   Bumps version to v{NEXT_VERSION} and adds release notes.

   ### Changes
   - Version bump in package.json, tauri.conf.json, Cargo.toml
   - Release notes at docs/releases/v{NEXT_VERSION}.md
   "

   gh pr merge --auto --squash

   # Capture PR number from the gh pr create output
   PR_URL=$(gh pr view --json url -q .url)
   PR_NUMBER=$(gh pr view --json number -q .number)
   ```

   Do not use a heredoc with single-quoted delimiter — write the body as a plain string with the version substituted directly.

3. If `gh pr merge --auto` fails (e.g. branch protection requires reviews, or auto-merge is not enabled on the repo), report the PR URL to the user and tell them to review and merge manually. Then skip to Phase 5.

**Output**: PR_NUMBER, PR_URL, auto-merge status.

---

### Phase 4 — Monitor Merge and Publish

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

   b. Verify the version in `package.json` matches `v{NEXT_VERSION}`.

   c. Create and push the release tag to trigger CI:

   ```bash
   pnpm release:tag v{NEXT_VERSION}
   ```

   d. Report:

   > Release v{NEXT_VERSION} published. Tag pushed — GitHub Actions is building
   > desktop bundles now. Monitor progress at:
   > https://github.com/hhhyyyy99/prot-skills/actions

4. If the PR is not merged after 10 minutes:
   Tell the user:

   > The release PR has not been merged yet. Please review and merge it manually.
   >
   > After merging, run `pnpm release:tag v{NEXT_VERSION}` on `main` to publish.

   Use the PR URL from the Phase 3 output (the `gh pr create` command echoes it).

   Then end the workflow.

**Output**: tag pushed and CI triggered, OR instructions for manual merge.

---

### Phase 5 — Post-Release (If Published)

1. Wait 2 minutes for CI to start, then check the release workflow status:

   ```bash
   gh run list --workflow=release.yml --limit=1 --json status,conclusion,databaseId
   ```

2. If the workflow is still running, tell the user:

   > Release build is in progress. Check the assets at:
   > https://github.com/hhhyyyy99/prot-skills/releases

3. If the workflow completed successfully, confirm:

   > Release v{NEXT_VERSION} is complete. Download assets are available on the
   > GitHub release page.

4. Clean up the local release branch:
   ```bash
   git branch -d chore/release-v{NEXT_VERSION}
   git push origin --delete chore/release-v{NEXT_VERSION}
   ```

**Output**: release confirmed and cleanup done.

---

## Quick Reference

| Step              | Command                                        |
| ----------------- | ---------------------------------------------- |
| Bump version      | `pnpm release:version patch\|minor\|major`     |
| Create tag        | `pnpm release:tag v{VERSION}`                  |
| Create PR         | `gh pr create --base main --head <branch>`     |
| Enable auto-merge | `gh pr merge --auto --squash`                  |
| Check PR status   | `gh pr view {N} --json state,mergedAt`         |
| Watch CI          | `gh run list --workflow=release.yml --limit=1` |

## Error Handling

- **Tag already exists locally**: `git tag -d v{VERSION}` then retry
- **Tag exists remotely but not locally**: `git fetch origin tag v{VERSION}`
- **CI fails on push**: check Actions logs, fix on the release branch, re-push
- **`pnpm release:version` fails**: ensure `cargo` is available and `src-tauri/Cargo.toml` is valid
- **Auto-merge unavailable**: report PR URL, ask user to merge manually, end workflow
