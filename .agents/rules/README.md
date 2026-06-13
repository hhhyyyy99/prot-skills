# Agent Rules

Read these rules before starting any task that may create a branch or commit.
For non-trivial work, also read the shared cross-tool harness in
[`../harness/index.md`](../harness/index.md).

- [branching.md](branching.md): task branch creation and naming rules
- [coding.md](coding.md): coding and execution rules derived from Karpathy-style agent guidelines
- [coding-style.md](coding-style.md): repository-specific code organization, style, import, and test rules
- [commits.md](commits.md): commit message rules aligned with `commitlint.config.js`

Order of operations:

1. If the current branch is `main`, create a new working branch before making changes.
2. Name the branch using the Conventional Branch policy in `branching.md`.
3. Read `coding.md` before implementing or refactoring code.
4. Read `coding-style.md` before changing frontend, backend, tests, or shared contracts.
5. Read the harness when the task affects implementation, verification,
   workflows, tool adapters, or safety-sensitive behavior.
6. Commit with the Conventional Commit rules in `commits.md`.

These rules apply to both human contributors and coding agents working in this repository.
