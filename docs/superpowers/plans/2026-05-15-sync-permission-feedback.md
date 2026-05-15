# Sync Permission Feedback Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make bulk skill sync report truthful full-success, partial-success, and full-failure outcomes when one or more tool targets cannot be written.

**Architecture:** Add a structured sync-result model in the Tauri backend, return that model from the bulk sync command instead of a bare `SkillLink[]`, and refresh My Skills UI state from the backend after each bulk sync so toast copy reflects the real outcome. Keep single-tool link toggles unchanged; scope this plan to the "sync all targets for one skill" flow.

**Tech Stack:** Tauri commands in Rust, `serde` models, React + TypeScript, Vitest + Testing Library, Rust unit tests with `cargo test`

---

## File Map

- Create: `src-tauri/src/models/sync.rs`
  Responsibility: Serialize the backend bulk-sync result shape (`status`, counts, failures, successes) for Tauri.

- Modify: `src-tauri/src/models/mod.rs`
  Responsibility: Export the new sync result model.

- Modify: `src-tauri/src/services/link_service.rs`
  Responsibility: Aggregate per-tool link attempts into `success | partial | failed` instead of silently swallowing failures.

- Modify: `src-tauri/src/commands/skill_commands.rs`
  Responsibility: Return the structured bulk-sync result from `set_all_skill_tool_links`.

- Modify: `src/types/index.ts`
  Responsibility: Mirror the new bulk-sync result types for the frontend.

- Modify: `src/api/index.ts`
  Responsibility: Change `setAllSkillToolLinks()` to return the new result shape.

- Modify: `src/api/index.test.ts`
  Responsibility: Cover the updated API wrapper contract.

- Modify: `src/lib/i18n.ts`
  Responsibility: Add copy for bulk sync summary titles and failure descriptions in English and Simplified Chinese.

- Modify: `src/pages/MySkillsPage.tsx`
  Responsibility: Remove misleading bulk-sync success assumptions, add loading state for the bulk sync control, refresh links after completion, and choose toast variant/title/description from the returned result.

- Modify: `src/pages/__tests__/MySkillsPage.test.tsx`
  Responsibility: Verify loading, partial success, and full failure behavior for bulk sync.

## Task 1: Define and Test the Backend Bulk Sync Result

**Files:**
- Create: `src-tauri/src/models/sync.rs`
- Modify: `src-tauri/src/models/mod.rs`
- Modify: `src-tauri/src/services/link_service.rs`
- Test: `src-tauri/src/services/link_service.rs`

- [ ] **Step 1: Write the failing Rust tests for aggregate outcomes**

Add focused tests to `src-tauri/src/services/link_service.rs` that describe:

```rust
#[test]
fn bulk_link_returns_partial_when_one_tool_write_fails() {
    // one config path is a writable directory
    // one config path is a file, so create_dir_all(<file>/skills) fails
    // expect status == "partial", success_count == 1, failure_count == 1
}

#[test]
fn bulk_link_returns_failed_when_all_tool_writes_fail() {
    // both config paths are invalid for directory creation
    // expect status == "failed", success_count == 0, failure_count == 2
}
```

- [ ] **Step 2: Run the Rust tests to verify they fail**

Run:

```bash
cd src-tauri && cargo test link_service::tests::bulk_link_returns_partial_when_one_tool_write_fails
cd src-tauri && cargo test link_service::tests::bulk_link_returns_failed_when_all_tool_writes_fail
```

Expected:

```text
FAIL because the aggregate result type and service method do not exist yet
```

- [ ] **Step 3: Add the new serializable sync result model**

Create `src-tauri/src/models/sync.rs` with a minimal serializable shape:

```rust
use serde::Serialize;

#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum SyncResultStatus {
    Success,
    Partial,
    Failed,
}

#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
pub struct SyncFailureItem {
    pub tool_id: String,
    pub tool_name: String,
    pub reason_code: String,
    pub reason: String,
}

#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
pub struct SyncSuccessItem {
    pub tool_id: String,
    pub tool_name: String,
}

#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
pub struct SyncSkillTargetsResult {
    pub status: SyncResultStatus,
    pub success_count: usize,
    pub failure_count: usize,
    pub success_tools: Vec<SyncSuccessItem>,
    pub failed_tools: Vec<SyncFailureItem>,
}
```

Then export it from `src-tauri/src/models/mod.rs`.

- [ ] **Step 4: Implement aggregate bulk sync in `LinkService`**

In `src-tauri/src/services/link_service.rs`, add a new method instead of mutating the single-target API:

```rust
pub fn sync_all_detected_tool_links_result(
    db: &Database,
    skill_id: &str,
    active: bool,
) -> AppResult<SyncSkillTargetsResult>
```

