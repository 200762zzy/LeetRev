import { useMemo } from 'react'
import ReactECharts from 'echarts-for-react'
import type { CodeAnalysis } from '../types'

interface Props {
  analyses: CodeAnalysis[]
}

export function ComplexityChart({ analyses }: Props) {
  const option = useMemo(() => {
    const sorted = [...analyses].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
    const dates = sorted.map((a) => new Date(a.created_at).toLocaleDateString('zh-CN'))
    const scores = sorted.map((a) => a.score)

    return {
      tooltip: { trigger: 'axis' as const },
      grid: { left: 50, right: 20, top: 30, bottom: 30 },
      xAxis: {
        type: 'category' as const,
        data: dates,
        axisLabel: { fontSize: 10, rotate: dates.length > 5 ? 30 : 0 },
      },
      yAxis: {
        type: 'value' as const,
        min: 0,
        max: 100,
        axisLabel: { fontSize: 10 },
      },
      series: [
        {
          type: 'line',
          data: scores,
          smooth: true,
          symbol: 'circle',
          symbolSize: 8,
          lineStyle: { color: '#7c3aed', width: 2 },
          itemStyle: { color: '#7c3aed' },
          areaStyle: {
            color: {
              type: 'linear',
              x: 0, y: 0, x2: 0, y2: 1,
              colorStops: [
                { offset: 0, color: 'rgba(124, 58, 237, 0.25)' },
                { offset: 1, color: 'rgba(124, 58, 237, 0.02)' },
              ],
            },
          },
        },
      ],
    }
  }, [analyses])

  if (analyses.length === 0) return null

  return (
    <div className="card">
      <h3 className="mb-3 text-sm font-semibold text-zinc-900">代码评分趋势</h3>
      <ReactECharts option={option} style={{ height: 200 }} />
      <div className="mt-1 text-right text-[10px] text-zinc-400">
        共 {analyses.length} 次分析 · 最新评分 {analyses[analyses.length - 1].score}
      </div>
    </div>
  )
}
