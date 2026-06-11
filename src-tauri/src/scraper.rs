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

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SyncProgressEvent {
    pub current: i64,
    pub total: i64,
    pub leetcode_id: i64,
    pub title: String,
    pub status: String,
}

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
    status: Option<String>,
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
    #[serde(rename = "codeSnippets")]
    code_snippets: Option<Vec<GqlCodeSnippet>>,
}

#[derive(Deserialize)]
struct GqlCodeSnippet {
    lang: String,
    langSlug: String,
    code: String,
}

#[derive(Deserialize)]
struct TopicTag {
    name: String,
}

static PROBLEM_CACHE: Mutex<Option<HashMap<i64, ProblemMapEntry>>> = Mutex::new(None);

#[derive(Clone)]
struct ProblemMapEntry {
    title_slug: String,
    question_id: i64,
}

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

fn build_user_agent() -> String {
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36".into()
}

fn new_client() -> reqwest::Client {
    reqwest::Client::builder()
        .user_agent(build_user_agent())
        .timeout(std::time::Duration::from_secs(15))
        .build()
        .expect("创建 HTTP 客户端失败")
}

async fn build_problem_cache() -> Result<HashMap<i64, ProblemMapEntry>, String> {
    let client = new_client();
    let resp = client
        .get("https://leetcode.cn/api/problems/all/")
        .send()
        .await
        .map_err(|e| format!("请求题目列表失败: {}", e))?;

    if !resp.status().is_success() {
        return Err(format!("服务器返回状态码: {}", resp.status()));
    }

    let text = resp.text().await.map_err(|e| format!("读取响应失败: {}", e))?;
    let data: AllProblemsResponse = serde_json::from_str(&text)
        .map_err(|e| format!("解析题目列表失败: {}", e))?;

    let mut map = HashMap::new();
    for pair in data.stat_status_pairs {
        if !pair.paid_only {
            if let Ok(id) = pair.stat.frontend_question_id.parse::<i64>() {
                map.insert(id, ProblemMapEntry {
                    title_slug: pair.stat.question__title_slug,
                    question_id: pair.stat.question_id,
                });
            }
        }
    }
    Ok(map)
}

async fn get_cache() -> Result<HashMap<i64, ProblemMapEntry>, String> {
    {
        let cache = PROBLEM_CACHE.lock().map_err(|e| format!("缓存锁错误: {}", e))?;
        if let Some(ref c) = *cache {
            return Ok(c.clone());
        }
    }
    let built = build_problem_cache().await?;
    let mut cache = PROBLEM_CACHE.lock().map_err(|e| format!("缓存锁错误: {}", e))?;
    *cache = Some(built.clone());
    Ok(built)
}

async fn fetch_detail(title_slug: &str) -> Result<QuestionDetail, String> {
    let client = new_client();
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
                    codeSnippets {
                        lang
                        langSlug
                        code
                    }
                }
            }
        "#,
        "variables": { "titleSlug": title_slug },
        "operationName": "questionData"
    });

    let resp = client
        .post("https://leetcode.cn/graphql/")
        .json(&query)
        .send()
        .await
        .map_err(|e| format!("请求题目详情失败: {}", e))?;

    if !resp.status().is_success() {
        return Err(format!("GraphQL 返回状态码: {}", resp.status()));
    }

    let gql_resp: GraphQLResponse = resp
        .json()
        .await
        .map_err(|e| format!("解析题目详情失败: {}", e))?;

    gql_resp.data.question.ok_or_else(|| "未找到题目信息".into())
}

