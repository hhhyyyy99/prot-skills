# Security Boundaries

Prot Skills manages local files and symlinks for multiple AI tools. Treat safety
and data preservation as product behavior, not implementation detail.

## High-Risk Files

Review changes carefully in:

- `src-tauri/capabilities/default.json`
- `src-tauri/tauri.conf.json`
- `src-tauri/src/commands/`
- `src-tauri/src/services/`
- `src-tauri/src/utils/path_utils.rs`
- `src-tauri/src/db/connection.rs`

## Filesystem Rules

Agents must not weaken behavior that:

- verifies target paths before mutation
- distinguishes managed directories from user-owned directories
- validates symlinks before replacing originals
- preserves originals when replacement cannot complete safely
- prevents accidental writes outside the intended skill directories

## Tauri Capability Rules

Changes to capabilities or exposed commands are high-risk. Agents must explain:

- what new access is needed
- why existing access is insufficient
- which user data or filesystem areas become reachable
- how the change is tested or bounded

## Database Rules

Schema or migration changes must preserve existing user metadata. Agents should:

- keep migrations additive when possible
- define default values for existing rows
- verify services still handle pre-existing databases
- avoid destructive cleanup unless explicitly requested and documented

## Release Rules

Release tasks must use the repository release skills. Agents must not publish,
tag, or push release changes by improvising a new process.

## Required Escalation To User

Ask before proceeding when a change may:

- delete user-owned folders
- overwrite non-managed skills
- broaden filesystem permissions
- perform irreversible release or GitHub actions
- require credentials or network access not already available
