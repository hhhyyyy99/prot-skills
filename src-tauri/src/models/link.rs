use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SkillLink {
    pub id: i64,
    pub skill_id: String,
    pub tool_id: String,
    pub link_path: String,
    pub is_active: bool,
    pub created_at: String,
}
