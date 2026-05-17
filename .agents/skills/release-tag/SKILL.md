---
name: release-tag
description: Direct release from main — bump version, verify, push commit, create tag to trigger CI. Use when asked to "tag release", "直接发版", "push tag", "release on main", or when the release branch has already been merged and only the tag push remains.
---

# Release Tag

Direct-to-main release flow. Bumps the version, verifies locally, pushes the commit, and creates the release tag to trigger CI. Skips the PR step — use `/release-publish` for the PR-based flow.

## When to Use

- Releasing directly from `main` without a PR
- After a release branch has been merged and only the tag push remains
- When the user says "直接发版" or "push a tag"
- When auto-merge PR is not available and the user prefers a direct push

Do not use for PR-based releases — that is `/release-publish`.

## Prerequisites

- On `main` branch with no uncommitted changes
- `pnpm` and `cargo` available
- Push access to `origin/main`

## Workflow

---

### Phase 1 — Prepare Main

1. Confirm on `main` and up to date:

   ```bash
   git checkout main
   git pull origin main
   git status --short
   ```

   If there are uncommitted changes, stop and tell the user to commit or stash first.

2. Read the current version from `package.json` and ask the user which bump level to use:
   - `patch` — bug fixes, CI fixes (e.g. 0.0.4 → 0.0.5)
   - `minor` — new features, backward compatible (e.g. 0.0.4 → 0.1.0)
   - `major` — breaking changes (e.g. 0.0.4 → 1.0.0)

**Output**: confirmed bump level.

---

### Phase 2 — Bump Version

1. Bump the version:

   ```bash
   pnpm release:version {LEVEL}
   ```

   This updates `package.json`, `src-tauri/tauri.conf.json`, `src-tauri/Cargo.toml`, `src-tauri/Cargo.lock` and commits `chore(release): bump version to {NEXT_VERSION}`.

2. Verify the version is correct in `package.json`.

**Output**: version bump committed on `main`.

---

### Phase 3 — Verify

1. Run a local build check:

   ```bash
   pnpm build
   ```

2. If `cargo test` is available:

   ```bash
   cd src-tauri && cargo test
   ```

**Output**: build and tests pass.

---

### Phase 4 — Push and Tag

1. Push the version bump commit to `main`:

   ```bash
   git push origin main
   ```

2. Create and push the release tag:

   ```bash
   pnpm release:tag v{NEXT_VERSION}
   ```

   This creates an annotated tag and pushes it to `origin`, which triggers `.github/workflows/release.yml`.

**Output**: tag pushed, CI triggered.

---

### Phase 5 — Monitor Release

1. Wait 2 minutes for CI to start, then check the release workflow:

   ```bash
   gh run list --workflow=release.yml --limit=1 --json status,conclusion,databaseId
   ```

2. If running:

   > Release build is in progress. Check assets at:
   > https://github.com/hhhyyyy99/prot-skills/releases

3. If completed successfully:

   > Release v{NEXT_VERSION} is complete. Download assets are available on the
   > GitHub release page.

4. After CI succeeds, open the draft release and verify assets before publishing it.

**Output**: release confirmed or CI status reported.

---

## Quick Reference

| Step         | Command                                        |
| ------------ | ---------------------------------------------- |
| Bump version | `pnpm release:version patch\|minor\|major`     |
| Create tag   | `pnpm release:tag v{VERSION}`                  |
| Watch CI     | `gh run list --workflow=release.yml --limit=1` |

## Pre-Release Checklist

- `main` is up to date
- Working tree is clean
- Version bump committed
- `pnpm build` passes
- `cargo test` passes
- Tag matches the new version
- Tag is pushed to `origin`

## Error Handling

- **Tag already exists locally**: `git tag -d v{VERSION}` then retry
- **Tag exists remotely but not locally**: `git fetch origin tag v{VERSION}`
- **`pnpm release:version` fails**: ensure `cargo` is available and `src-tauri/Cargo.toml` is valid
- **CI fails**: check Actions logs, fix on `main`, re-push and re-tag
- **Windows release fails in `pnpm app:check`**: known CRLF issue in `Cargo.toml` or `tauri.conf.json`, run `pnpm test scripts/sync-app-metadata.test.mjs` to verify
