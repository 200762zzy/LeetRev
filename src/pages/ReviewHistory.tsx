import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { invoke } from '@tauri-apps/api/core'
import { History, Loader2, Search, ArrowUpDown, ExternalLink } from 'lucide-react'
import type { ReviewRecord } from '../types'

const confidenceLabel: Record<string, string> = { easy: '容易', medium: '中等', hard: '困难' }
const confidenceColor: Record<string, string> = {
  easy: 'text-emerald-600 bg-emerald-50 border-emerald-200',
  medium: 'text-amber-600 bg-amber-50 border-amber-200',
  hard: 'text-red-600 bg-red-50 border-red-200',
}

export function ReviewHistory() {
  const navigate = useNavigate()
  const [records, setRecords] = useState<ReviewRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [sortKey, setSortKey] = useState<'reviewed_at' | 'next_review' | 'interval_days' | 'ease_factor'>('reviewed_at')
  const [sortDesc, setSortDesc] = useState(true)

  const toggleSort = (key: typeof sortKey) => {
    if (sortKey === key) {
      setSortDesc(v => !v)
    } else {
      setSortKey(key)
      setSortDesc(true)
    }
  }

  useEffect(() => {
    invoke<ReviewRecord[]>('get_all_review_history')
      .then(setRecords)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const filtered = records.filter(r =>
    r.problem_title.toLowerCase().includes(search.toLowerCase())
  )

  const sorted = [...filtered].sort((a, b) => {
    let cmp: number
    switch (sortKey) {
      case 'reviewed_at': cmp = a.reviewed_at.localeCompare(b.reviewed_at); break
      case 'next_review': cmp = a.next_review.localeCompare(b.next_review); break
      case 'interval_days': cmp = a.interval_days - b.interval_days; break
      case 'ease_factor': cmp = a.ease_factor - b.ease_factor; break
    }
    return sortDesc ? -cmp : cmp
  })

  const stats = {
    total: records.length,
    avgEase: records.length ? (records.reduce((s, r) => s + r.ease_factor, 0) / records.length).toFixed(2) : '—',
    avgInterval: records.length ? Math.round(records.reduce((s, r) => s + r.interval_days, 0) / records.length) : 0,
    uniqueProblems: new Set(records.map(r => r.problem_id)).size,
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-primary-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <History className="h-6 w-6 text-primary-600" />
        <h1 className="text-2xl font-bold text-zinc-900">复习历史</h1>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-4 gap-4">
        <div className="card p-4 text-center">
          <div className="text-2xl font-bold text-zinc-900">{stats.total}</div>
          <div className="text-xs text-zinc-500">总复习次数</div>
        </div>
        <div className="card p-4 text-center">
          <div className="text-2xl font-bold text-zinc-900">{stats.uniqueProblems}</div>
          <div className="text-xs text-zinc-500">复习题目数</div>
        </div>
        <div className="card p-4 text-center">
          <div className="text-2xl font-bold text-zinc-900">{stats.avgEase}</div>
          <div className="text-xs text-zinc-500">平均 Ease Factor</div>
        </div>
        <div className="card p-4 text-center">
          <div className="text-2xl font-bold text-zinc-900">{stats.avgInterval}<span className="text-sm font-normal text-zinc-400">天</span></div>
          <div className="text-xs text-zinc-500">平均间隔</div>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
        <input
          className="input-field w-full pl-9"
          placeholder="搜索题目名称…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* Table */}
      {sorted.length === 0 ? (
        <div className="card py-12 text-center">
          <History className="mx-auto h-8 w-8 text-zinc-300" />
          <p className="mt-2 text-sm text-zinc-400">{search ? '未匹配到记录' : '暂无复习记录'}</p>
          <p className="mt-1 text-xs text-zinc-400">开始复习后记录将显示在这里</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-100 bg-zinc-50 text-left text-xs font-semibold text-zinc-500 uppercase">
                <th className="px-4 py-3">题目</th>
                <th className="px-4 py-3">回顾难度</th>
                <th className="px-4 py-3">
                  <button className="inline-flex items-center gap-1 hover:text-zinc-700" onClick={() => toggleSort('reviewed_at')}>
                    复习时间 <ArrowUpDown className="h-3 w-3" />
                  </button>
                </th>
                <th className="px-4 py-3">
                  <button className="inline-flex items-center gap-1 hover:text-zinc-700" onClick={() => toggleSort('ease_factor')}>
                    Ease Factor <ArrowUpDown className="h-3 w-3" />
                  </button>
                </th>
                <th className="px-4 py-3">
                  <button className="inline-flex items-center gap-1 hover:text-zinc-700" onClick={() => toggleSort('interval_days')}>
                    间隔 <ArrowUpDown className="h-3 w-3" />
                  </button>
                </th>
                <th className="px-4 py-3">复习次数</th>
                <th className="px-4 py-3">
                  <button className="inline-flex items-center gap-1 hover:text-zinc-700" onClick={() => toggleSort('next_review')}>
                    下次复习 <ArrowUpDown className="h-3 w-3" />
                  </button>
                </th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {sorted.map(r => {
                const daysUntilNext = Math.round((new Date(r.next_review + 'Z').getTime() - Date.now()) / 86400000)
                const daysSinceReview = Math.round((Date.now() - new Date(r.reviewed_at + 'Z').getTime()) / 86400000)
                return (
                  <tr key={r.id} className="border-b border-zinc-50 transition-colors hover:bg-zinc-50">
                    <td className="px-4 py-3 font-medium text-zinc-800">{r.problem_title}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${confidenceColor[r.confidence]}`}>
                        {confidenceLabel[r.confidence]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-zinc-500">
                      <div>{r.reviewed_at.slice(0, 16)}</div>
                      <div className="text-xs text-zinc-400">{daysSinceReview}天前</div>
                    </td>
                    <td className="px-4 py-3 font-mono text-sm text-zinc-700">{r.ease_factor.toFixed(2)}</td>
                    <td className="px-4 py-3 font-mono text-sm text-zinc-700">{r.interval_days}天</td>
                    <td className="px-4 py-3 text-zinc-700">第{r.repetitions}次</td>
                    <td className="px-4 py-3 text-zinc-500">
                      <div>{r.next_review.slice(0, 10)}</div>
                      <div className={`text-xs ${daysUntilNext <= 0 ? 'text-red-500 font-medium' : 'text-zinc-400'}`}>
                        {daysUntilNext <= 0 ? '已到期' : `${daysUntilNext}天后`}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        className="rounded p-1 text-zinc-400 hover:bg-zinc-100 hover:text-primary-600"
                        onClick={() => navigate(`/problems/${r.problem_id}`)}
                        title="查看题目"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}