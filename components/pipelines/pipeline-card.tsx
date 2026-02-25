'use client'

import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { ArrowRight, Clock } from 'lucide-react'
import type { Pipeline } from '@/lib/types'

interface PipelineCardProps {
  pipeline: Pipeline
}

export function PipelineCard({ pipeline }: PipelineCardProps) {
  const getStatusColor = (status: Pipeline['status']) => {
    switch (status) {
      case 'active':
        return 'bg-success-500/10 text-success-600'
      case 'paused':
        return 'bg-warning-500/10 text-warning-600'
      case 'draft':
        return 'bg-neutral-600/10 text-neutral-400'
      case 'archived':
        return 'bg-neutral-600/10 text-neutral-500'
      default:
        return 'bg-neutral-600/10 text-neutral-400'
    }
  }

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    })
  }

  return (
    <Link href={`/pipelines/${pipeline.id}`}>
      <div className="group rounded-lg border border-neutral-800 bg-neutral-900 p-6 hover:border-neutral-700 hover:bg-neutral-800 transition-all cursor-pointer">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <h3 className="text-lg font-bold text-white group-hover:text-brand-400 transition-colors">
              {pipeline.name}
            </h3>
            <p className="text-sm text-neutral-400 mt-1">{pipeline.description}</p>
          </div>
          <Badge className={cn('whitespace-nowrap ml-2', getStatusColor(pipeline.status))}>
            {pipeline.status.charAt(0).toUpperCase() + pipeline.status.slice(1)}
          </Badge>
        </div>

        <div className="flex flex-wrap gap-2 mb-4">
          {pipeline.tags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="px-2 py-1 text-xs rounded-md bg-neutral-800 text-neutral-300"
            >
              {tag}
            </span>
          ))}
          {pipeline.tags.length > 3 && (
            <span className="px-2 py-1 text-xs rounded-md bg-neutral-800 text-neutral-300">
              +{pipeline.tags.length - 3}
            </span>
          )}
        </div>

        <div className="flex items-center justify-between text-xs text-neutral-500">
          <div className="flex items-center gap-4">
            <span>v{pipeline.version}</span>
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {formatDate(pipeline.updatedAt)}
            </span>
          </div>
          <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
        </div>
      </div>
    </Link>
  )
}