pub async fn fetch_problem_info(leetcode_id: i64) -> Result<FetchedProblemInfo, String> {
    let cache = get_cache().await?;
    let entry = cache
        .get(&leetcode_id)
        .ok_or_else(|| format!("未找到题号 #{}，请确认题号是否正确", leetcode_id))?;

    let detail = fetch_detail(&entry.title_slug).await?;

    let tags: Vec<String> = detail
        .topic_tags
        .iter()
        .map(|t| map_tag_name(&t.name))
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

pub async fn fetch_code_templates(leetcode_id: i64) -> Result<Vec<super::models::CodeTemplate>, String> {
    let cache = get_cache().await?;
    let entry = cache
        .get(&leetcode_id)
        .ok_or_else(|| format!("未找到题号 #{}", leetcode_id))?;

    let detail = fetch_detail(&entry.title_slug).await?;
    let snippets = detail.code_snippets.unwrap_or_default();

    let frontend_lang_map: Vec<(&str, &str)> = vec![
        ("python3", "Python"),
        ("java", "Java"),
        ("cpp", "C++"),
        ("golang", "Go"),
        ("rust", "Rust"),
        ("javascript", "JavaScript"),
        ("typescript", "TypeScript"),
        ("csharp", "C#"),
        ("swift", "Swift"),
        ("kotlin", "Kotlin"),
        ("ruby", "Ruby"),
        ("php", "PHP"),
        ("scala", "Scala"),
        ("dart", "Dart"),
    ];

    Ok(snippets.iter().filter_map(|s| {
        frontend_lang_map.iter()
            .find(|(slug, _)| *slug == s.langSlug)
            .map(|(_, frontend)| super::models::CodeTemplate {
                lang: frontend.to_string(),
                code: s.code.clone(),
            })
    }).collect())
}

pub async fn fetch_user_progress(cookie: Option<&str>) -> Result<Vec<super::models::UserProgressItem>, String> {
    let client = new_client();
    let mut req = client.get("https://leetcode.cn/api/problems/all/");
    if let Some(c) = cookie {
        let c = c.trim();
        if !c.is_empty() {
            let cookie_val = if c.contains('=') {
                c.to_string()
            } else {
                format!("LEETCODE_SESSION={}", c)
            };
            req = req.header("Cookie", cookie_val);
        }
    }
    let resp = req.send().await.map_err(|e| format!("请求题目列表失败: {}", e))?;

    if !resp.status().is_success() {
        return Err(format!("服务器返回状态码: {}", resp.status()));
    }

    let text = resp.text().await.map_err(|e| format!("读取响应失败: {}", e))?;
    let data: AllProblemsResponse = serde_json::from_str(&text)
        .map_err(|e| format!("解析题目列表失败: {}", e))?;

    let mut items = Vec::new();
    for pair in &data.stat_status_pairs {
        if pair.paid_only { continue; }

        let leetcode_status = match pair.status.as_deref() {
            Some("ac") => "Solved",
            Some("notac") => "Attempted",
            _ => continue,
        };

        if let Ok(id) = pair.stat.frontend_question_id.parse::<i64>() {
            items.push(super::models::UserProgressItem {
                leetcode_id: id,
                title: pair.stat.question__title.clone(),
                difficulty: match pair.difficulty.level {
                    1 => "easy",
                    2 => "medium",
                    _ => "hard",
                }.into(),
                status: leetcode_status.into(),
                tags: vec![],
                title_slug: pair.stat.question__title_slug.clone(),
            });
        }
    }
    Ok(items)
}

// ---- Language mapping for submission ----

fn map_language(frontend_name: &str) -> Result<String, String> {
    match frontend_name {
        "Python" => Ok("python3".into()),
        "Java" => Ok("java".into()),
        "C++" => Ok("cpp".into()),
        "Go" => Ok("golang".into()),
        "Rust" => Ok("rust".into()),
        "JavaScript" => Ok("javascript".into()),
        "TypeScript" => Ok("typescript".into()),
        "C#" => Ok("csharp".into()),
        "Swift" => Ok("swift".into()),
        "Kotlin" => Ok("kotlin".into()),
        "Ruby" => Ok("ruby".into()),
        "PHP" => Ok("php".into()),
        "Scala" => Ok("scala".into()),
        "Dart" => Ok("dart".into()),
        _ => Err(format!("不支持的语言: {}", frontend_name)),
    }
}

// ---- CSRF token management ----

static CSRF_TOKEN: Mutex<Option<String>> = Mutex::new(None);

async fn fetch_csrf_token(session_cookie: &str) -> Result<String, String> {
    let client = new_client();
    let resp = client
        .get("https://leetcode.cn/")
        .header("Cookie", session_cookie)
        .send()
        .await
        .map_err(|e| format!("获取 csrf token 失败: {}", e))?;

    let token = resp
        .headers()
        .get("set-cookie")
        .and_then(|v| v.to_str().ok())
        .and_then(|s| {
            s.split(';')
                .find(|part| part.trim().starts_with("csrftoken="))
                .map(|part| part.trim().trim_start_matches("csrftoken=").to_string())
        })
        .ok_or_else(|| "无法从响应中提取 csrftoken".to_string())?;

    let mut cache = CSRF_TOKEN.lock().map_err(|e| format!("csrf 缓存锁错误: {}", e))?;
    *cache = Some(token.clone());
    Ok(token)
}

fn get_cached_csrf_token() -> Option<String> {
    CSRF_TOKEN.lock().ok().and_then(|s| s.clone())
}

fn parse_cookies(input: &str) -> String {
    let trimmed = input.trim();
    if trimmed.is_empty() {
        return String::new();
    }
    if trimmed.contains("LEETCODE_SESSION") {
        trimmed.to_string()
    } else if trimmed.contains('=') {
        trimmed.to_string()
    } else {
        format!("LEETCODE_SESSION={}", trimmed)
    }
}

async fn ensure_cookies(cookie_str: &str) -> Result<(String, String), String> {
    let full_cookies = parse_cookies(cookie_str);

    let csrf = match get_cached_csrf_token() {
        Some(token) => token,
        None => fetch_csrf_token(&full_cookies).await?,
    };

    let mut final_cookies = full_cookies;
    if !final_cookies.contains("csrftoken") {
        final_cookies.push_str(&format!("; csrftoken={}", csrf));
    }

    Ok((final_cookies, csrf))
}

// ---- Submission API ----

#[derive(Deserialize)]
struct SubmitResponse {
    submission_id: i64,
}

#[derive(Deserialize)]
#[allow(non_snake_case)]
struct CheckResponse {
    state: String,
    status_msg: Option<String>,
    total_correct: Option<i64>,
    total_testcases: Option<i64>,
    status_runtime: Option<String>,
    status_memory: Option<String>,
    full_compile_error: Option<String>,
    full_runtime_error: Option<String>,
    last_testcase: Option<String>,
    expected_output: Option<String>,
    code_output: Option<String>,
}

pub async fn submit_code(
    leetcode_id: i64,
    language: &str,
    code: &str,
    cookie_str: &str,
) -> Result<super::models::SubmissionResult, String> {
    let cache = get_cache().await?;
    let entry = cache
        .get(&leetcode_id)
        .ok_or_else(|| format!("题号 #{} 不在缓存中，请先同步或抓取", leetcode_id))?;

    let lang_key = map_language(language)?;
    let (cookies, csrf_token) = ensure_cookies(cookie_str).await?;
    let title_slug = &entry.title_slug;
    let question_id = entry.question_id;

    let client = new_client();

    let submit_body = serde_json::json!({
        "lang": lang_key,
        "question_id": question_id,
        "typed_code": code,
        "test_mode": false,
        "test_judger": "",
    });

    let resp = client
        .post(&format!("https://leetcode.cn/problems/{}/submit/", title_slug))
        .header("Cookie", &cookies)
        .header("X-Csrftoken", &csrf_token)
        .header("Referer", format!("https://leetcode.cn/problems/{}/", title_slug))
        .header("Origin", "https://leetcode.cn")
        .json(&submit_body)
        .send()
        .await
        .map_err(|e| format!("提交代码失败: {}", e))?;

    if !resp.status().is_success() {
        let status = resp.status();
        let text = resp.text().await.unwrap_or_default();
        return Err(format!("提交接口返回 {}: {}", status, text));
    }

    let submit_resp: SubmitResponse = resp
        .json()
        .await
        .map_err(|e| format!("解析提交响应失败: {}", e))?;

    poll_submission(submit_resp.submission_id, &cookies, &csrf_token).await
}

async fn poll_submission(
    submission_id: i64,
    cookies: &str,
    csrf_token: &str,
) -> Result<super::models::SubmissionResult, String> {
    let client = reqwest::Client::builder()
        .user_agent(build_user_agent())
        .timeout(std::time::Duration::from_secs(10))
        .build()
        .map_err(|e| format!("创建 HTTP 客户端失败: {}", e))?;

    let url = format!("https://leetcode.cn/submissions/detail/{}/check/", submission_id);

    for _ in 0..60 {
        let resp = client
            .get(&url)
            .header("Cookie", cookies)
            .header("X-Csrftoken", csrf_token)
            .send()
            .await
            .map_err(|e| format!("查询判题结果失败: {}", e))?;

        if !resp.status().is_success() {
            return Err(format!("判题接口返回状态码: {}", resp.status()));
        }

        let check: CheckResponse = resp
            .json()
            .await
            .map_err(|e| format!("解析判题结果失败: {}", e))?;

        match check.state.as_str() {
            "SUCCESS" | "FAILED" => {
                return Ok(super::models::SubmissionResult {
                    status: check.status_msg.unwrap_or_default(),
                    passed: check.total_correct.unwrap_or(0),
                    total: check.total_testcases.unwrap_or(0),
                    runtime: check.status_runtime.unwrap_or_default(),
                    memory: check.status_memory.unwrap_or_default(),
                    compile_error: check.full_compile_error.unwrap_or_default(),
                    runtime_error: check.full_runtime_error.unwrap_or_default(),
                    last_testcase: check.last_testcase.unwrap_or_default(),
                    expected_output: check.expected_output.unwrap_or_default(),
                    code_output: check.code_output.unwrap_or_default(),
                });
            }
            _ => {
                tokio::time::sleep(std::time::Duration::from_secs(1)).await;
            }
        }
    }

    Err("判题超时（超过 60 秒）".into())
}


