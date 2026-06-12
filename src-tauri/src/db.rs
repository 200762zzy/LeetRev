use rusqlite::{Connection, Result, params};
use std::sync::Mutex;
use crate::models::*;

pub struct Database {
    pub conn: Mutex<Connection>,
}

impl Database {
    pub fn new(db_path: &str) -> Result<Self> {
        let conn = Connection::open(db_path)?;
        let db = Database {
            conn: Mutex::new(conn),
        };
        db.migrate()?;
        db.seed_tags()?;
        Ok(db)
    }

    fn migrate(&self) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute_batch("
            CREATE TABLE IF NOT EXISTS tags (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL UNIQUE,
                color TEXT DEFAULT '#6366f1'
            );

            CREATE TABLE IF NOT EXISTS problems (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                leetcode_id INTEGER UNIQUE,
                title TEXT NOT NULL,
                title_cn TEXT,
                difficulty TEXT NOT NULL CHECK(difficulty IN ('easy','medium','hard')),
                status TEXT NOT NULL DEFAULT 'todo' CHECK(status IN ('todo','attempted','solved','revisit')),
                leetcode_url TEXT,
                notes TEXT,
                content TEXT,
                solution_code TEXT,
                code_language TEXT,
                created_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
                updated_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
            );

            CREATE TABLE IF NOT EXISTS problem_tags (
                problem_id INTEGER NOT NULL,
                tag_id INTEGER NOT NULL,
                PRIMARY KEY (problem_id, tag_id),
                FOREIGN KEY (problem_id) REFERENCES problems(id) ON DELETE CASCADE,
                FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
            );

            CREATE TRIGGER IF NOT EXISTS update_problem_timestamp
            AFTER UPDATE ON problems
            FOR EACH ROW
            BEGIN
                UPDATE problems SET updated_at = datetime('now','localtime') WHERE id = OLD.id;
            END;

            CREATE TABLE IF NOT EXISTS code_snippets (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                problem_id INTEGER NOT NULL,
                language TEXT NOT NULL,
                code TEXT NOT NULL DEFAULT '',
                version INTEGER NOT NULL DEFAULT 1,
                created_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
                FOREIGN KEY (problem_id) REFERENCES problems(id) ON DELETE CASCADE
            );

            CREATE TRIGGER IF NOT EXISTS trg_code_snippets_ai
            AFTER INSERT ON code_snippets
            BEGIN
                UPDATE problems SET updated_at = datetime('now','localtime') WHERE id = NEW.problem_id;
            END;

            CREATE TRIGGER IF NOT EXISTS trg_code_snippets_ad
            AFTER DELETE ON code_snippets
            BEGIN
                UPDATE problems SET updated_at = datetime('now','localtime') WHERE id = OLD.problem_id;
            END;

            CREATE TRIGGER IF NOT EXISTS trg_code_snippets_au
            AFTER UPDATE ON code_snippets
            BEGIN
                UPDATE problems SET updated_at = datetime('now','localtime') WHERE id = NEW.problem_id;
            END;
        ")?;

        // Migration: add content column for databases created before Phase 5
        let has_content = conn
            .prepare("PRAGMA table_info(problems)")?
            .query_map([], |row| row.get::<_, String>(1))?
            .filter_map(|r| r.ok())
            .any(|name| name == "content");
        if !has_content {
            conn.execute_batch("ALTER TABLE problems ADD COLUMN content TEXT")?;
        }

        conn.execute_batch(
            "CREATE TABLE IF NOT EXISTS settings (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL
            );"
        )?;

