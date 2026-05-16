import type { Skill } from "../types/index";

export type SourceFilter = "all" | string;

export function filterSkills(list: readonly Skill[], q: string, source: SourceFilter): Skill[] {
  return list.filter((skill) => {
    if (source !== "all" && skill.source_type !== source) return false;
    if (!q) return true;
    const lower = q.toLowerCase();
    return (
      skill.name.toLowerCase().includes(lower) ||
      (skill.metadata?.author?.toLowerCase().includes(lower) ?? false) ||
      (skill.metadata?.description?.toLowerCase().includes(lower) ?? false)
    );
  });
}
