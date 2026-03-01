'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { useDesign } from '@/hooks/use-design'
import { getTrainingStatusByProject, stopTrainingProject, TrainingStatusResponse, getColabJob } from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import {
  CheckCircle, AlertTriangle, DollarSign, Leaf, Clock, Loader2, XCircle, ExternalLink, Cpu
} from 'lucide-react'

export default function TrainRunningPage() {
  const router = useRouter()
  const { dataset, constraints, selectedPipeline, setDesignStep } = useDesign()

  const [status, setStatus] = useState<TrainingStatusResponse | null>(null)
  const [polling, setPolling] = useState(true)
  const [stopping, setStopping] = useState(false)
  const [progress, setProgress] = useState(0)

  const projectId = typeof window !== 'undefined' ? localStorage.getItem('system2ml_project_id') : null
  const trainingPlan = typeof window !== 'undefined'
    ? JSON.parse(localStorage.getItem('system2ml_training_plan') || '{}')
    : {}

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
          if (result.progress !== undefined) setProgress(result.progress)

          if (result.status === 'completed') {
            setPolling(false)
            setDesignStep('result')
            router.push('/train/result/completed')
          }
          if (result.status === 'killed') {
            setPolling(false)
            setDesignStep('result')
            localStorage.setItem('system2ml_training_status', JSON.stringify({ status: 'killed', reason: result.reason }))
            router.push('/train/result/killed')
          }
        } else {
          // Simulation mode
          setProgress(prev => Math.min(prev + Math.random() * 10, 100))
        }
      } catch (error) {
        console.error('Poll error:', error)
        setProgress(prev => Math.min(prev + 5, 95))
      }
    }, 3000)

    return () => clearInterval(pollInterval)
  }, [polling, projectId, router, setDesignStep])

  // Handle completion in simulation mode
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

  const costUsed = trainingPlan?.plan?.estimated_cost_usd ? (progress / 100) * trainingPlan.plan.estimated_cost_usd : 0
  const carbonUsed = trainingPlan?.plan?.estimated_carbon_kg ? (progress / 100) * trainingPlan.plan.estimated_carbon_kg : 0

  // Get Colab job info
  const colabJob = typeof window !== 'undefined' 
    ? JSON.parse(localStorage.getItem('system2ml_colab_job') || '{}')
    : {}

  return (
    <DashboardLayout>
      <div className="p-8 max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Training in Progress</h1>
          <p className="text-neutral-400">Pipeline: {selectedPipeline?.name || 'Training'}</p>
        </div>

        {/* Colab Training Section */}
        {colabJob?.job_id && (
          <Card className="bg-gradient-to-r from-cyan-900/30 to-blue-900/30 border-cyan-500/20 mb-6">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Cpu className="w-5 h-5 text-cyan-400" />
                Colab GPU Training
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 rounded-lg bg-black/30">
                  <div>
                    <p className="text-white font-medium">Job ID: {colabJob.job_id}</p>
                    <p className="text-neutral-400 text-sm">
                      Model: {colabJob?.config?.model_name} | Method: {colabJob?.config?.method?.toUpperCase()}
                    </p>
                  </div>
                  <Badge className="bg-cyan-500/20 text-cyan-400">{colabJob.status}</Badge>
                </div>
                
                {colabJob.colab_link && (
                  <a 
                    href={colabJob.colab_link} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 w-full p-3 rounded-lg bg-cyan-600 hover:bg-cyan-700 text-white font-medium"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Open in Google Colab
                  </a>
                )}
                
                <p className="text-xs text-neutral-500">
                  Click "Open in Google Colab" to start real GPU training on Colab. 
                  The training will run independently and you can monitor progress there.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

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
