import { useState, useEffect, useMemo, useCallback } from 'react'
import { Search, X, ChevronRight, ChevronDown, Copy, Check, ExternalLink, Plus, Pencil, Trash2 } from 'lucide-react'
import { invoke } from '@tauri-apps/api/core'
import type { ApiEntry, ApiLanguage, CustomApiEntry } from '../types'
import { apiData } from '../data/stl'
import { CustomApiForm } from './CustomApiForm'

interface Props {
  open: boolean
  onClose: () => void
  problemId?: number | null
}

const LANG_LABELS: Record<ApiLanguage, string> = {
  cpp: 'C++',
  java: 'Java',
  python: 'Python',
}

function parseJsonArr(raw: string): string[] {
  try { const v = JSON.parse(raw); return Array.isArray(v) ? v : [] } catch { return [] }
}
function parseExamples(raw: string): { title?: string; code: string }[] {
  try { const v = JSON.parse(raw); return Array.isArray(v) ? v : [] } catch { return [] }
}

function customToApiEntry(e: CustomApiEntry): ApiEntry {
  const sigs = parseJsonArr(e.signatures)
  const exs = parseExamples(e.examples)
  const seeAlso = parseJsonArr(e.see_also)
  return {
    id: `custom-${e.id}`,
    language: e.language,
    category: e.container,
    name: e.method_name,
    full_name: `${e.container}::${e.method_name}`,
    signature: sigs[0] ?? '',
    signatures: sigs,
    description: e.description || '',
    example: exs[0]?.code ?? '',
    examples: exs,
    returns: e.returns || undefined,
    complexity: e.complexity || undefined,
    notes: e.notes || undefined,
    leetcode_tips: e.leetcode_tips || undefined,
    see_also: seeAlso,
  }
}

