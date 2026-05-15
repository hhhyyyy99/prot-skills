use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum SyncResultStatus {
    Success,
    Partial,
    Failed,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct SyncSuccessItem {
    pub tool_id: String,
    pub tool_name: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct SyncFailureItem {
    pub tool_id: String,
    pub tool_name: String,
    pub reason_code: String,
    pub reason: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct SyncSkillTargetsResult {
    pub status: SyncResultStatus,
    pub success_count: usize,
    pub failure_count: usize,
    pub success_tools: Vec<SyncSuccessItem>,
    pub failed_tools: Vec<SyncFailureItem>,
}

impl SyncSkillTargetsResult {
    pub fn new(success_tools: Vec<SyncSuccessItem>, failed_tools: Vec<SyncFailureItem>) -> Self {
        let success_count = success_tools.len();
        let failure_count = failed_tools.len();
        let status = if failure_count == 0 {
            SyncResultStatus::Success
        } else if success_count == 0 {
            SyncResultStatus::Failed
        } else {
            SyncResultStatus::Partial
        };

        Self {
            status,
            success_count,
            failure_count,
            success_tools,
            failed_tools,
        }
    }
}
