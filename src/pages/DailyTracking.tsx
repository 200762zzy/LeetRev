import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { invoke } from '@tauri-apps/api/core'
import { Plus, Trash2, Calendar, ChevronRight } from 'lucide-react'
import type { DailyTracker } from '../types'

export function DailyTracking() {
  const navigate = useNavigate()
  const [trackers, setTrackers] = useState<DailyTracker[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [name, setName] = useState('')
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0])

  const load = async () => {
    setLoading(true)
    const data = await invoke<DailyTracker[]>('get_daily_trackers')
    setTrackers(data)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const handleCreate = async () => {
    await invoke('create_daily_tracker', { name: name || '默认追踪', startDate })
    setShowCreate(false)
    setName('')
    load()
  }

  const handleDelete = async (id: number) => {
    await invoke('delete_daily_tracker', { id })
    load()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-zinc-900">每日追踪</h1>
        <button
          onClick={() => setShowCreate(true)}
          className="btn-primary flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          新建追踪
        </button>
      </div>

      {showCreate && (
        <div className="card space-y-4">
          <h3 className="font-semibold text-zinc-800">创建每日追踪</h3>
          <div>
            <label className="block text-sm font-medium text-zinc-600 mb-1">名称</label>
            <input
              className="input-field"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="默认追踪"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-600 mb-1">起始日期</label>
            <input
              type="date"
              className="input-field"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <button onClick={handleCreate} className="btn-primary">创建</button>
            <button onClick={() => setShowCreate(false)} className="btn-ghost">取消</button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-zinc-500">加载中...</div>
      ) : trackers.length === 0 ? (
        <div className="card py-12 text-center text-zinc-400">
          <Calendar className="mx-auto mb-3 h-12 w-12" />
          <p>暂无追踪器，点击上方按钮创建一个</p>
          <p className="mt-1 text-sm">创建后每次启动应用会自动检测 LeetCode 的新提交</p>
        </div>
      ) : (
        <div className="space-y-3">
          {trackers.map(t => (
            <div
              key={t.id}
              className="card flex items-center justify-between cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => navigate(`/daily-tracking/${t.id}`)}
            >
              <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-100 text-primary-600">
                  <Calendar className="h-5 w-5" />
                </div>
                <div>
                  <div className="font-medium text-zinc-800">{t.name}</div>
                  <div className="text-sm text-zinc-500">
                    起始于 {t.start_date}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={e => { e.stopPropagation(); handleDelete(t.id) }}
                  className="rounded-lg p-2 text-zinc-400 hover:bg-red-50 hover:text-red-500"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
                <ChevronRight className="h-4 w-4 text-zinc-300" />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
