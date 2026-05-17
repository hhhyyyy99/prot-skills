---
name: release-version
description: Prepare a Prot Skills release branch — determine the next version, bump metadata, write release notes. Use when asked to "prepare a release", "bump version", "写release notes", "准备发版", "version bump", or when planning a new version before publishing.
---

# Release Version

Prepares a release branch with a version bump and release notes. Ends with a clean branch ready for `release-publish` or `/submit-pr`.

## When to Use

- Choosing the next version level (`patch` / `minor` / `major`)
- Bumping version metadata across `package.json`, `tauri.conf.json`, `Cargo.toml`, `Cargo.lock`
- Writing or updating release notes from commits since the last tag
- Creating the `chore/release-v{X.Y.Z}` branch

Do not use for the PR merge and tag-push flow — that is `/release-publish`.

## Prerequisites

- Clean `main` branch with no uncommitted changes
- `pnpm` and `cargo` available

## Workflow

Execute these phases in order. Report the output of each phase before moving on.

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

### Phase 2 — Create Release Branch and Bump Version

1. Create and switch to the release branch:

   ```bash
   git checkout -b chore/release-v{NEXT_VERSION} main
   ```

2. Bump the version:

   ```bash
   pnpm release:version {LEVEL}
   ```

   This updates `package.json`, `src-tauri/tauri.conf.json`, `src-tauri/Cargo.toml`, `src-tauri/Cargo.lock` and commits `chore(release): bump version to {NEXT_VERSION}`.

**Output**: release branch created with version bump committed.

---

### Phase 3 — Write Release Notes

Skip this phase if `docs/releases/v{NEXT_VERSION}.md` already exists.

1. Copy the template:

   ```bash
   cp docs/releases/TEMPLATE.md docs/releases/v{NEXT_VERSION}.md
   ```

2. Fill in the sections using the gathered commits, grouping by type:
   - **Highlights**: the most impactful changes
   - **Added**: new user-facing capabilities
   - **Changed**: existing behavior that now works differently
   - **Fixed**: bug fixes with visible impact

3. Show the draft to the user for review before saving.

4. Commit the release notes:

   ```bash
   git add docs/releases/v{NEXT_VERSION}.md
   git commit -m "docs(release): add v{NEXT_VERSION} release notes"
   ```

**Output**: release notes committed.

---

### Phase 4 — Verify and Report

1. Run a local build check:

   ```bash
   pnpm build
   ```

2. Show the final branch state:

   ```bash
   git log main..HEAD --oneline
   ```

3. Report to the user:

   > Release branch `chore/release-v{NEXT_VERSION}` is ready.
   > Version bumped to {NEXT_VERSION} with release notes.
   >
   > Next step: run `/release-publish` to push, create PR, and trigger CI.

**Output**: verified release branch ready for publishing.

---

## Quick Reference

| Step           | Command                                                     |
| -------------- | ----------------------------------------------------------- |
| Bump version   | `pnpm release:version patch\|minor\|major`                  |
| Gather commits | `git log $(git describe --tags --abbrev=0)..HEAD --oneline` |
| Check build    | `pnpm build`                                                |

## Error Handling

- **`pnpm release:version` fails**: ensure `cargo` is available and `src-tauri/Cargo.toml` is valid
- **Version already exists**: check `git tag --list v{VERSION}` — pick a different level or version
- **Build fails after bump**: fix the issue on the release branch before proceeding
