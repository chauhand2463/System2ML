import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Clock, CheckCircle2, AlertCircle, Download, Share2, MoreVertical } from 'lucide-react'
import Link from 'next/link'

export default function RunDetailPage({
  params,
}: {
  params: { id: string }
}) {
  const runId = params.id
  const run = {
    id: runId,
    pipelineId: 'pipe-1',
    pipelineName: 'Customer Segmentation',
    status: 'success' as const,
    startTime: new Date('2024-02-24T10:00:00'),
    endTime: new Date('2024-02-24T10:45:32'),
    duration: '45m 32s',
    totalRecords: 2450000,
    successRate: 99.98,
    stages: [
      {
        name: 'Data Ingestion',
        status: 'success',
        startTime: '10:00:00',
        endTime: '10:08:15',
        duration: '8m 15s',
        recordsProcessed: 2450000,
        errors: 0,
      },
      {
        name: 'Data Validation',
        status: 'success',
        startTime: '10:08:16',
        endTime: '10:15:42',
        duration: '7m 26s',
        recordsProcessed: 2450000,
        errors: 0,
      },
      {
        name: 'Feature Engineering',
        status: 'success',
        startTime: '10:15:43',
        endTime: '10:32:18',
        duration: '16m 35s',
        recordsProcessed: 2450000,
        errors: 50,
      },
      {
        name: 'Model Training',
        status: 'success',
        startTime: '10:32:19',
        endTime: '10:42:05',
        duration: '9m 46s',
        recordsProcessed: 2450000,
        errors: 0,
      },
      {
        name: 'Results Export',
        status: 'success',
        startTime: '10:42:06',
        endTime: '10:45:32',
        duration: '3m 26s',
        recordsProcessed: 2450000,
        errors: 0,
      },
    ],
    metrics: {
      'Silhouette Score': '0.847',
      'Davies-Bouldin Index': '0.532',
      'Calinski-Harabasz Score': '245.3',
      'Inertia': '1245.67',
    },
    parameters: {
      'Number of Clusters': '8',
      'Algorithm': 'K-Means++',
      'Max Iterations': '300',
      'Random State': '42',
      'Init Method': 'smart_centers',
    },
    triggerReason: 'Scheduled daily run',
    triggeredBy: 'system-scheduler',
    outputs: {
      'Segmentation Results': 'gs://bucket/results/segments.parquet',
      'Cluster Centers': 'gs://bucket/results/centers.json',
      'Quality Report': 'gs://bucket/results/report.html',
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
                {run.pipelineName} - Run #{runId.split('-')[1]}
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
              {run.startTime.toLocaleTimeString()} - {run.endTime.toLocaleTimeString()}
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
            <p className="text-sm text-neutral-400 mb-1">Silhouette Score</p>
            <p className="text-2xl font-bold text-brand-500">{run.metrics['Silhouette Score']}</p>
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
                      <p className="text-neutral-400">End Time</p>
                      <p className="text-white font-mono">{stage.endTime}</p>
                    </div>
                    <div>
                      <p className="text-neutral-400">Records</p>
                      <p className="text-white font-mono">
                        {(stage.recordsProcessed / 1000000).toFixed(1)}M
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
                    className={`h-full ${
                      stage.status === 'success'
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
