import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { invoke } from '@tauri-apps/api/core'
import { ArrowLeft, Eye, Loader2, ThumbsUp, Meh, ThumbsDown, CheckCircle, BookOpen } from 'lucide-react'
import DOMPurify from 'dompurify'
import type { Problem, CodeLanguage, CodeSnippet, CodeTemplate } from '../types'
import { LANGUAGES } from '../types'
import { difficultyColor } from '../lib/utils'
import { CodeEditor } from '../components/CodeEditor'

type ReviewStage = 'recall' | 'reveal' | 'rated'

export function ReviewSession() {
  const navigate = useNavigate()
  const [queue, setQueue] = useState<Problem[]>([])
  const [index, setIndex] = useState(0)
  const [stage, setStage] = useState<ReviewStage>('recall')
  const [loading, setLoading] = useState(true)
  const [completed, setCompleted] = useState(false)
  const [saving, setSaving] = useState(false)
  const [snippets, setSnippets] = useState<CodeSnippet[]>([])
  const [snippetsLoading, setSnippetsLoading] = useState(false)
  const [language, setLanguage] = useState<CodeLanguage>('Python')
  const [userCode, setUserCode] = useState('')
  const [savingCode, setSavingCode] = useState(false)
  const [templates, setTemplates] = useState<CodeTemplate[]>([])
  const [editingStarted, setEditingStarted] = useState(false)

  const loadQueue = useCallback(async () => {
    setLoading(true)
    try {
      const data = await invoke<Problem[]>('get_review_queue')
      setQueue(data)
    } catch (e) {
      console.error(e)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    loadQueue()
  }, [loadQueue])

  const current = queue[index]

  useEffect(() => {
    if (!current?.id) return
    setSnippets([])
    setTemplates([])
    setUserCode('')
    setLanguage('Python')
    setEditingStarted(false)
    setSnippetsLoading(true)

    let snipsResult: CodeSnippet[] | null = null
    let tplsResult: CodeTemplate[] | null = current.leetcode_id ? null : []

    const checkDone = () => {
      if (snipsResult === null || tplsResult === null) return
      setSnippets(snipsResult)
      setTemplates(tplsResult)
      if (snipsResult.length > 0) {
        setUserCode(snipsResult[0].code)
        setLanguage(snipsResult[0].language as CodeLanguage)
      } else if (tplsResult.length > 0) {
        const tpl = tplsResult.find(t => t.lang === 'Python') ?? tplsResult[0]
        setUserCode(tpl.code)
        setLanguage(tpl.lang as CodeLanguage)
      }
      setSnippetsLoading(false)
    }

    invoke<CodeSnippet[]>('get_code_snippets', { problemId: current.id })
      .then((v) => { snipsResult = v; checkDone() })
      .catch(() => { snipsResult = []; checkDone() })

    if (current.leetcode_id) {
      invoke<CodeTemplate[]>('fetch_code_templates', { leetcodeId: current.leetcode_id })
        .then((v) => { tplsResult = v; checkDone() })
        .catch(() => { tplsResult = []; checkDone() })
    }
  }, [current?.id])

  const handleReveal = () => {
    setStage('reveal')
  }

  const handleRate = async (confidence: 'easy' | 'medium' | 'hard') => {
    setSaving(true)
    try {
      await invoke('record_review', { problemId: current.id, confidence })

      if (userCode.trim()) {
        setSavingCode(true)
        try {
          await invoke('save_code_snippet', {
            data: { problem_id: current.id, language, code: userCode },
          })
        } catch {}
        setSavingCode(false)
      }

      setStage('rated')
      setTimeout(() => {
        if (index + 1 < queue.length) {
          setIndex(index + 1)
          setStage('recall')
        } else {
          setCompleted(true)
        }
      }, 600)
    } catch (e) {
      console.error(e)
    }
    setSaving(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-primary-600" />
      </div>
    )
  }

  if (completed) {
    return (
      <div className="mx-auto max-w-lg space-y-6 py-20 text-center">
        <CheckCircle className="mx-auto h-16 w-16 text-emerald-500" />
        <h1 className="text-2xl font-bold text-zinc-900">复习完成！</h1>
        <p className="text-zinc-500">本次复习了 {queue.length} 道题目</p>
        <div className="flex items-center justify-center gap-3">
          <button className="btn-primary" onClick={loadQueue}>
            <BookOpen className="h-4 w-4" />
            继续复习
          </button>
          <button className="btn-secondary" onClick={() => navigate('/')}>
            回到首页
          </button>
        </div>
      </div>
    )
  }

  if (queue.length === 0) {
    return (
      <div className="mx-auto max-w-lg space-y-6 py-20 text-center">
        <CheckCircle className="mx-auto h-16 w-16 text-zinc-300" />
        <h1 className="text-2xl font-bold text-zinc-900">没有待复习的题目</h1>
        <p className="text-zinc-500">所有题目都已按计划复习过了，明天再来吧</p>
        <button className="btn-secondary" onClick={() => navigate('/')}>
          回到首页
        </button>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center gap-4">
        <button className="btn-ghost p-1.5" onClick={() => navigate('/')}>
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-zinc-900">复习模式</h1>
          <p className="text-sm text-zinc-500">第 {index + 1}/{queue.length} 题</p>
        </div>
        <div className="h-2 w-32 overflow-hidden rounded-full bg-zinc-200">
          <div
            className="h-full rounded-full bg-primary-500 transition-all duration-300"
            style={{ width: `${((index + 1) / queue.length) * 100}%` }}
          />
        </div>
      </div>

      <div className="card space-y-6">
        <div className="flex items-center gap-3">
          <span className="font-mono text-sm text-zinc-400">#{current.leetcode_id ?? '-'}</span>
          <h2 className="text-xl font-bold text-zinc-900">{current.title}</h2>
          {current.title_cn && (
            <span className="text-sm text-zinc-400">/ {current.title_cn}</span>
          )}
          <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${difficultyColor(current.difficulty)}`}>
            {current.difficulty}
          </span>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {current.tags.map((t) => (
            <span
              key={t.id}
              className="inline-flex items-center rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-medium text-zinc-600"
            >
              {t.name}
            </span>
          ))}
        </div>

        <div className="border-t border-zinc-100 pt-4">
          {stage === 'recall' && (
            <div className="space-y-4">
              {current.content && (
                <div
                  className="prose prose-sm max-w-none text-zinc-700 [&_pre]:rounded-lg [&_pre]:bg-zinc-100 [&_pre]:p-3 [&_code]:text-sm"
                  dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(current.content) }}
                />
              )}
              {!current.content && (
                <p className="text-sm text-zinc-400">该题目暂无描述，请先在详情页抓取</p>
              )}

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <select
                    className="input-field w-auto"
                    value={language}
                    onChange={(e) => {
                      const newLang = e.target.value as CodeLanguage
                      setLanguage(newLang)
                      if (!editingStarted) {
                        const tpl = templates.find(t => t.lang === newLang)
                        if (tpl) setUserCode(tpl.code)
                      }
                    }}
                  >
                    {LANGUAGES.map((l) => (
                      <option key={l} value={l}>{l}</option>
                    ))}
                  </select>
                  <span className="text-xs text-zinc-400">编写你的解答</span>
                </div>
                <CodeEditor
                  code={userCode}
                  language={language}
                  onChange={(v) => {
                    if (!editingStarted) setEditingStarted(true)
                    setUserCode(v ?? '')
                  }}
                  editable
                />
              </div>

              <button className="btn-primary w-full" onClick={handleReveal}>
                <Eye className="h-4 w-4" />
                查看对比
              </button>
            </div>
          )}

          {stage === 'reveal' && (
            <div className="space-y-4">
              {current.content && (
                <div
                  className="prose prose-sm max-w-none text-zinc-700 [&_pre]:rounded-lg [&_pre]:bg-zinc-100 [&_pre]:p-3 [&_code]:text-sm"
                  dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(current.content) }}
                />
              )}

              {userCode.trim() && (
                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-zinc-900">你的解答</h3>
                    {templates.length > 0 && (
                      <button
                        className="text-xs text-zinc-400 underline hover:text-zinc-600"
                        onClick={() => {
                          const tpl = templates.find(t => t.lang === language)
                          if (tpl) setUserCode(tpl.code)
                        }}
                      >
                        重置为模板
                      </button>
                    )}
                  </div>
                  <CodeEditor
                    code={userCode}
                    language={language}
                  />
                </div>
              )}

              {current.notes && (
                <div>
                  <h3 className="mb-2 text-sm font-semibold text-zinc-900">解题思路</h3>
                  <p className="whitespace-pre-wrap rounded-lg bg-zinc-50 p-4 text-sm text-zinc-600">{current.notes}</p>
                </div>
              )}

              {!snippetsLoading && snippets.length > 0 && (
                <div>
                  <h3 className="mb-2 text-sm font-semibold text-zinc-900">历史代码</h3>
                  <div className="space-y-3">
                    {snippets.map((s) => (
                      <div key={s.id}>
                        <p className="mb-1 text-xs font-medium text-zinc-500">{s.language}</p>
                        <CodeEditor
                          code={s.code}
                          language={s.language as CodeLanguage}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="border-t border-zinc-100 pt-4">
                <p className="mb-3 text-sm font-medium text-zinc-700">掌握度自评</p>
                <div className="flex gap-3">
                  <button
                    className="flex-1 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-center text-sm font-medium text-red-700 transition-colors hover:bg-red-100 disabled:opacity-50"
                    onClick={() => handleRate('hard')}
                    disabled={saving}
                  >
                    <ThumbsDown className="mx-auto mb-1 h-5 w-5" />
                    困难
                  </button>
                  <button
                    className="flex-1 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-center text-sm font-medium text-amber-700 transition-colors hover:bg-amber-100 disabled:opacity-50"
                    onClick={() => handleRate('medium')}
                    disabled={saving}
                  >
                    <Meh className="mx-auto mb-1 h-5 w-5" />
                    中等
                  </button>
                  <button
                    className="flex-1 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-center text-sm font-medium text-emerald-700 transition-colors hover:bg-emerald-100 disabled:opacity-50"
                    onClick={() => handleRate('easy')}
                    disabled={saving}
                  >
                    <ThumbsUp className="mx-auto mb-1 h-5 w-5" />
                    容易
                  </button>
                </div>
                {savingCode && (
                  <p className="mt-2 text-center text-xs text-zinc-400">正在保存你的代码...</p>
                )}
              </div>
            </div>
          )}

          {stage === 'rated' && (
            <div className="space-y-2 py-4 text-center">
              <div className="flex items-center justify-center gap-2 text-sm text-emerald-600">
                <CheckCircle className="h-5 w-5" />
                已记录
              </div>
              {userCode.trim() && (
                <p className="text-xs text-emerald-500">代码已自动保存</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
