use crate::db::Database;
use crate::models::{Skill, AITool, SkillLink};
use crate::services::{SkillService, ToolService};
use crate::utils::{is_symlink};
use rusqlite::Result;
use std::fs;
use std::path::Path;

pub struct LinkService;

impl LinkService {
    pub fn create_link(db: &Database, skill: &Skill, tool: &AITool) -> Result<SkillLink> {
        let skills_path = tool.skills_path();
        let link_path = format!("{}/{}", skills_path, skill.id);

        // Ensure parent directory exists
        fs::create_dir_all(&skills_path).map_err(|_| {
            rusqlite::Error::ExecuteReturnedResults
        })?;

        // Remove existing if exists
        if Path::new(&link_path).exists() {
            if is_symlink(Path::new(&link_path)) {
                fs::remove_file(&link_path).ok();
            } else {
                fs::remove_dir_all(&link_path).ok();
            }
        }

        // Create symlink
        #[cfg(unix)]
        {
            std::os::unix::fs::symlink(&skill.local_path, &link_path).map_err(|_| {
                rusqlite::Error::ExecuteReturnedResults
            })?;
        }

        // For Windows, we'd use std::os::windows::fs::symlink_dir
        #[cfg(windows)]
        {
            std::os::windows::fs::symlink_dir(&skill.local_path, &link_path).ok();
        }

        // Record in database
        let conn = db.get_connection();
        conn.execute(
            "INSERT OR REPLACE INTO skill_links (skill_id, tool_id, link_path, is_active)
             VALUES (?1, ?2, ?3, 1)",
            [&skill.id, &tool.id, &link_path],
        )?;

        Self::get_link(db, &skill.id, &tool.id)
            .map(|l| l.expect("Link should exist"))
    }

    pub fn remove_link(db: &Database, skill_id: &str, tool_id: &str) -> Result<()> {
        if let Some(link) = Self::get_link(db, skill_id, tool_id)? {
            // Remove filesystem symlink
            if Path::new(&link.link_path).exists() {
                if is_symlink(Path::new(&link.link_path)) {
                    fs::remove_file(&link.link_path).ok();
                } else {
                    fs::remove_dir_all(&link.link_path).ok();
                }
            }

            // Remove from database
            let conn = db.get_connection();
            conn.execute(
                "DELETE FROM skill_links WHERE skill_id = ?1 AND tool_id = ?2",
                [skill_id, tool_id],
            )?;
        }
        Ok(())
    }

    pub fn get_link(db: &Database, skill_id: &str, tool_id: &str) -> Result<Option<SkillLink>> {
        let conn = db.get_connection();
        let mut stmt = conn.prepare(
            "SELECT id, skill_id, tool_id, link_path, is_active, created_at
             FROM skill_links WHERE skill_id = ?1 AND tool_id = ?2"
        )?;

        let mut links = stmt.query_map([skill_id, tool_id], |row| {
            Ok(SkillLink {
                id: row.get(0)?,
                skill_id: row.get(1)?,
                tool_id: row.get(2)?,
                link_path: row.get(3)?,
                is_active: row.get(4)?,
                created_at: row.get(5)?,
            })
        })?;

        links.next().transpose()
    }

    pub fn sync_skill_links(db: &Database, skill_id: &str) -> Result<()> {
        let skill = SkillService::get_skill_by_id(db, skill_id)?
            .ok_or(rusqlite::Error::QueryReturnedNoRows)?;
        
        let tools = ToolService::get_all_tools(db)?;
        let enabled_tools: Vec<_> = tools.into_iter()
            .filter(|t| t.is_enabled)
            .collect();

        if skill.is_enabled {
            // Create links for all enabled tools
            for tool in enabled_tools {
                Self::create_link(db, &skill, &tool)?;
            }
        } else {
            // Remove all links for this skill
            let conn = db.get_connection();
            let mut stmt = conn.prepare(
                "SELECT tool_id FROM skill_links WHERE skill_id = ?1"
            )?;
            let tool_ids: Vec<String> = stmt.query_map([skill_id], |row| {
                row.get::<_, String>(0)
            })?.collect::<Result<Vec<_>, _>>()?;

            for tool_id in tool_ids {
                Self::remove_link(db, skill_id, &tool_id)?;
            }
        }

        Ok(())
    }

    pub fn sync_tool_links(db: &Database, tool_id: &str) -> Result<()> {
        let tool = ToolService::get_all_tools(db)?.into_iter()
            .find(|t| t.id == tool_id)
            .ok_or(rusqlite::Error::QueryReturnedNoRows)?;

        let skills = SkillService::get_all_skills(db)?;
        let enabled_skills: Vec<_> = skills.into_iter()
            .filter(|s| s.is_enabled)
            .collect();

        if tool.is_enabled {
            // Create links for all enabled skills
            for skill in enabled_skills {
                Self::create_link(db, &skill, &tool)?;
            }
        } else {
            // Remove all links for this tool
            let conn = db.get_connection();
            let mut stmt = conn.prepare(
                "SELECT skill_id FROM skill_links WHERE tool_id = ?1"
            )?;
            let skill_ids: Vec<String> = stmt.query_map([tool_id], |row| {
                row.get::<_, String>(0)
            })?.collect::<Result<Vec<_>, _>>()?;

            for skill_id in skill_ids {
                Self::remove_link(db, &skill_id, tool_id)?;
            }
        }

        Ok(())
    }
}