Implementation notes:

- Reuse existing skill/tool lookup and gating logic.
- For `active == true`, iterate all detected + enabled tools.
- On each `create_link()` failure, record:

```rust
SyncFailureItem {
    tool_id: tool.id.clone(),
    tool_name: tool.name.clone(),
    reason_code: map_reason_code(&err),
    reason: map_reason_message(&err),
}
```

- On success, push:

```rust
SyncSuccessItem {
    tool_id: tool.id.clone(),
    tool_name: tool.name.clone(),
}
```

- For `active == false`, remove links for all detected + enabled tools and return `Success` when all removals finish without error.
- Derive final status from counts:

```rust
let status = match (success_count, failure_count) {
    (0, f) if f > 0 => SyncResultStatus::Failed,
    (s, f) if s > 0 && f > 0 => SyncResultStatus::Partial,
    _ => SyncResultStatus::Success,
};
```

- Keep the existing `set_all_detected_tool_links()` helper untouched for now if other call sites still need `Vec<SkillLink>`.

- [ ] **Step 5: Add lightweight error classification helpers**

Inside `link_service.rs`, add small helpers that map `AppError` to stable user-facing values:

```rust
fn map_reason_code(err: &AppError) -> &'static str
fn map_reason_message(err: &AppError) -> &'static str
```

Initial mapping:

- `AppError::Io` with `PermissionDenied` -> `permission_denied` / `No write permission`
- `AppError::Path` containing `does not exist` -> `path_missing` / `Tool directory does not exist`
- `AppError::Path` containing `disabled` -> `tool_disabled` / `Tool is disabled`
- `AppError::Path` containing `not detected` -> `tool_not_detected` / `Tool is not detected`
- fallback -> `unknown` / `Unknown sync error`

- [ ] **Step 6: Run the Rust tests again**

Run:

```bash
cd src-tauri && cargo test link_service::tests::bulk_link_returns_partial_when_one_tool_write_fails
cd src-tauri && cargo test link_service::tests::bulk_link_returns_failed_when_all_tool_writes_fail
cd src-tauri && cargo test link_service::tests::bulk_link_targets_all_detected_enabled_tools
```

Expected:

```text
PASS for new aggregate-result tests
PASS for existing bulk link regression test
```

- [ ] **Step 7: Commit the backend result-contract slice**

```bash
git add src-tauri/src/models/sync.rs src-tauri/src/models/mod.rs src-tauri/src/services/link_service.rs
git commit -m "feat(sync): add bulk sync result contract"
```

## Task 2: Bridge the Result Contract Through Tauri and TypeScript

**Files:**
- Modify: `src-tauri/src/commands/skill_commands.rs`
- Modify: `src/types/index.ts`
- Modify: `src/api/index.ts`
- Modify: `src/api/index.test.ts`

- [ ] **Step 1: Write the failing API wrapper test**

Extend `src/api/index.test.ts` with a new case:

```ts
it('calls set_all_skill_tool_links and returns the sync summary', async () => {
  (globalThis as { __TAURI_INTERNALS__?: { invoke: () => void } }).__TAURI_INTERNALS__ = {
    invoke: () => undefined,
  };
  vi.mocked(invoke).mockResolvedValueOnce({
    status: 'partial',
    success_count: 1,
    failure_count: 1,
    success_tools: [{ tool_id: 'cursor', tool_name: 'Cursor' }],
    failed_tools: [{ tool_id: 'claude', tool_name: 'Claude', reason_code: 'permission_denied', reason: 'No write permission' }],
  });

  await expect(setAllSkillToolLinks('skill-1', true)).resolves.toMatchObject({
    status: 'partial',
    failure_count: 1,
  });
  expect(invoke).toHaveBeenCalledWith('set_all_skill_tool_links', { skillId: 'skill-1', active: true });
});
```

- [ ] **Step 2: Run the API test to verify it fails**

Run:

```bash
pnpm test -- src/api/index.test.ts
```

Expected:

```text
FAIL because setAllSkillToolLinks() is still typed and returned as SkillLink[]
```

- [ ] **Step 3: Update the Tauri command return type**

In `src-tauri/src/commands/skill_commands.rs`, change:

```rust
pub fn set_all_skill_tool_links(...) -> Result<Vec<SkillLink>, String>
```

to:

```rust
pub fn set_all_skill_tool_links(...) -> Result<SyncSkillTargetsResult, String>
```

and return the new `LinkService::sync_all_detected_tool_links_result(...)`.

- [ ] **Step 4: Mirror the new result type in TypeScript**

Add the frontend types to `src/types/index.ts`:

