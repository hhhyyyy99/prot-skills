use crate::db::Database;
use crate::models::{LocalSkill, LocalSkillScanWarning};
use crate::services::skill_service::read_skill_metadata;
use crate::services::SkillService;
use crate::utils::{is_in_manager_dir, is_symlink, resolve_symlink};
use std::collections::HashSet;
use std::fs;
use std::path::Path;

pub struct DiscoveryService;

impl DiscoveryService {
    /// Scan a directory for skills without mutating the scanned filesystem.
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

                let path_is_symlink = is_symlink(&path);

                if !path.is_dir() && !path_is_symlink {
                    continue;
                }

                let name = path
                    .file_name()
                    .and_then(|n| n.to_str())
                    .unwrap_or("unknown")
                    .to_string();

                let mut scan_warnings = Vec::new();

                // If it's already a symlink pointing to manager dir, skip
                if path_is_symlink {
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
                        if canonical.is_none() {
                            scan_warnings.push(LocalSkillScanWarning {
                                code: "broken_symlink".to_string(),
                                message: "Skill symlink target cannot be resolved".to_string(),
                                path: path.to_string_lossy().into_owned(),
                                target_path: Some(target.to_string_lossy().into_owned()),
                            });
                        }
                    } else {
                        scan_warnings.push(LocalSkillScanWarning {
                            code: "broken_symlink".to_string(),
                            message: "Skill symlink target cannot be resolved".to_string(),
                            path: path.to_string_lossy().into_owned(),
                            target_path: None,
                        });
                    }
                }

                let skill_md = path.join("SKILL.md");
                if !skill_md.exists() && scan_warnings.is_empty() {
                    continue;
                }

                // Check if this skill is already managed in DB
                let managed = managed_skills
                    .iter()
                    .find(|s| s.name == name || s.id == name);

                if let Some(skill) = managed {
                    let managed_path = Path::new(&skill.local_path);
                    if managed_path.exists() {
                        scan_warnings.push(LocalSkillScanWarning {
                            code: "already_managed".to_string(),
                            message: "A managed Skill with this name or ID already exists"
                                .to_string(),
                            path: path.to_string_lossy().into_owned(),
                            target_path: Some(skill.local_path.clone()),
                        });
                    }
                }

                // Unmanaged skill — return for display
                let (is_symlink_flag, target_path) = if path_is_symlink {
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
                    scan_warnings,
                    tool_id: None,
                    tool_name: None,
                    metadata: Some(read_skill_metadata(&path)),
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

#[cfg(test)]
mod tests {
    use super::DiscoveryService;
    use crate::db::Database;
    use crate::services::SkillService;
    use crate::utils::is_symlink;
    use std::fs;
    use std::time::{SystemTime, UNIX_EPOCH};

    fn unique_test_dir(name: &str) -> std::path::PathBuf {
        let nonce = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .expect("system time before Unix epoch")
            .as_nanos();
        std::env::temp_dir().join(format!("prot-skills-{name}-{nonce}"))
    }

    #[test]
    fn scan_reports_managed_duplicate_without_replacing_local_folder() {
        let root = unique_test_dir("scan-read-only-managed");
        fs::create_dir_all(&root).expect("create test root");
        let db = Database::new(root.join("metadata.db")).expect("create test database");
        let source = root.join("source-alpha");
        let managed_dir = root.join("managed");
        let tool_skills = root.join("tool").join("skills");
        let local_alpha = tool_skills.join("alpha");

        fs::create_dir_all(&source).expect("create source skill");
        fs::write(source.join("SKILL.md"), "---\nname: Alpha\n---\n").expect("write source skill");
        fs::create_dir_all(&local_alpha).expect("create local alpha");
        fs::write(
            local_alpha.join("SKILL.md"),
            "---\nname: Alpha local\n---\n",
        )
        .expect("write local skill");

        SkillService::install_skill_into_dir(
            &db,
            "alpha",
            "alpha",
            "local",
            None,
            &source,
            &managed_dir,
        )
        .expect("install managed skill");

        let skills = DiscoveryService::scan_directory(&tool_skills, &db);

        assert_eq!(skills.len(), 1);
        assert_eq!(skills[0].name, "alpha");
        assert_eq!(skills[0].scan_warnings.len(), 1);
        assert_eq!(skills[0].scan_warnings[0].code, "already_managed");
        assert!(local_alpha.is_dir());
        assert!(!is_symlink(&local_alpha));
        assert!(local_alpha.join("SKILL.md").exists());

        fs::remove_dir_all(root).ok();
    }

    #[cfg(unix)]
    #[test]
    fn scan_reports_broken_symlink_without_removing_it() {
        let root = unique_test_dir("scan-read-only-broken-symlink");
        fs::create_dir_all(&root).expect("create test root");
        let db = Database::new(root.join("metadata.db")).expect("create test database");
        let tool_skills = root.join("tool").join("skills");
        let broken = tool_skills.join("broken");
        fs::create_dir_all(&tool_skills).expect("create tool skills dir");
        std::os::unix::fs::symlink(root.join("missing-target"), &broken)
            .expect("create broken symlink");

        let skills = DiscoveryService::scan_directory(&tool_skills, &db);

        assert_eq!(skills.len(), 1);
        assert_eq!(skills[0].name, "broken");
        assert!(skills[0].is_symlink);
        assert_eq!(skills[0].scan_warnings.len(), 1);
        assert_eq!(skills[0].scan_warnings[0].code, "broken_symlink");
        assert!(is_symlink(&broken));

        fs::remove_dir_all(root).ok();
    }
}
