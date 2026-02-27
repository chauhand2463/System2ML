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
  Shield, Zap, DollarSign, Leaf, Clock, Target, Check
} from 'lucide-react'

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

  useEffect(() => {
    if (!canProceedToDesign) {
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
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">Pipeline Selection</h1>
            <p className="text-neutral-400">
              Select a feasible pipeline to proceed to training
            </p>
          </div>

          {/* Dataset Summary */}
          <Card className="bg-neutral-900/50 border-white/5 mb-6">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
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
                <Badge className="bg-emerald-500/20 text-emerald-400">
                  {feasiblePipelines.length} Feasible
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Pipeline Cards */}
          <div className="space-y-4">
            {pipelineCandidates.map((candidate) => {
              const isSelected = selectedId === candidate.id
              const isFeasible = candidate.isFeasible

              return (
                <Card
                  key={candidate.id}
                  className={`bg-neutral-900/50 border transition-all cursor-pointer ${isSelected
                    ? 'border-brand-500 ring-1 ring-brand-500'
                    : isFeasible
                      ? 'border-neutral-700 hover:border-emerald-500/50'
                      : 'border-red-500/20 opacity-60'
                    }`}
                  onClick={() => isFeasible && handleValidateAndSelect(candidate)}
                >
                  <CardContent className="pt-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-4">
                        <div className={`p-2 rounded-lg ${isFeasible ? 'bg-emerald-500/20' : 'bg-red-500/20'
                          }`}>
                          {isFeasible ? (
                            <CheckCircle className="w-5 h-5 text-emerald-400" />
                          ) : (
                            <AlertTriangle className="w-5 h-5 text-red-400" />
                          )}
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-white">{candidate.name}</h3>
                          <p className="text-neutral-400 text-sm">{candidate.description}</p>

                          {/* Model Family Badge */}
                          <div className="mt-2">
                            <Badge className="bg-brand-500/20 text-brand-400">
                              {candidate.modelFamily}
                            </Badge>
                          </div>
                        </div>
                      </div>

                      {/* Metrics */}
                      <div className="grid grid-cols-4 gap-4 text-right">
                        <div>
                          <p className="text-xs text-neutral-500">Est. Cost</p>
                          <p className="text-white font-medium">${candidate.estimatedCost}</p>
                        </div>
                        <div>
                          <p className="text-xs text-neutral-500">Est. Carbon</p>
                          <p className="text-white font-medium">{candidate.estimatedCarbon}kg</p>
                        </div>
                        <div>
                          <p className="text-xs text-neutral-500">Est. Latency</p>
                          <p className="text-white font-medium">{candidate.estimatedLatencyMs}ms</p>
                        </div>
                        <div>
                          <p className="text-xs text-neutral-500">Est. Accuracy</p>
                          <p className="text-white font-medium">{(candidate.estimatedAccuracy * 100).toFixed(0)}%</p>
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