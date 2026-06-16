export type Difficulty = 'easy' | 'medium' | 'hard'
export type ProblemStatus = 'todo' | 'attempted' | 'solved' | 'revisit'

export interface Tag {
  id: number
  name: string
  color: string
}

export interface Problem {
  id: number
  leetcode_id: number | null
  title: string
  title_cn: string | null
  difficulty: Difficulty
  status: ProblemStatus
  leetcode_url: string | null
  notes: string | null
  content: string | null
  solution_code: string | null
  code_language: string | null
  created_at: string
  updated_at: string
  tags: Tag[]
}

export interface CreateProblemDTO {
  leetcode_id: number | null
  title: string
  title_cn: string | null
  difficulty: Difficulty
  status?: ProblemStatus
  leetcode_url: string | null
  notes: string | null
  content: string | null
  tag_ids: number[]
}

export interface UpdateProblemDTO extends Partial<CreateProblemDTO> {
  content?: string | null
}

export interface Stats {
  total: number
  solved: number
  attempted: number
  todo: number
  revisit: number
  by_difficulty: {
    easy: number
    medium: number
    hard: number
  }
}

export interface TagStats {
  tag_id: number
  tag_name: string
  total: number
  solved: number
  rate: number
}

export interface CodeSnippet {
  id: number
  problem_id: number
  language: string
  code: string
  version: number
  created_at: string
}

export interface SaveCodeSnippetDTO {
  problem_id: number
  language: string
  code: string
}

export const LANGUAGES = [
  'Python', 'Java', 'C++', 'Go', 'Rust',
  'JavaScript', 'TypeScript', 'C#', 'Swift', 'Kotlin',
  'Ruby', 'PHP', 'Scala', 'Dart',
] as const

export type CodeLanguage = typeof LANGUAGES[number]

export interface FetchedProblemInfo {
  leetcode_id: number
  title: string
  title_cn: string
  difficulty: Difficulty
  tags: string[]
  content: string
  url: string
}

export interface SyncResult {
  total: number
  imported: number
  updated: number
  failed: number
  failed_items: SyncFailedItem[]
}

export interface SyncFailedItem {
  leetcode_id: number
  title: string
  reason: string
}

export interface SyncProgressEvent {
  current: number
  total: number
  leetcode_id: number
  title: string
  status: 'syncing' | 'fetching-detail' | 'done'
}

export interface CodeTemplate {
  lang: string
  code: string
}

export interface ReviewStats {
  total_reviewed: number
  today_reviewed: number
  due_count: number
}

export interface ReviewRecord {
  id: number
  confidence: 'easy' | 'medium' | 'hard'
  reviewed_at: string
}

export interface SyncAcCodesResult {
  total_found: number
  saved: number
  skipped: number
}

export interface SubmissionResult {
  status: string
  passed: number
  total: number
  runtime: string
  memory: string
  compile_error: string
  runtime_error: string
  last_testcase: string
  expected_output: string
  code_output: string
}

export interface ProblemFilters {
  search?: string
  difficulty?: Difficulty | ''
  status?: ProblemStatus | ''
  tag_id?: number | '' | null
  sort_by?: 'leetcode_id' | 'title' | 'difficulty' | 'created_at'
  sort_order?: 'asc' | 'desc'
  page?: number
  page_size?: number
}

export type ApiLanguage = 'cpp' | 'java' | 'python'

export interface ApiExample {
  title?: string
  code: string
}

export interface ApiEntry {
  id: string
  language: ApiLanguage
  category: string
  name: string
  full_name?: string
  signature: string
  signatures?: string[]
  description: string
  example: string
  examples?: ApiExample[]
  returns?: string
  complexity?: string
  notes?: string
  leetcode_tips?: string
  see_also?: string[]
}

export interface CustomApiEntry {
  id: number
  container: string
  method_name: string
  language: ApiLanguage
  signatures: string
  description: string
  examples: string
  returns: string
  complexity: string
  notes: string
  leetcode_tips: string
  see_also: string
  problem_id: number | null
  created_at: string
  updated_at: string
}

export interface CreateCustomApiDTO {
  container: string
  method_name: string
  language: ApiLanguage
  signatures?: string
  description?: string
  examples?: string
  returns?: string
  complexity?: string
  notes?: string
  leetcode_tips?: string
  see_also?: string
  problem_id?: number | null
}

export interface UpdateCustomApiDTO {
  container?: string
  method_name?: string
  language?: ApiLanguage
  signatures?: string
  description?: string
  examples?: string
  returns?: string
  complexity?: string
  notes?: string
  leetcode_tips?: string
  see_also?: string
  problem_id?: number | null
}
