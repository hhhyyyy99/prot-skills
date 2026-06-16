---
name: sync-agent-skills
description: Maintain repository agent skills across Codex and Claude. Use when adding, removing, renaming, or editing skills under `.agents/skills`, when Claude cannot see repository skills, when `.claude/skills` symlinks need to be generated or checked, or when updating the skill loading bridge between `.agents/skills` and tool-specific skill directories.
---

# Sync Agent Skills

Use `.agents/skills` as the only maintained source for repository skills.

## Workflow

1. Read `.agents/skills/README.md` to confirm the current loading policy.
2. Put durable repository rules in `.agents/rules/`; put reusable workflows in
   `.agents/skills/<skill-name>/SKILL.md`.
3. After adding, removing, renaming, or editing repository skills, run:

   ```sh
   pnpm skills:sync
   ```

4. Verify the bridge with:

   ```sh
   pnpm skills:check
   pnpm vitest run scripts/tests/sync-agent-skills.test.ts
   ```

5. If package scripts or the sync script changed, also run:

   ```sh
   pnpm harness:check:release
   ```

## Safety Rules

- Do not copy skill contents into `.claude/skills`.
- Do not maintain `.claude/skills` by hand except to inspect or remove broken
  local state after the sync script reports a conflict.
- Treat `.agents/skills` as tracked repository source.
- Treat `.claude/skills` as generated local symlinks for Claude.
- Do not overwrite existing non-symlink Claude skills.
- Only remove stale Claude symlinks that point back into this repository's
  `.agents/skills`.

## Expected Bridge

`pnpm skills:sync` creates links shaped like:

```text
.claude/skills/<skill-name> -> ../../.agents/skills/<skill-name>
```

`pnpm skills:check` should report:

```text
Agent skills are in sync.
```

Restart Claude or Codex sessions after skill changes if the tool does not pick
up the updated skill list.
