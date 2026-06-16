import { useEffect, useRef, useState, useCallback } from 'react'

type DrawTool = 'pen' | 'eraser' | 'rect' | 'ellipse' | 'line' | 'select'

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

  const [selection, setSelection] = useState<{ x: number; y: number; w: number; h: number } | null>(null)
  const selectedPixels = useRef<ImageData | null>(null)
  const isMoving = useRef(false)
  const moveStart = useRef<{ x: number; y: number } | null>(null)
  const selectionRef = useRef<{ x: number; y: number; w: number; h: number } | null>(null)
  const [cursorStyle, setCursorStyle] = useState('crosshair')

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

  const emitChange = useCallback(() => {
    const canvas = canvasRef.current
    if (canvas) onChange(canvas.toDataURL('image/png'))
  }, [onChange])

  const drawSelectionRect = useCallback((s: { x: number; y: number; w: number; h: number }) => {
    const ctx = getCtx()
    if (!ctx) return
    ctx.save()
    ctx.strokeStyle = '#3b82f6'
    ctx.lineWidth = 2
    ctx.setLineDash([6, 4])
    ctx.strokeRect(s.x, s.y, s.w, s.h)
    ctx.restore()
  }, [getCtx])

  const isInsideSelection = useCallback((pos: { x: number; y: number }, sel: { x: number; y: number; w: number; h: number }) => {
    const pad = 8
    return pos.x >= sel.x - pad && pos.x <= sel.x + sel.w + pad &&
           pos.y >= sel.y - pad && pos.y <= sel.y + sel.h + pad
  }, [])

  const startDraw = useCallback((pos: { x: number; y: number }) => {
    if (tool === 'select') {
      const sel = selectionRef.current
      if (sel && isInsideSelection(pos, sel)) {
        saveSnapshot()
        const ctx = getCtx()
        const canvas = canvasRef.current
        if (!ctx || !canvas) return
        const dpr = window.devicePixelRatio || 1
        selectedPixels.current = ctx.getImageData(sel.x * dpr, sel.y * dpr, sel.w * dpr, sel.h * dpr)
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(sel.x, sel.y, sel.w, sel.h)
        isMoving.current = true
        moveStart.current = pos
        emitChange()
      } else {
        setSelection(null)
        selectionRef.current = null
        selectedPixels.current = null
        saveSnapshot()
        isDrawing.current = true
        startPoint.current = pos
        lastPoint.current = pos
      }
      return
    }
    saveSnapshot()
    isDrawing.current = true
    lastPoint.current = pos
    startPoint.current = pos
  }, [tool, getCtx, saveSnapshot, isInsideSelection, emitChange])

  const moveDraw = useCallback((pos: { x: number; y: number }) => {
    const ctx = getCtx()
    const canvas = canvasRef.current
    if (!ctx || !canvas) return

    if (tool === 'select') {
      if (isMoving.current) {
        const sel = selectionRef.current
        const px = selectedPixels.current
        if (!sel || !px || !moveStart.current) return
        const dx = pos.x - moveStart.current.x
        const dy = pos.y - moveStart.current.y
        const lastSnap = undoStack.current[undoStack.current.length - 1]
        if (lastSnap) ctx.putImageData(lastSnap, 0, 0)
        const dpr = window.devicePixelRatio || 1
        ctx.putImageData(px, (sel.x + dx) * dpr, (sel.y + dy) * dpr)
        drawSelectionRect({ x: sel.x + dx, y: sel.y + dy, w: sel.w, h: sel.h })
        return
      }

      if (isDrawing.current && startPoint.current) {
        const lastSnap = undoStack.current[undoStack.current.length - 1]
        if (lastSnap) ctx.putImageData(lastSnap, 0, 0)
        const s = startPoint.current
        const sx = Math.min(s.x, pos.x)
        const sy = Math.min(s.y, pos.y)
        const sw = Math.abs(pos.x - s.x)
        const sh = Math.abs(pos.y - s.y)
        drawSelectionRect({ x: sx, y: sy, w: sw, h: sh })
      }
      return
    }

    if (!isDrawing.current) return
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
  }, [getCtx, tool, strokeOpts, drawLine, eraserSize, drawSelectionRect])

  const endDraw = useCallback(() => {
    if (tool === 'select') {
      if (isMoving.current) {
        isMoving.current = false
        moveStart.current = null
        const sel = selectionRef.current
        setSelection(sel ? { ...sel } : null)
        emitChange()
        return
      }
      if (isDrawing.current && startPoint.current && lastPoint.current) {
        isDrawing.current = false
        const s = startPoint.current
        const e = lastPoint.current
        const sx = Math.min(s.x, e.x)
        const sy = Math.min(s.y, e.y)
        const sw = Math.abs(e.x - s.x)
        const sh = Math.abs(e.y - s.y)
        if (sw > 2 || sh > 2) {
          const sel = { x: sx, y: sy, w: sw, h: sh }
          setSelection(sel)
          selectionRef.current = sel
          const ctx = getCtx()
          const canvas = canvasRef.current
          if (ctx && canvas) {
            const dpr = window.devicePixelRatio || 1
            selectedPixels.current = ctx.getImageData(sx * dpr, sy * dpr, sw * dpr, sh * dpr)
          }
        }
        startPoint.current = null
        lastPoint.current = null
        emitChange()
      }
      return
    }
    if (!isDrawing.current) return
    isDrawing.current = false
    lastPoint.current = null
    startPoint.current = null
    emitChange()
  }, [tool, getCtx, emitChange])

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
    setSelection(null)
    selectionRef.current = null
    selectedPixels.current = null
    emitChange()
  }, [getCtx, emitChange])

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
    setSelection(null)
    selectionRef.current = null
    selectedPixels.current = null
    emitChange()
  }, [getCtx, emitChange])

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
    setSelection(null)
    selectionRef.current = null
    selectedPixels.current = null
    emitChange()
  }, [getCtx, saveSnapshot, emitChange])

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
    let clientX: number
    let clientY: number
    if ('touches' in e) {
      if (!isDrawing.current && !isMoving.current) return
      const t = e.touches[0]
      if (!t) return
      clientX = t.clientX
      clientY = t.clientY
    } else {
      clientX = e.clientX
      clientY = e.clientY
    }
    if (tool === 'select' && !isDrawing.current && !isMoving.current) {
      const sel = selectionRef.current
      if (sel && isInsideSelection(getPos({ clientX, clientY }), sel)) {
        setCursorStyle('move')
      } else {
        setCursorStyle('crosshair')
      }
      return
    }
    moveDraw(getPos({ clientX, clientY }))
  }, [getPos, tool, isInsideSelection, moveDraw])

  const handlePointerUp = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault()
    endDraw()
  }, [endDraw])

  const handlePointerLeave = useCallback(() => {
    if (tool === 'select' && !isMoving.current) {
      isDrawing.current = false
    }
    endDraw()
  }, [tool, endDraw])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelection(null)
        selectionRef.current = null
        selectedPixels.current = null
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

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
        <button onClick={() => setTool('select')} className={`rounded px-2 py-1 font-medium ${tool === 'select' ? 'bg-primary-100 text-primary-700' : 'text-zinc-500 hover:bg-zinc-100'}`}>框选</button>
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
          className="h-full w-full rounded-lg bg-white shadow-sm"
          style={{ touchAction: 'none', cursor: cursorStyle }}
          onMouseDown={handlePointerDown}
          onMouseMove={handlePointerMove}
          onMouseUp={handlePointerUp}
          onMouseLeave={handlePointerLeave}
          onTouchStart={handlePointerDown}
          onTouchMove={handlePointerMove}
          onTouchEnd={handlePointerUp}
        />
        {selection && (
          <div
            className="absolute border-2 border-dashed border-blue-500 pointer-events-none"
            style={{
              left: selection.x,
              top: selection.y,
              width: selection.w,
              height: selection.h,
              zIndex: 10,
            }}
          />
        )}
      </div>
    </div>
  )
}