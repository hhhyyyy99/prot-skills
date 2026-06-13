# Tool Contract

This contract applies to every AI tool and agent working in this repository.

## Common Entry

Agents must treat `.agents/harness/index.md` as the canonical shared protocol.
Tool-specific files may exist, but they should point back to `.agents/harness/`
and `.agents/rules/` instead of duplicating repository rules.

## Required Behavior

Every agent must:

- follow `.agents/rules/branching.md` before editing
- follow `.agents/rules/coding.md` while implementing
- follow `.agents/rules/commits.md` when committing
- use `.agents/skills/` when a request matches a skill trigger
- classify task risk with `risk-matrix.md`
- gather relevant context with `context-map.md`
- verify changes with `verification.md`
- apply `security-boundaries.md` to high-risk areas

## Output Contract

When reporting completed work, agents should include:

- changed behavior or files
- verification commands that ran
- skipped verification and why
- high-risk safety notes when applicable

## Tool-Specific Adapters

Tool-specific adapters should only document differences in how a tool reads
instructions or executes commands. They must not redefine repository policy.
Use `.agents/harness/adapters/` as the tracked source for adapter guidance.

Examples:

- Codex may use `AGENTS.md` as a local or tool-native adapter.
- Claude-specific entry files should point to `.agents/harness/index.md`.
- Cursor rules should point to `.agents/harness/` and `.agents/rules/`.

## Drift Prevention

If an adapter conflicts with `.agents/harness/` or `.agents/rules/`, the
canonical repository files win. Fix the adapter rather than changing behavior ad
hoc.
