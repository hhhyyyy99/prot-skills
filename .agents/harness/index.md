# Agent Harness

This directory defines the shared operating system for AI agents working in
this repository. It is tool-agnostic: Codex, Claude, Cursor, Gemini, and other
agents should all follow the same repository protocol.

## Source of Truth

- `.agents/harness/index.md` is the canonical shared agent protocol.
- `.agents/rules/` defines durable repository rules.
- `.agents/skills/` defines task-specific workflows.
- Tool-specific files such as `AGENTS.md`, `CLAUDE.md`, `GEMINI.md`, or
  `.cursor/rules/` are optional entrypoints. They should point back to
  `.agents/harness/` and `.agents/rules/` instead of duplicating rules.

## Required Reading

Before making substantial changes, agents must read:

1. `.agents/rules/README.md`
2. `.agents/rules/coding.md`
3. This file
4. The task-specific harness files listed below
5. Any matching skill under `.agents/skills/`

## Harness Files

- `lifecycle.md` - the standard task flow from orientation to report.
- `context-map.md` - where to look for different kinds of work.
- `risk-matrix.md` - how to classify task risk.
- `verification.md` - which checks prove a change.
- `security-boundaries.md` - high-risk filesystem, symlink, Tauri, and DB areas.
- `tool-contract.md` - the common contract all AI tools must follow.

## Core Protocol

Every agent should:

1. Orient with the smallest relevant context.
2. Classify the task risk before editing.
3. Make surgical changes that directly serve the request.
4. Use existing project patterns and skills.
5. Run risk-appropriate verification.
6. Report changed files, verification, and any skipped checks.
7. Turn repeated failures into better rules, tests, scripts, or skills.

## Repository-Specific Focus

Prot Skills manages local skill folders for multiple AI tools. Changes that
touch filesystem mutation, symlinks, path validation, Tauri capabilities, SQLite
schema, or release automation are high-risk by default.
