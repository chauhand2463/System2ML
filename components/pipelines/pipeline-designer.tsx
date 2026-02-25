'use client'

import { useState } from 'react'
import type { Pipeline, PipelineNode } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Trash2, Plus, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

interface PipelineDesignerProps {
  pipeline: Pipeline
}

export function PipelineDesigner({ pipeline }: PipelineDesignerProps) {
  const [selectedNode, setSelectedNode] = useState<PipelineNode | null>(
    pipeline.nodes[0] || null
  )

  const getNodeColor = (type: PipelineNode['type']) => {
    switch (type) {
      case 'source':
        return 'bg-info-500/10 border-info-500 text-info-600'
      case 'transform':
        return 'bg-brand-500/10 border-brand-500 text-brand-400'
      case 'model':
        return 'bg-brand-600/10 border-brand-600 text-brand-300'
      case 'sink':
        return 'bg-success-500/10 border-success-500 text-success-600'
      case 'monitor':
        return 'bg-warning-500/10 border-warning-500 text-warning-600'
      default:
        return 'bg-neutral-600/10 border-neutral-600 text-neutral-400'
    }
  }

  const getTypeLabel = (type: PipelineNode['type']) => {
    const labels: Record<PipelineNode['type'], string> = {
      source: 'Data Source',
      transform: 'Transform',
      model: 'ML Model',
      sink: 'Sink',
      monitor: 'Monitor',
    }
    return labels[type]
  }

  return (
    <div className="flex h-full gap-6">
      {/* Canvas Area */}
      <div className="flex-1 rounded-lg border border-neutral-800 bg-neutral-900 p-6 overflow-hidden">
        <div className="relative w-full h-full bg-neutral-950 rounded-lg border border-dashed border-neutral-800 flex items-center justify-center">
          {pipeline.nodes.length === 0 ? (
            <div className="text-center">
              <p className="text-neutral-500 mb-4">No nodes yet</p>
              <Button
                variant="outline"
                size="sm"
                className="border-neutral-700 text-neutral-300 hover:bg-neutral-800"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Node
              </Button>
            </div>
          ) : (
            <>
              <svg className="w-full h-full absolute inset-0">
                {/* Draw edges */}
                {pipeline.edges.map((edge, idx) => {
                  const sourceNode = pipeline.nodes.find((n) => n.id === edge.source)
                  const targetNode = pipeline.nodes.find((n) => n.id === edge.target)

                  if (!sourceNode?.position || !targetNode?.position) return null

                  const x1 = sourceNode.position.x + 100
                  const y1 = sourceNode.position.y + 40
                  const x2 = targetNode.position.x
                  const y2 = targetNode.position.y + 40

                  return (
                    <line
                      key={`edge-${idx}`}
                      x1={x1}
                      y1={y1}
                      x2={x2}
                      y2={y2}
                      stroke="#6b8ef4"
                      strokeWidth="2"
                    />
                  )
                })}
              </svg>

              {/* Render nodes */}
              <div className="absolute inset-0 w-full h-full">
                {pipeline.nodes.map((node) => (
                  <button
                    key={node.id}
                    onClick={() => setSelectedNode(node)}
                    style={{
                      left: `${node.position?.x || 0}px`,
                      top: `${node.position?.y || 0}px`,
                    }}
                    className={cn(
                      'absolute w-24 h-20 rounded-lg border-2 p-2 text-center flex flex-col items-center justify-center text-xs font-medium cursor-pointer transition-all hover:shadow-lg',
                      selectedNode?.id === node.id
                        ? `${getNodeColor(node.type)} ring-2 ring-offset-2 ring-offset-neutral-950`
                        : `${getNodeColor(node.type)}`
                    )}
                  >
                    <div className="font-bold capitalize">{node.type}</div>
                    <div className="text-xs truncate">{node.name}</div>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Sidebar - Node Properties */}
      <div className="w-80 rounded-lg border border-neutral-800 bg-neutral-900 p-6 flex flex-col">
        <h3 className="text-sm font-bold text-white mb-4 uppercase">Node Properties</h3>

        {selectedNode ? (
          <div className="flex-1 space-y-4">
            {/* Node Type */}
            <div>
              <label className="block text-xs font-medium text-neutral-400 mb-2">
                Type
              </label>
              <div className="px-3 py-2 rounded-lg bg-neutral-800 border border-neutral-700 text-sm text-white">
                {getTypeLabel(selectedNode.type)}
              </div>
            </div>

            {/* Node Name */}
            <div>
              <label className="block text-xs font-medium text-neutral-400 mb-2">
                Name
              </label>
              <input
                type="text"
                value={selectedNode.name}
                readOnly
                className="w-full px-3 py-2 rounded-lg bg-neutral-800 border border-neutral-700 text-sm text-white"
              />
            </div>

            {/* Configuration */}
            <div>
              <label className="block text-xs font-medium text-neutral-400 mb-2">
                Configuration
              </label>
              <div className="p-3 rounded-lg bg-neutral-800 text-xs font-mono text-neutral-300 max-h-32 overflow-y-auto">
                {JSON.stringify(selectedNode.config, null, 2)}
              </div>
            </div>

            {/* Inputs/Outputs */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-neutral-400 mb-2">
                  Inputs
                </label>
                <div className="p-2 rounded-lg bg-neutral-800 text-xs text-neutral-300">
                  {selectedNode.inputs.length === 0 ? (
                    <span className="text-neutral-500">None</span>
                  ) : (
                    selectedNode.inputs.map((input) => (
                      <div key={input} className="truncate">
                        {input}
                      </div>
                    ))
                  )}
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-neutral-400 mb-2">
                  Outputs
                </label>
                <div className="p-2 rounded-lg bg-neutral-800 text-xs text-neutral-300">
                  {selectedNode.outputs.length === 0 ? (
                    <span className="text-neutral-500">None</span>
                  ) : (
                    selectedNode.outputs.map((output) => (
                      <div key={output} className="truncate">
                        {output}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            <div className="flex-1" />

            <button className="w-full px-4 py-2 rounded-lg bg-danger-500/10 border border-danger-500 text-danger-500 hover:bg-danger-500/20 transition-colors font-medium text-sm flex items-center justify-center gap-2">
              <Trash2 className="w-4 h-4" />
              Delete Node
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-center">
            <p className="text-neutral-500 text-sm">Select a node to view properties</p>
          </div>
        )}
      </div>
    </div>
  )
}
