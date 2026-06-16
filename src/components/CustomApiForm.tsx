import { useState, useCallback, useEffect } from 'react'
import { X, Plus, Trash2, AlertCircle } from 'lucide-react'
import { invoke } from '@tauri-apps/api/core'
import type { ApiLanguage, ApiExample, CustomApiEntry, CreateCustomApiDTO, UpdateCustomApiDTO } from '../types'

interface Props {
  open: boolean
  onClose: () => void
  entry?: CustomApiEntry | null
  defaultLanguage?: ApiLanguage
  defaultContainer?: string
  defaultProblemId?: number | null
  onSaved: () => void
}

const LANG_OPTIONS: { value: ApiLanguage; label: string }[] = [
  { value: 'cpp', label: 'C++' },
  { value: 'java', label: 'Java' },
  { value: 'python', label: 'Python' },
]

interface FormState {
  container: string
  method_name: string
  language: ApiLanguage
  signatures: string[]
  description: string
  examples: ApiExample[]
  returns: string
  complexity: string
  notes: string
  leetcode_tips: string
  see_also: string[]
  problem_id: number | null
}

function emptyForm(): FormState {
  return {
    container: '',
    method_name: '',
    language: 'cpp',
    signatures: [''],
    description: '',
    examples: [{ title: '', code: '' }],
    returns: '',
    complexity: '',
    notes: '',
    leetcode_tips: '',
    see_also: [''],
    problem_id: null,
  }
}

function parseArr(raw: string): string[] {
  try { const v = JSON.parse(raw); return Array.isArray(v) ? v : [] } catch { return [] }
}
function parseExs(raw: string): { title?: string; code: string }[] {
  try { const v = JSON.parse(raw); return Array.isArray(v) ? v : [] } catch { return [] }
}

function entryToForm(e: CustomApiEntry): FormState {
  const sigs = parseArr(e.signatures)
  const exs = parseExs(e.examples)
  const seeAlso = parseArr(e.see_also)
  return {
    container: e.container,
    method_name: e.method_name,
    language: e.language,
    signatures: sigs.length > 0 ? sigs : [''],
    description: e.description,
    examples: exs.length > 0 ? exs.map(x => ({ ...x })) : [{ title: '', code: '' }],
    returns: e.returns,
    complexity: e.complexity,
    notes: e.notes,
    leetcode_tips: e.leetcode_tips,
    see_also: seeAlso.length > 0 ? seeAlso : [''],
    problem_id: e.problem_id,
  }
}

