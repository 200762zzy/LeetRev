import { useEffect, useState, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { invoke } from '@tauri-apps/api/core'
import { ArrowLeft, Eye, Loader2, ThumbsUp, Meh, ThumbsDown, CheckCircle, BookOpen, BookMarked, Maximize2, Minimize2, Send, X, AlertTriangle, FileText, SkipForward } from 'lucide-react'
import DOMPurify from 'dompurify'
import type { Problem, CodeLanguage, CodeSnippet, CodeTemplate, SubmissionResult, Tag, TagDueCount, SolutionApproach } from '../types'
import { LANGUAGES } from '../types'
import { difficultyColor } from '../lib/utils'
import { CodeEditor } from '../components/CodeEditor'
import { CustomApiForm } from '../components/CustomApiForm'
import { Scratchpad } from '../components/Scratchpad'

type ReviewStage = 'recall' | 'reveal' | 'rated'

export function ReviewSession() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const tagIdParam = searchParams.get('tagId')
  const tagId = tagIdParam ? Number(tagIdParam) : null
  const problemIdParam = searchParams.get('problemId')
  const problemId = problemIdParam ? Number(problemIdParam) : null

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
  const [userNotes, setUserNotes] = useState('')
  const [apiFormOpen, setApiFormOpen] = useState(false)
  const [scratchpadOpen, setScratchpadOpen] = useState(false)
  const [descExpanded, setDescExpanded] = useState(false)
  const [codeFullscreen, setCodeFullscreen] = useState(false)
  const [hasCookie, setHasCookie] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitResult, setSubmitResult] = useState<SubmissionResult | null>(null)
  const [submissionBlocked, setSubmissionBlocked] = useState(false)
  const [tab, setTab] = useState<'system' | 'column'>(tagId ? 'column' : 'system')
  const [selectedTagId, setSelectedTagId] = useState<number | null>(tagId)
  const [selectedTagName, setSelectedTagName] = useState('')
  const [tagDueCounts, setTagDueCounts] = useState<TagDueCount[]>([])
  const [columnLoading, setColumnLoading] = useState(false)
  const [approaches, setApproaches] = useState<SolutionApproach[]>([])

  const loadQueue = useCallback(async (tid: number | null, pid: number | null) => {
    setLoading(true)
    try {
      let data = await invoke<Problem[]>('get_review_queue', { tagId: tid })
      if (pid != null) {
        const idx = data.findIndex(p => p.id === pid)
        if (idx > 0) {
          const [item] = data.splice(idx, 1)
          data.unshift(item)
        } else if (idx === -1) {
          const p = await invoke<Problem>('get_problem', { id: pid })
          data.unshift(p)
        }
      }
      setQueue(data)
    } catch (e) {
      console.error(e)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    if (tab === 'system') {
      setCompleted(false)
      setIndex(0)
      loadQueue(null, problemId)
    } else if (selectedTagId != null) {
      setCompleted(false)
      setIndex(0)
      loadQueue(selectedTagId, problemId)
    }
  }, [loadQueue, tab, selectedTagId, problemId])

  useEffect(() => {
    if (tab === 'column' && selectedTagId) {
      invoke<Tag[]>('get_tags').then(tags => {
        const t = tags.find(t => t.id === selectedTagId)
        if (t) setSelectedTagName(t.name)
      })
    }
  }, [tab, selectedTagId])

  const loadTagDueCounts = useCallback(async () => {
    setColumnLoading(true)
    try {
      const data = await invoke<TagDueCount[]>('get_tag_due_counts')
      setTagDueCounts(data)
    } catch (e) {
      console.error(e)
    }
    setColumnLoading(false)
  }, [])

  useEffect(() => {
    if (tab === 'column' && !selectedTagId) {
      loadTagDueCounts()
    }
  }, [tab, selectedTagId, loadTagDueCounts])

  useEffect(() => {
    invoke<string | null>('get_setting', { key: 'leetcode_session' }).then(v => {
      setHasCookie(v !== null && v !== '')
    })
  }, [])

  const current = queue[index]

  useEffect(() => {
    if (!current?.id) return
    setSnippets([])
    setTemplates([])
    setUserCode('')
    setLanguage('Python')
    setEditingStarted(false)
    setUserNotes(current.notes ?? '')
    setSnippetsLoading(true)
    setSubmitResult(null)
    setSubmissionBlocked(false)
    setCodeFullscreen(false)

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

  useEffect(() => {
    if (!current?.id) return
    invoke<SolutionApproach[]>('get_solution_approaches', { problemId: current.id })
      .then(setApproaches)
      .catch(() => setApproaches([]))
  }, [current?.id])

  const handleReveal = () => {
    setStage('reveal')
  }

  const handleRate = async (confidence: 'easy' | 'medium' | 'hard') => {
    setSaving(true)
    try {
      await invoke('record_review', { problemId: current.id, confidence })

      await invoke('update_problem', { id: current.id, data: { notes: userNotes || null } })

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

  const handleSkip = () => {
    if (index + 1 < queue.length) {
      setIndex(index + 1)
      setStage('recall')
    } else {
      setCompleted(true)
    }
  }

  const handleSubmitCode = async () => {
    if (!current?.leetcode_id) return
    setSubmitting(true)
    try {
      const result = await invoke<SubmissionResult>('submit_code', {
        leetcodeId: current.leetcode_id,
        language,
        code: userCode,
      })
      setSubmitResult(result)

      if (result.status === 'Accepted') {
        setSubmissionBlocked(false)
        await invoke('save_code_snippet', {
          data: { problem_id: current.id, language, code: userCode },
        })
        await invoke('update_problem', {
          id: current.id,
          data: { notes: userNotes || null },
        })
        setStage('reveal')
      } else {
        setSubmissionBlocked(true)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setSubmitting(false)
    }
  }

  const handleDismissSubmit = () => {
    if (!submissionBlocked) {
      setSubmitResult(null)
    }
  }

  const handleAbandonSubmit = () => {
    setSubmissionBlocked(false)
    setSubmitResult(null)
  }

  const showColumnGrid = tab === 'column' && selectedTagId == null
  const tid = tab === 'column' ? selectedTagId : null

  const TabBar = (
    <div className="flex gap-1 rounded-lg bg-zinc-100 p-1 w-fit">
      <button
        className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
          tab === 'system' ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-700'
        }`}
        onClick={() => {
          if (tab !== 'system') {
            setTab('system')
            setSelectedTagId(null)
            setSelectedTagName('')
            setCompleted(false)
            setIndex(0)
          }
        }}
      >
        系统复习
      </button>
      <button
        className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
          tab === 'column' ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-700'
        }`}
        onClick={() => {
          if (tab !== 'column') {
            setTab('column')
            setSelectedTagId(null)
            setSelectedTagName('')
            setCompleted(false)
            setQueue([])
          }
        }}
      >
        专栏复习
      </button>
    </div>
  )

  // Column grid view
  if (showColumnGrid) {
    return (
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button className="btn-ghost p-1.5" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-5 w-5" />
            </button>
            <h1 className="text-xl font-bold text-zinc-900">专栏复习</h1>
          </div>
          {TabBar}
        </div>
        {columnLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-primary-600" />
          </div>
        ) : tagDueCounts.length === 0 ? (
          <div className="mx-auto max-w-lg space-y-6 py-20 text-center">
            <CheckCircle className="mx-auto h-16 w-16 text-zinc-300" />
            <h1 className="text-2xl font-bold text-zinc-900">暂无专栏</h1>
            <p className="text-zinc-500">请先在题目管理中添加标签</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {tagDueCounts.map((t) => (
              <button
                key={t.id}
                className="card text-left transition-all hover:shadow-md active:scale-[0.98]"
                onClick={() => {
                  setSelectedTagId(t.id)
                  setSelectedTagName(t.name)
                }}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="h-4 w-4 rounded-full flex-shrink-0"
                    style={{ backgroundColor: t.color }}
                  />
                  <span className="font-medium text-zinc-900">{t.name}</span>
                </div>
                <p className="mt-2 text-sm text-zinc-500">
                  待复习 <span className="font-semibold text-primary-600">{t.due_count}</span> 题
                </p>
              </button>
            ))}
          </div>
        )}
      </div>
    )
  }

  // Loading state
  if (loading) {
    return (
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button className="btn-ghost p-1.5" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-5 w-5" />
            </button>
            <h1 className="text-xl font-bold text-zinc-900">
              {tab === 'column' ? `${selectedTagName} 专栏复习` : '系统复习'}
            </h1>
          </div>
          {TabBar}
        </div>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-primary-600" />
        </div>
      </div>
    )
  }

  // Completed state
  if (completed) {
    return (
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button className="btn-ghost p-1.5" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-5 w-5" />
            </button>
            <h1 className="text-xl font-bold text-zinc-900">
              {tab === 'column' ? `${selectedTagName} 专栏复习` : '系统复习'}
            </h1>
          </div>
          {TabBar}
        </div>
        <div className="mx-auto max-w-lg space-y-6 py-20 text-center">
          <CheckCircle className="mx-auto h-16 w-16 text-emerald-500" />
          <h1 className="text-2xl font-bold text-zinc-900">复习完成！</h1>
          <p className="text-zinc-500">本次复习了 {queue.length} 道题目</p>
          <div className="flex items-center justify-center gap-3">
            <button className="btn-primary" onClick={() => loadQueue(tid, null)}>
              <BookOpen className="h-4 w-4" />
              继续复习
            </button>
            {tab === 'column' && (
              <button className="btn-secondary" onClick={() => {
                setSelectedTagId(null)
                setSelectedTagName('')
              }}>
                返回专栏列表
              </button>
            )}
            <button className="btn-secondary" onClick={() => navigate('/')}>
              回到首页
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Empty queue
  if (queue.length === 0) {
    return (
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button className="btn-ghost p-1.5" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-5 w-5" />
            </button>
            <h1 className="text-xl font-bold text-zinc-900">
              {tab === 'column' ? `${selectedTagName} 专栏复习` : '系统复习'}
            </h1>
          </div>
          {TabBar}
        </div>
        <div className="mx-auto max-w-lg space-y-6 py-20 text-center">
          <CheckCircle className="mx-auto h-16 w-16 text-zinc-300" />
          <h1 className="text-2xl font-bold text-zinc-900">没有待复习的题目</h1>
          <p className="text-zinc-500">所有题目都已按计划复习过了，明天再来吧</p>
          <div className="flex items-center justify-center gap-3">
            {tab === 'column' && (
              <button className="btn-secondary" onClick={() => {
                setSelectedTagId(null)
                setSelectedTagName('')
              }}>
                返回专栏列表
              </button>
            )}
            <button className="btn-secondary" onClick={() => navigate('/')}>
              回到首页
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Active review
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button className="btn-ghost p-1.5" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-zinc-900">
              {tab === 'column' ? `${selectedTagName} 专栏复习` : '系统复习'}
            </h1>
            <p className="text-sm text-zinc-500">第 {index + 1}/{queue.length} 题</p>
          </div>
          <div className="h-2 w-32 overflow-hidden rounded-full bg-zinc-200">
            <div
              className="h-full rounded-full bg-primary-500 transition-all duration-300"
              style={{ width: `${((index + 1) / queue.length) * 100}%` }}
            />
          </div>
        </div>
        {TabBar}
      </div>

      {tab === 'column' && (
        <button
          className="flex items-center gap-1 text-sm text-zinc-400 hover:text-zinc-600"
          onClick={() => { setSelectedTagId(null); setSelectedTagName('') }}
        >
          <ArrowLeft className="h-3 w-3" />
          返回专栏列表
        </button>
      )}

      <div className="flex gap-0">
        <div className={`${scratchpadOpen ? 'w-1/3 min-w-0 overflow-y-auto' : 'w-full'}`}>
          {scratchpadOpen ? (
            <div className="card p-4">
              {current.content && (
                <div
                  className="prose prose-sm max-w-none text-zinc-700 [&_pre]:rounded-lg [&_pre]:bg-zinc-100 [&_pre]:p-3 [&_code]:text-sm"
                  dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(current.content) }}
                />
              )}
              {!current.content && (
                <p className="text-sm text-zinc-400">该题目暂无描述，请先在详情页抓取</p>
              )}
            </div>
          ) : (
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
              {!codeFullscreen && current.content && (
                <div className="relative">
                  <div
                    className={`prose prose-sm max-w-none text-zinc-700 [&_pre]:rounded-lg [&_pre]:bg-zinc-100 [&_pre]:p-3 [&_code]:text-sm overflow-hidden transition-all ${
                      descExpanded ? '' : 'max-h-40'
                    }`}
                    dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(current.content) }}
                  />
                  <button
                    onClick={() => setDescExpanded(!descExpanded)}
                    className="mt-1 text-xs text-primary-600 hover:text-primary-700"
                  >
                    {descExpanded ? '收起描述' : '展开完整描述'}
                  </button>
                </div>
              )}
              {!codeFullscreen && !current.content && (
                <p className="text-sm text-zinc-400">该题目暂无描述，请先在详情页抓取</p>
              )}

              {codeFullscreen && (
                <div className="flex items-center justify-between rounded-lg bg-zinc-50 px-3 py-2">
                  <span className="text-sm font-medium text-zinc-700">
                    #{current.leetcode_id ?? '-'} {current.title}
                    {current.title_cn && <span className="text-zinc-400 ml-1">/ {current.title_cn}</span>}
                  </span>
                  <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${difficultyColor(current.difficulty)}`}>
                    {current.difficulty}
                  </span>
                </div>
              )}

              <div className={`grid grid-cols-1 gap-4 ${codeFullscreen ? '' : 'md:grid-cols-[1fr_380px]'}`}>
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
                    <span className="text-xs text-zinc-400">编写代码</span>
                    <button
                      onClick={() => setApiFormOpen(true)}
                      className="rounded-md p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-primary-600"
                      title="添加 API 笔记"
                    >
                      <BookMarked className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setScratchpadOpen(true)}
                      className="rounded-md p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-primary-600"
                      title="草稿板"
                    >
                      <FileText className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setCodeFullscreen(!codeFullscreen)}
                      className="ml-auto rounded-md p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-primary-600"
                      title={codeFullscreen ? '退出全屏' : '全屏写代码'}
                    >
                      {codeFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                    </button>
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

                  {/* Submission Result Panel */}
                  {submitResult && (
                    <div className={`rounded-lg border p-3 ${
                      submitResult.status === 'Accepted'
                        ? 'border-emerald-200 bg-emerald-50'
                        : submitResult.status === 'Wrong Answer'
                          ? 'border-red-200 bg-red-50'
                          : submitResult.status === 'Compile Error'
                            ? 'border-amber-200 bg-amber-50'
                            : 'border-orange-200 bg-orange-50'
                    }`}>
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          {submitResult.status === 'Accepted'
                            ? <CheckCircle className="h-5 w-5 text-emerald-600" />
                            : <AlertTriangle className="h-5 w-5 text-red-500" />
                          }
                          <span className={`text-sm font-semibold ${
                            submitResult.status === 'Accepted' ? 'text-emerald-700' : 'text-red-700'
                          }`}>
                            {submitResult.status === 'Accepted'
                              ? `通过! (${submitResult.passed}/${submitResult.total})`
                              : `${submitResult.status} (${submitResult.passed}/${submitResult.total})`
                            }
                          </span>
                        </div>
                        {!submissionBlocked && (
                          <button onClick={handleDismissSubmit} className="p-0.5 text-zinc-400 hover:text-zinc-600">
                            <X className="h-4 w-4" />
                          </button>
                        )}
                      </div>

                      {submitResult.status === 'Accepted' && (
                        <div className="mt-2 space-y-1 text-xs">
                          {submitResult.runtime && <p className="text-emerald-600">运行时间: {submitResult.runtime}</p>}
                          {submitResult.memory && <p className="text-emerald-600">内存: {submitResult.memory}</p>}
                          <p className="text-emerald-600 flex items-center gap-1"><CheckCircle className="h-3 w-3" /> 代码和心得已自动保存</p>
                          <div className="pt-2">
                            <button
                              className="rounded-md px-3 py-1.5 text-xs font-medium bg-emerald-100 text-emerald-700 hover:bg-emerald-200 transition-colors"
                              onClick={handleSkip}
                            >
                              <SkipForward className="mr-1 inline h-3 w-3" />
                              下一题
                            </button>
                          </div>
                        </div>
                      )}

                      {submitResult.status === 'Wrong Answer' && (
                        <div className="mt-2 space-y-1 text-xs text-red-600">
                          {submitResult.last_testcase && <p>输入: <code className="rounded bg-red-100 px-1">{submitResult.last_testcase}</code></p>}
                          {submitResult.code_output && <p>你的输出: <code className="rounded bg-red-100 px-1">{submitResult.code_output}</code></p>}
                          {submitResult.expected_output && <p>预期输出: <code className="rounded bg-red-100 px-1">{submitResult.expected_output}</code></p>}
                        </div>
                      )}

                      {submitResult.status === 'Compile Error' && submitResult.compile_error && (
                        <pre className="mt-2 overflow-x-auto rounded bg-amber-100 p-2 text-xs text-amber-800">{submitResult.compile_error}</pre>
                      )}

                      {submitResult.status === 'Runtime Error' && (
                        <div className="mt-2 space-y-1 text-xs text-orange-700">
                          {submitResult.runtime_error && <pre className="overflow-x-auto rounded bg-orange-100 p-2">{submitResult.runtime_error}</pre>}
                          {submitResult.last_testcase && <p>输入: <code className="rounded bg-orange-100 px-1">{submitResult.last_testcase}</code></p>}
                        </div>
                      )}

                      <div className="mt-2 flex items-center gap-2">
                        <button
                          onClick={handleSubmitCode}
                          disabled={submitting}
                          className="rounded-md px-3 py-1.5 text-xs font-medium bg-white border border-zinc-200 text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
                        >
                          {submitting ? '提交中...' : '重新提交'}
                        </button>
                        {submissionBlocked && (
                          <button onClick={handleAbandonSubmit} className="rounded-md px-3 py-1.5 text-xs font-medium text-zinc-500 hover:bg-zinc-100">
                            放弃提交→查看对比
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {!codeFullscreen && (
                  <div className="space-y-2">
                    <span className="text-xs font-medium text-zinc-500">解题思路</span>
                    <textarea
                      className="w-full rounded-lg border border-zinc-200 bg-white p-3 text-sm text-zinc-900 outline-none transition-colors focus:border-primary-500 focus:ring-2 focus:ring-primary-500 resize-none"
                      rows={10}
                      value={userNotes}
                      onChange={e => setUserNotes(e.target.value)}
                      placeholder="写下你的解题思路、注意事项、算法要点..."
                    />
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2">
                {hasCookie && (
                  <button
                    className="btn-primary flex-1"
                    onClick={handleSubmitCode}
                    disabled={submitting || !current.leetcode_id}
                  >
                    {submitting ? (
                      <><Loader2 className="h-4 w-4 animate-spin" /> 判题中...</>
                    ) : (
                      <><Send className="h-4 w-4" /> 提交判题</>
                    )}
                  </button>
                )}
                <button
                  className={`${hasCookie ? 'btn-secondary flex-1' : 'btn-primary w-full'}`}
                  onClick={handleReveal}
                  disabled={submissionBlocked}
                  title={submissionBlocked ? '提交未通过，请修改代码后重新提交' : undefined}
                >
                  <Eye className="h-4 w-4" />
                  查看对比
                </button>
              </div>
            </div>
          )}

          {stage === 'reveal' && (
            <div className="space-y-4">
              {submitResult && submitResult.status === 'Accepted' && (
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-emerald-600" />
                    <span className="text-sm font-semibold text-emerald-700">
                      通过! ({submitResult.passed}/{submitResult.total})
                    </span>
                  </div>
                  <div className="mt-1 space-y-0.5 text-xs text-emerald-600">
                    {submitResult.runtime && <p>运行时间: {submitResult.runtime}</p>}
                    {submitResult.memory && <p>内存: {submitResult.memory}</p>}
                  </div>
                </div>
              )}
              {current.content && (
                <div className="relative">
                  <div
                    className={`prose prose-sm max-w-none text-zinc-700 [&_pre]:rounded-lg [&_pre]:bg-zinc-100 [&_pre]:p-3 [&_code]:text-sm overflow-hidden transition-all ${
                      descExpanded ? '' : 'max-h-40'
                    }`}
                    dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(current.content) }}
                  />
                  <button
                    onClick={() => setDescExpanded(!descExpanded)}
                    className="mt-1 text-xs text-primary-600 hover:text-primary-700"
                  >
                    {descExpanded ? '收起描述' : '展开完整描述'}
                  </button>
                </div>
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

              {userNotes && (
                <div>
                  <h3 className="mb-2 text-sm font-semibold text-zinc-900">解题思路</h3>
                  <p className="whitespace-pre-wrap rounded-lg bg-zinc-50 p-4 text-sm text-zinc-600">{userNotes}</p>
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

              {approaches.length > 0 && (
                <div>
                  <h3 className="mb-2 text-sm font-semibold text-zinc-900">多解法参考</h3>
                  <div className="space-y-3">
                    {approaches.map((a) => (
                      <div key={a.id} className="rounded-lg border border-zinc-100 p-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-zinc-900">{a.title}</span>
                          {(a.time_complexity || a.space_complexity) && (
                            <span className="text-xs text-zinc-400">
                              {a.time_complexity}{a.time_complexity && a.space_complexity && ' / '}{a.space_complexity}
                            </span>
                          )}
                        </div>
                        {a.description && <p className="mt-1 text-xs text-zinc-500">{a.description}</p>}
                        {a.code && (
                          <div className="mt-2">
                            <CodeEditor code={a.code} language={a.language as CodeLanguage} />
                          </div>
                        )}
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
              {submitResult?.status !== 'Accepted' && (
                <div className="text-center">
                  <button
                    className="text-sm text-zinc-400 hover:text-zinc-600 underline"
                    onClick={handleSkip}
                  >
                    <SkipForward className="mr-1 inline h-3 w-3" />
                    跳过 → 下一题
                  </button>
                </div>
              )}
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
        )}
        </div>
      {scratchpadOpen && (
        <div className="w-2/3 min-w-0 overflow-hidden border-l border-zinc-200" style={{ height: 'calc(100vh - 200px)' }}>
          <Scratchpad
            problemId={current?.id ?? null}
            onClose={() => setScratchpadOpen(false)}
          />
        </div>
      )}
    </div>
    <CustomApiForm
      open={apiFormOpen}
      onClose={() => setApiFormOpen(false)}
      defaultLanguage={language === 'C++' ? 'cpp' : language === 'Java' ? 'java' : 'python'}
      defaultProblemId={current?.id ?? null}
      onSaved={() => {}}
    />
  </div>
  )
}
