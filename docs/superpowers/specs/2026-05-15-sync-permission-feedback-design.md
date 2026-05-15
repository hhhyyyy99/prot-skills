# Sync Permission Feedback Design

## Summary

The current skill sync flow can report success even when one or more tool targets fail due to filesystem permissions or path issues. This creates a trust problem: the user clicks sync, sees little or no actionable feedback, and may still receive a success message.

This design changes sync feedback from a binary "request succeeded/request failed" model to a result-based model:

- All success: show success feedback.
- Partial success: show a clear mixed-result summary.
- All failed: show failure feedback.

The first version uses global toast or banner feedback only. It does not require row-level status or a dedicated result modal.

## Problem

Today, batch sync can swallow per-tool failures in the backend and still return control to the frontend as if the overall operation succeeded. The frontend then shows a success-style message even when one or more tools did not receive the skill link.

The main user-facing failure modes are:

- A tool directory exists but is not writable.
- A tool path is missing or invalid.
- A tool is enabled in the UI but not actually detectable at runtime.
- A conflict exists at the link target path.

The key issue is not that failures happen. The issue is that the product reports the wrong outcome.

## Goals

- Make sync feedback truthful and easy to understand.
- Ensure every sync action has immediate visible feedback.
- Distinguish full success, partial success, and full failure.
- Show which tools failed and why in short human-readable language.
- Preserve partial success when some tools sync correctly.

## Non-Goals

- No row-level persistent error state in this version.
- No modal or drawer for result details in this version.
- No preflight permission probe in this version.
- No raw filesystem error dumps in first-layer user feedback.

## User Experience

### Trigger

This design applies to skill sync actions that target one or more tools, including:

- "Sync to all tools"
- bulk link operations for a skill
- any future sync action that writes links across multiple tool targets

### Loading State

When the user clicks sync:

- Disable the sync control for the active action.
- Show a loading state immediately.
- Do not leave the action visually idle while work is in progress.

This prevents the "clicked but nothing happened" feeling.

### Result States

#### Full Success

Use success styling.

Example title:

- `Synced to 3 tools`

Chinese example:

- `已同步到 3 个工具`

#### Partial Success

Use info or warning styling, not success styling.

Example title:

- `Synced to 2 tools, 1 failed`

Chinese example:

- `已同步到 2 个工具，1 个失败`

Example descriptions:

- `Claude sync failed: No write permission`
- `Claude, Cursor sync failed`
- `Claude, Cursor and 3 more tools failed`

Chinese examples:

- `Claude 同步失败：没有写入权限`
- `Claude、Cursor 同步失败`
- `Claude、Cursor 等 3 个工具同步失败`

#### Full Failure

Use error styling.

Example title:

- `Sync failed. No tools were updated`

Chinese example:

- `同步失败，未能同步到任何工具`

Example description:

- `Claude sync failed: No write permission`

Chinese example:

- `Claude 同步失败：没有写入权限`

## Interaction Rules

- If `failureCount > 0`, never use a success-style visual treatment.
- Do not use neutral copy such as "sync completed" when failures occurred.
- The frontend must base messaging on returned business results, not on whether the command returned without throwing.
- Runtime or transport failures should still surface through normal error handling.

## Backend Contract

The current batch sync contract should stop treating "command returned" as equivalent to "all targets synced."

Instead, batch sync should return a structured result object.

### Proposed Result Shape

```ts
type SyncResultStatus = 'success' | 'partial' | 'failed';

interface SyncFailureItem {
  toolId: string;
  toolName: string;
  reasonCode:
    | 'permission_denied'
    | 'path_missing'
    | 'tool_disabled'
    | 'tool_not_detected'
    | 'link_conflict'
    | 'unknown';
  reason: string;
}

interface SyncSuccessItem {
  toolId: string;
  toolName: string;
}

interface SyncSkillTargetsResult {
  status: SyncResultStatus;
  successCount: number;
  failureCount: number;
  successTools: SyncSuccessItem[];
  failedTools: SyncFailureItem[];
}
```

### Contract Semantics

