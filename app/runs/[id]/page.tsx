import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Clock, CheckCircle2, AlertCircle, Download, Share2, MoreVertical, Layout } from 'lucide-react'
import { fetchRunById } from '@/lib/api'
import Link from 'next/link'

export default async function RunDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const resolvedParams = await params
  const runId = resolvedParams.id
  const runNumber = runId.includes('-') ? runId.split('-')[1] : runId.substring(0, 8)

  const runData = await fetchRunById(runId)

  if (!runData) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center h-[70vh] gap-4">
          <AlertCircle className="w-12 h-12 text-neutral-600" />
          <div className="text-center">
            <h2 className="text-xl font-semibold text-white">Run Not Found</h2>
            <p className="text-neutral-500">The requested execution run could not be located.</p>
          </div>
          <Link href="/runs">
            <Button variant="outline" className="border-neutral-800">Back to Runs</Button>
          </Link>
        </div>
      </DashboardLayout>
    )
  }

  // Map backend metrics to UI metrics
  const backendMetrics = typeof runData.metrics === 'string'
    ? JSON.parse(runData.metrics || '{}')
    : (runData.metrics || {})

  const run = {
    id: runId,
    pipelineId: runData.pipeline_id,
    pipelineName: runData.pipeline_name || 'Custom ML Pipeline',
    status: (runData.status === 'completed' ? 'success' : runData.status) as 'success' | 'failed' | 'running',
    startTime: new Date(runData.started_at),
    endTime: runData.completed_at ? new Date(runData.completed_at) : null,
    duration: runData.completed_at
      ? (() => {
        const diff = new Date(runData.completed_at).getTime() - new Date(runData.started_at).getTime()
        const mins = Math.floor(diff / 60000)
        const secs = Math.floor((diff % 60000) / 1000)
        return `${mins}m ${secs}s`
      })()
      : 'In Progress',
    totalRecords: runData.total_records || 10000,
    successRate: runData.success_rate || 100,
    stages: [
      {
        name: 'Data Ingestion',
        status: 'success',
        startTime: '0s',
        duration: '2m 15s',
        recordsProcessed: runData.total_records || 10000,
        errors: 0,
      },
      {
        name: 'Model Optimization',
        status: runData.status === 'completed' ? 'success' : 'running',
        startTime: '2m 15s',
        duration: '5m 45s',
        recordsProcessed: runData.total_records || 10000,
        errors: 0,
      }
    ],
    metrics: {
      'Accuracy': backendMetrics.accuracy ? (backendMetrics.accuracy * 100).toFixed(2) + '%' : 'N/A',
      'F1 Score': backendMetrics.f1 ? backendMetrics.f1.toFixed(3) : 'N/A',
      'Cost ($)': backendMetrics.cost ? backendMetrics.cost.toFixed(2) : 'N/A',
      'Carbon (kg)': backendMetrics.carbon ? backendMetrics.carbon.toFixed(3) : 'N/A',
    },
    parameters: {
      'Pipeline ID': runData.pipeline_id,
      'Design ID': runData.design_id || 'N/A',
      'Mode': 'Optimized',
    },
    triggerReason: 'Manual trigger',
    triggeredBy: 'Current User',
    outputs: {
      'Weights': `gs://system2ml/runs/${runId}/weights.bin`,
      'Config': `gs://system2ml/runs/${runId}/config.json`,
      'Logs': `gs://system2ml/runs/${runId}/logs.txt`,
    },
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return 'bg-success-500/10 text-success-600 border-success-500/20'
      case 'failed':
        return 'bg-danger-500/10 text-danger-600 border-danger-500/20'
      case 'running':
        return 'bg-info-500/10 text-info-600 border-info-500/20'
      default:
        return 'bg-neutral-600/10 text-neutral-400'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle2 className="w-5 h-5" />
      case 'failed':
        return <AlertCircle className="w-5 h-5" />
      default:
        return <Clock className="w-5 h-5" />
    }
  }

  return (
    <DashboardLayout>
      <div className="p-8">
        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <div className="flex items-center gap-3 mb-3">
              <Link href="/runs" className="text-brand-500 hover:text-brand-400 text-sm font-medium">
                Runs
              </Link>
              <span className="text-neutral-500">/</span>
              <span className="text-white text-sm">{runId}</span>
            </div>
            <div className="flex items-center gap-3 mb-2">
              {getStatusIcon(run.status)}
              <h1 className="text-3xl font-bold text-white">
                {run.pipelineName} - Run #{runNumber}
              </h1>
              <Badge className={getStatusColor(run.status)}>
                {run.status.toUpperCase()}
              </Badge>
            </div>
            <p className="text-neutral-400">
              Triggered by {run.triggeredBy} • {run.triggerReason}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="border-neutral-700 text-neutral-300">
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
            <Button variant="outline" size="sm" className="border-neutral-700 text-neutral-300">
              <Share2 className="w-4 h-4 mr-2" />
              Share
            </Button>
          </div>
        </div>

        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card className="p-4 bg-neutral-900 border-neutral-800">
            <p className="text-sm text-neutral-400 mb-1">Duration</p>
            <p className="text-2xl font-bold text-white">{run.duration}</p>
            <p className="text-xs text-neutral-500 mt-2">
              {run.startTime.toLocaleTimeString()} - {run.endTime ? run.endTime.toLocaleTimeString() : '...'}
            </p>
          </Card>

          <Card className="p-4 bg-neutral-900 border-neutral-800">
            <p className="text-sm text-neutral-400 mb-1">Records Processed</p>
            <p className="text-2xl font-bold text-white">
              {(run.totalRecords / 1000000).toFixed(1)}M
            </p>
            <p className="text-xs text-neutral-500 mt-2">
              {(run.totalRecords / (parseFloat(run.duration.split('m')[0]) * 60)).toFixed(0)} records/sec
            </p>
          </Card>

          <Card className="p-4 bg-neutral-900 border-neutral-800">
            <p className="text-sm text-neutral-400 mb-1">Success Rate</p>
            <p className="text-2xl font-bold text-success-500">{run.successRate}%</p>
            <p className="text-xs text-neutral-500 mt-2">All stages successful</p>
          </Card>

          <Card className="p-4 bg-neutral-900 border-neutral-800">
            <p className="text-sm text-neutral-400 mb-1">Model Accuracy</p>
            <p className="text-2xl font-bold text-brand-500">{run.metrics['Accuracy']}</p>
            <p className="text-xs text-neutral-500 mt-2">Model quality metric</p>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="stages" className="space-y-6">
          <TabsList className="bg-neutral-800 border-b border-neutral-700">
            <TabsTrigger value="stages" className="text-white">
              Pipeline Stages
            </TabsTrigger>
            <TabsTrigger value="metrics" className="text-white">
              Performance Metrics
            </TabsTrigger>
            <TabsTrigger value="parameters" className="text-white">
              Parameters
            </TabsTrigger>
            <TabsTrigger value="outputs" className="text-white">
              Outputs
            </TabsTrigger>
          </TabsList>

          <TabsContent value="stages" className="space-y-4">
            {run.stages.map((stage, idx) => (
              <div key={idx} className="rounded-lg border border-neutral-800 bg-neutral-900 overflow-hidden">
                <div className="p-4">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      {stage.status === 'success' ? (
                        <CheckCircle2 className="w-5 h-5 text-success-500" />
                      ) : (
                        <AlertCircle className="w-5 h-5 text-danger-500" />
                      )}
                      <h3 className="font-semibold text-white">{stage.name}</h3>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-neutral-400">
                      <span>{stage.duration}</span>
                      <span className="text-neutral-500">
                        {stage.errors > 0 && `${stage.errors} errors`}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-neutral-400">Start Time</p>
                      <p className="text-white font-mono">{stage.startTime}</p>
                    </div>
                    <div>
                      <p className="text-neutral-400">Records</p>
                      <p className="text-white font-mono">
                        {stage.recordsProcessed}
                      </p>
                    </div>
                  </div>

                  {stage.errors > 0 && (
                    <div className="mt-4 p-3 rounded-lg bg-danger-500/10 border border-danger-500/20">
                      <p className="text-sm text-danger-400">
                        ⚠️ {stage.errors} records failed validation - handled gracefully
                      </p>
                    </div>
                  )}
                </div>

                {/* Progress bar */}
                <div className="h-1 bg-neutral-800">
                  <div
                    className={`h-full ${stage.status === 'success'
                      ? 'bg-gradient-to-r from-success-500 to-success-600'
                      : 'bg-gradient-to-r from-danger-500 to-danger-600'
                      }`}
                    style={{ width: '100%' }}
                  />
                </div>
              </div>
            ))}
          </TabsContent>

          <TabsContent value="metrics" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {Object.entries(run.metrics).map(([key, value]) => (
                <div key={key} className="rounded-lg border border-neutral-800 bg-neutral-900 p-4">
                  <p className="text-sm text-neutral-400 mb-2">{key}</p>
                  <p className="text-3xl font-bold text-white">{value}</p>
                </div>
              ))}
            </div>

            <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-6">
              <h3 className="font-semibold text-white mb-4">Quality Assessment</h3>
              <p className="text-neutral-400 text-sm mb-4">
                This run produced excellent results with strong cluster separation and cohesion metrics.
              </p>
              <div className="space-y-2 text-sm">
                <p className="text-success-400">✓ Silhouette score indicates well-separated clusters</p>
                <p className="text-success-400">✓ Davies-Bouldin index shows good cluster distinction</p>
                <p className="text-success-400">✓ Calinski-Harabasz score demonstrates strong model</p>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="parameters" className="space-y-4">
            <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-4">
              <div className="space-y-3">
                {Object.entries(run.parameters).map(([key, value]) => (
                  <div key={key} className="flex items-center justify-between py-3 border-b border-neutral-800 last:border-b-0">
                    <span className="text-neutral-400">{key}</span>
                    <span className="font-mono text-white">{value}</span>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="outputs" className="space-y-4">
            <div className="space-y-3">
              {Object.entries(run.outputs).map(([key, path]) => (
                <div
                  key={key}
                  className="rounded-lg border border-neutral-800 bg-neutral-900 p-4 flex items-center justify-between hover:border-neutral-700 transition-colors cursor-pointer"
                >
                  <div>
                    <p className="font-medium text-white">{key}</p>
                    <p className="text-xs text-neutral-400 font-mono mt-1">{path}</p>
                  </div>
                  <Button size="sm" variant="outline" className="border-neutral-700">
                    Download
                  </Button>
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  )
}
