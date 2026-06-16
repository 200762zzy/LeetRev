import { useEffect, useRef, useState, useCallback } from 'react'

type DrawTool = 'pen' | 'eraser' | 'rect' | 'ellipse' | 'line'

const PRESET_COLORS = [
  '#1e293b', '#ef4444', '#f97316', '#eab308',
  '#22c55e', '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899',
]

const STROKE_WIDTHS = [1, 3, 5, 8] as const
const ERASER_SIZES = [10, 20, 40] as const

interface Props {
  value: string
  onChange: (dataUrl: string) => void
}

export function CanvasDrawing({ value, onChange }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [tool, setTool] = useState<DrawTool>('pen')
  const [color, setColor] = useState('#1e293b')
  const [strokeWidth, setStrokeWidth] = useState(3)
  const [eraserSize, setEraserSize] = useState(20)
  const [undoCount, setUndoCount] = useState(0)
  const [redoCount, setRedoCount] = useState(0)
  const isDrawing = useRef(false)
  const lastPoint = useRef<{ x: number; y: number } | null>(null)
  const startPoint = useRef<{ x: number; y: number } | null>(null)
  const undoStack = useRef<ImageData[]>([])
  const redoStack = useRef<ImageData[]>([])

  const getCtx = useCallback(() => {
    return canvasRef.current?.getContext('2d') ?? null
  }, [])

  const getPos = useCallback((e: { clientX: number; clientY: number }) => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    const rect = canvas.getBoundingClientRect()
    return { x: e.clientX - rect.left, y: e.clientY - rect.top }
  }, [])

  const saveSnapshot = useCallback(() => {
    const ctx = getCtx()
    const canvas = canvasRef.current
    if (!ctx || !canvas) return
    const snap = ctx.getImageData(0, 0, canvas.width, canvas.height)
    undoStack.current.push(snap)
    if (undoStack.current.length > 30) undoStack.current.shift()
    redoStack.current = []
    setUndoCount(undoStack.current.length)
    setRedoCount(0)
  }, [getCtx])

  const strokeOpts = useCallback((t: DrawTool) => {
    const ctx = getCtx()
    if (!ctx) return
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    if (t === 'eraser') {
      ctx.strokeStyle = '#ffffff'
      ctx.lineWidth = eraserSize
    } else {
      ctx.strokeStyle = color
      ctx.lineWidth = strokeWidth
    }
  }, [getCtx, color, strokeWidth, eraserSize])

  const drawLine = useCallback((from: { x: number; y: number }, to: { x: number; y: number }) => {
    const ctx = getCtx()
    if (!ctx) return
    ctx.beginPath()
    ctx.moveTo(from.x, from.y)
    ctx.lineTo(to.x, to.y)
    ctx.stroke()
  }, [getCtx])

  const startDraw = useCallback((pos: { x: number; y: number }) => {
    saveSnapshot()
    isDrawing.current = true
    lastPoint.current = pos
    startPoint.current = pos
  }, [saveSnapshot])

  const moveDraw = useCallback((pos: { x: number; y: number }) => {
    if (!isDrawing.current) return
    const ctx = getCtx()
    if (!ctx) return

    if (tool === 'pen') {
      strokeOpts('pen')
      drawLine(lastPoint.current!, pos)
      lastPoint.current = pos
    } else if (tool === 'eraser') {
      ctx.clearRect(pos.x - eraserSize / 2, pos.y - eraserSize / 2, eraserSize, eraserSize)
      lastPoint.current = pos
    } else {
      const lastSnap = undoStack.current[undoStack.current.length - 1]
      if (lastSnap) ctx.putImageData(lastSnap, 0, 0)
      strokeOpts(tool)
      const s = startPoint.current!
      ctx.beginPath()
      if (tool === 'rect') {
        ctx.strokeRect(
          Math.min(s.x, pos.x), Math.min(s.y, pos.y),
          Math.abs(pos.x - s.x), Math.abs(pos.y - s.y),
        )
      } else if (tool === 'ellipse') {
        ctx.ellipse(
          (s.x + pos.x) / 2, (s.y + pos.y) / 2,
          Math.abs(pos.x - s.x) / 2, Math.abs(pos.y - s.y) / 2,
          0, 0, Math.PI * 2,
        )
        ctx.stroke()
      } else if (tool === 'line') {
        ctx.moveTo(s.x, s.y)
        ctx.lineTo(pos.x, pos.y)
        ctx.stroke()
      }
    }
  }, [getCtx, tool, strokeOpts, drawLine, eraserSize])

  const endDraw = useCallback(() => {
    if (!isDrawing.current) return
    isDrawing.current = false
    lastPoint.current = null
    startPoint.current = null
    const canvas = canvasRef.current
    if (canvas) {
      onChange(canvas.toDataURL('image/png'))
    }
  }, [onChange])

  const handleUndo = useCallback(() => {
    const ctx = getCtx()
    const canvas = canvasRef.current
    if (!ctx || !canvas || undoStack.current.length === 0) return
    const snap = undoStack.current.pop()!
    const current = ctx.getImageData(0, 0, canvas.width, canvas.height)
    redoStack.current.push(current)
    ctx.putImageData(snap, 0, 0)
    setUndoCount(undoStack.current.length)
    setRedoCount(redoStack.current.length)
    onChange(canvas.toDataURL('image/png'))
  }, [getCtx, onChange])

  const handleRedo = useCallback(() => {
    const ctx = getCtx()
    const canvas = canvasRef.current
    if (!ctx || !canvas || redoStack.current.length === 0) return
    const snap = redoStack.current.pop()!
    const current = ctx.getImageData(0, 0, canvas.width, canvas.height)
    undoStack.current.push(current)
    ctx.putImageData(snap, 0, 0)
    setUndoCount(undoStack.current.length)
    setRedoCount(redoStack.current.length)
    onChange(canvas.toDataURL('image/png'))
  }, [getCtx, onChange])

  const handleClear = useCallback(() => {
    const ctx = getCtx()
    const canvas = canvasRef.current
    if (!ctx || !canvas) return
    saveSnapshot()
    const dpr = window.devicePixelRatio || 1
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    const w = canvas.width / dpr
    const h = canvas.height / dpr
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, w, h)
    onChange(canvas.toDataURL('image/png'))
  }, [getCtx, saveSnapshot, onChange])

  const handlePointerDown = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault()
    let clientX: number
    let clientY: number
    if ('touches' in e) {
      const t = e.touches[0]
      if (!t) return
      clientX = t.clientX
      clientY = t.clientY
    } else {
      clientX = e.clientX
      clientY = e.clientY
    }
    startDraw(getPos({ clientX, clientY }))
  }, [startDraw, getPos])

  const handlePointerMove = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing.current) return
    e.preventDefault()
    let clientX: number
    let clientY: number
    if ('touches' in e) {
      const t = e.touches[0]
      if (!t) return
      clientX = t.clientX
      clientY = t.clientY
    } else {
      clientX = e.clientX
      clientY = e.clientY
    }
    moveDraw(getPos({ clientX, clientY }))
  }, [moveDraw, getPos])

  const handlePointerUp = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault()
    endDraw()
  }, [endDraw])

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    const container = containerRef.current
    if (!canvas || !ctx || !container) return

    const dpr = window.devicePixelRatio || 1
    const w = container.clientWidth
    const h = container.clientHeight
    canvas.width = w * dpr
    canvas.height = h * dpr
    ctx.scale(dpr, dpr)

    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, w, h)

    if (value.startsWith('data:image')) {
      const img = new Image()
      img.onload = () => { ctx.drawImage(img, 0, 0, w, h) }
      img.src = value
    }
    // value deliberately omitted — CanvasDrawing is remounted via key when problemId changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div ref={containerRef} className="flex h-full flex-col">
      <div className="flex flex-wrap items-center gap-1.5 border-b border-zinc-200 px-3 py-2 text-xs">
        {PRESET_COLORS.map(c => (
          <button
            key={c}
            onClick={() => setColor(c)}
            className={`h-5 w-5 rounded-full border-2 transition-all ${
              color === c ? 'border-primary-500 scale-110' : 'border-transparent'
            }`}
            style={{ backgroundColor: c }}
          />
        ))}
        <div className="mx-1 h-4 w-px bg-zinc-200" />

        {STROKE_WIDTHS.map(w => (
          <button
            key={w}
            onClick={() => setStrokeWidth(w)}
            className={`rounded px-1.5 py-0.5 font-medium ${
              strokeWidth === w ? 'bg-primary-100 text-primary-700' : 'text-zinc-500 hover:bg-zinc-100'
            }`}
          >
            {w}px
          </button>
        ))}
        <div className="mx-1 h-4 w-px bg-zinc-200" />

        <button onClick={() => setTool('pen')} className={`rounded px-2 py-1 font-medium ${tool === 'pen' ? 'bg-primary-100 text-primary-700' : 'text-zinc-500 hover:bg-zinc-100'}`}>画笔</button>
        <button onClick={() => setTool('eraser')} className={`rounded px-2 py-1 font-medium ${tool === 'eraser' ? 'bg-primary-100 text-primary-700' : 'text-zinc-500 hover:bg-zinc-100'}`}>橡皮</button>
        <button onClick={() => setTool('rect')} className={`rounded px-2 py-1 font-medium ${tool === 'rect' ? 'bg-primary-100 text-primary-700' : 'text-zinc-500 hover:bg-zinc-100'}`}>矩形</button>
        <button onClick={() => setTool('ellipse')} className={`rounded px-2 py-1 font-medium ${tool === 'ellipse' ? 'bg-primary-100 text-primary-700' : 'text-zinc-500 hover:bg-zinc-100'}`}>椭圆</button>
        <button onClick={() => setTool('line')} className={`rounded px-2 py-1 font-medium ${tool === 'line' ? 'bg-primary-100 text-primary-700' : 'text-zinc-500 hover:bg-zinc-100'}`}>直线</button>
        <div className="mx-1 h-4 w-px bg-zinc-200" />

        <button onClick={handleUndo} disabled={undoCount === 0} className="rounded px-2 py-1 text-zinc-500 hover:bg-zinc-100 disabled:opacity-30">撤销</button>
        <button onClick={handleRedo} disabled={redoCount === 0} className="rounded px-2 py-1 text-zinc-500 hover:bg-zinc-100 disabled:opacity-30">重做</button>
        <div className="mx-1 h-4 w-px bg-zinc-200" />
        <button onClick={handleClear} className="rounded px-2 py-1 text-red-500 hover:bg-red-50">清空</button>
      </div>

      {tool === 'eraser' && (
        <div className="flex items-center gap-2 border-b border-zinc-200 px-3 py-1.5 text-xs text-zinc-500">
          橡皮大小:
          {ERASER_SIZES.map(s => (
            <button
              key={s}
              onClick={() => setEraserSize(s)}
              className={`rounded px-2 py-0.5 ${eraserSize === s ? 'bg-primary-100 text-primary-700 font-medium' : 'hover:bg-zinc-100'}`}
            >
              {s}px
            </button>
          ))}
        </div>
      )}

      <div className="flex-1 bg-zinc-100 p-2">
        <canvas
          ref={canvasRef}
          className="h-full w-full rounded-lg bg-white shadow-sm cursor-crosshair"
          style={{ touchAction: 'none' }}
          onMouseDown={handlePointerDown}
          onMouseMove={handlePointerMove}
          onMouseUp={handlePointerUp}
          onMouseLeave={endDraw}
          onTouchStart={handlePointerDown}
          onTouchMove={handlePointerMove}
          onTouchEnd={handlePointerUp}
        />
      </div>
    </div>
  )
}
