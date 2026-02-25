'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ChevronDown, ChevronUp, Plus, Minus } from 'lucide-react'
import { useState } from 'react'

interface DiffChange {
  type: 'added' | 'removed' | 'modified'
  path: string
  oldValue?: string
  newValue?: string
}

interface ApprovalDiffViewProps {
  title: string
  description: string
  changes: DiffChange[]
}

export function ApprovalDiffView({
  title,
  description,
  changes,
}: ApprovalDiffViewProps) {
  const [expanded, setExpanded] = useState(true)

  const added = changes.filter((c) => c.type === 'added').length
  const removed = changes.filter((c) => c.type === 'removed').length
  const modified = changes.filter((c) => c.type === 'modified').length

  return (
    <div className="rounded-lg border border-neutral-800 bg-neutral-900 overflow-hidden">
      <div className="p-4 border-b border-neutral-800 flex items-center justify-between cursor-pointer hover:bg-neutral-800/50 transition-colors" onClick={() => setExpanded(!expanded)}>
        <div className="flex-1 flex items-center gap-4">
          <button className="p-1 hover:bg-neutral-700 rounded">
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          <div>
            <h3 className="font-semibold text-white">{title}</h3>
            <p className="text-sm text-neutral-400">{description}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {added > 0 && <Badge className="bg-success-500/20 text-success-400 border-success-500/30">+{added}</Badge>}
          {modified > 0 && <Badge className="bg-info-500/20 text-info-400 border-info-500/30">~{modified}</Badge>}
          {removed > 0 && <Badge className="bg-danger-500/20 text-danger-400 border-danger-500/30">-{removed}</Badge>}
        </div>
      </div>

      {expanded && (
        <div className="divide-y divide-neutral-800">
          {changes.map((change, idx) => (
            <div key={idx} className="p-4 font-mono text-sm">
              <div className="mb-3 flex items-center gap-2">
                {change.type === 'added' && (
                  <>
                    <Plus className="w-4 h-4 text-success-500" />
                    <span className="text-neutral-400">{change.path}</span>
                  </>
                )}
                {change.type === 'removed' && (
                  <>
                    <Minus className="w-4 h-4 text-danger-500" />
                    <span className="text-neutral-400">{change.path}</span>
                  </>
                )}
                {change.type === 'modified' && (
                  <>
                    <span className="text-info-500">~</span>
                    <span className="text-neutral-400">{change.path}</span>
                  </>
                )}
              </div>
              {change.type === 'modified' && (
                <div className="bg-neutral-800/50 rounded space-y-2 p-2">
                  <div className="text-danger-400 bg-danger-500/10 p-2 rounded">
                    - {change.oldValue}
                  </div>
                  <div className="text-success-400 bg-success-500/10 p-2 rounded">
                    + {change.newValue}
                  </div>
                </div>
              )}
              {change.type === 'added' && (
                <div className="text-success-400 bg-success-500/10 p-2 rounded">
                  {change.newValue}
                </div>
              )}
              {change.type === 'removed' && (
                <div className="text-danger-400 bg-danger-500/10 p-2 rounded">
                  {change.oldValue}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
