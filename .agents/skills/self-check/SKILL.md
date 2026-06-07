---
name: self-check
description: Run local production/PR self-checks before pushing or submitting a PR. Mirrors pre-push checks and the GitHub PR CI checks where practical. Use when asked to "自检", "生产门禁自检", "跑门禁", "pre-push check", "PR checks", "before push", or "before PR".
---

# Self Check

Runs the repository's local production gate and the PR CI checks that can be reproduced locally. Use this before pushing a branch or opening a PR.

## When to Use

- Before `submit-pr` or any request to push changes
- After committing feature, fix, refactor, test, docs, config, or release-prep changes
- When the user asks to run "自检", "生产门禁", "PR 检测", or "pre-push"
- When checking whether the current branch is ready for GitHub CI

## What PR Runs

GitHub PR checks are defined in `.github/workflows/ci.yml` and `.github/workflows/ai-review.yml`.

| PR Check                                                                      | Local equivalent                    | Notes                                                    |
| ----------------------------------------------------------------------------- | ----------------------------------- | -------------------------------------------------------- |
| `Frontend Checks` → `pnpm app:check`                                          | `pnpm app:check`                    | Verifies app metadata sync                               |
| `Frontend Checks` → `pnpm test`                                               | `pnpm test`                         | Vitest frontend/script suite                             |
| `Frontend Checks` → `pnpm build`                                              | `pnpm build`                        | Runs `app:sync`, `tsc`, and Vite build                   |
| `Backend Checks` → `pnpm app:check`                                           | Already covered by `pnpm app:check` | CI runs it again in backend job                          |
| `Backend Checks` → `pnpm build`                                               | Already covered by `pnpm build`     | Builds frontend assets for Tauri context                 |
| `Backend Checks` → `cargo fmt --check`                                        | `cd src-tauri && cargo fmt --check` | Requires Rust toolchain                                  |
| `Backend Checks` → `cargo clippy --all-targets --all-features -- -D warnings` | Same command locally                | Requires system Tauri/WebKit dependencies on Linux       |
| `Backend Checks` → `cargo test --all-features`                                | Same command locally                | Requires Rust toolchain                                  |
| `ai-review`                                                                   | Do not run locally by default       | Requires PR context, GitHub token, and AI review secrets |

Local pre-push gate is defined in `.husky/pre-push`:

```sh
pnpm test
pnpm lint
pnpm format:check
pnpm test:tokens
```

## Prerequisites

- Clean working tree is preferred; if dirty, report the changed files before running checks.
- Dependencies are installed with `pnpm install`.
- Rust toolchain is available for backend checks.
- On Linux, backend clippy/tests may require the same system packages CI installs:
  - `libwebkit2gtk-4.1-dev`
  - `libgtk-3-dev`
  - `libayatana-appindicator3-dev`
  - `librsvg2-dev`
  - `patchelf`

## Workflow

Execute these phases in order. Report each phase result before moving on if it fails.

---

### Phase 1 — Inspect Current State

1. Check branch and working tree:

   ```bash
   git status --short --branch
   ```

2. Inspect recent commits when relevant:

   ```bash
   git log --oneline -5
   ```

3. If the working tree is dirty, continue only if the user asked to check the current local state. Otherwise, ask whether to commit/stash first.

**Output**: branch name, clean/dirty state, and whether checks are being run against committed-only or working-tree changes.

---

### Phase 2 — Run Local Pre-Push Gate

Run exactly the commands from `.husky/pre-push`:

```bash
pnpm test
pnpm lint
pnpm format:check
pnpm test:tokens
```

A convenient single command is:

```bash
pnpm test && pnpm lint && pnpm format:check && pnpm test:tokens
```

Notes:

- `pnpm lint` may report warnings. Warnings are acceptable if it exits successfully and reports `0 errors`.
- Do not fix unrelated lint warnings during self-check. Report them separately if they are relevant.

**Output**: pass/fail for tests, lint, format, and token consistency.

---

### Phase 3 — Run PR Frontend CI Equivalents

Run the frontend CI commands that are not already fully covered by pre-push:

```bash
pnpm app:check
pnpm build
```

Notes:

- `pnpm build` already runs `pnpm app:sync`, then `tsc`, then `vite build`.
- `pnpm test` was already covered in Phase 2; do not rerun it unless a previous command changed files.

**Output**: app metadata check and frontend build result.

---

### Phase 4 — Run PR Backend CI Equivalents

Run the backend CI commands:

```bash
cd src-tauri && cargo fmt --check
cd src-tauri && cargo clippy --all-targets --all-features -- -D warnings
cd src-tauri && cargo test --all-features
```

Prefer separate commands so failures are easy to identify. Avoid changing directories permanently; run commands with an explicit working-directory pattern when possible.

If local Linux system dependencies are missing, report the blocker and the CI packages required. Do not install system packages unless the user explicitly asks.

**Output**: Rust format, clippy, and test results.

---

### Phase 5 — Optional Runtime Verification

For UI changes, run the app and observe the changed surface before claiming feature-level readiness.

Use the `run` or `verify` skill if available, otherwise use the project commands:

```bash
pnpm dev
# or
pnpm tauri:dev
```

Only do this when the user asked for runtime verification or the change is UI/interaction behavior where tests/builds are not enough.

**Output**: what was launched, what user-visible behavior was observed, and any platform not available locally.

---

### Phase 6 — Report

Report in this format:

```text
Self-check result: PASS | FAIL | BLOCKED

Branch: <branch>
Working tree: clean | dirty (<summary>)

Checks:
- pre-push: PASS | FAIL
  - pnpm test: ...
  - pnpm lint: ...
  - pnpm format:check: ...
  - pnpm test:tokens: ...
- frontend PR CI: PASS | FAIL
  - pnpm app:check: ...
  - pnpm build: ...
- backend PR CI: PASS | FAIL | BLOCKED
  - cargo fmt --check: ...
  - cargo clippy ...: ...
  - cargo test --all-features: ...
- ai-review: not run locally (<reason>)

Notes:
- <warnings, environment gaps, runtime verification notes>
```

## Quick Reference

Full local PR self-check:

```bash
pnpm test && pnpm lint && pnpm format:check && pnpm test:tokens
pnpm app:check
pnpm build
(cd src-tauri && cargo fmt --check)
(cd src-tauri && cargo clippy --all-targets --all-features -- -D warnings)
(cd src-tauri && cargo test --all-features)
```

Pre-push only:

```bash
pnpm test && pnpm lint && pnpm format:check && pnpm test:tokens
```

Frontend PR CI only:

```bash
pnpm app:check && pnpm test && pnpm build
```

Backend PR CI only:

```bash
pnpm app:check && pnpm build
(cd src-tauri && cargo fmt --check)
(cd src-tauri && cargo clippy --all-targets --all-features -- -D warnings)
(cd src-tauri && cargo test --all-features)
```

## Error Handling

- **`pnpm install --frozen-lockfile` would fail in CI**: if lockfile/package changes are present, run or recommend `pnpm install --frozen-lockfile` before PR.
- **`pnpm app:check` fails**: run `pnpm app:sync`, inspect metadata changes, and commit them if expected.
- **`pnpm build` fails in TypeScript**: fix type errors before rerunning.
- **`cargo fmt --check` fails**: run `cd src-tauri && cargo fmt`, then review and commit formatting changes.
- **`cargo clippy` fails**: fix the reported warning/error; CI treats all clippy warnings as errors.
- **Linux Tauri dependency missing**: report the missing package and the CI install list; ask before installing system packages.
- **AI review not runnable locally**: this is expected unless PR number, GitHub token, and AI review secret environment are available.
