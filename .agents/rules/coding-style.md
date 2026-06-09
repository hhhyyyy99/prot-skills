# Coding Style Rules

Use these rules when writing, moving, or reviewing code in this repository.

## Frontend Module Boundaries

- Keep `src/pages/*Page.tsx` as thin route entry modules. Page files should preserve their named exports and delegate substantial UI, workflow, and helper logic to feature modules.
- Put feature-specific business code under `src/feature/<feature>/`. This includes feature views, workflow hooks, local components, deterministic helpers, and feature-only types.
- Keep shared layers generic. Code under `src/components`, `src/hooks`, `src/lib`, `src/api`, `src/types`, and `src/shell` must not import from `src/feature`.
- Use `src/components/primitives` for generic controls and `src/components/patterns` for reusable UI patterns. Do not promote one-feature UI into shared components until at least two real call sites need it.
- Do not add route libraries or global state libraries for page switching. `AppShell` owns the current page state.

## Imports

- Prefer the `@/` alias for imports that cross top-level frontend areas, such as feature-to-shared imports.
- Use relative imports for files within the same feature folder when they stay readable.
- Avoid new barrel files unless they remove meaningful duplication without hiding ownership or increasing bundle ambiguity.
- Keep type-only imports as `import type` when values are not needed at runtime.
- Do not change public API wrapper names, shared TypeScript contract exports, or Tauri command names as part of frontend-only refactors.

## React Components

- Keep components focused on one ownership level: route entry, feature view, feature component, shared pattern, or primitive.
- Extract feature components when a page or view becomes hard to scan, but avoid creating single-use abstraction layers that only rename JSX.
- Keep UI copy and behavior stable during structural refactors. Move code first; change behavior in a separate task.
- Preserve existing provider, toast, command bar, theme, and i18n patterns instead of introducing parallel mechanisms.
- Do not add new runtime dependencies for ordinary component decomposition or state orchestration.

## State And Async Work

- Keep Tauri API calls behind `src/api` wrappers. Frontend components and hooks should not call Tauri commands directly.
- Use feature workflow hooks for feature-specific orchestration when state, effects, and actions become too large for a view component.
- For independent async work, prefer parallel execution. Use sequential loops only when order, progress reporting, or rate limiting requires it, and leave the existing lint-disable comment style when needed.
- Keep optimistic UI updates paired with rollback or refresh behavior when failures are possible.

## Styling

- Use existing design tokens, Tailwind utility conventions, and CSS classes already present in the app.
- Do not introduce Prettier or ESLint conventions. This repo uses `oxfmt` and `oxlint`.
- Keep visible UI changes out of structural refactors unless the task explicitly asks for them.
- Use existing primitives for buttons, switches, selects, text fields, badges, tooltips, and icon buttons.

## Tests

- Keep page workflow tests importing public page modules from `src/pages/*Page.tsx`.
- Move focused helper tests to the same ownership boundary as the helper under test, but preserve existing assertions.
- For structural moves, run targeted tests for the moved page or helper before running broader verification.
- Add or update tests when behavior changes, public contracts change, or a bug fix needs a regression check.

## Backend And Security-Sensitive Code

- Keep Tauri command handlers thin. Put business logic in services.
- Review symlink, path, filesystem, capability, and database changes as security-sensitive.
- Do not change database schema, Tauri capabilities, or filesystem mutation behavior as part of frontend-only style work.

## Verification

- For narrow frontend refactors, run targeted Vitest files first, then `pnpm test`, `pnpm lint`, and `pnpm build` when the blast radius touches public pages or shared behavior.
- For docs-only rule changes, `pnpm format:check` and `git diff --check` are usually sufficient.
- Treat lint warnings as signal, but do not fix unrelated pre-existing warnings in the same change.
