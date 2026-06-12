import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { invoke } from '@tauri-apps/api/core'
import ReactECharts from 'echarts-for-react'
import { BookOpen, TrendingUp, Target, Plus, AlertTriangle, Shuffle } from 'lucide-react'
import type { Stats, TagStats, ReviewStats } from '../types'

export function Welcome() {
  const navigate = useNavigate()
  const [stats, setStats] = useState<Stats | null>(null)
  const [tagStats, setTagStats] = useState<TagStats[]>([])
  const [reviewStats, setReviewStats] = useState<ReviewStats | null>(null)

  useEffect(() => {
    invoke<Stats>('get_stats').then(setStats).catch(() => {})
    invoke<TagStats[]>('get_tag_stats').then(setTagStats).catch(() => {})
    invoke<ReviewStats>('get_review_stats').then(setReviewStats).catch(() => {})
  }, [])

  const passRate =
    stats && stats.total > 0 ? Math.round((stats.solved / stats.total) * 100) : 0

  const handleRandom = useCallback(async () => {
    try {
      const p = await invoke<{ id: number } | null>('get_random_problem')
      if (p) navigate(`/problems/${p.id}`)
    } catch (_) {}
  }, [navigate])

  const handleStartReview = useCallback(() => {
    navigate('/review')
  }, [navigate])

  const cards = [
    {
      label: '总题目',
      value: stats?.total ?? 0,
      icon: BookOpen,
      color: 'bg-blue-50 text-blue-600',
    },
    {
      label: '已解决',
      value: stats?.solved ?? 0,
      icon: TrendingUp,
      color: 'bg-emerald-50 text-emerald-600',
    },
    {
      label: '通过率',
      value: stats && stats.total > 0 ? `${passRate}%` : '-',
      icon: TrendingUp,
      color: 'bg-purple-50 text-purple-600',
    },
    {
      label: '待复习',
      value: reviewStats?.due_count ?? 0,
      icon: Target,
      color: reviewStats && reviewStats.due_count > 0 ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-600',
    },
  ]

  const pieOption = {
    tooltip: { trigger: 'item' as const, formatter: '{b}: {c} ({d}%)' },
    legend: { bottom: 0, textStyle: { fontSize: 12 } },
    series: [
      {
        type: 'pie',
        radius: ['42%', '70%'],
        avoidLabelOverlap: true,
        itemStyle: { borderRadius: 6, borderColor: '#fff', borderWidth: 2 },
        label: { show: true, formatter: '{b}' },
        data: [
          { value: stats?.by_difficulty.easy ?? 0, name: 'Easy', itemStyle: { color: '#10b981' } },
          { value: stats?.by_difficulty.medium ?? 0, name: 'Medium', itemStyle: { color: '#f59e0b' } },
          { value: stats?.by_difficulty.hard ?? 0, name: 'Hard', itemStyle: { color: '#ef4444' } },
        ].filter((d) => d.value > 0),
      },
    ],
  }

  const topTags = tagStats.slice(0, 12)
  const barOption = {
    tooltip: { trigger: 'axis' as const, axisPointer: { type: 'shadow' as const } },
    grid: { left: 80, right: 20, top: 10, bottom: 10 },
    yAxis: { type: 'category' as const, data: topTags.map((t) => t.tag_name).reverse(), axisLine: { show: false }, axisTick: { show: false } },
    xAxis: { type: 'value' as const, axisLabel: { show: false } },
    series: [
      {
        type: 'bar',
        data: topTags.map((t) => ({ value: t.total, itemStyle: { color: t.rate > 0.6 ? '#10b981' : t.rate > 0.3 ? '#f59e0b' : '#ef4444' } })).reverse(),
        barMaxWidth: 20,
        label: { show: true, position: 'right', fontSize: 11, formatter: (p: any) => `${p.value}题` },
      },
    ],
  }

  const weakTags = tagStats.filter((t) => t.total >= 2).sort((a, b) => a.rate - b.rate).slice(0, 8)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">刷题看板</h1>
          <p className="mt-1 text-sm text-zinc-500">追踪你的刷题进度与薄弱环节</p>
        </div>
        <button onClick={() => navigate('/problems/new')} className="btn-primary">
          <Plus className="h-4 w-4" /> 新增题目
        </button>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {cards.map((card) => (
          <div key={card.label} className="card">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-zinc-500">{card.label}</span>
              <div className={`rounded-lg p-2 ${card.color}`}>
                <card.icon className="h-4 w-4" />
              </div>
            </div>
            <p className="mt-3 text-3xl font-bold text-zinc-900">{card.value}</p>
          </div>
        ))}
      </div>

      {reviewStats && reviewStats.due_count > 0 && (
        <div className="card flex items-center justify-between border-l-4 border-l-amber-400 bg-amber-50/30">
          <div className="flex items-center gap-3">
            <Target className="h-5 w-5 text-amber-500" />
            <div>
              <p className="text-sm font-medium text-zinc-900">每日复习提醒</p>
              <p className="text-xs text-zinc-500">今天有 {reviewStats.due_count} 道题目待复习，已复习 {reviewStats.today_reviewed} 题</p>
            </div>
          </div>
          <button className="btn-primary" onClick={handleStartReview}>开始复习</button>
        </div>
      )}

      <div className="flex items-center gap-3">
        {stats && stats.total > 0 && (
          <button className="btn-secondary" onClick={handleRandom}>
            <Shuffle className="h-4 w-4" /> 随机一题
          </button>
        )}
        {reviewStats && reviewStats.total_reviewed > 0 && (
          <button className="btn-secondary" onClick={handleStartReview}>
            <Target className="h-4 w-4" /> 复习模式
          </button>
        )}
      </div>

      {(!stats || stats.total === 0) ? (
        <div className="card py-16 text-center">
          <BookOpen className="mx-auto h-12 w-12 text-zinc-300" />
          <h3 className="mt-4 text-lg font-semibold text-zinc-900">还没有题目</h3>
          <p className="mt-2 text-sm text-zinc-500">添加你的第一道力扣题目，开始追踪刷题进度吧</p>
          <button onClick={() => navigate('/problems/new')} className="btn-primary mt-6">
            <Plus className="h-4 w-4" /> 添加题目
          </button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4">
            <div className="card">
              <h2 className="mb-1 text-sm font-semibold text-zinc-900">难度分布</h2>
              <p className="mb-3 text-xs text-zinc-400">按题目难度分布统计</p>
              <ReactECharts option={pieOption} style={{ height: 240 }} />
            </div>
            <div className="card">
              <h2 className="mb-1 text-sm font-semibold text-zinc-900">标签分布</h2>
              <p className="mb-3 text-xs text-zinc-400">各算法标签题目数量 Top 12</p>
              {topTags.length > 0 ? (
                <ReactECharts option={barOption} style={{ height: 260 }} />
              ) : (
                <p className="py-8 text-center text-sm text-zinc-400">暂无数据，添加题目后自动统计</p>
              )}
            </div>
          </div>

          {weakTags.length > 0 && (
            <div className="card">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="h-4 w-4 text-red-500" />
                <h2 className="text-sm font-semibold text-zinc-900">薄弱环节</h2>
                <span className="text-xs text-zinc-400">正确率最低的标签（至少 2 题）</span>
              </div>
              <div className="overflow-hidden rounded-lg border border-zinc-100">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-zinc-50">
                      <th className="px-4 py-2 text-left font-medium text-zinc-500">标签</th>
                      <th className="px-4 py-2 text-center font-medium text-zinc-500">总题</th>
                      <th className="px-4 py-2 text-center font-medium text-zinc-500">已解决</th>
                      <th className="px-4 py-2 text-right font-medium text-zinc-500">正确率</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {weakTags.map((t) => (
                      <tr key={t.tag_id} className="cursor-pointer hover:bg-zinc-100" onClick={() => navigate('/problems', { state: { initialTagId: t.tag_id } })}>
                        <td className="px-4 py-2.5 font-medium text-zinc-900">{t.tag_name}</td>
                        <td className="px-4 py-2.5 text-center text-zinc-600">{t.total}</td>
                        <td className="px-4 py-2.5 text-center text-zinc-600">{t.solved}</td>
                        <td className="px-4 py-2.5 text-right">
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                              t.rate >= 0.6
                                ? 'bg-emerald-50 text-emerald-600'
                                : t.rate >= 0.3
                                  ? 'bg-amber-50 text-amber-600'
                                  : 'bg-red-50 text-red-600'
                            }`}
                          >
                            {Math.round(t.rate * 100)}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
