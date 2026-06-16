# CLAUDE.md

This file is the tracked Claude Code entrypoint for this repository. It uses
`AGENTS.md` plus direct first-level imports because Claude may not reliably
follow nested imports through `AGENTS.md`.

Keep shared policy changes in `.agents/rules/`, `.agents/harness/`, or
`.agents/skills/`; do not duplicate canonical rules here.

Claude skill entries are generated from `.agents/skills/` with
`pnpm skills:sync`.

@AGENTS.md
@.agents/rules/branching.md
@.agents/rules/coding.md
@.agents/rules/coding-style.md
@.agents/rules/commits.md
@.agents/harness/context-map.md
@.agents/harness/index.md
@.agents/harness/lifecycle.md
@.agents/harness/risk-matrix.md
@.agents/harness/security-boundaries.md
@.agents/harness/tool-contract.md
@.agents/harness/verification.md
@.agents/skills/README.md
