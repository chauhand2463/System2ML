'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { TerminalLayout } from '@/components/layout/terminal-layout'
import { useDesign, PipelineCandidate } from '@/hooks/use-design'
import { validateExecution } from '@/lib/api'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

export default function DesignResultsPage() {
  const router = useRouter()
  const { 
    dataset, constraints, pipelineCandidates, setSelectedPipeline, 
    setSafetyGatePassed, setDesignStep, canProceedToDesign 
  } = useDesign()
  
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [safetyValidated, setSafetyValidated] = useState(false)
  const [validating, setValidating] = useState(false)

  useEffect(() => {
    if (!canProceedToDesign) {
      router.push('/datasets/new')
    }
  }, [canProceedToDesign, router])

  if (!dataset || pipelineCandidates.length === 0) {
    return (
      <TerminalLayout>
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="text-center">
            <p className="text-[#8b949e] mb-4 font-mono">
              <span className="text-yellow-500">!</span> no pipeline candidates available
            </p>
            <Button onClick={() => router.push('/design/review')} className="font-mono">
              ← back_to_review
            </Button>
          </div>
        </div>
      </TerminalLayout>
    )
  }

  const selectedPipeline = pipelineCandidates.find(c => c.id === selectedId)
  const feasiblePipelines = pipelineCandidates.filter(c => c.isFeasible)

  const handleValidateAndSelect = async (candidate: PipelineCandidate) => {
    setSelectedId(candidate.id)
    setValidating(true)
    
    try {
      const result = await validateExecution(
        {
          estimated_cost: candidate.estimatedCost,
          estimated_carbon: candidate.estimatedCarbon,
          estimated_latency_ms: candidate.estimatedLatencyMs,
        },
        {
          max_cost_usd: constraints.maxCostUsd,
          max_carbon_kg: constraints.maxCarbonKg,
          max_latency_ms: constraints.maxLatencyMs,
        }
      )
      
      setSafetyValidated(result.can_execute)
      setSafetyGatePassed(result.can_execute)
      
      if (result.can_execute) {
        setSelectedPipeline(candidate)
      }
    } catch (error) {
      console.error('Validation error:', error)
    } finally {
      setValidating(false)
    }
  }

  const handleProceedToTraining = () => {
    if (selectedPipeline && safetyValidated) {
      setDesignStep('confirm')
      router.push('/train/confirm')
    }
  }

  const handleBack = () => {
    router.push('/design/review')
  }

  return (
    <TerminalLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-xl font-bold text-white">
            <span className="text-cyan-400">$</span> ./pipeline_selection.sh
          </h1>
          <p className="text-[#8b949e] text-sm mt-1 font-mono">
            Select a feasible pipeline to proceed to training
          </p>
        </div>

        <div className="bg-[#0d1117] border border-[#30363d] rounded">
          <div className="bg-[#161b22] px-4 py-2 border-b border-[#30363d] flex items-center justify-between">
            <span className="text-sm text-[#8b949e] font-mono">
              <span className="text-cyan-400">$</span> active_dataset
            </span>
            <Badge className="bg-emerald-500/20 text-emerald-400 text-xs">
              {feasiblePipelines.length} feasible
            </Badge>
          </div>
          <div className="p-4">
            <div className="flex items-center gap-3">
              <span className="text-cyan-400">›</span>
              <div>
                <p className="text-white font-medium">{dataset.name}</p>
                <p className="text-[#8b949e] text-sm">
                  ${constraints.maxCostUsd} • {constraints.maxCarbonKg}kg • {constraints.maxLatencyMs}ms
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          {pipelineCandidates.map((candidate) => {
            const isSelected = selectedId === candidate.id
            const isFeasible = candidate.isFeasible
            
            return (
              <div 
                key={candidate.id}
                className={`p-4 border rounded cursor-pointer transition-all ${
                  isSelected 
                    ? 'border-cyan-500 bg-cyan-500/10' 
                    : isFeasible 
                      ? 'border-[#30363d] hover:border-emerald-500/50 bg-[#0d1117]' 
                      : 'border-red-500/20 opacity-60 bg-[#0d1117]'
                }`}
                onClick={() => isFeasible && handleValidateAndSelect(candidate)}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-cyan-400 font-mono">{candidate.name}</span>
                    {isFeasible && (
                      <Badge className="bg-emerald-500/20 text-emerald-400 text-xs">feasible</Badge>
                    )}
                    {!isFeasible && (
                      <Badge className="bg-red-500/20 text-red-400 text-xs">infeasible</Badge>
                    )}
                  </div>
                  {isSelected && (
                    <span className="text-emerald-400 text-sm">selected</span>
                  )}
                </div>
                
                <div className="grid grid-cols-3 gap-3 text-sm">
                  <div>
                    <span className="text-[#8b949e]">cost:</span>
                    <span className="text-white ml-2 font-mono">${candidate.estimatedCost}</span>
                  </div>
                  <div>
                    <span className="text-[#8b949e]">carbon:</span>
                    <span className="text-white ml-2 font-mono">{candidate.estimatedCarbon}kg</span>
                  </div>
                  <div>
                    <span className="text-[#8b949e]">latency:</span>
                    <span className="text-white ml-2 font-mono">{candidate.estimatedLatencyMs}ms</span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-1 mt-3">
                  {candidate.components?.map((comp, i) => (
                    <Badge key={i} className="bg-[#161b22] text-[#8b949e] text-xs font-mono">
                      {comp}
                    </Badge>
                  ))}
                </div>

                {isSelected && safetyValidated && (
                  <div className="mt-3 pt-3 border-t border-emerald-500/20">
                    <div className="flex items-center gap-2 text-emerald-400 text-sm font-mono">
                      <span>✓</span> safety_gate_passed
                    </div>
                  </div>
                )}

                {validating && isSelected && (
                  <div className="mt-3 text-[#8b949e] text-sm animate-pulse">
                    validating...
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {feasiblePipelines.length === 0 && (
          <div className="p-4 bg-red-500/10 border border-red-500/30 rounded">
            <p className="text-red-400 text-center font-mono">
              <span className="text-red-500">!</span> no feasible pipelines - adjust constraints
            </p>
          </div>
        )}

        <div className="flex justify-between">
          <Button variant="outline" onClick={handleBack} className="font-mono border-[#30363d]">
            <span className="mr-2">←</span>
            back_to_review
          </Button>
          {selectedPipeline && safetyValidated && (
            <Button
              onClick={handleProceedToTraining}
              className="bg-[#238636] hover:bg-[#2ea043] text-white font-mono"
            >
              <span className="mr-2">→</span>
              proceed_to_training
            </Button>
          )}
        </div>
      </div>
    </TerminalLayout>
  )
}
