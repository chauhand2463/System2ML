'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { useDesign, TrainingRun } from '@/hooks/use-design'
import { getTrainingStatus, stopTraining } from '@/lib/api'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { 
  Database, ArrowRight, ArrowLeft, CheckCircle, AlertTriangle, 
  Shield, Zap, DollarSign, Leaf, Clock, Play, Loader2, Target, 
  Pause, XCircle, Activity
} from 'lucide-react'

export default function TrainRunningPage() {
  const router = useRouter()
  const { dataset, constraints, selectedPipeline, trainingRun, setTrainingRun, setDesignStep } = useDesign()
  
  const [currentRun, setCurrentRun] = useState<TrainingRun | null>(trainingRun)
  const [polling, setPolling] = useState(true)
  const [stopping, setStopping] = useState(false)

  useEffect(() => {
    if (!trainingRun) {
      router.push('/train/confirm')
      return
    }
  }, [trainingRun, router])

  // Poll for status updates
  useEffect(() => {
    if (!polling || !currentRun || currentRun.status !== 'running') return
    
    const pollInterval = setInterval(async () => {
      try {
        const result = await getTrainingStatus(currentRun.id)
        const run = result.run
        
        const updatedRun: TrainingRun = {
          id: run.run_id,
          pipelineId: run.pipeline_id,
          status: run.status as any,
          startTime: currentRun.startTime,
          progress: run.progress,
          currentStep: run.current_step,
          costSpent: run.cost_spent,
          carbonUsed: run.carbon_used,
          elapsedTime: run.elapsed_time_seconds,
          estimatedTotalTime: run.estimated_total_time_seconds,
          metrics: run.metrics,
          constraintViolations: run.constraint_violations,
          artifacts: run.artifacts,
        }
        
        setCurrentRun(updatedRun)
        setTrainingRun(updatedRun)
        
        // Stop polling if completed or cancelled
        if (run.status === 'completed' || run.status === 'cancelled') {
          setPolling(false)
          
          // Navigate to results
          if (run.status === 'completed') {
            setDesignStep('result')
            router.push(`/train/result/${run.run_id}`)
          } else if (run.status === 'cancelled') {
            setDesignStep('result')
            router.push(`/train/result/${run.run_id}`)
          }
        }
      } catch (error) {
        console.error('Poll error:', error)
      }
    }, 2000)
    
    return () => clearInterval(pollInterval)
  }, [currentRun, polling, router, setTrainingRun, setDesignStep])

  const handleStop = async () => {
    if (!currentRun) return
    
    setStopping(true)
    try {
      await stopTraining(currentRun.id)
      setPolling(false)
    } catch (error) {
      console.error('Stop error:', error)
    } finally {
      setStopping(false)
    }
  }

  if (!currentRun || !dataset || !selectedPipeline) {
    return (
      <DashboardLayout>
        <div className="p-8 min-h-screen flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
        </div>
      </DashboardLayout>
    )
  }

  const isRunning = currentRun.status === 'running'
  const isComplete = currentRun.status === 'completed'
  const isCancelled = currentRun.status === 'cancelled'
  
  const costPercent = (currentRun.costSpent / constraints.maxCostUsd) * 100
  const carbonPercent = (currentRun.carbonUsed / constraints.maxCarbonKg) * 100
  const timePercent = currentRun.estimatedTotalTimeTime 
    ? (currentRun.elapsedTime / currentRun.estimatedTotalTime) * 100 
    : 0

  const isCostWarning = costPercent >= 80
  const isCarbonWarning = carbonPercent >= 80
  const isCostCritical = costPercent >= 100
  const isCarbonCritical = carbonPercent >= 100

  return (
    <DashboardLayout>
      <div className="p-8 min-h-screen">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              {isRunning ? (
                <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
              ) : isComplete ? (
                <CheckCircle className="w-6 h-6 text-emerald-400" />
              ) : (
                <XCircle className="w-6 h-6 text-red-400" />
              )}
              <h1 className="text-3xl font-bold text-white">
                {isRunning ? 'Training in Progress' : isComplete ? 'Training Complete' : 'Training Stopped'}
              </h1>
            </div>
            <p className="text-neutral-400">
              Run ID: {currentRun.id} • {currentRun.currentStep || 'Initializing...'}
            </p>
          </div>

          {/* Progress Card */}
          <Card className="bg-neutral-900/50 border-white/5 mb-6">
            <CardHeader>
              <CardTitle className="text-white flex items-center justify-between">
                <span>Training Progress</span>
                <Badge className={`${
                  isRunning ? 'bg-emerald-500/20 text-emerald-400' :
                  isComplete ? 'bg-brand-500/20 text-brand-400' :
                  'bg-red-500/20 text-red-400'
                }`}>
                  {currentRun.status}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Progress Bar */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-neutral-400">Overall Progress</span>
                  <span className="text-white font-medium">{(currentRun.progress * 100).toFixed(0)}%</span>
                </div>
                <Progress 
                  value={currentRun.progress * 100} 
                  className="h-3"
                />
              </div>

              {/* Current Step */}
              <div className="flex items-center gap-3 p-4 rounded-xl bg-neutral-800/50">
                <Activity className="w-5 h-5 text-brand-400" />
                <div>
                  <p className="text-white font-medium">Current Step</p>
                  <p className="text-neutral-400 capitalize">{currentRun.currentStep || 'Initializing'}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Live Resource Monitoring */}
          <Card className="bg-neutral-900/50 border-white/5 mb-6">
            <CardHeader>
              <CardTitle className="text-white">Live Resource Monitoring</CardTitle>
              <CardDescription className="text-neutral-400">
                Real-time constraint tracking during training
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Cost */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <DollarSign className={`w-4 h-4 ${isCostCritical ? 'text-red-400' : isCostWarning ? 'text-yellow-400' : 'text-neutral-400'}`} />
                    <span className="text-neutral-300">Cost Spent</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-white font-medium">${currentRun.costSpent.toFixed(2)}</span>
                    <span className="text-neutral-500">/ ${constraints.maxCostUsd}</span>
                  </div>
                </div>
                <Progress 
                  value={Math.min(costPercent, 100)} 
                  className={`h-2 ${isCostCritical ? 'bg-red-500' : isCostWarning ? 'bg-yellow-500' : ''}`}
                />
                {isCostWarning && !isCostCritical && (
                  <p className="text-xs text-yellow-400">Warning: 80% of budget used</p>
                )}
                {isCostCritical && (
                  <p className="text-xs text-red-400">Critical: Budget exceeded - training will stop</p>
                )}
              </div>

              {/* Carbon */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Leaf className={`w-4 h-4 ${isCarbonCritical ? 'text-red-400' : isCarbonWarning ? 'text-yellow-400' : 'text-neutral-400'}`} />
                    <span className="text-neutral-300">Carbon Used</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-white font-medium">{currentRun.carbonUsed.toFixed(4)}kg</span>
                    <span className="text-neutral-500">/ {constraints.maxCarbonKg}kg</span>
                  </div>
                </div>
                <Progress 
                  value={Math.min(carbonPercent, 100)} 
                  className={`h-2 ${isCarbonCritical ? 'bg-red-500' : isCarbonWarning ? 'bg-yellow-500' : ''}`}
                />
                {isCarbonWarning && !isCarbonCritical && (
                  <p className="text-xs text-yellow-400">Warning: 80% of carbon limit used</p>
                )}
                {isCarbonCritical && (
                  <p className="text-xs text-red-400">Critical: Carbon limit exceeded - training will stop</p>
                )}
              </div>

              {/* Time */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-neutral-400" />
                    <span className="text-neutral-300">Elapsed Time</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-white font-medium">{currentRun.elapsedTime}s</span>
                    {currentRun.estimatedTotalTime && (
                      <span className="text-neutral-500">/ ~{currentRun.estimatedTotalTime}s</span>
                    )}
                  </div>
                </div>
                <Progress value={Math.min(timePercent, 100)} className="h-2" />
              </div>
            </CardContent>
          </Card>

          {/* Constraint Violations */}
          {currentRun.constraintViolations && currentRun.constraintViolations.length > 0 && (
            <Card className="bg-red-500/10 border-red-500/20 mb-6">
              <CardHeader>
                <CardTitle className="text-red-400 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5" />
                  Constraint Violations
                </CardTitle>
              </CardHeader>
              <CardContent>
                {currentRun.constraintViolations.map((v, i) => (
                  <div key={i} className="flex items-start gap-2 mb-2">
                    <AlertTriangle className="w-4 h-4 text-red-400 mt-0.5" />
                    <span className="text-neutral-300">{v.message}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Stop Button */}
          {isRunning && (
            <div className="flex justify-center">
              <Button
                onClick={handleStop}
                disabled={stopping}
                variant="outline"
                className="border-red-500/50 text-red-400 hover:bg-red-500/10"
              >
                {stopping ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <XCircle className="w-4 h-4 mr-2" />
                )}
                Stop Training
              </Button>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}