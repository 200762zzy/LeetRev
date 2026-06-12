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

fn extract_csrftoken_from_headers(headers: &reqwest::header::HeaderMap) -> Option<String> {
    // Try every Set-Cookie header
    for header in headers.get_all("set-cookie") {
        if let Ok(s) = header.to_str() {
            for part in s.split(';') {
                let trimmed = part.trim();
            if let Some(val) = trimmed.strip_prefix("csrftoken=") {
                return Some(val.to_string());
            }
            }
        }
    }
    // Try x-csrf-token response header
    if let Some(val) = headers.get("x-csrf-token").and_then(|v| v.to_str().ok()) {
        return Some(val.to_string());
    }
    if let Some(val) = headers.get("x-csrftoken").and_then(|v| v.to_str().ok()) {
        return Some(val.to_string());
    }
    None
}

async fn fetch_csrf_token(session_cookie: &str) -> Result<String, String> {
    let client = new_client();

    // Try 1: GET homepage
    let resp = client
        .get("https://leetcode.cn/")
        .header("Cookie", session_cookie)
        .send()
        .await
        .map_err(|e| format!("获取 csrf token 失败: {}", e))?;

    if let Some(token) = extract_csrftoken_from_headers(resp.headers()) {
        let mut cache = CSRF_TOKEN.lock().map_err(|e| format!("csrf 缓存锁错误: {}", e))?;
        *cache = Some(token.clone());
        return Ok(token);
    }

    // Try 2: GET /api/problems/all/ (known to work with session cookie)
    let resp = client
        .get("https://leetcode.cn/api/problems/all/")
        .header("Cookie", session_cookie)
        .send()
        .await
        .map_err(|e| format!("获取 csrf token 失败(2): {}", e))?;

    if let Some(token) = extract_csrftoken_from_headers(resp.headers()) {
        let mut cache = CSRF_TOKEN.lock().map_err(|e| format!("csrf 缓存锁错误: {}", e))?;
        *cache = Some(token.clone());
        return Ok(token);
    }

    // Try 3: POST /graphql/ with a simple query
    let query = serde_json::json!({
        "query": "{ userStatus { userId } }",
        "operationName": "userStatus"
    });
    let resp = client
        .post("https://leetcode.cn/graphql/")
        .header("Cookie", session_cookie)
        .json(&query)
        .send()
        .await
        .map_err(|e| format!("获取 csrf token 失败(3): {}", e))?;

    if let Some(token) = extract_csrftoken_from_headers(resp.headers()) {
        let mut cache = CSRF_TOKEN.lock().map_err(|e| format!("csrf 缓存锁错误: {}", e))?;
        *cache = Some(token.clone());
        return Ok(token);
    }

    Err("无法从响应中提取 csrftoken（尝试了首页 /api/problems/all/ /graphql/ 三种方式）".into())
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
    if !final_cookies.contains("csrftoken=") {
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

fn map_lang_backend_to_frontend(backend: &str) -> Option<String> {
    match backend {
        "python3" => Some("Python".into()),
        "java" => Some("Java".into()),
        "cpp" => Some("C++".into()),
        "golang" => Some("Go".into()),
        "rust" => Some("Rust".into()),
        "javascript" => Some("JavaScript".into()),
        "typescript" => Some("TypeScript".into()),
        "csharp" => Some("C#".into()),
        "swift" => Some("Swift".into()),
        "kotlin" => Some("Kotlin".into()),
        "ruby" => Some("Ruby".into()),
        "php" => Some("PHP".into()),
        "scala" => Some("Scala".into()),
        "dart" => Some("Dart".into()),
        _ => None,
    }
}



pub struct FetchedAcceptedSubmission {
    pub title_slug: String,
    pub code: String,
    pub lang: String,
}

pub async fn fetch_all_accepted_submissions(
    cookie_str: &str,
) -> Result<Vec<FetchedAcceptedSubmission>, String> {
    let cookies = parse_cookies(cookie_str);
    if cookies.is_empty() {
        return Err("缺少 LEETCODE_SESSION cookie".into());
    }

    let client = new_client();
    let mut results = Vec::new();

    // Method 1: REST API with browser-like headers (may need CSRF)
    let (full_cookies, csrf_token) = match ensure_cookies(cookie_str).await {
        Ok(v) => (Some(v.0), Some(v.1)),
        Err(_) => (None, None),
    };
    let request_cookies = full_cookies.as_deref().unwrap_or(&cookies);

    for page in 0..5 {
        let offset = page * 20;
        let url = format!("https://leetcode.cn/api/submissions/?offset={}&limit=20", offset);

        let mut req = client
            .get(&url)
            .header("Cookie", request_cookies)
            .header("Referer", "https://leetcode.cn/")
            .header("Origin", "https://leetcode.cn")
            .header("Accept", "application/json, text/plain, */*");

        if let Some(ref csrf) = csrf_token {
            req = req.header("X-Csrftoken", csrf);
        }

        let resp = match req.send().await {
            Ok(r) if r.status().is_success() => r,
            Ok(r) => {
                let status = r.status();
                let _ = r.text().await;
                eprintln!("[scraper] 提交记录 API 返回 {}，尝试其它方式", status);
                break;
            }
            Err(e) => {
                eprintln!("[scraper] 提交记录 API 请求失败: {}", e);
                break;
            }
        };

        let data: serde_json::Value = match resp.json().await {
            Ok(v) => v,
            Err(e) => {
                eprintln!("[scraper] 解析提交记录响应失败: {}", e);
                break;
            }
        };

        let dump = match data["submissions_dump"].as_array() {
            Some(d) => d,
            _ => {
                eprintln!("[scraper] 提交记录响应格式异常，缺少 submissions_dump 字段");
                break;
            }
        };

        for sub in dump {
            if sub["status_display"].as_str().unwrap_or("") != "Accepted" {
                continue;
            }
            let slug = match sub["title_slug"].as_str() {
                Some(s) => s,
                _ => continue,
            };
            let code = match sub["code"].as_str() {
                Some(c) => c.trim(),
                _ => continue,
            };
            if code.is_empty() {
                continue;
            }
            let lang = sub["lang"].as_str().unwrap_or("python3");
            let frontend = map_lang_backend_to_frontend(lang)
                .unwrap_or_else(|| "Python".into());

            results.push(FetchedAcceptedSubmission {
                title_slug: slug.to_string(),
                code: code.to_string(),
                lang: frontend,
            });
        }

        if !data["has_next"].as_bool().unwrap_or(false) {
            break;
        }
    }

    if !results.is_empty() {
        return Ok(results);
    }

    // Method 2: GraphQL submissionList query with CSRF
    if let (Some(ref fc), Some(ref csrf)) = (full_cookies, csrf_token) {
        let list_query = serde_json::json!({
            "query": r#"
                query submissions($offset: Int!, $limit: Int!) {
                    submissionList(offset: $offset, limit: $limit) {
                        submissions {
                            id
                            titleSlug
                            statusDisplay
                            lang
                            code
                        }
                    }
                }
            "#,
            "variables": { "offset": 0, "limit": 40 },
            "operationName": "submissions"
        });

        if let Ok(resp) = client
            .post("https://leetcode.cn/graphql/")
            .header("Cookie", fc.as_str())
            .header("X-Csrftoken", csrf.as_str())
            .header("Referer", "https://leetcode.cn/")
            .header("Origin", "https://leetcode.cn")
            .json(&list_query)
            .send()
            .await
        {
            if resp.status().is_success() {
                if let Ok(data) = resp.json::<serde_json::Value>().await {
                    if let Some(subs) = data["data"]["submissionList"]["submissions"].as_array() {
                        for sub in subs {
                            if sub["statusDisplay"].as_str().unwrap_or("") != "Accepted" {
                                continue;
                            }
                            let slug = match sub["titleSlug"].as_str() {
                                Some(s) => s,
                                _ => continue,
                            };
                            let code = match sub["code"].as_str() {
                                Some(c) => c.trim(),
                                _ => continue,
                            };
                            if code.is_empty() {
                                continue;
                            }
                            let lang = sub["lang"].as_str().unwrap_or("python3");
                            let frontend = map_lang_backend_to_frontend(lang)
                                .unwrap_or_else(|| "Python".into());

                            results.push(FetchedAcceptedSubmission {
                                title_slug: slug.to_string(),
                                code: code.to_string(),
                                lang: frontend,
                            });
                        }
                    }
                }
            }
        }
    }

    Ok(results)
}

pub async fn fetch_last_accepted_submission(
    leetcode_id: i64,
    cookie_str: &str,
) -> Result<Option<super::models::LastSubmission>, String> {
    let cache = get_cache().await?;
    let entry = cache
        .get(&leetcode_id)
        .ok_or_else(|| format!("题号 #{} 不在缓存中", leetcode_id))?;
    let slug = &entry.title_slug;

    let cookies = parse_cookies(cookie_str);
    if cookies.is_empty() {
        return Err("缺少 LEETCODE_SESSION cookie，请在设置中配置".into());
    }

    let client = new_client();

    // Method 1: REST API /api/submissions/ (works with just session cookie, same as sync)
    for page in 0..3 {
        let offset = page * 20;
        let url = format!("https://leetcode.cn/api/submissions/?offset={}&limit=20", offset);
        let resp = match client
            .get(&url)
            .header("Cookie", &cookies)
            .send()
            .await
        {
            Ok(r) if r.status().is_success() => r,
            _ => break, // REST API not available
        };

        let data: serde_json::Value = match resp.json().await {
            Ok(v) => v,
            _ => break,
        };

        let dump = match data["submissions_dump"].as_array() {
            Some(d) => d,
            _ => break,
        };

        for sub in dump {
            if sub["title_slug"].as_str().unwrap_or("") != slug {
                continue;
            }
            if sub["status_display"].as_str().unwrap_or("") != "Accepted" {
                continue;
            }
            if let Some(code) = sub["code"].as_str() {
                let code = code.trim();
                if !code.is_empty() {
                    let lang = sub["lang"].as_str().unwrap_or("python3");
                    let frontend = map_lang_backend_to_frontend(lang)
                        .unwrap_or_else(|| "Python".into());
                    return Ok(Some(super::models::LastSubmission {
                        code: code.to_string(),
                        lang: frontend,
                    }));
                }
            }
        }

        if !data["has_next"].as_bool().unwrap_or(false) {
            break;
        }
    }

    // Method 2: GraphQL with CSRF (fallback)
    if let Ok((full_cookies, csrf)) = ensure_cookies(cookie_str).await {
        // Get username via GraphQL
        let username = {
            let status_query = serde_json::json!({
                "query": r#"
                    query userStatus {
                        userStatus {
                            username
                            isSignedIn
                        }
                    }
                "#,
                "operationName": "userStatus"
            });

            match client
                .post("https://leetcode.cn/graphql/")
                .header("Cookie", &full_cookies)
                .header("X-Csrftoken", &csrf)
                .json(&status_query)
                .send()
                .await
            {
                Ok(r) => match r.json::<serde_json::Value>().await {
                    Ok(v) => v["data"]["userStatus"]["username"]
                        .as_str()
                        .filter(|u| !u.is_empty())
                        .map(String::from),
                    _ => None,
                },
                _ => None,
            }
        };

        if let Some(ref username) = username {
            // Get recent AC submission list
            let list_query = serde_json::json!({
                "query": r#"
                    query recentAcSubmissions($username: String!, $limit: Int!) {
                        recentAcSubmissionList(username: $username, limit: $limit) {
                            id
                            titleSlug
                        }
                    }
                "#,
                "variables": { "username": username, "limit": 50 },
                "operationName": "recentAcSubmissions"
            });

            let submissions = match client
                .post("https://leetcode.cn/graphql/")
                .header("Cookie", &full_cookies)
                .header("X-Csrftoken", &csrf)
                .json(&list_query)
                .send()
                .await
            {
                Ok(r) => match r.json::<serde_json::Value>().await {
                    Ok(v) => v["data"]["recentAcSubmissionList"].as_array().cloned(),
                    _ => None,
                },
                _ => None,
            };

            if let Some(submissions) = submissions {
                if let Some(matching) = submissions.iter().find(|sub| {
                    sub["titleSlug"].as_str().unwrap_or("") == slug
                }) {
                    let sub_id = matching["id"].as_i64().or_else(|| {
                        matching["id"].as_str().and_then(|s| s.parse::<i64>().ok())
                    });

                    if let Some(sid) = sub_id {
                        // Get submission details
                        let detail_query = serde_json::json!({
                            "query": r#"
                                query submissionDetails($submissionId: Int!) {
                                    submissionDetails(submissionId: $submissionId) {
                                        code
                                        lang {
                                            name
                                            verboseName
                                        }
                                    }
                                }
                            "#,
                            "variables": { "submissionId": sid },
                            "operationName": "submissionDetails"
                        });

                        if let Ok(r) = client
                            .post("https://leetcode.cn/graphql/")
                            .header("Cookie", &full_cookies)
                            .header("X-Csrftoken", &csrf)
                            .json(&detail_query)
                            .send()
                            .await
                        {
                            if let Ok(data) = r.json::<serde_json::Value>().await {
                                if let Some(code) = data["data"]["submissionDetails"]["code"].as_str() {
                                    let code = code.trim();
                                    if !code.is_empty() {
                                        let lang_name = data["data"]["submissionDetails"]["lang"]["name"]
                                            .as_str()
                                            .unwrap_or("python3");
                                        let frontend = map_lang_backend_to_frontend(lang_name)
                                            .unwrap_or_else(|| "Python".into());
                                        return Ok(Some(super::models::LastSubmission {
                                            code: code.to_string(),
                                            lang: frontend,
                                        }));
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    Ok(None)
}


