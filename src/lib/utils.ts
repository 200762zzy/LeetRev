import { type Difficulty, type ProblemStatus } from '../types'

export function cn(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ')
}

export function difficultyColor(d: Difficulty): string {
  switch (d) {
    case 'easy':
      return 'text-emerald-600 bg-emerald-50 border-emerald-200'
    case 'medium':
      return 'text-amber-600 bg-amber-50 border-amber-200'
    case 'hard':
      return 'text-red-600 bg-red-50 border-red-200'
  }
}

export function statusLabel(s: ProblemStatus): string {
  switch (s) {
    case 'todo':
      return '待做'
    case 'attempted':
      return '尝试过'
    case 'solved':
      return '已解决'
    case 'revisit':
      return '需复习'
  }
}

export function statusColor(s: ProblemStatus): string {
  switch (s) {
    case 'todo':
      return 'bg-zinc-100 text-zinc-600 border-zinc-200'
    case 'attempted':
      return 'bg-orange-50 text-orange-600 border-orange-200'
    case 'solved':
      return 'bg-emerald-50 text-emerald-600 border-emerald-200'
    case 'revisit':
      return 'bg-purple-50 text-purple-600 border-purple-200'
  }
}

export const DIFFICULTIES = [
  { value: 'easy', label: 'Easy' },
  { value: 'medium', label: 'Medium' },
  { value: 'hard', label: 'Hard' },
] as const

export const STATUSES = [
  { value: 'todo', label: '待做' },
  { value: 'attempted', label: '尝试过' },
  { value: 'solved', label: '已解决' },
  { value: 'revisit', label: '需复习' },
] as const

export const DEFAULT_TAGS = [
  '数组', '字符串', '哈希表', '链表', '数学',
  '双指针', '滑动窗口', '栈', '队列',
  '树', '二叉树', '堆', '贪心',
  '动态规划', '回溯', 'DFS', 'BFS', '图',
  '二分查找', '排序', '位运算', '递归',
  '分治', '设计', '数据库',
]

export interface ParsedBetterSolution {
  code: string
  explanation: string
  title: string
  time_complexity: string
  space_complexity: string
}

export function parseBetterCode(raw: string | null): ParsedBetterSolution | null {
  if (!raw) return null
  try {
    const obj = JSON.parse(raw)
    if (!obj.code) return null
    return {
      code: obj.code ?? '',
      explanation: obj.explanation ?? '',
      title: obj.title ?? '',
      time_complexity: obj.time_complexity ?? '',
      space_complexity: obj.space_complexity ?? '',
    }
  } catch {
    return null
  }
}
