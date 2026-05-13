import { invoke } from '@tauri-apps/api/core';
import type { Skill, LocalSkill, AITool } from '../types';

// Skill APIs
export const getSkills = (): Promise<Skill[]> => {
  return invoke('get_skills');
};

export const installSkillFromLocal = (
  sourcePath: string,
  skillId: string,
  name: string
): Promise<Skill> => {
  return invoke('install_skill_from_local', {
    sourcePath,
    skillId,
    name,
  });
};

export const toggleSkill = (skillId: string, enabled: boolean): Promise<void> => {
  return invoke('toggle_skill', { skillId, enabled });
};

export const uninstallSkill = (skillId: string): Promise<void> => {
  return invoke('uninstall_skill', { skillId });
};

export const scanLocalSkills = (toolId: string): Promise<LocalSkill[]> => {
  return invoke('scan_local_skills', { toolId });
};

export const scanAllLocalSkills = (toolIds: string[]): Promise<LocalSkill[]> => {
  return invoke('scan_all_local_skills', { toolIds });
};

export const migrateLocalSkill = (
  sourcePath: string,
  skillId: string
): Promise<Skill> => {
  return invoke('migrate_local_skill', { sourcePath, skillId });
};

// Tool APIs
export const getTools = (): Promise<AITool[]> => {
  return invoke('get_tools');
};

export const detectTools = (): Promise<AITool[]> => {
  return invoke('detect_tools');
};

export const toggleTool = (toolId: string, enabled: boolean): Promise<void> => {
  return invoke('toggle_tool', { toolId, enabled });
};

export const updateToolPath = (toolId: string, customPath: string): Promise<void> => {
  return invoke('update_tool_path', { toolId, customPath });
};

export const addTool = (id: string, name: string, configPath: string): Promise<AITool> => {
  return invoke('add_tool', { id, name, configPath });
};

export const deleteTool = (toolId: string): Promise<void> => {
  return invoke('delete_tool', { toolId });
};

// Filesystem / path APIs
export const openFolder = (path: string): Promise<void> => {
  return invoke('open_folder', { path });
};

export const getSkillsDirPath = (): Promise<string> => {
  return invoke('get_skills_dir_path');
};
