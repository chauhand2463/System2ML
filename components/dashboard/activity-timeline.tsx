'use client'

import { AlertCircle, Zap, Activity as ActivityIcon, CheckCircle, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Activity } from '@/lib/types'

interface ActivityTimelineProps {
  activities: Activity[]
}

export function ActivityTimeline({ activities }: ActivityTimelineProps) {
  const getIcon = (type: Activity['type']) => {
    switch (type) {
      case 'pipeline':
        return <Zap className="w-5 h-5" />
      case 'failure':
        return <AlertCircle className="w-5 h-5" />
      case 'approval':
        return <CheckCircle className="w-5 h-5" />
      case 'deployment':
        return <ActivityIcon className="w-5 h-5" />
      case 'alert':
        return <AlertTriangle className="w-5 h-5" />
      default:
        return <ActivityIcon className="w-5 h-5" />
    }
  }

  const getSeverityColor = (severity?: Activity['severity']) => {
    switch (severity) {
      case 'critical':
        return 'bg-danger-500/10 text-danger-500'
      case 'high':
        return 'bg-warning-500/10 text-warning-600'
      case 'medium':
        return 'bg-info-500/10 text-info-600'
      case 'low':
        return 'bg-success-500/10 text-success-600'
      default:
        return 'bg-neutral-800 text-neutral-400'
    }
  }

  const formatTime = (date: Date) => {
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (minutes < 1) return 'Just now'
    if (minutes < 60) return `${minutes}m ago`
    if (hours < 24) return `${hours}h ago`
    if (days < 7) return `${days}d ago`
    return date.toLocaleDateString()
  }

  return (
    <div className="space-y-4">
      {activities.map((activity, index) => (
        <div key={activity.id} className="flex gap-4">
          <div className="flex flex-col items-center">
            <div
              className={cn(
                'rounded-full p-2',
                getSeverityColor(activity.severity)
              )}
            >
              {getIcon(activity.type)}
            </div>
            {index < activities.length - 1 && (
              <div className="w-0.5 h-12 bg-neutral-800 my-2" />
            )}
          </div>

          <div className="flex-1 pt-1 pb-4">
            <p className="font-medium text-white">{activity.title}</p>
            <p className="text-sm text-neutral-400 mb-2">{activity.description}</p>
            <div className="flex items-center gap-4 text-xs text-neutral-500">
              <span>{activity.actor}</span>
              <span>{formatTime(activity.timestamp)}</span>
              {activity.actionable && (
                <span className="px-2 py-1 rounded bg-info-500/10 text-info-600 font-medium">
                  Action needed
                </span>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
