use crate::db::Database;
use crate::models::AITool;
use crate::utils::get_default_tool_config_path;
use rusqlite::Result;

pub struct ToolService;

const DEFAULT_TOOLS: &[(&str, &str)] = &[
    ("cursor", "Cursor"),
    ("trae", "Trae"),
    ("claude", "Claude"),
    ("kiro", "Kiro"),
    ("codex", "Codex"),
    ("opencode", "OpenCode"),
    ("windsurf", "Windsurf"),
    ("aider", "Aider"),
    ("continue", "Continue"),
    ("codeium", "Codeium"),
];

impl ToolService {
    pub fn init_default_tools(db: &Database) -> Result<()> {
        let conn = db.get_connection();
        
        for (id, name) in DEFAULT_TOOLS {
            let config_path = format!("~/.{}", id);
            conn.execute(
                "INSERT OR IGNORE INTO ai_tools (id, name, config_path, skills_subdir, is_detected, is_enabled)
                 VALUES (?1, ?2, ?3, 'skills', 0, 0)",
                [id.to_string(), name.to_string(), config_path],
            )?;
        }
        
        Ok(())
    }

    pub fn detect_tools(db: &Database) -> Result<Vec<AITool>> {
        let conn = db.get_connection();
        let mut stmt = conn.prepare("SELECT id FROM ai_tools")?;
        let tool_ids: Vec<String> = stmt.query_map([], |row| {
            row.get::<_, String>(0)
        })?.collect::<Result<Vec<_>, _>>()?;

        for tool_id in &tool_ids {
            if let Some(default_path) = get_default_tool_config_path(tool_id) {
                let exists = default_path.exists();
                let exists_i32 = if exists { 1 } else { 0 };
                
                let path_str = default_path.to_str().unwrap_or("").to_string();
                conn.execute(
                    "UPDATE ai_tools SET 
                     is_detected = ?1,
                     detected_at = CASE WHEN ?1 = 1 THEN CURRENT_TIMESTAMP ELSE detected_at END,
                     config_path = ?2
                     WHERE id = ?3",
                    rusqlite::params![exists_i32, path_str, tool_id.to_string()],
                )?;
            }
        }

        Self::get_all_tools(db)
    }

    pub fn get_all_tools(db: &Database) -> Result<Vec<AITool>> {
        let conn = db.get_connection();
        let mut stmt = conn.prepare(
            "SELECT id, name, config_path, skills_subdir, is_detected, is_enabled, detected_at, custom_path
             FROM ai_tools ORDER BY name"
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
        conn.execute(
            "INSERT OR REPLACE INTO ai_tools (id, name, config_path, skills_subdir, is_detected, is_enabled)
             VALUES (?1, ?2, ?3, 'skills', 0, 0)",
            rusqlite::params![id.to_string(), name.to_string(), config_path.to_string()],
        )?;
        Ok(())
    }

    pub fn delete_tool(db: &Database, tool_id: &str) -> Result<()> {
        let conn = db.get_connection();
        conn.execute("DELETE FROM ai_tools WHERE id = ?1", [tool_id])?;
        Ok(())
    }
}
