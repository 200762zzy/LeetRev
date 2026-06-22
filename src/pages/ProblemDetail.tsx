import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { invoke } from '@tauri-apps/api/core'
import DOMPurify from 'dompurify'
import { ArrowLeft, Loader2, RefreshCw, History, Target, BookOpen, Plus, Pencil, Trash2, ChevronUp, ChevronDown, Brain } from 'lucide-react'
import type { Problem, CodeSnippet, ReviewRecord, SolutionApproach, CodeAnalysis } from '../types'
import { ComplexityChart } from '../components/ComplexityChart'
import { difficultyColor, parseBetterCode } from '../lib/utils'
import { CodeEditor } from '../components/CodeEditor'
import { SolutionForm } from '../components/SolutionForm'

export function ProblemDetail() {
  const navigate = useNavigate()
  const { id } = useParams()
  const [problem, setProblem] = useState<Problem | null>(null)
  const [snippets, setSnippets] = useState<CodeSnippet[]>([])
  const [reviews, setReviews] = useState<ReviewRecord[]>([])
  const [solutions, setSolutions] = useState<SolutionApproach[]>([])
  const [solutionFormOpen, setSolutionFormOpen] = useState(false)
  const [editingSolution, setEditingSolution] = useState<SolutionApproach | null>(null)
  const [loading, setLoading] = useState(true)
  const [fetchingContent, setFetchingContent] = useState(false)
  const [analyses, setAnalyses] = useState<CodeAnalysis[]>([])
  const [expandedAnalyses, setExpandedAnalyses] = useState<Set<number>>(new Set())

  useEffect(() => {
    if (!id) return
    setLoading(true)
    Promise.all([
      invoke<Problem>('get_problem', { id: Number(id) }),
      invoke<CodeSnippet[]>('get_code_snippets', { problemId: Number(id) }),
      invoke<ReviewRecord[]>('get_review_history', { problemId: Number(id) }),
      invoke<SolutionApproach[]>('get_solution_approaches', { problemId: Number(id) }),
      invoke<CodeAnalysis[]>('get_code_analyses', { problemId: Number(id) }),
    ])
      .then(([p, snips, rvs, sols, ans]) => {
        setProblem(p)
        setSnippets(snips)
        setReviews(rvs)
        setSolutions(sols)
        setAnalyses(ans)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [id])

  const loadSolutions = () => {
    if (!id) return
    invoke<SolutionApproach[]>('get_solution_approaches', { problemId: Number(id) })
      .then(setSolutions)
      .catch(console.error)
  }

  const handleDeleteSolution = async (solutionId: number) => {
    if (!confirm('确定删除此解法？')) return
    try {
      await invoke('delete_solution_approach', { id: solutionId })
      loadSolutions()
    } catch (e) { console.error(e) }
  }

  const handleMoveSolution = async (index: number, direction: -1 | 1) => {
    const newSolutions = [...solutions]
    const target = index + direction
    if (target < 0 || target >= newSolutions.length) return
    ;[newSolutions[index], newSolutions[target]] = [newSolutions[target], newSolutions[index]]
    const ids = newSolutions.map(s => s.id)
    const orders = newSolutions.map((_, i) => i)
    try {
      await invoke('reorder_solution_approaches', { ids, orders })
      setSolutions(newSolutions)
    } catch (e) { console.error(e) }
  }

  const handleFetchContent = async () => {
    if (!id || !problem?.leetcode_id) return
    setFetchingContent(true)
    try {
      const content = await invoke<string>('fetch_and_save_content', {
        problemId: Number(id),
        leetcodeId: problem.leetcode_id,
      })
      setProblem(prev => prev ? { ...prev, content } : null)
    } catch (e) {
      console.error(e)
      alert('抓取题目描述失败')
    }
    setFetchingContent(false)
  }

  const confidenceLabel = (c: string) => {
    switch (c) {
      case 'easy': return '容易'
      case 'medium': return '中等'
      case 'hard': return '困难'
      default: return c
    }
  }

  const confidenceColor = (c: string) => {
    switch (c) {
      case 'easy': return 'text-emerald-600 bg-emerald-50 border-emerald-200'
      case 'medium': return 'text-amber-600 bg-amber-50 border-amber-200'
      case 'hard': return 'text-red-600 bg-red-50 border-red-200'
      default: return 'text-zinc-600 bg-zinc-50 border-zinc-200'
    }
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
                <BookOpen className="h-3 w-3" />
                力扣
              </a>
            )}
            <button className="text-xs text-zinc-400 hover:text-zinc-600 underline" onClick={() => navigate(`/problems/${id}/edit`)}>
              编辑信息
            </button>
          </div>
        </div>
        <button className="btn-primary" onClick={() => navigate(`/review?problemId=${id}`)}>
          <Target className="h-4 w-4" />
          去复习
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        <div className="lg:col-span-2 space-y-4">
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

          <div className="flex flex-wrap gap-1.5">
            {problem.tags.map(t => (
              <span key={t.id} className="inline-flex items-center rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-medium text-zinc-600">
                {t.name}
              </span>
            ))}
          </div>
        </div>

        <div className="lg:col-span-3 space-y-4">
          {reviews.length > 0 && (
            <div className="card">
              <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-zinc-900">
                <History className="h-4 w-4" />
                复习记录 ({reviews.length}次)
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-zinc-100 text-left text-zinc-400">
                      <th className="pb-2 pr-3 font-medium">时间</th>
                      <th className="pb-2 pr-3 font-medium">回顾难度</th>
                      <th className="pb-2 pr-3 font-medium">EF</th>
                      <th className="pb-2 pr-3 font-medium">间隔</th>
                      <th className="pb-2 pr-3 font-medium">第几次</th>
                      <th className="pb-2 font-medium">下次复习</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reviews.map(r => (
                      <tr key={r.id} className="border-b border-zinc-50 last:border-0">
                        <td className="py-2 pr-3 text-zinc-500 whitespace-nowrap">{r.reviewed_at.slice(0, 16)}</td>
                        <td className="py-2 pr-3">
                          <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${confidenceColor(r.confidence)}`}>
                            {confidenceLabel(r.confidence)}
                          </span>
                        </td>
                        <td className="py-2 pr-3 font-mono text-zinc-700">{r.ease_factor.toFixed(2)}</td>
                        <td className="py-2 pr-3 font-mono text-zinc-700">{r.interval_days}天</td>
                        <td className="py-2 pr-3 text-zinc-700">第{r.repetitions}次</td>
                        <td className="py-2 font-mono text-zinc-500">{r.next_review.slice(0, 10)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {problem.notes && (
            <div className="card">
              <h3 className="mb-2 text-sm font-semibold text-zinc-900">解题思路</h3>
              <p className="whitespace-pre-wrap rounded-lg bg-zinc-50 p-3 text-sm text-zinc-600 leading-relaxed">{problem.notes}</p>
            </div>
          )}

          {analyses.length > 0 && (
            <>
              <ComplexityChart analyses={analyses} />
              <div className="card space-y-3">
                <h3 className="flex items-center gap-2 text-sm font-semibold text-zinc-900">
                  <Brain className="h-4 w-4 text-violet-500" />
                  代码分析历史 ({analyses.length}次)
                </h3>
                <div className="max-h-80 space-y-2 overflow-y-auto">
                  {analyses.map(a => (
                    <div key={a.id} className="rounded-lg border border-violet-100 bg-violet-50/50 p-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-zinc-400">{a.created_at.slice(0, 16)}</span>
                        <span className="text-xs text-zinc-400">{a.provider}/{a.model}</span>
                      </div>
                      <div className="mt-1 grid grid-cols-3 gap-2 text-xs">
                        <div className="rounded bg-white/60 p-1.5">
                          <span className="text-zinc-500">时间复杂度</span>
                          <p className="font-mono text-violet-700">{a.time_complexity}</p>
                        </div>
                        <div className="rounded bg-white/60 p-1.5">
                          <span className="text-zinc-500">空间复杂度</span>
                          <p className="font-mono text-violet-700">{a.space_complexity}</p>
                        </div>
                        <div className="rounded bg-white/60 p-1.5">
                          <span className="text-zinc-500">评分</span>
                          <p className="font-semibold text-violet-700">{a.score}</p>
                        </div>
                      </div>
                      {a.summary && <p className="mt-1 text-xs text-zinc-600">{a.summary}</p>}
                      {a.suggestions && <p className="mt-1 text-xs text-zinc-500">{a.suggestions}</p>}
                      {(a.optimized_code || a.better_code) && (
                        <div className="mt-2 flex gap-2">
                          {a.optimized_code && (
                            <button
                              className={`rounded px-2 py-1 text-xs font-medium transition-colors ${
                                expandedAnalyses.has(a.id) ? 'bg-violet-200 text-violet-800' : 'bg-violet-100 text-violet-700 hover:bg-violet-200'
                              }`}
                              onClick={() => {
                                const next = new Set(expandedAnalyses);
                                if (next.has(a.id)) { next.delete(a.id); } else { next.add(a.id); }
                                setExpandedAnalyses(next)
                              }}
                            >
                              {expandedAnalyses.has(a.id) ? '收起代码' : '查看代码'}
                            </button>
                          )}
                        </div>
                      )}
                      {expandedAnalyses.has(a.id) && a.optimized_code && (
                        <div className="mt-2">
                          <span className="text-xs font-medium text-zinc-500">优化代码</span>
                          <div className="mt-1">
                            <CodeEditor code={a.optimized_code} language={a.language as any} editable={false} />
                          </div>
                        </div>
                      )}
                      {expandedAnalyses.has(a.id) && a.better_code && (() => {
                        const parsed = parseBetterCode(a.better_code)
                        if (!parsed) {
                          return (
                            <div className="mt-2">
                              <CodeEditor code={a.better_code} language={(a.better_language ?? a.language) as any} editable={false} />
                            </div>
                          )
                        }
                        return (
                          <div className="mt-2">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-medium text-zinc-500">更优解法</span>
                              {parsed.title && <span className="text-xs text-violet-700">{parsed.title}</span>}
                            </div>
                            {parsed.explanation && <p className="mt-1 text-xs text-zinc-500">{parsed.explanation}</p>}
                            <div className="mt-1">
                              <CodeEditor code={parsed.code} language={(a.better_language ?? a.language) as any} editable={false} />
                            </div>
                          </div>
                        )
                      })()}
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {snippets.length > 0 && (
            <div className="card space-y-3">
              <h3 className="text-sm font-semibold text-zinc-900">保存的代码</h3>
              {snippets.map(s => (
                <div key={s.id}>
                  <div className="mb-1 flex items-center justify-between">
                    <span className="text-xs font-medium text-zinc-500">{s.language} v{s.version}</span>
                    <span className="text-xs text-zinc-400">{s.created_at.slice(0, 10)}</span>
                  </div>
                  <CodeEditor code={s.code} language={s.language as any} editable={false} />
                </div>
              ))}
            </div>
          )}

          <div className="card space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-zinc-900">多解法</h3>
              <button className="btn-ghost text-xs px-2 py-1" onClick={() => { setEditingSolution(null); setSolutionFormOpen(true) }}>
                <Plus className="h-3 w-3" />
                添加解法
              </button>
            </div>
            {solutions.length === 0 ? (
              <p className="text-sm text-zinc-400">暂无解法，点击「添加解法」创建</p>
            ) : (
              <div className="space-y-3">
                {solutions.map((sol, i) => (
                  <div key={sol.id} className="rounded-lg border border-zinc-100 p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="flex flex-col gap-0.5">
                          <button className="text-zinc-300 hover:text-zinc-600 disabled:opacity-20" disabled={i === 0} onClick={() => handleMoveSolution(i, -1)}>
                            <ChevronUp className="h-3 w-3" />
                          </button>
                          <button className="text-zinc-300 hover:text-zinc-600 disabled:opacity-20" disabled={i === solutions.length - 1} onClick={() => handleMoveSolution(i, 1)}>
                            <ChevronDown className="h-3 w-3" />
                          </button>
                        </div>
                        <span className="text-sm font-medium text-zinc-900">{sol.title}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        {(sol.time_complexity || sol.space_complexity) && (
                          <span className="text-xs text-zinc-400">
                            {sol.time_complexity && <span>{sol.time_complexity}</span>}
                            {sol.time_complexity && sol.space_complexity && <span> / </span>}
                            {sol.space_complexity && <span>{sol.space_complexity}</span>}
                          </span>
                        )}
                        <button className="rounded p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600" onClick={() => { setEditingSolution(sol); setSolutionFormOpen(true) }}>
                          <Pencil className="h-3 w-3" />
                        </button>
                        <button className="rounded p-1 text-zinc-400 hover:bg-zinc-100 hover:text-red-500" onClick={() => handleDeleteSolution(sol.id)}>
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                    {sol.description && (
                      <p className="mt-1 text-xs text-zinc-500">{sol.description}</p>
                    )}
                    {sol.code && (
                      <div className="mt-2">
                        <CodeEditor code={sol.code} language={sol.language as any} editable={false} />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {solutions.length === 0 && snippets.length === 0 && !problem.notes && reviews.length === 0 && (
            <div className="card py-12 text-center">
              <BookOpen className="mx-auto h-8 w-8 text-zinc-300" />
              <p className="mt-2 text-sm text-zinc-400">暂无复习记录</p>
              <p className="text-xs text-zinc-400 mt-1">点击右上角「去复习」开始做题</p>
            </div>
          )}
        </div>
      </div>

      {solutionFormOpen && (
        <SolutionForm
          problemId={Number(id!)}
          leetcodeId={problem?.leetcode_id}
          existing={editingSolution}
          onSaved={() => loadSolutions()}
          onClose={() => setSolutionFormOpen(false)}
        />
      )}
    </div>
  )
}
