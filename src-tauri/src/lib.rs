mod db;
mod models;
mod commands;
mod scraper;
mod llm;

use db::Database;
use models::*;
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

            // Auto-detect daily changes on startup
            let db_clone = db_path.to_str().unwrap().to_string();
            tauri::async_runtime::spawn(async move {
                if let Ok(db) = Database::new(&db_clone) {
                    if let Ok(trackers) = db.get_daily_trackers() {
                        if let Some(tracker) = trackers.first() {
                            let today = chrono::Local::now().format("%Y-%m-%d").to_string();
                            if let Ok(false) = db.has_daily_fetch(tracker.id, &today) {
                                if let Ok(Some(cookie)) = db.get_setting("leetcode_session") {
                                    let cookie_str = cookie.clone();
                                    let tracker_id = tracker.id;
                                    let settings_username = db.get_setting("leetcode_username").ok().flatten();

                                    match scraper::fetch_recent_ac_submissions_graphql(&cookie_str, settings_username.as_deref(), 50).await {
                                        Ok(submissions) => {
                                            let existing_ids = db.get_all_daily_fetch_problem_ids().unwrap_or_default();
                                            let cache = match scraper::get_cache().await {
                                                Ok(c) => c,
                                                Err(_) => return,
                                            };
                                            let slug_to_id: std::collections::HashMap<String, i64> = cache
                                                .into_iter()
                                                .map(|(fid, entry)| (entry.title_slug, fid))
                                                .collect();

                                            let mut new_slugs = Vec::new();
                                            let mut redo_slugs = Vec::new();
                                            let mut seen = std::collections::HashSet::new();

                                            for sub in &submissions {
                                                if !seen.insert(sub.title_slug.clone()) { continue; }
                                                match db.find_problem_by_slug(&sub.title_slug) {
                                                    Ok(Some(pid)) => {
                                                        if !existing_ids.contains(&pid) {
                                                            redo_slugs.push(sub.title_slug.clone());
                                                        }
                                                    }
                                                    Ok(None) => new_slugs.push(sub.title_slug.clone()),
                                                    _ => {}
                                                }
                                            }

                                            for slug in &new_slugs {
                                                if let Some(&lid) = slug_to_id.get(slug) {
                                                    if let Ok(info) = scraper::fetch_problem_info(lid).await {
                                                        let _ = db.create_problem(&CreateProblemDTO {
                                                            leetcode_id: Some(info.leetcode_id),
                                                            title: info.title,
                                                            title_cn: Some(info.title_cn),
                                                            difficulty: info.difficulty,
                                                            status: Some("solved".into()),
                                                            leetcode_url: Some(info.url),
                                                            notes: None,
                                                            content: Some(info.content),
                                                            tag_ids: vec![],
                                                        });
                                                    }
                                                }
                                            }

                                            let new_count = new_slugs.len() as i64;
                                            let redo_count = redo_slugs.len() as i64;

                                            if new_count > 0 || redo_count > 0 {
                                                if let Some(log_id) = db.create_daily_fetch_log(tracker_id, &today, new_count, redo_count).ok() {
                                                    for slug in &new_slugs {
                                                        if let Ok(Some(pid)) = db.find_problem_by_slug(slug) {
                                                            let _ = db.link_daily_fetch_problem(log_id, pid, "new");
                                                        }
                                                    }
                                                    for slug in &redo_slugs {
                                                        if let Ok(Some(pid)) = db.find_problem_by_slug(slug) {
                                                            let _ = db.link_daily_fetch_problem(log_id, pid, "redo");
                                                        }
                                                    }
                                                }
                                            }
                                        }
                                        Err(_) => {
                                            // Fallback: progress API, max 30 per run
                                            if let Ok(progress) = scraper::fetch_user_progress(Some(&cookie_str)).await {
                                                let cache = scraper::get_cache().await.ok();
                                                let slug_to_id: std::collections::HashMap<String, i64> = cache
                                                    .map(|c| c.into_iter().map(|(fid, entry)| (entry.title_slug, fid)).collect())
                                                    .unwrap_or_default();

                                                let mut created_slugs = Vec::new();
                                                for item in &progress {
                                                    let already = db.find_problem_by_slug(&item.title_slug).ok().flatten().is_some();
                                                    if already { continue; }
                                                    if created_slugs.len() >= 30 { break; }
                                                    if let Some(&lid) = slug_to_id.get(&item.title_slug) {
                                                        if let Ok(info) = scraper::fetch_problem_info(lid).await {
                                                            let _ = db.create_problem(&CreateProblemDTO {
                                                                leetcode_id: Some(info.leetcode_id),
                                                                title: info.title,
                                                                title_cn: Some(info.title_cn),
                                                                difficulty: info.difficulty,
                                                                status: Some("solved".into()),
                                                                leetcode_url: Some(info.url),
                                                                notes: None,
                                                                content: Some(info.content),
                                                                tag_ids: vec![],
                                                            });
                                                            created_slugs.push(item.title_slug.clone());
                                                        }
                                                    }
                                                }

                                                let cnt = created_slugs.len() as i64;
                                                if cnt > 0 {
                                                    if let Some(log_id) = db.create_daily_fetch_log(tracker_id, &today, cnt, 0).ok() {
                                                        for slug in &created_slugs {
                                                            if let Ok(Some(pid)) = db.find_problem_by_slug(slug) {
                                                                let _ = db.link_daily_fetch_problem(log_id, pid, "new");
                                                            }
                                                        }
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            });

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
            commands::analyze_code,
            commands::get_code_analyses,
            commands::open_leetcode_login,
            commands::get_daily_trackers,
            commands::create_daily_tracker,
            commands::delete_daily_tracker,
            commands::get_daily_fetch_logs,
            commands::get_daily_fetch_problems,
            commands::check_daily_changes,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
