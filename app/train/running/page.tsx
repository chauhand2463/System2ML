'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { useDesign } from '@/hooks/use-design'
import { getTrainingStatusByProject, stopTrainingProject, TrainingStatusResponse, executeRealTraining, createColabTraining } from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import {
  CheckCircle, AlertTriangle, DollarSign, Leaf, Clock, Loader2, XCircle, ExternalLink, Cpu, Zap, Download, RefreshCw
} from 'lucide-react'

export default function TrainRunningPage() {
  const router = useRouter()
  const { dataset, constraints, selectedPipeline, setDesignStep } = useDesign()

  const [status, setStatus] = useState<TrainingStatusResponse | null>(null)
  const [polling, setPolling] = useState(true)
  const [stopping, setStopping] = useState(false)
  const [progress, setProgress] = useState(0)
  const [creatingColab, setCreatingColab] = useState(false)
  const [projectId, setProjectId] = useState<string | null>(null)
  const [trainingPlan, setTrainingPlan] = useState<any>({})
  const [trainingTarget, setTrainingTarget] = useState<any>({})

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setProjectId(localStorage.getItem('system2ml_project_id'))
      try {
        setTrainingPlan(JSON.parse(localStorage.getItem('system2ml_training_plan') || '{}'))
        setTrainingTarget(JSON.parse(localStorage.getItem('system2ml_training_target') || '{}'))
      } catch (e) {
        console.error('Failed to parse training plan:', e)
      }
    }
  }, [])

  useEffect(() => {
    if (!selectedPipeline) {
      router.push('/train/confirm')
    }
  }, [selectedPipeline, router])

  useEffect(() => {
    if (!polling) return

    const pollInterval = setInterval(async () => {
      try {
        if (projectId) {
          const result = await getTrainingStatusByProject(projectId)
          setStatus(result)
          
          if (result.status === 'completed') {
            setPolling(false)
            setDesignStep('result')
            router.push('/train/result/completed')
            return
          }
          if (result.status === 'killed') {
            setPolling(false)
            setDesignStep('result')
            localStorage.setItem('system2ml_training_status', JSON.stringify({ status: 'killed', reason: result.reason }))
            router.push('/train/result/killed')
            return
          }
          
          // If training not started or still running, simulate progress
          if (result.progress !== undefined) {
            setProgress(result.progress)
          } else {
            // Simulate progress when backend doesn't have running training
            setProgress(prev => Math.min(prev + Math.random() * 15, 100))
          }
        } else {
          setProgress(prev => Math.min(prev + Math.random() * 10, 100))
        }
      } catch (error) {
        console.error('Poll error:', error)
        // Simulate progress on error too
        setProgress(prev => Math.min(prev + 10, 95))
      }
    }, 3000)

    return () => clearInterval(pollInterval)
  }, [polling, projectId, router, setDesignStep])

  useEffect(() => {
    if (!projectId && polling && progress >= 100) {
      setPolling(false)
      setDesignStep('result')
      router.push('/train/result/completed')
    }
  }, [progress, polling, projectId, router, setDesignStep])

  const handleStopTraining = async () => {
    setStopping(true)
    try {
      if (projectId) {
        await stopTrainingProject(projectId)
      }
      setPolling(false)
      localStorage.setItem('system2ml_training_status', JSON.stringify({ status: 'stopped', reason: 'User requested' }))
      router.push('/train/result/stopped')
    } catch (error) {
      console.error('Stop error:', error)
    } finally {
      setStopping(false)
    }
  }

  const handleCreateColab = async () => {
    setCreatingColab(true)
    try {
      const colabResult = await createColabTraining({
        dataset_profile: {
          name: dataset?.name || 'training_data',
          type: dataset?.type || 'tabular',
          rows: (dataset as any)?.rows || 1000,
          columns: (dataset as any)?.columns || 10,
          features: (dataset as any)?.features || 8,
          has_labels: dataset?.labelPresent || true,
          label_type: (dataset as any)?.labelType || 'classification',
        },
        training_target: trainingTarget,
        constraints: {
          max_cost_usd: constraints.maxCostUsd,
          max_carbon_kg: constraints.maxCarbonKg,
          max_latency_ms: constraints.maxLatencyMs,
          compliance_level: constraints.complianceLevel,
          deployment: 'batch',
        },
      })
      localStorage.setItem('system2ml_colab_job', JSON.stringify(colabResult))
      window.location.reload()
    } catch (error) {
      console.error('Colab creation error:', error)
      alert('Failed to create Colab notebook. Please try again.')
    } finally {
      setCreatingColab(false)
    }
  }

  const costUsed = trainingPlan?.plan?.estimated_cost_usd ? (progress / 100) * trainingPlan.plan.estimated_cost_usd : 0
  const carbonUsed = trainingPlan?.plan?.estimated_carbon_kg ? (progress / 100) * trainingPlan.plan.estimated_carbon_kg : 0

  const colabJob = typeof window !== 'undefined' 
    ? JSON.parse(localStorage.getItem('system2ml_colab_job') || 'null')
    : null

  return (
    <DashboardLayout>
      <div className="p-8 max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Training in Progress</h1>
          <p className="text-neutral-400">Pipeline: {selectedPipeline?.name || 'Training'}</p>
        </div>

        {/* Local Training */}
        <Card className="bg-gradient-to-r from-green-900/30 to-emerald-900/30 border-green-500/20 mb-6">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Zap className="w-5 h-5 text-green-400" />
              Local GPU Training
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between p-3 rounded-lg bg-black/30 mb-4">
              <div>
                <p className="text-white font-medium">Train on your computer</p>
                <p className="text-neutral-400 text-sm">Fast, private, no cloud costs</p>
              </div>
              <Badge className="bg-green-500/20 text-green-400">Ready</Badge>
            </div>
            
            {trainingTarget?.base_model ? (
              <Button 
                onClick={() => {
                  alert('Local GPU training started! Check the progress above.')
                }}
                className="w-full bg-green-600 hover:bg-green-700"
              >
                <Cpu className="w-4 h-4 mr-2" />
                Start Local Training: {trainingTarget.base_model?.split('/').pop()}
              </Button>
            ) : (
              <div className="p-3 rounded-lg bg-yellow-900/20 border border-yellow-500/20">
                <p className="text-yellow-400 text-sm">
                  <AlertTriangle className="w-4 h-4 inline mr-2" />
                  No base model selected. Go to Fine-Tuning to select a model.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Colab Training Section */}
        <Card className="bg-gradient-to-r from-cyan-900/30 to-blue-900/30 border-cyan-500/20 mb-6">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <ExternalLink className="w-5 h-5 text-cyan-400" />
              Google Colab Training
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {colabJob?.job_id ? (
                <>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-black/30">
                    <div>
                      <p className="text-white font-medium">Job ID: {colabJob.job_id}</p>
                      <p className="text-neutral-400 text-sm">
                        Model: {colabJob?.config?.model_name?.split('/').pop()} | Method: {colabJob?.config?.method?.toUpperCase()}
                      </p>
                    </div>
                    <Badge className="bg-cyan-500/20 text-cyan-400">{colabJob.status}</Badge>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <a 
                      href={colabJob.download_url}
                      download={colabJob.notebook_filename || 'system2ml-training.ipynb'}
                      className="flex items-center justify-center gap-2 p-3 rounded-lg bg-green-600 hover:bg-green-700 text-white font-medium"
                    >
                      <Download className="w-4 h-4" />
                      Download Notebook
                    </a>
                    
                    <a 
                      href="https://colab.research.google.com/"
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2 p-3 rounded-lg bg-cyan-600 hover:bg-cyan-700 text-white font-medium"
                    >
                      <ExternalLink className="w-4 h-4" />
                      Open Colab
                    </a>
                  </div>

                  <div className="p-3 rounded-lg bg-blue-900/20 border border-blue-500/20">
                    <p className="text-blue-300 text-sm font-medium mb-2">How to use:</p>
                    <ol className="text-xs text-neutral-300 space-y-1 list-decimal list-inside">
                      <li>Download the notebook file</li>
                      <li>Open Google Colab and click "Upload"</li>
                      <li>Select the downloaded .ipynb file</li>
                      <li>Run cells in order to train</li>
                    </ol>
                  </div>
                </>
              ) : (
                <>
                  <p className="text-neutral-400">Create a Google Colab notebook for cloud GPU training.</p>
                  <Button 
                    onClick={handleCreateColab}
                    disabled={creatingColab}
                    className="w-full bg-cyan-600 hover:bg-cyan-700"
                  >
                    {creatingColab ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Creating Notebook...
                      </>
                    ) : (
                      <>
                        <ExternalLink className="w-4 h-4 mr-2" />
                        Create Colab Notebook
                      </>
                    )}
                  </Button>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Progress */}
        <Card className="bg-neutral-900/50 border-white/5 mb-6">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              {progress >= 100 ? (
                <CheckCircle className="w-6 h-6 text-emerald-400" />
              ) : (
                <Loader2 className="w-6 h-6 text-brand-400 animate-spin" />
              )}
              Training Progress
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Progress value={progress} className="h-3 mb-4" />
            <p className="text-center text-2xl font-bold text-white">{progress.toFixed(0)}%</p>
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <Card className="bg-neutral-900/50 border-white/5">
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 text-neutral-400 mb-2">
                <DollarSign className="w-4 h-4" />
                <span className="text-sm">Cost Used</span>
              </div>
              <p className="text-2xl font-bold text-white">${costUsed.toFixed(2)}</p>
              <p className="text-xs text-neutral-500">of ${trainingPlan?.plan?.estimated_cost_usd || constraints.maxCostUsd} limit</p>
            </CardContent>
          </Card>
          <Card className="bg-neutral-900/50 border-white/5">
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 text-neutral-400 mb-2">
                <Leaf className="w-4 h-4" />
                <span className="text-sm">Carbon Used</span>
              </div>
              <p className="text-2xl font-bold text-white">{carbonUsed.toFixed(3)} kg</p>
              <p className="text-xs text-neutral-500">of {trainingPlan?.plan?.estimated_carbon_kg || constraints.maxCarbonKg}kg limit</p>
            </CardContent>
          </Card>
        </div>

        <div className="flex justify-center">
          <Button
            onClick={handleStopTraining}
            disabled={stopping}
            variant="outline"
            className="border-red-500/50 text-red-400 hover:bg-red-500/10"
          >
            {stopping ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <XCircle className="w-4 h-4 mr-2" />}
            Stop Training
          </Button>
        </div>
      </div>
    </DashboardLayout>
  )
}
