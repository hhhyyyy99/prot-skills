# Skill Tool Links Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Let users manage per-skill symlinks to enabled AI tools from My Skills via a secondary sync-targets dialog, while preserving open-folder and uninstall actions.

**Architecture:** Reuse the existing Tauri `LinkService` and `skill_links` table instead of introducing a new link model. Add small backend commands for listing and setting a skill's tool links, expose them through `src/api`, then render a compact My Skills row with summary chips and a focused modal for link selection.

**Tech Stack:** Vite, React, TypeScript, Tailwind utilities, Vitest, Testing Library, Tauri Rust commands, rusqlite.

---

## File Structure

- Modify `src-tauri/src/services/link_service.rs`
  - Add `get_links_for_skill` and `set_link_active` helpers around existing `create_link`, `remove_link`, `get_link`.
- Modify `src-tauri/src/commands/skill_commands.rs`
  - Add Tauri commands `get_skill_links(skill_id)` and `set_skill_tool_link(skill_id, tool_id, active)`.
- Modify `src-tauri/src/lib.rs`
  - Register the new commands in `tauri::generate_handler!`.
- Modify `src/api/index.ts`
  - Export `getSkillLinks` and `setSkillToolLink`.
- Modify `src/types/index.ts`
  - Reuse existing `SkillLink`; no new type unless frontend needs a local view model.
- Modify `src/pages/MySkillsPage.tsx`
  - Load skills and tools together.
  - Add row-level `Open folder`, `Uninstall`, and `Sync targets` controls.
  - Replace always-open details panel flow with a secondary sync-targets modal.
  - Keep optimistic skill enable/disable behavior.
- Modify `src/lib/i18n.ts`
  - Add English and Chinese copy for sync-targets modal, open/uninstall aria labels, link toasts, and stats.
- Modify `src/pages/__tests__/MySkillsPage.test.tsx`
  - Update stale route-button tests to modal-based expectations.
  - Preserve any existing test edits; read diff before applying changes.

## Task 1: Backend Link Commands

**Files:**
- Modify: `src-tauri/src/services/link_service.rs`
- Modify: `src-tauri/src/commands/skill_commands.rs`
- Modify: `src-tauri/src/lib.rs`

- [x] **Step 1: Add service tests or command-level expectations if Rust test harness exists**

Run:

```bash
cd src-tauri && cargo test
```

Expected: Existing Rust tests pass or no tests run. If no tests exist, proceed with compile checks after implementation.

- [x] **Step 2: Add `get_links_for_skill` to `LinkService`**

Implementation outline:

```rust
pub fn get_links_for_skill(db: &Database, skill_id: &str) -> AppResult<Vec<SkillLink>> {
    let conn = db.get_connection();
    let mut stmt = conn.prepare(
        "SELECT id, skill_id, tool_id, link_path, is_active, created_at
         FROM skill_links WHERE skill_id = ?1 ORDER BY tool_id",
    )?;
    let links = stmt
        .query_map([skill_id], |row| {
            Ok(SkillLink {
                id: row.get(0)?,
                skill_id: row.get(1)?,
                tool_id: row.get(2)?,
                link_path: row.get(3)?,
                is_active: row.get(4)?,
                created_at: row.get(5)?,
            })
        })?
        .collect::<Result<Vec<_>, _>>()?;
    Ok(links)
}
```

- [x] **Step 3: Add `set_link_active` to `LinkService`**

Implementation outline:

```rust
pub fn set_link_active(db: &Database, skill_id: &str, tool_id: &str, active: bool) -> AppResult<Option<SkillLink>> {
    if active {
        let skill = SkillService::get_skill_by_id(db, skill_id)?
            .ok_or_else(|| AppError::NotFound(format!("skill {}", skill_id)))?;
        if !skill.is_enabled {
            return Err(AppError::Path(format!("skill {} is disabled", skill_id)));
        }
        let tool = ToolService::get_all_tools(db)?
            .into_iter()
            .find(|tool| tool.id == tool_id)
            .ok_or_else(|| AppError::NotFound(format!("tool {}", tool_id)))?;
        if !tool.is_enabled || !tool.is_detected {
            return Err(AppError::Path(format!("{} is not enabled or detected", tool.name)));
        }
        Self::create_link(db, &skill, &tool).map(Some)
    } else {
        Self::remove_link(db, skill_id, tool_id)?;
        Ok(None)
    }
}
```

- [x] **Step 4: Add Tauri commands**

Add to `src-tauri/src/commands/skill_commands.rs`:

```rust
#[tauri::command]
pub fn get_skill_links(
    db: State<std::sync::Mutex<Database>>,
    skill_id: String,
) -> Result<Vec<SkillLink>, String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    LinkService::get_links_for_skill(&db, &skill_id).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn set_skill_tool_link(
    db: State<std::sync::Mutex<Database>>,
    skill_id: String,
    tool_id: String,
    active: bool,
) -> Result<Option<SkillLink>, String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    LinkService::set_link_active(&db, &skill_id, &tool_id, active).map_err(|e| e.to_string())
}
```

Also import `SkillLink`.

- [x] **Step 5: Register commands**

Add to `src-tauri/src/lib.rs`:

```rust
commands::get_skill_links,
commands::set_skill_tool_link,
```

- [x] **Step 6: Verify Rust compile/tests**

Run:

```bash
cd src-tauri && cargo test
```

Expected: PASS.

## Task 2: Frontend API And Text

**Files:**
- Modify: `src/api/index.ts`
- Modify: `src/lib/i18n.ts`

- [x] **Step 1: Add API wrappers**

Add:

```ts
export const getSkillLinks = (skillId: string): Promise<SkillLink[]> => {
  return invoke('get_skill_links', { skillId });
};

export const setSkillToolLink = (
  skillId: string,
  toolId: string,
  active: boolean
): Promise<SkillLink | null> => {
  return invoke('set_skill_tool_link', { skillId, toolId, active });
};
```

- [x] **Step 2: Add English copy**

Add keys:

```ts
'mySkills.stats.links': 'tool links',
'mySkills.syncTargets': 'Sync targets',
'mySkills.openFolder': 'Open folder',
'mySkills.aria.openFolder': 'Open {name} folder',
'mySkills.aria.uninstall': 'Uninstall {name}',
'mySkills.links.more': '+{count}',
'mySkills.links.none': 'No links',
'mySkills.links.queued': '{name} queued',
'mySkills.sync.title': 'Sync {name}',
'mySkills.sync.subtitle': 'Choose which enabled tools should receive a symlink to this skill.',
'mySkills.sync.allTools': 'All tools',
'mySkills.sync.linked': 'Linked',
'mySkills.sync.unlinked': 'Unlinked',
'mySkills.sync.pinned': 'Pinned',
'mySkills.sync.searchTools': 'Search tools',
'mySkills.sync.pinnedTools': 'Pinned tools',
'mySkills.sync.otherTools': 'Other enabled tools',
'mySkills.sync.linkedCount': '{count} linked',
'mySkills.sync.totalTools': '{count} total',
'mySkills.sync.note': 'Changes create or remove symlinks only. The managed skill stays in Prot Skills.',
'mySkills.sync.save': 'Save links',
'mySkills.error.links': 'Failed to load tool links',
'mySkills.error.linkUpdate': 'Failed to update tool link',
'mySkills.error.openFolder': 'Failed to open folder',
'mySkills.toast.linked': 'Linked {skill} to {tool}',
'mySkills.toast.unlinked': 'Removed {tool} link',
```

- [x] **Step 3: Add Chinese copy**

Add semantically equivalent Chinese translations.

- [x] **Step 4: Run i18n tests**

Run:

```bash
pnpm test src/lib/i18n.test.ts
```

Expected: PASS.

## Task 3: My Skills UI Modal

**Files:**
- Modify: `src/pages/MySkillsPage.tsx`
- Modify: `src/pages/__tests__/MySkillsPage.test.tsx`

- [x] **Step 1: Read dirty test diff before editing**

Run:

```bash
git diff -- src/pages/__tests__/MySkillsPage.test.tsx
```

Expected: Understand and preserve existing user edits.

- [x] **Step 2: Write failing tests for row actions and modal**

Test cases:

```tsx
it('shows open folder, uninstall, and sync targets actions for each skill', async () => {
  vi.mocked(getSkills).mockResolvedValue([mockSkill]);
  vi.mocked(getTools).mockResolvedValue(mockTools);
  vi.mocked(getSkillLinks).mockResolvedValue([]);
  const { findByRole } = renderPage();
  expect(await findByRole('button', { name: 'Open Test Skill folder' })).toBeInTheDocument();
  expect(await findByRole('button', { name: 'Uninstall Test Skill' })).toBeInTheDocument();
  expect(await findByRole('button', { name: 'Sync targets for Test Skill' })).toBeInTheDocument();
});
```

