use crate::db::Database;
use crate::models::AITool;
use rusqlite::Result;
use std::path::Path;

pub struct ToolService;

struct ToolScanRule {
    id: &'static str,
    name: &'static str,
    config_dir: &'static str,
    skills_subdir: &'static str,
}

const BUILTIN_TOOL_RULES: &[ToolScanRule] = &[
    ToolScanRule {
        id: "cursor",
        name: "Cursor",
        config_dir: ".cursor",
        skills_subdir: "skills",
    },
    ToolScanRule {
        id: "trae",
        name: "Trae",
        config_dir: ".trae",
        skills_subdir: "skills",
    },
    ToolScanRule {
        id: "trae-cn",
        name: "Trae CN",
        config_dir: ".trae-cn",
        skills_subdir: "skills",
    },
    ToolScanRule {
        id: "claude",
        name: "Claude",
        config_dir: ".claude",
        skills_subdir: "skills",
    },
    ToolScanRule {
        id: "kiro",
        name: "Kiro",
        config_dir: ".kiro",
        skills_subdir: "skills",
    },
    ToolScanRule {
        id: "codex",
        name: "Codex",
        config_dir: ".codex",
        skills_subdir: "skills",
    },
    ToolScanRule {
        id: "opencode",
        name: "OpenCode",
        config_dir: ".opencode",
        skills_subdir: "skills",
    },
    ToolScanRule {
        id: "windsurf",
        name: "Windsurf",
        config_dir: ".windsurf",
        skills_subdir: "skills",
    },
    ToolScanRule {
        id: "aider",
        name: "Aider",
        config_dir: ".aider",
        skills_subdir: "skills",
    },
    ToolScanRule {
        id: "continue",
        name: "Continue",
        config_dir: ".continue",
        skills_subdir: "skills",
    },
    ToolScanRule {
        id: "codeium",
        name: "Codeium",
        config_dir: ".codeium",
        skills_subdir: "skills",
    },
];

impl ToolService {
    pub fn detect_tools(db: &Database) -> Result<Vec<AITool>> {
        let home = dirs::home_dir().expect("Failed to get home directory");
        Self::detect_tools_in_home(db, &home)
    }

