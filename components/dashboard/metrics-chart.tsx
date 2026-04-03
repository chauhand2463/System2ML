'use client'

import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { Area, AreaChart, ResponsiveContainer, Tooltip } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface MetricsChartProps {
  title: string
  data: Array<{ date: string; value: number }>
  color?: string
  format?: 'number' | 'percent' | 'currency'
  icon?: 'up' | 'down' | 'neutral'
}

export function MetricsChart({
  title,
  data,
  color = '#8b5cf6',
  format = 'number',
  icon = 'up'
}: MetricsChartProps) {
  const currentValue = data.length > 0 ? data[data.length - 1].value : 0
  const previousValue = data.length > 1 ? data[data.length - 2].value : 0
  const change = previousValue > 0 ? ((currentValue - previousValue) / previousValue * 100).toFixed(1) : 0

  const formatValue = (value: number) => {
    switch (format) {
      case 'percent':
        return `${value.toFixed(1)}%`
      case 'currency':
        return `$${value.toFixed(2)}`
      default:
        return value.toFixed(1)
    }
  }

  const TrendIcon = icon === 'up' ? TrendingUp : icon === 'down' ? TrendingDown : Minus
  const trendColor = icon === 'up' ? 'text-emerald-400' : icon === 'down' ? 'text-red-400' : 'text-neutral-400'

  return (
    <Card className="bg-neutral-900/50 backdrop-blur-xl border border-white/5">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-neutral-400">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-2 mb-4">
          <span className="text-2xl font-bold text-white">{formatValue(currentValue)}</span>
          <div className={`flex items-center gap-1 text-xs font-medium ${trendColor}`}>
            <TrendIcon className="w-3 h-3" />
            {change}%
          </div>
        </div>
        <div className="h-16">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
              <defs>
                <linearGradient id={`gradient-${title}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={color} stopOpacity={0.3} />
                  <stop offset="100%" stopColor={color} stopOpacity={0} />
                </linearGradient>
              </defs>
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="bg-neutral-800 border border-white/10 rounded-lg px-3 py-2">
                        <p className="text-white text-xs font-medium">{formatValue(payload[0].value as number)}</p>
                      </div>
                    )
                  }
                  return null
                }}
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke={color}
                strokeWidth={2}
                fill={`url(#gradient-${title})`}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
