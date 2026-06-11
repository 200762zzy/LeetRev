import { useState, useEffect } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'
import { Loader2, RefreshCw, CheckCircle, AlertCircle, ExternalLink, Save, XCircle } from 'lucide-react'
import type { SyncResult, SyncProgressEvent } from '../types'

export function Settings() {
  const [cookie, setCookie] = useState('')
  const [syncing, setSyncing] = useState(false)
  const [result, setResult] = useState<SyncResult | null>(null)
  const [progress, setProgress] = useState<SyncProgressEvent | null>(null)
  const [saved, setSaved] = useState(false)
  const [showFailed, setShowFailed] = useState(false)

  useEffect(() => {
    invoke<string | null>('get_setting', { key: 'leetcode_session' }).then((v) => {
      if (v) setCookie(v)
    })
  }, [])

  const handleLogin = async () => {
    try {
      await invoke('open_leetcode_login')
    } catch (e) {
      alert('打开浏览器失败：' + String(e))
    }
  }

  const handleSync = async () => {
    setSyncing(true)
    setResult(null)
    setProgress(null)
    setShowFailed(false)

    const unlisten = await listen<SyncProgressEvent>('sync-progress', (event) => {
      setProgress(event.payload)
    })

    try {
      const res = await invoke<SyncResult>('sync_leetcode_progress', { cookie: cookie || null })
      setResult(res)
      if (cookie) {
        await invoke('set_setting', { key: 'leetcode_session', value: cookie })
        setSaved(true)
      }
    } catch (e) {
      alert('同步失败：' + String(e))
    }
    unlisten()
    setSyncing(false)
    setProgress(null)
  }

  const progressPercent = progress && progress.total > 0
    ? Math.round((progress.current / progress.total) * 100)
    : 0

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">设置</h1>
        <p className="mt-1 text-sm text-zinc-500">同步力扣数据到本地题库</p>
      </div>

      <div className="card space-y-4">
        <div>
          <h2 className="text-sm font-semibold text-zinc-900">从力扣同步</h2>
          <p className="mt-1 text-xs text-zinc-500">
            拉取你在 leetcode.cn 上已通过和尝试过的题目，自动创建到本地题库。
          </p>
        </div>

        <button className="btn-secondary" onClick={handleLogin}>
          <ExternalLink className="h-4 w-4" />
          在浏览器打开登录页
        </button>

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-zinc-700">LEETCODE_SESSION</label>
          <input
            className="input-field font-mono text-xs"
            placeholder="粘贴 LEETCODE_SESSION=xxx（或完整的 Cookie 字符串）"
            value={cookie}
            onChange={(e) => setCookie(e.target.value)}
          />
          <p className="text-xs text-zinc-400">
            点击上方按钮在默认浏览器打开 leetcode.cn 登录页，登录后打开开发者工具（F12），
            转到 Application → Cookies → leetcode.cn → 找到 <code>LEETCODE_SESSION</code>，复制整行（<code>LEETCODE_SESSION=xxx</code>）粘贴到此处。
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button className="btn-primary" onClick={handleSync} disabled={syncing}>
            {syncing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            {syncing ? '同步中...' : '从力扣同步'}
          </button>
          {saved && (
            <span className="flex items-center gap-1 text-xs text-emerald-600">
              <Save className="h-3 w-3" />
              Cookie 已保存
            </span>
          )}
        </div>

        {syncing && progress && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-zinc-500">
              <span>
                {progress.status === 'syncing' && `正在处理 ${progress.leetcode_id}. ${progress.title}`}
                {progress.status === 'fetching-detail' && `正在抓取详情 (${progress.current}/${progress.total})`}
                {progress.status === 'done' && '同步完成'}
              </span>
              <span>{progressPercent}%</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-200">
              <div
                className="h-full rounded-full bg-primary-500 transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        )}

        {result && (
          <div className={`rounded-lg border p-4 text-sm ${
            result.failed > 0 ? 'border-amber-200 bg-amber-50' : 'border-emerald-200 bg-emerald-50'
          }`}>
            <div className="flex items-center gap-2 font-medium">
              {result.failed > 0 ? (
                <AlertCircle className="h-4 w-4 text-amber-500" />
              ) : (
                <CheckCircle className="h-4 w-4 text-emerald-500" />
              )}
              同步完成
            </div>
            <ul className="mt-2 space-y-1 text-zinc-600">
              <li>共发现 <strong>{result.total}</strong> 道题</li>
              <li>新增导入 <strong>{result.imported}</strong> 道</li>
              <li>更新状态 <strong>{result.updated}</strong> 道</li>
              {result.total === 0 && (
                <li className="text-amber-600">未获取到数据，请检查 cookie 是否正确</li>
              )}
              {result.failed > 0 && (
                <>
                  <li className="text-amber-600">失败 <strong>{result.failed}</strong> 道</li>
                  <li>
                    <button
                      className="mt-1 flex items-center gap-1 text-xs text-amber-600 underline hover:text-amber-800"
                      onClick={() => setShowFailed(!showFailed)}
                    >
                      <XCircle className="h-3 w-3" />
                      {showFailed ? '收起详情' : '查看失败详情'}
                    </button>
                  </li>
                </>
              )}
            </ul>
            {showFailed && result.failed_items.length > 0 && (
              <div className="mt-3 max-h-48 space-y-1 overflow-y-auto rounded border border-amber-200 bg-white p-2">
                {result.failed_items.map((item) => (
                  <div key={item.leetcode_id} className="flex items-start gap-2 text-xs">
                    <span className="shrink-0 font-mono text-zinc-400">#{item.leetcode_id}</span>
                    <span className="text-zinc-600">{item.title || `题号 #${item.leetcode_id}`}</span>
                    <span className="ml-auto shrink-0 text-amber-500">{item.reason}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
