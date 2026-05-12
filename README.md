# Prot Skills

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
![Tauri](https://img.shields.io/badge/Tauri-1.x-24C8DB)
![React](https://img.shields.io/badge/React-18-61DAFB)
![Status](https://img.shields.io/badge/status-early%20development-orange)

English | [简体中文](README.zh-CN.md)

Prot Skills is an open-source desktop application for managing agent Skills
across local AI coding tools. It provides a single place to detect tool
installations, inspect existing Skills, migrate them into a managed library, and
keep each tool connected through filesystem links.

The project is local-first by design. Prot Skills stores metadata on your
machine, works with local Skill folders, and does not require a hosted service
for the current management workflow.

## Project Status

Prot Skills is in active early development. The local tool detection, Skill
scanning, migration, enable/disable, and uninstall flows are implemented. Remote
discovery, registry-backed installation, source management, and release
packaging are still evolving.

Use it with versioned or backed-up Skill folders until the migration workflow is
fully stabilized.

## Why Prot Skills

Agent tools increasingly support reusable Skills, but each tool tends to store
them in a different local directory. That makes it difficult to audit, reuse,
move, or disable Skills consistently.

Prot Skills aims to provide:

- A unified local inventory of Skills across multiple agent tools.
- A managed Skill library that can become the source of truth.
- A migration workflow that preserves compatibility with existing tool paths.
- A foundation for future community discovery and installation workflows.

## Features

- Detect installed agent tools from common configuration directories.
- Add and manage custom tools with user-defined configuration paths.
- Scan enabled tools for local Skill folders containing `SKILL.md`.
- Migrate selected Skills into `~/.prot-skills/skills`.
- Replace migrated tool-local Skill folders with symlinks to the managed copy.
- Enable, disable, and uninstall managed Skills.
- View managed storage paths from Settings.
- Switch between system, light, and dark themes.
- Includes Vitest-based frontend tests and Rust backend tests.

## Supported Tool Detection

Prot Skills currently includes built-in detection rules for:

| Tool | Default config directory | Skills subdirectory |
| --- | --- | --- |
| Cursor | `~/.cursor` | `skills` |
| Trae | `~/.trae` | `skills` |
| Trae CN | `~/.trae-cn` | `skills` |
| Claude | `~/.claude` | `skills` |
| Kiro | `~/.kiro` | `skills` |
| Codex | `~/.codex` | `skills` |
| OpenCode | `~/.opencode` | `skills` |
| Windsurf | `~/.windsurf` | `skills` |
| Aider | `~/.aider` | `skills` |
| Continue | `~/.continue` | `skills` |
| Codeium | `~/.codeium` | `skills` |

Custom tools can be added from the Tools screen. Custom tools currently use
`skills` as their Skills subdirectory.

Prot Skills is not affiliated with the tools listed above.

## How Migration Works

Prot Skills manages Skills under:

```text
~/.prot-skills/skills
```

It stores local metadata in:

```text
~/.prot-skills/metadata.db
```

When you migrate a Skill:

1. Prot Skills resolves the selected source folder.
2. The Skill is copied into the managed library.
3. Metadata is recorded in the local SQLite database.
4. The original tool-local Skill folder is replaced with a symlink pointing to
   the managed copy.

This keeps each tool compatible with its expected directory layout while giving
Prot Skills a central library to manage.

Important: migration performs filesystem changes. If the source path already
exists, Prot Skills may remove that original folder and replace it with a
symlink. Back up or commit important local Skills before migrating them.

## Tech Stack

- Vite 5
- React 18
- TypeScript
- Tailwind CSS
- Radix UI primitives
- Tauri 1.x
- Rust
- SQLite via `rusqlite`
- Vitest and Testing Library

## Requirements

- Node.js 18 or newer
- pnpm
- Rust stable toolchain
- Tauri 1.x platform prerequisites

For platform-specific Tauri requirements, refer to the Tauri setup guide for
your operating system. macOS usually requires the Rust toolchain and Xcode
Command Line Tools. Linux and Windows may require additional WebView/system
packages.

## Getting Started

Install dependencies:

```sh
pnpm install
```

Start the web app:

```sh
pnpm dev
```

Start the desktop app:

```sh
pnpm tauri:dev
```

Build the frontend:

```sh
pnpm build
```

Build the desktop application:

```sh
pnpm tauri build
```

## Development Commands

| Command | Description |
| --- | --- |
| `pnpm dev` | Start the Vite development server. |
| `pnpm tauri:dev` | Run the Tauri desktop app in development mode. |
| `pnpm build` | Run TypeScript checks and build the frontend. |
| `pnpm preview` | Preview the production frontend build. |
| `pnpm test` | Run the Vitest suite once. |
| `pnpm test:watch` | Run Vitest in watch mode. |
| `pnpm test:tokens` | Validate design token output. |
| `pnpm audit:visual` | Run the visual audit script. |
| `cd src-tauri && cargo test` | Run Rust tests. |

## Repository Structure

```text
src/
  api/          Tauri command wrappers used by the React app
  components/   Primitive UI controls and reusable UI patterns
  design/       Design tokens and generated CSS variables
  hooks/        Shared React hooks
  lib/          Frontend utilities
  pages/        Application screens
  shell/        Layout, navigation, providers, and command bar

src-tauri/
  src/
    commands/   Tauri commands exposed to the frontend
    db/         SQLite connection and schema setup
    models/     Rust data models
    services/   Skill, tool, discovery, and link services
    utils/      Path and filesystem helpers

assets/         Static assets
scripts/        Validation and audit scripts
```

## Security and Filesystem Scope

Prot Skills is a desktop application that manages local files. The Tauri
configuration currently enables filesystem/path access and folder opening so the
app can scan tools, copy Skills, and create symlinks.

Review changes to the following areas carefully:

- `src-tauri/tauri.conf.json`
- `src-tauri/src/commands/`
- `src-tauri/src/services/`
- `src-tauri/src/utils/path_utils.rs`

Do not migrate Skills from untrusted sources without reviewing their contents.

## Roadmap

- Remote Skill discovery and installation.
- Configurable Skill sources.
- Safer migration previews and conflict handling.
- Richer Skill metadata parsing from `SKILL.md`.
- Release packaging for common desktop platforms.
- Import/export and backup workflows.

## Contributing

Issues and pull requests are welcome. For pull requests, please keep the scope
focused and describe user-visible behavior clearly.

Recommended checks before opening a pull request:

```sh
pnpm test
pnpm build
cd src-tauri && cargo test
```

Please include screenshots or recordings for visible UI changes. Mention any
changes to Tauri permissions, filesystem behavior, symlink behavior, or database
schema explicitly in the pull request description.

## License

Prot Skills is licensed under the [MIT License](LICENSE).
