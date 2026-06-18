mod db;
mod models;
mod commands;
mod scraper;

use db::Database;
use std::sync::Mutex;
use tauri::Manager;

pub struct LeetcodeCookie(pub Mutex<Option<String>>);

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_log::Builder::new().build())
        .plugin(tauri_plugin_clipboard_manager::init())
        .setup(|app| {
            let app_dir = app.path().app_data_dir().expect("failed to get app data dir");
            std::fs::create_dir_all(&app_dir).expect("failed to create app data dir");
            let db_path = app_dir.join("leetrev.db");
            let database = Database::new(db_path.to_str().unwrap())
                .expect("failed to initialize database");
            app.manage(database);
            app.manage(LeetcodeCookie(Mutex::new(None)));
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::get_tags,
            commands::get_problems,
            commands::get_problems_count,
            commands::get_problem,
            commands::create_problem,
            commands::update_problem,
            commands::delete_problem,
            commands::get_stats,
            commands::get_tag_stats,
            commands::get_code_snippets,
            commands::save_code_snippet,
            commands::delete_code_snippet,
            commands::fetch_problem_info,
            commands::fetch_code_templates,
            commands::fetch_and_save_content,
            commands::create_tag,
            commands::update_tag,
            commands::delete_tag,
            commands::get_setting,
            commands::set_setting,
            commands::sync_leetcode_progress,
            commands::get_review_queue,
            commands::record_review,
            commands::get_tag_due_counts,
            commands::get_review_stats,
            commands::get_review_history,
            commands::get_all_review_history,
            commands::get_review_heatmap,
            commands::get_random_problem,
            commands::get_scratchpad,
            commands::update_scratchpad,
            commands::get_custom_api_entries,
            commands::get_custom_api_by_container,
            commands::create_custom_api,
            commands::update_custom_api,
            commands::delete_custom_api,
            commands::get_solution_approaches,
            commands::create_solution_approach,
            commands::update_solution_approach,
            commands::delete_solution_approach,
            commands::reorder_solution_approaches,
            commands::get_last_accepted_submission,
            commands::refresh_submission_stats,
            commands::sync_ac_codes,
            commands::submit_code,
            commands::open_leetcode_login,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
