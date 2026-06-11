use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Tag {
    pub id: i64,
    pub name: String,
    pub color: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Problem {
    pub id: i64,
    pub leetcode_id: Option<i64>,
    pub title: String,
    pub title_cn: Option<String>,
    pub difficulty: String,
    pub status: String,
    pub leetcode_url: Option<String>,
    pub notes: Option<String>,
    pub content: Option<String>,
    pub solution_code: Option<String>,
    pub code_language: Option<String>,
    pub created_at: String,
    pub updated_at: String,
    pub tags: Vec<Tag>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateProblemDTO {
    pub leetcode_id: Option<i64>,
    pub title: String,
    pub title_cn: Option<String>,
    pub difficulty: String,
    #[serde(default)]
    pub status: Option<String>,
    pub leetcode_url: Option<String>,
    pub notes: Option<String>,
    pub content: Option<String>,
    pub tag_ids: Vec<i64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateProblemDTO {
    #[serde(default)]
    pub leetcode_id: Option<i64>,
    #[serde(default)]
    pub title: Option<String>,
    #[serde(default)]
    pub title_cn: Option<String>,
    #[serde(default)]
    pub difficulty: Option<String>,
    #[serde(default)]
    pub status: Option<String>,
    #[serde(default)]
    pub leetcode_url: Option<String>,
    #[serde(default)]
    pub notes: Option<String>,
    #[serde(default)]
    pub content: Option<String>,
    #[serde(default)]
    pub tag_ids: Option<Vec<i64>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Stats {
    pub total: i64,
    pub solved: i64,
    pub attempted: i64,
    pub todo: i64,
    pub revisit: i64,
    pub by_difficulty: DifficultyStats,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DifficultyStats {
    pub easy: i64,
    pub medium: i64,
    pub hard: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TagStats {
    pub tag_id: i64,
    pub tag_name: String,
    pub total: i64,
    pub solved: i64,
    pub rate: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CodeSnippet {
    pub id: i64,
    pub problem_id: i64,
    pub language: String,
    pub code: String,
    pub version: i64,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SaveCodeSnippetDTO {
    pub problem_id: i64,
    pub language: String,
    pub code: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SyncResult {
    pub total: i64,
    pub imported: i64,
    pub updated: i64,
    pub failed: i64,
    pub failed_items: Vec<SyncFailedItem>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SyncFailedItem {
    pub leetcode_id: i64,
    pub title: String,
    pub reason: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UserProgressItem {
    pub leetcode_id: i64,
    pub title: String,
    pub difficulty: String,
    pub status: String,
    pub tags: Vec<String>,
    pub title_slug: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CodeTemplate {
    pub lang: String,
    pub code: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SubmissionResult {
    pub status: String,
    pub passed: i64,
    pub total: i64,
    pub runtime: String,
    pub memory: String,
    pub compile_error: String,
    pub runtime_error: String,
    pub last_testcase: String,
    pub expected_output: String,
    pub code_output: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProblemFilters {
    pub search: Option<String>,
    pub difficulty: Option<String>,
    pub status: Option<String>,
    pub tag_id: Option<i64>,
    pub sort_by: Option<String>,
    pub sort_order: Option<String>,
    pub page: Option<i64>,
    pub page_size: Option<i64>,
}
