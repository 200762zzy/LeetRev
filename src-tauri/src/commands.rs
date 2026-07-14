use tauri::{Emitter, State};
use crate::db::Database;
use crate::llm;
use crate::models::*;
use crate::scraper;
use crate::scraper::SyncProgressEvent;
use crate::LeetcodeCookie;
use rusqlite::params;

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
pub fn get_all_review_history(db: State<Database>) -> Result<Vec<ReviewRecord>, String> {
    db.get_all_review_history().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_review_heatmap(db: State<Database>, days: i64) -> Result<Vec<ReviewHeatmapEntry>, String> {
    db.get_review_heatmap(days).map_err(|e| e.to_string())
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
pub fn get_solution_approaches(db: State<Database>, problem_id: i64) -> Result<Vec<SolutionApproach>, String> {
    db.get_solution_approaches(problem_id).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn create_solution_approach(db: State<Database>, data: CreateSolutionApproachDTO) -> Result<SolutionApproach, String> {
    db.create_solution_approach(&data).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn update_solution_approach(db: State<Database>, id: i64, data: UpdateSolutionApproachDTO) -> Result<SolutionApproach, String> {
    db.update_solution_approach(id, &data).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn delete_solution_approach(db: State<Database>, id: i64) -> Result<(), String> {
    db.delete_solution_approach(id).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn reorder_solution_approaches(db: State<Database>, ids: Vec<i64>, orders: Vec<i64>) -> Result<(), String> {
    db.reorder_solution_approaches(ids, orders).map_err(|e| e.to_string())
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
    let mut detail_problem_ids: Vec<(i64, i64)> = Vec::new(); // (leetcode_id, local_problem_id)

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
                detail_problem_ids.push((item.leetcode_id, problem_id));
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
                        detail_problem_ids.push((item.leetcode_id, problem.id));
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

    // Phase 2: fetch details + tags for all synced problems
    for (leetcode_id, problem_id) in &detail_problem_ids {
        let _ = app_handle.emit("sync-progress", SyncProgressEvent {
            current: 0,
            total: detail_problem_ids.len() as i64,
            leetcode_id: *leetcode_id,
            title: String::new(),
            status: "fetching-detail".into(),
        });

        match scraper::fetch_problem_info(*leetcode_id).await {
            Ok(info) => {
                let tag_ids: Vec<i64> = info.tags.iter()
                    .filter_map(|tag_name| {
                        db.get_or_create_tag(tag_name, "#6366f1").ok().map(|t| t.id)
                    })
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

    if !detail_problem_ids.is_empty() {
        let _ = app_handle.emit("sync-progress", SyncProgressEvent {
            current: detail_problem_ids.len() as i64,
            total: detail_problem_ids.len() as i64,
            leetcode_id: 0,
            title: String::new(),
            status: "done".into(),
        });
    }

    // Compute submission stats from synced data
    let _ = db.compute_submission_stats();

    Ok(SyncResult { total, imported, updated, failed, failed_items })
}

#[tauri::command]
pub async fn analyze_code(db: State<'_, Database>, data: AnalyzeCodeDTO) -> Result<CodeAnalysis, String> {
    let result = llm::analyze_code(&db, &data).await?;
    let provider = llm::provider_name(&db);
    let model = llm::model_name(&db);
    let (better_code, better_title) = match &result.better_solution {
        Some(bs) => (serde_json::to_string(bs).unwrap_or_default(), bs.title.clone()),
        None => (String::new(), String::new()),
    };
    let better_language = result.better_solution.as_ref().map(|bs| bs.language.clone()).unwrap_or_default();
    db.save_code_analysis(
        &data,
        &result.time_complexity,
        &result.space_complexity,
        result.score,
        &result.summary,
        &result.suggestions,
        data.runtime_ms.as_deref().unwrap_or(""),
        data.memory_mb.as_deref().unwrap_or(""),
        &provider,
        &model,
        result.optimized_code.as_deref().unwrap_or(""),
        &better_code,
        &better_title,
        &better_language,
    ).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_code_analyses(db: State<Database>, problem_id: i64) -> Result<Vec<CodeAnalysis>, String> {
    db.get_code_analyses(problem_id).map_err(|e| e.to_string())
}

// ---- Daily Tracking Commands ----

#[tauri::command]
pub fn get_daily_trackers(db: State<Database>) -> Result<Vec<DailyTracker>, String> {
    db.get_daily_trackers().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn create_daily_tracker(db: State<Database>, name: String, start_date: String) -> Result<DailyTracker, String> {
    db.create_daily_tracker(&name, &start_date).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn delete_daily_tracker(db: State<Database>, id: i64) -> Result<(), String> {
    db.delete_daily_tracker(id).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_daily_fetch_logs(db: State<Database>, tracker_id: i64) -> Result<Vec<DailyFetchLog>, String> {
    db.get_daily_fetch_logs(tracker_id).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_daily_fetch_problems(db: State<Database>, fetch_log_id: i64) -> Result<Vec<Problem>, String> {
    db.get_daily_fetch_problems(fetch_log_id).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn check_daily_changes(
    db: State<'_, Database>,
    tracker_id: i64,
    cookie: Option<String>,
) -> Result<CheckDailyChangesResult, String> {
    let effective_cookie = cookie
        .or_else(|| db.get_setting("leetcode_session").ok().flatten())
        .ok_or_else(|| "请先在设置页面配置 LEETCODE_SESSION cookie".to_string())?;

    let today = chrono::Local::now().format("%Y-%m-%d").to_string();

    if db.has_daily_fetch(tracker_id, &today).map_err(|e| e.to_string())? {
        return Err("今天已经检测过了".into());
    }

    // Try GraphQL method first (username from settings or auto-detected)
    let settings_username = db.get_setting("leetcode_username").ok().flatten();
    match scraper::fetch_recent_ac_submissions_graphql(&effective_cookie, settings_username.as_deref(), 50).await {
        Ok(submissions) => {
            // GraphQL path — use existing slugs set for dedup
            let mut existing_ids = db.get_all_daily_fetch_problem_ids().map_err(|e| e.to_string())?;
            let mut new_problems = Vec::new();
            let mut redo_problems = Vec::new();
            let mut seen_slugs = std::collections::HashSet::new();

            let cache = scraper::get_cache().await?;
            let slug_to_id: std::collections::HashMap<String, i64> = cache
                .iter()
                .map(|(fid, entry)| (entry.title_slug.clone(), *fid))
                .collect();

            let mut today_new_count = 0i64;
            let mut today_redo_count = 0i64;

            for sub in &submissions {
                if !seen_slugs.insert(sub.title_slug.clone()) {
                    continue;
                }

                let existing_problem_id = db.find_problem_by_slug(&sub.title_slug)
                    .map_err(|e| e.to_string())?;

                match existing_problem_id {
                    Some(pid) => {
                        if existing_ids.contains(&pid) {
                            continue;
                        }
                        today_redo_count += 1;
                        redo_problems.push(sub.title_slug.clone());
                    }
                    None => {
                        let leetcode_id = slug_to_id.get(&sub.title_slug).copied();
                        if let Some(lid) = leetcode_id {
                            match crate::scraper::fetch_problem_info(lid).await {
                                Ok(info) => {
                                    let create = CreateProblemDTO {
                                        leetcode_id: Some(info.leetcode_id),
                                        title: info.title,
                                        title_cn: Some(info.title_cn),
                                        difficulty: info.difficulty,
                                        status: Some("solved".into()),
                                        leetcode_url: Some(info.url),
                                        notes: None,
                                        content: Some(info.content),
                                        tag_ids: vec![],
                                    };
                                    if let Ok(p) = db.create_problem(&create) {
                                        existing_ids.insert(p.id);
                                        today_new_count += 1;
                                        new_problems.push(sub.title_slug.clone());
                                    }
                                }
                                Err(_) => {
                                    let create = CreateProblemDTO {
                                        leetcode_id: Some(lid),
                                        title: sub.title_slug.clone(),
                                        title_cn: None,
                                        difficulty: "medium".into(),
                                        status: Some("solved".into()),
                                        leetcode_url: Some(format!("https://leetcode.cn/problems/{}/", sub.title_slug)),
                                        notes: None,
                                        content: None,
                                        tag_ids: vec![],
                                    };
                                    if let Ok(p) = db.create_problem(&create) {
                                        existing_ids.insert(p.id);
                                        today_new_count += 1;
                                        new_problems.push(sub.title_slug.clone());
                                    }
                                }
                            }
                        }
                    }
                }
            }

            if today_new_count > 0 || today_redo_count > 0 {
                let conn = db.conn.lock().unwrap();
                conn.execute(
                    "INSERT INTO daily_fetch_logs (tracker_id, fetch_date, new_count, redo_count)
                     VALUES (?1, ?2, ?3, ?4)",
                    params![tracker_id, today, today_new_count, today_redo_count],
                ).map_err(|e| e.to_string())?;
                let log_id = conn.last_insert_rowid();

                for slug in &new_problems {
                    if let Some(pid) = db.find_problem_by_slug(slug).map_err(|e| e.to_string())? {
                        let _ = conn.execute(
                            "INSERT OR IGNORE INTO daily_fetch_problems (fetch_log_id, problem_id, change_type)
                             VALUES (?1, ?2, 'new')",
                            params![log_id, pid],
                        );
                    }
                }
                for slug in &redo_problems {
                    if let Some(pid) = db.find_problem_by_slug(slug).map_err(|e| e.to_string())? {
                        let _ = conn.execute(
                            "INSERT OR IGNORE INTO daily_fetch_problems (fetch_log_id, problem_id, change_type)
                             VALUES (?1, ?2, 'redo')",
                            params![log_id, pid],
                        );
                    }
                }
            }

            Ok(CheckDailyChangesResult {
                fetch_date: today,
                new_count: today_new_count,
                redo_count: today_redo_count,
                total_submissions: submissions.len() as i64,
                new_problems,
                redo_problems,
            })
        }
        Err(_) => {
            // Fallback: use progress API (new-only detection, max 30 per run)
            let progress = scraper::fetch_user_progress(Some(&effective_cookie)).await?;
            let cache = scraper::get_cache().await.ok();

            let mut new_slugs = Vec::new();
            for item in &progress {
                if db.find_problem_by_slug(&item.title_slug).map_err(|e| e.to_string())?.is_some() {
                    continue;
                }
                if new_slugs.len() >= 30 {
                    break;
                }
                new_slugs.push(item.title_slug.clone());
            }

            let cache_map: std::collections::HashMap<String, i64> = cache
                .map(|c| c.into_iter().map(|(fid, entry)| (entry.title_slug, fid)).collect())
                .unwrap_or_default();

            let mut created_count = 0i64;
            let mut created_slugs = Vec::new();

            for slug in &new_slugs {
                if let Some(&lid) = cache_map.get(slug) {
                    match crate::scraper::fetch_problem_info(lid).await {
                        Ok(info) => {
                            let create = CreateProblemDTO {
                                leetcode_id: Some(info.leetcode_id),
                                title: info.title,
                                title_cn: Some(info.title_cn),
                                difficulty: info.difficulty,
                                status: Some("solved".into()),
                                leetcode_url: Some(info.url),
                                notes: None,
                                content: Some(info.content),
                                tag_ids: vec![],
                            };
                            if db.create_problem(&create).is_ok() {
                                created_count += 1;
                                created_slugs.push(slug.clone());
                            }
                        }
                        Err(_) => {
                            let create = CreateProblemDTO {
                                leetcode_id: Some(lid),
                                title: slug.clone(),
                                title_cn: None,
                                difficulty: "medium".into(),
                                status: Some("solved".into()),
                                leetcode_url: Some(format!("https://leetcode.cn/problems/{}/", slug)),
                                notes: None,
                                content: None,
                                tag_ids: vec![],
                            };
                            if db.create_problem(&create).is_ok() {
                                created_count += 1;
                                created_slugs.push(slug.clone());
                            }
                        }
                    }
                }
            }

            if created_count > 0 {
                let conn = db.conn.lock().unwrap();
                conn.execute(
                    "INSERT INTO daily_fetch_logs (tracker_id, fetch_date, new_count, redo_count)
                     VALUES (?1, ?2, ?3, ?4)",
                    params![tracker_id, today, created_count, 0],
                ).map_err(|e| e.to_string())?;
                let log_id = conn.last_insert_rowid();
                for slug in &created_slugs {
                    if let Ok(Some(pid)) = db.find_problem_by_slug(slug) {
                        let _ = conn.execute(
                            "INSERT OR IGNORE INTO daily_fetch_problems (fetch_log_id, problem_id, change_type)
                             VALUES (?1, ?2, 'new')",
                            params![log_id, pid],
                        );
                    }
                }
            }

            Ok(CheckDailyChangesResult {
                fetch_date: today,
                new_count: created_count,
                redo_count: 0,
                total_submissions: created_count,
                new_problems: created_slugs,
                redo_problems: vec![],
            })
        }
    }
}
