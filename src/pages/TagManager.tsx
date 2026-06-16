import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { invoke } from '@tauri-apps/api/core'
import { Plus, Trash2, Pencil, Check, X, Loader2, BookOpen } from 'lucide-react'
import type { Tag } from '../types'

export function TagManager() {
  const navigate = useNavigate()
  const [tags, setTags] = useState<Tag[]>([])
  const [loading, setLoading] = useState(true)
  const [newName, setNewName] = useState('')
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editName, setEditName] = useState('')

  const load = () => {
    setLoading(true)
    invoke<Tag[]>('get_tags').then(setTags).catch(console.error).finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const handleCreate = async () => {
    const name = newName.trim()
    if (!name) return
    try {
      await invoke('create_tag', { name })
      setNewName('')
      load()
    } catch (e) { console.error(e) }
  }

  const handleUpdate = async (id: number) => {
    const name = editName.trim()
    if (!name) return
    try {
      await invoke('update_tag', { id, name })
      setEditingId(null)
      load()
    } catch (e) { console.error(e) }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('确定删除此标签？')) return
    try {
      await invoke('delete_tag', { id })
      load()
    } catch (e) { console.error(e) }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-primary-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">标签管理</h1>
        <p className="mt-1 text-sm text-zinc-500">管理题目标签，删除标签会自动解除所有关联</p>
      </div>

      <div className="card">
        <div className="flex items-center gap-3">
          <input
            className="input-field flex-1"
            placeholder="新标签名称..."
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
          />
          <button className="btn-primary whitespace-nowrap" onClick={handleCreate} disabled={!newName.trim()}>
            <Plus className="h-4 w-4" />
            新增
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
        <table className="w-full">
          <thead>
            <tr className="border-b border-zinc-100 bg-zinc-50/50">
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500">名称</th>
              <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-zinc-500">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {tags.length === 0 ? (
              <tr>
                <td colSpan={2} className="px-4 py-12 text-center text-sm text-zinc-400">暂无标签</td>
              </tr>
            ) : (
              tags.map((tag) => (
                <tr key={tag.id} className="transition-colors hover:bg-zinc-50/50">
                  <td className="px-4 py-3">
                    {editingId === tag.id ? (
                      <div className="flex items-center gap-2">
                        <input
                          className="input-field h-8 text-sm"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleUpdate(tag.id)}
                          autoFocus
                        />
                        <button className="btn-ghost p-1 text-emerald-600" onClick={() => handleUpdate(tag.id)}>
                          <Check className="h-4 w-4" />
                        </button>
                        <button className="btn-ghost p-1 text-zinc-400" onClick={() => setEditingId(null)}>
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center rounded-full bg-zinc-100 px-2.5 py-1 text-sm font-medium text-zinc-700">
                          {tag.name}
                        </span>
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        className="btn-ghost p-1.5"
                        onClick={() => { setEditingId(tag.id); setEditName(tag.name) }}
                        title="编辑"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        className="btn-ghost p-1.5 text-primary-600 hover:bg-primary-50 hover:text-primary-700"
                        onClick={() => navigate(`/review?tagId=${tag.id}`)}
                        title="复习此标签"
                      >
                        <BookOpen className="h-4 w-4" />
                      </button>
                      <button
                        className="btn-ghost p-1.5 text-red-500 hover:bg-red-50 hover:text-red-600"
                        onClick={() => handleDelete(tag.id)}
                        title="删除"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
