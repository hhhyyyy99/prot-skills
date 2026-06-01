use crate::db::Database;
use crate::models::{
    LifecycleAction, LifecycleActionStatus, LifecycleIssue, LifecycleReport, LocalSkill,
    MigrationPreflight, MigrationResult, Skill, SkillLink, SyncSkillTargetsResult,
};
use crate::services::skill_service::{
    compare_skill_versions, read_skill_version, skill_directories_match,
};
use crate::services::{DiscoveryService, LinkService, SkillService, ToolService};
use crate::utils::{get_skills_dir, is_in_manager_dir, is_symlink, resolve_symlink};
use std::fs;
use std::path::{Path, PathBuf};
use tauri::State;

#[tauri::command]
pub fn get_skills_dir_path() -> Result<String, String> {
    Ok(get_skills_dir().to_string_lossy().into_owned())
}

#[tauri::command]
pub async fn get_skills(db: State<'_, std::sync::Mutex<Database>>) -> Result<Vec<Skill>, String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    SkillService::prune_missing_skills(&db).map_err(|e| e.to_string())?;
    SkillService::register_existing_skills(&db, &get_skills_dir()).map_err(|e| e.to_string())?;
    SkillService::get_all_skills(&db).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn install_skill_from_local(
    db: State<std::sync::Mutex<Database>>,
    source_path: String,
    skill_id: String,
    name: String,
) -> Result<Skill, String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    let path = Path::new(&source_path);

    // If it's a symlink, resolve to target
    let source_path = if is_symlink(path) {
        resolve_symlink(path).unwrap_or_else(|| path.to_path_buf())
    } else {
        path.to_path_buf()
    };

    SkillService::install_skill(&db, &skill_id, &name, "local", None, &source_path)
        .map_err(|e| e.to_string())
        .and_then(|skill| {
            let result = LinkService::set_all_detected_tool_links_result(&db, &skill.id, true)
                .map_err(|e| e.to_string())?;
            if result.failure_count > 0 {
                let failures: Vec<String> = result
                    .failed_tools
                    .iter()
                    .map(|f| format!("{} ({})", f.tool_name, f.reason))
                    .collect();
                eprintln!(
                    "Sync failed for skill '{}': {} tool(s) could not be linked: {}",
                    skill.name,
                    result.failure_count,
                    failures.join(", ")
                );
            }
            Ok(skill)
        })
}

