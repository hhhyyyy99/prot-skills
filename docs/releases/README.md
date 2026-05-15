# Release Notes

This directory holds the versioned release notes that are published into each
GitHub draft release.

## Naming

- Create one Markdown file per release tag.
- The filename must exactly match the git tag name.
- Example: tag `v0.0.4` must use `docs/releases/v0.0.4.md`.

## Required Flow

1. Bump the version with `pnpm release:version patch|minor|major`.
2. Copy `docs/releases/TEMPLATE.md` to the next tag file.
3. Fill in the release notes before creating the tag.
4. Push `main`.
5. Create and push the release tag with `pnpm release:tag vX.Y.Z`.

The release workflow fails fast if the matching release note file is missing.

## Writing Guidance

- Keep the top summary short and user-facing.
- Prefer concrete product changes over internal refactors.
- Mention any migration, compatibility, or installation caveats.
- Keep section headings stable so releases stay easy to scan.
