import type { LifecycleIssue, LocalSkill } from "@/types";

export const ALL_TOOLS_FILTER = "__all__";

export type ScanFilter = string;
export type MigrationRowStatus = "idle" | "success" | "error";

export interface ScanResult {
  toolId: string;
  toolName: string;
  skills: LocalSkill[];
  error?: string;
}

export interface MigrationProgress {
  done: number;
  total: number;
  currentSkillName?: string;
}

export interface MigrationBatchSummary {
  success: number;
  fail: number;
  skipped: number;
  syncIssues: LifecycleIssue[];
}
