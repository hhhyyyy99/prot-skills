use crate::db::Database;
use crate::error::{AppError, AppResult};
use crate::models::{
    AITool, Skill, SkillLink, SyncFailureItem, SyncSkillTargetsResult, SyncSuccessItem,
};
use crate::services::{SkillService, ToolService};
use crate::utils::is_symlink;
use std::fs;
use std::io::ErrorKind;
use std::path::{Path, PathBuf};

pub struct LinkService;

impl LinkService {
    fn remove_link_strict(db: &Database, skill_id: &str, tool_id: &str) -> AppResult<()> {
        let existing_link = Self::get_link(db, skill_id, tool_id)?;

        if let Some(link) = existing_link {
            let p = Path::new(&link.link_path);
            if p.exists() || is_symlink(p) {
                if is_symlink(p) {
                    fs::remove_file(p)?;
                } else if p.is_dir() {
                    fs::remove_dir_all(p)?;
                } else {
                    fs::remove_file(p)?;
                }
            }

            let conn = db.get_connection();
            conn.execute(
                "DELETE FROM skill_links WHERE skill_id = ?1 AND tool_id = ?2",
                rusqlite::params![skill_id, tool_id],
            )?;

            return Ok(());
        }

        Ok(())
    }

    fn map_sync_error(error: &AppError) -> (&'static str, &'static str) {
        match error {
            AppError::Io(io_error) if io_error.kind() == ErrorKind::PermissionDenied => {
                ("permission_denied", "No write permission")
            }
            AppError::Path(message) if message.contains("does not exist") => {
                ("path_missing", "Tool directory does not exist")
            }
            AppError::Path(message) if message.contains("disabled") => {
                ("tool_disabled", "Tool is disabled")
            }
            AppError::Path(message) if message.contains("not detected") => {
                ("tool_not_detected", "Tool is not detected")
            }
            _ => ("unknown", "Unknown sync error"),
        }
    }

    fn build_failure(tool: &AITool, error: &AppError) -> SyncFailureItem {
        let (reason_code, reason) = Self::map_sync_error(error);

        SyncFailureItem {
            tool_id: tool.id.to_string(),
            tool_name: tool.name.to_string(),
            reason_code: reason_code.to_string(),
            reason: reason.to_string(),
        }
    }

    pub fn create_link(db: &Database, skill: &Skill, tool: &AITool) -> AppResult<SkillLink> {
        let skills_path: PathBuf = tool.skills_path();
        let link_path: PathBuf = skills_path.join(&skill.id);

        // Ensure parent directory exists. Any IO error propagates as AppError::Io
        // with a real message (not the misleading rusqlite ExecuteReturnedResults).
        fs::create_dir_all(&skills_path)?;

        // Remove existing target if present (stale symlink or real file/dir).
        if link_path.exists() || is_symlink(&link_path) {
            if is_symlink(&link_path) {
                fs::remove_file(&link_path).ok();
            } else if link_path.is_dir() {
                fs::remove_dir_all(&link_path).ok();
            } else {
                fs::remove_file(&link_path).ok();
            }
        }

        // Create symlink pointing to the managed skill body.
        #[cfg(unix)]
        {
            std::os::unix::fs::symlink(&skill.local_path, &link_path)?;
        }
        #[cfg(windows)]
        {
            // 在 Windows 上 symlink_dir 需要管理员权限；失败时记录错误但不中断整个流程。
            if let Err(e) = std::os::windows::fs::symlink_dir(&skill.local_path, &link_path) {
                return Err(AppError::Io(e));
            }
        }

        // Record in database.
        let conn = db.get_connection();
        let link_path_str = link_path.to_string_lossy().into_owned();
        conn.execute(
            "INSERT OR REPLACE INTO skill_links (skill_id, tool_id, link_path, is_active)
             VALUES (?1, ?2, ?3, 1)",
            rusqlite::params![skill.id, tool.id, link_path_str],
        )?;

        Self::get_link(db, &skill.id, &tool.id)?.ok_or_else(|| {
            AppError::NotFound(format!("link for skill={} tool={}", skill.id, tool.id))
        })
    }

    pub fn remove_link(db: &Database, skill_id: &str, tool_id: &str) -> AppResult<()> {
        if let Some(link) = Self::get_link(db, skill_id, tool_id)? {
            let p = Path::new(&link.link_path);
            if p.exists() || is_symlink(p) {
                if is_symlink(p) {
                    fs::remove_file(p).ok();
                } else if p.is_dir() {
                    fs::remove_dir_all(p).ok();
                } else {
                    fs::remove_file(p).ok();
                }
            }

            let conn = db.get_connection();
            conn.execute(
                "DELETE FROM skill_links WHERE skill_id = ?1 AND tool_id = ?2",
                rusqlite::params![skill_id, tool_id],
            )?;
        }
        Ok(())
    }

