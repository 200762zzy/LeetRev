import { useEffect, useState, useRef, useCallback } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { X, FileText, Loader2, Type, Pen } from 'lucide-react'
import { CanvasDrawing } from './CanvasDrawing'

type ScratchpadMode = 'text' | 'drawing'

interface Props {
  open: boolean
  onClose: () => void
  problemId: number | null
}

export function Scratchpad({ open, onClose, problemId }: Props) {
  const [mode, setMode] = useState<ScratchpadMode>('text')
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const loadedProblemRef = useRef<number | null>(null)
  const saveRef = useRef<(() => Promise<void>) | null>(null)

  const saveImmediately = useCallback(async () => {
    if (loadedProblemRef.current == null) return
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
    setSaving(true)
    try {
      await invoke('update_scratchpad', {
        problemId: loadedProblemRef.current,
        content,
      })
    } catch { /* ignore */ }
    setSaving(false)
  }, [content])

  useEffect(() => {
    saveRef.current = saveImmediately
  })

  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        saveRef.current?.()
        onClose()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose])

  const loadScratchpad = useCallback(async (pid: number) => {
    setLoading(true)
    try {
      const text = await invoke<string>('get_scratchpad', { problemId: pid })
      setContent(text)
      loadedProblemRef.current = pid
      // Restore last used mode: if content is a data URL, switch to drawing mode
      if (text.startsWith('data:image')) {
        setMode('drawing')
      } else {
        setMode('text')
      }
    } catch {
      setContent('')
      setMode('text')
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    if (open && problemId && problemId !== loadedProblemRef.current) {
      saveRef.current?.()
      loadScratchpad(problemId)
    }
    if (!open) {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [open, problemId, loadScratchpad])

  const handleTextChange = (val: string) => {
    setContent(val)
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      saveRef.current?.()
    }, 800)
  }

  const handleDrawingChange = (dataUrl: string) => {
    setContent(dataUrl)
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      saveRef.current?.()
    }, 800)
  }

  const handleModeChange = (newMode: ScratchpadMode) => {
    saveRef.current?.()
    setMode(newMode)
  }

  const handleClose = () => {
    saveRef.current?.()
    onClose()
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex justify-end" onClick={handleClose}>
      <div className="fixed inset-0 bg-black/30 backdrop-blur-sm transition-opacity" />
      <div
        className="relative flex h-full w-2/3 flex-col bg-white shadow-xl transition-all"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-3">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-zinc-400" />
            <span className="text-sm font-semibold text-zinc-900">草稿板</span>
          </div>
          <div className="flex items-center gap-1">
            {saving && (
              <span className="flex items-center gap-1 text-xs text-zinc-400">
                <Loader2 className="h-3 w-3 animate-spin" /> 保存中
              </span>
            )}
            <button
              onClick={handleClose}
              className="rounded-md p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Mode tabs */}
        <div className="flex gap-1 border-b border-zinc-100 px-4 py-2">
          <button
            onClick={() => handleModeChange('text')}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              mode === 'text'
                ? 'bg-primary-100 text-primary-700'
                : 'text-zinc-500 hover:bg-zinc-100 hover:text-zinc-700'
            }`}
          >
            <Type className="h-3.5 w-3.5" />
            文本
          </button>
          <button
            onClick={() => handleModeChange('drawing')}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              mode === 'drawing'
                ? 'bg-primary-100 text-primary-700'
                : 'text-zinc-500 hover:bg-zinc-100 hover:text-zinc-700'
            }`}
          >
            <Pen className="h-3.5 w-3.5" />
            画板
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-hidden">
          {loading ? (
            <div className="flex h-full items-center justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-zinc-400" />
            </div>
          ) : mode === 'text' ? (
            <div className="h-full p-4">
              <textarea
                autoFocus
                value={content.startsWith('data:image') ? '' : content}
                onChange={e => handleTextChange(e.target.value)}
                placeholder="在此写下草稿、思路、测试用例、伪代码..."
                className="h-full w-full resize-none border-0 bg-transparent text-sm text-zinc-900 outline-none placeholder:text-zinc-400 leading-relaxed"
              />
              {content.startsWith('data:image') && (
                <p className="absolute bottom-4 left-4 right-4 text-xs text-zinc-400 bg-zinc-50 rounded px-2 py-1">
                  当前内容为画板数据，切换至画板模式查看
                </p>
              )}
            </div>
          ) : (
            <CanvasDrawing
              key={problemId}
              value={content}
              onChange={handleDrawingChange}
            />
          )}
        </div>
      </div>
    </div>
  )
}