#[tauri::command]
pub fn toggle_skill(
    db: State<std::sync::Mutex<Database>>,
    skill_id: String,
    enabled: bool,
) -> Result<(), String> {
    let db = db.lock().map_err(|e| e.to_string())?;

    SkillService::toggle_skill(&db, &skill_id, enabled).map_err(|e| e.to_string())?;

    // Sync links
    LinkService::sync_skill_links(&db, &skill_id).map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub fn uninstall_skill(
    db: State<std::sync::Mutex<Database>>,
    skill_id: String,
) -> Result<LifecycleReport, String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    SkillService::uninstall_skill(&db, &skill_id).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_skill_links(
    db: State<'_, std::sync::Mutex<Database>>,
    skill_id: String,
) -> Result<Vec<SkillLink>, String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    LinkService::get_links_for_skill(&db, &skill_id).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn set_skill_tool_link(
    db: State<std::sync::Mutex<Database>>,
    skill_id: String,
    tool_id: String,
    active: bool,
) -> Result<Option<SkillLink>, String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    LinkService::set_link_active(&db, &skill_id, &tool_id, active).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn set_all_skill_tool_links(
    db: State<'_, std::sync::Mutex<Database>>,
    skill_id: String,
    active: bool,
) -> Result<SyncSkillTargetsResult, String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    LinkService::set_all_detected_tool_links_result(&db, &skill_id, active)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn open_folder(path: String) -> Result<(), String> {
    #[cfg(target_os = "macos")]
    {
        std::process::Command::new("open")
            .arg(&path)
            .spawn()
            .map_err(|e| e.to_string())?;
    }
    #[cfg(target_os = "windows")]
    {
        std::process::Command::new("explorer")
            .arg(&path)
            .spawn()
            .map_err(|e| e.to_string())?;
    }
    #[cfg(target_os = "linux")]
    {
        std::process::Command::new("xdg-open")
            .arg(&path)
            .spawn()
            .map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
pub fn open_url(url: String) -> Result<(), String> {
    if !(url.starts_with("https://") || url.starts_with("http://")) {
        return Err("Only http and https URLs can be opened".to_string());
    }

    #[cfg(target_os = "macos")]
    {
        std::process::Command::new("open")
            .arg(&url)
            .spawn()
            .map_err(|e| e.to_string())?;
    }
    #[cfg(target_os = "windows")]
    {
        std::process::Command::new("explorer")
            .arg(&url)
            .spawn()
            .map_err(|e| e.to_string())?;
    }
    #[cfg(target_os = "linux")]
    {
        std::process::Command::new("xdg-open")
            .arg(&url)
            .spawn()
            .map_err(|e| e.to_string())?;
    }
    Ok(())
}

fn create_skill_symlink(target: &Path, link_path: &Path) -> std::io::Result<()> {
    #[cfg(unix)]
    {
        std::os::unix::fs::symlink(target, link_path)
    }
    #[cfg(windows)]
    {
        std::os::windows::fs::symlink_dir(target, link_path)
    }
}

fn replace_with_validated_symlink(
    original_location: &Path,
    managed_target: &Path,
) -> Result<(), String> {
    replace_with_validated_symlink_impl(original_location, managed_target, |from, to| {
        fs::rename(from, to)
    })
}

fn replace_with_validated_symlink_impl<F>(
    original_location: &Path,
    managed_target: &Path,
    mut rename_path: F,
) -> Result<(), String>
where
    F: FnMut(&Path, &Path) -> std::io::Result<()>,
{
    let expected_target = managed_target
        .canonicalize()
        .map_err(|e| format!("Managed target cannot be resolved: {}", e))?;
    let parent = original_location.parent().ok_or_else(|| {
        format!(
            "Cannot determine parent for {}",
            original_location.display()
        )
    })?;
    fs::create_dir_all(parent).map_err(|e| format!("Failed to create parent directory: {}", e))?;

    let path_name = original_location
        .file_name()
        .and_then(|name| name.to_str())
        .unwrap_or("skill");
    let temp_link = parent.join(format!(".{path_name}.prot-skills-link-tmp"));
    if temp_link.exists() || is_symlink(&temp_link) {
        if is_symlink(&temp_link) || temp_link.is_file() {
            fs::remove_file(&temp_link)
                .map_err(|e| format!("Failed to remove stale temp link: {}", e))?;
        } else {
            fs::remove_dir_all(&temp_link)
                .map_err(|e| format!("Failed to remove stale temp link directory: {}", e))?;
        }
    }
    let original_backup = parent.join(format!(".{path_name}.prot-skills-original-tmp"));
    if original_backup.exists() || is_symlink(&original_backup) {
        return Err(format!(
            "Stale original backup already exists: {}",
            original_backup.display()
        ));
    }

    create_skill_symlink(managed_target, &temp_link)
        .map_err(|e| format!("Failed to create symlink: {}", e))?;

    let temp_target = resolve_symlink(&temp_link)
        .ok_or_else(|| format!("Failed to verify symlink: {}", temp_link.display()))?;
    if temp_target.canonicalize().ok() != Some(expected_target) {
        fs::remove_file(&temp_link).ok();
        return Err(format!(
            "Symlink target mismatch: {} does not point to {}",
            temp_link.display(),
            managed_target.display()
        ));
    }

    if original_location.exists() || is_symlink(original_location) {
        rename_path(original_location, &original_backup)
            .map_err(|e| format!("Failed to move original path aside: {}", e))?;
    }

    match rename_path(&temp_link, original_location) {
        Ok(()) => {
            if original_backup.exists() || is_symlink(&original_backup) {
                if is_symlink(&original_backup) || original_backup.is_file() {
                    fs::remove_file(&original_backup)
                        .map_err(|e| format!("Failed to remove original backup: {}", e))?;
                } else if original_backup.is_dir() {
                    fs::remove_dir_all(&original_backup).map_err(|e| {
                        format!("Failed to remove original backup directory: {}", e)
                    })?;
                }
            }
            Ok(())
        }
        Err(error) => {
            fs::remove_file(&temp_link).ok();
            if original_backup.exists() || is_symlink(&original_backup) {
                rename_path(&original_backup, original_location).map_err(|restore_error| {
                    format!(
                        "Failed to install replacement symlink: {}; failed to restore original from {}: {}",
                        error,
                        original_backup.display(),
                        restore_error
                    )
                })?;
            }
            Err(format!(
                "Failed to install replacement symlink; original path was restored: {}",
                error
            ))
        }
    }
}

#[tauri::command]
pub async fn scan_local_skills(
    db: State<'_, std::sync::Mutex<Database>>,
    tool_id: String,
) -> Result<Vec<LocalSkill>, String> {
    let db = db.lock().map_err(|e| e.to_string())?;

    let tools = ToolService::get_all_tools(&db).map_err(|e| e.to_string())?;

    let tool = tools
        .into_iter()
        .find(|t| t.id == tool_id)
        .ok_or("Tool not found")?;

    let skills_path = tool.skills_path();
    let skills = DiscoveryService::scan_directory(&skills_path, &db);

    Ok(skills)
}

#[tauri::command]
pub async fn scan_all_local_skills(
    db: State<'_, std::sync::Mutex<Database>>,
    tool_ids: Vec<String>,
) -> Result<Vec<LocalSkill>, String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    let tools = ToolService::get_all_tools(&db).map_err(|e| e.to_string())?;
    let selected_tool_ids = tool_ids
        .into_iter()
        .collect::<std::collections::HashSet<_>>();
    let mut all_skills = Vec::new();

    for tool in tools
        .into_iter()
        .filter(|tool| selected_tool_ids.contains(&tool.id))
    {
        let mut skills = DiscoveryService::scan_directory(&tool.skills_path(), &db);
        for skill in &mut skills {
            skill.tool_id = Some(tool.id.clone());
            skill.tool_name = Some(tool.name.clone());
        }
        all_skills.extend(skills);
    }

    Ok(all_skills)
}

#[tauri::command]
pub async fn migrate_local_skill(
    db: State<'_, std::sync::Mutex<Database>>,
    source_path: String,
    skill_id: String,
) -> Result<MigrationResult, String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    migrate_local_skill_with_db(&db, source_path, skill_id)
}

fn migrate_local_skill_with_db(
    db: &Database,
    source_path: String,
    skill_id: String,
) -> Result<MigrationResult, String> {
    let path = Path::new(&source_path);
    let mut actions = Vec::new();
    let mut warnings = Vec::new();
    let mut failures = Vec::new();

    // Determine actual source and original location
    let (actual_source, original_location) = if is_symlink(path) {
        let Some(target) = resolve_symlink(path) else {
            failures.push(lifecycle_issue(
                "path_missing",
                "Cannot resolve symlink",
                Some(source_path.clone()),
                None,
                Some(skill_id.clone()),
                None,
                None,
            ));
            return Ok(MigrationResult {
                skill: None,
                report: LifecycleReport::from_parts(actions, vec![], failures, false)
                    .with_retryable(false),
            });
        };
        (target, path.to_path_buf())
    } else {
        (path.to_path_buf(), path.to_path_buf())
    };

    // Decide whether this skill has already been migrated and we should
    // just re-link the caller's location to the existing managed copy.
    //
    // Two cases count as "already migrated":
    //   1. The skill id already exists in the database and its local_path
    //      points into the manager directory.
    //   2. The caller passed us a path that already resolves into the
    //      manager directory (e.g. an existing symlink from another agent).
    let existing = SkillService::get_skill_by_id(db, &skill_id).map_err(|e| e.to_string())?;

    let already_managed = existing.is_some() || is_in_manager_dir(&actual_source);

    let skill = if already_managed {
        match existing.clone() {
            Some(existing_skill) => {
                let managed_version = existing_skill
                    .metadata
                    .as_ref()
                    .and_then(|metadata| metadata.version.clone())
                    .or_else(|| read_skill_version(Path::new(&existing_skill.local_path)));
                let source_version = read_skill_version(&actual_source);
                let version_order = source_version
                    .as_ref()
                    .zip(managed_version.as_ref())
                    .and_then(|(source, managed)| compare_skill_versions(source, managed));
                if version_order.is_none()
                    && !skill_directories_match(
                        &actual_source,
                        Path::new(&existing_skill.local_path),
                    )
                    .unwrap_or(false)
                {
                    failures.push(lifecycle_issue(
                        "conflict",
                        &format!(
                            "Skill ID already exists: {}. Version comparison is unavailable and contents differ; add comparable version fields before replacing automatically.",
                            skill_id
                        ),
                        Some(actual_source.to_string_lossy().into_owned()),
                        Some(existing_skill.local_path.clone()),
                        Some(skill_id.clone()),
                        Some(existing_skill.name.clone()),
                        None,
                    ));
                    return Ok(MigrationResult {
                        skill: Some(existing_skill),
                        report: LifecycleReport::from_parts(actions, vec![], failures, true)
                            .with_retryable(false),
                    });
                }

                if version_order == Some(std::cmp::Ordering::Greater) {
                    match SkillService::replace_managed_skill_contents(
                        db,
                        &skill_id,
                        &actual_source,
                    ) {
                        Ok(updated_skill) => {
                            actions.push(LifecycleAction {
                                action_type: "replace_managed_with_newer_local".to_string(),
                                status: LifecycleActionStatus::Completed,
                                path: Some(actual_source.to_string_lossy().into_owned()),
                                target_path: Some(updated_skill.local_path.clone()),
                                skill_id: Some(skill_id.clone()),
                                skill_name: Some(updated_skill.name.clone()),
                                tool_id: None,
                                tool_name: None,
                            });
                            updated_skill
                        }
                        Err(error) => {
                            let message = error.to_string();
                            failures.push(lifecycle_issue(
                                reason_code_from_message(&message),
                                &message,
                                Some(actual_source.to_string_lossy().into_owned()),
                                Some(existing_skill.local_path.clone()),
                                Some(skill_id.clone()),
                                Some(existing_skill.name.clone()),
                                None,
                            ));
                            return Ok(MigrationResult {
                                skill: Some(existing_skill),
                                report: LifecycleReport::from_parts(
                                    actions,
                                    vec![],
                                    failures,
                                    false,
                                )
                                .with_retryable(true),
                            });
                        }
                    }
                } else {
                    let (code, message) = match version_order {
                        Some(std::cmp::Ordering::Equal) => (
                            "already_managed_version_checked",
                            format!(
                                "Managed Skill exists with the same version {}; local copy will be replaced with a symlink",
                                source_version.as_deref().unwrap_or("unknown")
                            ),
                        ),
                        Some(std::cmp::Ordering::Less) => (
                            "already_managed_version_checked",
                            format!(
                                "Managed Skill version {} is newer than local version {}; local copy will be replaced with a symlink",
                                managed_version.as_deref().unwrap_or("unknown"),
                                source_version.as_deref().unwrap_or("unknown")
                            ),
                        ),
                        _ => (
                            "already_managed_content_matched",
                            "Managed Skill has identical contents; local copy will be replaced with a symlink".to_string(),
                        ),
                    };
                    actions.push(LifecycleAction {
                        action_type: "reuse_managed_copy".to_string(),
                        status: LifecycleActionStatus::Completed,
                        path: Some(actual_source.to_string_lossy().into_owned()),
                        target_path: Some(existing_skill.local_path.clone()),
                        skill_id: Some(skill_id.clone()),
                        skill_name: Some(existing_skill.name.clone()),
                        tool_id: None,
                        tool_name: None,
                    });
                    warnings.push(lifecycle_issue(
                        code,
                        &message,
                        Some(actual_source.to_string_lossy().into_owned()),
                        Some(existing_skill.local_path.clone()),
                        Some(skill_id.clone()),
                        Some(existing_skill.name.clone()),
                        None,
                    ));
                    existing_skill
                }
            }
            None => {
                // If the caller's path was already in the manager dir but no DB
                // row exists, that's an inconsistent state we can't silently fix.
                failures.push(lifecycle_issue(
                    "database_error",
                    &format!(
                        "Skill '{}' appears to live under the manager directory but is not registered in the database",
                        skill_id
                    ),
                    Some(actual_source.to_string_lossy().into_owned()),
                    None,
                    Some(skill_id.clone()),
                    None,
                    None,
                ));
                return Ok(MigrationResult {
                    skill: None,
                    report: LifecycleReport::from_parts(actions, vec![], failures, false)
                        .with_retryable(false),
                });
            }
        }
    } else {
        // First-time migration: copy into the manager directory.
        let name = actual_source
            .file_name()
            .and_then(|n| n.to_str())
            .unwrap_or(&skill_id)
            .to_string();

        let target_path = get_skills_dir().join(&skill_id);
        match SkillService::install_skill(db, &skill_id, &name, "local", None, &actual_source) {
            Ok(skill) => {
                actions.push(LifecycleAction {
                    action_type: "copy_to_managed".to_string(),
                    status: LifecycleActionStatus::Completed,
                    path: Some(actual_source.to_string_lossy().into_owned()),
                    target_path: Some(target_path.to_string_lossy().into_owned()),
                    skill_id: Some(skill_id.clone()),
                    skill_name: Some(skill.name.clone()),
                    tool_id: None,
                    tool_name: None,
                });
                skill
            }
            Err(error) => {
                let message = error.to_string();
                actions.push(LifecycleAction {
                    action_type: "copy_to_managed".to_string(),
                    status: LifecycleActionStatus::Failed,
                    path: Some(actual_source.to_string_lossy().into_owned()),
                    target_path: Some(target_path.to_string_lossy().into_owned()),
                    skill_id: Some(skill_id.clone()),
                    skill_name: Some(name),
                    tool_id: None,
                    tool_name: None,
                });
                failures.push(lifecycle_issue(
                    reason_code_from_message(&message),
                    &message,
                    Some(actual_source.to_string_lossy().into_owned()),
                    Some(target_path.to_string_lossy().into_owned()),
                    Some(skill_id.clone()),
                    None,
                    None,
                ));
                return Ok(MigrationResult {
                    skill: None,
                    report: LifecycleReport::from_parts(actions, vec![], failures, false)
                        .with_retryable(true),
                });
            }
        }
    };

    // Point the caller's agent directory at the managed copy via symlink.
    // Skip if the caller's location already resolves to the managed path
    // (avoid deleting the thing we're about to link to).
    let managed_target = PathBuf::from(&skill.local_path);
    let needs_relink = match resolve_symlink(&original_location) {
        Some(current) => current.canonicalize().ok() != managed_target.canonicalize().ok(),
        None => original_location.exists() || !is_symlink(&original_location),
    };

    if needs_relink {
        match replace_with_validated_symlink(&original_location, &managed_target) {
            Ok(()) => actions.push(LifecycleAction {
                action_type: "replace_original_with_symlink".to_string(),
                status: LifecycleActionStatus::Completed,
                path: Some(original_location.to_string_lossy().into_owned()),
                target_path: Some(managed_target.to_string_lossy().into_owned()),
                skill_id: Some(skill.id.clone()),
                skill_name: Some(skill.name.clone()),
                tool_id: None,
                tool_name: None,
            }),
            Err(message) => {
                actions.push(LifecycleAction {
                    action_type: "replace_original_with_symlink".to_string(),
                    status: LifecycleActionStatus::Failed,
                    path: Some(original_location.to_string_lossy().into_owned()),
                    target_path: Some(managed_target.to_string_lossy().into_owned()),
                    skill_id: Some(skill.id.clone()),
                    skill_name: Some(skill.name.clone()),
                    tool_id: None,
                    tool_name: None,
                });
                failures.push(lifecycle_issue(
                    reason_code_from_message(&message),
                    &format!(
                        "{}. Original preserved at {}; managed copy is at {}",
                        message,
                        original_location.display(),
                        managed_target.display()
                    ),
                    Some(original_location.to_string_lossy().into_owned()),
                    Some(managed_target.to_string_lossy().into_owned()),
                    Some(skill.id.clone()),
                    Some(skill.name.clone()),
                    None,
                ));
                return Ok(MigrationResult {
                    skill: Some(skill),
                    report: LifecycleReport::from_parts(actions, vec![], failures, false)
                        .with_retryable(true),
                });
            }
        }
    } else {
        actions.push(LifecycleAction {
            action_type: "replace_original_with_symlink".to_string(),
            status: LifecycleActionStatus::Skipped,
            path: Some(original_location.to_string_lossy().into_owned()),
            target_path: Some(managed_target.to_string_lossy().into_owned()),
            skill_id: Some(skill.id.clone()),
            skill_name: Some(skill.name.clone()),
            tool_id: None,
            tool_name: None,
        });
    }

    let result = LinkService::set_all_detected_tool_links_result(db, &skill.id, true)
        .map_err(|e| e.to_string())?;
    for success in &result.success_tools {
        actions.push(LifecycleAction {
            action_type: "sync_tool_link".to_string(),
            status: LifecycleActionStatus::Completed,
            path: None,
            target_path: None,
            skill_id: Some(skill.id.clone()),
            skill_name: Some(skill.name.clone()),
            tool_id: Some(success.tool_id.clone()),
            tool_name: Some(success.tool_name.clone()),
        });
    }
    let had_sync_failures = result.failure_count > 0;
    if had_sync_failures {
        let sync_failure_messages: Vec<String> = result
            .failed_tools
            .iter()
            .map(|f| format!("{} ({})", f.tool_name, f.reason))
            .collect();
        eprintln!(
            "Sync failed for skill '{}': {} tool(s) could not be linked: {}",
            skill.name,
            result.failure_count,
            sync_failure_messages.join(", ")
        );
        for failure in &result.failed_tools {
            actions.push(LifecycleAction {
                action_type: "sync_tool_link".to_string(),
                status: LifecycleActionStatus::Failed,
                path: failure.path.clone(),
                target_path: None,
                skill_id: Some(skill.id.clone()),
                skill_name: Some(skill.name.clone()),
                tool_id: Some(failure.tool_id.clone()),
                tool_name: Some(failure.tool_name.clone()),
            });
        }
        for failure in result.failed_tools {
            push_sync_issue(&mut failures, &skill, failure);
        }
    }

    Ok(MigrationResult {
        skill: Some(skill),
        report: LifecycleReport::from_parts(actions, warnings, failures, false)
            .with_retryable(had_sync_failures),
    })
}

fn lifecycle_issue(
    code: &str,
    message: &str,
    path: Option<String>,
    target_path: Option<String>,
    skill_id: Option<String>,
    skill_name: Option<String>,
    tool_id: Option<String>,
) -> LifecycleIssue {
    LifecycleIssue {
        code: code.to_string(),
        message: message.to_string(),
        path,
        target_path,
        skill_id,
        skill_name,
        tool_id,
        tool_name: None,
    }
}

fn push_sync_issue(
    failures: &mut Vec<LifecycleIssue>,
    skill: &Skill,
    failure: crate::models::SyncFailureItem,
) {
    failures.push(LifecycleIssue {
        code: failure.reason_code,
        message: failure.reason,
        path: failure.path,
        target_path: None,
        skill_id: Some(skill.id.clone()),
        skill_name: Some(skill.name.clone()),
        tool_id: Some(failure.tool_id),
        tool_name: Some(failure.tool_name),
    });
}

fn reason_code_from_message(message: &str) -> &str {
    let lower = message.to_lowercase();
    if lower.contains("permission denied") {
        "permission_denied"
    } else if lower.contains("already exists") || lower.contains("conflict") {
        "conflict"
    } else if lower.contains("no such file") || lower.contains("not found") {
        "path_missing"
    } else {
        "filesystem_error"
    }
}

#[tauri::command]
pub async fn preflight_migrate_local_skill(
    db: State<'_, std::sync::Mutex<Database>>,
    source_path: String,
    skill_id: String,
) -> Result<MigrationPreflight, String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    SkillService::preflight_migration(&db, &skill_id, Path::new(&source_path), &get_skills_dir())
        .map_err(|e| e.to_string())
}