export function CustomApiForm({ open, onClose, entry, defaultLanguage, defaultContainer, defaultProblemId, onSaved }: Props) {
  const [form, setForm] = useState<FormState>(emptyForm)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    if (entry) {
      setForm(entryToForm(entry))
    } else {
      const f = emptyForm()
      if (defaultLanguage) f.language = defaultLanguage
      if (defaultContainer) f.container = defaultContainer
      if (defaultProblemId !== undefined) f.problem_id = defaultProblemId
      setForm(f)
    }
    setError(null)
  }, [open, entry, defaultLanguage, defaultContainer, defaultProblemId])

  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose])

  const update = useCallback(<K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm(prev => ({ ...prev, [key]: value }))
  }, [])

  const updateArr = useCallback(<K extends 'signatures' | 'see_also'>(key: K, idx: number, value: string) => {
    setForm(prev => {
      const arr = [...prev[key]]
      arr[idx] = value
      return { ...prev, [key]: arr }
    })
  }, [])

  const addArr = useCallback(<K extends 'signatures' | 'see_also'>(key: K) => {
    setForm(prev => ({ ...prev, [key]: [...prev[key], ''] }))
  }, [])

  const removeArr = useCallback(<K extends 'signatures' | 'see_also'>(key: K, idx: number) => {
    setForm(prev => {
      const arr = prev[key].filter((_, i) => i !== idx)
      return { ...prev, [key]: arr.length === 0 ? [''] : arr }
    })
  }, [])

  const updateExample = useCallback((idx: number, field: 'title' | 'code', value: string) => {
    setForm(prev => {
      const examples = prev.examples.map((ex, i) => i === idx ? { ...ex, [field]: value } : ex)
      return { ...prev, examples }
    })
  }, [])

  const addExample = useCallback(() => {
    setForm(prev => ({ ...prev, examples: [...prev.examples, { title: '', code: '' }] }))
  }, [])

  const removeExample = useCallback((idx: number) => {
    setForm(prev => {
      const examples = prev.examples.filter((_, i) => i !== idx)
      return { ...prev, examples: examples.length === 0 ? [{ title: '', code: '' }] : examples }
    })
  }, [])

  const handleSubmit = useCallback(async () => {
    try {
      setSaving(true)
      setError(null)

      const sigs = form.signatures.map(s => s.trim()).filter(Boolean)
      const exs = form.examples.filter(ex => ex.code.trim())
      const seeAlso = form.see_also.map(s => s.trim()).filter(Boolean)

      if (!form.container.trim()) { setError('容器名不能为空'); return }
      if (!form.method_name.trim()) { setError('方法名不能为空'); return }

      const sigsJson = sigs.length > 0 ? sigs : undefined
      const exsJson = exs.length > 0 ? exs : undefined
      const seeAlsoJson = seeAlso.length > 0 ? seeAlso : undefined

      if (entry) {
        const dto: UpdateCustomApiDTO = {
          container: form.container.trim() || undefined,
          method_name: form.method_name.trim() || undefined,
          language: form.language,
          signatures: sigsJson ? JSON.stringify(sigsJson) : undefined,
          description: form.description.trim() || undefined,
          examples: exsJson ? JSON.stringify(exsJson) : undefined,
          returns: form.returns.trim() || undefined,
          complexity: form.complexity.trim() || undefined,
          notes: form.notes.trim() || undefined,
          leetcode_tips: form.leetcode_tips.trim() || undefined,
          see_also: seeAlsoJson ? JSON.stringify(seeAlsoJson) : undefined,
          problem_id: form.problem_id ?? undefined,
        }
        await invoke('update_custom_api', { id: entry.id, data: dto })
      } else {
        const dto: CreateCustomApiDTO = {
          container: form.container.trim(),
          method_name: form.method_name.trim(),
          language: form.language,
          signatures: sigsJson ? JSON.stringify(sigsJson) : undefined,
          description: form.description.trim() || undefined,
          examples: exsJson ? JSON.stringify(exsJson) : undefined,
          returns: form.returns.trim() || undefined,
          complexity: form.complexity.trim() || undefined,
          notes: form.notes.trim() || undefined,
          leetcode_tips: form.leetcode_tips.trim() || undefined,
          see_also: seeAlsoJson ? JSON.stringify(seeAlsoJson) : undefined,
          problem_id: form.problem_id ?? undefined,
        }
        await invoke('create_custom_api', { data: dto })
      }
      onSaved()
      onClose()
    } catch (err) {
      setError(String(err))
    } finally {
      setSaving(false)
    }
  }, [form, entry, onSaved, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-12" onClick={onClose}>
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-lg rounded-xl border border-zinc-200 bg-white shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-zinc-100 px-4 py-3">
          <h2 className="text-sm font-semibold text-zinc-800">
            {entry ? '编辑 API 条目' : '添加自定义 API'}
          </h2>
          <button onClick={onClose} className="rounded-md p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="max-h-[65vh] overflow-y-auto p-4 space-y-4">
          {/* Language */}
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-500">语言</label>
            <div className="flex gap-2">
              {LANG_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => update('language', opt.value)}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                    form.language === opt.value
                      ? 'bg-primary-100 text-primary-700'
                      : 'text-zinc-500 hover:bg-zinc-100'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Container */}
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-500">
              容器 <span className="text-red-400">*</span>
            </label>
            <input
              value={form.container}
              onChange={e => update('container', e.target.value)}
              placeholder="例如: vector, unordered_map"
              className="w-full rounded-md border border-zinc-200 px-3 py-1.5 text-sm outline-none focus:border-primary-400"
            />
          </div>

          {/* Method Name */}
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-500">
              方法名 <span className="text-red-400">*</span>
            </label>
            <input
              value={form.method_name}
              onChange={e => update('method_name', e.target.value)}
              placeholder="例如: push_back, find"
              className="w-full rounded-md border border-zinc-200 px-3 py-1.5 text-sm outline-none focus:border-primary-400"
            />
          </div>

          {/* Signatures */}
          <div>
            <div className="mb-1 flex items-center justify-between">
              <span className="text-xs font-medium text-zinc-500">签名</span>
              <button type="button" onClick={() => addArr('signatures')} className="text-xs text-primary-600 hover:text-primary-700">
                <Plus className="inline h-3 w-3" /> 添加
              </button>
            </div>
            <div className="space-y-1.5">
              {form.signatures.map((s, i) => (
                <div key={i} className="flex gap-1">
                  <input
                    value={s}
                    onChange={e => updateArr('signatures', i, e.target.value)}
                    placeholder={i === 0 ? 'void push_back(const T& val)' : ''}
                    className="flex-1 rounded-md border border-zinc-200 px-3 py-1.5 text-xs font-mono outline-none focus:border-primary-400"
                  />
                  <button type="button" onClick={() => removeArr('signatures', i)} className="p-1 text-zinc-400 hover:text-red-500">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-500">描述</label>
            <textarea
              value={form.description}
              onChange={e => update('description', e.target.value)}
              rows={3}
              className="w-full resize-none rounded-md border border-zinc-200 px-3 py-1.5 text-sm outline-none focus:border-primary-400"
            />
          </div>

          {/* Returns */}
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-500">返回值</label>
            <input
              value={form.returns}
              onChange={e => update('returns', e.target.value)}
              placeholder="例如: bool, iterator"
              className="w-full rounded-md border border-zinc-200 px-3 py-1.5 text-sm outline-none focus:border-primary-400"
            />
          </div>

          {/* Complexity */}
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-500">复杂度</label>
            <input
              value={form.complexity}
              onChange={e => update('complexity', e.target.value)}
              placeholder="例如: O(1), O(log n)"
              className="w-full rounded-md border border-zinc-200 px-3 py-1.5 text-sm outline-none focus:border-primary-400"
            />
          </div>

          {/* Examples */}
          <div>
            <div className="mb-1 flex items-center justify-between">
              <span className="text-xs font-medium text-zinc-500">示例</span>
              <button type="button" onClick={addExample} className="text-xs text-primary-600 hover:text-primary-700">
                <Plus className="inline h-3 w-3" /> 添加
              </button>
            </div>
            <div className="space-y-3">
              {form.examples.map((ex, i) => (
                <div key={i} className="rounded-md border border-zinc-200 p-2">
                  <div className="mb-1.5 flex items-center justify-between">
                    <input
                      value={ex.title ?? ''}
                      onChange={e => updateExample(i, 'title', e.target.value)}
                      placeholder="标题 (可选)"
                      className="flex-1 border-0 bg-transparent text-xs font-medium text-zinc-600 outline-none placeholder:text-zinc-400"
                    />
                    <button type="button" onClick={() => removeExample(i)} className="p-0.5 text-zinc-400 hover:text-red-500">
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                  <textarea
                    value={ex.code}
                    onChange={e => updateExample(i, 'code', e.target.value)}
                    rows={4}
                    placeholder="// 代码"
                    className="w-full resize-none rounded bg-zinc-900 px-2.5 py-2 text-xs text-zinc-100 font-mono outline-none"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-500">注意事项</label>
            <textarea
              value={form.notes}
              onChange={e => update('notes', e.target.value)}
              rows={2}
              className="w-full resize-none rounded-md border border-zinc-200 px-3 py-1.5 text-sm outline-none focus:border-primary-400"
            />
          </div>

          {/* LeetCode Tips */}
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-500">LeetCode 技巧</label>
            <textarea
              value={form.leetcode_tips}
              onChange={e => update('leetcode_tips', e.target.value)}
              rows={2}
              className="w-full resize-none rounded-md border border-zinc-200 px-3 py-1.5 text-sm outline-none focus:border-primary-400"
            />
          </div>

          {/* See Also */}
          <div>
            <div className="mb-1 flex items-center justify-between">
              <span className="text-xs font-medium text-zinc-500">相关 API ID</span>
              <button type="button" onClick={() => addArr('see_also')} className="text-xs text-primary-600 hover:text-primary-700">
                <Plus className="inline h-3 w-3" /> 添加
              </button>
            </div>
            <div className="space-y-1.5">
              {form.see_also.map((s, i) => (
                <div key={i} className="flex gap-1">
                  <input
                    value={s}
                    onChange={e => updateArr('see_also', i, e.target.value)}
                    placeholder="API ID (例如: cpp-vector-push_back)"
                    className="flex-1 rounded-md border border-zinc-200 px-3 py-1.5 text-xs outline-none focus:border-primary-400"
                  />
                  <button type="button" onClick={() => removeArr('see_also', i)} className="p-1 text-zinc-400 hover:text-red-500">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-center gap-1.5 rounded-md bg-red-50 px-3 py-2 text-xs text-red-600">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 border-t border-zinc-100 px-4 py-3">
          <button onClick={onClose} className="rounded-md px-3 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-100" disabled={saving}>
            取消
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="rounded-md bg-primary-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-primary-700 disabled:opacity-50"
          >
            {saving ? '保存中...' : entry ? '更新' : '添加'}
          </button>
        </div>
      </div>
    </div>
  )
}
