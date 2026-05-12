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
pub fn add_tool(
    db: State<std::sync::Mutex<Database>>,
    id: String,
    name: String,
    config_path: String,
) -> Result<AITool, String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    ToolService::add_tool(&db, &id, &name, &config_path).map_err(|e| e.to_string())?;
    let tools = ToolService::get_all_tools(&db).map_err(|e| e.to_string())?;
    tools.into_iter().find(|t| t.id == id).ok_or("Tool not found after insert".into())
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

#[tauri::command]
pub fn delete_tool(
    db: State<std::sync::Mutex<Database>>,
    tool_id: String,
) -> Result<(), String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    ToolService::delete_tool(&db, &tool_id)
        .map_err(|e| e.to_string())
}