```ts
export type SyncResultStatus = 'success' | 'partial' | 'failed';

export interface SyncSuccessItem {
  tool_id: string;
  tool_name: string;
}

export interface SyncFailureItem {
  tool_id: string;
  tool_name: string;
  reason_code:
    | 'permission_denied'
    | 'path_missing'
    | 'tool_disabled'
    | 'tool_not_detected'
    | 'link_conflict'
    | 'unknown';
  reason: string;
}

export interface SyncSkillTargetsResult {
  status: SyncResultStatus;
  success_count: number;
  failure_count: number;
  success_tools: SyncSuccessItem[];
  failed_tools: SyncFailureItem[];
}
```

Then update `src/api/index.ts`:

```ts
export const setAllSkillToolLinks = (
  skillId: string,
  active: boolean
): Promise<SyncSkillTargetsResult> => {
  return invoke('set_all_skill_tool_links', { skillId, active });
};
```

- [ ] **Step 5: Re-run the API wrapper test**

Run:

```bash
pnpm test -- src/api/index.test.ts
```

Expected:

```text
PASS with the new sync summary payload
```

- [ ] **Step 6: Commit the bridge layer**

```bash
git add src-tauri/src/commands/skill_commands.rs src/types/index.ts src/api/index.ts src/api/index.test.ts
git commit -m "feat(sync): return bulk sync summary to the frontend"
```

## Task 3: Update My Skills Bulk Sync UX and Frontend Tests

**Files:**
- Modify: `src/pages/MySkillsPage.tsx`
- Modify: `src/lib/i18n.ts`
- Modify: `src/pages/__tests__/MySkillsPage.test.tsx`

- [ ] **Step 1: Write the failing page tests for mixed outcomes**

Add tests to `src/pages/__tests__/MySkillsPage.test.tsx` covering:

```ts
it('shows a warning-style summary when sync all partially succeeds', async () => {
  vi.mocked(setAllSkillToolLinks).mockResolvedValue({
    status: 'partial',
    success_count: 1,
    failure_count: 1,
    success_tools: [{ tool_id: 'cursor', tool_name: 'Cursor' }],
    failed_tools: [{ tool_id: 'claude', tool_name: 'Claude', reason_code: 'permission_denied', reason: 'No write permission' }],
  });
  vi.mocked(getSkillLinks).mockResolvedValueOnce([]).mockResolvedValueOnce([mockLink]);
  // click sync-all switch
  // assert toast title "Linked to all enabled tools" is NOT used
  // assert partial-summary copy appears instead
});

it('shows an error summary when sync all fully fails', async () => {
  vi.mocked(setAllSkillToolLinks).mockResolvedValue({
    status: 'failed',
    success_count: 0,
    failure_count: 1,
    success_tools: [],
    failed_tools: [{ tool_id: 'claude', tool_name: 'Claude', reason_code: 'permission_denied', reason: 'No write permission' }],
  });
});

it('disables the sync-all switch while a bulk sync request is in flight', async () => {
  let resolveRequest!: (value: SyncSkillTargetsResult) => void;
  vi.mocked(setAllSkillToolLinks).mockImplementationOnce(
    () => new Promise(resolve => { resolveRequest = resolve; })
  );
  // click sync-all switch, assert disabled/loading state before resolve
});
```

- [ ] **Step 2: Run the page test file to verify the new cases fail**

Run:

```bash
pnpm test -- src/pages/__tests__/MySkillsPage.test.tsx
```

Expected:

```text
FAIL because MySkillsPage still assumes bulk sync returns SkillLink[] and always toasts success on resolve
```

- [ ] **Step 3: Add i18n keys for summary-driven bulk sync copy**

Add English and Simplified Chinese keys to `src/lib/i18n.ts`:

```ts
'mySkills.toast.syncAllSuccess': 'Synced to {count} tools',
'mySkills.toast.syncAllPartial': 'Synced to {success} tools, {fail} failed',
'mySkills.toast.syncAllFailed': 'Sync failed. No tools were updated',
'mySkills.toast.syncFailureSingle': '{tool} sync failed: {reason}',
'mySkills.toast.syncFailurePair': '{first}, {second} sync failed',
'mySkills.toast.syncFailureMany': '{first}, {second} and {count} more tools failed',
```

Chinese:

```ts
'mySkills.toast.syncAllSuccess': '已同步到 {count} 个工具',
'mySkills.toast.syncAllPartial': '已同步到 {success} 个工具，{fail} 个失败',
'mySkills.toast.syncAllFailed': '同步失败，未能同步到任何工具',
'mySkills.toast.syncFailureSingle': '{tool} 同步失败：{reason}',
'mySkills.toast.syncFailurePair': '{first}、{second} 同步失败',
'mySkills.toast.syncFailureMany': '{first}、{second} 等 {count} 个工具同步失败',
```

