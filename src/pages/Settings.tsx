import { useState, useEffect } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'
import { Loader2, RefreshCw, CheckCircle, AlertCircle, ExternalLink, Save, XCircle, BarChart3, Code2, Brain } from 'lucide-react'
import type { SyncResult, SyncProgressEvent, SyncAcCodesResult, LlmProvider } from '../types'

export function Settings() {
  const [cookie, setCookie] = useState('')
  const [username, setUsername] = useState('')
  const [syncing, setSyncing] = useState(false)
  const [result, setResult] = useState<SyncResult | null>(null)
  const [progress, setProgress] = useState<SyncProgressEvent | null>(null)
  const [saved, setSaved] = useState(false)
  const [showFailed, setShowFailed] = useState(false)
  const [refreshingStats, setRefreshingStats] = useState(false)
  const [statsResult, setStatsResult] = useState<string | null>(null)
  const [syncingCodes, setSyncingCodes] = useState(false)
  const [codesResult, setCodesResult] = useState<SyncAcCodesResult | null>(null)
  const [codesProgress, setCodesProgress] = useState<{ current: number; total: number } | null>(null)

  useEffect(() => {
    invoke<string | null>('get_setting', { key: 'leetcode_session' }).then((v) => {
      if (v) setCookie(v)
    })
    invoke<string | null>('get_setting', { key: 'leetcode_username' }).then((v) => {
      if (v) setUsername(v)
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
      if (username) {
        await invoke('set_setting', { key: 'leetcode_username', value: username })
      }
    } catch (e) {
      alert('同步失败：' + String(e))
    }
    unlisten()
    setSyncing(false)
    setProgress(null)
  }

  const handleSyncCodes = async () => {
    setSyncingCodes(true)
    setCodesResult(null)
    setCodesProgress(null)

    const unlisten = await listen<{ current: number; total: number }>('sync-ac-codes-progress', (event) => {
      setCodesProgress(event.payload)
    })

    try {
      const res = await invoke<SyncAcCodesResult>('sync_ac_codes', { cookie: cookie || null })
      setCodesResult(res)
    } catch (e) {
      alert('同步代码失败：' + String(e))
    }
    unlisten()
    setSyncingCodes(false)
    setCodesProgress(null)
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

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-zinc-700">LeetCode 用户名（可选）</label>
          <input
            className="input-field"
            placeholder="你的 leetcode.cn 用户名"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
          <p className="text-xs text-zinc-400">
            配置后每日追踪可直接获取最近提交，无需 CSRF token。可在力扣个人主页地址栏找到。
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

          <div className="flex items-center gap-3 border-t border-zinc-100 pt-4">
            <button
              className="btn-secondary"
              onClick={async () => {
                setRefreshingStats(true)
                setStatsResult(null)
                try {
                  const res = await invoke<{ processed: number }>('refresh_submission_stats')
                  setStatsResult(`已处理 ${res.processed} 道题目的提交统计`)
                } catch (e) {
                  setStatsResult('失败：' + String(e))
                }
                setRefreshingStats(false)
              }}
              disabled={refreshingStats}
            >
              {refreshingStats ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <BarChart3 className="h-4 w-4" />
              )}
              {refreshingStats ? '聚合中...' : '刷新提交统计'}
            </button>
            {statsResult && (
              <span className={`text-xs ${statsResult.startsWith('失败') ? 'text-red-500' : 'text-emerald-600'}`}>
                {statsResult}
              </span>
            )}
          </div>

          <div className="flex items-center gap-3 border-t border-zinc-100 pt-4">
            <button
              className="btn-secondary"
              onClick={handleSyncCodes}
              disabled={syncingCodes}
            >
              {syncingCodes ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Code2 className="h-4 w-4" />
              )}
              {syncingCodes ? '同步中...' : '同步历史 AC 代码'}
            </button>
            {syncingCodes && codesProgress && (
              <span className="text-xs text-zinc-500">
                {codesProgress.current}/{codesProgress.total}
              </span>
            )}
            {codesResult && (
              <span className="text-xs text-emerald-600">
                找到 {codesResult.total_found} 条，已保存 {codesResult.saved} 条
                {codesResult.skipped > 0 && `，跳过 ${codesResult.skipped} 条（未匹配本地题目）`}
              </span>
            )}
          </div>

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

      <div className="card space-y-4">
        <div>
          <h2 className="text-sm font-semibold text-zinc-900">代码分析（LLM）</h2>
          <p className="mt-1 text-xs text-zinc-500">
            使用大语言模型自动分析提交的代码，生成复杂度、评分和改进建议。支持 OpenAI 兼容接口和本地 Ollama。
          </p>
        </div>

        <LlmConfig />
      </div>
    </div>
  )
}

