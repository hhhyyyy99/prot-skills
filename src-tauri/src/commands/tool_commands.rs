use crate::db::Database;
use crate::models::AITool;
use crate::services::{ToolService, LinkService};
use tauri::State;

#[tauri::command]
pub fn get_tools(db: State<std::sync::Mutex<Database>>) -> Result<Vec<AITool>, String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    ToolService::get_all_tools(&db).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn detect_tools(db: State<std::sync::Mutex<Database>>) -> Result<Vec<AITool>, String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    ToolService::detect_tools(&db).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn toggle_tool(
    db: State<std::sync::Mutex<Database>>,
    tool_id: String,
    enabled: bool,
) -> Result<(), String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    
    ToolService::toggle_tool(&db, &tool_id, enabled)
        .map_err(|e| e.to_string())?;
    
    // Sync links
    LinkService::sync_tool_links(&db, &tool_id)
        .map_err(|e| e.to_string())?;
    
    Ok(())
}

#[tauri::command]
pub fn update_tool_path(
    db: State<std::sync::Mutex<Database>>,
    tool_id: String,
    custom_path: String,
) -> Result<(), String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    ToolService::update_tool_path(&db, &tool_id, &custom_path)
        .map_err(|e| e.to_string())
}
