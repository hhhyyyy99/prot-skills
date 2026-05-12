use serde::{Deserialize, Serialize};
use std::path::PathBuf;

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
    /// 返回该工具放置 skill 软链接的绝对目录。
    /// 自动展开 `config_path` 中可能存在的 `~` 前缀，
    /// 避免下游 `fs::create_dir_all` 在当前工作目录下误建字面量 `~` 文件夹。
    pub fn skills_path(&self) -> PathBuf {
        crate::utils::expand_path(&self.config_path).join(&self.skills_subdir)
    }
}
