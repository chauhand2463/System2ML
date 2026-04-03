'use client'

import { useState, useEffect } from 'react'
import { TrendingUp, TrendingDown, Minus, Loader2 } from 'lucide-react'
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Cell } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000'

interface RunData {
  id: string
  pipeline_name: string
  status: string
  accuracy: number
  cost: number
  carbon: number
  created_at: string
}

interface ChartDataPoint {
  name: string
  value: number
  status?: string
}

export function RunsChart() {
  const [data, setData] = useState<RunData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    async function fetchRuns() {
      try {
        const res = await fetch(`${API_BASE}/api/runs`, { cache: 'no-store' })
        if (res.ok) {
          const json = await res.json()
          setData(json.runs || [])
        } else {
          setError(true)
        }
      } catch {
        setError(true)
      } finally {
        setLoading(false)
      }
    }
    fetchRuns()
  }, [])

  const chartData: ChartDataPoint[] = data.slice(0, 10).map((run) => ({
    name: run.pipeline_name?.slice(0, 15) || 'Unknown',
    value: run.accuracy * 100,
    status: run.status
  }))

  const getBarColor = (status?: string) => {
    switch (status) {
      case 'completed': return '#10b981'
      case 'failed': return '#ef4444'
      case 'running': return '#3b82f6'
      default: return '#8b5cf6'
    }
  }

  if (loading) {
    return (
      <Card className="bg-neutral-900/50 backdrop-blur-xl border border-white/5">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-neutral-400">Recent Run Accuracy</CardTitle>
        </CardHeader>
        <CardContent className="h-40 flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-neutral-600 animate-spin" />
        </CardContent>
      </Card>
    )
  }

  if (error || chartData.length === 0) {
    return (
      <Card className="bg-neutral-900/50 backdrop-blur-xl border border-white/5">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-neutral-400">Recent Run Accuracy</CardTitle>
        </CardHeader>
        <CardContent className="h-40 flex items-center justify-center">
          <p className="text-neutral-500 text-sm">No run data available</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-neutral-900/50 backdrop-blur-xl border border-white/5">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-neutral-400">Recent Run Accuracy</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-40">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} layout="vertical" margin={{ left: 0, right: 20 }}>
              <XAxis type="number" domain={[0, 100]} tick={{ fill: '#737373', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="name" tick={{ fill: '#737373', fontSize: 10 }} axisLine={false} tickLine={false} width={80} />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="bg-neutral-800 border border-white/10 rounded-lg px-3 py-2">
                        <p className="text-white text-xs font-medium">{Number(payload[0].value).toFixed(1)}%</p>
                      </div>
                    )
                  }
                  return null
                }}
              />
              <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={getBarColor(entry.status)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
