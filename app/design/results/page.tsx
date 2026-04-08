'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { useDesign, PipelineCandidate } from '@/hooks/use-design'
import { validateExecution } from '@/lib/api'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useWorkflow } from '@/hooks/use-workflow'
import {
  Database, ArrowRight, ArrowLeft, CheckCircle, AlertTriangle,
  Shield, Zap, DollarSign, Leaf, Clock, Target, Check, Trophy, Star
} from 'lucide-react'
import { cn } from '@/lib/utils'

export default function DesignResultsPage() {
  const router = useRouter()
  const {
    dataset, constraints, pipelineCandidates, setSelectedPipeline,
    setSafetyGatePassed, setDesignStep, canProceedToDesign
  } = useDesign()
  const { projectId } = useWorkflow()

  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [safetyValidated, setSafetyValidated] = useState(false)
  const [validating, setValidating] = useState(false)
  const [sortBy, setSortBy] = useState<'cost' | 'carbon' | 'latency' | 'accuracy'>('accuracy')

  useEffect(() => {
    if (!canProceedToDesign()) {
      router.push('/datasets/new')
    }
  }, [canProceedToDesign, router])

  if (!dataset || pipelineCandidates.length === 0) {
    return (
      <DashboardLayout>
        <div className="p-8 min-h-screen flex items-center justify-center">
          <div className="text-center">
            <AlertTriangle className="w-12 h-12 text-neutral-600 mx-auto mb-4" />
            <p className="text-neutral-400 mb-4">No pipeline candidates available</p>
            <Button onClick={() => router.push('/design/review')}>
              Go Back to Review
            </Button>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  const selectedPipeline = pipelineCandidates.find(c => c.id === selectedId)
  const feasiblePipelines = pipelineCandidates.filter(c => c.isFeasible)
  
  const sortedCandidates = [...pipelineCandidates].sort((a, b) => {
    switch (sortBy) {
      case 'cost': return a.estimatedCost - b.estimatedCost
      case 'carbon': return a.estimatedCarbon - b.estimatedCarbon
      case 'latency': return a.estimatedLatencyMs - b.estimatedLatencyMs
      case 'accuracy': return b.estimatedAccuracy - a.estimatedAccuracy
      default: return 0
    }
  })

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
        },
        projectId
      )

      setSafetyValidated(result.can_execute)
      setSafetyGatePassed(result.can_execute)

      if (result.can_execute) {
        setSelectedPipeline(candidate)
        
        const modelFamily = candidate.model_families?.[0] || candidate.modelFamily || 'classical'
        
        // Debug log the model family being used
        console.log('Selected pipeline model family:', modelFamily)
        console.log('Candidate data:', candidate)
        
        // Map model family to actual model ID and display name
        // LLMs get HuggingFace IDs, Classical ML models get null (use local training)
        const modelMap: Record<string, { id: string | null, name: string, type: 'llm' | 'ml' }> = {
          // LLMs (transformer-based) - explicit mapping
          'transformer': { id: 'meta-llama/Llama-3.1-8B-Instruct', name: 'LLaMA 3.1 8B', type: 'llm' },
          'llama': { id: 'meta-llama/Llama-3.1-8B-Instruct', name: 'LLaMA 3.1 8B', type: 'llm' },
          'phi': { id: 'microsoft/phi-2', name: 'Phi-2', type: 'llm' },
          'small_deep': { id: 'microsoft/Phi-3-mini-4k-instruct', name: 'Phi-3 Mini', type: 'llm' },
          'mistral': { id: 'mistralai/Mistral-7B-Instruct-v0.3', name: 'Mistral 7B', type: 'llm' },
          'compressed': { id: 'microsoft/phi-2', name: 'Phi-2', type: 'llm' },
          
          // Classical ML (no HF model - use local training)
          'classical': { id: null, name: 'Random Forest', type: 'ml' },
          'random_forest': { id: null, name: 'Random Forest', type: 'ml' },
          'xgboost': { id: null, name: 'XGBoost', type: 'ml' },
          'logistic_regression': { id: null, name: 'Logistic Regression', type: 'ml' },
        }
        
        const modelInfo = modelMap[modelFamily]
        
        // If modelInfo is undefined, use a default LLM (llama)
        const finalModelInfo = modelInfo || { id: 'meta-llama/Meta-Llama-3.1-8B-Instruct', name: 'LLaMA 3.1 8B', type: 'llm' }
        
        console.log('Mapped model info:', finalModelInfo)
        
        // Determine task type from dataset
        const taskType = (dataset as any)?.labelType || 'classification'
        
        // Determine training method based on model type and budget
        const getTrainingMethod = () => {
          if (finalModelInfo.type === 'ml') return 'classical'
          // For LLMs: QLoRA for low budget (<$10), LoRA for normal budget
          return candidate.estimatedCost < 10 ? 'qlora' : 'lora'
        }
        
        // Save training target for Colab notebook generation
        const trainingTarget = {
          // Only set base_model for LLMs, null for classical ML
          base_model: finalModelInfo.type === 'llm' ? finalModelInfo.id : 'microsoft/phi-2',
          model_name: finalModelInfo.name,
          model_type: finalModelInfo.type,
          method: getTrainingMethod(),
          task_type: taskType,
          dataset_format: 'csv',
          max_budget_usd: candidate.estimatedCost,
        }
        
        console.log('Saving training target:', trainingTarget)
        localStorage.setItem('system2ml_training_target', JSON.stringify(trainingTarget))
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
    <DashboardLayout>
      <div className="p-8 min-h-screen">
        <div className="max-w-5xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-2 text-brand-400 text-xs font-mono tracking-widest uppercase mb-2">
              <Trophy className="w-4 h-4" /><span>Pipeline Selection</span>
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">Select Your Pipeline</h1>
            <p className="text-neutral-400">
              Choose a feasible pipeline that meets your constraints
            </p>
          </div>

          {/* Dataset Summary */}
          <Card className="bg-neutral-900/50 border-white/5 mb-6">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-4">
                  <div className="p-2 rounded-lg bg-brand-500/20">
                    <Database className="w-5 h-5 text-brand-400" />
                  </div>
                  <div>
                    <p className="text-white font-medium">{dataset.name}</p>
                    <p className="text-neutral-400 text-sm">
                      {dataset.sizeMb > 1 ? `${dataset.sizeMb.toFixed(1)} MB` : `${(dataset.sizeMb * 1024).toFixed(1)} KB`} • {constraints.maxCarbonKg}kg • {constraints.maxLatencyMs}ms
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
                    {feasiblePipelines.length} Feasible
                  </Badge>
                  <Badge className="bg-neutral-700/20 text-neutral-400">
                    {pipelineCandidates.length} Total
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Sort Options */}
          <div className="flex items-center gap-2 mb-4">
            <span className="text-sm text-neutral-500">Sort by:</span>
            {(['accuracy', 'cost', 'carbon', 'latency'] as const).map(sort => (
              <button key={sort} onClick={() => setSortBy(sort)}
                className={cn('px-3 py-1.5 rounded-lg text-xs font-medium transition-all capitalize',
                  sortBy === sort ? 'bg-brand-500 text-white' : 'bg-neutral-800 text-neutral-400 hover:text-white')}>
                {sort}
              </button>
            ))}
          </div>

          {/* Pipeline Cards */}
          <div className="space-y-4">
            {sortedCandidates.map((candidate, idx) => {
              const isSelected = selectedId === candidate.id
              const isFeasible = candidate.isFeasible
              const isTop = idx === 0 && isFeasible

              return (
                <Card
                  key={candidate.id}
                  className={cn('bg-neutral-900/50 border transition-all cursor-pointer',
                    isSelected ? 'border-brand-500 ring-2 ring-brand-500/30' : 
                    isFeasible ? 'border-neutral-700 hover:border-emerald-500/50' : 'border-red-500/20 opacity-60'
                  )}
                  onClick={() => isFeasible && handleValidateAndSelect(candidate)}
                >
                  <CardContent className="pt-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-4">
                        <div className="relative">
                          <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center',
                            isFeasible ? 'bg-emerald-500/20' : 'bg-red-500/20')}>
                            {isFeasible ? (
                              <CheckCircle className="w-6 h-6 text-emerald-400" />
                            ) : (
                              <AlertTriangle className="w-6 h-6 text-red-400" />
                            )}
                          </div>
                          {isTop && (
                            <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-yellow-500 flex items-center justify-center">
                              <Star className="w-3 h-3 text-white" />
                            </div>
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="text-lg font-semibold text-white">{candidate.name}</h3>
                            {isTop && <Badge className="bg-yellow-500/20 text-yellow-400 text-xs">Best Match</Badge>}
                          </div>
                          <p className="text-neutral-400 text-sm mb-2">{candidate.description}</p>
                          <div className="flex flex-wrap gap-2">
                            <Badge className="bg-brand-500/20 text-brand-400 text-xs">
                              {candidate.modelFamily}
                            </Badge>
                          </div>
                        </div>
                      </div>

                      {/* Metrics */}
                      <div className="grid grid-cols-4 gap-6 text-right">
                        <div>
                          <p className="text-xs text-neutral-500 flex items-center justify-end gap-1">
                            <DollarSign className="w-3 h-3" />Cost
                          </p>
                          <p className={cn('text-lg font-bold',
                            candidate.estimatedCost > constraints.maxCostUsd ? 'text-red-400' : 'text-white')}>
                            ₹{candidate.estimatedCost}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-neutral-500 flex items-center justify-end gap-1">
                            <Leaf className="w-3 h-3" />Carbon
                          </p>
                          <p className={cn('text-lg font-bold',
                            candidate.estimatedCarbon > constraints.maxCarbonKg ? 'text-red-400' : 'text-white')}>
                            {candidate.estimatedCarbon}kg
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-neutral-500 flex items-center justify-end gap-1">
                            <Clock className="w-3 h-3" />Latency
                          </p>
                          <p className={cn('text-lg font-bold',
                            candidate.estimatedLatencyMs > constraints.maxLatencyMs ? 'text-red-400' : 'text-white')}>
                            {candidate.estimatedLatencyMs}ms
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-neutral-500 flex items-center justify-end gap-1">
                            <Target className="w-3 h-3" />Accuracy
                          </p>
                          <p className="text-lg font-bold text-emerald-400">
                            {(candidate.estimatedAccuracy * 100).toFixed(1)}%
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Violations */}
                    {!isFeasible && candidate.violatesConstraints.length > 0 && (
                      <div className="mt-4 pt-3 border-t border-red-500/20">
                        <p className="text-sm text-red-400 mb-2">Constraint Violations:</p>
                        {candidate.violatesConstraints.map((v, i) => (
                          <div key={i} className="flex items-center gap-2 text-sm text-neutral-400">
                            <AlertTriangle className="w-3 h-3 text-red-400" />
                            {v.message}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Selection Indicator */}
                    {isSelected && safetyValidated && (
                      <div className="mt-4 pt-3 border-t border-brand-500/20">
                        <div className="flex items-center gap-2 text-brand-400">
                          <Shield className="w-4 h-4" />
                          <span className="text-sm font-medium">Safety Gate Passed</span>
                        </div>
                      </div>
                    )}

                    {/* Validating state */}
                    {isSelected && validating && (
                      <div className="mt-4 pt-3 border-t border-brand-500/20">
                        <div className="flex items-center gap-2 text-brand-400">
                          <Shield className="w-4 h-4 animate-pulse" />
                          <span className="text-sm">Validating safety constraints...</span>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>

          {/* No Feasible State */}
          {feasiblePipelines.length === 0 && (
            <Card className="bg-red-500/10 border-red-500/20 mt-6">
              <CardContent className="pt-6 text-center">
                <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-red-400 mb-2">No Feasible Pipelines</h3>
                <p className="text-neutral-400 mb-4">
                  Your constraints are too restrictive. Try adjusting them.
                </p>
                <Button onClick={handleBack} variant="outline">
                  Edit Constraints
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Navigation */}
          <div className="flex justify-between pt-6">
            <Button variant="outline" onClick={handleBack}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Review
            </Button>
            {selectedPipeline && safetyValidated && (
              <Button
                onClick={handleProceedToTraining}
                className="bg-gradient-to-r from-brand-500 to-brand-600"
              >
                Proceed to Training
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}