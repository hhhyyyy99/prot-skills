use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Skill {
    pub id: String,
    pub name: String,
    pub source_type: String,
    pub source_url: Option<String>,
    pub local_path: String,
    pub installed_at: String,
    pub updated_at: String,
    pub is_enabled: bool,
    pub metadata: Option<SkillMetadata>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SkillMetadata {
    pub author: Option<String>,
    pub description: Option<String>,
    pub tags: Vec<String>,
    pub version: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LocalSkill {
    pub name: String,
    pub path: String,
    pub is_symlink: bool,
    pub target_path: Option<String>,
    pub tool_id: Option<String>,
    pub tool_name: Option<String>,
}
