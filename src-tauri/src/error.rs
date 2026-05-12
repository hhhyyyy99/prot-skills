use std::fmt;

/// 应用层统一错误类型。区分数据库、文件系统、业务三类错误，
/// 避免把 IO 失败伪装成 rusqlite::Error::ExecuteReturnedResults
/// （那样会给用户看到 "Execute returned results - did you mean to call query?"
/// 这种完全不相关的消息）。
#[derive(Debug)]
pub enum AppError {
    Db(rusqlite::Error),
    Io(std::io::Error),
    NotFound(String),
    Path(String),
    Other(String),
}

impl fmt::Display for AppError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            AppError::Db(e) => write!(f, "database error: {}", e),
            AppError::Io(e) => write!(f, "filesystem error: {}", e),
            AppError::NotFound(s) => write!(f, "not found: {}", s),
            AppError::Path(s) => write!(f, "invalid path: {}", s),
            AppError::Other(s) => write!(f, "{}", s),
        }
    }
}

impl std::error::Error for AppError {}

impl From<rusqlite::Error> for AppError {
    fn from(e: rusqlite::Error) -> Self {
        AppError::Db(e)
    }
}

impl From<std::io::Error> for AppError {
    fn from(e: std::io::Error) -> Self {
        AppError::Io(e)
    }
}

impl From<String> for AppError {
    fn from(s: String) -> Self {
        AppError::Other(s)
    }
}

pub type AppResult<T> = Result<T, AppError>;
