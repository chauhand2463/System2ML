'use client'

import { ArrowUp, ArrowDown, Minus } from 'lucide-react'
import { cn } from '@/lib/utils'

interface KPICardProps {
  label: string
  value: string | number
  unit?: string
  change?: number
  trend?: 'up' | 'down' | 'neutral'
  icon?: React.ReactNode
  className?: string
}

export function KPICard({
  label,
  value,
  unit,
  change,
  trend,
  icon,
  className,
}: KPICardProps) {
  return (
    <div
      className={cn(
        'rounded-lg border border-neutral-800 bg-neutral-900 p-6',
        className
      )}
    >
      <div className="flex items-start justify-between mb-2">
        <h3 className="text-sm font-medium text-neutral-400">{label}</h3>
        {icon && <div className="text-brand-500">{icon}</div>}
      </div>

      <div className="flex items-baseline gap-2 mb-3">
        <span className="text-2xl font-bold text-white">{value}</span>
        {unit && <span className="text-sm text-neutral-500">{unit}</span>}
      </div>

      {change !== undefined && (
        <div
          className={cn(
            'flex items-center gap-1 text-sm font-medium',
            trend === 'up' && 'text-success-600',
            trend === 'down' && 'text-danger-600',
            trend === 'neutral' && 'text-neutral-500'
          )}
        >
          {trend === 'up' && <ArrowUp className="w-4 h-4" />}
          {trend === 'down' && <ArrowDown className="w-4 h-4" />}
          {trend === 'neutral' && <Minus className="w-4 h-4" />}
          <span>{Math.abs(change)}%</span>
          <span className="text-neutral-500 font-normal">vs last week</span>
        </div>
      )}
    </div>
  )
}
