# Risk Matrix

Classify the task before editing. When in doubt, choose the higher risk level.

## Low Risk

Examples:

- documentation-only changes
- copy changes
- isolated visual polish
- isolated pure utility changes with obvious tests
- release notes that do not change release logic

Expected behavior:

- keep edits narrow
- run targeted verification when available
- report if no verification was needed

## Medium Risk

Examples:

- frontend page behavior
- shared React components
- hooks and frontend utilities
- API wrapper changes
- scripts that do not publish, tag, or mutate user files
- i18n or theme behavior

Expected behavior:

- run targeted tests
- run `pnpm build` when TypeScript, app behavior, or UI integration is affected
- consider screenshots for meaningful UI changes

## High Risk

Examples:

- filesystem mutation
- symlink creation, replacement, or deletion
- path validation and directory containment
- Tauri capabilities or permissions
- SQLite schema or migrations
- release publishing, tagging, or asset packaging
- CI or merge gates
- security-sensitive command exposure

Expected behavior:

- read `security-boundaries.md`
- run the relevant full verification set from `verification.md`
- explain the safety impact in the final report
- avoid broad refactors unless explicitly requested

## Stop And Clarify

Stop before editing when:

- the requested behavior could delete or overwrite user data
- the safe default is unclear
- required credentials or external permissions are missing
- the task asks to bypass tests, reviews, branch rules, or safety checks
- repository instructions conflict in a way that changes behavior
