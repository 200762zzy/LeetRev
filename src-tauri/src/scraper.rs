use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::Mutex;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FetchedProblemInfo {
    pub leetcode_id: i64,
    pub title: String,
    pub title_cn: String,
    pub difficulty: String,
    pub tags: Vec<String>,
    pub content: String,
    pub url: String,
}

// ---- API response types ----

#[derive(Deserialize)]
struct AllProblemsResponse {
    stat_status_pairs: Vec<StatStatusPair>,
}

#[derive(Deserialize)]
struct StatStatusPair {
    stat: Stat,
    #[allow(dead_code)]
    difficulty: DifficultyLevel,
    paid_only: bool,
}

#[derive(Deserialize)]
#[allow(non_snake_case, dead_code)]
struct Stat {
    question_id: i64,
    question__title: String,
    question__title_slug: String,
    frontend_question_id: String,
}

#[derive(Deserialize)]
#[allow(dead_code)]
struct DifficultyLevel {
    level: i64,
}

#[derive(Deserialize)]
struct GraphQLResponse {
    data: GraphQLData,
}

#[derive(Deserialize)]
struct GraphQLData {
    question: Option<QuestionDetail>,
}

#[derive(Deserialize)]
struct QuestionDetail {
    title: String,
    #[serde(rename = "translatedTitle")]
    translated_title: Option<String>,
    difficulty: String,
    content: Option<String>,
    #[serde(rename = "translatedContent")]
    translated_content: Option<String>,
    #[serde(rename = "topicTags")]
    topic_tags: Vec<TopicTag>,
}

#[derive(Deserialize)]
struct TopicTag {
    name: String,
}

// ---- Caching ----

static PROBLEM_CACHE: Mutex<Option<HashMap<i64, ProblemMapEntry>>> = Mutex::new(None);

struct ProblemMapEntry {
    title_slug: String,
}

// ---- Implementation ----

fn map_tag_name(name: &str) -> String {
    lookup_tag(name).unwrap_or(name).to_string()
}

fn lookup_tag(name: &str) -> Option<&'static str> {
    match name {
        "Array" => Some("数组"),
        "String" => Some("字符串"),
        "Hash Table" => Some("哈希表"),
        "Linked List" => Some("链表"),
        "Math" => Some("数学"),
        "Two Pointers" => Some("双指针"),
        "Sliding Window" => Some("滑动窗口"),
        "Stack" => Some("栈"),
        "Queue" => Some("队列"),
        "Tree" => Some("树"),
        "Binary Tree" => Some("二叉树"),
        "Heap (Priority Queue)" | "Heap" => Some("堆"),
        "Greedy" => Some("贪心"),
        "Dynamic Programming" => Some("动态规划"),
        "Backtracking" => Some("回溯"),
        "Depth-First Search" => Some("DFS"),
        "Breadth-First Search" => Some("BFS"),
        "Graph" => Some("图"),
        "Binary Search" => Some("二分查找"),
        "Sorting" => Some("排序"),
        "Bit Manipulation" => Some("位运算"),
        "Recursion" => Some("递归"),
        "Divide and Conquer" => Some("分治"),
        "Design" => Some("设计"),
        "Database" => Some("数据库"),
        "Trie" => Some("字典树"),
        "Union Find" => Some("并查集"),
        "Segment Tree" => Some("线段树"),
        "Ordered Set" => Some("有序集合"),
        "Monotonic Stack" => Some("单调栈"),
        "Monotonic Queue" => Some("单调队列"),
        "Prefix Sum" => Some("前缀和"),
        "Memoization" => Some("记忆化搜索"),
        "Game Theory" => Some("博弈论"),
        "Counting" => Some("计数"),
        "Enumeration" => Some("枚举"),
        "Simulation" => Some("模拟"),
        "Combinatorics" => Some("组合数学"),
        "Number Theory" => Some("数论"),
        "Geometry" => Some("几何"),
        "Randomized" => Some("随机化"),
        "Interactive" => Some("交互"),
        "Shell" => Some("Shell"),
        "Concurrency" => Some("并发"),
        "Rolling Hash" => Some("滚动哈希"),
        "Suffix Array" => Some("后缀数组"),
        "Bucket Sort" => Some("桶排序"),
        "Radix Sort" => Some("基数排序"),
        "Merge Sort" => Some("归并排序"),
        "Counting Sort" => Some("计数排序"),
        "Quickselect" => Some("快速选择"),
        "Probability and Statistics" => Some("概率与统计"),
        "Reservoir Sampling" => Some("蓄水池抽样"),
        "Iterator" => Some("迭代器"),
        "Hash Function" => Some("哈希函数"),
        "Data Stream" => Some("数据流"),
        "Shortest Path" => Some("最短路"),
        "Minimum Spanning Tree" => Some("最小生成树"),
        "Topological Sort" => Some("拓扑排序"),
        "Strongly Connected Component" => Some("强连通分量"),
        "Eulerian Circuit" => Some("欧拉回路"),
        "Biconnected Component" => Some("双连通分量"),
        "Doubly-Linked List" => Some("双向链表"),
        "AVL Tree" => Some("AVL树"),
        "Red-Black Tree" => Some("红黑树"),
        "Binary Indexed Tree" => Some("树状数组"),
        _ => None,
    }
}

