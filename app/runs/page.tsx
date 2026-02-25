'use client'

import { useState, useEffect } from 'react'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { Badge } from '@/components/ui/badge'
import { fetchPipelineRuns, fetchPipelines } from '@/lib/api'
import { CheckCircle2, AlertCircle, Clock, Loader2 } from 'lucide-react'

export default function RunsPage() {
  const [runs, setRuns] = useState<any[]>([])
  const [pipelines, setPipelines] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadData() {
      try {
        const [runsData, pipelinesData] = await Promise.all([
          fetchPipelineRuns(),
          fetchPipelines()
        ])
        setRuns(runsData)
        setPipelines(pipelinesData)
      } catch (e) {
        console.error('Error loading data:', e)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle2 className="w-5 h-5 text-success-600" />
      case 'failed': return <AlertCircle className="w-5 h-5 text-danger-600" />
      case 'running': return <Clock className="w-5 h-5 text-info-600 animate-spin" />
      default: return <Clock className="w-5 h-5 text-neutral-500" />
    }
  }

  const getPipelineName = (pipelineId: string) => {
    const pipeline = pipelines.find(p => p.id === pipelineId)
    return pipeline?.name || pipelineId
  }

  return (
    <DashboardLayout>
      <div className="p-8">
        <h1 className="text-3xl font-bold text-white mb-2">Pipeline Runs</h1>
        <p className="text-neutral-400 mb-8">View execution history of your pipelines</p>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
          </div>
        ) : runs.length === 0 ? (
          <div className="text-center py-12 text-neutral-500">
            No runs yet. Execute a pipeline to see runs here.
          </div>
        ) : (
          <div className="space-y-4">
            {runs.map((run: any) => (
              <div key={run.id} className="rounded-lg border border-neutral-800 bg-neutral-900 p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    {getStatusIcon(run.status)}
                    <div>
                      <p className="font-medium text-white">Run {run.id?.slice(0, 8)}</p>
                      <p className="text-sm text-neutral-400">Pipeline: {getPipelineName(run.pipeline_id)}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    {run.metrics && (
                      <p className="text-sm text-white">Accuracy: {((run.metrics.accuracy || 0) * 100).toFixed(1)}%</p>
                    )}
                    <Badge className={run.status === 'completed' ? 'bg-success-500/10 text-success-500' : run.status === 'failed' ? 'bg-danger-500/10 text-danger-500' : 'bg-info-500/10 text-info-500'}>
                      {run.status}
                    </Badge>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
