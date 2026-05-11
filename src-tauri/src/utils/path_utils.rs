use std::path::{Path, PathBuf};

pub fn get_home_dir() -> PathBuf {
    dirs::home_dir().expect("Failed to get home directory")
}

pub fn get_manager_dir() -> PathBuf {
    get_home_dir().join(".ai-skills-manager")
}

pub fn get_skills_dir() -> PathBuf {
    get_manager_dir().join("skills")
}

pub fn get_default_tool_config_path(tool_id: &str) -> Option<PathBuf> {
    let home = get_home_dir();
    match tool_id {
        "cursor" => Some(home.join(".cursor")),
        "trae" => Some(home.join(".trae")),
        "claude" => Some(home.join(".claude")),
        "kiro" => Some(home.join(".kiro")),
        "codex" => Some(home.join(".codex")),
        "opencode" => Some(home.join(".opencode")),
        "windsurf" => Some(home.join(".windsurf")),
        "aider" => Some(home.join(".aider")),
        "continue" => Some(home.join(".continue")),
        "codeium" => Some(home.join(".codeium")),
        _ => None,
    }
}

pub fn resolve_symlink(path: &Path) -> Option<PathBuf> {
    if let Ok(target) = std::fs::read_link(path) {
        if target.is_absolute() {
            Some(target)
        } else {
            Some(path.parent()?.join(target))
        }
    } else {
        None
    }
}

pub fn is_symlink(path: &Path) -> bool {
    std::fs::symlink_metadata(path)
        .map(|m| m.file_type().is_symlink())
        .unwrap_or(false)
}

pub fn is_in_manager_dir(path: &Path) -> bool {
    let manager_dir = get_manager_dir();
    path.starts_with(&manager_dir)
}
