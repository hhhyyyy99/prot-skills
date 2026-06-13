# Context Map

Use this map to gather the smallest relevant context before changing code.

## Frontend App

Read these for app shell, navigation, providers, and global behavior:

- `src/App.tsx`
- `src/main.tsx`
- `src/shell/`
- `src/hooks/`
- `src/lib/`
- `src/tests/shell/`
- `src/tests/hooks/`
- `src/tests/lib/`

## Pages

Read the page and its tests together:

- `src/pages/`
- `src/tests/pages/`

## Components

Read primitives before patterns when behavior is shared:

- `src/components/primitives/`
- `src/components/patterns/`
- `src/components/command/`
- matching tests under `src/tests/components/`

## Styling And Design Tokens

- `src/design/tokens.json`
- `src/design/tokens.css`
- `tailwind.config.js`
- `scripts/check-tokens.ts`

## Frontend API Boundary

- `src/api/index.ts`
- `src/types/index.ts`
- `src/tests/api/`
- related Tauri commands under `src-tauri/src/commands/`

## Tauri Commands And Services

- `src-tauri/src/commands/`
- `src-tauri/src/services/`
- `src-tauri/src/models/`
- `src-tauri/src/error.rs`
- `src-tauri/src/lib.rs`

## Database

- `src-tauri/src/db/connection.rs`
- `src-tauri/src/models/`
- service code that writes or reads the affected tables

## Filesystem, Paths, And Symlinks

Treat this area as high-risk:

- `src-tauri/src/services/discovery_service.rs`
- `src-tauri/src/services/link_service.rs`
- `src-tauri/src/services/skill_service.rs`
- `src-tauri/src/utils/path_utils.rs`
- `src-tauri/capabilities/default.json`

## Tool Detection And Linking

- `src-tauri/src/services/tool_service.rs`
- `src-tauri/src/models/tool.rs`
- `src/types/index.ts`
- `src/pages/ToolsPage.tsx`
- `src/pages/MySkillsPage.tsx`

## Release And PR Automation

- `.agents/skills/submit-pr/`
- `.agents/skills/release-version/`
- `.agents/skills/release-publish/`
- `.agents/skills/release-tag/`
- `scripts/release-version.ts`
- `scripts/create-release-tag.ts`
- `scripts/tests/`
- `docs/releasing.md`
- `docs/releases/`

## AI Review

- `scripts/ai-review/`
- `scripts/tests/ai-review/`
- `docs/ai-review.md`
