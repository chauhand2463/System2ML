'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { useDesign } from '@/hooks/use-design'
import { useWorkflow } from '@/hooks/use-workflow'
import { createTrainingPlan, TrainingPlanResponse } from '@/lib/api'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import {
  Database, ArrowRight, ArrowLeft, CheckCircle, AlertTriangle,
  Shield, Zap, DollarSign, Leaf, Clock, Play, Loader2, Target,
  HardDrive, Gauge, Wifi
} from 'lucide-react'

export default function TrainingPlanPage() {
  const router = useRouter()
  const { dataset, constraints, selectedPipeline, setDesignStep } = useDesign()
  const { projectId } = useWorkflow()

  const [loading, setLoading] = useState(true)
  const [plan, setPlan] = useState<TrainingPlanResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [starting, setStarting] = useState(false)

  useEffect(() => {
    if (!selectedPipeline) {
      router.push('/design/results')
      return
    }

    const fetchPlan = async () => {
      setLoading(true)
      setError(null)

      if (!projectId) {
        setError('Select a project before creating a training plan.');
        setLoading(false);
        return;
      }

      try {
        const result = await createTrainingPlan({
          project_id: projectId,
          pipeline_id: selectedPipeline.id,
          model_type: selectedPipeline.modelFamily,
          dataset_rows: dataset?.rows || 10000,
          estimated_epochs: 100,
        })

        setPlan(result)
      } catch (err: any) {
        console.error('Plan error:', err)
        setError(err.message || 'Failed to generate training plan')
      } finally {
        setLoading(false)
      }
    }

    fetchPlan()
  }, [selectedPipeline, dataset, router])

  const handleStartTraining = () => {
    if (plan?.status !== 'approved') return

    setStarting(true)
    // Save plan to localStorage for the running page
    localStorage.setItem('system2ml_training_plan', JSON.stringify(plan))
    localStorage.setItem('system2ml_selected_pipeline', JSON.stringify(selectedPipeline))

    // Navigate to running page
    router.push('/train/running')
  }

  const isApproved = plan?.status === 'approved'
  const hasViolations = plan?.violations && plan.violations.length > 0

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-[60vh]">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin text-brand-400 mx-auto mb-4" />
            <p className="text-neutral-400">Generating training plan...</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  if (error) {
    return (
      <DashboardLayout>
        <div className="p-8 max-w-4xl mx-auto">
          <Card className="bg-red-500/10 border-red-500/20">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3 text-red-400">
                <AlertTriangle className="w-6 h-6" />
                <p className="font-medium">{error}</p>
              </div>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => router.push('/design/results')}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Pipeline Selection
              </Button>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="p-8 min-h-screen">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">Training Plan</h1>
            <p className="text-neutral-400">
              Review estimated resources and constraints before starting training
            </p>
          </div>

          {/* Status Banner */}
          {isApproved ? (
            <div className="mb-6 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
              <div className="flex items-center gap-3 text-emerald-400">
                <CheckCircle className="w-6 h-6" />
                <div>
                  <p className="font-semibold">Training Plan Approved</p>
                  <p className="text-sm text-emerald-400/70">All constraints are within limits</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20">
              <div className="flex items-center gap-3 text-red-400">
                <AlertTriangle className="w-6 h-6" />
                <div>
                  <p className="font-semibold">Training Plan Blocked</p>
                  <p className="text-sm text-red-400/70">Fix constraint violations to proceed</p>
                </div>
              </div>
            </div>
          )}

          {/* Violations */}
          {hasViolations && (
            <Card className="mb-6 bg-red-500/10 border-red-500/20">
              <CardHeader>
                <CardTitle className="text-red-400 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5" />
                  Constraint Violations
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {plan?.violations?.map((violation, i) => (
                  <div key={i} className="p-4 rounded-lg bg-red-500/5 border border-red-500/10">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-white font-medium capitalize">{violation.metric}</p>
                        <p className="text-sm text-neutral-400">
                          Estimated: {violation.estimated.toFixed(2)} | Limit: {violation.limit.toFixed(2)}
                        </p>
                      </div>
                      <Badge variant="outline" className="border-red-500/30 text-red-400">
                        Violation
                      </Badge>
                    </div>
                    <p className="text-sm text-neutral-500 mt-2">
                      Suggestion: {violation.suggestion?.replace(/_/g, ' ')}
                    </p>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Estimates */}
          <Card className="mb-6 bg-neutral-900/50 border-white/5">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Gauge className="w-5 h-5 text-brand-400" />
                Resource Estimates
              </CardTitle>
              <CardDescription className="text-neutral-400">
                Based on {plan?.plan?.dataset_rows?.toLocaleString() || dataset?.rows?.toLocaleString() || '10,000'} rows
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {/* Cost */}
                <div className="p-4 rounded-xl bg-neutral-800/50">
                  <div className="flex items-center gap-2 text-neutral-400 mb-2">
                    <DollarSign className="w-4 h-4" />
                    <span className="text-sm">Estimated Cost</span>
                  </div>
                  <p className="text-2xl font-bold text-white">
                    ${plan?.plan?.estimated_cost_usd?.toFixed(2) || '0.00'}
                  </p>
                  <p className="text-xs text-neutral-500 mt-1">
                    Limit: ${constraints.maxCostUsd}
                  </p>
                  {(plan?.plan?.estimated_cost_usd || 0) <= constraints.maxCostUsd ? (
                    <CheckCircle className="w-4 h-4 text-emerald-400 mt-2" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-red-400 mt-2" />
                  )}
                </div>

                {/* Carbon */}
                <div className="p-4 rounded-xl bg-neutral-800/50">
                  <div className="flex items-center gap-2 text-neutral-400 mb-2">
                    <Leaf className="w-4 h-4" />
                    <span className="text-sm">Carbon Emissions</span>
                  </div>
                  <p className="text-2xl font-bold text-white">
                    {plan?.plan?.estimated_carbon_kg?.toFixed(3) || '0.000'} kg
                  </p>
                  <p className="text-xs text-neutral-500 mt-1">
                    Limit: {constraints.maxCarbonKg} kg
                  </p>
                  {(plan?.plan?.estimated_carbon_kg || 0) <= constraints.maxCarbonKg ? (
                    <CheckCircle className="w-4 h-4 text-emerald-400 mt-2" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-red-400 mt-2" />
                  )}
                </div>

                {/* Time */}
                <div className="p-4 rounded-xl bg-neutral-800/50">
                  <div className="flex items-center gap-2 text-neutral-400 mb-2">
                    <Clock className="w-4 h-4" />
                    <span className="text-sm">Estimated Time</span>
                  </div>
                  <p className="text-2xl font-bold text-white">
                    {Math.round((plan?.plan?.estimated_time_ms || 0) / 1000)}s
                  </p>
                  <p className="text-xs text-neutral-500 mt-1">
                    Limit: {Math.round(constraints.maxLatencyMs / 1000)}s
                  </p>
                  {(plan?.plan?.estimated_time_ms || 0) <= constraints.maxLatencyMs ? (
                    <CheckCircle className="w-4 h-4 text-emerald-400 mt-2" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-red-400 mt-2" />
                  )}
                </div>

                {/* Memory */}
                <div className="p-4 rounded-xl bg-neutral-800/50">
                  <div className="flex items-center gap-2 text-neutral-400 mb-2">
                    <HardDrive className="w-4 h-4" />
                    <span className="text-sm">Peak Memory</span>
                  </div>
                  <p className="text-2xl font-bold text-white">
                    {plan?.plan?.peak_memory_mb || 0} MB
                  </p>
                  <p className="text-xs text-neutral-500 mt-1">
                    Recommended: 4GB
                  </p>
                  {(plan?.plan?.peak_memory_mb || 0) <= 4096 ? (
                    <CheckCircle className="w-4 h-4 text-emerald-400 mt-2" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-red-400 mt-2" />
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Pipeline Info */}
          <Card className="mb-6 bg-neutral-900/50 border-white/5">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Zap className="w-5 h-5 text-brand-400" />
                Selected Pipeline
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white font-semibold">{selectedPipeline?.name || 'Pipeline'}</p>
                  <p className="text-sm text-neutral-400">{selectedPipeline?.modelFamily}</p>
                </div>
                <div className="text-right">
                  <Badge className="bg-brand-500/20 text-brand-400">
                    Est. Accuracy: {(selectedPipeline?.estimatedAccuracy || 0.85) * 100}%
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex justify-between">
            <Button
              variant="outline"
              onClick={() => router.push('/design/results')}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Pipeline Selection
            </Button>

            {isApproved ? (
              <Button
                onClick={handleStartTraining}
                disabled={starting}
                className="bg-gradient-to-r from-brand-500 to-brand-600"
              >
                {starting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Starting...
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 mr-2" />
                    Start Training
                  </>
                )}
              </Button>
            ) : (
              <Button
                disabled
                className="bg-neutral-700 cursor-not-allowed"
              >
                <AlertTriangle className="w-4 h-4 mr-2" />
                Fix Violations to Proceed
              </Button>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