- [ ] **Step 4: Replace optimistic bulk-sync success logic in `MySkillsPage`**

Refactor `setAllToolLinks()` in `src/pages/MySkillsPage.tsx`:

- Add local state for the in-flight bulk sync, for example:

```ts
const [syncingAllSkillId, setSyncingAllSkillId] = useState<string | null>(null);
```

- Stop pre-filling `linksBySkill` with optimistic "all linked" state for the bulk action.
- During the request:

```ts
setSyncingAllSkillId(skill.id);
```

- After resolve, always refresh the real links:

```ts
const result = await setAllSkillToolLinks(skill.id, active);
const refreshedLinks = await getSkillLinks(skill.id);
setLinksBySkill(current => ({ ...current, [skill.id]: refreshedLinks }));
```

- Derive the toast from `result.status`:

```ts
const variant =
  result.status === 'success' ? 'success' :
  result.status === 'partial' ? 'warning' :
  'error';
```

- Use a small formatter inside the page to produce the description from `failed_tools`.
- On rejection, keep the existing `mySkills.error.linkUpdate` path.
- In `finally`, clear `syncingAllSkillId`.

- [ ] **Step 5: Wire the loading state into the bulk sync switch**

Update the row-level sync-all switch props so the user gets instant feedback:

```tsx
<Switch
  checked={isLinkedToAllEnabledTools(skill.id)}
  onChange={(v) => setAllToolLinks(skill, v)}
  disabled={syncingAllSkillId === skill.id || enabledTools.length === 0}
  aria-label={t('mySkills.aria.syncAllTargets', { name: skill.name })}
/>
```

If the current switch component cannot visually show progress, keep the disabled state and rely on the global toast for completion. Do not invent a new visual surface in this slice.

- [ ] **Step 6: Re-run the page tests**

Run:

```bash
pnpm test -- src/pages/__tests__/MySkillsPage.test.tsx
```

Expected:

```text
PASS for partial success, full failure, and in-flight disabling
```

- [ ] **Step 7: Commit the UX slice**

```bash
git add src/lib/i18n.ts src/pages/MySkillsPage.tsx src/pages/__tests__/MySkillsPage.test.tsx
git commit -m "fix(my-skills): report partial sync failures"
```

## Task 4: Run Full Verification and Prepare the Handoff

**Files:**
- Modify: none expected
- Test: `src/api/index.test.ts`
- Test: `src/pages/__tests__/MySkillsPage.test.tsx`
- Test: `src-tauri/src/services/link_service.rs`

- [ ] **Step 1: Run the focused frontend tests together**

Run:

```bash
pnpm test -- src/api/index.test.ts src/pages/__tests__/MySkillsPage.test.tsx
```

Expected:

```text
PASS for API bridge and My Skills bulk-sync feedback cases
```

- [ ] **Step 2: Run the focused Rust tests together**

Run:

```bash
cd src-tauri && cargo test link_service::tests
```

Expected:

```text
PASS for aggregate-result tests and existing link-service regressions
```

- [ ] **Step 3: Run a build-level frontend verification**

Run:

```bash
pnpm build
```

Expected:

```text
PASS with updated TS types and no unresolved return-type mismatches
```

- [ ] **Step 4: Review the final diff before shipping**

Run:

```bash
git diff --stat HEAD~3..HEAD
git diff -- src-tauri/src/services/link_service.rs src-tauri/src/commands/skill_commands.rs src/pages/MySkillsPage.tsx src/lib/i18n.ts
```

Expected:

```text
Only the planned backend contract, TS bridge, i18n copy, and My Skills UX changes appear
```

- [ ] **Step 5: Commit any final verification-only follow-ups**

```bash
git add src-tauri/src/services/link_service.rs src-tauri/src/commands/skill_commands.rs src/types/index.ts src/api/index.ts src/api/index.test.ts src/lib/i18n.ts src/pages/MySkillsPage.tsx src/pages/__tests__/MySkillsPage.test.tsx
git commit -m "test(sync): verify bulk sync feedback flow"
```

Only do this commit if verification uncovered a real follow-up fix. If no code changed after verification, skip this step.

## Notes for the Implementer

- Do not expand scope into migration-row status, modals, or preflight permission checks.
- Keep single-target `setSkillToolLink()` behavior as-is unless the new backend contract reveals a blocker.
- Prefer refreshing `getSkillLinks(skill.id)` after bulk sync over maintaining a complex optimistic state for partial outcomes.
- If `active == false` produces tricky edge cases, keep the result contract truthful even if the common case stays `success`.
