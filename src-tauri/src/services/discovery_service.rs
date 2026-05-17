use crate::db::Database;
use crate::models::LocalSkill;
use crate::services::SkillService;
use crate::utils::{is_in_manager_dir, is_symlink, resolve_symlink};
use std::collections::HashSet;
use std::fs;
use std::path::Path;

pub struct DiscoveryService;

impl DiscoveryService {
    /// Scan a directory for skills. For skills already managed in the DB,
    /// automatically replace the local copy with a symlink to the manager directory.
    pub fn scan_directory(dir_path: &Path, db: &Database) -> Vec<LocalSkill> {
        let mut skills = Vec::new();
        let mut visited = HashSet::new();

        if !dir_path.exists() {
            return skills;
        }

        let managed_skills = SkillService::get_all_skills(db).unwrap_or_default();

        if let Ok(entries) = fs::read_dir(dir_path) {
            for entry in entries.flatten() {
                let path = entry.path();

                if !path.is_dir() {
                    continue;
                }

                let name = path
                    .file_name()
                    .and_then(|n| n.to_str())
                    .unwrap_or("unknown")
                    .to_string();

                let skill_md = path.join("SKILL.md");
                if !skill_md.exists() {
                    continue;
                }

                // If it's already a symlink pointing to manager dir, skip
                if is_symlink(&path) {
                    if let Some(target) = resolve_symlink(&path) {
                        let canonical = target.canonicalize().ok();
                        if let Some(ref c) = canonical {
                            if visited.contains(c) {
                                continue;
                            }
                            visited.insert(c.clone());
                        }
                        if is_in_manager_dir(&target) {
                            continue; // Already a correct symlink, nothing to do
                        }
                    } else {
                        continue; // Broken symlink, skip
                    }
                }

                // Check if this skill is already managed in DB
                let managed = managed_skills
                    .iter()
                    .find(|s| s.name == name || s.id == name);

                if let Some(skill) = managed {
                    let managed_path = Path::new(&skill.local_path);
                    if managed_path.exists() {
                        // Remove the local copy and replace with symlink
                        if is_symlink(&path) {
                            fs::remove_file(&path).ok();
                        } else {
                            fs::remove_dir_all(&path).ok();
                        }

                        #[cfg(unix)]
                        {
                            std::os::unix::fs::symlink(managed_path, &path).ok();
                        }
                        #[cfg(windows)]
                        {
                            std::os::windows::fs::symlink_dir(managed_path, &path).ok();
                        }

                        continue; // Replaced, no need to return as unmanaged
                    }
                }

                // Unmanaged skill — return for display
                let (is_symlink_flag, target_path) = if is_symlink(&path) {
                    let target =
                        resolve_symlink(&path).map(|t| t.to_str().unwrap_or("").to_string());
                    (true, target)
                } else {
                    (false, None)
                };

                skills.push(LocalSkill {
                    name,
                    path: path.to_str().unwrap_or("").to_string(),
                    is_symlink: is_symlink_flag,
                    target_path,
                    tool_id: None,
                    tool_name: None,
                });
            }
        }

        skills
    }

    pub fn scan_multiple_directories(dirs: &[&Path], db: &Database) -> Vec<LocalSkill> {
        let mut all_skills = Vec::new();
        let mut seen_paths = HashSet::new();

        for dir in dirs {
            let skills = Self::scan_directory(dir, db);
            for skill in skills {
                let key = skill
                    .target_path
                    .clone()
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
