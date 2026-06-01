use serde::{Deserialize, Serialize};

use crate::models::skill::Skill;

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum LifecycleReportStatus {
    Success,
    Partial,
    Failed,
    Blocked,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum LifecycleActionStatus {
    Planned,
    Completed,
    Failed,
    Skipped,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct LifecycleAction {
    pub action_type: String,
    pub status: LifecycleActionStatus,
    pub path: Option<String>,
    pub target_path: Option<String>,
    pub skill_id: Option<String>,
    pub skill_name: Option<String>,
    pub tool_id: Option<String>,
    pub tool_name: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct LifecycleIssue {
    pub code: String,
    pub message: String,
    pub path: Option<String>,
    pub target_path: Option<String>,
    pub skill_id: Option<String>,
    pub skill_name: Option<String>,
    pub tool_id: Option<String>,
    pub tool_name: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct LifecycleReport {
    pub status: LifecycleReportStatus,
    pub retryable: bool,
    pub actions: Vec<LifecycleAction>,
    pub warnings: Vec<LifecycleIssue>,
    pub failures: Vec<LifecycleIssue>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct MigrationPreflight {
    pub skill_id: String,
    pub source_path: String,
    pub managed_target_path: String,
    pub original_replacement_path: String,
    pub report: LifecycleReport,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MigrationResult {
    pub skill: Option<Skill>,
    pub report: LifecycleReport,
}

impl LifecycleReport {
    pub fn from_parts(
        actions: Vec<LifecycleAction>,
        warnings: Vec<LifecycleIssue>,
        failures: Vec<LifecycleIssue>,
        blocked: bool,
    ) -> Self {
        let completed_count = actions
            .iter()
            .filter(|action| action.status == LifecycleActionStatus::Completed)
            .count();
        let failed_count = failures.len()
            + actions
                .iter()
                .filter(|action| action.status == LifecycleActionStatus::Failed)
                .count();
        let status = if blocked {
            LifecycleReportStatus::Blocked
        } else if failed_count == 0 {
            LifecycleReportStatus::Success
        } else if completed_count == 0 {
            LifecycleReportStatus::Failed
        } else {
            LifecycleReportStatus::Partial
        };

        Self {
            status,
            retryable: false,
            actions,
            warnings,
            failures,
        }
    }

    pub fn with_retryable(mut self, retryable: bool) -> Self {
        self.retryable = retryable;
        self
    }
}

#[cfg(test)]
mod tests {
    use super::{
        LifecycleAction, LifecycleActionStatus, LifecycleIssue, LifecycleReport,
        LifecycleReportStatus,
    };

    fn action(status: LifecycleActionStatus) -> LifecycleAction {
        LifecycleAction {
            action_type: "copy".to_string(),
            status,
            path: Some("/tmp/source".to_string()),
            target_path: Some("/tmp/target".to_string()),
            skill_id: Some("alpha".to_string()),
            skill_name: Some("Alpha".to_string()),
            tool_id: None,
            tool_name: None,
        }
    }

    fn failure() -> LifecycleIssue {
        LifecycleIssue {
            code: "permission_denied".to_string(),
            message: "permission denied".to_string(),
            path: Some("/tmp/target".to_string()),
            target_path: None,
            skill_id: Some("alpha".to_string()),
            skill_name: Some("Alpha".to_string()),
            tool_id: None,
            tool_name: None,
        }
    }

    #[test]
    fn report_status_is_success_without_failures() {
        let report = LifecycleReport::from_parts(
            vec![action(LifecycleActionStatus::Completed)],
            vec![],
            vec![],
            false,
        );

        assert_eq!(report.status, LifecycleReportStatus::Success);
    }

    #[test]
    fn report_status_is_partial_with_completed_action_and_failure() {
        let report = LifecycleReport::from_parts(
            vec![action(LifecycleActionStatus::Completed)],
            vec![],
            vec![failure()],
            false,
        );

        assert_eq!(report.status, LifecycleReportStatus::Partial);
    }

    #[test]
    fn report_status_is_blocked_when_blocked_before_mutation() {
        let report = LifecycleReport::from_parts(vec![], vec![], vec![failure()], true);

        assert_eq!(report.status, LifecycleReportStatus::Blocked);
    }
}
