# Agent Skills

Reusable agent workflows live here.

Use one directory per skill:

```text
.agents/skills/<skill-name>/SKILL.md
```

Add a skill when a workflow is repeated, multi-step, and specific enough to be
worth invoking by trigger phrases. Put durable repository policy in
`.agents/rules/` instead.

## Tool Loading

`.agents/skills` is the source of truth for repository skills.

- Codex can discover repository skills from `.agents/skills` when launched from
  this repository.
- Claude uses `.claude/skills`, so this repository generates Claude skill
  links from `.agents/skills`.

After adding, removing, or renaming a repository skill, run:

```sh
pnpm skills:sync
```

Use the check command in automation or before committing:

```sh
pnpm skills:check
```

The sync script creates `.claude/skills/<skill-name>` symlinks that point back
to `.agents/skills/<skill-name>`. It does not copy skill contents and does not
overwrite existing non-symlink Claude skills.
