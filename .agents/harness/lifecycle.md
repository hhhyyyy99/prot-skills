# Agent Lifecycle

Use this lifecycle for substantial work. Small read-only questions can skip the
edit and verification phases, but should still use the context map when needed.

## 1. Orient

- Read `.agents/harness/index.md`.
- Read the relevant rule, harness, and skill files.
- Inspect the current branch and worktree before editing.
- Identify the files and commands most likely to matter.

## 2. Classify Risk

Use `risk-matrix.md` before making edits. If a task touches multiple areas, use
the highest applicable risk level.

## 3. Plan

For non-trivial work, state:

- the user-visible goal
- the files or modules likely to change
- the verification checkpoint
- any safety concerns or assumptions

## 4. Change

- Keep changes surgical.
- Prefer existing helpers, patterns, and tests.
- Do not refactor unrelated code.
- Do not duplicate canonical rules in tool-specific files.

## 5. Verify

Use `verification.md` to choose checks. Prefer targeted checks first, then widen
when the blast radius is larger.

## 6. Report

Final reports should include:

- what changed
- what verification ran
- what was not verified, if anything
- any residual risk or follow-up that affects the user

## 7. Feed Back

If the same issue or confusion appears repeatedly, improve the harness:

- unclear behavior -> rule or context map
- missing guard -> test or script
- repeated workflow -> skill
- risky manual judgment -> verification gate
