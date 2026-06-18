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
pub struct TagDueCount {
    pub id: i64,
    pub name: String,
    pub color: String,
    pub due_count: i64,
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
pub struct LastSubmission {
    pub code: String,
    pub lang: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SubmissionStat {
    pub title_slug: String,
    pub total_tries: i64,
    pub total_accepted: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RefreshStatsResult {
    pub processed: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ReviewStats {
    pub total_reviewed: i64,
    pub today_reviewed: i64,
    pub due_count: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ReviewRecord {
    pub id: i64,
    pub problem_id: i64,
    pub problem_title: String,
    pub confidence: String,
    pub ease_factor: f64,
    pub interval_days: i64,
    pub repetitions: i64,
    pub next_review: String,
    pub reviewed_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SyncAcCodesResult {
    pub total_found: i64,
    pub saved: i64,
    pub skipped: i64,
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

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CustomApiEntry {
    pub id: i64,
    pub container: String,
    pub method_name: String,
    pub language: String,
    pub signatures: String,
    pub description: String,
    pub examples: String,
    pub returns: String,
    pub complexity: String,
    pub notes: String,
    pub leetcode_tips: String,
    pub see_also: String,
    pub problem_id: Option<i64>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateCustomApiDTO {
    pub container: String,
    pub method_name: String,
    pub language: String,
    #[serde(default)]
    pub signatures: Option<String>,
    #[serde(default)]
    pub description: Option<String>,
    #[serde(default)]
    pub examples: Option<String>,
    #[serde(default)]
    pub returns: Option<String>,
    #[serde(default)]
    pub complexity: Option<String>,
    #[serde(default)]
    pub notes: Option<String>,
    #[serde(default)]
    pub leetcode_tips: Option<String>,
    #[serde(default)]
    pub see_also: Option<String>,
    #[serde(default)]
    pub problem_id: Option<i64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateCustomApiDTO {
    #[serde(default)]
    pub container: Option<String>,
    #[serde(default)]
    pub method_name: Option<String>,
    #[serde(default)]
    pub language: Option<String>,
    #[serde(default)]
    pub signatures: Option<String>,
    #[serde(default)]
    pub description: Option<String>,
    #[serde(default)]
    pub examples: Option<String>,
    #[serde(default)]
    pub returns: Option<String>,
    #[serde(default)]
    pub complexity: Option<String>,
    #[serde(default)]
    pub notes: Option<String>,
    #[serde(default)]
    pub leetcode_tips: Option<String>,
    #[serde(default)]
    pub see_also: Option<String>,
    #[serde(default)]
    pub problem_id: Option<i64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SolutionApproach {
    pub id: i64,
    pub problem_id: i64,
    pub title: String,
    pub description: String,
    pub language: String,
    pub code: String,
    pub time_complexity: String,
    pub space_complexity: String,
    pub sort_order: i64,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateSolutionApproachDTO {
    pub problem_id: i64,
    pub title: String,
    #[serde(default)]
    pub description: Option<String>,
    #[serde(default)]
    pub language: Option<String>,
    #[serde(default)]
    pub code: Option<String>,
    #[serde(default)]
    pub time_complexity: Option<String>,
    #[serde(default)]
    pub space_complexity: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateSolutionApproachDTO {
    #[serde(default)]
    pub title: Option<String>,
    #[serde(default)]
    pub description: Option<String>,
    #[serde(default)]
    pub language: Option<String>,
    #[serde(default)]
    pub code: Option<String>,
    #[serde(default)]
    pub time_complexity: Option<String>,
    #[serde(default)]
    pub space_complexity: Option<String>,
    #[serde(default)]
    pub sort_order: Option<i64>,
}
