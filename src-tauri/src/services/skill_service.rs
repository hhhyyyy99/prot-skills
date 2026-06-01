use crate::db::Database;
use crate::models::{
    LifecycleAction, LifecycleActionStatus, LifecycleIssue, LifecycleReport, MigrationPreflight,
    Skill, SkillMetadata,
};
use crate::utils::get_skills_dir;
use rusqlite::{params, Result};
use std::cmp::Ordering;
use std::fs;
use std::path::Path;

pub struct SkillService;

impl SkillService {
    pub fn prune_missing_skills(db: &Database) -> Result<usize> {
        let stale_skill_ids = Self::get_all_skills(db)?
            .into_iter()
            .filter(|skill| {
                let skill_path = Path::new(&skill.local_path);
                !skill_path.exists() || !skill_path.join("SKILL.md").exists()
            })
            .map(|skill| skill.id)
            .collect::<Vec<_>>();

        if stale_skill_ids.is_empty() {
            return Ok(0);
        }

        let conn = db.get_connection();
        for skill_id in &stale_skill_ids {
            conn.execute("DELETE FROM skill_links WHERE skill_id = ?1", [skill_id])?;
            conn.execute("DELETE FROM skills WHERE id = ?1", [skill_id])?;
        }

        Ok(stale_skill_ids.len())
    }

    pub fn register_existing_skills(db: &Database, skills_dir: &Path) -> Result<usize> {
        if !skills_dir.exists() {
            return Ok(0);
        }

        let conn = db.get_connection();
        let mut registered = 0;

        if let Ok(entries) = fs::read_dir(skills_dir) {
            for entry in entries.flatten() {
                let path = entry.path();

                if !path.is_dir() || !path.join("SKILL.md").exists() {
                    continue;
                }

                let Some(skill_id) = path.file_name().and_then(|n| n.to_str()) else {
                    continue;
                };

                let inserted = conn.execute(
                    "INSERT OR IGNORE INTO skills (id, name, source_type, source_url, local_path, metadata)
                     VALUES (?1, ?2, 'local', NULL, ?3, ?4)",
                    params![
                        skill_id,
                        skill_id,
                        path.to_string_lossy().into_owned(),
                        serde_json::to_string(&read_skill_metadata(&path)).unwrap(),
                    ],
                )?;

                registered += inserted;
            }
        }

        Ok(registered)
    }

    pub fn get_all_skills(db: &Database) -> Result<Vec<Skill>> {
        let conn = db.get_connection();
        let mut stmt = conn.prepare(
            "SELECT id, name, source_type, source_url, local_path, 
                    installed_at, updated_at, is_enabled, metadata 
             FROM skills ORDER BY installed_at DESC",
        )?;

        let skills = stmt.query_map([], |row| {
            let metadata_str: Option<String> = row.get(8)?;
            let metadata = metadata_str.and_then(|s| serde_json::from_str(&s).ok());

            Ok(Skill {
                id: row.get(0)?,
                name: row.get(1)?,
                source_type: row.get(2)?,
                source_url: row.get(3)?,
                local_path: row.get(4)?,
                installed_at: row.get(5)?,
                updated_at: row.get(6)?,
                is_enabled: row.get(7)?,
                metadata,
            })
        })?;

        skills.collect()
    }

    pub fn install_skill(
        db: &Database,
        skill_id: &str,
        name: &str,
        source_type: &str,
        source_url: Option<&str>,
        source_path: &Path,
    ) -> Result<Skill> {
        let skills_dir = get_skills_dir();
        Self::install_skill_into_dir(
            db,
            skill_id,
            name,
            source_type,
            source_url,
            source_path,
            &skills_dir,
        )
    }

    pub fn install_skill_into_dir(
        db: &Database,
        skill_id: &str,
        name: &str,
        source_type: &str,
        source_url: Option<&str>,
        source_path: &Path,
        skills_dir: &Path,
    ) -> Result<Skill> {
        let target_path = skills_dir.join(skill_id);
        let conn = db.get_connection();
        let existing_count = conn.query_row(
            "SELECT COUNT(*) FROM skills WHERE id = ?1",
            [skill_id],
            |row| row.get::<_, i64>(0),
        )?;
        if existing_count > 0 {
            return Err(rusqlite::Error::ToSqlConversionFailure(Box::new(
                std::io::Error::new(
                    std::io::ErrorKind::AlreadyExists,
                    format!("Skill ID already exists: {}", skill_id),
                ),
            )));
        }

        // Create skills directory if not exists
        fs::create_dir_all(&skills_dir)
            .map_err(|e| rusqlite::Error::ToSqlConversionFailure(Box::new(e)))?;

        // Copy skill folder to manager directory
        copy_dir_all(source_path, &target_path)
            .map_err(|e| rusqlite::Error::ToSqlConversionFailure(Box::new(e)))?;

        let metadata = read_skill_metadata(source_path);

        conn.execute(
            "INSERT INTO skills (id, name, source_type, source_url, local_path, metadata)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
            [
                skill_id,
                name,
                source_type,
                source_url.unwrap_or(""),
                target_path.to_str().unwrap(),
                &serde_json::to_string(&metadata)
                    .map_err(|e| rusqlite::Error::ToSqlConversionFailure(Box::new(e)))?,
            ],
        )?;

        Self::get_skill_by_id(db, skill_id)?.ok_or(rusqlite::Error::QueryReturnedNoRows)
    }

