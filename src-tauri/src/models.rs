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
    pub status: Option<String>,
    pub leetcode_url: Option<String>,
    pub notes: Option<String>,
    pub tag_ids: Vec<i64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateProblemDTO {
    pub leetcode_id: Option<i64>,
    pub title: Option<String>,
    pub title_cn: Option<String>,
    pub difficulty: Option<String>,
    pub status: Option<String>,
    pub leetcode_url: Option<String>,
    pub notes: Option<String>,
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
