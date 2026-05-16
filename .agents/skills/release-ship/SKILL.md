---
name: release-ship
description: Release Prot Skills directly on main — bump version, write release notes, push, tag, and publish. Use when asked to "release", "ship a new version", "发版", "发布新版本", "release a new version", or "cut a release".
---

# Release Ship

Direct-on-main release workflow for Prot Skills. Bumps the version, writes release notes, commits and pushes to `main`, then creates a release tag to trigger the GitHub Actions build.

## When to Use

- Publishing a new Prot Skills version
- Any request to "release", "ship", "发版", or "发布"

Do not use for non-Tauri projects.

## Prerequisites

- Current branch is `main`
- Working tree is clean (no uncommitted changes)
- `pnpm` and `cargo` available
- `gh` CLI authenticated (for CI status checks)

## Workflow

Execute these phases in order. Report each phase's output to the user before moving on.

---

### Phase 1 — Prepare

1. Ensure you are on `main` and up to date:

   ```bash
   git checkout main
   git pull origin main
   git status --short
   ```

   If the working tree is not clean, stop and ask the user to handle uncommitted changes first.

2. Read the current version from `package.json`.

3. Ask the user which bump level to use:
   - `patch` — bug fixes, CI fixes (e.g. 0.0.4 → 0.0.5)
   - `minor` — new features, backward compatible (e.g. 0.0.4 → 0.1.0)
   - `major` — breaking changes (e.g. 0.0.4 → 1.0.0)

4. Compute the next version string.

5. Check whether `docs/releases/v{NEXT_VERSION}.md` already exists.
   - If it exists, note this and skip release notes writing in Phase 2.
   - If not, gather commits since the last release tag:
     ```bash
     git log $(git describe --tags --abbrev=0)..HEAD --oneline
     ```

**Output**: confirmed next version, whether release notes need writing.

---

### Phase 2 — Bump Version and Write Release Notes

1. Bump the version:

   ```bash
   pnpm release:version {LEVEL}
   ```

   This updates `package.json`, `src-tauri/tauri.conf.json`, `src-tauri/Cargo.toml`, `src-tauri/Cargo.lock` and commits `chore(release): bump version to {NEXT_VERSION}`.

2. If release notes do not yet exist:
   - Copy `docs/releases/TEMPLATE.md` to `docs/releases/v{NEXT_VERSION}.md`
   - Fill in the sections using the gathered commits (Added, Changed, Fixed)
   - Show the draft to the user for review before saving
   - Commit:
     ```bash
     git add docs/releases/v{NEXT_VERSION}.md
     git commit -m "docs(release): add v{NEXT_VERSION} release notes"
     ```

**Output**: version bump and release notes committed on `main`.

---

### Phase 3 — Push and Publish

1. Push `main`:

   ```bash
   git push origin main
   ```

2. Create and push the release tag to trigger CI:

   ```bash
   pnpm release:tag v{NEXT_VERSION}
   ```

3. Report to the user:
   > Release v{NEXT_VERSION} — tag pushed, GitHub Actions is building desktop
   > bundles now. Monitor at:
   > https://github.com/hhhyyyy99/prot-skills/actions

**Output**: tag pushed, CI triggered.

---

### Phase 4 — Verify

1. Wait briefly for CI to register, then check the release workflow:

   ```bash
   gh run list --workflow=release.yml --limit=1 --json status,conclusion,databaseId
   ```

2. If still running:

   > Release build is in progress. Check assets at:
   > https://github.com/hhhyyyy99/prot-skills/releases

3. If completed successfully:

   > Release v{NEXT_VERSION} is complete. Download assets are available on the
   > GitHub release page.

4. If failed:
   > Release CI failed. Check the logs:
   > https://github.com/hhhyyyy99/prot-skills/actions

**Output**: release confirmed or failure reported.

---

## Quick Reference

| Step              | Command                                        |
| ----------------- | ---------------------------------------------- |
| Bump version      | `pnpm release:version patch\|minor\|major`     |
| Create + push tag | `pnpm release:tag v{VERSION}`                  |
| Watch CI          | `gh run list --workflow=release.yml --limit=1` |

## Error Handling

- **Working tree not clean**: ask user to commit or stash before starting
- **Tag already exists locally**: `git tag -d v{VERSION}` then retry
- **Tag exists remotely but not locally**: `git fetch origin tag v{VERSION}`
- **`pnpm release:version` fails**: ensure `cargo` is available and `src-tauri/Cargo.toml` is valid
- **CI fails**: check Actions logs, fix on `main`, re-tag if needed