    pub fn replace_managed_skill_contents(
        db: &Database,
        skill_id: &str,
        source_path: &Path,
    ) -> Result<Skill> {
        let Some(existing) = Self::get_skill_by_id(db, skill_id)? else {
            return Err(rusqlite::Error::QueryReturnedNoRows);
        };

        let managed_path = Path::new(&existing.local_path);
        let parent = managed_path.parent().ok_or_else(|| {
            rusqlite::Error::ToSqlConversionFailure(Box::new(std::io::Error::new(
                std::io::ErrorKind::InvalidInput,
                format!("Cannot determine parent for {}", managed_path.display()),
            )))
        })?;
        let tmp_path = parent.join(format!(".{}.prot-skills-replace-tmp", skill_id));
        let backup_path = parent.join(format!(".{}.prot-skills-replace-backup", skill_id));

        remove_path_if_exists(&tmp_path)
            .map_err(|e| rusqlite::Error::ToSqlConversionFailure(Box::new(e)))?;
        remove_path_if_exists(&backup_path)
            .map_err(|e| rusqlite::Error::ToSqlConversionFailure(Box::new(e)))?;
        copy_dir_all(source_path, &tmp_path)
            .map_err(|e| rusqlite::Error::ToSqlConversionFailure(Box::new(e)))?;

        if !tmp_path.join("SKILL.md").exists() {
            remove_path_if_exists(&tmp_path).ok();
            return Err(rusqlite::Error::ToSqlConversionFailure(Box::new(
                std::io::Error::new(
                    std::io::ErrorKind::InvalidInput,
                    format!(
                        "Source path does not contain SKILL.md: {}",
                        source_path.display()
                    ),
                ),
            )));
        }

        if managed_path.exists() {
            fs::rename(managed_path, &backup_path)
                .map_err(|e| rusqlite::Error::ToSqlConversionFailure(Box::new(e)))?;
        }

        if let Err(error) = fs::rename(&tmp_path, managed_path) {
            if backup_path.exists() {
                let _ = fs::rename(&backup_path, managed_path);
            }
            return Err(rusqlite::Error::ToSqlConversionFailure(Box::new(error)));
        }

        remove_path_if_exists(&backup_path)
            .map_err(|e| rusqlite::Error::ToSqlConversionFailure(Box::new(e)))?;

        let metadata = read_skill_metadata(source_path);
        let conn = db.get_connection();
        conn.execute(
            "UPDATE skills SET metadata = ?1, updated_at = CURRENT_TIMESTAMP WHERE id = ?2",
            params![
                serde_json::to_string(&metadata)
                    .map_err(|e| rusqlite::Error::ToSqlConversionFailure(Box::new(e)))?,
                skill_id
            ],
        )?;

        Self::get_skill_by_id(db, skill_id)?.ok_or(rusqlite::Error::QueryReturnedNoRows)
    }

