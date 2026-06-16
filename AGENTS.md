# AGENTS.md

This file provides guidance to AI coding agents when working with code in this repository.

## Agent Rules

@.agents/rules/branching.md
@.agents/rules/coding.md
@.agents/rules/coding-style.md
@.agents/rules/commits.md
@.agents/harness/index.md

**Order of operations:**

1. If on `main`, create a working branch first (see branching rules).
2. Read coding rules before implementing or refactoring.
3. Read coding style rules before changing code, tests, or shared contracts.
4. Commit following the commit rules.
5. Never include `Co-Authored-By:`, `Signed-off-by:`, or similar attribution trailers in commit messages.

## Agent Harness

This repository uses `.agents/harness/index.md` as the shared cross-tool agent
harness. Read it after this file for non-trivial tasks, especially work that
affects agent behavior, repository guidance, reusable workflows, tool entrypoints,
or safety-sensitive boundaries.

`.agents/harness/index.md` is the canonical shared agent protocol. This local
`AGENTS.md` acts as a tool-specific entrypoint and points back to the shared
repository guidance instead of duplicating it. Keep root entrypoints such as
`AGENTS.md` and `CLAUDE.md` tracked and thin; update `.agents/rules/`,
`.agents/harness/`, or `.agents/skills/` for shared policy changes.

## Agent Skills

This repo includes agent skills in `.agents/skills/`. Read the relevant SKILL.md when a user request matches one of these:

- [release-version](.agents/skills/release-version/SKILL.md) — prepare a release branch: bump version, write release notes. Triggered by "准备发版", "bump version", "写 release notes".
- [release-publish](.agents/skills/release-publish/SKILL.md) — publish a release: push branch, create auto-merge PR, push tag, monitor CI. Triggered by "发布", "publish release".
- [release-tag](.agents/skills/release-tag/SKILL.md) — direct release from main: bump, verify, push, tag. Triggered by "直接发版", "push tag", "release on main".
- [submit-pr](.agents/skills/submit-pr/SKILL.md) — submit a PR to main with auto-merge: scan diff, assess risk, creates the PR, enables auto-merge when safe, and reports any blockers. Triggered by "提交PR", "create a PR", "submit PR".
- [self-check](.agents/skills/self-check/SKILL.md) — run local production/PR self-checks before pushing or submitting a PR. Triggered by "自检", "生产门禁自检", "PR checks", "pre-push check".
- [sync-agent-skills](.agents/skills/sync-agent-skills/SKILL.md) — maintain repository agent skills across Codex and Claude. Triggered when adding, removing, renaming, or editing skills under `.agents/skills`, or when Claude skill symlinks need to be generated or checked.

When a request triggers a skill, read the full SKILL.md and follow its workflow phases exactly.

`.agents/skills/` is the source of truth for repository skills. Run
`pnpm skills:sync` after adding, removing, or renaming a skill so Claude can
load the generated `.claude/skills/` symlinks.

## Commands

```sh
pnpm dev              # Vite dev server (port 1420, strict)
pnpm tauri:dev         # Desktop app in dev mode
pnpm build             # app:sync → tsc → vite build
pnpm test              # Vitest single run (jsdom, @/ alias, globals)
pnpm test:watch        # Vitest watch mode
pnpm test:tokens       # Validate design token CSS output
pnpm skills:sync       # Generate local Claude skill symlinks from .agents/skills
pnpm skills:check      # Check that Claude skill symlinks are in sync
pnpm lint              # oxlint (correctness=error, suspicious/perf=warn, no ESLint)
pnpm lint:fix          # oxlint --fix
pnpm format            # oxfmt (no Prettier)
pnpm format:check      # oxfmt --check
cd src-tauri && cargo test  # Rust tests
```

Single test file: `pnpm vitest run src/tests/lib/theme.test.ts`

The `build` and `tauri:build` scripts run `app:sync` first, which syncs `productName`/`version` from `package.json` into `tauri.conf.json` and `Cargo.toml`.

## Architecture

This is a Tauri 2 desktop app (React 18 frontend + Rust backend) for managing AI coding tool Skills. Managed skills live in `~/.prot-skills/skills`, metadata in `~/.prot-skills/metadata.db` (SQLite via `rusqlite`).

### Frontend (`src/`)

