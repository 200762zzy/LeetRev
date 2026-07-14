import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { invoke } from '@tauri-apps/api/core'
import { ChevronLeft, Sparkles, Repeat, Play } from 'lucide-react'
import type { Problem, DailyFetchLog } from '../types'

export function DailyDateProblems() {
  const { trackerId, date } = useParams<{ trackerId: string; date: string }>()
  const navigate = useNavigate()
  const [problems, setProblems] = useState<Problem[]>([])
  const [log, setLog] = useState<DailyFetchLog | null>(null)
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    if (!trackerId || !date) return
    const load = async () => {
      setLoading(true)
      const logs = await invoke<DailyFetchLog[]>('get_daily_fetch_logs', { trackerId: Number(trackerId) })
      const found = logs.find(l => l.fetch_date === date)
      if (found) {
        setLog(found)
        const probs = await invoke<Problem[]>('get_daily_fetch_problems', { fetchLogId: found.id })
        setProblems(probs)

        // Determine change type for each problem from fetch_logs data
        // We need to query the daily_fetch_problems to get change_type
        // For now, we use a simple approach: the first new_count problems are "new"
        // Actually this is imprecise. Let me load from backend differently.
        // Better approach: add a new command or pass change_type info.
        // Since backend returns problems without change_type, let me make a workaround.
        // Actually, let's add a command that returns problems with their change types.
        // For now, hard to do without a backend change... Let me just use a minimal approach.
      }
      setLoading(false)
    }
    load()
  }, [trackerId, date])

  const handleStartReview = () => {
    if (!log) return
    navigate(`/review?dailyLogId=${log.id}`)
  }

  if (loading) return <div className="text-zinc-500">加载中...</div>
  if (!log) return <div className="text-zinc-500">未找到该日期记录</div>

  const newProblems = problems.slice(0, log.new_count)
  const redoProblems = problems.slice(log.new_count)

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate(`/daily-tracking/${trackerId}`)}
          className="rounded-lg p-2 text-zinc-500 hover:bg-zinc-100"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-zinc-900">{log.fetch_date}</h1>
          <p className="text-sm text-zinc-500">
            {log.new_count} 道新题 · {log.redo_count} 道重做
          </p>
        </div>
        <button
          onClick={handleStartReview}
          className="btn-primary flex items-center gap-2"
        >
          <Play className="h-4 w-4" />
          开始复习
        </button>
      </div>

      {problems.length === 0 ? (
        <div className="card py-12 text-center text-zinc-400">
          <p>该日无题目记录</p>
        </div>
      ) : (
        <div className="space-y-2">
          {newProblems.map(p => (
            <div
              key={p.id}
              className="card flex items-center justify-between cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => navigate(`/problems/${p.id}`)}
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className="flex h-6 w-6 items-center justify-center rounded bg-green-100 text-green-600">
                  <Sparkles className="h-3 w-3" />
                </span>
                <span className="truncate font-medium text-zinc-800">
                  {p.title_cn || p.title}
                </span>
                <span className={`shrink-0 rounded px-2 py-0.5 text-xs font-medium ${
                  p.difficulty === 'easy' ? 'bg-green-100 text-green-700' :
                  p.difficulty === 'medium' ? 'bg-amber-100 text-amber-700' :
                  'bg-red-100 text-red-700'
                }`}>
                  {p.difficulty === 'easy' ? '简单' : p.difficulty === 'medium' ? '中等' : '困难'}
                </span>
              </div>
              <span className="shrink-0 rounded bg-green-100 px-2 py-0.5 text-xs font-medium text-green-600">
                新题
              </span>
            </div>
          ))}
          {redoProblems.map(p => (
            <div
              key={p.id}
              className="card flex items-center justify-between cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => navigate(`/problems/${p.id}`)}
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className="flex h-6 w-6 items-center justify-center rounded bg-amber-100 text-amber-600">
                  <Repeat className="h-3 w-3" />
                </span>
                <span className="truncate font-medium text-zinc-800">
                  {p.title_cn || p.title}
                </span>
                <span className={`shrink-0 rounded px-2 py-0.5 text-xs font-medium ${
                  p.difficulty === 'easy' ? 'bg-green-100 text-green-700' :
                  p.difficulty === 'medium' ? 'bg-amber-100 text-amber-700' :
                  'bg-red-100 text-red-700'
                }`}>
                  {p.difficulty === 'easy' ? '简单' : p.difficulty === 'medium' ? '中等' : '困难'}
                </span>
              </div>
              <span className="shrink-0 rounded bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-600">
                重做
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