#[cfg(test)]
mod tests {
    use super::{
        migrate_local_skill_with_db, replace_with_validated_symlink,
        replace_with_validated_symlink_impl,
    };
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
    fn safe_replace_creates_validated_symlink_after_removing_original() {
        let root = unique_test_dir("safe-replace-success");
        let original = root.join("tool").join("skills").join("alpha");
        let managed = root.join("managed").join("alpha");
        fs::create_dir_all(&original).expect("create original");
        fs::write(original.join("SKILL.md"), "---\nname: Local\n---\n").expect("write original");
        fs::create_dir_all(&managed).expect("create managed");
        fs::write(managed.join("SKILL.md"), "---\nname: Managed\n---\n").expect("write managed");

        replace_with_validated_symlink(&original, &managed).expect("replace with symlink");

        assert!(is_symlink(&original));
        assert!(original.join("SKILL.md").exists());

        fs::remove_dir_all(root).ok();
    }

    #[test]
    fn safe_replace_preserves_original_when_symlink_creation_fails() {
        let root = unique_test_dir("safe-replace-fail");
        let original = root.join("alpha");
        let managed = root.join("missing").join("alpha");
        fs::create_dir_all(&original).expect("create original");
        fs::write(original.join("SKILL.md"), "---\nname: Local\n---\n").expect("write original");

        let err = replace_with_validated_symlink(&original, &managed)
            .expect_err("replacement should fail verification");

        assert!(err.contains("Managed target cannot be resolved"));
        assert!(original.is_dir());
        assert!(!is_symlink(&original));
        assert!(original.join("SKILL.md").exists());

        fs::remove_dir_all(root).ok();
    }

