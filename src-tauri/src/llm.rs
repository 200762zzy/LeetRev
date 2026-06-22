use crate::db::Database;
use crate::models::*;
use serde::Serialize;

pub struct LlmConfig {
    pub provider: String,
    pub ollama_url: String,
    pub ollama_model: String,
    pub openai_key: String,
    pub openai_base_url: String,
    pub openai_model: String,
}

#[derive(Serialize)]
pub struct BetterSolution {
    pub title: String,
    pub language: String,
    pub code: String,
    pub time_complexity: String,
    pub space_complexity: String,
    pub explanation: String,
}

pub struct LlmResult {
    pub time_complexity: String,
    pub space_complexity: String,
    pub score: i64,
    pub summary: String,
    pub suggestions: String,
    pub optimized_code: Option<String>,
    pub better_solution: Option<BetterSolution>,
}

fn read_llm_config(db: &Database) -> LlmConfig {
    fn get(db: &Database, key: &str, default: &str) -> String {
        db.get_setting(key).ok().flatten().unwrap_or_else(|| default.to_string())
    }
    LlmConfig {
        provider: get(db, "llm_provider", "ollama"),
        ollama_url: get(db, "llm_ollama_url", "http://localhost:11434"),
        ollama_model: get(db, "llm_ollama_model", "qwen2.5-coder:7b"),
        openai_key: get(db, "llm_openai_key", ""),
        openai_base_url: get(db, "llm_openai_base_url", "https://api.openai.com/v1"),
        openai_model: get(db, "llm_openai_model", "gpt-4o-mini"),
    }
}

fn build_prompt(code: &str, language: &str, runtime_ms: &str, memory_mb: &str) -> String {
    let runtime_line = if runtime_ms.is_empty() { String::new() } else { format!("\n- 运行时间: {} ms", runtime_ms) };
    let memory_line = if memory_mb.is_empty() { String::new() } else { format!("\n- 内存消耗: {} MB", memory_mb) };
    format!(
        r#"你是一个 LeetCode 代码分析专家。请分析以下 {} 代码，返回严格的 JSON 格式（不要包含 ```json 标记或其他文本）：

{{
  "time_complexity": "时间复杂度",
  "space_complexity": "空间复杂度",
  "score": 整数0-100,
  "summary": "简要分析（中文，50字以内）",
  "suggestions": ["优化建议1（中文）", "优化建议2（中文）"],
  "optimized_code": "基于原始代码的优化版本（保留原解法和逻辑，仅做代码层面的优化，如减少冗余、使用更简洁的API、优化边界处理等，输出完整的可运行代码）",
  "better_solution": {{
    "title": "完全不同的更优解法名称（中文，如 双指针优化、动态规划、前缀和等）",
    "language": "{}",
    "code": "更优解法的完整可运行代码",
    "time_complexity": "更优解法的时间复杂度",
    "space_complexity": "更优解法的空间复杂度",
    "explanation": "简要解释更优解法的思路（中文，80字以内）"
  }}
}}

评分维度：
- 算法最优性 30分（是否最优解）
- 数据结构使用 30分（是否恰当）
- 代码简洁性 20分（可读性、冗余度）
- 空间效率 20分（内存使用）

附加信息：{} {}

代码：
```{}
{}```"#,
        language, language, runtime_line, memory_line, language, code
    )
}

async fn call_ollama(config: &LlmConfig, prompt: &str) -> Result<String, String> {
    let url = format!("{}/api/generate", config.ollama_url.trim_end_matches('/'));
    let body = serde_json::json!({
        "model": config.ollama_model,
        "prompt": prompt,
        "stream": false,
    });
    let client = reqwest::Client::new();
    let resp = client.post(&url)
        .json(&body)
        .send()
        .await
        .map_err(|e| format!("Ollama 请求失败: {}", e))?;
    let text = resp.text().await.map_err(|e| format!("读取响应失败: {}", e))?;
    let parsed: serde_json::Value = serde_json::from_str(&text)
        .map_err(|e| format!("解析响应失败: {}", e))?;
    parsed["response"].as_str()
        .ok_or_else(|| "Ollama 响应中缺少 response 字段".into())
        .map(|s| s.to_string())
}