export function ApiSearch({ open, onClose, problemId }: Props) {
  const [query, setQuery] = useState('')
  const [lang, setLang] = useState<ApiLanguage>('cpp')
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [customEntries, setCustomEntries] = useState<CustomApiEntry[]>([])
  const [formOpen, setFormOpen] = useState(false)
  const [editingEntry, setEditingEntry] = useState<CustomApiEntry | null>(null)

  const builtinData = useMemo(() => apiData, [])

  const loadCustom = useCallback(async () => {
    try {
      const entries = await invoke<CustomApiEntry[]>('get_custom_api_entries')
      setCustomEntries(entries)
    } catch { /* ignore */ }
  }, [])

  useEffect(() => {
    if (open) {
      setQuery('')
      setExpanded(new Set())
      setCopiedId(null)
      loadCustom()
    }
  }, [open, loadCustom])

  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose])

  const allData = useMemo(() => {
    const custom = customEntries.filter(e => e.language === lang).map(customToApiEntry)
    const builtin = builtinData.filter(e => e.language === lang)
    return [...builtin, ...custom]
  }, [customEntries, builtinData, lang])

  const filtered = useMemo(() => {
    let entries = allData
    if (query) {
      const q = query.toLowerCase()
      entries = entries.filter(e =>
        e.name.toLowerCase().includes(q) ||
        (e.full_name ?? e.name).toLowerCase().includes(q) ||
        e.category.toLowerCase().includes(q) ||
        e.description.toLowerCase().includes(q)
      )
    }
    const groups: Record<string, ApiEntry[]> = {}
    for (const entry of entries) {
      (groups[entry.category] ??= []).push(entry)
    }
    return groups
  }, [query, allData])

  const toggle = useCallback((id: string) => {
    setExpanded(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const copyCode = useCallback(async (id: string, code: string) => {
    try {
      await navigator.clipboard.writeText(code)
      setCopiedId(id)
      setTimeout(() => setCopiedId(null), 1500)
    } catch { /* ignore */ }
  }, [])

  const scrollToEntry = useCallback((targetId: string) => {
    setExpanded(prev => {
      const next = new Set(prev)
      next.add(targetId)
      return next
    })
    setTimeout(() => {
      const el = document.getElementById(`api-${targetId}`)
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }, 50)
  }, [])

  const getSignatures = (e: ApiEntry): string[] => e.signatures ?? [e.signature]
  const getExamples = (e: ApiEntry): { title?: string; code: string }[] => e.examples ?? [{ code: e.example ?? '' }]
  const exampleBody = (code: string) => {
    const lines = code.split('\n')
    const indent = lines.reduce((min, l) => {
      if (!l.trim()) return min
      const m = l.match(/^ */)
      return m ? Math.min(min, m[0].length) : min
    }, Infinity)
    if (indent === Infinity || indent === 0) return code
    return lines.map(l => l.slice(indent)).join('\n')
  }

  const isCustom = (id: string) => id.startsWith('custom-')
  const customId = (id: string) => parseInt(id.replace('custom-', ''), 10)

  const handleEdit = useCallback((e: CustomApiEntry) => {
    setEditingEntry(e)
    setFormOpen(true)
  }, [])

  const handleAdd = useCallback(() => {
    setEditingEntry(null)
    setFormOpen(true)
  }, [])

  const handleDelete = useCallback(async (id: string) => {
    try {
      await invoke('delete_custom_api', { id: customId(id) })
      await loadCustom()
      setExpanded(prev => { prev.delete(id); return new Set(prev) })
    } catch { /* ignore */ }
  }, [loadCustom])

  const handleSaved = useCallback(async () => {
    await loadCustom()
  }, [loadCustom])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-12" onClick={onClose}>
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-2xl rounded-xl border border-zinc-200 bg-white shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center gap-2 border-b border-zinc-100 px-4 py-3">
          <Search className="h-4 w-4 shrink-0 text-zinc-400" />
          <input
            autoFocus
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="搜索 API 名称、所属容器、描述..."
            className="flex-1 border-0 bg-transparent text-sm outline-none placeholder:text-zinc-400"
          />
          <div className="flex gap-1">
            {(['cpp', 'java', 'python'] as const).map(l => (
              <button
                key={l}
                onClick={() => { setLang(l); setExpanded(new Set()) }}
                className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                  lang === l
                    ? 'bg-primary-100 text-primary-700'
                    : 'text-zinc-500 hover:bg-zinc-100 hover:text-zinc-700'
                }`}
              >
                {LANG_LABELS[l]}
              </button>
            ))}
          </div>
          <button
            onClick={handleAdd}
            className="ml-1 rounded-md p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-primary-600"
            title="添加自定义 API"
          >
            <Plus className="h-4 w-4" />
          </button>
          <button onClick={onClose} className="ml-1 rounded-md p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="max-h-[60vh] overflow-y-auto p-4">
          {Object.keys(filtered).length === 0 ? (
            <p className="py-8 text-center text-sm text-zinc-400">
              {query ? '未匹配到任何 API' : '该语言暂无 API 数据'}
            </p>
          ) : (
            Object.entries(filtered).map(([category, entries]) => (
              <div key={category} className="mb-5 last:mb-0">
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-400">
                  {category}
                </h3>
                <div className="space-y-1">
                  {entries.map(entry => {
                    const isExpanded = expanded.has(entry.id)
                    const sigs = getSignatures(entry)
                    const exs = getExamples(entry)
                    const custom = isCustom(entry.id)
                    return (
                      <div key={entry.id} id={`api-${entry.id}`} className="rounded-lg border border-transparent transition-colors hover:border-zinc-200">
                        {/* Collapsed row */}
                        <button
                          onClick={() => toggle(entry.id)}
                          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left hover:bg-zinc-50"
                        >
                          {isExpanded ? (
                            <ChevronDown className="h-3.5 w-3.5 shrink-0 text-zinc-400" />
                          ) : (
                            <ChevronRight className="h-3.5 w-3.5 shrink-0 text-zinc-400" />
                          )}
                          {custom && (
                            <span className="rounded bg-amber-100 px-1 py-0.5 text-[10px] font-bold text-amber-700">自</span>
                          )}
                          <code className="text-sm font-medium text-zinc-800">{entry.name}</code>
                          <span className="truncate text-xs text-zinc-400">{sigs[0]}</span>
                        </button>

                        {/* Expanded detail */}
                        {isExpanded && (
                          <div className="mx-3 mb-2 rounded-lg border border-zinc-100 bg-zinc-50 p-3">
                            {/* Custom entry actions */}
                            {custom && (
                              <div className="mb-2 flex items-center gap-1.5">
                                <button
                                  onClick={() => handleEdit(customEntries.find(c => `custom-${c.id}` === entry.id)!)}
                                  className="flex items-center gap-1 rounded px-1.5 py-0.5 text-xs text-zinc-500 hover:bg-zinc-200 hover:text-zinc-700"
                                >
                                  <Pencil className="h-3 w-3" /> 编辑
                                </button>
                                <button
                                  onClick={() => handleDelete(entry.id)}
                                  className="flex items-center gap-1 rounded px-1.5 py-0.5 text-xs text-red-500 hover:bg-red-100"
                                >
                                  <Trash2 className="h-3 w-3" /> 删除
                                </button>
                              </div>
                            )}

                            <p className="mb-3 text-sm text-zinc-700">{entry.description}</p>

                            {/* Signatures */}
                            {sigs.length > 0 && sigs[0] && (
                              <div className="mb-3">
                                <span className="text-xs font-medium text-zinc-500">签名</span>
                                <div className="mt-1 space-y-1">
                                  {sigs.map((s, i) => (
                                    <pre key={i} className="overflow-x-auto rounded bg-zinc-100 px-2.5 py-1.5 text-xs text-zinc-700 font-mono">{s}</pre>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Returns */}
                            {entry.returns && (
                              <div className="mb-3 text-xs">
                                <span className="text-zinc-400">返回值: </span>
                                <span className="font-medium text-zinc-700">{entry.returns}</span>
                              </div>
                            )}

                            {/* Examples */}
                            {exs.length > 0 && exs[0].code && (
                              <div className="mb-3">
                                <div className="mb-1.5 flex items-center justify-between">
                                  <span className="text-xs font-medium text-zinc-500">
                                    示例{exs.length > 1 ? ` (${exs.length}个)` : ''}
                                  </span>
                                </div>
                                <div className="space-y-2">
                                  {exs.map((ex, i) => (
                                    <div key={i}>
                                      {ex.title && (
                                        <div className="mb-1 flex items-center justify-between">
                                          <span className="text-xs text-zinc-400">{ex.title}</span>
                                          <button
                                            onClick={() => copyCode(entry.id + '-' + i, ex.code)}
                                            className="flex items-center gap-1 rounded px-1.5 py-0.5 text-xs text-zinc-500 hover:bg-zinc-200 hover:text-zinc-700"
                                          >
                                            {copiedId === entry.id + '-' + i ? (
                                              <><Check className="h-3 w-3 text-emerald-500" /> 已复制</>
                                            ) : (
                                              <><Copy className="h-3 w-3" /> 复制</>
                                            )}
                                          </button>
                                        </div>
                                      )}
                                      <pre className="overflow-x-auto rounded-md bg-zinc-900 p-3 text-xs text-zinc-100"><code>{exampleBody(ex.code)}</code></pre>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Complexity */}
                            {entry.complexity && (
                              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
                                <span>
                                  <span className="text-zinc-400">复杂度: </span>
                                  <span className="font-medium text-zinc-700">{entry.complexity}</span>
                                </span>
                              </div>
                            )}

                            {/* Notes */}
                            {entry.notes && (
                              <p className="mt-1.5 text-xs leading-relaxed text-amber-700">
                                ⚠ {entry.notes}
                              </p>
                            )}

                            {/* LeetCode Tips */}
                            {entry.leetcode_tips && (
                              <div className="mt-2 rounded-md bg-sky-50 border border-sky-200 px-2.5 py-2">
                                <p className="text-xs font-medium text-sky-700 mb-0.5">LeetCode 技巧</p>
                                <p className="text-xs text-sky-600 leading-relaxed">{entry.leetcode_tips}</p>
                              </div>
                            )}

                            {/* See Also */}
                            {entry.see_also && entry.see_also.length > 0 && (
                              <div className="mt-2 flex flex-wrap gap-1.5">
                                <span className="text-xs text-zinc-400">相关:</span>
                                {entry.see_also.map(refId => {
                                  const ref = allData.find(d => d.id === refId)
                                  if (!ref) return null
                                  return (
                                    <button
                                      key={refId}
                                      onClick={() => scrollToEntry(refId)}
                                      className="inline-flex items-center gap-0.5 rounded bg-zinc-200/70 px-1.5 py-0.5 text-xs text-zinc-600 hover:bg-zinc-200"
                                    >
                                      <ExternalLink className="h-2.5 w-2.5" />
                                      {ref.name}
                                    </button>
                                  )
                                })}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <CustomApiForm
        open={formOpen}
        onClose={() => { setFormOpen(false); setEditingEntry(null) }}
        entry={editingEntry}
        defaultLanguage={lang}
        defaultProblemId={problemId ?? null}
        onSaved={handleSaved}
      />
    </div>
  )
}
