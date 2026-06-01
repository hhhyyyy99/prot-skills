# Prot Skills

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
![Tauri](https://img.shields.io/badge/Tauri-2.x-24C8DB)
![React](https://img.shields.io/badge/React-18-61DAFB)
![Status](https://img.shields.io/badge/status-early%20development-orange)

English | [简体中文](README.zh-CN.md)

Prot Skills is a local-first desktop app that gives you one place to manage
agent Skills across multiple AI coding tools. It detects installed tools, scans
their Skill folders, migrates Skills into a single managed library, and links
them back to each tool through filesystem symlinks — so every tool keeps
working from its expected path.

> **Status:** early development. Local detection, scanning, migration,
> enable/disable, and uninstall are working. Remote discovery, registries, and
> packaged releases are still in progress. Back up Skill folders before
> migrating them.

## Features

- Detect installed agent tools, or add custom ones with your own paths.
- Scan tools for local Skill folders containing `SKILL.md`.
- Migrate Skills into `~/.prot-skills/skills` and replace the originals with
  symlinks pointing at the managed copy.
- Auto-link new or migrated Skills to every enabled tool, with per-tool
  toggles in **My Skills**.
- Enable, disable, and uninstall managed Skills.
- View managed paths in **Settings**; light / dark / system theme.
- Vitest frontend tests + Rust backend tests.

## Supported Tools

Built-in detection rules:

| Tool     | Default config dir | Skills dir |
| -------- | ------------------ | ---------- |
| Cursor   | `~/.cursor`        | `skills`   |
| Trae     | `~/.trae`          | `skills`   |
| Trae CN  | `~/.trae-cn`       | `skills`   |
| Claude   | `~/.claude`        | `skills`   |
| Kiro     | `~/.kiro`          | `skills`   |
| Codex    | `~/.codex`         | `skills`   |
| OpenCode | `~/.opencode`      | `skills`   |
| Windsurf | `~/.windsurf`      | `skills`   |
| Aider    | `~/.aider`         | `skills`   |
| Continue | `~/.continue`      | `skills`   |
| Codeium  | `~/.codeium`       | `skills`   |
| Gemini   | `~/.gemini`        | `skills`   |
| Pi       | `~/.pi/agent`      | `skills`   |

You can also register custom tools from the **Tools** screen (currently they
default to `skills/` as their subdirectory). Prot Skills is not affiliated with
any of these tools.

## How Migration Works

Managed Skills live in `~/.prot-skills/skills` and metadata in
`~/.prot-skills/metadata.db`.

When you migrate a Skill, Prot Skills:

1. Copies the source folder into the managed library.
2. Records it in the local SQLite database.
3. Creates and validates a replacement symlink to the managed copy.
4. **Replaces the original folder only after the symlink is valid.**
5. Preserves the original folder and reports a failure if replacement cannot be completed safely.
6. Links the Skill to every enabled tool by default.

> ⚠️ Migration mutates the filesystem and may delete the original folder.
> Commit or back up Skills you care about first.

## Tech Stack

Vite 5 · React 18 · React Router 6 · TypeScript 5 · Tailwind CSS 3 ·
Radix UI · `cmdk` · `lucide-react` · Tauri 2 · Rust 2021 · `rusqlite` ·
Vitest + Testing Library.

## Getting Started

Requirements: Node.js ≥ 18, pnpm, Rust stable, and your platform's
[Tauri 2 prerequisites](https://tauri.app/start/prerequisites/).

```sh
pnpm install
pnpm dev          # Vite web dev server
pnpm tauri:dev    # Run as a desktop app
pnpm build        # TypeScript check + frontend build
pnpm tauri build  # Build the desktop app
```

### Running on macOS

The app is unsigned, so macOS may show an "unidentified developer" warning.
If so, remove the quarantine attribute:

```sh
xattr -d com.apple.quarantine "/Applications/Prot Skills.app"
```

## Development Commands

| Command                      | Description                           |
| ---------------------------- | ------------------------------------- |
| `pnpm dev`                   | Start the Vite dev server.            |
| `pnpm tauri:dev`             | Run the desktop app in dev mode.      |
| `pnpm build`                 | TypeScript check + frontend build.    |
| `pnpm preview`               | Preview the production build.         |
| `pnpm test` / `test:watch`   | Run Vitest (single run / watch mode). |
| `pnpm test:tokens`           | Validate design token output.         |
| `pnpm audit:visual`          | Run the visual audit script.          |
| `cd src-tauri && cargo test` | Run Rust tests.                       |

## Releasing

Releases are published from git tags using version notes in
`docs/releases/vX.Y.Z.md`:

```sh
pnpm release:version patch
cp docs/releases/TEMPLATE.md docs/releases/vX.Y.Z.md
pnpm test && pnpm build
cd src-tauri && cargo test
pnpm release:tag vX.Y.Z
```

The release workflow turns the notes file into a GitHub Release. Assets follow
a `Prot-Skills-vX.Y.Z-<platform>-<arch>.<ext>` naming pattern. Full checklist:
[`docs/releasing.md`](docs/releasing.md).

## Repository Structure

```text
src/
  api/         Tauri command wrappers
  components/  UI primitives and reusable patterns
  design/      Design tokens and CSS variables
  hooks/       Shared React hooks
  lib/         Frontend utilities
  pages/       Application screens
  shell/       Layout, navigation, providers, command bar

src-tauri/src/
  commands/    Tauri commands exposed to the frontend
  db/          SQLite connection and schema
  models/      Rust data models
  services/    Skill, tool, discovery, link services
  utils/       Path and filesystem helpers

assets/        Static assets
scripts/       Validation and audit scripts
```

## Security & Filesystem Scope

Prot Skills is a desktop app that creates symlinks and modifies local files.
Tauri capabilities currently allow filesystem and path access plus opening
folders. Review changes to these carefully:

- `src-tauri/tauri.conf.json`
- `src-tauri/capabilities/default.json`
- `src-tauri/src/commands/`
- `src-tauri/src/services/`
- `src-tauri/src/utils/path_utils.rs`

Don't migrate Skills from sources you haven't reviewed.

## Roadmap

- Remote Skill discovery and installation
- Configurable Skill sources
- Migration previews and conflict handling
- Richer `SKILL.md` metadata parsing
- Cross-platform release packaging
- Import / export / backup workflows

## Contributing

Issues and PRs welcome — please keep changes focused and describe user-visible
behavior. Run before opening a PR:

```sh
pnpm test
pnpm build
cd src-tauri && cargo test
```

Include screenshots/recordings for UI changes and explicitly mention any
changes to Tauri permissions, filesystem behavior, symlinks, or DB schema.

## License

[MIT](LICENSE)

## Friendly Links

- [Linux Do](https://linux.do/)
