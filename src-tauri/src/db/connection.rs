use rusqlite::{Connection, Result};
use std::path::PathBuf;

pub struct Database {
    conn: Connection,
}

impl Database {
    pub fn new(db_path: PathBuf) -> Result<Self> {
        let conn = Connection::open(db_path)?;
        let db = Self { conn };
        db.init_tables()?;
        Ok(db)
    }

    fn init_tables(&self) -> Result<()> {
        self.conn.execute(
            "CREATE TABLE IF NOT EXISTS skills (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                source_type TEXT NOT NULL,
                source_url TEXT,
                local_path TEXT NOT NULL,
                installed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                is_enabled BOOLEAN DEFAULT 1,
                metadata TEXT
            )",
            [],
        )?;

        self.conn.execute(
            "CREATE TABLE IF NOT EXISTS ai_tools (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                config_path TEXT,
                skills_subdir TEXT DEFAULT 'skills',
                is_detected BOOLEAN DEFAULT 0,
                is_enabled BOOLEAN DEFAULT 0,
                detected_at TIMESTAMP,
                custom_path TEXT,
                sort_order INTEGER DEFAULT 0
            )",
            [],
        )?;

        // Migration: add sort_order column if missing (existing databases)
        let has_sort_order: bool = self
            .conn
            .prepare("SELECT COUNT(*) FROM pragma_table_info('ai_tools') WHERE name='sort_order'")?
            .query_row([], |row| row.get::<_, i64>(0))
            .map(|c| c > 0)?;
        if !has_sort_order {
            self.conn.execute(
                "ALTER TABLE ai_tools ADD COLUMN sort_order INTEGER DEFAULT 0",
                [],
            )?;
        }

        self.conn.execute(
            "CREATE TABLE IF NOT EXISTS skill_links (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                skill_id TEXT NOT NULL,
                tool_id TEXT NOT NULL,
                link_path TEXT NOT NULL,
                is_active BOOLEAN DEFAULT 1,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (skill_id) REFERENCES skills(id),
                FOREIGN KEY (tool_id) REFERENCES ai_tools(id),
                UNIQUE(skill_id, tool_id)
            )",
            [],
        )?;

        Ok(())
    }

    pub fn get_connection(&self) -> &Connection {
        &self.conn
    }
}
