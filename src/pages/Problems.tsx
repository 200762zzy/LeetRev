import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { invoke } from '@tauri-apps/api/core'
import { Plus, Search, ArrowUpDown, Trash2, Edit3, ChevronLeft, ChevronRight } from 'lucide-react'
import type { Problem, ProblemFilters, Tag } from '../types'
import { difficultyColor, statusColor, statusLabel } from '../lib/utils'

export function Problems() {
  const navigate = useNavigate()
  const [problems, setProblems] = useState<Problem[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [allTags, setAllTags] = useState<Tag[]>([])
  const [filters, setFilters] = useState<ProblemFilters>({
    search: '',
    difficulty: '',
    status: '',
    tag_id: null,
    sort_by: 'leetcode_id',
    sort_order: 'desc',
    page: 1,
    page_size: 20,
  })

  useEffect(() => {
    invoke<Tag[]>('get_tags').then(setAllTags).catch(console.error)
  }, [])

  const loadProblems = useCallback(async () => {
    setLoading(true)
    try {
      const [data, total] = await Promise.all([
        invoke<Problem[]>('get_problems', { filters }),
        invoke<number>('get_problems_count', { filters }),
      ])
      setProblems(data)
      setTotalCount(total)
    } catch (e) {
      console.error(e)
    }
    setLoading(false)
  }, [filters])

  useEffect(() => {
    loadProblems()
  }, [loadProblems])

  const totalPages = Math.max(1, Math.ceil(totalCount / (filters.page_size ?? 20)))

  const goToPage = (page: number) => {
    setFilters((f) => ({ ...f, page: Math.max(1, Math.min(page, totalPages)) }))
  }

  const handleDelete = async (id: number) => {
    if (!confirm('确定删除这道题吗？')) return
    try {
      await invoke('delete_problem', { id })
      loadProblems()
    } catch (e) {
      console.error(e)
    }
  }

  const toggleSort = (field: string) => {
    setFilters((f) => ({
      ...f,
      sort_by: field as ProblemFilters['sort_by'],
      sort_order: f.sort_by === field && f.sort_order === 'asc' ? 'desc' : 'asc',
      page: 1,
    }))
  }

  const SortIcon = ({ field }: { field: string }) => {
    if (filters.sort_by !== field) return <ArrowUpDown className="h-3 w-3 text-zinc-400" />
    return (
      <ArrowUpDown
        className={`h-3 w-3 ${filters.sort_order === 'asc' ? 'text-primary-600 rotate-180' : 'text-primary-600'}`}
      />
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">题目列表</h1>
          <p className="mt-1 text-sm text-zinc-500">共 {totalCount} 道题目</p>
        </div>
        <button
          onClick={() => navigate('/problems/new')}
          className="btn-primary"
        >
          <Plus className="h-4 w-4" />
          新增题目
        </button>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <input
            className="input-field pl-10"
            placeholder="搜索标题或题号..."
            value={filters.search}
            onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value, page: 1 }))}
          />
        </div>
        <select
          className="input-field w-32"
          value={filters.difficulty}
          onChange={(e) => setFilters((f) => ({ ...f, difficulty: e.target.value as any, page: 1 }))}
        >
          <option value="">全部难度</option>
          <option value="easy">Easy</option>
          <option value="medium">Medium</option>
          <option value="hard">Hard</option>
        </select>
        <select
          className="input-field w-32"
          value={filters.status}
          onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value as any, page: 1 }))}
        >
          <option value="">全部状态</option>
          <option value="todo">待做</option>
          <option value="attempted">尝试过</option>
          <option value="solved">已解决</option>
          <option value="revisit">需复习</option>
        </select>
        <select
          className="input-field w-36"
          value={filters.tag_id ?? ''}
          onChange={(e) => setFilters((f) => ({ ...f, tag_id: e.target.value ? Number(e.target.value) : null, page: 1 }))}
        >
          <option value="">全部标签</option>
          {allTags.map((t) => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>
      </div>

      <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
        <table className="w-full">
          <thead>
            <tr className="border-b border-zinc-100 bg-zinc-50/50">
              <th
                className="cursor-pointer px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500"
                onClick={() => toggleSort('leetcode_id')}
              >
                <div className="flex items-center gap-1">
                  # <SortIcon field="leetcode_id" />
                </div>
              </th>
              <th
                className="cursor-pointer px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500"
                onClick={() => toggleSort('title')}
              >
                <div className="flex items-center gap-1">
                  标题 <SortIcon field="title" />
                </div>
              </th>
              <th
                className="cursor-pointer px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500"
                onClick={() => toggleSort('difficulty')}
              >
                <div className="flex items-center gap-1">
                  难度 <SortIcon field="difficulty" />
                </div>
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500">
                标签
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500">
                状态
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-zinc-500">
                操作
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {loading ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-sm text-zinc-400">
                  加载中...
                </td>
              </tr>
            ) : problems.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-sm text-zinc-400">
                  还没有题目，点击右上角新增
                </td>
              </tr>
            ) : (
              problems.map((p) => (
                <tr
                  key={p.id}
                  className="cursor-pointer transition-colors hover:bg-zinc-50/50"
                  onClick={() => navigate(`/problems/${p.id}`)}
                >
                  <td className="px-4 py-3 text-sm font-mono text-zinc-500">
                    {p.leetcode_id ?? '-'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-zinc-900">{p.title}</span>
                      {p.title_cn && (
                        <span className="text-sm text-zinc-400">/ {p.title_cn}</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${difficultyColor(p.difficulty)}`}
                    >
                      {p.difficulty}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {p.tags.map((t) => (
                        <span
                          key={t.id}
                          className="inline-flex items-center rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600"
                        >
                          {t.name}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${statusColor(p.status)}`}
                    >
                      {statusLabel(p.status)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        className="btn-ghost p-1.5"
                        onClick={(e) => { e.stopPropagation(); navigate(`/problems/${p.id}/edit`) }}
                        title="编辑"
                      >
                        <Edit3 className="h-4 w-4" />
                      </button>
                      <button
                        className="btn-ghost p-1.5 text-red-500 hover:bg-red-50 hover:text-red-600"
                        onClick={(e) => { e.stopPropagation(); handleDelete(p.id) }}
                        title="删除"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            className="btn-ghost p-2 disabled:opacity-30"
            disabled={filters.page === 1}
            onClick={() => goToPage((filters.page ?? 1) - 1)}
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          {Array.from({ length: totalPages }, (_, i) => i + 1)
            .filter((p) => p === 1 || p === totalPages || Math.abs(p - (filters.page ?? 1)) <= 2)
            .map((p, idx, arr) => (
              <span key={p} className="flex items-center gap-1">
                {idx > 0 && arr[idx - 1] !== p - 1 && (
                  <span className="px-1 text-xs text-zinc-400">...</span>
                )}
                <button
                  className={`min-w-[2rem] rounded-lg px-2 py-1 text-sm font-medium transition-colors ${
                    p === (filters.page ?? 1)
                      ? 'bg-primary-100 text-primary-700'
                      : 'text-zinc-600 hover:bg-zinc-100'
                  }`}
                  onClick={() => goToPage(p)}
                >
                  {p}
                </button>
              </span>
            ))}
          <button
            className="btn-ghost p-2 disabled:opacity-30"
            disabled={(filters.page ?? 1) >= totalPages}
            onClick={() => goToPage((filters.page ?? 1) + 1)}
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  )
}