    #[test]
    fn safe_replace_restores_original_when_install_rename_fails() {
        let root = unique_test_dir("safe-replace-install-rename-fail");
        let original = root.join("tool").join("skills").join("alpha");
        let managed = root.join("managed").join("alpha");
        fs::create_dir_all(&original).expect("create original");
        fs::write(original.join("SKILL.md"), "---\nname: Local\n---\n").expect("write original");
        fs::create_dir_all(&managed).expect("create managed");
        fs::write(managed.join("SKILL.md"), "---\nname: Managed\n---\n").expect("write managed");
        let mut rename_calls = 0;

        let err = replace_with_validated_symlink_impl(&original, &managed, |from, to| {
            rename_calls += 1;
            if rename_calls == 2 {
                return Err(std::io::Error::new(
                    std::io::ErrorKind::PermissionDenied,
                    "simulated install rename failure",
                ));
            }
            fs::rename(from, to)
        })
        .expect_err("install rename should fail");

        assert!(err.contains("original path was restored"));
        assert!(original.is_dir());
        assert!(!is_symlink(&original));
        assert!(fs::read_to_string(original.join("SKILL.md"))
            .expect("read restored original")
            .contains("Local"));
        assert!(!root
            .join("tool")
            .join("skills")
            .join(".alpha.prot-skills-original-tmp")
            .exists());
        assert!(!root
            .join("tool")
            .join("skills")
            .join(".alpha.prot-skills-link-tmp")
            .exists());

        fs::remove_dir_all(root).ok();
    }

