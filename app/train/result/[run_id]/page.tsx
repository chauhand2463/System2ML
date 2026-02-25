'use client'

import { useState, useEffect } from 'react'
import { useRouter, use } from 'next/navigation'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { useDesign, TrainingRun } from '@/hooks/use-design'
import { getTrainingStatus } from '@/lib/api'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  Database, ArrowRight, CheckCircle, AlertTriangle, 
  Shield, Zap, DollarSign, Leaf, Clock, Play, Loader2, Target, 
  Download, Upload, Trash2, ExternalLink
} from 'lucide-react'

interface TrainResultPageProps {
  params: Promise<{ run_id: string }>
}

export default function TrainResultPage({ params }: TrainResultPageProps) {
  const router = useRouter()
  const { run_id } = use(params)
  const { dataset, constraints, selectedPipeline, trainingRun, setTrainingRun, resetDesign } = useDesign()
  
  const [loading, setLoading] = useState(true)
  const [run, setRun] = useState<TrainingRun | null>(null)

  useEffect(() => {
    const loadResult = async () => {
      try {
        const result = await getTrainingStatus(run_id)
        setRun(result.run)
        
        if (result.run) {
          const updatedRun: TrainingRun = {
            id: result.run.run_id,
            pipelineId: result.run.pipeline_id,
            status: result.run.status as any,
            startTime: '',
            progress: result.run.progress,
            currentStep: result.run.current_step,
            costSpent: result.run.cost_spent,
            carbonUsed: result.run.carbon_used,
            elapsedTime: result.run.elapsed_time_seconds,
            metrics: result.run.metrics,
            constraintViolations: result.run.constraint_violations,
            artifacts: result.run.artifacts,
          }
          setTrainingRun(updatedRun)
        }
      } catch (error) {
        console.error('Load error:', error)
      } finally {
        setLoading(false)
      }
    }
    
    if (run_id) {
      loadResult()
    }
  }, [run_id, setTrainingRun])

  if (loading) {
    return (
      <DashboardLayout>
        <div className="p-8 min-h-screen flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
        </div>
      </DashboardLayout>
    )
  }

  if (!run) {
    return (
      <DashboardLayout>
        <div className="p-8 min-h-screen flex items-center justify-center">
          <div className="text-center">
            <AlertTriangle className="w-12 h-12 text-neutral-600 mx-auto mb-4" />
            <p className="text-neutral-400 mb-4">Training run not found</p>
            <Button onClick={() => router.push('/design/input')}>
              Start New Design
            </Button>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  const isCompleted = run.status === 'completed'
  const isCancelled = run.status === 'cancelled' || run.status === 'failed'
  
  // Check final constraint compliance
  const finalCostPass = run.costSpent <= constraints.maxCostUsd
  const finalCarbonPass = run.carbonUsed <= constraints.maxCarbonKg
  const allPassed = finalCostPass && finalCarbonPass

  const handleNewDesign = () => {
    resetDesign()
    router.push('/datasets/new')
  }

  const handleDeploy = () => {
    // In a real app, this would trigger deployment
    alert('Deployment feature coming soon!')
  }

  return (
    <DashboardLayout>
      <div className="p-8 min-h-screen">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              {isCompleted ? (
                <CheckCircle className="w-8 h-8 text-emerald-400" />
              ) : (
                <AlertTriangle className="w-8 h-8 text-red-400" />
              )}
              <h1 className="text-3xl font-bold text-white">
                {isCompleted ? 'Training Complete' : 'Training Failed/Stopped'}
              </h1>
            </div>
            <p className="text-neutral-400">
              Run ID: {run.id}
            </p>
          </div>

          {/* Status Banner */}
          {isCompleted && !allPassed && (
            <Card className="bg-yellow-500/10 border-yellow-500/20 mb-6">
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-6 h-6 text-yellow-400 mt-0.5" />
                  <div>
                    <p className="text-yellow-400 font-medium">Model Quarantined</p>
                    <p className="text-neutral-400 text-sm mt-1">
                      The model was trained but exceeded constraint limits. It cannot be deployed.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Metrics */}
          <Card className="bg-neutral-900/50 border-white/5 mb-6">
            <CardHeader>
              <CardTitle className="text-white">Final Metrics</CardTitle>
              {run.metrics && (
                <CardDescription className="text-neutral-400">
                  Performance metrics from the trained model
                </CardDescription>
              )}
            </CardHeader>
            <CardContent>
              {run.metrics ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-4 rounded-xl bg-neutral-800/50">
                    <div className="flex items-center gap-2 text-neutral-400 mb-1">
                      <Target className="w-4 h-4" />
                      <span className="text-sm">Accuracy</span>
                    </div>
                    <p className="text-2xl font-bold text-white">
                      {((run.metrics.accuracy || 0) * 100).toFixed(1)}%
                    </p>
                  </div>
                  <div className="p-4 rounded-xl bg-neutral-800/50">
                    <div className="flex items-center gap-2 text-neutral-400 mb-1">
                      <Zap className="w-4 h-4" />
                      <span className="text-sm">F1 Score</span>
                    </div>
                    <p className="text-2xl font-bold text-white">
                      {((run.metrics.f1 || 0) * 100).toFixed(1)}%
                    </p>
                  </div>
                  <div className="p-4 rounded-xl bg-neutral-800/50">
                    <div className="flex items-center gap-2 text-neutral-400 mb-1">
                      <Shield className="w-4 h-4" />
                      <span className="text-sm">Precision</span>
                    </div>
                    <p className="text-2xl font-bold text-white">
                      {((run.metrics.precision || 0) * 100).toFixed(1)}%
                    </p>
                  </div>
                  <div className="p-4 rounded-xl bg-neutral-800/50">
                    <div className="flex items-center gap-2 text-neutral-400 mb-1">
                      <Leaf className="w-4 h-4" />
                      <span className="text-sm">Recall</span>
                    </div>
                    <p className="text-2xl font-bold text-white">
                      {((run.metrics.recall || 0) * 100).toFixed(1)}%
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-neutral-400">No metrics available (training was stopped)</p>
              )}
            </CardContent>
          </Card>

          {/* Resource Usage */}
          <Card className="bg-neutral-900/50 border-white/5 mb-6">
            <CardHeader>
              <CardTitle className="text-white">Resource Usage</CardTitle>
              <CardDescription className="text-neutral-400">
                Actual cost and carbon used during training
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 rounded-xl bg-neutral-800/50">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-neutral-400 text-sm">Cost</span>
                    {finalCostPass ? (
                      <CheckCircle className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-red-400" />
                    )}
                  </div>
                  <p className={`text-2xl font-bold ${finalCostPass ? 'text-white' : 'text-red-400'}`}>
                    ${run.costSpent.toFixed(2)}
                  </p>
                  <p className="text-xs text-neutral-500">of ${constraints.maxCostUsd}</p>
                </div>
                <div className="p-4 rounded-xl bg-neutral-800/50">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-neutral-400 text-sm">Carbon</span>
                    {finalCarbonPass ? (
                      <CheckCircle className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-red-400" />
                    )}
                  </div>
                  <p className={`text-2xl font-bold ${finalCarbonPass ? 'text-white' : 'text-red-400'}`}>
                    {run.carbonUsed.toFixed(4)}kg
                  </p>
                  <p className="text-xs text-neutral-500">of {constraints.maxCarbonKg}kg</p>
                </div>
                <div className="p-4 rounded-xl bg-neutral-800/50">
                  <span className="text-neutral-400 text-sm">Time</span>
                  <p className="text-2xl font-bold text-white mt-1">
                    {run.elapsedTime}s
                  </p>
                </div>
                <div className="p-4 rounded-xl bg-neutral-800/50">
                  <span className="text-neutral-400 text-sm">Status</span>
                  <Badge className={`mt-1 ${
                    isCompleted 
                      ? allPassed ? 'bg-emerald-500/20 text-emerald-400' : 'bg-yellow-500/20 text-yellow-400'
                      : 'bg-red-500/20 text-red-400'
                  }`}>
                    {isCompleted ? (allPassed ? 'Compliant' : 'Quarantined') : 'Failed'}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Artifacts */}
          {isCompleted && run.artifacts && allPassed && (
            <Card className="bg-neutral-900/50 border-white/5 mb-6">
              <CardHeader>
                <CardTitle className="text-white">Model Artifacts</CardTitle>
                <CardDescription className="text-neutral-400">
                  Download trained model and pipeline files
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between p-4 rounded-xl bg-neutral-800/50">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-brand-500/20">
                      <Zap className="w-5 h-5 text-brand-400" />
                    </div>
                    <div>
                      <p className="text-white font-medium">Trained Model</p>
                      <p className="text-neutral-500 text-sm">PyTorch model file</p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm">
                    <Download className="w-4 h-4 mr-2" />
                    Download
                  </Button>
                </div>
                <div className="flex items-center justify-between p-4 rounded-xl bg-neutral-800/50">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-purple-500/20">
                      <Database className="w-5 h-5 text-purple-400" />
                    </div>
                    <div>
                      <p className="text-white font-medium">Pipeline Definition</p>
                      <p className="text-neutral-500 text-sm">Pipeline DSL configuration</p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm">
                    <Download className="w-4 h-4 mr-2" />
                    Download
                  </Button>
                </div>
                <div className="flex items-center justify-between p-4 rounded-xl bg-neutral-800/50">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-emerald-500/20">
                      <Shield className="w-5 h-5 text-emerald-400" />
                    </div>
                    <div>
                      <p className="text-white font-medium">Deployment Config</p>
                      <p className="text-neutral-500 text-sm">Kubernetes / Docker config</p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm">
                    <Download className="w-4 h-4 mr-2" />
                    Download
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Quarantine Message */}
          {isCompleted && !allPassed && (
            <Card className="bg-red-500/10 border-red-500/20 mb-6">
              <CardContent className="pt-6 text-center">
                <Trash2 className="w-12 h-12 text-red-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-red-400 mb-2">Model Not Available</h3>
                <p className="text-neutral-400 mb-4">
                  This model was discarded due to constraint violations during training.
                </p>
              </CardContent>
            </Card>
          )}

          {/* Actions */}
          <div className="flex justify-between">
            <Button variant="outline" onClick={handleNewDesign}>
              Start New Design
            </Button>
            {isCompleted && run.artifacts && allPassed && (
              <Button
                onClick={handleDeploy}
                className="bg-gradient-to-r from-brand-500 to-brand-600"
              >
                <Upload className="w-4 h-4 mr-2" />
                Deploy Model
              </Button>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}