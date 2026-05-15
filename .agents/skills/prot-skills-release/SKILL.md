---
name: prot-skills-release
description: Use when releasing Prot Skills, bumping its version, creating a release tag, or troubleshooting the repository's GitHub Release workflow
---

# Prot Skills Release

## Overview

This skill captures the release flow that matches the current `prot-skills` repository setup.

Core rule: release from `main`, bump the version first, verify locally, then push a `v*` tag to trigger the GitHub Release workflow.

## When to Use

- Releasing a new Prot Skills version
- Choosing between `patch`, `minor`, and `major`
- Bumping app version metadata across `package.json`, `Cargo.toml`, `tauri.conf.json`, and `Cargo.lock`
- Creating and pushing a release tag
- Debugging why a release did not trigger or failed on GitHub Actions

Do not use this for general npm publishing or non-Tauri projects.

## Current Release Model

- Release workflow file: `.github/workflows/release.yml`
- Trigger: push a tag matching `v*`
- Output: draft GitHub Release with macOS, Linux, and Windows desktop bundles
- Standard local commands:
  - `pnpm release:version patch|minor|major`
  - `pnpm release:tag vX.Y.Z`

Normal releases should use tag push, not `workflow_dispatch`.

## Versioning Rules

- `patch`: bug fixes, CI fixes, compatibility fixes
- `minor`: backward-compatible features
- `major`: breaking changes

Examples:

- `0.0.1 -> 0.0.2`: patch
- `0.0.2 -> 0.1.0`: minor
- `0.1.0 -> 1.0.0`: major

## Standard Release Flow

1. Start clean on `main`

```bash
git checkout main
git pull origin main
git status --short
```

2. Bump the version

```bash
pnpm release:version patch
```

3. Review the expected changed files

- `package.json`
- `src-tauri/Cargo.toml`
- `src-tauri/tauri.conf.json`
- `src-tauri/Cargo.lock`

4. Verify locally

```bash
pnpm build
cd src-tauri && cargo test
```

5. Commit and push the version bump

```bash
git add package.json src-tauri/Cargo.toml src-tauri/tauri.conf.json src-tauri/Cargo.lock
git commit -m "chore(release): bump version to X.Y.Z"
git push origin main
```

6. Create and push the release tag

```bash
pnpm release:tag vX.Y.Z
```

7. Watch the release run

- Actions: `https://github.com/hhhyyyy99/prot-skills/actions`
- Releases: `https://github.com/hhhyyyy99/prot-skills/releases`

8. After GitHub Actions succeeds, open the draft release and verify assets before publishing it.

## Quick Reference

```bash
# Bugfix release
pnpm release:version patch

# Feature release
pnpm release:version minor

# Breaking release
pnpm release:version major

# Push tag after committing version bump
pnpm release:tag v0.0.2
```

## What The Helper Commands Do

`pnpm release:version <patch|minor|major>`

- runs `pnpm version <level> --no-git-tag-version`
- runs `pnpm app:sync`
- keeps package and Tauri metadata aligned
- does not commit
- does not push
- does not create a tag

`pnpm release:tag vX.Y.Z`

- creates an annotated git tag
- pushes that tag to `origin`
- triggers `.github/workflows/release.yml`

## Common Mistakes

### Tag exists locally but not remotely

Symptom:

- `pnpm release:tag v0.0.1` fails with `tag already exists`
- `git tag --list v0.0.1` shows the tag
- `git ls-remote --tags origin v0.0.1` shows nothing

Fix:

```bash
git push origin v0.0.1
```

### Release uses code that is not on `main`

Symptom:

- tag points at an older commit
- release misses the latest fix

Fix:

- always push `main` before creating the release tag

### Windows release fails in `pnpm app:check`

Known cause:

- CRLF line endings in `Cargo.toml` or `src-tauri/tauri.conf.json`

Current repo status:

- `scripts/sync-app-metadata.mjs` already preserves CRLF when checking both `Cargo.toml` and `tauri.conf.json`

If this comes back, re-run:

```bash
pnpm test scripts/sync-app-metadata.test.mjs
```

### Backend CI fails because `dist/` is missing

Known cause:

- Tauri compile-time context validation needs frontend assets present

Current repo status:

- `.github/workflows/ci.yml` builds frontend assets before Rust checks in the backend job

## Pre-Release Checklist

- `main` is up to date
- working tree is clean
- version bump committed
- `pnpm build` passes
- `cargo test` passes
- tag matches the new version
- tag is pushed to `origin`

## Post-Release Checklist

- all three release jobs pass
- draft release exists
- macOS asset exists
- Linux asset exists
- Windows asset exists
- spot-check at least one downloadable installer before publishing