    #[test]
    fn migrate_existing_managed_skill_uses_newer_local_version_and_relinks_original() {
        let root = unique_test_dir("migrate-newer-local-version");
        let skills_dir = root.join("managed");
        let managed_source = root.join("managed-source").join("alpha");
        let local_source = root.join("tool").join("skills").join("alpha");
        fs::create_dir_all(&managed_source).expect("create managed source");
        fs::write(
            managed_source.join("SKILL.md"),
            "---\nname: Alpha\nversion: 1.0.0\n---\nold\n",
        )
        .expect("write managed source");
        fs::create_dir_all(&local_source).expect("create local source");
        fs::write(
            local_source.join("SKILL.md"),
            "---\nname: Alpha\nversion: 1.2.0\n---\nnew\n",
        )
        .expect("write local source");

        let db = Database::new(root.join("metadata.db")).expect("create db");
        SkillService::install_skill_into_dir(
            &db,
            "alpha",
            "Alpha",
            "local",
            None,
            &managed_source,
            &skills_dir,
        )
        .expect("install managed alpha");

        let result = migrate_local_skill_with_db(
            &db,
            local_source.to_string_lossy().into_owned(),
            "alpha".to_string(),
        )
        .expect("migrate duplicate");

        assert_eq!(
            result.report.status,
            crate::models::LifecycleReportStatus::Success
        );
        assert!(result.report.actions.iter().any(|action| {
            action.action_type == "replace_managed_with_newer_local"
                && action.status == crate::models::LifecycleActionStatus::Completed
        }));
        assert!(is_symlink(&local_source));
        assert!(
            fs::read_to_string(skills_dir.join("alpha").join("SKILL.md"))
                .expect("read managed skill")
                .contains("version: 1.2.0")
        );

        fs::remove_dir_all(root).ok();
    }

