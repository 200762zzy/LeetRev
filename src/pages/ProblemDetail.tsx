import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { invoke } from '@tauri-apps/api/core'
import { ArrowLeft, Copy, Check, Trash2, Loader2, ExternalLink, Save, RefreshCw, Play, AlertCircle, XCircle, CheckCircle, Bug, History } from 'lucide-react'
import { writeText } from '@tauri-apps/plugin-clipboard-manager'
import DOMPurify from 'dompurify'
import type { Problem, CodeSnippet, SaveCodeSnippetDTO, CodeLanguage, SubmissionResult, CodeTemplate } from '../types'
import { LANGUAGES } from '../types'
import { difficultyColor, statusColor, statusLabel } from '../lib/utils'
import { CodeEditor } from '../components/CodeEditor'

interface LastSubmission {
  code: string
  lang: string
}

export function ProblemDetail() {
  const navigate = useNavigate()
  const { id } = useParams()
  const [problem, setProblem] = useState<Problem | null>(null)
  const [snippets, setSnippets] = useState<CodeSnippet[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [language, setLanguage] = useState<CodeLanguage>('Python')
  const [code, setCode] = useState('')
  const [copied, setCopied] = useState(false)
  const [fetchingContent, setFetchingContent] = useState(false)
  const [templates, setTemplates] = useState<CodeTemplate[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [submitResult, setSubmitResult] = useState<SubmissionResult | null>(null)
  const [lastSubmission, setLastSubmission] = useState<LastSubmission | null>(null)
  const [fetchingSubmission, setFetchingSubmission] = useState(false)

  useEffect(() => {
    if (!id) return
    setLoading(true)
    Promise.all([
      invoke<Problem>('get_problem', { id: Number(id) }),
      invoke<CodeSnippet[]>('get_code_snippets', { problemId: Number(id) }),
    ])
      .then(([p, snips]) => {
        setProblem(p)
        setSnippets(snips)
        if (snips.length > 0) {
          setLanguage(snips[0].language as CodeLanguage)
          setCode(snips[0].code)
        }
        if (p.leetcode_id) {
          invoke<CodeTemplate[]>('fetch_code_templates', { leetcodeId: p.leetcode_id })
            .then((tpls) => {
              setTemplates(tpls)
              if (snips.length === 0 && tpls.length > 0) {
                const defaultLang = LANGUAGES[0]
                const tpl = tpls.find(t => t.lang === defaultLang) ?? tpls[0]
                setLanguage(tpl.lang as CodeLanguage)
                setCode(tpl.code)
              }
            })
            .catch(() => {})

          setFetchingSubmission(true)
          invoke<LastSubmission | null>('get_last_accepted_submission', { leetcodeId: p.leetcode_id })
            .then((sub) => {
              if (sub) {
                setLastSubmission(sub)
                if (snips.length === 0) {
                  setLanguage(sub.lang as CodeLanguage)
                  setCode(sub.code)
                }
              }
            })
            .catch(() => {})
            .finally(() => setFetchingSubmission(false))
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [id])

  const handleSave = async () => {
    if (!id) return
    setSaving(true)
    try {
      const data: SaveCodeSnippetDTO = {
        problem_id: Number(id),
        language,
        code,
      }
      const saved = await invoke<CodeSnippet>('save_code_snippet', { data })
      setSnippets((prev) => {
        const filtered = prev.filter((s) => s.language !== language)
        return [saved, ...filtered]
      })
    } catch (e) {
      console.error(e)
      alert('保存失败')
    }
    setSaving(false)
  }

  const handleFetchContent = async () => {
    if (!id || !problem?.leetcode_id) return
    setFetchingContent(true)
    try {
      const content = await invoke<string>('fetch_and_save_content', {
        problemId: Number(id),
        leetcodeId: problem.leetcode_id,
      })
      setProblem((prev) => prev ? { ...prev, content } : null)
    } catch (e) {
      console.error(e)
      alert('抓取题目描述失败')
    }
    setFetchingContent(false)
  }

  const handleSubmit = async () => {
    if (!problem?.leetcode_id) {
      alert('该题目没有关联力扣题号')
      return
    }
    if (!code.trim()) {
      alert('请先编写代码')
      return
    }
    setSubmitting(true)
    setSubmitResult(null)
    try {
      const result = await invoke<SubmissionResult>('submit_code', {
        leetcodeId: problem.leetcode_id,
        language,
        code,
      })
      setSubmitResult(result)
    } catch (e) {
      alert('提交失败：' + String(e))
    }
    setSubmitting(false)
  }

  const handleCopy = async () => {
    try {
      await writeText(code)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {}
  }

  const handleDelete = async (snippetId: number) => {
    if (!confirm('确定删除这段代码？')) return
    try {
      await invoke('delete_code_snippet', { id: snippetId })
      const remaining = snippets.filter((s) => s.id !== snippetId)
      setSnippets(remaining)
      if (remaining.length === 0) {
        setCode('')
      } else {
        setLanguage(remaining[0].language as CodeLanguage)
        setCode(remaining[0].code)
      }
    } catch (e) {
      console.error(e)
    }
  }

  const switchSnippet = (s: CodeSnippet) => {
    setLanguage(s.language as CodeLanguage)
    setCode(s.code)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-primary-600" />
      </div>
    )
  }

  if (!problem) {
    return (
      <div className="py-20 text-center text-sm text-zinc-500">
        题目未找到
      </div>
    )
  }

  const resultIcon = (status: string) => {
    if (status === 'Accepted') return <CheckCircle className="h-5 w-5 text-emerald-500" />
    if (status === 'Wrong Answer') return <XCircle className="h-5 w-5 text-red-500" />
    if (status === 'Runtime Error' || status === 'Compile Error') return <Bug className="h-5 w-5 text-orange-500" />
    return <AlertCircle className="h-5 w-5 text-amber-500" />
  }

  const resultColor = (status: string) => {
    if (status === 'Accepted') return 'border-emerald-200 bg-emerald-50'
    if (status === 'Wrong Answer') return 'border-red-200 bg-red-50'
    if (status === 'Runtime Error' || status === 'Compile Error') return 'border-orange-200 bg-orange-50'
    return 'border-amber-200 bg-amber-50'
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button className="btn-ghost p-1.5" onClick={() => navigate('/problems')}>
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-zinc-900">{problem.title}</h1>
            <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${difficultyColor(problem.difficulty)}`}>
              {problem.difficulty}
            </span>
            <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${statusColor(problem.status)}`}>
              {statusLabel(problem.status)}
            </span>
          </div>
          <div className="mt-1 flex items-center gap-3">
            {problem.leetcode_id && (
              <span className="text-sm font-mono text-zinc-400">#{problem.leetcode_id}</span>
            )}
            {problem.title_cn && (
              <span className="text-sm text-zinc-500">/ {problem.title_cn}</span>
            )}
            {problem.leetcode_url && (
              <a
                href={problem.leetcode_url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-sm text-primary-600 hover:text-primary-700"
              >
                <ExternalLink className="h-3 w-3" />
                力扣
              </a>
            )}
            <button
              className="text-xs text-zinc-400 hover:text-zinc-600 underline"
              onClick={() => navigate(`/problems/${id}/edit`)}
            >
              编辑信息
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-5 gap-6">
        <div className="col-span-2 space-y-4">
          <div className="card">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-zinc-900">题目描述</h3>
              {problem.leetcode_id && (
                <button
                  className="btn-ghost text-xs px-2 py-1"
                  onClick={handleFetchContent}
                  disabled={fetchingContent}
                >
                  {fetchingContent ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <RefreshCw className="h-3 w-3" />
                  )}
                  {problem.content ? '刷新' : '抓取'}
                </button>
              )}
            </div>
            {problem.content ? (
              <div
                className="prose prose-sm max-w-none text-zinc-700 [&_pre]:rounded-lg [&_pre]:bg-zinc-100 [&_pre]:p-3 [&_code]:text-sm [&_img]:hidden"
                dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(problem.content) }}
              />
            ) : (
              <p className="text-sm text-zinc-400">
                {problem.leetcode_id ? '点击「抓取」从力扣获取题目描述' : '无关联力扣题目'}
              </p>
            )}
          </div>

          {problem.notes && (
            <div className="card">
              <h3 className="mb-2 text-sm font-semibold text-zinc-900">解题思路</h3>
              <p className="whitespace-pre-wrap text-sm text-zinc-600">{problem.notes}</p>
            </div>
          )}
        </div>

        <div className="col-span-3 space-y-4">
          <div className="card flex flex-col min-h-[500px]">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <select
                  className="input-field w-auto"
                  value={language}
                  onChange={(e) => {
                    const newLang = e.target.value as CodeLanguage
                    const existing = snippets.find((s) => s.language === newLang)
                    const tpl = templates.find((t) => t.lang === newLang)
                    setLanguage(newLang)
                    setCode(existing?.code ?? tpl?.code ?? '')
                  }}
                >
                  {LANGUAGES.map((l) => (
                    <option key={l} value={l}>{l}</option>
                  ))}
                </select>
                <button
                  className="btn-primary text-xs px-3 py-1.5"
                  onClick={handleSave}
                  disabled={saving}
                >
                  {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                  保存
                </button>
                <button className="btn-secondary text-xs px-3 py-1.5" onClick={handleCopy}>
                  {copied ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                  {copied ? '已复制' : '复制'}
                </button>
              </div>
              {problem.leetcode_id && (
                <button
                  className="btn-primary text-xs px-3 py-1.5"
                  onClick={handleSubmit}
                  disabled={submitting}
                >
                  {submitting ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Play className="h-3 w-3" />
                  )}
                  {submitting ? '判题中...' : '提交验证'}
                </button>
              )}
            </div>
            <CodeEditor
              code={code}
              language={language}
              onChange={(v) => setCode(v ?? '')}
              editable
            />
          </div>

          {lastSubmission && !submitResult && (
            <div className="flex items-center gap-2 rounded-lg border border-sky-200 bg-sky-50 px-4 py-2.5 text-sm">
              <History className="h-4 w-4 text-sky-500" />
              <span className="text-sky-700">
                已加载你之前的解答（{lastSubmission.lang}）
              </span>
              <button
                className="ml-auto text-xs text-sky-500 underline hover:text-sky-700"
                onClick={() => {
                  const tpl = templates.find((t) => t.lang === language)
                  if (tpl) setCode(tpl.code)
                  else setCode('')
                  setLastSubmission(null)
                }}
              >
                重置为模板
              </button>
            </div>
          )}

          {fetchingSubmission && (
            <div className="flex items-center gap-2 text-sm text-zinc-400">
              <Loader2 className="h-3 w-3 animate-spin" />
              正在查找历史解答...
            </div>
          )}

          {submitResult && (
            <div className={`rounded-lg border p-4 text-sm ${resultColor(submitResult.status)}`}>
              <div className="flex items-center gap-2 font-medium">
                {resultIcon(submitResult.status)}
                <span className={
                  submitResult.status === 'Accepted' ? 'text-emerald-700' :
                  submitResult.status === 'Wrong Answer' ? 'text-red-700' :
                  'text-orange-700'
                }>
                  {submitResult.status}
                </span>
              </div>

              {submitResult.status === 'Accepted' && (
                <div className="mt-2 space-y-1 text-zinc-600">
                  <p>通过 {submitResult.passed}/{submitResult.total} 个测试用例</p>
                  {submitResult.runtime && <p>运行时间: {submitResult.runtime}</p>}
                  {submitResult.memory && <p>内存消耗: {submitResult.memory}</p>}
                </div>
              )}

              {submitResult.status === 'Wrong Answer' && (
                <div className="mt-2 space-y-2">
                  <p className="text-zinc-600">通过 {submitResult.passed}/{submitResult.total} 个测试用例</p>
                  <div className="rounded-md border border-red-200 bg-white p-3 font-mono text-xs">
                    {submitResult.last_testcase && (
                      <div className="mb-2">
                        <p className="mb-1 font-medium text-zinc-500">输入:</p>
                        <pre className="whitespace-pre-wrap text-zinc-800">{submitResult.last_testcase}</pre>
                      </div>
                    )}
                    {submitResult.code_output && (
                      <div className="mb-2">
                        <p className="mb-1 font-medium text-zinc-500">输出:</p>
                        <pre className="whitespace-pre-wrap text-red-600">{submitResult.code_output}</pre>
                      </div>
                    )}
                    {submitResult.expected_output && (
                      <div>
                        <p className="mb-1 font-medium text-zinc-500">期望:</p>
                        <pre className="whitespace-pre-wrap text-emerald-600">{submitResult.expected_output}</pre>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {(submitResult.status === 'Compile Error') && submitResult.compile_error && (
                <div className="mt-2 rounded-md border border-orange-200 bg-white p-3 font-mono text-xs">
                  <pre className="whitespace-pre-wrap text-orange-700">{submitResult.compile_error}</pre>
                </div>
              )}

              {(submitResult.status === 'Runtime Error') && submitResult.runtime_error && (
                <div className="mt-2 space-y-2">
                  <div className="rounded-md border border-orange-200 bg-white p-3 font-mono text-xs">
                    <pre className="whitespace-pre-wrap text-orange-700">{submitResult.runtime_error}</pre>
                  </div>
                  {submitResult.last_testcase && (
                    <div className="rounded-md border border-orange-200 bg-white p-3 font-mono text-xs">
                      <p className="mb-1 font-medium text-zinc-500">输入:</p>
                      <pre className="whitespace-pre-wrap text-zinc-800">{submitResult.last_testcase}</pre>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

      </div>

      <div className="grid grid-cols-5 gap-6">
        <div className="col-span-2">
          <div className="card">
            <h3 className="mb-3 text-sm font-semibold text-zinc-900">标签</h3>
            <div className="flex flex-wrap gap-1.5">
              {problem.tags.map((t) => (
                <span
                  key={t.id}
                  className="inline-flex items-center rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-medium text-zinc-600"
                >
                  {t.name}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="col-span-3">
          {snippets.length > 0 && (
            <div className="card">
              <h3 className="mb-3 text-sm font-semibold text-zinc-900">代码版本</h3>
              <div className="flex flex-wrap gap-2">
                {snippets.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => switchSnippet(s)}
                    className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm transition-colors ${
                      s.language === language && s.code === code
                        ? 'border-primary-300 bg-primary-50'
                        : 'border-zinc-200 hover:bg-zinc-50'
                    }`}
                  >
                    <span className="font-medium text-zinc-900">{s.language}</span>
                    <span className="text-xs text-zinc-400">v{s.version}</span>
                    <span className="text-xs text-zinc-400">{s.created_at.slice(0, 10)}</span>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDelete(s.id) }}
                      className="ml-1 text-zinc-400 hover:text-red-500"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