- **`src/main.tsx`** → `src/App.tsx` → `AppProviders` wraps `AppShell`
- **No router** — `AppShell` uses `useState<PageId>` for page switching. Four pages: `my-skills`, `tools`, `migrate`, `settings`. Keyboard shortcuts `⌘1`–`⌘4`.
- **Provider hierarchy**: `ThemeProvider` → `LanguageProvider` → `ToastProvider` → `CommandBarProvider`
- **`src/api/index.ts`** — typed wrappers around `@tauri-apps/api/core` invoke. Guards against browser context where Tauri isn't available.
- **`src/shell/`** — layout, nav, providers, command bar (cmdk-powered `⌘K` palette)
- **`src/components/primitives/`** — generic UI components (Button, Select, Switch, Badge, etc.)
- **`src/components/patterns/`** — domain-level UI (EmptyState, Toast, FilterPills, StatsStrip)
- **`src/components/command/`** — CommandBar built on cmdk
- **`src/lib/`** — pure utilities: theme resolution, i18n (`en`/`zh-CN`), breakpoints, toast queue, motion
- **`src/hooks/`** — `useTheme` (with View Transition API circle reveal animation), `useBreakpoint`, `useKeyboardShortcuts`, `useToast`, `useReducedMotion`
- **`src/design/`** — `tokens.json` (source of truth) and `tokens.css` (generated CSS custom properties)
- **`src/types/index.ts`** — shared TS types: `Skill`, `AITool`, `SkillLink`, `LocalSkill`, `SyncSkillTargetsResult`
- **Path alias**: `@/` maps to `src/`

### Backend (`src-tauri/src/`)

- **`lib.rs`** — app entry. Initializes DB at `~/.prot-skills/metadata.db`, runs `ToolService::detect_tools`, registers all Tauri commands
- **`db/connection.rs`** — `Database` struct wrapping `rusqlite::Connection`. Schema: `skills`, `ai_tools`, `skill_links`, `skill_sources`. Includes a migration for `sort_order` on existing DBs.
- **`commands/`** — Tauri command handlers (`skill_commands.rs`, `tool_commands.rs`) — thin layer that calls services and serializes results
- **`services/`** — business logic:
  - `ToolService` — CRUD, detection, enable/disable, reorder
  - `SkillService` — install, toggle, uninstall, prune stale entries, register pre-existing folders
  - `DiscoveryService` — scans tool skill directories for `SKILL.md` folders, auto-replaces managed skills with symlinks
  - `LinkService` — manages per-skill-per-tool symlinks
- **`models/`** — Rust structs matching DB rows, with serde derives
- **`utils/path_utils.rs`** — symlink detection, manager-dir checks, skills-dir resolution
- **`error.rs`** — unified `AppError` enum (Db/Io/NotFound/Path/Other) with `AppResult<T>` alias

### Symlink model

When a skill is migrated: the source folder is copied into `~/.prot-skills/skills/<id>`, recorded in SQLite, and the **original folder is replaced with a symlink** pointing to the managed copy. `DiscoveryService::scan_directory` detects this and skips already-correct symlinks.

### Design tokens

Tailwind is configured entirely through CSS custom properties defined in `src/design/tokens.css` (generated from `tokens.json`). Colors, spacing, radii, shadows, durations, and font sizes all reference `var(--color-*)` etc. The `tailwind.config.js` maps Tailwind utility classes to these variables. `scripts/check-tokens.ts` validates the output.

### Build tooling

- **oxlint** (not ESLint) with react/import/unicorn/typescript plugins
- **oxfmt** (not Prettier)
- **husky** + **lint-staged** for pre-commit: oxlint on `*.{js,ts,jsx,tsx}`, oxfmt on everything
- **commitlint** with conventional config

### Security-sensitive areas

The app creates symlinks and modifies local files. Review changes to Tauri capabilities (`src-tauri/capabilities/default.json`), filesystem commands, path utilities, and symlink logic carefully.

## Behavioral Guidelines

Derived from [andrej-karpathy-skills](https://github.com/multica-ai/andrej-karpathy-skills). These bias toward caution over speed — for trivial tasks, use judgment.

### 1. Think Before Coding

Don't assume. Don't hide confusion. Surface tradeoffs.

- State assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them — don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

### 2. Simplicity First

Minimum code that solves the problem. Nothing speculative.

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If 200 lines could be 50, rewrite it.

### 3. Surgical Changes

Touch only what you must. Clean up only your own mess.

- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- Remove imports/variables/functions your changes made unused — don't remove pre-existing dead code.
- Every changed line should trace directly to the user's request.

### 4. Goal-Driven Execution

Define success criteria. Loop until verified.

- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- For multi-step tasks, state a brief plan with verification checkpoints.
- Use `pnpm test`, `pnpm build`, `pnpm lint` as verification steps.
