use std::path::{Path, PathBuf};

pub fn get_home_dir() -> PathBuf {
    dirs::home_dir().expect("Failed to get home directory")
}

/// 将用户路径字符串展开为绝对 PathBuf。
/// 支持 `~` 与 `~/` 前缀，非 `~` 开头的直接原样返回。
pub fn expand_path(s: &str) -> PathBuf {
    if s == "~" {
        get_home_dir()
    } else if let Some(rest) = s.strip_prefix("~/") {
        get_home_dir().join(rest)
    } else {
        PathBuf::from(s)
    }
}

pub fn get_manager_dir() -> PathBuf {
    get_home_dir().join(".prot-skills")
}

pub fn get_skills_dir() -> PathBuf {
    get_manager_dir().join("skills")
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

#[cfg(test)]
mod tests {
    use super::{get_manager_dir, get_skills_dir};

    #[test]
    fn uses_prot_skills_as_manager_directory() {
        let manager_dir = get_manager_dir();

        assert_eq!(
            manager_dir.file_name().and_then(|name| name.to_str()),
            Some(".prot-skills")
        );
    }

    #[test]
    fn stores_skills_under_prot_skills_directory() {
        let skills_dir = get_skills_dir();

        assert_eq!(
            skills_dir.file_name().and_then(|name| name.to_str()),
            Some("skills")
        );
        assert_eq!(
            skills_dir
                .parent()
                .and_then(|parent| parent.file_name())
                .and_then(|name| name.to_str()),
            Some(".prot-skills")
        );
    }
}
