use tauri::{Emitter, State};
use crate::db::Database;
use crate::models::*;
use crate::scraper;
use crate::scraper::SyncProgressEvent;
use crate::LeetcodeCookie;

#[tauri::command]
pub fn get_tags(db: State<Database>) -> Result<Vec<Tag>, String> {
    db.get_tags().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_tag_due_counts(db: State<Database>) -> Result<Vec<TagDueCount>, String> {
    db.get_tag_due_counts().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_custom_api_entries(db: State<Database>) -> Result<Vec<CustomApiEntry>, String> {
    db.get_custom_api_entries().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_custom_api_by_container(db: State<Database>, container: String) -> Result<Vec<CustomApiEntry>, String> {
    db.get_custom_api_by_container(&container).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn create_custom_api(db: State<Database>, data: CreateCustomApiDTO) -> Result<CustomApiEntry, String> {
    db.create_custom_api(&data).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn update_custom_api(db: State<Database>, id: i64, data: UpdateCustomApiDTO) -> Result<CustomApiEntry, String> {
    db.update_custom_api(id, &data).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn delete_custom_api(db: State<Database>, id: i64) -> Result<(), String> {
    db.delete_custom_api(id).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn fetch_problem_info(leetcode_id: i64) -> Result<scraper::FetchedProblemInfo, String> {
    scraper::fetch_problem_info(leetcode_id).await
}

#[tauri::command]
pub fn get_problems(db: State<Database>, filters: ProblemFilters) -> Result<Vec<Problem>, String> {
    db.get_problems(&filters).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_problem(db: State<Database>, id: i64) -> Result<Problem, String> {
    db.get_problem(id).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn create_problem(db: State<Database>, data: CreateProblemDTO) -> Result<Problem, String> {
    db.create_problem(&data).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn update_problem(db: State<Database>, id: i64, data: UpdateProblemDTO) -> Result<Problem, String> {
    db.update_problem(id, &data).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn fetch_code_templates(leetcode_id: i64) -> Result<Vec<CodeTemplate>, String> {
    scraper::fetch_code_templates(leetcode_id).await
}

#[tauri::command]
pub async fn fetch_and_save_content(db: State<'_, Database>, problem_id: i64, leetcode_id: i64) -> Result<String, String> {
    let info = scraper::fetch_problem_info(leetcode_id).await?;
    db.update_problem_content(problem_id, &info.content).map_err(|e| e.to_string())?;
    Ok(info.content)
}

#[tauri::command]
pub fn get_problems_count(db: State<Database>, filters: ProblemFilters) -> Result<i64, String> {
    db.get_problems_count(&filters).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn delete_problem(db: State<Database>, id: i64) -> Result<(), String> {
    db.delete_problem(id).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_stats(db: State<Database>) -> Result<Stats, String> {
    db.get_stats().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_tag_stats(db: State<Database>) -> Result<Vec<TagStats>, String> {
    db.get_tag_stats().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_code_snippets(db: State<Database>, problem_id: i64) -> Result<Vec<CodeSnippet>, String> {
    db.get_code_snippets(problem_id).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn save_code_snippet(db: State<Database>, data: SaveCodeSnippetDTO) -> Result<CodeSnippet, String> {
    db.save_code_snippet(&data).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn delete_code_snippet(db: State<Database>, id: i64) -> Result<(), String> {
    db.delete_code_snippet(id).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn create_tag(db: State<Database>, name: String) -> Result<Tag, String> {
    db.create_tag(&name, "#6366f1").map_err(|e| e.to_string())
}

#[tauri::command]
pub fn update_tag(db: State<Database>, id: i64, name: String) -> Result<Tag, String> {
    db.update_tag(id, &name, "#6366f1").map_err(|e| e.to_string())
}

#[tauri::command]
pub fn delete_tag(db: State<Database>, id: i64) -> Result<(), String> {
    db.delete_tag(id).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_setting(db: State<Database>, key: String) -> Result<Option<String>, String> {
    db.get_setting(&key).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn set_setting(db: State<Database>, key: String, value: String) -> Result<(), String> {
    db.set_setting(&key, &value).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn submit_code(
    db: State<'_, Database>,
    leetcode_id: i64,
    language: String,
    code: String,
    cookie: Option<String>,
) -> Result<SubmissionResult, String> {
    let effective_cookie = cookie
        .or_else(|| db.get_setting("leetcode_session").ok().flatten())
        .ok_or_else(|| "请先在设置页面配置 LEETCODE_SESSION cookie".to_string())?;

    if code.trim().is_empty() {
        return Err("代码不能为空".into());
    }

    scraper::submit_code(leetcode_id, &language, &code, &effective_cookie).await
}

#[tauri::command]
pub async fn sync_ac_codes(
    db: State<'_, Database>,
    cookie: Option<String>,
    cookie_state: State<'_, LeetcodeCookie>,
    app_handle: tauri::AppHandle,
) -> Result<SyncAcCodesResult, String> {
    let effective_cookie = cookie.or_else(|| {
        cookie_state.0.lock().ok().and_then(|s| s.clone())
    }).ok_or_else(|| "请先在设置页面配置 LEETCODE_SESSION cookie".to_string())?;

    let submissions = scraper::fetch_all_accepted_submissions(&effective_cookie).await?;

    let slug_map: std::collections::HashMap<String, i64> = db
        .get_all_problem_slugs().map_err(|e| e.to_string())?
        .into_iter()
        .map(|(id, slug)| (slug, id))
        .collect();

    let total_found = submissions.len() as i64;
    let mut saved = 0i64;
    let mut skipped = 0i64;

    for sub in &submissions {
        let problem_id = match slug_map.get(&sub.title_slug) {
            Some(&id) => id,
            None => {
                skipped += 1;
                continue;
            }
        };

        let dto = SaveCodeSnippetDTO {
            problem_id,
            language: sub.lang.clone(),
            code: sub.code.clone(),
        };

        match db.save_code_snippet(&dto) {
            Ok(_) => saved += 1,
            Err(_) => skipped += 1,
        }

        let _ = app_handle.emit("sync-ac-codes-progress", serde_json::json!({
            "current": saved + skipped,
            "total": total_found,
        }));
    }

    Ok(SyncAcCodesResult { total_found, saved, skipped })
}

#[tauri::command]
pub async fn get_last_accepted_submission(
    db: State<'_, Database>,
    leetcode_id: i64,
) -> Result<Option<LastSubmission>, String> {
    let cookie = db
        .get_setting("leetcode_session")
        .ok()
        .flatten()
        .ok_or_else(|| "请先在设置页面配置 LEETCODE_SESSION cookie".to_string())?;
    scraper::fetch_last_accepted_submission(leetcode_id, &cookie).await
}

#[tauri::command]
pub fn refresh_submission_stats(
    db: State<Database>,
) -> Result<RefreshStatsResult, String> {
    let processed = db
        .compute_submission_stats()
        .map_err(|e| e.to_string())?;
    Ok(RefreshStatsResult { processed })
}

#[tauri::command]
pub fn get_review_queue(db: State<Database>, tag_id: Option<i64>) -> Result<Vec<Problem>, String> {
    db.get_review_queue(tag_id).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn record_review(db: State<Database>, problem_id: i64, confidence: String) -> Result<(), String> {
    db.record_review(problem_id, &confidence).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_review_stats(db: State<Database>) -> Result<ReviewStats, String> {
    let (total_reviewed, today_reviewed, due_count) = db.get_review_stats().map_err(|e| e.to_string())?;
    Ok(ReviewStats { total_reviewed, today_reviewed, due_count })
}

#[tauri::command]
pub fn get_review_history(db: State<Database>, problem_id: i64) -> Result<Vec<ReviewRecord>, String> {
    db.get_review_history(problem_id).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_random_problem(db: State<Database>) -> Result<Option<Problem>, String> {
    db.get_random_problem().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_scratchpad(db: State<Database>, problem_id: i64) -> Result<String, String> {
    db.get_scratchpad(problem_id).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn update_scratchpad(db: State<Database>, problem_id: i64, content: String) -> Result<(), String> {
    db.update_scratchpad(problem_id, &content).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn open_leetcode_login() -> Result<(), String> {
    let url = "https://leetcode.cn/accounts/login/";
    println!("[leetcode-login] 在系统浏览器中打开: {}", url);
    open::that(url).map_err(|e| format!("打开浏览器失败: {}", e))?;
    Ok(())
}

#[tauri::command]
pub async fn sync_leetcode_progress(
    db: State<'_, Database>,
    cookie: Option<String>,
    cookie_state: State<'_, LeetcodeCookie>,
    app_handle: tauri::AppHandle,
) -> Result<SyncResult, String> {
    let effective_cookie = cookie.or_else(|| {
        cookie_state.0.lock().ok().and_then(|s| s.clone())
    });

    let items = scraper::fetch_user_progress(effective_cookie.as_deref()).await?;
    let total = items.len() as i64;
    let mut imported = 0i64;
    let mut updated = 0i64;
    let mut failed = 0i64;
    let mut failed_items: Vec<SyncFailedItem> = Vec::new();
    let mut new_problem_ids: Vec<(i64, i64)> = Vec::new(); // (leetcode_id, local_problem_id)

    // Phase 1: bulk create/update using basic info from all-problems API
    for (i, item) in items.iter().enumerate() {
        let current = (i + 1) as i64;
        let leetcode_status = match item.status.as_str() {
            "Solved" => "solved",
            "Attempted" => "attempted",
            _ => "todo",
        };

        let _ = app_handle.emit("sync-progress", SyncProgressEvent {
            current,
            total,
            leetcode_id: item.leetcode_id,
            title: item.title.clone(),
            status: "syncing".into(),
        });

        match db.find_problem_by_leetcode_id(item.leetcode_id) {
            Ok(Some(problem_id)) => {
                let update = UpdateProblemDTO {
                    leetcode_id: None,
                    title: Some(item.title.clone()),
                    title_cn: None,
                    difficulty: Some(item.difficulty.clone()),
                    status: Some(leetcode_status.into()),
                    leetcode_url: Some(format!("https://leetcode.cn/problems/{}/", item.title_slug)),
                    notes: None,
                    content: None,
                    tag_ids: None,
                };
                if db.update_problem(problem_id, &update).is_ok() {
                    updated += 1;
                } else {
                    failed += 1;
                    failed_items.push(SyncFailedItem {
                        leetcode_id: item.leetcode_id,
                        title: item.title.clone(),
                        reason: "更新本地记录失败".into(),
                    });
                }
            }
            Ok(None) => {
                let create = CreateProblemDTO {
                    leetcode_id: Some(item.leetcode_id),
                    title: item.title.clone(),
                    title_cn: None,
                    difficulty: item.difficulty.clone(),
                    status: Some(leetcode_status.into()),
                    leetcode_url: Some(format!("https://leetcode.cn/problems/{}/", item.title_slug)),
                    notes: None,
                    content: None,
                    tag_ids: vec![],
                };
                match db.create_problem(&create) {
                    Ok(problem) => {
                        imported += 1;
                        new_problem_ids.push((item.leetcode_id, problem.id));
                    }
                    Err(_) => {
                        failed += 1;
                        failed_items.push(SyncFailedItem {
                            leetcode_id: item.leetcode_id,
                            title: item.title.clone(),
                            reason: "创建本地记录失败".into(),
                        });
                    }
                }
            }
            Err(e) => {
                failed += 1;
                failed_items.push(SyncFailedItem {
                    leetcode_id: item.leetcode_id,
                    title: item.title.clone(),
                    reason: format!("数据库查询错误: {}", e),
                });
            }
        }
    }

    // Phase 2: background fetch details for newly imported problems
    for (leetcode_id, problem_id) in &new_problem_ids {
        let _ = app_handle.emit("sync-progress", SyncProgressEvent {
            current: 0,
            total: new_problem_ids.len() as i64,
            leetcode_id: *leetcode_id,
            title: String::new(),
            status: "fetching-detail".into(),
        });

        match scraper::fetch_problem_info(*leetcode_id).await {
            Ok(info) => {
                let tag_ids: Vec<i64> = db.get_tags().unwrap_or_default()
                    .iter()
                    .filter(|t| info.tags.contains(&t.name))
                    .map(|t| t.id)
                    .collect();

                let update = UpdateProblemDTO {
                    leetcode_id: None,
                    title: None,
                    title_cn: Some(info.title_cn),
                    difficulty: None,
                    status: None,
                    leetcode_url: None,
                    notes: None,
                    content: Some(info.content),
                    tag_ids: Some(tag_ids),
                };
                if db.update_problem(*problem_id, &update).is_err() {
                    failed_items.push(SyncFailedItem {
                        leetcode_id: *leetcode_id,
                        title: String::new(),
                        reason: "更新详情失败".into(),
                    });
                }
            }
            Err(e) => {
                failed_items.push(SyncFailedItem {
                    leetcode_id: *leetcode_id,
                    title: String::new(),
                    reason: format!("抓取详情失败: {}", e),
                });
            }
        }
    }

    if !new_problem_ids.is_empty() {
        let _ = app_handle.emit("sync-progress", SyncProgressEvent {
            current: new_problem_ids.len() as i64,
            total: new_problem_ids.len() as i64,
            leetcode_id: 0,
            title: String::new(),
            status: "done".into(),
        });
    }

    // Compute submission stats from synced data
    let _ = db.compute_submission_stats();

    Ok(SyncResult { total, imported, updated, failed, failed_items })
}
