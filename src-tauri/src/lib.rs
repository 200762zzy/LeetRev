mod db;
mod models;
mod commands;
mod scraper;

use db::Database;
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_log::Builder::new().build())
        .setup(|app| {
            let app_dir = app.path().app_data_dir().expect("failed to get app data dir");
            std::fs::create_dir_all(&app_dir).expect("failed to create app data dir");
            let db_path = app_dir.join("leetrev.db");
            let database = Database::new(db_path.to_str().unwrap())
                .expect("failed to initialize database");
            app.manage(database);
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::get_tags,
            commands::get_problems,
            commands::get_problem,
            commands::create_problem,
            commands::update_problem,
            commands::delete_problem,
            commands::get_stats,
            commands::get_tag_stats,
            commands::fetch_problem_info,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