function LlmConfig() {
  const [provider, setProvider] = useState<LlmProvider>('ollama')
  const [ollamaUrl, setOllamaUrl] = useState('http://localhost:11434')
  const [ollamaModel, setOllamaModel] = useState('qwen2.5-coder:7b')
  const [openaiKey, setOpenaiKey] = useState('')
  const [openaiBaseUrl, setOpenaiBaseUrl] = useState('')
  const [openaiModel, setOpenaiModel] = useState('gpt-4o-mini')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    (async () => {
      const p = await invoke<string | null>('get_setting', { key: 'llm_provider' })
      if (p === 'ollama' || p === 'openai') setProvider(p)
      const ou = await invoke<string | null>('get_setting', { key: 'llm_ollama_url' })
      if (ou) setOllamaUrl(ou)
      const om = await invoke<string | null>('get_setting', { key: 'llm_ollama_model' })
      if (om) setOllamaModel(om)
      const ok = await invoke<string | null>('get_setting', { key: 'llm_openai_key' })
      if (ok) setOpenaiKey(ok)
      const ob = await invoke<string | null>('get_setting', { key: 'llm_openai_base_url' })
      if (ob) setOpenaiBaseUrl(ob)
      const omm = await invoke<string | null>('get_setting', { key: 'llm_openai_model' })
      if (omm) setOpenaiModel(omm)
    })()
  }, [])

  const handleSave = async () => {
    setSaving(true)
    try {
      await invoke('set_setting', { key: 'llm_provider', value: provider })
      await invoke('set_setting', { key: 'llm_ollama_url', value: ollamaUrl })
      await invoke('set_setting', { key: 'llm_ollama_model', value: ollamaModel })
      await invoke('set_setting', { key: 'llm_openai_key', value: openaiKey })
      await invoke('set_setting', { key: 'llm_openai_base_url', value: openaiBaseUrl })
      await invoke('set_setting', { key: 'llm_openai_model', value: openaiModel })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (e) {
      alert('保存失败：' + String(e))
    }
    setSaving(false)
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-4">
        <label className="flex items-center gap-2">
          <input
            type="radio"
            name="llm-provider"
            value="ollama"
            checked={provider === 'ollama'}
            onChange={() => setProvider('ollama')}
            className="h-4 w-4 text-primary-600"
          />
          <span className="text-sm">Ollama（本地）</span>
        </label>
        <label className="flex items-center gap-2">
          <input
            type="radio"
            name="llm-provider"
            value="openai"
            checked={provider === 'openai'}
            onChange={() => setProvider('openai')}
            className="h-4 w-4 text-primary-600"
          />
          <span className="text-sm">OpenAI 兼容</span>
        </label>
      </div>

      {provider === 'ollama' && (
        <div className="space-y-2 pl-2">
          <div>
            <label className="text-xs font-medium text-zinc-600">Ollama URL</label>
            <input className="input-field mt-0.5" value={ollamaUrl} onChange={(e) => setOllamaUrl(e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-medium text-zinc-600">模型名称</label>
            <input className="input-field mt-0.5" value={ollamaModel} onChange={(e) => setOllamaModel(e.target.value)} />
          </div>
        </div>
      )}

      {provider === 'openai' && (
        <div className="space-y-2 pl-2">
          <div>
            <label className="text-xs font-medium text-zinc-600">API Key</label>
            <input className="input-field mt-0.5" type="password" value={openaiKey} onChange={(e) => setOpenaiKey(e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-medium text-zinc-600">Base URL</label>
            <input className="input-field mt-0.5" value={openaiBaseUrl} onChange={(e) => setOpenaiBaseUrl(e.target.value)} placeholder="https://api.openai.com/v1" />
          </div>
          <div>
            <label className="text-xs font-medium text-zinc-600">模型名称</label>
            <input className="input-field mt-0.5" value={openaiModel} onChange={(e) => setOpenaiModel(e.target.value)} />
          </div>
        </div>
      )}

      <button className="btn-primary" onClick={handleSave} disabled={saving}>
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Brain className="h-4 w-4" />}
        保存 LLM 配置
      </button>
      {saved && <span className="text-xs text-emerald-600">已保存</span>}
    </div>
  )
}
