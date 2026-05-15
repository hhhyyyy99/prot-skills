use crate::db::Database;
use crate::models::{LocalSkill, Skill, SkillLink};
use crate::services::{DiscoveryService, LinkService, SkillService};
use crate::utils::{get_skills_dir, is_in_manager_dir, is_symlink, resolve_symlink};
use std::fs;
use std::path::{Path, PathBuf};
use tauri::State;

#[tauri::command]
pub fn get_skills_dir_path() -> Result<String, String> {
    Ok(get_skills_dir().to_string_lossy().into_owned())
}

#[tauri::command]
pub fn get_skills(db: State<std::sync::Mutex<Database>>) -> Result<Vec<Skill>, String> {
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
            LinkService::set_all_detected_tool_links(&db, &skill.id, true)
                .map_err(|e| e.to_string())?;
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
) -> Result<(), String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    SkillService::uninstall_skill(&db, &skill_id).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_skill_links(
    db: State<std::sync::Mutex<Database>>,
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
pub fn set_all_skill_tool_links(
    db: State<std::sync::Mutex<Database>>,
    skill_id: String,
    active: bool,
) -> Result<Vec<SkillLink>, String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    LinkService::set_all_detected_tool_links(&db, &skill_id, active).map_err(|e| e.to_string())
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
pub fn scan_local_skills(
    db: State<std::sync::Mutex<Database>>,
    tool_id: String,
) -> Result<Vec<LocalSkill>, String> {
    let db = db.lock().map_err(|e| e.to_string())?;

    let tools = crate::services::ToolService::get_all_tools(&db).map_err(|e| e.to_string())?;

    let tool = tools
        .into_iter()
        .find(|t| t.id == tool_id)
        .ok_or("Tool not found")?;

    let skills_path = tool.skills_path();
    let skills = DiscoveryService::scan_directory(&skills_path, &db);

    Ok(skills)
}

#[tauri::command]
pub fn migrate_local_skill(
    db: State<std::sync::Mutex<Database>>,
    source_path: String,
    skill_id: String,
) -> Result<Skill, String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    let path = Path::new(&source_path);

    // Determine actual source and original location
    let (actual_source, original_location) = if is_symlink(path) {
        let target = resolve_symlink(path).ok_or("Cannot resolve symlink")?;
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
    let existing = SkillService::get_skill_by_id(&db, &skill_id).map_err(|e| e.to_string())?;

    let already_managed = existing
        .as_ref()
        .map(|s| is_in_manager_dir(Path::new(&s.local_path)))
        .unwrap_or(false)
        || is_in_manager_dir(&actual_source);

    let skill = if already_managed {
        // Reuse the existing managed skill; don't copy again.
        existing.ok_or_else(|| {
            // If the caller's path was already in the manager dir but no DB
            // row exists, that's an inconsistent state we can't silently fix.
            format!(
                "Skill '{}' appears to live under the manager directory but \
                 is not registered in the database",
                skill_id
            )
        })?
    } else {
        // First-time migration: copy into the manager directory.
        let name = actual_source
            .file_name()
            .and_then(|n| n.to_str())
            .unwrap_or(&skill_id)
            .to_string();

        SkillService::install_skill(&db, &skill_id, &name, "local", None, &actual_source)
            .map_err(|e| e.to_string())?
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
        if original_location.exists() || is_symlink(&original_location) {
            if is_symlink(&original_location) || original_location.is_file() {
                fs::remove_file(&original_location).ok();
            } else if original_location.is_dir() {
                fs::remove_dir_all(&original_location).ok();
            }
        }

        if let Some(parent) = original_location.parent() {
            fs::create_dir_all(parent).ok();
        }

        #[cfg(unix)]
        {
            std::os::unix::fs::symlink(&managed_target, &original_location)
                .map_err(|e| format!("Failed to create symlink: {}", e))?;
        }
        #[cfg(windows)]
        {
            std::os::windows::fs::symlink_dir(&managed_target, &original_location)
                .map_err(|e| format!("Failed to create symlink: {}", e))?;
        }
    }

    LinkService::set_all_detected_tool_links(&db, &skill.id, true).map_err(|e| e.to_string())?;

    Ok(skill)
}
