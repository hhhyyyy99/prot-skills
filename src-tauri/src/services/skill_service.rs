use crate::db::Database;
use crate::models::{Skill, SkillMetadata};
use crate::utils::get_skills_dir;
use rusqlite::{params, Result};
use std::fs;
use std::path::Path;

pub struct SkillService;

impl SkillService {
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
                        serde_json::to_string(&SkillMetadata {
                            author: None,
                            description: None,
                            tags: vec![],
                            version: None,
                        })
                        .unwrap(),
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
        let target_path = skills_dir.join(skill_id);

        // Create skills directory if not exists
        fs::create_dir_all(&skills_dir)
            .map_err(|e| rusqlite::Error::ToSqlConversionFailure(Box::new(e)))?;

        // Copy skill folder to manager directory
        copy_dir_all(source_path, &target_path)
            .map_err(|e| rusqlite::Error::ToSqlConversionFailure(Box::new(e)))?;

        let metadata = SkillMetadata {
            author: None,
            description: None,
            tags: vec![],
            version: None,
        };

        let conn = db.get_connection();
        conn.execute(
            "INSERT INTO skills (id, name, source_type, source_url, local_path, metadata)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6)
             ON CONFLICT(id) DO UPDATE SET
             name = excluded.name,
             source_type = excluded.source_type,
             source_url = excluded.source_url,
             local_path = excluded.local_path,
             updated_at = CURRENT_TIMESTAMP,
             metadata = excluded.metadata",
            [
                skill_id,
                name,
                source_type,
                source_url.unwrap_or(""),
                target_path.to_str().unwrap(),
                &serde_json::to_string(&metadata).unwrap(),
            ],
        )?;

        Self::get_skill_by_id(db, skill_id).map(|s| s.expect("Skill should exist after insertion"))
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

    pub fn uninstall_skill(db: &Database, skill_id: &str) -> Result<()> {
        if let Some(skill) = Self::get_skill_by_id(db, skill_id)? {
            // Remove from database
            let conn = db.get_connection();
            conn.execute("DELETE FROM skill_links WHERE skill_id = ?1", [skill_id])?;
            conn.execute("DELETE FROM skills WHERE id = ?1", [skill_id])?;

            // Remove folder
            let _ = fs::remove_dir_all(&skill.local_path);
        }
        Ok(())
    }
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

#[cfg(test)]
mod tests {
    use super::SkillService;
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
}