async fn call_openai(config: &LlmConfig, prompt: &str) -> Result<String, String> {
    let url = format!("{}/chat/completions", config.openai_base_url.trim_end_matches('/'));
    let body = serde_json::json!({
        "model": config.openai_model,
        "messages": [
            {"role": "system", "content": "你是一个 LeetCode 代码分析专家。只返回 JSON，不要包含任何其他文本或 markdown 标记。"},
            {"role": "user", "content": prompt}
        ],
    });
    let client = reqwest::Client::new();
    let resp = client.post(&url)
        .header("Authorization", format!("Bearer {}", config.openai_key))
        .json(&body)
        .send()
        .await
        .map_err(|e| format!("请求失败: {}", e))?;
    let status = resp.status();
    let text = resp.text().await.map_err(|e| format!("读取响应失败: {}", e))?;
    let parsed: serde_json::Value = serde_json::from_str(&text)
        .map_err(|e| format!("响应不是有效 JSON: {} — 原始响应: {}", e, text.chars().take(300).collect::<String>()))?;
    if let Some(err) = parsed["error"].as_object() {
        let msg = err.get("message").and_then(|m| m.as_str()).unwrap_or("未知错误");
        return Err(format!("API 错误 (HTTP {status}): {msg}"));
    }
    if status != 200 {
        return Err(format!("API 返回 HTTP {status}: {}", text.chars().take(200).collect::<String>()));
    }
    parsed["choices"][0]["message"]["content"].as_str()
        .ok_or_else(|| {
            let snippet: String = text.chars().take(300).collect();
            format!("响应缺少 choices[0].message.content，请检查模型名「{}」是否正确。原始响应: {}", config.openai_model, snippet)
        })
        .map(|s| s.to_string())
}

fn parse_llm_response(raw: &str) -> Result<LlmResult, String> {
    let cleaned = raw
        .trim_start_matches("```json")
        .trim_start_matches("```")
        .trim_end_matches("```")
        .trim();
    let parsed: serde_json::Value = serde_json::from_str(cleaned)
        .map_err(|e| format!("LLM 返回格式无效: {} — 原始响应: {}", e, raw.chars().take(200).collect::<String>()))?;

    let better_solution = parsed["better_solution"].as_object().map(|obj| {
        BetterSolution {
            title: obj.get("title").and_then(|v| v.as_str()).unwrap_or("").to_string(),
            language: obj.get("language").and_then(|v| v.as_str()).unwrap_or("").to_string(),
            code: obj.get("code").and_then(|v| v.as_str()).unwrap_or("").to_string(),
            time_complexity: obj.get("time_complexity").and_then(|v| v.as_str()).unwrap_or("").to_string(),
            space_complexity: obj.get("space_complexity").and_then(|v| v.as_str()).unwrap_or("").to_string(),
            explanation: obj.get("explanation").and_then(|v| v.as_str()).unwrap_or("").to_string(),
        }
    }).filter(|bs| !bs.code.is_empty());

    Ok(LlmResult {
        time_complexity: parsed["time_complexity"].as_str().unwrap_or("").to_string(),
        space_complexity: parsed["space_complexity"].as_str().unwrap_or("").to_string(),
        score: parsed["score"].as_i64().unwrap_or(0).max(0).min(100),
        summary: parsed["summary"].as_str().unwrap_or("").to_string(),
        suggestions: parsed["suggestions"].as_array()
            .map(|arr| serde_json::to_string(arr).unwrap_or_else(|_| "[]".into()))
            .unwrap_or_else(|| "[]".into()),
        optimized_code: parsed["optimized_code"].as_str().map(|s| s.to_string()).filter(|s| !s.is_empty()),
        better_solution,
    })
}

pub async fn analyze_code(db: &Database, data: &AnalyzeCodeDTO) -> Result<LlmResult, String> {
    let config = read_llm_config(db);
    let prompt = build_prompt(&data.code, &data.language, data.runtime_ms.as_deref().unwrap_or(""), data.memory_mb.as_deref().unwrap_or(""));
    let raw = match config.provider.as_str() {
        "openai" => {
            if config.openai_key.is_empty() {
                return Err("请先在设置中配置 OpenAI API Key".into());
            }
            call_openai(&config, &prompt).await?
        }
        _ => {
            call_ollama(&config, &prompt).await?
        }
    };
    parse_llm_response(&raw)
}

pub fn model_name(db: &Database) -> String {
    let config = read_llm_config(db);
    match config.provider.as_str() {
        "openai" => config.openai_model,
        _ => config.ollama_model,
    }
}

pub fn provider_name(db: &Database) -> String {
    let config = read_llm_config(db);
    config.provider
}