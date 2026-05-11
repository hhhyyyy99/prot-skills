use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AITool {
    pub id: String,
    pub name: String,
    pub config_path: String,
    pub skills_subdir: String,
    pub is_detected: bool,
    pub is_enabled: bool,
    pub detected_at: Option<String>,
    pub custom_path: Option<String>,
}

impl AITool {
    pub fn skills_path(&self) -> String {
        format!("{}/{}", self.config_path, self.skills_subdir)
    }
}
