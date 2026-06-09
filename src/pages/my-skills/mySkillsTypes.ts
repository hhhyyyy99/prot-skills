export type LinkFilter = "all" | "linked" | "unlinked";

export interface BulkSyncProgress {
  done: number;
  total: number;
  currentSkillName?: string;
}

export interface BulkSyncSummary {
  success: number;
  fail: number;
  failureDescription?: string;
}