    pub fn preflight_migration(
        db: &Database,
        skill_id: &str,
        source_path: &Path,
        skills_dir: &Path,
    ) -> Result<MigrationPreflight> {
        let managed_target = skills_dir.join(skill_id);
        let source_path_str = source_path.to_string_lossy().into_owned();
        let managed_target_str = managed_target.to_string_lossy().into_owned();
        let existing_skill = Self::get_skill_by_id(db, skill_id)?;
        let existing_version = existing_skill
            .as_ref()
            .and_then(|skill| skill.metadata.as_ref())
            .and_then(|metadata| metadata.version.clone())
            .or_else(|| {
                existing_skill
                    .as_ref()
                    .and_then(|skill| read_skill_version(Path::new(&skill.local_path)))
            });
        let source_version = read_skill_version(source_path);
        let duplicate_version_order = match (&source_version, &existing_version) {
            (Some(source), Some(existing)) => compare_skill_versions(source, existing),
            _ => None,
        };
        let duplicate_contents_match = existing_skill.as_ref().is_some_and(|skill| {
            skill_directories_match(source_path, Path::new(&skill.local_path)).unwrap_or(false)
        });

        let mut actions = vec![
            LifecycleAction {
                action_type: "copy_to_managed".to_string(),
                status: if existing_skill.is_some() {
                    LifecycleActionStatus::Skipped
                } else {
                    LifecycleActionStatus::Planned
                },
                path: Some(source_path_str.clone()),
                target_path: Some(managed_target_str.clone()),
                skill_id: Some(skill_id.to_string()),
                skill_name: None,
                tool_id: None,
                tool_name: None,
            },
            LifecycleAction {
                action_type: "replace_original_with_symlink".to_string(),
                status: LifecycleActionStatus::Planned,
                path: Some(source_path_str.clone()),
                target_path: Some(managed_target_str.clone()),
                skill_id: Some(skill_id.to_string()),
                skill_name: None,
                tool_id: None,
                tool_name: None,
            },
        ];
        let mut warnings = Vec::new();
        let mut failures = Vec::new();

        if !source_path.exists() {
            failures.push(LifecycleIssue {
                code: "path_missing".to_string(),
                message: format!("Source path does not exist: {}", source_path.display()),
                path: Some(source_path_str.clone()),
                target_path: None,
                skill_id: Some(skill_id.to_string()),
                skill_name: None,
                tool_id: None,
                tool_name: None,
            });
        } else if !source_path.join("SKILL.md").exists() {
            failures.push(LifecycleIssue {
                code: "invalid_skill".to_string(),
                message: format!(
                    "Source path does not contain SKILL.md: {}",
                    source_path.display()
                ),
                path: Some(source_path_str.clone()),
                target_path: None,
                skill_id: Some(skill_id.to_string()),
                skill_name: None,
                tool_id: None,
                tool_name: None,
            });
        }

        if existing_skill.is_some() {
            if let Some(ordering) = duplicate_version_order {
                let (message, action_type) = match ordering {
                    Ordering::Greater => (
                        format!(
                            "Managed Skill exists; local version {} is newer than managed version {} and will replace it before relinking",
                            source_version.as_deref().unwrap_or("unknown"),
                            existing_version.as_deref().unwrap_or("unknown"),
                        ),
                        "replace_managed_with_newer_local",
                    ),
                    Ordering::Equal => (
                        format!(
                            "Managed Skill exists with the same version {}; local copy will be replaced with a symlink",
                            source_version.as_deref().unwrap_or("unknown"),
                        ),
                        "reuse_managed_copy",
                    ),
                    Ordering::Less => (
                        format!(
                            "Managed Skill version {} is newer than local version {}; local copy will be replaced with a symlink",
                            existing_version.as_deref().unwrap_or("unknown"),
                            source_version.as_deref().unwrap_or("unknown"),
                        ),
                        "reuse_managed_copy",
                    ),
                };
                actions.insert(
                    0,
                    LifecycleAction {
                        action_type: action_type.to_string(),
                        status: LifecycleActionStatus::Planned,
                        path: Some(source_path_str.clone()),
                        target_path: Some(managed_target_str.clone()),
                        skill_id: Some(skill_id.to_string()),
                        skill_name: None,
                        tool_id: None,
                        tool_name: None,
                    },
                );
                warnings.push(LifecycleIssue {
                    code: "already_managed_version_checked".to_string(),
                    message,
                    path: Some(source_path_str.clone()),
                    target_path: Some(managed_target_str.clone()),
                    skill_id: Some(skill_id.to_string()),
                    skill_name: None,
                    tool_id: None,
                    tool_name: None,
                });
            } else if duplicate_contents_match {
                actions.insert(
                    0,
                    LifecycleAction {
                        action_type: "reuse_managed_copy".to_string(),
                        status: LifecycleActionStatus::Planned,
                        path: Some(source_path_str.clone()),
                        target_path: Some(managed_target_str.clone()),
                        skill_id: Some(skill_id.to_string()),
                        skill_name: None,
                        tool_id: None,
                        tool_name: None,
                    },
                );
                warnings.push(LifecycleIssue {
                    code: "already_managed_content_matched".to_string(),
                    message: "Managed Skill has identical contents; local copy will be replaced with a symlink".to_string(),
                    path: Some(source_path_str.clone()),
                    target_path: Some(managed_target_str.clone()),
                    skill_id: Some(skill_id.to_string()),
                    skill_name: None,
                    tool_id: None,
                    tool_name: None,
                });
            } else {
                failures.push(LifecycleIssue {
                    code: "conflict".to_string(),
                    message: format!(
                        "Skill ID already exists: {}. Version comparison is unavailable and contents differ; add comparable version fields before replacing automatically.",
                        skill_id
                    ),
                    path: None,
                    target_path: Some(managed_target_str.clone()),
                    skill_id: Some(skill_id.to_string()),
                    skill_name: None,
                    tool_id: None,
                    tool_name: None,
                });
            }
        }

        if managed_target.exists() && existing_skill.is_none() {
            failures.push(LifecycleIssue {
                code: "conflict".to_string(),
                message: format!(
                    "Managed target already exists: {}",
                    managed_target.display()
                ),
                path: None,
                target_path: Some(managed_target_str.clone()),
                skill_id: Some(skill_id.to_string()),
                skill_name: None,
                tool_id: None,
                tool_name: None,
            });
        }

        if !failures.is_empty() {
            for action in &mut actions {
                action.status = LifecycleActionStatus::Skipped;
            }
        }

        let blocked = !failures.is_empty();
        let report = LifecycleReport::from_parts(actions, warnings, failures, blocked);

        Ok(MigrationPreflight {
            skill_id: skill_id.to_string(),
            source_path: source_path_str.clone(),
            managed_target_path: managed_target_str,
            original_replacement_path: source_path_str,
            report,
        })
    }

    pub fn get_skill_by_id(db: &Database, skill_id: &str) -> Result<Option<Skill>> {
        let conn = db.get_connection();
        let mut stmt = conn.prepare(
            "SELECT id, name, source_type, source_url, local_path, 
                    installed_at, updated_at, is_enabled, metadata 
             FROM skills WHERE id = ?1",
        )?;

        let mut skills = stmt.query_map([skill_id], |row| {
            let metadata_str: Option<String> = row.get(8)?;
            let metadata = metadata_str.and_then(|s| serde_json::from_str(&s).ok());

            Ok(Skill {
                id: row.get(0)?,
                name: row.get(1)?,
                source_type: row.get(2)?,
                source_url: row.get(3)?,
                local_path: row.get(4)?,
                installed_at: row.get(5)?,
                updated_at: row.get(6)?,
                is_enabled: row.get(7)?,
                metadata,
            })
        })?;

        skills.next().transpose()
    }

