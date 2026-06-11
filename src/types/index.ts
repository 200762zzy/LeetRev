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
  tag_ids: number[]
}

export interface UpdateProblemDTO extends Partial<CreateProblemDTO> {}

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

export interface FetchedProblemInfo {
  leetcode_id: number
  title: string
  title_cn: string
  difficulty: Difficulty
  tags: string[]
  content: string
  url: string
}

export interface ProblemFilters {
  search?: string
  difficulty?: Difficulty | ''
  status?: ProblemStatus | ''
  tag_id?: number | ''
  sort_by?: 'leetcode_id' | 'title' | 'difficulty' | 'created_at'
  sort_order?: 'asc' | 'desc'
  page?: number
  page_size?: number
}
