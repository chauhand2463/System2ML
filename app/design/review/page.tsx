'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { useDesign, PipelineCandidate as UPPipelineCandidate } from '@/hooks/use-design'
import { useWorkflow } from '@/hooks/use-workflow'
import { generateCandidates, validateExecution, PipelineCandidate as ApiPipelineCandidate, DesignRequest } from '@/lib/api'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Database, BarChart3, ArrowRight, ArrowLeft, CheckCircle, AlertTriangle,
  Shield, Zap, DollarSign, Leaf, Clock, Loader2
} from 'lucide-react'

export default function DesignReviewPage() {
  const router = useRouter()
  const {
    dataset, constraints, setConstraints, setPipelineCandidates,
    setFeasibilityPassed, setDesignStep, canProceedToDesign
  } = useDesign()
  const { projectId } = useWorkflow()

  const [generating, setGenerating] = useState(false)
  const [candidates, setCandidates] = useState<UPPipelineCandidate[]>([])
  const [feasibleCount, setFeasibleCount] = useState(0)
  const [validated, setValidated] = useState(false)

  useEffect(() => {
    if (!canProceedToDesign) {
      router.push('/datasets/new')
    }
  }, [canProceedToDesign, router])

  if (!dataset) {
    return null
  }

  const handleGenerate = async () => {
    setGenerating(true)

    try {
      const request: Partial<DesignRequest> = {
        project_id: projectId,
        data_profile: { type: dataset.type },
        objective: constraints.objective as any,
        constraints: {
          max_cost_usd: constraints.maxCostUsd,
          max_carbon_kg: constraints.maxCarbonKg,
          max_latency_ms: constraints.maxLatencyMs,
          compliance_level: constraints.complianceLevel as any,
        },
        deployment: 'batch' as const,
      }

      const result = await generateCandidates(request)

      const mappedCandidates: UPPipelineCandidate[] = result.candidates.map((c: any) => ({
        id: c.id,
        name: c.name,
        description: c.description,
        modelFamily: c.model_families?.[0] || 'classical',
        estimatedCost: c.estimated_cost,
        estimatedCarbon: c.estimated_carbon,
        estimatedLatencyMs: c.estimated_latency_ms,
        estimatedAccuracy: c.estimated_accuracy,
        violatesConstraints: c.violates_constraints || [],
        isFeasible: !c.violates_constraints?.length,
      }))

      setCandidates(mappedCandidates)
      setFeasibleCount(result.feasible_count)
      setFeasibilityPassed(result.feasible_count > 0)
      setValidated(true)
      setPipelineCandidates(mappedCandidates)

    } catch (error) {
      console.error('Generation error:', error)
    } finally {
      setGenerating(false)
    }
  }

  const handleProceedToResults = () => {
    if (feasibleCount > 0) {
      setDesignStep('results')
      router.push('/design/results')
    }
  }

  const handleBack = () => {
    router.push('/design/preferences')
  }

  return (
    <DashboardLayout>
      <div className="p-8 min-h-screen">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">Review & Validate</h1>
            <p className="text-neutral-400">
              Validate constraints and generate feasible pipeline candidates
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
                      {dataset.type} • {dataset.inferredTask}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Configuration Summary */}
          <Card className="bg-neutral-900/50 border-white/5 mb-6">
            <CardHeader>
              <CardTitle className="text-white">Configuration Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-3 rounded-lg bg-neutral-800/50">
                  <div className="flex items-center gap-2 text-neutral-400 mb-1">
                    <DollarSign className="w-3 h-3" />
                    <span className="text-xs">Max Cost</span>
                  </div>
                  <p className="text-lg font-semibold text-white">${constraints.maxCostUsd}</p>
                </div>
                <div className="p-3 rounded-lg bg-neutral-800/50">
                  <div className="flex items-center gap-2 text-neutral-400 mb-1">
                    <Leaf className="w-3 h-3" />
                    <span className="text-xs">Max Carbon</span>
                  </div>
                  <p className="text-lg font-semibold text-white">{constraints.maxCarbonKg}kg</p>
                </div>
                <div className="p-3 rounded-lg bg-neutral-800/50">
                  <div className="flex items-center gap-2 text-neutral-400 mb-1">
                    <Clock className="w-3 h-3" />
                    <span className="text-xs">Max Latency</span>
                  </div>
                  <p className="text-lg font-semibold text-white">{constraints.maxLatencyMs}ms</p>
                </div>
                <div className="p-3 rounded-lg bg-neutral-800/50">
                  <div className="flex items-center gap-2 text-neutral-400 mb-1">
                    <Zap className="w-3 h-3" />
                    <span className="text-xs">Objective</span>
                  </div>
                  <p className="text-lg font-semibold text-white capitalize">{constraints.objective}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Generate Button */}
          {!validated && (
            <Card className="bg-neutral-900/50 border-white/5">
              <CardContent className="pt-6">
                <div className="text-center">
                  <div className="w-16 h-16 rounded-2xl bg-brand-500/20 flex items-center justify-center mx-auto mb-4">
                    <Shield className="w-8 h-8 text-brand-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2">Ready to Validate</h3>
                  <p className="text-neutral-400 mb-6">
                    The system will validate your constraints and generate feasible pipeline candidates
                  </p>
                  <Button
                    onClick={handleGenerate}
                    disabled={generating}
                    className="bg-gradient-to-r from-brand-500 to-brand-600 px-8"
                    size="lg"
                  >
                    {generating ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Zap className="w-4 h-4 mr-2" />
                        Generate Pipelines
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Results */}
          {validated && (
            <div className="space-y-6">
              {/* Summary */}
              <Card className="bg-neutral-900/50 border-white/5">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {feasibleCount > 0 ? (
                        <CheckCircle className="w-6 h-6 text-emerald-400" />
                      ) : (
                        <AlertTriangle className="w-6 h-6 text-red-400" />
                      )}
                      <div>
                        <p className="text-white font-medium">
                          {feasibleCount > 0
                            ? `${feasibleCount} Feasible Pipeline${feasibleCount > 1 ? 's' : ''} Found`
                            : 'No Feasible Pipelines'
                          }
                        </p>
                        <p className="text-neutral-400 text-sm">
                          {feasibleCount > 0
                            ? 'You can proceed to select a pipeline'
                            : 'Try adjusting your constraints'
                          }
                        </p>
                      </div>
                    </div>
                    {feasibleCount > 0 && (
                      <Button
                        onClick={handleProceedToResults}
                        className="bg-gradient-to-r from-brand-500 to-brand-600"
                      >
                        View Pipelines
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Candidate Preview */}
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-neutral-400">Pipeline Candidates</h3>
                {candidates.map((candidate) => (
                  <div
                    key={candidate.id}
                    className={`p-4 rounded-xl border ${candidate.isFeasible
                      ? 'bg-emerald-500/5 border-emerald-500/20'
                      : 'bg-red-500/5 border-red-500/20'
                      }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {candidate.isFeasible ? (
                          <CheckCircle className="w-5 h-5 text-emerald-400" />
                        ) : (
                          <AlertTriangle className="w-5 h-5 text-red-400" />
                        )}
                        <div>
                          <p className="text-white font-medium">{candidate.name}</p>
                          <p className="text-neutral-400 text-sm">{candidate.description}</p>
                        </div>
                      </div>
                      <div className="flex gap-4 text-sm">
                        <span className="text-neutral-400">${candidate.estimatedCost}</span>
                        <span className="text-neutral-400">{candidate.estimatedCarbon}kg</span>
                        <span className="text-neutral-400">{candidate.estimatedLatencyMs}ms</span>
                        <span className="text-brand-400">{(candidate.estimatedAccuracy * 100).toFixed(0)}%</span>
                      </div>
                    </div>
                    {!candidate.isFeasible && candidate.violatesConstraints.length > 0 && (
                      <div className="mt-2 pt-2 border-t border-red-500/20">
                        {candidate.violatesConstraints.map((v, i) => (
                          <p key={i} className="text-xs text-red-400">{v.message}</p>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Navigation */}
          {validated && (
            <div className="flex justify-start pt-4">
              <Button variant="outline" onClick={handleBack}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Preferences
              </Button>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}