    pub fn toggle_skill(db: &Database, skill_id: &str, enabled: bool) -> Result<()> {
        let conn = db.get_connection();
        let enabled_i32 = if enabled { 1 } else { 0 };
        conn.execute(
            "UPDATE skills SET is_enabled = ?1 WHERE id = ?2",
            rusqlite::params![enabled_i32, skill_id.to_string()],
        )?;
        Ok(())
    }

    pub fn uninstall_skill(db: &Database, skill_id: &str) -> Result<LifecycleReport> {
        let Some(skill) = Self::get_skill_by_id(db, skill_id)? else {
            return Ok(LifecycleReport::from_parts(
                vec![],
                vec![LifecycleIssue {
                    code: "not_found".to_string(),
                    message: format!("Skill not found: {}", skill_id),
                    path: None,
                    target_path: None,
                    skill_id: Some(skill_id.to_string()),
                    skill_name: None,
                    tool_id: None,
                    tool_name: None,
                }],
                vec![],
                false,
            ));
        };

        let mut actions = Vec::new();
        let mut failures = Vec::new();

        let conn = db.get_connection();
        let mut stmt = conn.prepare(
            "SELECT l.link_path, l.tool_id, t.name
             FROM skill_links l
             LEFT JOIN ai_tools t ON t.id = l.tool_id
             WHERE l.skill_id = ?1",
        )?;
        let links = stmt
            .query_map([skill_id], |row| {
                Ok((
                    row.get::<_, String>(0)?,
                    row.get::<_, String>(1)?,
                    row.get::<_, Option<String>>(2)?,
                ))
            })?
            .collect::<Result<Vec<_>>>()?;
        drop(stmt);

        for (link_path, tool_id, tool_name) in links {
            let path = Path::new(&link_path);
            let mut action = LifecycleAction {
                action_type: "remove_tool_link".to_string(),
                status: LifecycleActionStatus::Planned,
                path: Some(link_path.clone()),
                target_path: None,
                skill_id: Some(skill_id.to_string()),
                skill_name: Some(skill.name.clone()),
                tool_id: Some(tool_id.clone()),
                tool_name: tool_name.clone(),
            };

            if path.exists() || crate::utils::is_symlink(path) {
                let remove_result = if crate::utils::is_symlink(path) || path.is_file() {
                    fs::remove_file(path)
                } else {
                    fs::remove_dir_all(path)
                };

                if let Err(error) = remove_result {
                    action.status = LifecycleActionStatus::Failed;
                    failures.push(LifecycleIssue {
                        code: io_reason_code(&error),
                        message: error.to_string(),
                        path: Some(link_path),
                        target_path: None,
                        skill_id: Some(skill_id.to_string()),
                        skill_name: Some(skill.name.clone()),
                        tool_id: Some(tool_id),
                        tool_name,
                    });
                    actions.push(action);
                    continue;
                }
            }

            action.status = LifecycleActionStatus::Completed;
            actions.push(action);
        }

        let managed_path = skill.local_path.clone();
        let mut folder_action = LifecycleAction {
            action_type: "remove_managed_folder".to_string(),
            status: LifecycleActionStatus::Planned,
            path: Some(managed_path.clone()),
            target_path: None,
            skill_id: Some(skill_id.to_string()),
            skill_name: Some(skill.name.clone()),
            tool_id: None,
            tool_name: None,
        };

        match fs::remove_dir_all(&managed_path) {
            Ok(()) => {
                folder_action.status = LifecycleActionStatus::Completed;
                actions.push(folder_action);
            }
            Err(error) => {
                folder_action.status = LifecycleActionStatus::Failed;
                actions.push(folder_action);
                failures.push(LifecycleIssue {
                    code: io_reason_code(&error),
                    message: error.to_string(),
                    path: Some(managed_path),
                    target_path: None,
                    skill_id: Some(skill_id.to_string()),
                    skill_name: Some(skill.name),
                    tool_id: None,
                    tool_name: None,
                });

                return Ok(
                    LifecycleReport::from_parts(actions, vec![], failures, false)
                        .with_retryable(true),
                );
            }
        }

        if failures.is_empty() {
            conn.execute("DELETE FROM skill_links WHERE skill_id = ?1", [skill_id])?;
            conn.execute("DELETE FROM skills WHERE id = ?1", [skill_id])?;
        }

        let retryable = !failures.is_empty();
        Ok(LifecycleReport::from_parts(actions, vec![], failures, false).with_retryable(retryable))
    }
}

fn io_reason_code(error: &std::io::Error) -> String {
    match error.kind() {
        std::io::ErrorKind::PermissionDenied => "permission_denied",
        std::io::ErrorKind::NotFound => "path_missing",
        std::io::ErrorKind::AlreadyExists => "conflict",
        _ => "filesystem_error",
    }
    .to_string()
}

fn copy_dir_all(src: &Path, dst: &Path) -> std::io::Result<()> {
    fs::create_dir_all(dst)?;
    for entry in fs::read_dir(src)? {
        let entry = entry?;
        let path = entry.path();
        let file_name = path.file_name().unwrap();
        let dest_path = dst.join(file_name);

        if path.is_dir() {
            copy_dir_all(&path, &dest_path)?;
        } else {
            fs::copy(&path, &dest_path)?;
        }
    }
    Ok(())
}

