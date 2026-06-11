use tauri::State;
use crate::db::Database;
use crate::models::*;
use crate::scraper;

#[tauri::command]
pub fn get_tags(db: State<Database>) -> Result<Vec<Tag>, String> {
    db.get_tags().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn fetch_problem_info(leetcode_id: i64) -> Result<scraper::FetchedProblemInfo, String> {
    scraper::fetch_problem_info(leetcode_id)
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