    pub fn get_link(db: &Database, skill_id: &str, tool_id: &str) -> AppResult<Option<SkillLink>> {
        let conn = db.get_connection();
        let mut stmt = conn.prepare(
            "SELECT id, skill_id, tool_id, link_path, is_active, created_at
             FROM skill_links WHERE skill_id = ?1 AND tool_id = ?2",
        )?;

        let mut links = stmt.query_map(rusqlite::params![skill_id, tool_id], |row| {
            Ok(SkillLink {
                id: row.get(0)?,
                skill_id: row.get(1)?,
                tool_id: row.get(2)?,
                link_path: row.get(3)?,
                is_active: row.get(4)?,
                created_at: row.get(5)?,
            })
        })?;

        match links.next() {
            Some(r) => Ok(Some(r?)),
            None => Ok(None),
        }
    }

    pub fn get_links_for_skill(db: &Database, skill_id: &str) -> AppResult<Vec<SkillLink>> {
        let conn = db.get_connection();
        let mut stmt = conn.prepare(
            "SELECT id, skill_id, tool_id, link_path, is_active, created_at
             FROM skill_links WHERE skill_id = ?1 ORDER BY tool_id",
        )?;

        let links = stmt
            .query_map([skill_id], |row| {
                Ok(SkillLink {
                    id: row.get(0)?,
                    skill_id: row.get(1)?,
                    tool_id: row.get(2)?,
                    link_path: row.get(3)?,
                    is_active: row.get(4)?,
                    created_at: row.get(5)?,
                })
            })?
            .collect::<Result<Vec<_>, _>>()?;

        Ok(links)
    }

    pub fn set_link_active(
        db: &Database,
        skill_id: &str,
        tool_id: &str,
        active: bool,
    ) -> AppResult<Option<SkillLink>> {
        if !active {
            Self::remove_link(db, skill_id, tool_id)?;
            return Ok(None);
        }

        let skill = SkillService::get_skill_by_id(db, skill_id)?
            .ok_or_else(|| AppError::NotFound(format!("skill {}", skill_id)))?;

        if !skill.is_enabled {
            return Err(AppError::Path(format!("skill {} is disabled", skill_id)));
        }

        let tool = ToolService::get_all_tools(db)?
            .into_iter()
            .find(|tool| tool.id == tool_id)
            .ok_or_else(|| AppError::NotFound(format!("tool {}", tool_id)))?;

        if !tool.is_enabled || !tool.is_detected {
            return Err(AppError::Path(format!(
                "{} is not enabled or detected",
                tool.name
            )));
        }

        Self::create_link(db, &skill, &tool).map(Some)
    }

    pub fn set_all_detected_tool_links(
        db: &Database,
        skill_id: &str,
        active: bool,
    ) -> AppResult<Vec<SkillLink>> {
        let skill = SkillService::get_skill_by_id(db, skill_id)?
            .ok_or_else(|| AppError::NotFound(format!("skill {}", skill_id)))?;

        let tools: Vec<AITool> = ToolService::get_all_tools(db)?
            .into_iter()
            .filter(|tool| tool.is_detected && tool.is_enabled)
            .collect();

        if !active {
            for tool in tools {
                Self::remove_link(db, skill_id, &tool.id)?;
            }
            return Self::get_links_for_skill(db, skill_id);
        }

        if !skill.is_enabled {
            return Err(AppError::Path(format!("skill {} is disabled", skill_id)));
        }

        for tool in tools {
            Self::create_link(db, &skill, &tool).ok();
        }

        Self::get_links_for_skill(db, skill_id)
    }

    pub fn set_all_detected_tool_links_result(
        db: &Database,
        skill_id: &str,
        active: bool,
    ) -> AppResult<SyncSkillTargetsResult> {
        let skill = SkillService::get_skill_by_id(db, skill_id)?
            .ok_or_else(|| AppError::NotFound(format!("skill {}", skill_id)))?;

        let tools: Vec<AITool> = ToolService::get_all_tools(db)?
            .into_iter()
            .filter(|tool| tool.is_detected && tool.is_enabled)
            .collect();

        if active && !skill.is_enabled {
            return Err(AppError::Path(format!("skill {} is disabled", skill_id)));
        }

        let mut success_tools = Vec::with_capacity(tools.len());
        let mut failed_tools = Vec::new();

        for tool in tools {
            if active {
                match Self::create_link(db, &skill, &tool) {
                    Ok(_) => success_tools.push(SyncSuccessItem {
                        tool_id: tool.id.clone(),
                        tool_name: tool.name.clone(),
                    }),
                    Err(error) => failed_tools.push(Self::build_failure(&tool, &error)),
                }
            } else {
                match Self::remove_link_strict(db, skill_id, &tool.id) {
                    Ok(()) => success_tools.push(SyncSuccessItem {
                        tool_id: tool.id.clone(),
                        tool_name: tool.name.clone(),
                    }),
                    Err(error) => failed_tools.push(Self::build_failure(&tool, &error)),
                }
            }
        }

        Ok(SyncSkillTargetsResult::new(success_tools, failed_tools))
    }