- `success`: at least one target was attempted and all attempted targets succeeded.
- `partial`: at least one target succeeded and at least one target failed.
- `failed`: all attempted targets failed, or no target could be updated.

### Error Handling Boundary

Two error channels must remain distinct:

- Transport/runtime failure
  Example: Tauri runtime unavailable, command invocation fails before business logic completes.
  This should still reject.

- Business result failure
  Example: one tool succeeded and another failed due to permissions.
  This should resolve with a structured result object.

This separation prevents the frontend from mistaking "command returned" for "everything worked."

## Backend Behavior Changes

### Current Risk

Per-tool failures in batch sync are currently ignored in some paths, which erases the difference between full success and partial success.

### Required Change

For each target tool in a sync operation:

1. Attempt the link or migration write.
2. If it succeeds, append to `successTools`.
3. If it fails, map the error into a `reasonCode` and short user-facing `reason`, then append to `failedTools`.
4. Continue processing remaining tools.
5. Return a final aggregate result.

The backend must not silently swallow per-tool failures without recording them in the response.

## Error Taxonomy

The backend should map low-level errors into stable reason codes and short user-facing text.

### Initial Reason Codes

- `permission_denied`
- `path_missing`
- `tool_disabled`
- `tool_not_detected`
- `link_conflict`
- `unknown`

### User-Facing Text

- `permission_denied`: `No write permission`
- `path_missing`: `Tool directory does not exist`
- `tool_disabled`: `Tool is disabled`
- `tool_not_detected`: `Tool is not detected`
- `link_conflict`: `Conflicting file exists at target location`
- `unknown`: `Unknown sync error`

Chinese suggestions:

- `permission_denied`: `没有写入权限`
- `path_missing`: `工具目录不存在`
- `tool_disabled`: `工具未启用`
- `tool_not_detected`: `工具未检测到`
- `link_conflict`: `目标位置存在冲突文件`
- `unknown`: `同步时发生未知错误`

Raw filesystem error details may still be logged, but they should not be the only message shown in first-layer UI feedback.

## Frontend Behavior Changes

The frontend should stop interpreting resolved promises as full success.

### Decision Rules

- `status === 'success'`
  Show success toast.

- `status === 'partial'`
  Show info or warning toast with a mixed-result summary.

- `status === 'failed'`
  Show error toast with the most helpful short failure summary available.

### Description Formatting

For the toast description:

- If one tool failed, show its name and reason.
- If two tools failed, list both names.
- If more than two tools failed, list the first one or two and summarize the rest.

This keeps the toast compact while still actionable.

## Edge Cases

### Single Target Sync

This contract still works when only one tool target is involved:

- one success -> `success`
- one failure -> `failed`

### Zero Eligible Targets

If a sync action is triggered with no eligible enabled and detected tools, return a clear failure-style outcome rather than a fake success. The frontend message should direct the user to detect or enable tools first.

### Partial Cleanup or Retry

If some links already exist and some fail, the result should still reflect the actual final state after the operation. A retry should reattempt only through the normal sync path; this design does not introduce a special retry surface.

## Testing

### Backend Tests

Add or update tests for:

- full success across multiple tools
- partial success when one tool returns a permission error
- full failure when all tool writes fail
- correct `reasonCode` mapping for common failure types
- correct `successCount` and `failureCount`
- no silent swallowing of per-tool link creation failures

### Frontend Tests

Add or update tests for:

- success toast when all targets sync
- info or warning toast when some targets fail
- error toast when all targets fail
- loading state appears immediately on sync click
- no success-style copy is shown when `failureCount > 0`
- failure descriptions include tool names and short reasons

## Rollout Plan

### Phase 1

- Change backend batch sync to return structured results.
- Update frontend toast logic to consume `status`, counts, and failed tool summaries.
- Add tests for full success, partial success, and full failure.

### Phase 2

- Add optional richer detail surfaces if needed, such as "View failed tools."
- Consider preflight checks for obviously unwritable paths.

## Recommendation

Implement the structured result contract first. This is the smallest change that fixes the trust issue without introducing extra UI complexity. Once results are truthful and stable, additional detail surfaces can be added safely.