    #[test]
    fn migrate_existing_managed_skill_keeps_newer_managed_version_and_relinks_original() {
        let root = unique_test_dir("migrate-newer-managed-version");
        let skills_dir = root.join("managed");
        let managed_source = root.join("managed-source").join("alpha");
        let local_source = root.join("tool").join("skills").join("alpha");
        fs::create_dir_all(&managed_source).expect("create managed source");
        fs::write(
            managed_source.join("SKILL.md"),
            "---\nname: Alpha\nversion: 2.0.0\n---\nnewer managed\n",
        )
        .expect("write managed source");
        fs::create_dir_all(&local_source).expect("create local source");
        fs::write(
            local_source.join("SKILL.md"),
            "---\nname: Alpha\nversion: 1.0.0\n---\nolder local\n",
        )
        .expect("write local source");

        let db = Database::new(root.join("metadata.db")).expect("create db");
        SkillService::install_skill_into_dir(
            &db,
            "alpha",
            "Alpha",
            "local",
            None,
            &managed_source,
            &skills_dir,
        )
        .expect("install managed alpha");

        let result = migrate_local_skill_with_db(
            &db,
            local_source.to_string_lossy().into_owned(),
            "alpha".to_string(),
        )
        .expect("migrate duplicate");

        assert_eq!(
            result.report.status,
            crate::models::LifecycleReportStatus::Success
        );
        assert!(result.report.warnings.iter().any(|warning| {
            warning.code == "already_managed_version_checked"
                && warning
                    .message
                    .contains("Managed Skill version 2.0.0 is newer")
        }));
        assert!(is_symlink(&local_source));
        assert!(
            fs::read_to_string(skills_dir.join("alpha").join("SKILL.md"))
                .expect("read managed skill")
                .contains("version: 2.0.0")
        );

        fs::remove_dir_all(root).ok();
    }