pub fn skill_directories_match(left: &Path, right: &Path) -> std::io::Result<bool> {
    if !left.is_dir() || !right.is_dir() {
        return Ok(false);
    }

    let left_files = collect_relative_files(left)?;
    let right_files = collect_relative_files(right)?;
    if left_files != right_files {
        return Ok(false);
    }

    for relative_path in left_files {
        let left_content = fs::read(left.join(&relative_path))?;
        let right_content = fs::read(right.join(&relative_path))?;
        if left_content != right_content {
            return Ok(false);
        }
    }

    Ok(true)
}

fn collect_relative_files(root: &Path) -> std::io::Result<Vec<std::path::PathBuf>> {
    let mut files = Vec::new();
    collect_relative_files_inner(root, root, &mut files)?;
    files.sort();
    Ok(files)
}

fn collect_relative_files_inner(
    root: &Path,
    current: &Path,
    files: &mut Vec<std::path::PathBuf>,
) -> std::io::Result<()> {
    for entry in fs::read_dir(current)? {
        let entry = entry?;
        let path = entry.path();
        let file_type = entry.file_type()?;
        if file_type.is_dir() {
            collect_relative_files_inner(root, &path, files)?;
        } else if file_type.is_file() {
            files.push(path.strip_prefix(root).unwrap_or(&path).to_path_buf());
        } else {
            return Ok(());
        }
    }

    Ok(())
}

fn remove_path_if_exists(path: &Path) -> std::io::Result<()> {
    if !path.exists() && !crate::utils::is_symlink(path) {
        return Ok(());
    }

    if crate::utils::is_symlink(path) || path.is_file() {
        fs::remove_file(path)
    } else {
        fs::remove_dir_all(path)
    }
}

pub fn read_skill_metadata(skill_path: &Path) -> SkillMetadata {
    let version = read_skill_version(skill_path);

    SkillMetadata {
        author: None,
        description: None,
        tags: vec![],
        version,
    }
}

pub fn read_skill_version(skill_path: &Path) -> Option<String> {
    let content = fs::read_to_string(skill_path.join("SKILL.md")).ok()?;

    for line in content.lines().take(80) {
        let trimmed = line.trim();
        if trimmed == "---" || trimmed.is_empty() {
            continue;
        }
        let Some((key, value)) = trimmed.split_once(':') else {
            continue;
        };
        if key.trim().eq_ignore_ascii_case("version") {
            let version = value.trim().trim_matches('"').trim_matches('\'');
            if !version.is_empty() {
                return Some(version.to_string());
            }
        }
    }

    None
}

pub fn compare_skill_versions(left: &str, right: &str) -> Option<Ordering> {
    let left_parts = parse_version(left)?;
    let right_parts = parse_version(right)?;
    Some(left_parts.cmp(&right_parts))
}

fn parse_version(version: &str) -> Option<Vec<u64>> {
    let normalized = version.trim().trim_start_matches('v');
    if normalized.is_empty() {
        return None;
    }

    let mut parts = Vec::new();
    for part in normalized.split('.') {
        let numeric = part
            .split(|ch: char| !ch.is_ascii_digit())
            .next()
            .unwrap_or("");
        if numeric.is_empty() {
            return None;
        }
        parts.push(numeric.parse::<u64>().ok()?);
    }

    while parts.len() < 3 {
        parts.push(0);
    }

    Some(parts)
}

#[cfg(test)]
mod tests {
    use super::{compare_skill_versions, SkillService};
    use crate::db::Database;
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
    fn registers_existing_skill_folders_from_managed_directory() {
        let root = unique_test_dir("register-existing");
        let skills_dir = root.join("skills");
        let skill_dir = skills_dir.join("alpha");
        fs::create_dir_all(&skill_dir).expect("create skill dir");
        fs::write(skill_dir.join("SKILL.md"), "---\nname: Alpha\n---\n").expect("write skill file");

        let db = Database::new(root.join("metadata.db")).expect("create test database");

        SkillService::register_existing_skills(&db, &skills_dir).expect("register existing skills");

        let skills = SkillService::get_all_skills(&db).expect("load skills");
        assert_eq!(skills.len(), 1);
        assert_eq!(skills[0].id, "alpha");
        assert_eq!(skills[0].name, "alpha");
        assert_eq!(skills[0].local_path, skill_dir.to_string_lossy());

        fs::remove_dir_all(root).ok();
    }

    #[test]
    fn prunes_skill_rows_when_managed_folder_is_deleted() {
        let root = unique_test_dir("prune-missing");
        let skills_dir = root.join("skills");
        let skill_dir = skills_dir.join("alpha");
        fs::create_dir_all(&skill_dir).expect("create skill dir");
        fs::write(skill_dir.join("SKILL.md"), "---\nname: Alpha\n---\n").expect("write skill file");

        let db = Database::new(root.join("metadata.db")).expect("create test database");

        SkillService::register_existing_skills(&db, &skills_dir).expect("register existing skills");
        fs::remove_dir_all(&skill_dir).expect("remove managed skill dir");

        let removed = SkillService::prune_missing_skills(&db).expect("prune missing skills");
        let skills = SkillService::get_all_skills(&db).expect("load skills");

        assert_eq!(removed, 1);
        assert!(skills.is_empty());

        fs::remove_dir_all(root).ok();
    }