    pub fn sync_skill_links(db: &Database, skill_id: &str) -> AppResult<()> {
        let skill = SkillService::get_skill_by_id(db, skill_id)?
            .ok_or_else(|| AppError::NotFound(format!("skill {}", skill_id)))?;

        if !skill.is_enabled {
            let conn = db.get_connection();
            let mut stmt = conn.prepare("SELECT tool_id FROM skill_links WHERE skill_id = ?1")?;
            let tool_ids: Vec<String> = stmt
                .query_map([skill_id], |row| row.get::<_, String>(0))?
                .collect::<Result<Vec<_>, _>>()?;

            for tool_id in tool_ids {
                Self::remove_link(db, skill_id, &tool_id)?;
            }
        }

        Ok(())
    }

    pub fn sync_tool_links(db: &Database, tool_id: &str) -> AppResult<()> {
        let tool = ToolService::get_all_tools(db)?
            .into_iter()
            .find(|t| t.id == tool_id)
            .ok_or_else(|| AppError::NotFound(format!("tool {}", tool_id)))?;

        // 主动校验 config_path：如果工具未检测到或路径不存在，直接给出明确错误，
        // 而不是让 fs::create_dir_all 去踩雷并产生晦涩的 IO 错误。
        if !tool.is_enabled {
            // 关闭该工具：清理现有 link，不再创建。
            let conn = db.get_connection();
            let mut stmt = conn.prepare("SELECT skill_id FROM skill_links WHERE tool_id = ?1")?;
            let skill_ids: Vec<String> = stmt
                .query_map([tool_id], |row| row.get::<_, String>(0))?
                .collect::<Result<Vec<_>, _>>()?;
            for skill_id in skill_ids {
                Self::remove_link(db, &skill_id, tool_id)?;
            }
            return Ok(());
        }

        if !tool.is_detected {
            return Err(AppError::Path(format!(
                "{} is not detected. Scan tools on the Tools page or set a custom path before enabling.",
                tool.name
            )));
        }

        let config_root = crate::utils::expand_path(&tool.config_path);
        if !config_root.exists() {
            return Err(AppError::Path(format!(
                "config path does not exist: {}",
                config_root.display()
            )));
        }

        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::LinkService;
    use crate::db::Database;
    use crate::models::SyncResultStatus;
    use crate::services::{SkillService, ToolService};
    use std::fs;
    #[cfg(unix)]
    use std::os::unix::fs::PermissionsExt;
    use std::time::{SystemTime, UNIX_EPOCH};

    fn unique_test_dir(name: &str) -> std::path::PathBuf {
        let nonce = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .expect("system time before Unix epoch")
            .as_nanos();
        std::env::temp_dir().join(format!("prot-skills-{name}-{nonce}"))
    }

    #[cfg(unix)]
    fn set_dir_mode(path: &std::path::Path, mode: u32) {
        let permissions = fs::Permissions::from_mode(mode);
        fs::set_permissions(path, permissions).expect("set directory permissions");
    }

    #[test]
    fn bulk_link_targets_all_detected_enabled_tools() {
        let root = unique_test_dir("bulk-link");
        let source = root.join("source-skill");
        let claude = root.join("claude");
        let codex = root.join("codex");
        fs::create_dir_all(&source).expect("create source skill");
        fs::write(source.join("SKILL.md"), "---\nname: Alpha\n---\n").expect("write skill file");
        fs::create_dir_all(&claude).expect("create claude config");
        fs::create_dir_all(&codex).expect("create codex config");
        let db = Database::new(root.join("metadata.db")).expect("create test database");

        let skill = SkillService::install_skill(&db, "alpha", "Alpha", "local", None, &source)
            .expect("install skill");
        ToolService::add_tool(
            &db,
            "claude",
            "Claude",
            claude.to_str().expect("claude path"),
        )
        .expect("add claude");
        ToolService::add_tool(&db, "codex", "Codex", codex.to_str().expect("codex path"))
            .expect("add codex");

        let links =
            LinkService::set_all_detected_tool_links(&db, &skill.id, true).expect("link all tools");
        let mut ids: Vec<_> = links.iter().map(|link| link.tool_id.as_str()).collect();
        ids.sort_unstable();

        assert_eq!(ids, vec!["claude", "codex"]);
        assert!(claude.join("skills").join("alpha").exists());
        assert!(codex.join("skills").join("alpha").exists());

        let links = LinkService::set_all_detected_tool_links(&db, &skill.id, false)
            .expect("unlink all tools");

        assert!(links.is_empty());
        assert!(!claude.join("skills").join("alpha").exists());
        assert!(!codex.join("skills").join("alpha").exists());

        fs::remove_dir_all(root).ok();
    }

    #[cfg(unix)]
    #[test]
    fn bulk_sync_returns_partial_when_one_tool_write_fails() {
        let root = unique_test_dir("bulk-link-partial");
        let source = root.join("source-skill");
        let claude = root.join("claude");
        let codex = root.join("codex");
        let codex_skills = codex.join("skills");
        fs::create_dir_all(&source).expect("create source skill");
        fs::write(source.join("SKILL.md"), "---\nname: Alpha\n---\n").expect("write skill file");
        fs::create_dir_all(&claude).expect("create claude config");
        fs::create_dir_all(&codex_skills).expect("create codex skills");
        let db = Database::new(root.join("metadata.db")).expect("create test database");

        let skill = SkillService::install_skill(&db, "alpha", "Alpha", "local", None, &source)
            .expect("install skill");
        ToolService::add_tool(
            &db,
            "claude",
            "Claude",
            claude.to_str().expect("claude path"),
        )
        .expect("add claude");
        ToolService::add_tool(&db, "codex", "Codex", codex.to_str().expect("codex path"))
            .expect("add codex");

        set_dir_mode(&codex_skills, 0o555);

        let result = LinkService::set_all_detected_tool_links_result(&db, &skill.id, true)
            .expect("bulk sync result");

        set_dir_mode(&codex_skills, 0o755);

        assert_eq!(result.status, SyncResultStatus::Partial);
        assert_eq!(result.success_count, 1);
        assert_eq!(result.failure_count, 1);
        assert_eq!(result.success_tools.len(), 1);
        assert_eq!(result.failed_tools.len(), 1);
        assert_eq!(result.success_tools[0].tool_id, "claude");
        assert_eq!(result.success_tools[0].tool_name, "Claude");
        assert_eq!(result.failed_tools[0].tool_id, "codex");
        assert_eq!(result.failed_tools[0].tool_name, "Codex");
        assert_eq!(result.failed_tools[0].reason_code, "permission_denied");
        assert_eq!(result.failed_tools[0].reason, "No write permission");
        assert!(claude.join("skills").join("alpha").exists());
        assert!(!codex.join("skills").join("alpha").exists());

        fs::remove_dir_all(root).ok();
    }

    #[cfg(unix)]
    #[test]
    fn bulk_sync_returns_failed_when_all_tool_writes_fail() {
        let root = unique_test_dir("bulk-link-failed");
        let source = root.join("source-skill");
        let claude = root.join("claude");
        let codex = root.join("codex");
        let claude_skills = claude.join("skills");
        let codex_skills = codex.join("skills");
        fs::create_dir_all(&source).expect("create source skill");
        fs::write(source.join("SKILL.md"), "---\nname: Alpha\n---\n").expect("write skill file");
        fs::create_dir_all(&claude_skills).expect("create claude skills");
        fs::create_dir_all(&codex_skills).expect("create codex skills");
        let db = Database::new(root.join("metadata.db")).expect("create test database");

        let skill = SkillService::install_skill(&db, "alpha", "Alpha", "local", None, &source)
            .expect("install skill");
        ToolService::add_tool(
            &db,
            "claude",
            "Claude",
            claude.to_str().expect("claude path"),
        )
        .expect("add claude");
        ToolService::add_tool(&db, "codex", "Codex", codex.to_str().expect("codex path"))
            .expect("add codex");

        set_dir_mode(&claude_skills, 0o555);
        set_dir_mode(&codex_skills, 0o555);

        let result = LinkService::set_all_detected_tool_links_result(&db, &skill.id, true)
            .expect("bulk sync result");

        set_dir_mode(&claude_skills, 0o755);
        set_dir_mode(&codex_skills, 0o755);

        assert_eq!(result.status, SyncResultStatus::Failed);
        assert_eq!(result.success_count, 0);
        assert_eq!(result.failure_count, 2);
        assert!(result.success_tools.is_empty());
        assert_eq!(result.failed_tools.len(), 2);
        assert!(result
            .failed_tools
            .iter()
            .all(|failure| failure.reason_code == "permission_denied"));
        assert!(result
            .failed_tools
            .iter()
            .all(|failure| failure.reason == "No write permission"));
        assert!(result
            .failed_tools
            .iter()
            .all(|failure| failure.tool_name == "Claude" || failure.tool_name == "Codex"));
        assert!(!claude.join("skills").join("alpha").exists());
        assert!(!codex.join("skills").join("alpha").exists());

        fs::remove_dir_all(root).ok();
    }
}