    #[test]
    fn migrate_existing_managed_skill_reads_version_from_file_when_metadata_is_missing() {
        let root = unique_test_dir("migrate-managed-version-metadata-fallback");
        let skills_dir = root.join("managed");
        let managed_source = root.join("managed-source").join("alpha");
        let local_source = root.join("tool").join("skills").join("alpha");
        fs::create_dir_all(&managed_source).expect("create managed source");
        fs::write(
            managed_source.join("SKILL.md"),
            "---\nname: Alpha\nversion: 2.0.0\n---\nnewer managed\n",
        )
        .expect("write managed source");
        fs::create_dir_all(&local_source).expect("create local source");
        fs::write(
            local_source.join("SKILL.md"),
            "---\nname: Alpha\nversion: 1.0.0\n---\nolder local\n",
        )
        .expect("write local source");

        let db = Database::new(root.join("metadata.db")).expect("create db");
        SkillService::install_skill_into_dir(
            &db,
            "alpha",
            "Alpha",
            "local",
            None,
            &managed_source,
            &skills_dir,
        )
        .expect("install managed alpha");
        db.get_connection()
            .execute("UPDATE skills SET metadata = NULL WHERE id = 'alpha'", [])
            .expect("clear metadata");

        let result = migrate_local_skill_with_db(
            &db,
            local_source.to_string_lossy().into_owned(),
            "alpha".to_string(),
        )
        .expect("migrate duplicate");

        assert_eq!(
            result.report.status,
            crate::models::LifecycleReportStatus::Success
        );
        assert!(result.report.warnings.iter().any(|warning| {
            warning.code == "already_managed_version_checked"
                && warning
                    .message
                    .contains("Managed Skill version 2.0.0 is newer")
        }));
        assert!(is_symlink(&local_source));
        assert!(
            fs::read_to_string(skills_dir.join("alpha").join("SKILL.md"))
                .expect("read managed skill")
                .contains("version: 2.0.0")
        );

        fs::remove_dir_all(root).ok();
    }

