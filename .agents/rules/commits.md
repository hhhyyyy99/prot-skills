# Commit Message Rules

## Core Rule

All commits must use Conventional Commit style and must match the repository `commitlint.config.js`.

Preferred format:

`<type>(<scope>): <subject>`

Scope is recommended when it adds clarity, but it may be omitted:

`<type>: <subject>`

## Allowed Commit Types

Use the same allowed types enforced by `commitlint`:

- `feat`
- `fix`
- `docs`
- `style`
- `refactor`
- `perf`
- `test`
- `chore`
- `revert`
- `build`
- `ci`

Do not invent custom commit types outside this list unless `commitlint.config.js` is updated first.

## Subject Rules

- Write the subject as a short imperative summary.
- Keep it specific to the actual change.
- Prefer lowercase unless a proper noun requires uppercase.
- Do not end the subject with a period.
- Do not use vague subjects such as `update stuff` or `fix issue`.

Good examples:

- `feat(tools): add empty state for missing tool metadata`
- `fix(settings): preserve selected language after reload`
- `docs(release): clarify version tag workflow`
- `chore: refresh branch and commit rules`

## Scope Guidance

Use a scope when it helps readers locate the change quickly.

Recommended scopes in this repository include:

- `pages`
- `components`
- `shell`
- `hooks`
- `lib`
- `api`
- `tests`
- `tauri`
- `release`
- `deps`
- `rules`

## Commit Hygiene

- Keep commits focused on one logical change.
- Split unrelated work into separate commits.
- Do not mix formatting-only edits with behavior changes unless the formatting is required for the same change.
- Before committing, check that the message matches the change set, not just the ticket title.
- Before pushing, make sure the final commit message would pass the repository commitlint rules.