    #[test]
    fn install_skill_rejects_existing_skill_id_without_overwriting_record() {
        let root = unique_test_dir("reject-duplicate-id");
        let skills_dir = root.join("skills");
        let source_alpha = root.join("source-alpha");
        let source_beta = root.join("source-beta");
        fs::create_dir_all(&source_alpha).expect("create alpha source");
        fs::create_dir_all(&source_beta).expect("create beta source");
        fs::write(source_alpha.join("SKILL.md"), "---\nname: Alpha\n---\n")
            .expect("write alpha skill file");
        fs::write(source_beta.join("SKILL.md"), "---\nname: Beta\n---\n")
            .expect("write beta skill file");

        let db = Database::new(root.join("metadata.db")).expect("create test database");

        let first = SkillService::install_skill_into_dir(
            &db,
            "alpha",
            "Alpha",
            "local",
            None,
            &source_alpha,
            &skills_dir,
        )
        .expect("install alpha");
        let err = SkillService::install_skill_into_dir(
            &db,
            "alpha",
            "Beta",
            "local",
            None,
            &source_beta,
            &skills_dir,
        )
        .expect_err("reject duplicate skill ID");

        assert!(err.to_string().contains("Skill ID already exists"));
        let current = SkillService::get_skill_by_id(&db, "alpha")
            .expect("load alpha")
            .expect("alpha still exists");
        assert_eq!(current.name, "Alpha");
        assert_eq!(current.local_path, first.local_path);

        fs::remove_dir_all(root).ok();
    }

    #[test]
    fn uninstall_keeps_database_record_when_folder_removal_fails() {
        let root = unique_test_dir("uninstall-missing-folder");
        let skills_dir = root.join("skills");
        let source = root.join("source-alpha");
        fs::create_dir_all(&source).expect("create source");
        fs::write(source.join("SKILL.md"), "---\nname: Alpha\n---\n").expect("write skill file");
        let db = Database::new(root.join("metadata.db")).expect("create test database");

        let skill = SkillService::install_skill_into_dir(
            &db,
            "alpha",
            "Alpha",
            "local",
            None,
            &source,
            &skills_dir,
        )
        .expect("install alpha");
        fs::remove_dir_all(&skill.local_path).expect("remove managed folder before uninstall");

        let report = SkillService::uninstall_skill(&db, "alpha").expect("uninstall report");

        assert_eq!(report.status, crate::models::LifecycleReportStatus::Failed);
        assert!(report.retryable);
        assert!(report
            .failures
            .iter()
            .any(|failure| failure.code == "path_missing"));
        assert!(SkillService::get_skill_by_id(&db, "alpha")
            .expect("query alpha")
            .is_some());

        fs::remove_dir_all(root).ok();
    }

    #[test]
    fn uninstall_success_removes_links_folder_and_database_record() {
        let root = unique_test_dir("uninstall-success");
        let skills_dir = root.join("skills");
        let source = root.join("source-alpha");
        let tool_dir = root.join("tool").join("skills");
        let link_path = tool_dir.join("alpha");
        fs::create_dir_all(&source).expect("create source");
        fs::write(source.join("SKILL.md"), "---\nname: Alpha\n---\n").expect("write skill file");
        fs::create_dir_all(&tool_dir).expect("create tool skills dir");
        fs::create_dir_all(&link_path).expect("create link placeholder");
        let db = Database::new(root.join("metadata.db")).expect("create test database");

        let skill = SkillService::install_skill_into_dir(
            &db,
            "alpha",
            "Alpha",
            "local",
            None,
            &source,
            &skills_dir,
        )
        .expect("install alpha");
        db.get_connection()
            .execute(
                "INSERT INTO ai_tools (id, name, config_path, skills_subdir, is_detected, is_enabled)
                 VALUES ('tool', 'Tool', ?1, 'skills', 1, 1)",
                [root.join("tool").to_string_lossy().into_owned()],
            )
            .expect("insert tool");
        db.get_connection()
            .execute(
                "INSERT INTO skill_links (skill_id, tool_id, link_path, is_active)
                 VALUES ('alpha', 'tool', ?1, 1)",
                [link_path.to_string_lossy().into_owned()],
            )
            .expect("insert link");

        let report = SkillService::uninstall_skill(&db, "alpha").expect("uninstall alpha");

        assert_eq!(report.status, crate::models::LifecycleReportStatus::Success);
        assert!(!std::path::Path::new(&skill.local_path).exists());
        assert!(!link_path.exists());
        assert!(SkillService::get_skill_by_id(&db, "alpha")
            .expect("query alpha")
            .is_none());

        fs::remove_dir_all(root).ok();
    }

