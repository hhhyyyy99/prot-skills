export interface Skill {
  id: string;
  name: string;
  source_type: string;
  source_url?: string;
  local_path: string;
  installed_at: string;
  updated_at: string;
  is_enabled: boolean;
  metadata?: SkillMetadata;
}

export interface SkillMetadata {
  author?: string;
  description?: string;
  tags: string[];
  version?: string;
}

export interface LocalSkill {
  name: string;
  path: string;
  is_symlink: boolean;
  target_path?: string;
  tool_id?: string;
  tool_name?: string;
}

export interface AITool {
  id: string;
  name: string;
  config_path: string;
  skills_subdir: string;
  is_detected: boolean;
  is_enabled: boolean;
  detected_at?: string;
  custom_path?: string;
}

export interface SkillLink {
  id: number;
  skill_id: string;
  tool_id: string;
  link_path: string;
  is_active: boolean;
  created_at: string;
}

export type SyncResultStatus = "success" | "partial" | "failed";

export interface SyncSuccessItem {
  tool_id: string;
  tool_name: string;
}

export interface SyncFailureItem {
  tool_id: string;
  tool_name: string;
  reason_code: string;
  reason: string;
}

export interface SyncSkillTargetsResult {
  status: SyncResultStatus;
  success_count: number;
  failure_count: number;
  success_tools: SyncSuccessItem[];
  failed_tools: SyncFailureItem[];
}