        // Migration: reviews table
        conn.execute_batch(
            "CREATE TABLE IF NOT EXISTS reviews (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                problem_id INTEGER NOT NULL REFERENCES problems(id) ON DELETE CASCADE,
                confidence TEXT NOT NULL CHECK(confidence IN ('easy','medium','hard')),
                reviewed_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
            );"
        )?;

        // Migration: submission_stats table
        conn.execute_batch(
            "CREATE TABLE IF NOT EXISTS submission_stats (
                problem_id INTEGER PRIMARY KEY REFERENCES problems(id) ON DELETE CASCADE,
                total_tries INTEGER NOT NULL DEFAULT 0,
                total_accepted INTEGER NOT NULL DEFAULT 0,
                updated_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
            );"
        )?;

        // Migration: SM-2 columns for reviews
        for alter in &[
            "ALTER TABLE reviews ADD COLUMN ease_factor REAL DEFAULT 2.5",
            "ALTER TABLE reviews ADD COLUMN interval_days INTEGER DEFAULT 0",
            "ALTER TABLE reviews ADD COLUMN repetitions INTEGER DEFAULT 0",
            "ALTER TABLE reviews ADD COLUMN next_review TEXT DEFAULT ''",
        ] {
            let _ = conn.execute(alter, []);
        }

        // Backfill next_review for existing pre-SM-2 reviews
        let _ = conn.execute(
            "UPDATE reviews SET
                ease_factor = CASE confidence WHEN 'easy' THEN 2.6 WHEN 'medium' THEN 2.5 ELSE 1.3 END,
                interval_days = CASE confidence WHEN 'easy' THEN 7 WHEN 'medium' THEN 3 ELSE 1 END,
                repetitions = CASE confidence WHEN 'easy' THEN 2 WHEN 'medium' THEN 1 ELSE 0 END,
                next_review = datetime(reviewed_at, '+' ||
                    CASE confidence WHEN 'easy' THEN 7 WHEN 'medium' THEN 3 ELSE 1 END || ' days')
             WHERE next_review = ''",
            [],
        );

        // Backfill next_review for new-next_review-only reviews (SM-2 recorded with valid next_review but interval_days=0)
        let _ = conn.execute(
            "UPDATE reviews SET interval_days = CAST(
                julianday(next_review) - julianday(reviewed_at) AS INTEGER
             ) WHERE interval_days = 0 AND next_review != ''",
            [],
        );

        Ok(())
    }

    fn seed_tags(&self) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        let tags = [
            "数组", "字符串", "哈希表", "链表", "数学",
            "双指针", "滑动窗口", "栈", "队列",
            "树", "二叉树", "堆", "贪心",
            "动态规划", "回溯", "DFS", "BFS", "图",
            "二分查找", "排序", "位运算", "递归",
            "分治", "设计", "数据库",
        ];
        for name in &tags {
            conn.execute(
                "INSERT OR IGNORE INTO tags (name) VALUES (?1)",
                params![name],
            )?;
        }
        Ok(())
    }

    pub fn get_tags(&self) -> Result<Vec<Tag>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare("SELECT id, name, color FROM tags ORDER BY id")?;
        let tags = stmt.query_map([], |row| {
            Ok(Tag {
                id: row.get(0)?,
                name: row.get(1)?,
                color: row.get(2)?,
            })
        })?.filter_map(|r| r.ok()).collect();
        Ok(tags)
    }

    pub fn create_tag(&self, name: &str, color: &str) -> Result<Tag> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "INSERT INTO tags (name, color) VALUES (?1, ?2)",
            params![name, color],
        )?;
        let id = conn.last_insert_rowid();
        Ok(Tag { id, name: name.into(), color: color.into() })
    }

    pub fn update_tag(&self, id: i64, name: &str, color: &str) -> Result<Tag> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "UPDATE tags SET name = ?1, color = ?2 WHERE id = ?3",
            params![name, color, id],
        )?;
        Ok(Tag { id, name: name.into(), color: color.into() })
    }

    pub fn delete_tag(&self, id: i64) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute("DELETE FROM tags WHERE id = ?1", params![id])?;
        Ok(())
    }

    pub fn find_problem_by_leetcode_id(&self, leetcode_id: i64) -> Result<Option<i64>> {
        let conn = self.conn.lock().unwrap();
        match conn.query_row(
            "SELECT id FROM problems WHERE leetcode_id = ?1",
            params![leetcode_id],
            |row| row.get(0),
        ) {
            Ok(id) => Ok(Some(id)),
            Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
            Err(e) => Err(e),
        }
    }

    pub fn get_setting(&self, key: &str) -> Result<Option<String>> {
        let conn = self.conn.lock().unwrap();
        match conn.query_row(
            "SELECT value FROM settings WHERE key = ?1",
            params![key],
            |row| row.get(0),
        ) {
            Ok(v) => Ok(Some(v)),
            Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
            Err(e) => Err(e),
        }
    }

    pub fn set_setting(&self, key: &str, value: &str) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "INSERT OR REPLACE INTO settings (key, value) VALUES (?1, ?2)",
            params![key, value],
        )?;
        Ok(())
    }

    fn get_problem_by_conn(conn: &Connection, id: i64) -> Result<Problem> {
        let mut stmt = conn.prepare(
            "SELECT id, leetcode_id, title, title_cn, difficulty, status,
                    leetcode_url, notes, content, solution_code, code_language,
                    created_at, updated_at
             FROM problems WHERE id = ?1"
        )?;
        let mut problem = stmt.query_row(params![id], |row| {
            Ok(Problem {
                id: row.get(0)?,
                leetcode_id: row.get(1)?,
                title: row.get(2)?,
                title_cn: row.get(3)?,
                difficulty: row.get(4)?,
                status: row.get(5)?,
                leetcode_url: row.get(6)?,
                notes: row.get(7)?,
                content: row.get(8)?,
                solution_code: row.get(9)?,
                code_language: row.get(10)?,
                created_at: row.get(11)?,
                updated_at: row.get(12)?,
                tags: Vec::new(),
            })
        })?;

        let mut tag_stmt = conn.prepare(
            "SELECT t.id, t.name, t.color FROM tags t
             JOIN problem_tags pt ON t.id = pt.tag_id
             WHERE pt.problem_id = ?1 ORDER BY t.id"
        )?;
        problem.tags = tag_stmt.query_map(params![id], |row| {
            Ok(Tag {
                id: row.get(0)?,
                name: row.get(1)?,
                color: row.get(2)?,
            })
        })?.filter_map(|r| r.ok()).collect();

        Ok(problem)
    }

    pub fn get_problem(&self, id: i64) -> Result<Problem> {
        let conn = self.conn.lock().unwrap();
        Self::get_problem_by_conn(&conn, id)
    }

    pub fn get_problems(&self, filters: &ProblemFilters) -> Result<Vec<Problem>> {
        let conn = self.conn.lock().unwrap();
        let mut sql = String::from(
            "SELECT DISTINCT p.id FROM problems p
             LEFT JOIN problem_tags pt ON p.id = pt.problem_id
             WHERE 1=1"
        );
        let mut param_values: Vec<Box<dyn rusqlite::types::ToSql>> = Vec::new();

        if let Some(ref s) = filters.search {
            if !s.is_empty() {
                param_values.push(Box::new(format!("%{}%", s)));
                let idx = param_values.len();
                sql.push_str(&format!(" AND (p.title LIKE ?{} OR CAST(p.leetcode_id AS TEXT) LIKE ?{})", idx, idx));
            }
        }
        if let Some(ref d) = filters.difficulty {
            if !d.is_empty() {
                param_values.push(Box::new(d.clone()));
                sql.push_str(&format!(" AND p.difficulty = ?{}", param_values.len()));
            }
        }
        if let Some(ref s) = filters.status {
            if !s.is_empty() {
                param_values.push(Box::new(s.clone()));
                sql.push_str(&format!(" AND p.status = ?{}", param_values.len()));
            }
        }
        if let Some(t) = filters.tag_id {
            if t > 0 {
                param_values.push(Box::new(t));
                sql.push_str(&format!(" AND pt.tag_id = ?{}", param_values.len()));
            }
        }

        let sort_by = match filters.sort_by.as_deref() {
            Some("title") => "p.title",
            Some("difficulty") => "p.difficulty",
            Some("created_at") => "p.created_at",
            _ => "p.leetcode_id",
        };
        let sort_order = match filters.sort_order.as_deref() {
            Some("asc") => "ASC",
            _ => "DESC",
        };
        sql.push_str(&format!(" ORDER BY {} {}", sort_by, sort_order));

        if let Some(ps) = filters.page_size {
            let page = filters.page.unwrap_or(1).max(1);
            let offset = (page - 1) * ps;
            sql.push_str(&format!(" LIMIT {} OFFSET {}", ps, offset));
        }

        let mut stmt = conn.prepare(&sql)?;
        let params_refs: Vec<&dyn rusqlite::types::ToSql> = param_values.iter().map(|p| p.as_ref()).collect();
        let problem_ids: Vec<i64> = stmt.query_map(params_refs.as_slice(), |row| {
            Ok(row.get::<_, i64>(0)?)
        })?.filter_map(|r| r.ok()).collect();

        let mut problems = Vec::new();
        for pid in &problem_ids {
            if let Ok(p) = Self::get_problem_by_conn(&conn, *pid) {
                problems.push(p);
            }
        }
        Ok(problems)
    }

    pub fn get_problems_count(&self, filters: &ProblemFilters) -> Result<i64> {
        let conn = self.conn.lock().unwrap();
        let mut sql = String::from(
            "SELECT COUNT(DISTINCT p.id) FROM problems p
             LEFT JOIN problem_tags pt ON p.id = pt.problem_id
             WHERE 1=1"
        );
        let mut param_values: Vec<Box<dyn rusqlite::types::ToSql>> = Vec::new();

        if let Some(ref s) = filters.search {
            if !s.is_empty() {
                param_values.push(Box::new(format!("%{}%", s)));
                let idx = param_values.len();
                sql.push_str(&format!(" AND (p.title LIKE ?{} OR CAST(p.leetcode_id AS TEXT) LIKE ?{})", idx, idx));
            }
        }
        if let Some(ref d) = filters.difficulty {
            if !d.is_empty() {
                param_values.push(Box::new(d.clone()));
                sql.push_str(&format!(" AND p.difficulty = ?{}", param_values.len()));
            }
        }
        if let Some(ref s) = filters.status {
            if !s.is_empty() {
                param_values.push(Box::new(s.clone()));
                sql.push_str(&format!(" AND p.status = ?{}", param_values.len()));
            }
        }
        if let Some(t) = filters.tag_id {
            if t > 0 {
                param_values.push(Box::new(t));
                sql.push_str(&format!(" AND pt.tag_id = ?{}", param_values.len()));
            }
        }

        let mut stmt = conn.prepare(&sql)?;
        let params_refs: Vec<&dyn rusqlite::types::ToSql> = param_values.iter().map(|p| p.as_ref()).collect();
        stmt.query_row(params_refs.as_slice(), |row| row.get(0))
    }

    fn sm2_ef(ef: f64, quality: i32) -> f64 {
        let new_ef = ef + (0.1 - (5 - quality) as f64 * (0.08 + (5 - quality) as f64 * 0.02));
        new_ef.max(1.3)
    }

    pub fn record_review(&self, problem_id: i64, confidence: &str) -> Result<()> {
        let conn = self.conn.lock().unwrap();

        // Load previous SM-2 state for this problem
        let (prev_ef, prev_interval, prev_reps): (f64, i64, i64) = conn
            .query_row(
                "SELECT ease_factor, interval_days, repetitions
                 FROM reviews WHERE problem_id = ?1
                 ORDER BY id DESC LIMIT 1",
                params![problem_id],
                |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?)),
            )
            .unwrap_or((2.5, 0, 0));

        let quality = match confidence {
            "easy" => 4,
            "medium" => 3,
            _ => 1,
        };

        let (new_ef, new_interval, new_reps) = if quality < 3 {
            // Hard → reset
            let ef = Self::sm2_ef(prev_ef, quality);
            (ef, 1i64, 0i64)
        } else if prev_reps == 0 {
            let ef = Self::sm2_ef(prev_ef, quality);
            (ef, 1i64, 1i64)
        } else if prev_reps == 1 {
            let ef = Self::sm2_ef(prev_ef, quality);
            (ef, 6i64, 2i64)
        } else {
            let ef = Self::sm2_ef(prev_ef, quality);
            let interval = (prev_interval as f64 * ef).round() as i64;
            (ef, interval.max(1), prev_reps + 1)
        };

        let next_review_sql = format!(
            "datetime('now','localtime', '+{} days')",
            new_interval
        );

        conn.execute(
            &format!(
                "INSERT INTO reviews (problem_id, confidence, ease_factor, interval_days, repetitions, next_review)
                 VALUES (?1, ?2, ?3, ?4, ?5, {})",
                next_review_sql
            ),
            params![problem_id, confidence, new_ef, new_interval, new_reps],
        )?;

        Ok(())
    }

    pub fn get_review_queue(&self) -> Result<Vec<Problem>> {
        let conn = self.conn.lock().unwrap();
        // Problems never reviewed OR past due based on SM-2 next_review
        let sql = "
            SELECT p.id, p.leetcode_id, p.title, p.title_cn, p.difficulty, p.status,
                   p.leetcode_url, p.notes, p.content, p.solution_code, p.code_language,
                   p.created_at, p.updated_at
            FROM problems p
            WHERE (
                (SELECT COUNT(*) FROM reviews r WHERE r.problem_id = p.id) = 0
                OR (
                    (SELECT next_review FROM reviews r WHERE r.problem_id = p.id ORDER BY id DESC LIMIT 1)
                    <= datetime('now','localtime')
                )
            )
            ORDER BY
                (SELECT next_review FROM reviews r WHERE r.problem_id = p.id ORDER BY id DESC LIMIT 1) IS NULL DESC,
                (SELECT next_review FROM reviews r WHERE r.problem_id = p.id ORDER BY id DESC LIMIT 1) ASC
        ";
        let mut stmt = conn.prepare(sql)?;
        let problems = stmt.query_map([], |row| {
            Ok(Problem {
                id: row.get(0)?,
                leetcode_id: row.get(1)?,
                title: row.get(2)?,
                title_cn: row.get(3)?,
                difficulty: row.get(4)?,
                status: row.get(5)?,
                leetcode_url: row.get(6)?,
                notes: row.get(7)?,
                content: row.get(8)?,
                solution_code: row.get(9)?,
                code_language: row.get(10)?,
                created_at: row.get(11)?,
                updated_at: row.get(12)?,
                tags: Vec::new(),
            })
        })?.filter_map(|r| r.ok()).collect::<Vec<_>>();

        // Load tags for each problem
        let mut result = Vec::new();
        for mut p in problems {
            let tag_sql = "SELECT t.id, t.name, t.color FROM tags t
                           JOIN problem_tags pt ON t.id = pt.tag_id
                           WHERE pt.problem_id = ?1 ORDER BY t.id";
            if let Ok(mut stmt) = conn.prepare(tag_sql) {
                if let Ok(rows) = stmt.query_map(params![p.id], |row| {
                    Ok(Tag {
                        id: row.get(0)?,
                        name: row.get(1)?,
                        color: row.get(2)?,
                    })
                }) {
                    p.tags = rows.collect::<Result<Vec<_>>>().unwrap_or_default();
                }
            }
            result.push(p);
        }
        Ok(result)
    }

    pub fn get_review_stats(&self) -> Result<(i64, i64, i64)> {
        let conn = self.conn.lock().unwrap();
        // total_reviewed, today_reviewed, due_count
        let total_reviewed: i64 = conn.query_row(
            "SELECT COUNT(DISTINCT problem_id) FROM reviews", [], |row| row.get(0),
        ).unwrap_or(0);

        let today_reviewed: i64 = conn.query_row(
            "SELECT COUNT(DISTINCT problem_id) FROM reviews
             WHERE date(reviewed_at) = date('now','localtime')", [], |row| row.get(0),
        ).unwrap_or(0);

        let due_count: i64 = conn.query_row(
            "SELECT COUNT(*) FROM problems p WHERE (
                (SELECT COUNT(*) FROM reviews r WHERE r.problem_id = p.id) = 0
                OR (
                    (SELECT next_review FROM reviews r WHERE r.problem_id = p.id ORDER BY id DESC LIMIT 1)
                    <= datetime('now','localtime')
                )
            )", [], |row| row.get(0),
        ).unwrap_or(0);

        Ok((total_reviewed, today_reviewed, due_count))
    }

    pub fn get_random_problem(&self) -> Result<Option<Problem>> {
        let conn = self.conn.lock().unwrap();
        let ids: Vec<i64> = conn.prepare("SELECT id FROM problems ORDER BY RANDOM() LIMIT 1")
            .and_then(|mut stmt| {
                let rows = stmt.query_map([], |row| row.get::<_, i64>(0))?;
                Ok(rows.filter_map(|r| r.ok()).collect::<Vec<_>>())
            }).unwrap_or_default();

        match ids.first() {
            Some(id) => Ok(Some(Self::get_problem_by_conn(&conn, *id)?)),
            None => Ok(None),
        }
    }

    pub fn create_problem(&self, data: &CreateProblemDTO) -> Result<Problem> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "INSERT INTO problems (leetcode_id, title, title_cn, difficulty, status, leetcode_url, notes, content)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
            params![
                data.leetcode_id,
                data.title,
                data.title_cn,
                data.difficulty,
                data.status.as_deref().unwrap_or("todo"),
                data.leetcode_url,
                data.notes,
                data.content,
            ],
        )?;
        let problem_id = conn.last_insert_rowid();

        for tag_id in &data.tag_ids {
            conn.execute(
                "INSERT OR IGNORE INTO problem_tags (problem_id, tag_id) VALUES (?1, ?2)",
                params![problem_id, tag_id],
            )?;
        }

        Self::get_problem_by_conn(&conn, problem_id)
    }

    pub fn update_problem(&self, id: i64, data: &UpdateProblemDTO) -> Result<Problem> {
        let conn = self.conn.lock().unwrap();

        let mut sets = Vec::new();
        let mut params_vec: Vec<Box<dyn rusqlite::types::ToSql>> = Vec::new();

        if let Some(ref v) = data.leetcode_id {
            sets.push("leetcode_id = ?");
            params_vec.push(Box::new(*v));
        }
        if let Some(ref v) = data.title {
            sets.push("title = ?");
            params_vec.push(Box::new(v.clone()));
        }
        if let Some(ref v) = data.title_cn {
            sets.push("title_cn = ?");
            params_vec.push(Box::new(v.clone()));
        }
        if let Some(ref v) = data.difficulty {
            sets.push("difficulty = ?");
            params_vec.push(Box::new(v.clone()));
        }
        if let Some(ref v) = data.status {
            sets.push("status = ?");
            params_vec.push(Box::new(v.clone()));
        }
        if let Some(ref v) = data.leetcode_url {
            sets.push("leetcode_url = ?");
            params_vec.push(Box::new(v.clone()));
        }
        if let Some(ref v) = data.notes {
            sets.push("notes = ?");
            params_vec.push(Box::new(v.clone()));
        }
        if let Some(ref v) = data.content {
            sets.push("content = ?");
            params_vec.push(Box::new(v.clone()));
        }

        if !sets.is_empty() {
            let sql = format!(
                "UPDATE problems SET {} WHERE id = ?",
                sets.join(", ")
            );
            params_vec.push(Box::new(id));
            let params_refs: Vec<&dyn rusqlite::types::ToSql> = params_vec.iter().map(|p| p.as_ref()).collect();
            conn.execute(&sql, params_refs.as_slice())?;
        }

        if let Some(ref tag_ids) = data.tag_ids {
            conn.execute("DELETE FROM problem_tags WHERE problem_id = ?1", params![id])?;
            for tag_id in tag_ids {
                conn.execute(
                    "INSERT OR IGNORE INTO problem_tags (problem_id, tag_id) VALUES (?1, ?2)",
                    params![id, tag_id],
                )?;
            }
        }

        Self::get_problem_by_conn(&conn, id)
    }

    pub fn update_problem_content(&self, id: i64, content: &str) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "UPDATE problems SET content = ?1, updated_at = datetime('now','localtime') WHERE id = ?2",
            params![content, id],
        )?;
        Ok(())
    }

    pub fn delete_problem(&self, id: i64) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute("DELETE FROM problems WHERE id = ?1", params![id])?;
        Ok(())
    }

    pub fn get_stats(&self) -> Result<Stats> {
        let conn = self.conn.lock().unwrap();
        let (total, solved, attempted, todo, revisit) = conn.query_row(
            "SELECT COUNT(*),
                    SUM(CASE WHEN status = 'solved' THEN 1 ELSE 0 END),
                    SUM(CASE WHEN status = 'attempted' THEN 1 ELSE 0 END),
                    SUM(CASE WHEN status = 'todo' THEN 1 ELSE 0 END),
                    SUM(CASE WHEN status = 'revisit' THEN 1 ELSE 0 END)
             FROM problems", [], |row| {
            Ok((
                row.get::<_, i64>(0)?,
                row.get::<_, i64>(1)?,
                row.get::<_, i64>(2)?,
                row.get::<_, i64>(3)?,
                row.get::<_, i64>(4)?,
            ))
        })?;

        let (easy, medium, hard) = conn.query_row(
            "SELECT
                SUM(CASE WHEN difficulty = 'easy' THEN 1 ELSE 0 END),
                SUM(CASE WHEN difficulty = 'medium' THEN 1 ELSE 0 END),
                SUM(CASE WHEN difficulty = 'hard' THEN 1 ELSE 0 END)
             FROM problems", [], |row| {
            Ok((
                row.get::<_, i64>(0)?,
                row.get::<_, i64>(1)?,
                row.get::<_, i64>(2)?,
            ))
        })?;

        Ok(Stats {
            total,
            solved,
            attempted,
            todo,
            revisit,
            by_difficulty: DifficultyStats { easy, medium, hard },
        })
    }

    pub fn compute_submission_stats(&self) -> Result<i64> {
        let conn = self.conn.lock().unwrap();
        // Clear old stats
        conn.execute("DELETE FROM submission_stats", [])?;
        // Insert fresh stats from problems table: solved→1/1, attempted→1/0
        let inserted = conn.execute(
            "INSERT INTO submission_stats (problem_id, total_tries, total_accepted, updated_at)
             SELECT id, 1,
                    CASE WHEN status = 'solved' THEN 1 ELSE 0 END,
                    datetime('now','localtime')
             FROM problems
             WHERE status IN ('solved', 'attempted')",
            [],
        )?;
        Ok(inserted as i64)
    }

    pub fn update_submission_stats(&self, stats: Vec<SubmissionStat>) -> Result<i64> {
        let conn = self.conn.lock().unwrap();
        let mut processed = 0i64;

        // Build a map of title_slug (from leetcode_url) to problem_id
        let mut slug_map: std::collections::HashMap<String, i64> = std::collections::HashMap::new();
        if let Ok(mut stmt) = conn.prepare("SELECT id, leetcode_url FROM problems WHERE leetcode_url IS NOT NULL") {
            if let Ok(rows) = stmt.query_map([], |row| {
                let id: i64 = row.get(0)?;
                let url: String = row.get(1)?;
                // Extract slug from url like "https://leetcode.cn/problems/two-sum/"
                let slug = url
                    .trim_end_matches('/')
                    .rsplit('/')
                    .next()
                    .unwrap_or("")
                    .to_string();
                Ok((id, slug))
            }) {
                for r in rows.flatten() {
                    slug_map.insert(r.1, r.0);
                }
            }
        }

        for stat in &stats {
            if let Some(&problem_id) = slug_map.get(&stat.title_slug) {
                conn.execute(
                    "INSERT INTO submission_stats (problem_id, total_tries, total_accepted, updated_at)
                     VALUES (?1, ?2, ?3, datetime('now','localtime'))
                     ON CONFLICT(problem_id) DO UPDATE SET
                         total_tries = ?2,
                         total_accepted = ?3,
                         updated_at = datetime('now','localtime')",
                    params![problem_id, stat.total_tries, stat.total_accepted],
                )?;
                processed += 1;
            }
        }
        Ok(processed)
    }

    pub fn get_tag_stats(&self) -> Result<Vec<TagStats>> {
        let conn = self.conn.lock().unwrap();

        // Check if submission_stats has data (any row with total_tries > 0)
        let has_stats: bool = conn
            .query_row(
                "SELECT COUNT(*) FROM submission_stats WHERE total_tries > 0",
                [],
                |row| row.get::<_, i64>(0),
            )
            .unwrap_or(0)
            > 0;

        if has_stats {
            // Use submission_stats for accuracy: sum of tries and accepts per tag
            let mut stmt = conn.prepare(
                "SELECT t.id, t.name,
                        COALESCE(SUM(ss.total_tries), 0) as total,
                        COALESCE(SUM(ss.total_accepted), 0) as solved,
                        COALESCE(SUM(ss.total_tries), 0) as total_tries
                 FROM tags t
                 JOIN problem_tags pt ON t.id = pt.tag_id
                 JOIN problems p ON pt.problem_id = p.id
                 LEFT JOIN submission_stats ss ON p.id = ss.problem_id
                 GROUP BY t.id, t.name
                 ORDER BY total_tries DESC"
            )?;
            let stats = stmt.query_map([], |row| {
                let total: i64 = row.get(2)?;
                let solved: i64 = row.get(3)?;
                Ok(TagStats {
                    tag_id: row.get(0)?,
                    tag_name: row.get(1)?,
                    total,
                    solved,
                    rate: if total > 0 { solved as f64 / total as f64 } else { 0.0 },
                })
            })?.filter_map(|r| r.ok()).collect();
            return Ok(stats);
        }

        // Fallback: use problem status
        let mut stmt = conn.prepare(
            "SELECT t.id, t.name,
                    COUNT(pt.problem_id) as total,
                    SUM(CASE WHEN p.status = 'solved' THEN 1 ELSE 0 END) as solved
             FROM tags t
             JOIN problem_tags pt ON t.id = pt.tag_id
             JOIN problems p ON pt.problem_id = p.id
             GROUP BY t.id, t.name
             ORDER BY total DESC"
        )?;
        let stats = stmt.query_map([], |row| {
            let total: i64 = row.get(2)?;
            let solved: i64 = row.get(3)?;
            Ok(TagStats {
                tag_id: row.get(0)?,
                tag_name: row.get(1)?,
                total,
                solved,
                rate: if total > 0 { solved as f64 / total as f64 } else { 0.0 },
            })
        })?.filter_map(|r| r.ok()).collect();
        Ok(stats)
    }

    pub fn get_code_snippets(&self, problem_id: i64) -> Result<Vec<CodeSnippet>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT id, problem_id, language, code, version, created_at
             FROM code_snippets WHERE problem_id = ?1
             ORDER BY version DESC"
        )?;
        let snippets = stmt.query_map(params![problem_id], |row| {
            Ok(CodeSnippet {
                id: row.get(0)?,
                problem_id: row.get(1)?,
                language: row.get(2)?,
                code: row.get(3)?,
                version: row.get(4)?,
                created_at: row.get(5)?,
            })
        })?.filter_map(|r| r.ok()).collect();
        Ok(snippets)
    }

    pub fn save_code_snippet(&self, data: &SaveCodeSnippetDTO) -> Result<CodeSnippet> {
        let conn = self.conn.lock().unwrap();
        let existing: Option<(i64, i64)> = conn.query_row(
            "SELECT id, version FROM code_snippets
             WHERE problem_id = ?1 AND language = ?2
             ORDER BY version DESC LIMIT 1",
            params![data.problem_id, data.language],
            |row| Ok((row.get(0)?, row.get(1)?)),
        ).ok();

        if let Some((snippet_id, version)) = existing {
            conn.execute(
                "UPDATE code_snippets SET code = ?1, version = ?2 WHERE id = ?3",
                params![data.code, version + 1, snippet_id],
            )?;
            let mut stmt = conn.prepare(
                "SELECT id, problem_id, language, code, version, created_at
                 FROM code_snippets WHERE id = ?1"
            )?;
            stmt.query_row(params![snippet_id], |row| {
                Ok(CodeSnippet {
                    id: row.get(0)?,
                    problem_id: row.get(1)?,
                    language: row.get(2)?,
                    code: row.get(3)?,
                    version: row.get(4)?,
                    created_at: row.get(5)?,
                })
            })
        } else {
            conn.execute(
                "INSERT INTO code_snippets (problem_id, language, code) VALUES (?1, ?2, ?3)",
                params![data.problem_id, data.language, data.code],
            )?;
            let snippet_id = conn.last_insert_rowid();
            let mut stmt = conn.prepare(
                "SELECT id, problem_id, language, code, version, created_at
                 FROM code_snippets WHERE id = ?1"
            )?;
            stmt.query_row(params![snippet_id], |row| {
                Ok(CodeSnippet {
                    id: row.get(0)?,
                    problem_id: row.get(1)?,
                    language: row.get(2)?,
                    code: row.get(3)?,
                    version: row.get(4)?,
                    created_at: row.get(5)?,
                })
            })
        }
    }

    pub fn get_all_problem_slugs(&self) -> Result<Vec<(i64, String)>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare("SELECT id, leetcode_url FROM problems WHERE leetcode_url IS NOT NULL")?;
        let rows = stmt.query_map([], |row| {
            let id: i64 = row.get(0)?;
            let url: String = row.get(1)?;
            let slug = url
                .trim_end_matches('/')
                .rsplit('/')
                .next()
                .unwrap_or("")
                .to_string();
            Ok((id, slug))
        })?;
        Ok(rows.filter_map(|r| r.ok()).collect())
    }

    pub fn delete_code_snippet(&self, id: i64) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute("DELETE FROM code_snippets WHERE id = ?1", params![id])?;
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn setup_db() -> Database {
        Database::new(":memory:").expect("failed to create in-memory db")
    }

    #[test]
    fn test_create_and_get_problem() {
        let db = setup_db();
        let tags = db.get_tags().unwrap();
        let tag_ids: Vec<i64> = tags.iter().take(2).map(|t| t.id).collect();

        let data = CreateProblemDTO {
            leetcode_id: Some(1),
            title: "Two Sum".into(),
            title_cn: Some("两数之和".into()),
            difficulty: "easy".into(),
            status: None,
            leetcode_url: Some("https://leetcode.cn/problems/two-sum/".into()),
            notes: Some("哈希表解法".into()),
            content: None,
            tag_ids: tag_ids.clone(),
        };

        let problem = db.create_problem(&data).unwrap();
        assert_eq!(problem.title, "Two Sum");
        assert_eq!(problem.title_cn.unwrap(), "两数之和");
        assert_eq!(problem.difficulty, "easy");
        assert_eq!(problem.leetcode_id.unwrap(), 1);
        assert_eq!(problem.tags.len(), 2);
        assert_eq!(problem.tags[0].name, "数组");

        let fetched = db.get_problem(problem.id).unwrap();
        assert_eq!(fetched.title, problem.title);
        assert_eq!(fetched.tags.len(), 2);
    }

    #[test]
    fn test_update_problem() {
        let db = setup_db();
        let data = CreateProblemDTO {
            leetcode_id: Some(2),
            title: "Add Two Numbers".into(),
            title_cn: None,
            difficulty: "medium".into(),
            status: None,
            leetcode_url: None,
            notes: None,
            content: None,
            tag_ids: vec![],
        };
        let problem = db.create_problem(&data).unwrap();

        let update = UpdateProblemDTO {
            leetcode_id: None,
            title: Some("Add Two Numbers (Updated)".into()),
            title_cn: Some("两数相加".into()),
            difficulty: Some("hard".into()),
            status: Some("solved".into()),
            leetcode_url: None,
            notes: Some("链表操作".into()),
            content: None,
            tag_ids: None,
        };
        let updated = db.update_problem(problem.id, &update).unwrap();
        assert_eq!(updated.title, "Add Two Numbers (Updated)");
        assert_eq!(updated.difficulty, "hard");
        assert_eq!(updated.status, "solved");
        assert_eq!(updated.notes.unwrap(), "链表操作");
    }

    #[test]
    fn test_delete_problem() {
        let db = setup_db();
        let data = CreateProblemDTO {
            leetcode_id: Some(3),
            title: "Test Delete".into(),
            title_cn: None,
            difficulty: "easy".into(),
            status: None,
            leetcode_url: None,
            notes: None,
            content: None,
            tag_ids: vec![],
        };
        let problem = db.create_problem(&data).unwrap();
        db.delete_problem(problem.id).unwrap();
        assert!(db.get_problem(problem.id).is_err());
    }

    #[test]
    fn test_get_stats() {
        let db = setup_db();

        let create = |id: i64, title: &str, difficulty: &str, status: &str| {
            db.create_problem(&CreateProblemDTO {
                leetcode_id: Some(id),
                title: title.into(),
                title_cn: None,
                difficulty: difficulty.into(),
                status: Some(status.into()),
                leetcode_url: None,
                notes: None,
                content: None,
                tag_ids: vec![],
            }).unwrap();
        };

        create(1, "A", "easy", "solved");
        create(2, "B", "easy", "solved");
        create(3, "C", "medium", "attempted");
        create(4, "D", "hard", "todo");
        create(5, "E", "hard", "revisit");

        let stats = db.get_stats().unwrap();
        assert_eq!(stats.total, 5);
        assert_eq!(stats.solved, 2);
        assert_eq!(stats.attempted, 1);
        assert_eq!(stats.todo, 1);
        assert_eq!(stats.revisit, 1);
        assert_eq!(stats.by_difficulty.easy, 2);
        assert_eq!(stats.by_difficulty.medium, 1);
        assert_eq!(stats.by_difficulty.hard, 2);
    }

    #[test]
    fn test_filter_problems() {
        let db = setup_db();

        db.create_problem(&CreateProblemDTO {
            leetcode_id: Some(1),
            title: "Two Sum".into(),
            title_cn: None,
            difficulty: "easy".into(),
            status: Some("solved".into()),
            leetcode_url: None,
            notes: None,
            content: None,
            tag_ids: vec![],
        }).unwrap();

        db.create_problem(&CreateProblemDTO {
            leetcode_id: Some(15),
            title: "Three Sum".into(),
            title_cn: None,
            difficulty: "medium".into(),
            status: Some("attempted".into()),
            leetcode_url: None,
            notes: None,
            content: None,
            tag_ids: vec![],
        }).unwrap();

        let filters = ProblemFilters {
            search: Some("Two".into()),
            difficulty: None,
            status: None,
            tag_id: None,
            sort_by: None,
            sort_order: None,
            page: None,
            page_size: None,
        };
        let problems = db.get_problems(&filters).unwrap();
        assert_eq!(problems.len(), 1);
        assert_eq!(problems[0].title, "Two Sum");

        let filters = ProblemFilters {
            search: None,
            difficulty: Some("medium".into()),
            status: None,
            tag_id: None,
            sort_by: None,
            sort_order: None,
            page: None,
            page_size: None,
        };
        let problems = db.get_problems(&filters).unwrap();
        assert_eq!(problems.len(), 1);
        assert_eq!(problems[0].difficulty, "medium");
    }
}