    #[test]
    fn uninstall_reports_partial_when_link_cleanup_fails() {
        let root = unique_test_dir("uninstall-link-fail");
        let skills_dir = root.join("skills");
        let source = root.join("source-alpha");
        let tool_dir = root.join("tool").join("skills");
        let link_path = tool_dir.join("alpha");
        fs::create_dir_all(&source).expect("create source");
        fs::write(source.join("SKILL.md"), "---\nname: Alpha\n---\n").expect("write skill file");
        fs::create_dir_all(&tool_dir).expect("create tool skills dir");
        fs::write(&link_path, "not a directory link").expect("create file link placeholder");
        let db = Database::new(root.join("metadata.db")).expect("create test database");

        SkillService::install_skill_into_dir(
            &db,
            "alpha",
            "Alpha",
            "local",
            None,
            &source,
            &skills_dir,
        )
        .expect("install alpha");
        db.get_connection()
            .execute(
                "INSERT INTO ai_tools (id, name, config_path, skills_subdir, is_detected, is_enabled)
                 VALUES ('tool', 'Tool', ?1, 'skills', 1, 1)",
                [root.join("tool").to_string_lossy().into_owned()],
            )
            .expect("insert tool");
        db.get_connection()
            .execute(
                "INSERT INTO skill_links (skill_id, tool_id, link_path, is_active)
                 VALUES ('alpha', 'tool', ?1, 1)",
                [link_path.to_string_lossy().into_owned()],
            )
            .expect("insert link");

        #[cfg(unix)]
        {
            use std::os::unix::fs::PermissionsExt;
            let mut permissions = tool_dir
                .metadata()
                .expect("tool dir metadata")
                .permissions();
            permissions.set_mode(0o500);
            fs::set_permissions(&tool_dir, permissions).expect("make tool dir readonly");
        }

        let report = SkillService::uninstall_skill(&db, "alpha").expect("uninstall report");

        #[cfg(unix)]
        {
            use std::os::unix::fs::PermissionsExt;
            let mut permissions = tool_dir
                .metadata()
                .expect("tool dir metadata")
                .permissions();
            permissions.set_mode(0o700);
            fs::set_permissions(&tool_dir, permissions).expect("restore tool dir permissions");
        }

        if cfg!(unix) {
            assert_eq!(report.status, crate::models::LifecycleReportStatus::Partial);
            assert!(report
                .failures
                .iter()
                .any(|failure| failure.tool_id.as_deref() == Some("tool")));
            assert!(SkillService::get_skill_by_id(&db, "alpha")
                .expect("query alpha")
                .is_some());
        }

        fs::remove_dir_all(root).ok();
    }

    #[test]
    fn preflight_migration_returns_planned_actions_for_valid_skill() {
        let root = unique_test_dir("preflight-valid");
        let skills_dir = root.join("skills");
        let source = root.join("source-alpha");
        fs::create_dir_all(&source).expect("create source");
        fs::write(source.join("SKILL.md"), "---\nname: Alpha\n---\n").expect("write skill file");
        let db = Database::new(root.join("metadata.db")).expect("create test database");

        let preflight = SkillService::preflight_migration(&db, "alpha", &source, &skills_dir)
            .expect("preflight migration");

        assert_eq!(preflight.skill_id, "alpha");
        assert_eq!(
            preflight.report.status,
            crate::models::LifecycleReportStatus::Success
        );
        assert_eq!(preflight.report.actions.len(), 2);
        assert!(preflight.report.failures.is_empty());

        fs::remove_dir_all(root).ok();
    }

    #[test]
    fn preflight_migration_blocks_existing_skill_id() {
        let root = unique_test_dir("preflight-existing-id");
        let skills_dir = root.join("skills");
        let managed_source = root.join("managed-source-alpha");
        let local_source = root.join("local-source-alpha");
        fs::create_dir_all(&managed_source).expect("create managed source");
        fs::write(managed_source.join("SKILL.md"), "---\nname: Alpha\n---\n")
            .expect("write managed skill file");
        fs::create_dir_all(&local_source).expect("create local source");
        fs::write(
            local_source.join("SKILL.md"),
            "---\nname: Different Alpha\n---\n",
        )
        .expect("write local skill file");
        let db = Database::new(root.join("metadata.db")).expect("create test database");

        SkillService::install_skill_into_dir(
            &db,
            "alpha",
            "Alpha",
            "local",
            None,
            &managed_source,
            &skills_dir,
        )
        .expect("install alpha");

        let preflight = SkillService::preflight_migration(&db, "alpha", &local_source, &skills_dir)
            .expect("preflight migration");

        assert_eq!(
            preflight.report.status,
            crate::models::LifecycleReportStatus::Blocked
        );
        assert!(preflight
            .report
            .failures
            .iter()
            .any(|failure| failure.code == "conflict"));

        fs::remove_dir_all(root).ok();
    }

    #[test]
    fn preflight_allows_existing_skill_id_when_unversioned_contents_match() {
        let root = unique_test_dir("preflight-existing-id-matching-content");
        let skills_dir = root.join("skills");
        let managed_source = root.join("managed-source-alpha");
        let local_source = root.join("local-source-alpha");
        fs::create_dir_all(&managed_source).expect("create managed source");
        fs::write(
            managed_source.join("SKILL.md"),
            "---\nname: Alpha\n---\nbody\n",
        )
        .expect("write managed skill file");
        fs::create_dir_all(&local_source).expect("create local source");
        fs::write(
            local_source.join("SKILL.md"),
            "---\nname: Alpha\n---\nbody\n",
        )
        .expect("write local skill file");
        let db = Database::new(root.join("metadata.db")).expect("create test database");

        SkillService::install_skill_into_dir(
            &db,
            "alpha",
            "Alpha",
            "local",
            None,
            &managed_source,
            &skills_dir,
        )
        .expect("install alpha");

        let preflight = SkillService::preflight_migration(&db, "alpha", &local_source, &skills_dir)
            .expect("preflight migration");

        assert_eq!(
            preflight.report.status,
            crate::models::LifecycleReportStatus::Success
        );
        assert!(preflight.report.failures.is_empty());
        assert!(preflight
            .report
            .warnings
            .iter()
            .any(|warning| warning.code == "already_managed_content_matched"));

        fs::remove_dir_all(root).ok();
    }

