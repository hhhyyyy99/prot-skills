# Verification Matrix

Choose verification based on the changed surface and risk level. Prefer targeted
checks first, then broaden when the change affects shared behavior.

## Common Checks

- `pnpm test` - Vitest single run.
- `pnpm build` - sync metadata, typecheck, and Vite build.
- `pnpm lint` - oxlint.
- `pnpm format:check` - oxfmt check.
- `pnpm test:tokens` - design token validation.
- `cd src-tauri && cargo test` - Rust tests.

## Frontend Utilities

Run the matching test file when possible:

- `pnpm vitest run src/tests/lib/<name>.test.ts`
- `pnpm test` when shared behavior changed

## Hooks And Shell

- matching tests under `src/tests/hooks/` or `src/tests/shell/`
- `pnpm test`
- `pnpm build` for integration or type changes

## Pages And Components

- matching tests under `src/tests/pages/` or `src/tests/components/`
- `pnpm test`
- `pnpm build`
- screenshot or visual audit when layout changes are substantial

## Design Tokens

- `pnpm test:tokens`
- `pnpm build`

## Frontend API And Shared Types

- `pnpm test`
- `pnpm build`
- Rust tests when Tauri command contracts changed

## Tauri Services, Commands, Paths, And DB

- `cd src-tauri && cargo test`
- `pnpm test` when frontend contracts or serialized types changed
- `pnpm build` when frontend bindings are affected

## Release And Automation Scripts

- targeted tests under `scripts/tests/`
- `pnpm test`
- `pnpm build` when package metadata or app sync changes

## High-Risk Minimum

For high-risk changes, run or explicitly justify skipping:

1. targeted tests for the changed area
2. `pnpm test`
3. `pnpm build`
4. `cd src-tauri && cargo test` when Rust, filesystem, DB, or Tauri behavior changed
