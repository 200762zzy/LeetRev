import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { invoke } from '@tauri-apps/api/core'
import { ChevronLeft, RotateCcw, Sparkles, Repeat } from 'lucide-react'
import type { DailyTracker, DailyFetchLog } from '../types'

export function DailyTrackerDetail() {
  const { trackerId } = useParams<{ trackerId: string }>()
  const navigate = useNavigate()
  const [tracker, setTracker] = useState<DailyTracker | null>(null)
  const [logs, setLogs] = useState<DailyFetchLog[]>([])
  const [loading, setLoading] = useState(true)
  const [checking, setChecking] = useState(false)

  const load = async () => {
    if (!trackerId) return
    setLoading(true)
    const all = await invoke<DailyTracker[]>('get_daily_trackers')
    const t = all.find(x => x.id === Number(trackerId))
    setTracker(t || null)
    const l = await invoke<DailyFetchLog[]>('get_daily_fetch_logs', { trackerId: Number(trackerId) })
    setLogs(l)
    setLoading(false)
  }

  useEffect(() => { load() }, [trackerId])

  const handleCheckNow = async () => {
    if (!trackerId) return
    setChecking(true)
    try {
      await invoke('check_daily_changes', { trackerId: Number(trackerId) })
      await load()
    } catch (e) {
      alert(String(e))
    }
    setChecking(false)
  }

  if (loading) return <div className="text-zinc-500">加载中...</div>
  if (!tracker) return <div className="text-zinc-500">追踪器不存在</div>

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/daily-tracking')}
          className="rounded-lg p-2 text-zinc-500 hover:bg-zinc-100"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">{tracker.name}</h1>
          <p className="text-sm text-zinc-500">
            起始于 {tracker.start_date} · 共 {logs.length} 天记录
          </p>
        </div>
      </div>

      <button
        onClick={handleCheckNow}
        disabled={checking}
        className="btn-primary flex items-center gap-2"
      >
        <RotateCcw className={`h-4 w-4 ${checking ? 'animate-spin' : ''}`} />
        {checking ? '检测中...' : '立即检测'}
      </button>

      <div className="space-y-2">
        {logs.length === 0 ? (
          <div className="card py-12 text-center text-zinc-400">
            <p>暂无检测记录</p>
            <p className="mt-1 text-sm">每天首次启动或点击"立即检测"获取当天提交</p>
          </div>
        ) : (
          logs.map(log => (
            <div
              key={log.id}
              className="card flex items-center justify-between cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => navigate(`/daily-tracking/${trackerId}/${log.fetch_date}`)}
            >
              <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-100 font-mono text-sm font-bold text-zinc-600">
                  {new Date(log.fetch_date).getDate()}
                </div>
                <div>
                  <div className="font-medium text-zinc-800">{log.fetch_date}</div>
                  <div className="flex items-center gap-3 text-sm text-zinc-500">
                    <span className="flex items-center gap-1">
                      <Sparkles className="h-3 w-3 text-green-500" />
                      新题 {log.new_count}
                    </span>
                    <span className="flex items-center gap-1">
                      <Repeat className="h-3 w-3 text-amber-500" />
                      重做 {log.redo_count}
                    </span>
                  </div>
                </div>
              </div>
              <div className="text-sm text-zinc-400">
                共 {log.new_count + log.redo_count} 题
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
