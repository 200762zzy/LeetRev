import { useEffect, useState, useRef } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { Loader2, X } from 'lucide-react'
import type { SolutionApproach, CodeLanguage, CreateSolutionApproachDTO, UpdateSolutionApproachDTO, CodeTemplate } from '../types'
import { LANGUAGES } from '../types'
import { CodeEditor } from './CodeEditor'

interface Props {
  problemId: number
  leetcodeId?: number | null
  existing?: SolutionApproach | null
  onSaved: (solution: SolutionApproach) => void
  onClose: () => void
}

export function SolutionForm({ problemId, leetcodeId, existing, onSaved, onClose }: Props) {
  const [title, setTitle] = useState(existing?.title ?? '')
  const [language, setLanguage] = useState<CodeLanguage>((existing?.language as CodeLanguage) ?? 'Python')
  const [code, setCode] = useState(existing?.code ?? '')
  const [description, setDescription] = useState(existing?.description ?? '')
  const [timeComplexity, setTimeComplexity] = useState(existing?.time_complexity ?? '')
  const [spaceComplexity, setSpaceComplexity] = useState(existing?.space_complexity ?? '')
  const [saving, setSaving] = useState(false)
  const [templates, setTemplates] = useState<CodeTemplate[]>([])
  const isExisting = useRef(!!existing)

  useEffect(() => {
    if (!leetcodeId) return
    invoke<CodeTemplate[]>('fetch_code_templates', { leetcodeId })
      .then(setTemplates)
      .catch(() => {})
  }, [leetcodeId])

  const handleLanguageChange = (newLang: CodeLanguage) => {
    setLanguage(newLang)
    if (isExisting.current) return
    const tpl = templates.find(t => t.lang === newLang)
    setCode(tpl?.code ?? '')
  }

  const handleSave = async () => {
    if (!title.trim()) return
    setSaving(true)
    try {
      if (existing) {
        const dto: UpdateSolutionApproachDTO = { title, description, language, code, time_complexity: timeComplexity, space_complexity: spaceComplexity }
        const result = await invoke<SolutionApproach>('update_solution_approach', { id: existing.id, data: dto })
        onSaved(result)
      } else {
        const dto: CreateSolutionApproachDTO = { problem_id: problemId, title, description, language, code, time_complexity: timeComplexity, space_complexity: spaceComplexity }
        const result = await invoke<SolutionApproach>('create_solution_approach', { data: dto })
        onSaved(result)
      }
      onClose()
    } catch (e) {
      alert(`保存失败: ${e}`)
    }
    setSaving(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end" onClick={onClose}>
      <div className="fixed inset-0 bg-black/30 backdrop-blur-sm transition-opacity" />
      <div className="relative flex h-full w-2/3 flex-col bg-white shadow-xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-3">
          <h2 className="text-sm font-semibold text-zinc-900">{existing ? '编辑解法' : '添加解法'}</h2>
          <button onClick={onClose} className="rounded-md p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-500">解法名称 *</label>
            <input className="input-field w-full" value={title} onChange={e => setTitle(e.target.value)} placeholder="例: 双指针, 动态规划" />
          </div>

          <div className="flex gap-4">
            <div className="flex-1">
              <label className="mb-1 block text-xs font-medium text-zinc-500">语言</label>
              <select className="input-field w-full" value={language} onChange={e => handleLanguageChange(e.target.value as CodeLanguage)}>
                {LANGUAGES.map(l => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
            <div className="flex-1">
              <label className="mb-1 block text-xs font-medium text-zinc-500">时间复杂度</label>
              <input className="input-field w-full" value={timeComplexity} onChange={e => setTimeComplexity(e.target.value)} placeholder="O(n)" />
            </div>
            <div className="flex-1">
              <label className="mb-1 block text-xs font-medium text-zinc-500">空间复杂度</label>
              <input className="input-field w-full" value={spaceComplexity} onChange={e => setSpaceComplexity(e.target.value)} placeholder="O(1)" />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-500">思路说明</label>
            <textarea className="input-field w-full resize-none" rows={4} value={description} onChange={e => setDescription(e.target.value)} placeholder="简述解题思路、注意事项..." />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-500">代码</label>
            <div className="overflow-hidden rounded-lg border border-zinc-200">
              <CodeEditor code={code} language={language} onChange={v => setCode(v ?? '')} editable />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-zinc-200 px-4 py-3">
          <button className="btn-secondary" onClick={onClose}>取消</button>
          <button className="btn-primary" onClick={handleSave} disabled={saving || !title.trim()}>
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {existing ? '保存' : '添加'}
          </button>
        </div>
      </div>
    </div>
  )
}