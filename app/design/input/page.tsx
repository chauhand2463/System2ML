'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { TerminalLayout } from '@/components/layout/terminal-layout'
import { useDesign } from '@/hooks/use-design'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

export default function DesignInputPage() {
  const router = useRouter()
  const { dataset, canProceedToDesign, setDesignStep } = useDesign()

  useEffect(() => {
    if (!canProceedToDesign) {
      router.push('/datasets/new')
    }
  }, [canProceedToDesign, router])

  if (!dataset) {
    return null
  }

  const handleNext = () => {
    setDesignStep('constraints')
    router.push('/design/constraints')
  }

  return (
    <TerminalLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-xl font-bold text-white">
            <span className="text-cyan-400">$</span> ./design_input.sh --configure
          </h1>
          <p className="text-[#8b949e] text-sm mt-1 font-mono">
            Review dataset and configure design parameters
          </p>
        </div>

        <div className="bg-[#0d1117] border border-[#30363d] rounded">
          <div className="bg-[#161b22] px-4 py-2 border-b border-[#30363d] flex items-center justify-between">
            <span className="text-sm text-[#8b949e] font-mono">
              <span className="text-cyan-400">$</span> active_dataset
            </span>
            <Badge className="bg-emerald-500/20 text-emerald-400 text-xs">validated</Badge>
          </div>
          <div className="p-4 space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="p-3 bg-[#161b22] rounded">
                <div className="text-xs text-[#8b949e] mb-1 font-mono">
                  <span className="text-cyan-400">$</span> size
                </div>
                <div className="text-lg font-bold text-white font-mono">
                  {dataset.sizeMb.toFixed(1)} MB
                </div>
              </div>
              <div className="p-3 bg-[#161b22] rounded">
                <div className="text-xs text-[#8b949e] mb-1 font-mono">
                  <span className="text-cyan-400">$</span> rows
                </div>
                <div className="text-lg font-bold text-white font-mono">
                  {dataset.rows?.toLocaleString()}
                </div>
              </div>
              <div className="p-3 bg-[#161b22] rounded">
                <div className="text-xs text-[#8b949e] mb-1 font-mono">
                  <span className="text-cyan-400">$</span> features
                </div>
                <div className="text-lg font-bold text-white font-mono">
                  {dataset.features}
                </div>
              </div>
              <div className="p-3 bg-[#161b22] rounded">
                <div className="text-xs text-[#8b949e] mb-1 font-mono">
                  <span className="text-cyan-400">$</span> missing
                </div>
                <div className="text-lg font-bold text-white font-mono">
                  {dataset.missingValues}%
                </div>
              </div>
            </div>
            
            <div className="flex flex-wrap gap-2">
              <Badge className="bg-cyan-500/20 text-cyan-400">{dataset.type}</Badge>
              <Badge className="bg-purple-500/20 text-purple-400">{dataset.inferredTask}</Badge>
              {dataset.labelPresent && (
                <Badge className="bg-emerald-500/20 text-emerald-400">
                  label: {dataset.labelType}
                </Badge>
              )}
              {dataset.piiDetected && (
                <Badge className="bg-red-500/20 text-red-400">pii_detected</Badge>
              )}
            </div>
          </div>
        </div>

        <div className="bg-[#0d1117] border border-[#30363d] rounded">
          <div className="bg-[#161b22] px-4 py-2 border-b border-[#30363d]">
            <span className="text-sm text-[#8b949e] font-mono">
              <span className="text-cyan-400">$</span> configure_design_parameters
            </span>
          </div>
          <div className="p-4 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs text-[#8b949e] font-mono">
                  <span className="text-cyan-400">$</span> primary_objective
                </label>
                <select className="w-full px-3 py-2 bg-[#0a0a0a] border border-[#30363d] rounded text-white font-mono text-sm">
                  <option value="accuracy">maximize_accuracy</option>
                  <option value="cost">minimize_cost</option>
                  <option value="speed">minimize_latency</option>
                  <option value="carbon">minimize_carbon</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-xs text-[#8b949e] font-mono">
                  <span className="text-cyan-400">$</span> deployment_mode
                </label>
                <select className="w-full px-3 py-2 bg-[#0a0a0a] border border-[#30363d] rounded text-white font-mono text-sm">
                  <option value="batch">batch_processing</option>
                  <option value="realtime">real_time_inference</option>
                  <option value="edge">edge_deployment</option>
                </select>
              </div>
            </div>

            <div className="p-3 bg-[#1f6feb]/10 border border-[#1f6feb]/30 rounded">
              <div className="flex items-start gap-2">
                <span className="text-cyan-400">›</span>
                <div className="text-sm text-[#c9d1d9]">
                  <span className="text-white font-medium">next:</span> constraints step
                  <p className="text-[#8b949e] text-xs mt-1">
                    Set cost, carbon, and latency constraints. System will validate feasibility.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <Button
                onClick={handleNext}
                className="bg-[#238636] hover:bg-[#2ea043] text-white font-mono"
              >
                <span className="mr-2">→</span>
                continue_to_constraints
              </Button>
            </div>
          </div>
        </div>
      </div>
    </TerminalLayout>
  )
}
