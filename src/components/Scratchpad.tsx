import { useEffect, useState, useRef, useCallback } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { X, FileText, Loader2, Type, Pen } from 'lucide-react'
import { CanvasDrawing } from './CanvasDrawing'

type ScratchpadMode = 'text' | 'drawing'

interface ScratchpadData {
  text: string
  drawing: string
}

interface Props {
  problemId: number | null
  onClose: () => void
}

function defaultData(): ScratchpadData {
  return { text: '', drawing: '' }
}

function parseData(raw: string): ScratchpadData {
  if (!raw) return defaultData()
  if (raw.startsWith('{')) {
    try {
      const parsed = JSON.parse(raw)
      return { text: parsed.text ?? '', drawing: parsed.drawing ?? '' }
    } catch {
      return defaultData()
    }
  }
  if (raw.startsWith('data:image')) {
    return { text: '', drawing: raw }
  }
  return { text: raw, drawing: '' }
}

export function Scratchpad({ problemId, onClose }: Props) {
  const [mode, setMode] = useState<ScratchpadMode>('text')
  const [textContent, setTextContent] = useState('')
  const [drawingContent, setDrawingContent] = useState('')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const loadedProblemRef = useRef<number | null>(null)
  const saveRef = useRef<(() => Promise<void>) | null>(null)
  const textRef = useRef(textContent)
  const drawingRef = useRef(drawingContent)

  useEffect(() => { textRef.current = textContent }, [textContent])
  useEffect(() => { drawingRef.current = drawingContent }, [drawingContent])

  const saveImmediately = useCallback(async () => {
    if (loadedProblemRef.current == null) return
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
    setSaving(true)
    try {
      const data = JSON.stringify({ text: textRef.current, drawing: drawingRef.current })
      await invoke('update_scratchpad', {
        problemId: loadedProblemRef.current,
        content: data,
      })
    } catch { /* ignore */ }
    setSaving(false)
  }, [])

  useEffect(() => {
    saveRef.current = saveImmediately
  })

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        saveRef.current?.()
        onClose()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  const loadScratchpad = useCallback(async (pid: number) => {
    setLoading(true)
    try {
      const raw = await invoke<string>('get_scratchpad', { problemId: pid })
      const data = parseData(raw)
      setTextContent(data.text)
      setDrawingContent(data.drawing)
      loadedProblemRef.current = pid
      if (data.drawing && !data.text) {
        setMode('drawing')
      } else {
        setMode('text')
      }
    } catch {
      setTextContent('')
      setDrawingContent('')
      setMode('text')
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    if (problemId && problemId !== loadedProblemRef.current) {
      saveRef.current?.()
      loadScratchpad(problemId)
    }
  }, [problemId, loadScratchpad])

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  const handleTextChange = (val: string) => {
    setTextContent(val)
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      saveRef.current?.()
    }, 800)
  }

  const handleDrawingChange = (dataUrl: string) => {
    setDrawingContent(dataUrl)
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      saveRef.current?.()
    }, 800)
  }

  const handleModeChange = (newMode: ScratchpadMode) => {
    if (newMode === mode) return
    setMode(newMode)
  }

  return (
    <div className="flex h-full flex-col bg-white">
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
            onClick={onClose}
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
              value={textContent}
              onChange={e => handleTextChange(e.target.value)}
              placeholder="在此写下草稿、思路、测试用例、伪代码..."
              className="h-full w-full resize-none border-0 bg-transparent text-sm text-zinc-900 outline-none placeholder:text-zinc-400 leading-relaxed"
            />
          </div>
        ) : (
          <CanvasDrawing
            key={problemId}
            value={drawingContent}
            onChange={handleDrawingChange}
          />
        )}
      </div>
    </div>
  )
}