    #[test]
    fn migrate_existing_managed_skill_relinks_unversioned_matching_contents() {
        let root = unique_test_dir("migrate-unversioned-matching-content");
        let skills_dir = root.join("managed");
        let managed_source = root.join("managed-source").join("alpha");
        let local_source = root.join("tool").join("skills").join("alpha");
        fs::create_dir_all(&managed_source).expect("create managed source");
        fs::write(
            managed_source.join("SKILL.md"),
            "---\nname: Alpha\n---\nmatching body\n",
        )
        .expect("write managed source");
        fs::create_dir_all(&local_source).expect("create local source");
        fs::write(
            local_source.join("SKILL.md"),
            "---\nname: Alpha\n---\nmatching body\n",
        )
        .expect("write local source");

        let db = Database::new(root.join("metadata.db")).expect("create db");
        SkillService::install_skill_into_dir(
            &db,
            "alpha",
            "Alpha",
            "local",
            None,
            &managed_source,
            &skills_dir,
        )
        .expect("install managed alpha");

        let result = migrate_local_skill_with_db(
            &db,
            local_source.to_string_lossy().into_owned(),
            "alpha".to_string(),
        )
        .expect("migrate duplicate");

        assert_eq!(
            result.report.status,
            crate::models::LifecycleReportStatus::Success
        );
        assert!(result.report.warnings.iter().any(|warning| {
            warning.code == "already_managed_content_matched"
                && warning.message.contains("identical contents")
        }));
        assert!(is_symlink(&local_source));
        assert!(
            fs::read_to_string(skills_dir.join("alpha").join("SKILL.md"))
                .expect("read managed skill")
                .contains("matching body")
        );

        fs::remove_dir_all(root).ok();
    }
}
