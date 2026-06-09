import type { SyncFailureItem } from "@/types";

export type TFunction = (key: string, params?: Record<string, string | number>) => string;

export interface BulkSyncFailureItem {
  skillName: string;
  toolName: string;
  reason: string;
}

const LOCAL_SOURCE = "local";
const FAILURE_PREVIEW_LIMIT = 3;

export function isLocalSource(sourceType: string) {
  return sourceType.trim().toLowerCase() === LOCAL_SOURCE;
}

export function buildSyncFailureDescription(failures: SyncFailureItem[], t: TFunction) {
  if (failures.length === 0) return undefined;

  const visibleFailures = failures.slice(0, FAILURE_PREVIEW_LIMIT);
  const items = visibleFailures
    .map((failure) => `${failure.tool_name} (${failure.reason})`)
    .join(", ");
  const extraCount = failures.length - visibleFailures.length;
  const more = extraCount > 0 ? t("mySkills.toast.syncFailuresMore", { count: extraCount }) : "";

  return t("mySkills.toast.syncFailures", { items, more });
}

export function buildBulkSyncFailureDescription(failures: BulkSyncFailureItem[], t: TFunction) {
  if (failures.length === 0) return undefined;

  const visibleFailures = failures.slice(0, FAILURE_PREVIEW_LIMIT);
  const items = visibleFailures
    .map((failure) => `${failure.skillName} -> ${failure.toolName} (${failure.reason})`)
    .join(", ");
  const extraCount = failures.length - visibleFailures.length;
  const more = extraCount > 0 ? t("mySkills.toast.syncFailuresMore", { count: extraCount }) : "";

  return t("mySkills.toast.syncFailures", { items, more });
}