    #[test]
    fn preflight_allows_existing_skill_id_when_versions_are_comparable() {
        let root = unique_test_dir("preflight-existing-id-versioned");
        let skills_dir = root.join("skills");
        let managed_source = root.join("managed-source-alpha");
        let local_source = root.join("local-source-alpha");
        fs::create_dir_all(&managed_source).expect("create managed source");
        fs::write(
            managed_source.join("SKILL.md"),
            "---\nname: Alpha\nversion: 1.0.0\n---\n",
        )
        .expect("write managed skill file");
        fs::create_dir_all(&local_source).expect("create local source");
        fs::write(
            local_source.join("SKILL.md"),
            "---\nname: Alpha\nversion: 1.1.0\n---\n",
        )
        .expect("write local skill file");
        let db = Database::new(root.join("metadata.db")).expect("create test database");

        SkillService::install_skill_into_dir(
            &db,
            "alpha",
            "Alpha",
            "local",
            None,
            &managed_source,
            &skills_dir,
        )
        .expect("install alpha");

        let preflight = SkillService::preflight_migration(&db, "alpha", &local_source, &skills_dir)
            .expect("preflight migration");

        assert_eq!(
            preflight.report.status,
            crate::models::LifecycleReportStatus::Success
        );
        assert!(preflight.report.failures.is_empty());
        assert!(preflight
            .report
            .warnings
            .iter()
            .any(|warning| warning.code == "already_managed_version_checked"));

        fs::remove_dir_all(root).ok();
    }

    #[test]
    fn preflight_reads_managed_skill_file_when_metadata_version_is_missing() {
        let root = unique_test_dir("preflight-existing-id-version-fallback");
        let skills_dir = root.join("skills");
        let managed_source = root.join("managed-source-alpha");
        let local_source = root.join("local-source-alpha");
        fs::create_dir_all(&managed_source).expect("create managed source");
        fs::write(
            managed_source.join("SKILL.md"),
            "---\nname: Alpha\nversion: 2.0.0\n---\n",
        )
        .expect("write managed skill file");
        fs::create_dir_all(&local_source).expect("create local source");
        fs::write(
            local_source.join("SKILL.md"),
            "---\nname: Alpha\nversion: 1.0.0\n---\n",
        )
        .expect("write local skill file");
        let db = Database::new(root.join("metadata.db")).expect("create test database");

        SkillService::install_skill_into_dir(
            &db,
            "alpha",
            "Alpha",
            "local",
            None,
            &managed_source,
            &skills_dir,
        )
        .expect("install alpha");
        db.get_connection()
            .execute("UPDATE skills SET metadata = NULL WHERE id = 'alpha'", [])
            .expect("clear metadata");

        let preflight = SkillService::preflight_migration(&db, "alpha", &local_source, &skills_dir)
            .expect("preflight migration");

        assert_eq!(
            preflight.report.status,
            crate::models::LifecycleReportStatus::Success
        );
        assert!(preflight.report.failures.is_empty());
        assert!(preflight.report.warnings.iter().any(|warning| {
            warning.code == "already_managed_version_checked"
                && warning
                    .message
                    .contains("Managed Skill version 2.0.0 is newer")
        }));

        fs::remove_dir_all(root).ok();
    }

    #[test]
    fn preflight_keeps_real_failures_blocked_when_existing_versions_are_comparable() {
        let root = unique_test_dir("preflight-existing-id-versioned-invalid");
        let skills_dir = root.join("skills");
        let managed_source = root.join("managed-source-alpha");
        let local_source = root.join("local-source-alpha");
        fs::create_dir_all(&managed_source).expect("create managed source");
        fs::write(
            managed_source.join("SKILL.md"),
            "---\nname: Alpha\nversion: 1.0.0\n---\n",
        )
        .expect("write managed skill file");
        fs::create_dir_all(&local_source).expect("create local source");
        fs::write(local_source.join("README.md"), "version: 1.1.0\n")
            .expect("write non-skill file");
        let db = Database::new(root.join("metadata.db")).expect("create test database");

        SkillService::install_skill_into_dir(
            &db,
            "alpha",
            "Alpha",
            "local",
            None,
            &managed_source,
            &skills_dir,
        )
        .expect("install alpha");

        let preflight = SkillService::preflight_migration(&db, "alpha", &local_source, &skills_dir)
            .expect("preflight migration");

        assert_eq!(
            preflight.report.status,
            crate::models::LifecycleReportStatus::Blocked
        );
        assert!(preflight
            .report
            .failures
            .iter()
            .any(|failure| failure.code == "invalid_skill"));
        assert!(preflight.report.warnings.is_empty());

        fs::remove_dir_all(root).ok();
    }

    #[test]
    fn version_comparison_is_numeric_and_requires_numbers() {
        assert_eq!(
            compare_skill_versions("1.10.0", "1.2.0"),
            Some(std::cmp::Ordering::Greater)
        );
        assert_eq!(
            compare_skill_versions("v1.0", "1.0.0"),
            Some(std::cmp::Ordering::Equal)
        );
        assert_eq!(compare_skill_versions("latest", "1.0.0"), None);
    }
}