fn build_problem_cache() -> Result<HashMap<i64, ProblemMapEntry>, String> {
    let client = reqwest::blocking::Client::builder()
        .user_agent("LeetRev/0.1.0")
        .timeout(std::time::Duration::from_secs(10))
        .build()
        .map_err(|e| format!("创建 HTTP 客户端失败: {}", e))?;

    let resp = client
        .get("https://leetcode.cn/api/problems/all/")
        .send()
        .map_err(|e| format!("请求题目列表失败: {}", e))?;

    if !resp.status().is_success() {
        return Err(format!("服务器返回状态码: {}", resp.status()));
    }

    let text = resp.text().map_err(|e| format!("读取响应失败: {}", e))?;
    let data: AllProblemsResponse = serde_json::from_str(&text)
        .map_err(|e| format!("解析题目列表失败: {}", e))?;

    let mut map = HashMap::new();
    for pair in data.stat_status_pairs {
        if !pair.paid_only {
            if let Ok(id) = pair.stat.frontend_question_id.parse::<i64>() {
                map.insert(
                    id,
                    ProblemMapEntry {
                        title_slug: pair.stat.question__title_slug,
                    },
                );
            }
        }
    }

    Ok(map)
}

fn get_or_build_cache() -> Result<std::sync::MutexGuard<'static, Option<HashMap<i64, ProblemMapEntry>>>, String> {
    let mut cache = PROBLEM_CACHE.lock().map_err(|e| format!("缓存锁错误: {}", e))?;
    if cache.is_none() {
        *cache = Some(build_problem_cache()?);
    }
    Ok(cache)
}

fn fetch_detail(title_slug: &str) -> Result<QuestionDetail, String> {
    let client = reqwest::blocking::Client::builder()
        .user_agent("LeetRev/0.1.0")
        .timeout(std::time::Duration::from_secs(10))
        .build()
        .map_err(|e| format!("创建 HTTP 客户端失败: {}", e))?;

    let query = serde_json::json!({
        "query": r#"
            query questionData($titleSlug: String!) {
                question(titleSlug: $titleSlug) {
                    questionId
                    title
                    translatedTitle
                    difficulty
                    content
                    translatedContent
                    topicTags {
                        name
                    }
                }
            }
        "#,
        "variables": {
            "titleSlug": title_slug
        },
        "operationName": "questionData"
    });

    let resp = client
        .post("https://leetcode.cn/graphql/")
        .json(&query)
        .send()
        .map_err(|e| format!("请求题目详情失败: {}", e))?;

    if !resp.status().is_success() {
        return Err(format!("GraphQL 返回状态码: {}", resp.status()));
    }

    let gql_resp: GraphQLResponse = resp
        .json()
        .map_err(|e| format!("解析题目详情失败: {}", e))?;

    gql_resp.data.question.ok_or_else(|| "未找到题目信息".into())
}

pub fn fetch_problem_info(leetcode_id: i64) -> Result<FetchedProblemInfo, String> {
    let cache = get_or_build_cache()?;
    let entry = cache
        .as_ref()
        .ok_or("缓存未初始化")?
        .get(&leetcode_id)
        .ok_or_else(|| format!("未找到题号 #{}，请确认题号是否正确", leetcode_id))?;

    let detail = fetch_detail(&entry.title_slug)?;

    let tags: Vec<String> = detail
        .topic_tags
        .iter()
        .map(|t| map_tag_name(&t.name).to_string())
        .collect();

    Ok(FetchedProblemInfo {
        leetcode_id,
        title: detail.title,
        title_cn: detail.translated_title.unwrap_or_default(),
        difficulty: detail.difficulty.to_lowercase(),
        tags,
        content: detail.translated_content.or(detail.content).unwrap_or_default(),
        url: format!("https://leetcode.cn/problems/{}/", entry.title_slug),
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_cache_lock() {
        let cache = PROBLEM_CACHE.lock().unwrap();
        assert!(cache.is_some() || cache.is_none());
    }
}
