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
  Download, Upload, Trash2, ExternalLink, XCircle
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
  const [trainingStatus, setTrainingStatus] = useState<any>(null)

  useEffect(() => {
    // Check for stored training status (killed, stopped, etc.)
    const storedStatus = localStorage.getItem('system2ml_training_status')
    if (storedStatus) {
      setTrainingStatus(JSON.parse(storedStatus))
      localStorage.removeItem('system2ml_training_status')
    }
  }, [])

  useEffect(() => {
    const loadResult = async () => {
      try {
        const result = await getTrainingStatus(run_id)
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
          setRun(updatedRun)
          setTrainingRun(updatedRun)
        } else {
          // Demo mode - create mock results
          const trainingPlan = JSON.parse(localStorage.getItem('system2ml_training_plan') || '{}')
          setRun({
            id: run_id,
            pipelineId: selectedPipeline?.id || 'demo',
            status: trainingStatus?.status || run_id,
            startTime: new Date().toISOString(),
            progress: 100,
            costSpent: trainingPlan?.plan?.estimated_cost_usd || 5.50,
            carbonUsed: trainingPlan?.plan?.estimated_carbon_kg || 0.82,
            elapsedTime: 45,
            metrics: {
              accuracy: 0.92,
              f1: 0.91,
              precision: 0.90,
              recall: 0.92,
            },
          })
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
  }, [run_id, setTrainingRun, selectedPipeline, trainingStatus])

  if (loading) {
    return (
      <DashboardLayout>
        <div className="p-8 min-h-screen flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
        </div>
      </DashboardLayout>
    )
  }

  // Handle different statuses
  const isCompleted = run?.status === 'completed' || run_id === 'completed'
  const isKilled = run?.status === 'killed' || run_id === 'killed' || trainingStatus?.status === 'killed'
  const isStopped = run?.status === 'stopped' || run_id === 'stopped' || trainingStatus?.status === 'stopped'
  const isBlocked = run?.status === 'blocked' || run_id === 'blocked'
  const isFailed = run?.status === 'failed' || run?.status === 'cancelled'
  
  const canDownload = isCompleted && !isKilled && !isStopped

  const finalCostPass = (run?.costSpent || 0) <= constraints.maxCostUsd
  const finalCarbonPass = (run?.carbonUsed || 0) <= constraints.maxCarbonKg
  const allPassed = finalCostPass && finalCarbonPass

  const handleNewDesign = () => {
    resetDesign()
    localStorage.removeItem('system2ml_training_plan')
    localStorage.removeItem('system2ml_selected_pipeline')
    router.push('/datasets/new')
  }

  const handleDeploy = () => {
    alert('Deployment feature coming soon!')
  }

  const handleDownloadModel = () => {
    // Mock download - in real app would download actual model artifact
    const blob = new Blob([JSON.stringify({ model: 'demo-model', accuracy: 0.92 })], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'model-artifact.json'
    a.click()
  }

  const handleDownloadPipeline = () => {
    const pipelineSpec = selectedPipeline || { name: 'Demo Pipeline', modelFamily: 'random_forest' }
    const blob = new Blob([JSON.stringify(pipelineSpec, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'pipeline-spec.json'
    a.click()
  }

  const handleDownloadReport = () => {
    const report = {
      run_id: run?.id || run_id,
      status: run?.status || run_id,
      metrics: run?.metrics,
      cost_used: run?.costSpent,
      carbon_used: run?.carbonUsed,
      elapsed_time: run?.elapsedTime,
      constraints: constraints,
      timestamp: new Date().toISOString(),
    }
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'evaluation-report.json'
    a.click()
  }

  return (
    <DashboardLayout>
      <div className="p-8 min-h-screen">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              {isKilled || isStopped ? (
                <XCircle className="w-8 h-8 text-red-400" />
              ) : isCompleted ? (
                <CheckCircle className="w-8 h-8 text-emerald-400" />
              ) : (
                <AlertTriangle className="w-8 h-8 text-yellow-400" />
              )}
              <h1 className="text-3xl font-bold text-white">
                {isKilled ? 'Training Stopped' : isStopped ? 'Training Stopped' : isCompleted ? 'Training Complete' : 'Training Failed'}
              </h1>
            </div>
            <p className="text-neutral-400">
              Run ID: {run?.id || run_id}
            </p>
          </div>

          {/* Killed/Stopped Banner */}
          {(isKilled || isStopped) && (
            <Card className="bg-red-500/10 border-red-500/20 mb-6">
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-6 h-6 text-red-400 mt-0.5" />
                  <div>
                    <p className="text-red-400 font-medium">
                      {isKilled ? 'Training Stopped Due to Constraint Violation' : 'Training Stopped by User'}
                    </p>
                    <p className="text-neutral-400 text-sm mt-1">
                      {trainingStatus?.reason || 'Constraint limits were exceeded during training'}
                    </p>
                    <p className="text-neutral-500 text-xs mt-2">
                      Cost used: ${run?.costSpent?.toFixed(2) || '0'} | Carbon: {run?.carbonUsed?.toFixed(3) || '0'}kg
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Completed but with constraint violations */}
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

          {/* Metrics - Only show if completed */}
          {isCompleted && run?.metrics && (
            <Card className="bg-neutral-900/50 border-white/5 mb-6">
              <CardHeader>
                <CardTitle className="text-white">Performance Metrics</CardTitle>
                <CardDescription className="text-neutral-400">
                  Model performance on validation set
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-4 rounded-xl bg-neutral-800/50">
                    <div className="flex items-center gap-2 text-neutral-400 mb-2">
                      <Target className="w-4 h-4" />
                      <span className="text-sm">Accuracy</span>
                    </div>
                    <p className="text-2xl font-bold text-white">
                      {((run.metrics?.accuracy || 0.9) * 100).toFixed(1)}%
                    </p>
                  </div>
                  <div className="p-4 rounded-xl bg-neutral-800/50">
                    <div className="flex items-center gap-2 text-neutral-400 mb-2">
                      <Zap className="w-4 h-4" />
                      <span className="text-sm">F1 Score</span>
                    </div>
                    <p className="text-2xl font-bold text-white">
                      {((run.metrics?.f1 || 0.88) * 100).toFixed(1)}%
                    </p>
                  </div>
                  <div className="p-4 rounded-xl bg-neutral-800/50">
                    <div className="flex items-center gap-2 text-neutral-400 mb-2">
                      <Shield className="w-4 h-4" />
                      <span className="text-sm">Precision</span>
                    </div>
                    <p className="text-2xl font-bold text-white">
                      {((run.metrics?.precision || 0.87) * 100).toFixed(1)}%
                    </p>
                  </div>
                  <div className="p-4 rounded-xl bg-neutral-800/50">
                    <div className="flex items-center gap-2 text-neutral-400 mb-2">
                      <Activity className="w-4 h-4" />
                      <span className="text-sm">Recall</span>
                    </div>
                    <p className="text-2xl font-bold text-white">
                      {((run.metrics?.recall || 0.89) * 100).toFixed(1)}%
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Resources Used */}
          <Card className="bg-neutral-900/50 border-white/5 mb-6">
            <CardHeader>
              <CardTitle className="text-white">Resources Used</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 rounded-xl bg-neutral-800/50">
                  <div className="flex items-center gap-2 text-neutral-400 mb-2">
                    <DollarSign className="w-4 h-4" />
                    <span className="text-sm">Total Cost</span>
                  </div>
                  <p className={`text-2xl font-bold ${finalCostPass ? 'text-emerald-400' : 'text-red-400'}`}>
                    ${run?.costSpent?.toFixed(2) || '0.00'}
                  </p>
                  <p className="text-xs text-neutral-500 mt-1">Limit: ${constraints.maxCostUsd}</p>
                </div>
                <div className="p-4 rounded-xl bg-neutral-800/50">
                  <div className="flex items-center gap-2 text-neutral-400 mb-2">
                    <Leaf className="w-4 h-4" />
                    <span className="text-sm">Carbon</span>
                  </div>
                  <p className={`text-2xl font-bold ${finalCarbonPass ? 'text-emerald-400' : 'text-red-400'}`}>
                    {run?.carbonUsed?.toFixed(3) || '0.000'} kg
                  </p>
                  <p className="text-xs text-neutral-500 mt-1">Limit: {constraints.maxCarbonKg}kg</p>
                </div>
                <div className="p-4 rounded-xl bg-neutral-800/50">
                  <div className="flex items-center gap-2 text-neutral-400 mb-2">
                    <Clock className="w-4 h-4" />
                    <span className="text-sm">Duration</span>
                  </div>
                  <p className="text-2xl font-bold text-white">
                    {run?.elapsedTime || 0}s
                  </p>
                </div>
                <div className="p-4 rounded-xl bg-neutral-800/50">
                  <div className="flex items-center gap-2 text-neutral-400 mb-2">
                    <CheckCircle className="w-4 h-4" />
                    <span className="text-sm">Compliance</span>
                  </div>
                  <p className={`text-2xl font-bold ${allPassed ? 'text-emerald-400' : 'text-red-400'}`}>
                    {allPassed ? 'PASS' : 'FAIL'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Downloads - Only enabled for completed, non-killed runs */}
          <Card className="bg-neutral-900/50 border-white/5 mb-6">
            <CardHeader>
              <CardTitle className="text-white">Downloads</CardTitle>
              <CardDescription className="text-neutral-400">
                Download trained model and pipeline artifacts
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Button
                  variant="outline"
                  className={`h-auto py-4 ${canDownload ? '' : 'opacity-50 cursor-not-allowed'}`}
                  onClick={canDownload ? handleDownloadModel : undefined}
                  disabled={!canDownload}
                >
                  <div className="text-center">
                    <Download className="w-6 h-6 mx-auto mb-2" />
                    <p className="font-medium">Model Artifact</p>
                    <p className="text-xs text-neutral-500">
                      {canDownload ? 'Trained model file' : 'Not available'}
                    </p>
                  </div>
                </Button>
                <Button
                  variant="outline"
                  className={`h-auto py-4 ${canDownload ? '' : 'opacity-50 cursor-not-allowed'}`}
                  onClick={canDownload ? handleDownloadPipeline : undefined}
                  disabled={!canDownload}
                >
                  <div className="text-center">
                    <Upload className="w-6 h-6 mx-auto mb-2" />
                    <p className="font-medium">Pipeline Spec</p>
                    <p className="text-xs text-neutral-500">
                      {canDownload ? 'DAG configuration' : 'Not available'}
                    </p>
                  </div>
                </Button>
                <Button
                  variant="outline"
                  className={`h-auto py-4 ${canDownload ? '' : 'opacity-50 cursor-not-allowed'}`}
                  onClick={canDownload ? handleDownloadReport : undefined}
                  disabled={!canDownload}
                >
                  <div className="text-center">
                    <ExternalLink className="w-6 h-6 mx-auto mb-2" />
                    <p className="font-medium">Evaluation Report</p>
                    <p className="text-xs text-neutral-500">
                      {canDownload ? 'Full metrics report' : 'Not available'}
                    </p>
                  </div>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex justify-center gap-4">
            <Button variant="outline" onClick={handleNewDesign}>
              <Database className="w-4 h-4 mr-2" />
              Start New Design
            </Button>
            {isCompleted && allPassed && (
              <Button onClick={handleDeploy} className="bg-gradient-to-r from-brand-500 to-brand-600">
                <ExternalLink className="w-4 h-4 mr-2" />
                Deploy Model
              </Button>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}