    pub fn detect_tools_in_home(db: &Database, home: &Path) -> Result<Vec<AITool>> {
        let conn = db.get_connection();

        for rule in BUILTIN_TOOL_RULES {
            let config_path = home.join(rule.config_dir);
            if config_path.exists() {
                let config_path = config_path.to_string_lossy().into_owned();
                conn.execute(
                    "INSERT INTO ai_tools (id, name, config_path, skills_subdir, is_detected, is_enabled, detected_at)
                     VALUES (?1, ?2, ?3, ?4, 1, 1, CURRENT_TIMESTAMP)
                     ON CONFLICT(id) DO UPDATE SET
                        name = excluded.name,
                        config_path = excluded.config_path,
                        skills_subdir = excluded.skills_subdir,
                        is_detected = 1,
                        detected_at = CURRENT_TIMESTAMP",
                    rusqlite::params![rule.id, rule.name, config_path, rule.skills_subdir],
                )?;
            } else {
                conn.execute(
                    "DELETE FROM ai_tools WHERE id = ?1 AND custom_path IS NULL",
                    [rule.id],
                )?;
            }
        }

        let builtin_ids: Vec<&str> = BUILTIN_TOOL_RULES.iter().map(|rule| rule.id).collect();
        let mut stmt = conn.prepare("SELECT id, config_path FROM ai_tools")?;
        let rows = stmt.query_map([], |row| {
            Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?))
        })?;

        for row in rows {
            let (id, config_path) = row?;
            if builtin_ids.contains(&id.as_str()) {
                continue;
            }

            let is_detected = crate::utils::expand_path(&config_path).exists();
            conn.execute(
                "UPDATE ai_tools SET is_detected = ?1, detected_at = CASE WHEN ?1 = 1 THEN CURRENT_TIMESTAMP ELSE detected_at END WHERE id = ?2",
                rusqlite::params![if is_detected { 1 } else { 0 }, id],
            )?;
        }

        Self::get_all_tools(db)
    }

    pub fn get_all_tools(db: &Database) -> Result<Vec<AITool>> {
        let conn = db.get_connection();
        let mut stmt = conn.prepare(
            "SELECT id, name, config_path, skills_subdir, is_detected, is_enabled, detected_at, custom_path
             FROM ai_tools WHERE is_detected = 1 ORDER BY name"
        )?;

        let tools = stmt.query_map([], |row| {
            Ok(AITool {
                id: row.get(0)?,
                name: row.get(1)?,
                config_path: row.get(2)?,
                skills_subdir: row.get(3)?,
                is_detected: row.get(4)?,
                is_enabled: row.get(5)?,
                detected_at: row.get(6)?,
                custom_path: row.get(7)?,
            })
        })?;

        tools.collect()
    }

    pub fn toggle_tool(db: &Database, tool_id: &str, enabled: bool) -> Result<()> {
        let conn = db.get_connection();
        let enabled_i32 = if enabled { 1 } else { 0 };
        conn.execute(
            "UPDATE ai_tools SET is_enabled = ?1 WHERE id = ?2",
            rusqlite::params![enabled_i32, tool_id.to_string()],
        )?;
        Ok(())
    }

    pub fn update_tool_path(db: &Database, tool_id: &str, custom_path: &str) -> Result<()> {
        let conn = db.get_connection();
        conn.execute(
            "UPDATE ai_tools SET custom_path = ?1, config_path = ?1 WHERE id = ?2",
            rusqlite::params![custom_path.to_string(), tool_id.to_string()],
        )?;
        Ok(())
    }

    pub fn add_tool(db: &Database, id: &str, name: &str, config_path: &str) -> Result<()> {
        let conn = db.get_connection();
        let is_detected = crate::utils::expand_path(config_path).exists();
        conn.execute(
            "INSERT OR REPLACE INTO ai_tools (id, name, config_path, skills_subdir, is_detected, is_enabled, detected_at)
             VALUES (?1, ?2, ?3, 'skills', ?4, ?4, CASE WHEN ?4 = 1 THEN CURRENT_TIMESTAMP ELSE NULL END)",
            rusqlite::params![id.to_string(), name.to_string(), config_path.to_string(), if is_detected { 1 } else { 0 }],
        )?;
        Ok(())
    }

    pub fn delete_tool(db: &Database, tool_id: &str) -> Result<()> {
        let conn = db.get_connection();
        conn.execute("DELETE FROM ai_tools WHERE id = ?1", [tool_id])?;
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::ToolService;
    use crate::db::Database;
    use std::fs;
    use std::path::Path;
    use std::time::{SystemTime, UNIX_EPOCH};

    fn temp_dir(name: &str) -> std::path::PathBuf {
        let nonce = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .expect("system time before epoch")
            .as_nanos();
        std::env::temp_dir().join(format!("prot-skills-{name}-{nonce}"))
    }

    fn test_db(path: &Path) -> Database {
        fs::create_dir_all(path).expect("create test dir");
        Database::new(path.join("metadata.db")).expect("create test db")
    }

    #[test]
    fn detects_only_agent_tools_present_on_device() {
        let root = temp_dir("detect-present");
        let home = root.join("home");
        fs::create_dir_all(home.join(".cursor")).expect("create cursor config");
        let db = test_db(&root);

        let tools = ToolService::detect_tools_in_home(&db, &home).expect("detect tools");

        assert_eq!(tools.len(), 1);
        assert_eq!(tools[0].id, "cursor");
        assert_eq!(tools[0].name, "Cursor");
        assert_eq!(tools[0].config_path, home.join(".cursor").to_string_lossy());
        assert!(tools[0].is_detected);
        assert_eq!(tools[0].skills_subdir, "skills");
    }

    #[test]
    fn detects_trae_cn_agent_tool() {
        let root = temp_dir("detect-trae-cn");
        let home = root.join("home");
        fs::create_dir_all(home.join(".trae-cn")).expect("create trae cn config");
        let db = test_db(&root);

        let tools = ToolService::detect_tools_in_home(&db, &home).expect("detect tools");

        assert_eq!(tools.len(), 1);
        assert_eq!(tools[0].id, "trae-cn");
        assert_eq!(tools[0].name, "Trae CN");
        assert_eq!(
            tools[0].config_path,
            home.join(".trae-cn").to_string_lossy()
        );
        assert_eq!(tools[0].skills_subdir, "skills");
    }

    #[test]
    fn scan_removes_missing_tools_but_preserves_existing_custom_tools() {
        let root = temp_dir("preserve-custom");
        let home = root.join("home");
        let custom_path = root.join("custom-agent");
        fs::create_dir_all(home.join(".cursor")).expect("create cursor config");
        fs::create_dir_all(&custom_path).expect("create custom config");
        let db = test_db(&root);

        ToolService::add_tool(&db, "cursor", "Cursor", "/old/cursor").expect("seed stale cursor");
        ToolService::add_tool(&db, "claude", "Claude", "/old/claude").expect("seed stale claude");
        ToolService::add_tool(
            &db,
            "custom-agent",
            "Custom Agent",
            custom_path.to_str().expect("custom path"),
        )
        .expect("seed custom");
        ToolService::add_tool(&db, "missing-custom", "Missing Custom", "/missing/custom")
            .expect("seed missing custom");

        let tools = ToolService::detect_tools_in_home(&db, &home).expect("detect tools");
        let mut ids: Vec<_> = tools.iter().map(|tool| tool.id.as_str()).collect();
        ids.sort_unstable();

        assert_eq!(ids, vec!["cursor", "custom-agent"]);
        assert!(tools
            .iter()
            .any(|tool| tool.id == "custom-agent"
                && tool.config_path == custom_path.to_string_lossy()));
        assert!(!tools.iter().any(|tool| tool.id == "claude"));
        assert!(!tools.iter().any(|tool| tool.id == "missing-custom"));
    }
}
