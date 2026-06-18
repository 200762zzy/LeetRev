import { useMemo } from 'react'
import type { ReviewHeatmapEntry } from '../types'

interface Props {
  data: ReviewHeatmapEntry[]
}

const CELL_SIZE = 13
const CELL_GAP = 3
const DAY_LABELS = ['', 'Mon', '', 'Wed', '', 'Fri', '']
const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function getColor(count: number): string {
  if (count === 0) return 'fill-zinc-100'
  if (count <= 2) return 'fill-emerald-200'
  if (count <= 5) return 'fill-emerald-400'
  if (count <= 10) return 'fill-emerald-600'
  return 'fill-emerald-800'
}

export function ReviewHeatmap({ data }: Props) {
  const { cells, weekCount, monthLabels } = useMemo(() => {
    const today = new Date()
    const start = new Date(today)
    start.setDate(start.getDate() - 363)
    start.setHours(0, 0, 0, 0)

    const map = new Map<string, number>()
    for (const d of data) {
      map.set(d.day, d.count)
    }

    const cells: { date: Date; day: string; count: number; x: number; y: number }[] = []
    const monthsSeen = new Set<number>()
    const monthLabels: { label: string; x: number }[] = []

    for (let i = 0; i < 364; i++) {
      const date = new Date(start)
      date.setDate(date.getDate() + i)
      const dayStr = date.toISOString().slice(0, 10)
      const count = map.get(dayStr) ?? 0
      const dayOfWeek = date.getDay()
      const weekNum = Math.floor(i / 7)
      const x = weekNum
      const y = dayOfWeek

      cells.push({ date, day: dayStr, count, x, y })

      const month = date.getMonth()
      const monthKey = month
      if (!monthsSeen.has(monthKey) && date.getDate() <= 7) {
        monthsSeen.add(monthKey)
        monthLabels.push({ label: MONTH_LABELS[month], x })
      }
    }

    const weekCount = Math.ceil(364 / 7)

    return { cells, weekCount, monthLabels }
  }, [data])

  const totalWidth = weekCount * (CELL_SIZE + CELL_GAP)
  const totalHeight = 7 * (CELL_SIZE + CELL_GAP)
  const maxCount = Math.max(...data.map(d => d.count), 0)

  return (
    <div className="card">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-zinc-900">复习热力图</h2>
        <span className="text-xs text-zinc-400">最近 364 天</span>
      </div>
      <div className="overflow-x-auto">
        <svg width={totalWidth + 40} height={totalHeight + 24} className="text-[10px]">
          {/* Month labels */}
          {monthLabels.map((m, i) => (
            <text key={i} x={m.x * (CELL_SIZE + CELL_GAP) + 30} y={10} className="fill-zinc-400" textAnchor="start">
              {m.label}
            </text>
          ))}
          {/* Day labels */}
          {DAY_LABELS.map((label, i) => (
            label ? (
              <text key={i} x={4} y={i * (CELL_SIZE + CELL_GAP) + 24} className="fill-zinc-400" textAnchor="end" dominantBaseline="central">
                {label}
              </text>
            ) : null
          ))}
          {/* Cells */}
          {cells.map((c, i) => (
            <rect
              key={i}
              x={c.x * (CELL_SIZE + CELL_GAP) + 30}
              y={c.y * (CELL_SIZE + CELL_GAP) + 16}
              width={CELL_SIZE}
              height={CELL_SIZE}
              rx={3}
              className={getColor(c.count)}
            >
              <title>{c.count > 0 ? `${c.count} 次复习 · ${c.day}` : `${c.day}`}</title>
            </rect>
          ))}
        </svg>
      </div>
      {/* Legend */}
      <div className="mt-2 flex items-center justify-end gap-1 text-[10px] text-zinc-400">
        <span>少</span>
        <span className={`inline-block h-3 w-3 rounded-sm ${getColor(0)}`} />
        <span className={`inline-block h-3 w-3 rounded-sm ${getColor(1)}`} />
        <span className={`inline-block h-3 w-3 rounded-sm ${getColor(3)}`} />
        <span className={`inline-block h-3 w-3 rounded-sm ${getColor(6)}`} />
        <span className={`inline-block h-3 w-3 rounded-sm ${getColor(11)}`} />
        <span>多</span>
      </div>
      {maxCount === 0 && (
        <p className="mt-2 text-center text-xs text-zinc-400">开始复习后热力图将自动生成</p>
      )}
    </div>
  )
}