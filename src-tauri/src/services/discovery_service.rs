use crate::models::LocalSkill;
use crate::utils::{is_in_manager_dir, is_symlink, resolve_symlink};
use std::collections::HashSet;
use std::fs;
use std::path::Path;

pub struct DiscoveryService;

impl DiscoveryService {
    pub fn scan_directory(dir_path: &Path) -> Vec<LocalSkill> {
        let mut skills = Vec::new();
        let mut visited = HashSet::new();

        if !dir_path.exists() {
            return skills;
        }

        if let Ok(entries) = fs::read_dir(dir_path) {
            for entry in entries.flatten() {
                let path = entry.path();
                
                if !path.is_dir() {
                    continue;
                }

                let name = path.file_name()
                    .and_then(|n| n.to_str())
                    .unwrap_or("unknown")
                    .to_string();

                // Check if it has SKILL.md
                let skill_md = path.join("SKILL.md");
                if !skill_md.exists() {
                    continue;
                }

                // Check if it's a symlink
                let (is_symlink_flag, target_path) = if is_symlink(&path) {
                    if let Some(target) = resolve_symlink(&path) {
                        // Check for circular links
                        let canonical = target.canonicalize().ok();
                        if let Some(ref c) = canonical {
                            if visited.contains(c) {
                                continue; // Circular link, skip
                            }
                            visited.insert(c.clone());
                        }

                        // Check if already in manager dir
                        if is_in_manager_dir(&target) {
                            // Already managed, skip
                            continue;
                        }

                        (true, Some(target.to_str().unwrap_or("").to_string()))
                    } else {
                        (true, None) // Broken symlink
                    }
                } else {
                    (false, None)
                };

                skills.push(LocalSkill {
                    name,
                    path: path.to_str().unwrap_or("").to_string(),
                    is_symlink: is_symlink_flag,
                    target_path,
                });
            }
        }

        skills
    }

    pub fn scan_multiple_directories(dirs: &[&Path]) -> Vec<LocalSkill> {
        let mut all_skills = Vec::new();
        let mut seen_paths = HashSet::new();

        for dir in dirs {
            let skills = Self::scan_directory(dir);
            for skill in skills {
                // Deduplicate by resolved path
                let key = skill.target_path.clone()
                    .unwrap_or_else(|| skill.path.clone());
                
                if !seen_paths.contains(&key) {
                    seen_paths.insert(key);
                    all_skills.push(skill);
                }
            }
        }

        all_skills
    }
}
