'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { useDesign, TrainingRun } from '@/hooks/use-design'
import { startTraining, validateExecution } from '@/lib/api'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import {
  Database, ArrowRight, ArrowLeft, CheckCircle, AlertTriangle,
  Shield, Zap, DollarSign, Leaf, Clock, Play, Loader2, Target
} from 'lucide-react'

export default function TrainConfirmPage() {
  const router = useRouter()
  const {
    dataset, constraints, selectedPipeline, trainingRun, setTrainingRun,
    setDesignStep, canProceedToTraining
  } = useDesign()

  const [validating, setValidating] = useState(false)
  const [preTrainingCheck, setPreTrainingCheck] = useState<{
    costPass: boolean
    carbonPass: boolean
    latencyPass: boolean
    allPass: boolean
  }>({ costPass: true, carbonPass: true, latencyPass: true, allPass: true })
  const [starting, setStarting] = useState(false)
  const [started, setStarted] = useState(false)

  useEffect(() => {
    if (!canProceedToTraining) {
      router.push('/design/results')
    }
  }, [canProceedToTraining, router])

  useEffect(() => {
    // Run pre-training check
    const runPreTrainingCheck = async () => {
      if (!selectedPipeline) return

      setValidating(true)

      // Local validation
      const costPass = selectedPipeline.estimatedCost <= constraints.maxCostUsd
      const carbonPass = selectedPipeline.estimatedCarbon <= constraints.maxCarbonKg
      const latencyPass = selectedPipeline.estimatedLatencyMs <= constraints.maxLatencyMs

      setPreTrainingCheck({
        costPass,
        carbonPass,
        latencyPass,
        allPass: costPass && carbonPass && latencyPass,
      })

      // Also validate with backend
      try {
        await validateExecution(
          {
            estimated_cost: selectedPipeline.estimatedCost,
            estimated_carbon: selectedPipeline.estimatedCarbon,
            estimated_latency_ms: selectedPipeline.estimatedLatencyMs,
          },
          {
            max_cost_usd: constraints.maxCostUsd,
            max_carbon_kg: constraints.maxCarbonKg,
            max_latency_ms: constraints.maxLatencyMs,
          }
        )
      } catch (e) {
        console.error('Validation error:', e)
      }

      setValidating(false)
    }

    if (selectedPipeline) {
      runPreTrainingCheck()
    }
  }, [selectedPipeline, constraints])

  if (!dataset || !selectedPipeline) {
    return (
      <DashboardLayout>
        <div className="p-8 min-h-screen flex items-center justify-center">
          <div className="text-center">
            <AlertTriangle className="w-12 h-12 text-neutral-600 mx-auto mb-4" />
            <p className="text-neutral-400 mb-4">No pipeline selected</p>
            <Button onClick={() => router.push('/design/results')}>
              Select a Pipeline
            </Button>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  const estimatedTime = Math.round(selectedPipeline.estimatedCost * 30)

  const handleStartTraining = async () => {
    setStarting(true)

    try {
      const result = await startTraining({
        pipeline_id: selectedPipeline.id,
        dataset_id: dataset.id,
        constraints: {
          max_cost_usd: constraints.maxCostUsd,
          max_carbon_kg: constraints.maxCarbonKg,
          max_latency_ms: constraints.maxLatencyMs,
          compliance_level: constraints.complianceLevel,
        },
        estimated_cost: selectedPipeline.estimatedCost,
        estimated_carbon: selectedPipeline.estimatedCarbon,
        estimated_time_seconds: estimatedTime,
      })

      const run: TrainingRun = {
        id: result.run_id,
        pipelineId: selectedPipeline.id,
        status: 'running',
        startTime: new Date().toISOString(),
        progress: 0,
        currentStep: 'initializing',
        costSpent: 0,
        carbonUsed: 0,
        elapsedTime: 0,
        estimatedTotalTime: estimatedTime,
      }

      setTrainingRun(run)
      setStarted(true)

      // Navigate to running page
      setDesignStep('running')
      router.push('/train/running')
    } catch (error) {
      console.error('Start training error:', error)
    } finally {
      setStarting(false)
    }
  }

  const handleBack = () => {
    router.push('/design/results')
  }

  return (
    <DashboardLayout>
      <div className="p-8 min-h-screen">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">Pre-Training Resource Planning</h1>
            <p className="text-neutral-400">
              Review estimated resources and start training
            </p>
          </div>

          {/* Pipeline Summary */}
          <Card className="bg-neutral-900/50 border-white/5 mb-6">
            <CardHeader>
              <CardTitle className="text-white">Selected Pipeline</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-white">{selectedPipeline.name}</h3>
                  <p className="text-neutral-400 text-sm">{selectedPipeline.description}</p>
                  <Badge className="mt-2 bg-brand-500/20 text-brand-400">
                    {selectedPipeline.modelFamily}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Resource Estimates */}
          <Card className="bg-neutral-900/50 border-white/5 mb-6">
            <CardHeader>
              <CardTitle className="text-white">Estimated Resources</CardTitle>
              <CardDescription className="text-neutral-400">
                Predicted resource usage based on pipeline configuration
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 rounded-xl bg-neutral-800/50">
                  <div className="flex items-center gap-2 text-neutral-400 mb-1">
                    <DollarSign className="w-4 h-4" />
                    <span className="text-sm">Est. Cost</span>
                  </div>
                  <p className="text-2xl font-bold text-white">${selectedPipeline.estimatedCost}</p>
                </div>
                <div className="p-4 rounded-xl bg-neutral-800/50">
                  <div className="flex items-center gap-2 text-neutral-400 mb-1">
                    <Leaf className="w-4 h-4" />
                    <span className="text-sm">Est. Carbon</span>
                  </div>
                  <p className="text-2xl font-bold text-white">{selectedPipeline.estimatedCarbon}kg</p>
                </div>
                <div className="p-4 rounded-xl bg-neutral-800/50">
                  <div className="flex items-center gap-2 text-neutral-400 mb-1">
                    <Clock className="w-4 h-4" />
                    <span className="text-sm">Est. Time</span>
                  </div>
                  <p className="text-2xl font-bold text-white">~{estimatedTime}s</p>
                </div>
                <div className="p-4 rounded-xl bg-neutral-800/50">
                  <div className="flex items-center gap-2 text-neutral-400 mb-1">
                    <Target className="w-4 h-4" />
                    <span className="text-sm">Est. Accuracy</span>
                  </div>
                  <p className="text-2xl font-bold text-white">{(selectedPipeline.estimatedAccuracy * 100).toFixed(0)}%</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Constraint Compliance */}
          <Card className="bg-neutral-900/50 border-white/5 mb-6">
            <CardHeader>
              <CardTitle className="text-white">Constraint Compliance</CardTitle>
              <CardDescription className="text-neutral-400">
                Pre-training validation of your constraints
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {validating ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-brand-400" />
                </div>
              ) : (
                <>
                  {/* Cost */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <DollarSign className="w-4 h-4 text-neutral-400" />
                        <span className="text-neutral-300">Cost</span>
                      </div>
                      {preTrainingCheck.costPass ? (
                        <Badge className="bg-emerald-500/20 text-emerald-400">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Pass
                        </Badge>
                      ) : (
                        <Badge className="bg-red-500/20 text-red-400">
                          <AlertTriangle className="w-3 h-3 mr-1" />
                          Fail
                        </Badge>
                      )}
                    </div>
                    <Progress
                      value={(selectedPipeline.estimatedCost / constraints.maxCostUsd) * 100}
                      className={`h-2 ${preTrainingCheck.costPass ? '' : 'bg-red-500'
                        }`}
                    />
                    <p className="text-sm text-neutral-500">
                      ${selectedPipeline.estimatedCost} of ${constraints.maxCostUsd} budget
                    </p>
                  </div>

                  {/* Carbon */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Leaf className="w-4 h-4 text-neutral-400" />
                        <span className="text-neutral-300">Carbon</span>
                      </div>
                      {preTrainingCheck.carbonPass ? (
                        <Badge className="bg-emerald-500/20 text-emerald-400">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Pass
                        </Badge>
                      ) : (
                        <Badge className="bg-red-500/20 text-red-400">
                          <AlertTriangle className="w-3 h-3 mr-1" />
                          Fail
                        </Badge>
                      )}
                    </div>
                    <Progress
                      value={(selectedPipeline.estimatedCarbon / constraints.maxCarbonKg) * 100}
                      className={`h-2 ${preTrainingCheck.carbonPass ? '' : 'bg-red-500'
                        }`}
                    />
                    <p className="text-sm text-neutral-500">
                      {selectedPipeline.estimatedCarbon}kg of {constraints.maxCarbonKg}kg limit
                    </p>
                  </div>

                  {/* Latency */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-neutral-400" />
                        <span className="text-neutral-300">Latency</span>
                      </div>
                      {preTrainingCheck.latencyPass ? (
                        <Badge className="bg-emerald-500/20 text-emerald-400">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Pass
                        </Badge>
                      ) : (
                        <Badge className="bg-red-500/20 text-red-400">
                          <AlertTriangle className="w-3 h-3 mr-1" />
                          Fail
                        </Badge>
                      )}
                    </div>
                    <Progress
                      value={(selectedPipeline.estimatedLatencyMs / constraints.maxLatencyMs) * 100}
                      className={`h-2 ${preTrainingCheck.latencyPass ? '' : 'bg-red-500'
                        }`}
                    />
                    <p className="text-sm text-neutral-500">
                      {selectedPipeline.estimatedLatencyMs}ms of {constraints.maxLatencyMs}ms limit
                    </p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Warning if not all pass */}
          {!preTrainingCheck.allPass && (
            <Card className="bg-red-500/10 border-red-500/20 mb-6">
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-6 h-6 text-red-400 mt-0.5" />
                  <div>
                    <p className="text-red-400 font-medium">Constraint Violation Detected</p>
                    <p className="text-neutral-400 text-sm mt-1">
                      Some constraints will be violated during training. The system will auto-stop when limits are reached.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Navigation */}
          <div className="flex justify-between">
            <Button variant="outline" onClick={handleBack} disabled={starting}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Pipeline Selection
            </Button>
            <Button
              onClick={handleStartTraining}
              disabled={!preTrainingCheck.allPass || starting}
              className="bg-gradient-to-r from-brand-500 to-brand-600 min-w-[200px]"
            >
              {starting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Initializing Pipeline...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 mr-2" />
                  Execute Training
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}