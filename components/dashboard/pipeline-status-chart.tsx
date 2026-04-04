'use client'

import { useState, useEffect } from 'react'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000'

interface PipelineData {
  id: string
  name: string
  status: string
  created_at: string
}

const COLORS = {
  active: '#10b981',
  designed: '#8b5cf6',
  archived: '#6b7280'
}

interface PipelineStatusChartProps {
  initialData?: PipelineData[]
}

export function PipelineStatusChart({ initialData }: PipelineStatusChartProps) {
  const [data, setData] = useState<PipelineData[]>(initialData || [])
  const [loading, setLoading] = useState(!initialData)
  const [error, setError] = useState(false)

  useEffect(() => {
    if (initialData) return

    async function fetchPipelines() {
      try {
        const res = await fetch(`${API_BASE}/api/pipelines`, { cache: 'no-store' })
        if (res.ok) {
          const json = await res.json()
          setData(json.pipelines || [])
        } else {
          setError(true)
        }
      } catch (e) {
        console.error('Error fetching pipelines:', e)
        setError(true)
      } finally {
        setLoading(false)
      }
    }
    fetchPipelines()
  }, [initialData])

  const statusCounts = data.reduce((acc, pipeline) => {
    const status = pipeline.status || 'designed'
    acc[status] = (acc[status] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  const chartData = Object.entries(statusCounts).map(([name, value]) => ({
    name: name.charAt(0).toUpperCase() + name.slice(1),
    value,
    color: COLORS[name as keyof typeof COLORS] || '#6b7280'
  }))

  const total = chartData.reduce((sum, item) => sum + item.value, 0)

  if (loading) {
    return (
      <Card className="bg-neutral-900/50 backdrop-blur-xl border border-white/5">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-neutral-400">Pipeline Status</CardTitle>
        </CardHeader>
        <CardContent className="h-40 flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-neutral-700 border-t-brand-500 rounded-full animate-spin" />
        </CardContent>
      </Card>
    )
  }

  if (error || chartData.length === 0) {
    return (
      <Card className="bg-neutral-900/50 backdrop-blur-xl border border-white/5">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-neutral-400">Pipeline Status</CardTitle>
        </CardHeader>
        <CardContent className="h-40 flex items-center justify-center">
          <p className="text-neutral-500 text-sm">{error ? 'Connection error' : 'No pipelines yet'}</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-neutral-900/50 backdrop-blur-xl border border-white/5">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-neutral-400">Pipeline Status</CardTitle>
      </CardHeader>
      <CardContent className="flex items-center gap-4">
        <div className="w-28 h-28">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={30}
                outerRadius={45}
                dataKey="value"
                strokeWidth={0}
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="flex-1 space-y-2">
          {chartData.map((item) => (
            <div key={item.name} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                <span className="text-neutral-400 text-xs">{item.name}</span>
              </div>
              <span className="text-white text-sm font-medium">{item.value}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