```tsx
it('opens sync targets dialog and toggles a tool link optimistically', async () => {
  vi.mocked(getSkills).mockResolvedValue([mockSkill]);
  vi.mocked(getTools).mockResolvedValue(mockTools);
  vi.mocked(getSkillLinks).mockResolvedValue([{ id: 1, skill_id: 'skill-1', tool_id: 'claude', link_path: '/home/user/.claude/skills/skill-1', is_active: true, created_at: '2024-01-01' }]);
  vi.mocked(setSkillToolLink).mockResolvedValue(null);
  const user = userEvent.setup();
  const { findByRole } = renderPage();
  await user.click(await findByRole('button', { name: 'Sync targets for Test Skill' }));
  expect(await findByRole('dialog', { name: 'Sync Test Skill' })).toBeInTheDocument();
  const claude = await findByRole('switch', { name: 'Link Test Skill to Claude' });
  await user.click(claude);
  await waitFor(() => expect(setSkillToolLink).toHaveBeenCalledWith('skill-1', 'claude', false));
});
```

- [x] **Step 3: Run tests and verify failure**

Run:

```bash
pnpm test src/pages/__tests__/MySkillsPage.test.tsx
```

Expected: FAIL because new API mocks/UI do not exist yet.

- [x] **Step 4: Implement My Skills data state**

Add imports:

```ts
import { FolderOpen, Trash2, Search, RefreshCw } from 'lucide-react';
import { getSkills, getTools, getSkillLinks, setSkillToolLink, toggleSkill, uninstallSkill, openFolder } from '../api';
import type { AITool, Skill, SkillLink } from '../types';
```

Add state:

```ts
const [tools, setTools] = useState<AITool[]>([]);
const [linksBySkill, setLinksBySkill] = useState<Record<string, SkillLink[]>>({});
const [syncSkillId, setSyncSkillId] = useState<string | null>(null);
const [toolQuery, setToolQuery] = useState('');
const [linkFilter, setLinkFilter] = useState<'all' | 'linked' | 'unlinked' | 'pinned'>('all');
```

Update refresh to load skills/tools and links.

- [x] **Step 5: Implement row action cluster**

Use existing `IconButton` and `Button`:

```tsx
trailing={
  <span className="flex items-center gap-1">
    <IconButton icon={<FolderOpen size={16} />} aria-label={t('mySkills.aria.openFolder', { name: skill.name })} variant="subtle" size="sm" onClick={(e) => { e.stopPropagation(); handleOpenFolder(skill); }} />
    <IconButton icon={<Trash2 size={15} />} aria-label={t('mySkills.aria.uninstall', { name: skill.name })} variant="subtle" size="sm" className="text-danger hover:text-danger" onClick={(e) => { e.stopPropagation(); setSelectedId(skill.id); confirmUninstallFor(skill.id); }} />
    <Button size="sm" variant="secondary" onClick={(e) => { e.stopPropagation(); openSyncDialog(skill.id); }}>{t('mySkills.syncTargets')}</Button>
  </span>
}
```

Keep detail panel only if still useful, but do not make it the only place for open/uninstall.

- [x] **Step 6: Implement sync modal**

Render when `syncSkillId` is set. Use fixed overlay with role `dialog`, search field, filter pills, grouped enabled tools, switches, and footer buttons. The modal body should scroll.

- [x] **Step 7: Implement link toggle behavior**

Optimistically update `linksBySkill[skillId]`, call `setSkillToolLink`, rollback on error, and toast on failure.

- [x] **Step 8: Run component tests**

Run:

```bash
pnpm test src/pages/__tests__/MySkillsPage.test.tsx
```

Expected: PASS.

## Task 4: Full Verification

**Files:**
- No additional files unless verification reveals issues.

- [x] **Step 1: Run frontend tests**

Run:

```bash
pnpm test
```

Expected: PASS, allowing any pre-existing React `act(...)` warning already present in the suite.

- [x] **Step 2: Run frontend build**

Run:

```bash
pnpm build
```

Expected: PASS.

- [x] **Step 3: Run token check**

Run:

```bash
pnpm test:tokens
```

Expected: PASS.

- [x] **Step 4: Run Rust tests**

Run:

```bash
cd src-tauri && cargo test
```

Expected: PASS.

- [x] **Step 5: Manual UI QA**

Run:

```bash
pnpm tauri:dev
```

Expected: App starts. In My Skills, row actions are visible, Sync targets opens the modal, modal scrolls, open folder/uninstall controls remain visible, and no text overlaps.

