pub mod commands;
pub mod db;
pub mod error;
pub mod models;
pub mod services;
pub mod utils;

use db::Database;
use services::ToolService;
use tauri::Manager;

pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            let app_dir = dirs::home_dir()
                .expect("Failed to get home dir")
                .join(".prot-skills");
            
            std::fs::create_dir_all(&app_dir)?;
            
            let db_path = app_dir.join("metadata.db");
            let db = Database::new(db_path).expect("Failed to initialize database");

            ToolService::detect_tools(&db).expect("Failed to detect tools");

            app.manage(std::sync::Mutex::new(db));
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            // Skill commands
            commands::get_skills,
            commands::install_skill_from_local,
            commands::toggle_skill,
            commands::uninstall_skill,
            commands::scan_local_skills,
            commands::migrate_local_skill,
            commands::open_folder,
            commands::get_skills_dir_path,
            // Tool commands
            commands::get_tools,
            commands::detect_tools,
            commands::toggle_tool,
            commands::update_tool_path,
            commands::add_tool,
            commands::delete_tool,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
