import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { invoke } from '@tauri-apps/api/core'
import { ArrowLeft, Loader2, Sparkles } from 'lucide-react'
import type { Problem, Tag, CreateProblemDTO, Difficulty, FetchedProblemInfo } from '../types'
import { DEFAULT_TAGS, DIFFICULTIES } from '../lib/utils'

export function ProblemForm() {
  const navigate = useNavigate()
  const { id } = useParams()
  const isEdit = Boolean(id)

  const [loading, setLoading] = useState(isEdit)
  const [saving, setSaving] = useState(false)
  const [fetching, setFetching] = useState(false)
  const [allTags, setAllTags] = useState<Tag[]>([])
  const [fetchedContent, setFetchedContent] = useState<string | null>(null)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [form, setForm] = useState({
    leetcode_id: '',
    title: '',
    title_cn: '',
    difficulty: 'easy' as Difficulty,
    leetcode_url: '',
    notes: '',
    tag_ids: [] as number[],
  })

  useEffect(() => {
    invoke<Tag[]>('get_tags').then(setAllTags).catch(() => {
      setAllTags(DEFAULT_TAGS.map((name, i) => ({ id: i + 1, name, color: '#6366f1' })))
    })
    if (isEdit && id) {
      invoke<Problem>('get_problem', { id: Number(id) })
        .then((p) => {
          setForm({
            leetcode_id: p.leetcode_id?.toString() ?? '',
            title: p.title,
            title_cn: p.title_cn ?? '',
            difficulty: p.difficulty,
            leetcode_url: p.leetcode_url ?? '',
            notes: p.notes ?? '',
            tag_ids: p.tags.map((t) => t.id),
          })
        })
        .catch(console.error)
        .finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [isEdit, id])

  const toggleTag = (tagId: number) => {
    setForm((f) => ({
      ...f,
      tag_ids: f.tag_ids.includes(tagId)
        ? f.tag_ids.filter((id) => id !== tagId)
        : [...f.tag_ids, tagId],
    }))
  }

  const handleFetch = async () => {
    const num = Number(form.leetcode_id)
    if (!num || num <= 0) {
      setFetchError('请输入有效的题号')
      return
    }
    setFetching(true)
    setFetchError(null)
    setFetchedContent(null)
    try {
      const info = await invoke<FetchedProblemInfo>('fetch_problem_info', {
        leetcodeId: num,
      })
      const matchedTagIds = allTags
        .filter((t) => info.tags.includes(t.name))
        .map((t) => t.id)
      setForm((f) => ({
        ...f,
        title: info.title,
        title_cn: info.title_cn,
        difficulty: info.difficulty,
        leetcode_url: info.url,
        tag_ids: matchedTagIds,
      }))
      setFetchedContent(info.content)
    } catch (e) {
      setFetchError(String(e))
    }
    setFetching(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const data: CreateProblemDTO = {
        leetcode_id: form.leetcode_id ? Number(form.leetcode_id) : null,
        title: form.title,
        title_cn: form.title_cn || null,
        difficulty: form.difficulty,
        leetcode_url: form.leetcode_url || null,
        notes: form.notes || null,
        tag_ids: form.tag_ids,
      }

      if (isEdit && id) {
        await invoke('update_problem', { id: Number(id), data })
      } else {
        await invoke('create_problem', { data })
      }
      navigate('/problems')
    } catch (e) {
      console.error(e)
      alert('保存失败，请检查输入')
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

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center gap-4">
        <button className="btn-ghost p-1.5" onClick={() => navigate('/problems')}>
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">
            {isEdit ? '编辑题目' : '新增题目'}
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            {isEdit ? '修改题目信息' : '添加一道力扣题目到你的题库'}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="card space-y-5">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-500">基本信息</h2>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-zinc-700">题号</label>
              <div className="flex gap-2">
                <input
                  className="input-field flex-1"
                  placeholder="例如: 1"
                  value={form.leetcode_id}
                  onChange={(e) => setForm((f) => ({ ...f, leetcode_id: e.target.value }))}
                  disabled={fetching}
                />
                <button
                  type="button"
                  className="btn-primary whitespace-nowrap"
                  onClick={handleFetch}
                  disabled={fetching}
                >
                  {fetching ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="h-4 w-4" />
                  )}
                  自动抓取
                </button>
              </div>
              {fetchError && (
                <p className="mt-1 text-sm text-red-500">{fetchError}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-zinc-700">难度</label>
              <select
                className="input-field"
                value={form.difficulty}
                onChange={(e) => setForm((f) => ({ ...f, difficulty: e.target.value as Difficulty }))}
              >
                {DIFFICULTIES.map((d) => (
                  <option key={d.value} value={d.value}>{d.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-zinc-700">标题 <span className="text-red-500">*</span></label>
            <input
              className="input-field"
              placeholder="Two Sum"
              required
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-zinc-700">中文标题</label>
            <input
              className="input-field"
              placeholder="两数之和"
              value={form.title_cn}
              onChange={(e) => setForm((f) => ({ ...f, title_cn: e.target.value }))}
            />
          </div>
        </div>

        <div className="card space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-500">标签</h2>
          <div className="flex flex-wrap gap-2">
            {allTags.map((tag) => (
              <button
                key={tag.id}
                type="button"
                onClick={() => toggleTag(tag.id)}
                className={`inline-flex items-center rounded-full border px-3 py-1 text-sm font-medium transition-colors ${
                  form.tag_ids.includes(tag.id)
                    ? 'border-primary-300 bg-primary-50 text-primary-700'
                    : 'border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300 hover:bg-zinc-50'
                }`}
              >
                {tag.name}
              </button>
            ))}
          </div>
        </div>

        {fetchedContent && (
          <div className="card space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-500">题目描述</h2>
            <div
              className="prose prose-sm max-w-none text-zinc-700 [&_pre]:rounded-lg [&_pre]:bg-zinc-100 [&_pre]:p-3 [&_code]:text-sm [&_img]:hidden"
              dangerouslySetInnerHTML={{ __html: fetchedContent }}
            />
          </div>
        )}

        <div className="card space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-500">笔记</h2>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-zinc-700">力扣链接</label>
            <input
              className="input-field"
              placeholder="https://leetcode.cn/problems/two-sum/"
              value={form.leetcode_url}
              onChange={(e) => setForm((f) => ({ ...f, leetcode_url: e.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-zinc-700">解题思路</label>
            <textarea
              className="input-field min-h-[120px] resize-y py-2"
              placeholder="记录你的解题思路、注意事项..."
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            className="btn-secondary"
            onClick={() => navigate('/problems')}
          >
            取消
          </button>
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {isEdit ? '保存修改' : '添加题目'}
          </button>
        </div>
      </form>
    </div>
  )
}
