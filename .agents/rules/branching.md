# Branching Rules

## Core Rule

Never execute a task directly on `main`.

If work starts while the current branch is `main`, create a new branch before editing files, staging changes, or committing.

## Required Branch Format

Use the Conventional Branch format for all new task branches:

`<type>/<description>`

Examples:

- `feat/tool-detail-panel`
- `fix/settings-language-toggle`
- `docs/release-process`
- `chore/update-tauri-config`

## Naming Rules

- Follow the branch naming convention documented at [conventional-branch.github.io/zh](https://conventional-branch.github.io/zh/).
- Use one lowercase branch type and one kebab-case description.
- Keep the description short, specific, and readable in pull request lists.
- Keep the full branch name as short as practical. Prefer concise wording over long phrases, and shorten the description when a name starts to feel verbose.
- Prefer 2 to 6 words in the description when possible.
- Avoid spaces, uppercase letters, dates, usernames, ticket dumps, and generic names such as `test`, `tmp`, or `update`.

## Recommended Types

Use the small, stable set recommended by Conventional Branch:

- `feat`: new functionality or meaningful feature work
- `fix`: bug fixes or regressions
- `docs`: documentation-only changes
- `chore`: maintenance, tooling, housekeeping, or repository policy changes

Use a more specific type only when the repository already depends on it for workflow clarity. In this repository, these additional types are also acceptable when they describe the work better:

- `refactor`
- `test`
- `ci`
- `build`
- `perf`
- `style`

## Decision Rules

- If the task mixes several change types, choose the type that best reflects the primary outcome.
- If you are already on a non-`main` branch created for the current task, keep using it instead of creating another branch.
- If a new task starts on an older unrelated branch, branch again from the correct base instead of reusing the old branch.
- If local tooling or repository constraints temporarily prevent slash-separated branch names, fix the repository setup before starting new work rather than inventing a different permanent convention.
