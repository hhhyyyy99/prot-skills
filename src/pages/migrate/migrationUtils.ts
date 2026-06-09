import type { LifecycleIssue, LifecycleReport } from "@/types";

const SOURCE_ACTION_TYPES = new Set([
  "copy_to_managed",
  "reuse_managed_copy",
  "replace_managed_with_newer_local",
  "replace_original_with_symlink",
]);
const SYNC_ACTION_TYPE = "sync_tool_link";

export type MigrationOutcome =
  | { type: "source-completed"; syncIssues: LifecycleIssue[] }
  | { type: "source-failed"; failures: LifecycleIssue[] }
  | { type: "blocked"; failures: LifecycleIssue[] };

export interface SyncIssueItem {
  key: string;
  issue: LifecycleIssue;
}

export function getFailureDescription(failures: LifecycleIssue[]) {
  if (failures.length === 0) return undefined;
  return failures
    .slice(0, 3)
    .map((failure) => failure.message)
    .join("; ");
}

export function getSyncIssueKey(issue: LifecycleIssue) {
  return `${issue.tool_id ?? issue.tool_name ?? ""}:${issue.message}`;
}

export function dedupeSyncIssues(issues: LifecycleIssue[]) {
  const seen = new Set<string>();
  return issues.filter((issue) => {
    const key = getSyncIssueKey(issue);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function listSyncIssues(issues: LifecycleIssue[]) {
  const seen = new Map<string, number>();
  return issues.map((issue): SyncIssueItem => {
    const baseKey = `${getSyncIssueKey(issue)}:${issue.path ?? issue.target_path ?? ""}`;
    const occurrence = (seen.get(baseKey) ?? 0) + 1;
    seen.set(baseKey, occurrence);
    return { key: `${baseKey}:${occurrence}`, issue };
  });
}

export function classifyMigrationReport(report: LifecycleReport): MigrationOutcome {
  if (report.status === "blocked") {
    return { type: "blocked", failures: report.failures };
  }

  if (report.status === "success") {
    return { type: "source-completed", syncIssues: [] };
  }

  const failedActions = report.actions.filter((action) => action.status === "failed");
  const completedSourceAction = report.actions.some(
    (action) => SOURCE_ACTION_TYPES.has(action.action_type) && action.status === "completed",
  );
  const failedSourceOrUnknownAction = failedActions.some(
    (action) => action.action_type !== SYNC_ACTION_TYPE,
  );

  if (completedSourceAction && !failedSourceOrUnknownAction) {
    return { type: "source-completed", syncIssues: report.failures };
  }

  return { type: "source-failed", failures: report.failures };
}
